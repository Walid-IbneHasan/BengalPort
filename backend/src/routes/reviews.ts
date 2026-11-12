import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../lib/prisma.js";
import { balance } from "../lib/payment-rules.js";
import { notifyNewReview } from "../lib/notifications.js";
import { reviewDivisionSchema, reviewSchema } from "../lib/schemas.js";

// What the website shows of a review: nothing that says who the customer is
// beyond the name they chose.
const shown = { id: true, division: true, name: true, detail: true, rating: true, body: true, photoUrl: true, createdAt: true };
const own = { ...shown, status: true };
const paidFor = { select: { amount: true, status: true, refunds: { select: { amount: true, status: true } } } };
// A service can be reviewed once money for it has been received and not all
// of it has been sent back.
const paid = (payments: Parameters<typeof balance>[1]) => balance(null, payments).paid > 0;
const divisions = ["BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"] as const;
// Whether money from the member has been received outside an application:
// a payment recorded against their account alone, or income staff entered
// under their name in Hisab Kitab.
async function paidOutsideApplications(userId: string) {
  const [payments, entries] = await Promise.all([
    prisma.payment.findMany({ where: { userId, applicationId: null }, select: paidFor.select }),
    prisma.financialTransaction.count({ where: { userId, type: "INCOME", applicationId: null } }),
  ]);
  return entries > 0 || paid(payments);
}

const routes: FastifyPluginAsync = async (app) => {
  // The approved reviews, for one service or for all of them.
  app.get("/", { config: { publicCache: true } }, async (req, reply) => {
    const parsed = reviewDivisionSchema.safeParse(req.query);
    if (!parsed.success) return reply.badRequest("Unknown service");
    return {
      data: await prisma.review.findMany({
        where: { status: "APPROVED", ...(parsed.data.division ? { division: parsed.data.division } : {}) },
        select: shown,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 30,
      }),
    };
  });

  // The member's applications that can be reviewed, each with its review
  // once one is written.
  // Then the reviews the member wrote about a service paid for outside an
  // application (cash at the office, entered by staff), and, while a service
  // is left to review, one more item with `division: null` to write one.
  app.get("/mine", { preHandler: app.authenticate }, async (req) => {
    const userId = (req.user as { sub: string }).sub;
    const [applications, general, eligible] = await Promise.all([
      prisma.application.findMany({
        where: { userId },
        select: { id: true, reference: true, type: true, payments: paidFor, review: { select: own } },
        orderBy: { createdAt: "desc" },
      }),
      prisma.review.findMany({ where: { userId, applicationId: null }, select: own, orderBy: { createdAt: "asc" } }),
      paidOutsideApplications(userId),
    ]);
    const generalItems = general.map((review) => ({ applicationId: null, reference: null, division: review.division, general: true, review }));
    if (eligible && general.length < divisions.length)
      generalItems.push({ applicationId: null, reference: null, division: null as any, general: true, review: null as any });
    return {
      data: [
        ...applications
          .filter((item) => item.review || paid(item.payments))
          .map((item) => ({ applicationId: item.id, reference: item.reference, division: item.type, general: false, review: item.review })),
        ...generalItems,
      ],
    };
  });

  // A member writes, or changes, their review of a service they paid for
  // outside an application. One review per service.
  app.put("/general/:division", { preHandler: app.authenticate }, async (req, reply) => {
    const userId = (req.user as { sub: string }).sub;
    const division = String((req.params as { division: string }).division).toUpperCase();
    if (!divisions.includes(division as (typeof divisions)[number]))
      return reply.badRequest("Choose Business, Education, Healthcare or Umrah.");
    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({
        error: { code: "VALIDATION_ERROR", message: "Choose a rating from 1 to 5, give the name to show, and write the review.", details: parsed.error.flatten() },
      });
    if (!(await paidOutsideApplications(userId)))
      return reply.code(403).send({
        error: { code: "NOT_PAID", message: "You can review a service once a payment from you has been received." },
      });
    const existing = await prisma.review.findFirst({ where: { userId, applicationId: null, division: division as any }, select: { id: true, status: true } });
    if (existing && existing.status !== "PENDING")
      return reply.code(409).send({
        error: { code: "REVIEW_LOCKED", message: "Our team has already checked this review. Contact us if you would like to change it." },
      });
    const { showPhoto, ...words } = parsed.data;
    const photo =
      showPhoto === undefined
        ? {}
        : { photoUrl: showPhoto ? ((await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } }))?.avatarUrl ?? null) : null };
    if (existing) return { data: await prisma.review.update({ where: { id: existing.id }, data: { ...words, ...photo }, select: own }) };
    const review = await prisma.review.create({ data: { ...words, ...photo, division: division as any, userId }, select: own });
    const member = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
    notifyNewReview(app, { ...review, reference: "paid at the office", customer: member?.name ?? words.name });
    return reply.code(201).send({ data: review });
  });

  // A member writes, or changes, the review of an application of theirs
  // that has been paid for. It is shown only after the team approves it.
  app.put(
    "/application/:applicationId",
    { preHandler: app.authenticate },
    async (req, reply) => {
      const userId = (req.user as { sub: string }).sub;
      const { applicationId } = req.params as { applicationId: string };
      const application = await prisma.application.findFirst({
        where: { id: applicationId, userId },
        select: { id: true, reference: true, type: true, fullName: true, payments: paidFor, review: { select: { id: true, status: true } } },
      });
      if (!application) return reply.notFound("Application not found");
      const parsed = reviewSchema.safeParse(req.body);
      if (!parsed.success)
        return reply.code(400).send({
          error: {
            code: "VALIDATION_ERROR",
            message: "Choose a rating from 1 to 5, give the name to show, and write the review.",
            details: parsed.error.flatten(),
          },
        });
      if (application.review && application.review.status !== "PENDING")
        return reply.code(409).send({
          error: { code: "REVIEW_LOCKED", message: "Our team has already checked this review. Contact us if you would like to change it." },
        });
      if (!paid(application.payments))
        return reply.code(403).send({
          error: { code: "NOT_PAID", message: "You can review a service once a payment for it has been received." },
        });
      // The member's account photo goes with the review only when they ask
      // for it; the request has to say so each time it is sent.
      const { showPhoto, ...words } = parsed.data;
      const photo =
        showPhoto === undefined
          ? {}
          : {
              photoUrl: showPhoto
                ? ((await prisma.user.findUnique({ where: { id: userId }, select: { avatarUrl: true } }))?.avatarUrl ?? null)
                : null,
            };
      if (application.review)
        return { data: await prisma.review.update({ where: { id: application.review.id }, data: { ...words, ...photo }, select: own }) };
      const review = await prisma.review.create({
        data: { ...words, ...photo, division: application.type, applicationId: application.id, userId },
        select: own,
      });
      notifyNewReview(app, { ...review, reference: application.reference, customer: application.fullName });
      return reply.code(201).send({ data: review });
    },
  );
};

export default routes;
