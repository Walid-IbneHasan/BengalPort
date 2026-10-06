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

const routes: FastifyPluginAsync = async (app) => {
  // The approved reviews, for one service or for all of them.
  app.get("/", async (req, reply) => {
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
  app.get("/mine", { preHandler: app.authenticate }, async (req) => {
    const userId = (req.user as { sub: string }).sub;
    const applications = await prisma.application.findMany({
      where: { userId },
      select: { id: true, reference: true, type: true, payments: paidFor, review: { select: own } },
      orderBy: { createdAt: "desc" },
    });
    return {
      data: applications
        .filter((item) => item.review || paid(item.payments))
        .map((item) => ({ applicationId: item.id, reference: item.reference, division: item.type, review: item.review })),
    };
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
            message: "Choose a rating from 1 to 5, give the name to show, and write at least a sentence.",
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
