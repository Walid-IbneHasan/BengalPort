import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { randomCode } from "../lib/reference.js";
import { balance, paymentProblem, received, refundProblem, refundable, refundedInFull } from "../lib/payment-rules.js";
import { notifyPayment, notifyRefund } from "../lib/notifications.js";
import { findApplication } from "../lib/application-lookup.js";
import { GatewayError, isProvider, providerKeys, providers, type Gateway, type GatewayRefund, type GatewayStatus } from "../lib/gateway.js";

const manualPaymentSchema = z
  .object({
    applicationId: z.string().optional(),
    userId: z.string().optional(),
    service: z.string().trim().min(1).max(200),
    amount: z.coerce.number().positive(),
    totalDue: z.coerce.number().positive(),
    method: z.string().trim().min(1).max(60),
    transactionId: z.string().trim().min(1).max(100).optional(),
  })
  .refine((v) => v.amount <= v.totalDue);

// How long a customer has to finish on the provider's page before the
// attempt is treated as abandoned.
const ABANDONED_AFTER_MS = 30 * 60_000;

const refundSchema = z.object({
  amount: z.coerce.number(),
  reason: z.string().trim().min(3).max(255),
  // How staff returned the money, for a payment that did not come through bKash.
  method: z.string().trim().min(1).max(60).optional(),
});
// bKash answers a refund within half a minute. One it still does not list
// after this long was never made.
const REFUND_GIVEN_UP_AFTER_MS = 2 * 60_000;
const refundFields = { id: true, amount: true, reason: true, method: true, status: true, gatewayRefundId: true, recordedBy: true, createdAt: true } as const;

const routes: FastifyPluginAsync = async (app) => {
  const siteUrl = () => (process.env.FRONTEND_URL || "http://localhost:5173").split(",")[0].trim();
  // The provider a payment went through, and what to call it.
  const gatewayFor = (provider: string): Gateway | null => (isProvider(provider) ? app.gateways[provider] : null);
  const nameOf = (provider: string) => (isProvider(provider) ? providers[provider].name : provider);
  const configuredProviders = () => providerKeys.filter((provider) => app.gateways[provider].configured);
  const anyConfigured = () => configuredProviders().length > 0;
  const receiptNumber = () => `BPR-${new Date().getFullYear()}-${randomCode(7)}`;
  // Lets someone without an account open one receipt: sent to the payer by
  // email and in the address they land on after paying.
  const receiptKey = (number: string) => app.jwt.sign({ sub: number, purpose: "receipt" }, { expiresIn: "90d" });

  // Who is asking, for one application: an admin, the member who applied, or
  // the holder of a payment link (issued when applying, or by the lookup
  // below). Null means no access.
  async function access(req: any, applicationId: string) {
    let token: { sub?: string; purpose?: string };
    try {
      token = await req.jwtVerify();
    } catch {
      throw app.httpErrors.unauthorized("Sign in to make a payment");
    }
    if (token.purpose === "pay") return token.sub === applicationId ? "payer" : null;
    await app.authenticate(req, undefined);
    if (req.user.role === "ADMIN") return "admin";
    const application = await prisma.application.findUnique({ where: { id: applicationId }, select: { userId: true } });
    return application?.userId === req.user.sub ? "owner" : null;
  }

  // Records a payment the provider has confirmed: the payment, its receipt
  // and what is still due. Safe to call twice; the receipt is created once.
  async function complete(paymentId: string, result: GatewayStatus) {
    const { payment, created } = await prisma.$transaction(async (tx) => {
      const row = await tx.payment.findUniqueOrThrow({
        where: { id: paymentId },
        include: { receipt: true, application: { include: { payments: { include: { refunds: true } } } } },
      });
      if (row.receipt) return { payment: row, created: false };
      const amount = result.amount ?? Number(row.amount);
      const earlier = row.application ? row.application.payments.filter((other) => other.id !== row.id) : [];
      const due = balance(row.application?.amountDue == null ? null : Number(row.application.amountDue), earlier);
      const previousDue = due.remaining ?? amount;
      const remainingDue = Math.max(0, Math.round((previousDue - amount) * 100) / 100);
      const payment = await tx.payment.update({
        where: { id: row.id },
        data: {
          amount,
          totalDue: Math.max(previousDue, amount),
          status: remainingDue === 0 ? "PAID" : "PARTIALLY_PAID",
          paidAt: new Date(),
          gatewayStatus: "completed",
          gatewayTransactionId: result.trxId,
          payerAccount: result.payerAccount,
          receipt: { create: { receiptNumber: receiptNumber(), previousDue, remainingDue } },
        },
        include: { receipt: true, application: true },
      });
      return { payment, created: true };
    });
    if (created && payment.application && payment.receipt)
      notifyPayment(app, {
        application: payment.application,
        method: payment.method,
        amount: Number(payment.amount),
        remaining: Number(payment.receipt.remainingDue),
        transactionId: payment.gatewayTransactionId ?? payment.transactionId,
        receiptUrl: `${siteUrl()}/receipt/${payment.receipt.receiptNumber}?key=${receiptKey(payment.receipt.receiptNumber)}`,
      });
    return payment;
  }

  // Asks the provider what became of a payment whose confirmation went
  // unanswered. "pending" means it could not be reached, so nothing is
  // decided yet.
  async function confirm(payment: { id: string; provider: string; gatewayPaymentId: string | null }) {
    let result: GatewayStatus;
    try {
      result = await gatewayFor(payment.provider)!.queryPayment(payment.gatewayPaymentId!);
    } catch {
      await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { gatewayStatus: "unknown" } });
      return "pending" as const;
    }
    if (result.status === "Completed") {
      await complete(payment.id, result);
      return "paid" as const;
    }
    await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED", gatewayStatus: "failed" } });
    return "failed" as const;
  }

  // What an application costs, what has been paid and what is left.
  async function summary(applicationId: string) {
    const unsettled = await prisma.payment.findMany({
      where: { applicationId, provider: { in: providerKeys }, status: "PENDING", gatewayStatus: { in: ["executing", "unknown"] } },
      select: { id: true, provider: true, gatewayPaymentId: true },
    });
    for (const payment of unsettled) await confirm(payment);
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: { payments: { include: { receipt: true, refunds: true }, orderBy: { createdAt: "desc" } } },
    });
    if (!application) return null;
    const fee = await prisma.serviceFee.findUnique({ where: { division: application.type } });
    return {
      id: application.id,
      reference: application.reference,
      type: application.type,
      ...balance(application.amountDue === null ? null : Number(application.amountDue), application.payments),
      minimumPayment: Number(fee?.minimumPayment ?? 0),
      onlinePayment: anyConfigured(),
      onlineMethods: configuredProviders(),
      payments: application.payments
        .filter((payment) => received(payment.status))
        .map((payment) => ({
          id: payment.id,
          amount: Number(payment.amount),
          method: payment.method,
          status: payment.status,
          paidAt: payment.paidAt ?? payment.createdAt,
          receiptNumber: payment.receipt?.receiptNumber ?? null,
          receiptKey: payment.receipt ? receiptKey(payment.receipt.receiptNumber) : null,
        })),
    };
  }

  // Service fees and whether paying online is available.
  app.get("/config", async () => {
    const fees = await prisma.serviceFee.findMany();
    return {
      data: {
        enabled: anyConfigured(),
        methods: configuredProviders(),
        fees: Object.fromEntries(
          fees.map((fee) => [fee.division, { label: fee.label, amount: Number(fee.amount), minimumPayment: Number(fee.minimumPayment) }]),
        ),
      },
    };
  });

  // A guest finds their application with its reference and the phone number
  // or email they applied with, and gets a link to pay it.
  app.post("/lookup", { config: { rateLimit: { max: 10, timeWindow: "10 minutes" } } }, async (req, reply) => {
    const application = await findApplication(req.body);
    if (!application) return reply.notFound("We could not find an application with that reference and contact detail.");
    return {
      data: {
        application: await summary(application.id),
        token: app.jwt.sign({ sub: application.id, purpose: "pay" }, { expiresIn: "1h" }),
      },
    };
  });

  app.get("/application/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const data = (await access(req, id)) ? await summary(id) : null;
    return data ? { data } : reply.notFound("Application not found");
  });

  // Starts a payment with the chosen provider and returns the page to send
  // the customer to.
  app.post("/:provider/create", { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } }, async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const gateway = gatewayFor(provider);
    if (!gateway) return reply.notFound("Unknown payment provider");
    const name = nameOf(provider);
    const parsed = z.object({ applicationId: z.string().min(1), amount: z.coerce.number() }).safeParse(req.body);
    if (!parsed.success) return reply.badRequest("Enter the amount you want to pay.");
    const { applicationId, amount } = parsed.data;
    const state = (await access(req, applicationId)) ? await summary(applicationId) : null;
    if (!state) return reply.notFound("Application not found");
    const problem = paymentProblem(amount, { remaining: state.remaining, minimum: state.minimumPayment });
    if (problem) return reply.badRequest(problem);
    if (!gateway.configured) return reply.serviceUnavailable(`Paying with ${name} is not available yet. Please choose another way to pay, or contact us.`);

    const application = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    await prisma.payment.updateMany({
      where: { applicationId, provider, status: "PENDING", gatewayStatus: "created", createdAt: { lt: new Date(Date.now() - ABANDONED_AFTER_MS) } },
      data: { status: "FAILED", gatewayStatus: "abandoned" },
    });
    // Nagad accepts only letters and digits in an order id.
    const invoice = provider === "nagad" ? `BPPAY${randomCode(10)}` : `BP-PAY-${randomCode(10)}`;
    const payment = await prisma.payment.create({
      data: {
        applicationId,
        userId: application.userId,
        service: `${application.type.charAt(0)}${application.type.slice(1).toLowerCase()} application ${application.reference}`,
        amount,
        totalDue: state.remaining!,
        method: name,
        transactionId: invoice,
        status: "PENDING",
        provider,
        gatewayStatus: "starting",
      },
    });
    try {
      const created = await gateway.createPayment({
        amount,
        invoice,
        payerReference: application.reference,
        callbackURL: `${process.env.API_PUBLIC_URL || `${req.protocol}://${req.host}`}/api/payments/${provider}/callback`,
        clientIp: req.ip,
      });
      await prisma.payment.update({
        where: { id: payment.id },
        data: { gatewayPaymentId: created.paymentId, gatewaySignature: created.signature, gatewayStatus: "created" },
      });
      return { data: { redirectUrl: created.redirectUrl } };
    } catch (error) {
      req.log.error({ error }, `${name} payment could not be started`);
      await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED", gatewayStatus: "not_started" } });
      return reply.code(502).send({ error: { code: "GATEWAY_ERROR", message: `${name} could not start the payment. Please try again in a moment.` } });
    }
  });

  // The provider sends the customer's browser here after they approve, cancel
  // or fail the payment. Nothing in the address is trusted: the money only
  // counts once the provider itself confirms the payment.
  app.get("/:provider/callback", async (req, reply) => {
    const { provider } = req.params as { provider: string };
    const gateway = gatewayFor(provider);
    if (!gateway) return reply.notFound("Unknown payment provider");
    const name = nameOf(provider);
    const raw = req.query as Record<string, string | undefined>;
    // bKash and Nagad name the payment and its outcome differently.
    const query =
      provider === "nagad"
        ? { paymentId: raw.payment_ref_id, orderId: raw.order_id, status: raw.status === "Success" ? "success" : raw.status === "Aborted" ? "cancel" : "failure", signature: undefined }
        : { paymentId: raw.paymentID ?? raw.paymentId, orderId: undefined, status: raw.status, signature: raw.signature };
    const back = (status: string, details: Record<string, string> = {}) =>
      reply.redirect(`${siteUrl()}/payment/result?${new URLSearchParams({ status, method: name, ...details })}`);
    const gatewayPaymentId = query.paymentId;
    const find = () =>
      prisma.payment.findFirst({
        where: { provider, OR: [{ gatewayPaymentId: gatewayPaymentId ?? "" }, ...(query.orderId ? [{ transactionId: query.orderId }] : [])] },
        include: { receipt: true, application: true },
      });
    const payment = gatewayPaymentId || query.orderId ? await find() : null;
    if (!payment) return back("error");
    const details = { ref: payment.application?.reference ?? "", application: payment.applicationId ?? "" };
    const paid = (row: { receipt: { receiptNumber: string } | null }) =>
      back("success", { ...details, receipt: row.receipt!.receiptNumber, key: receiptKey(row.receipt!.receiptNumber) });

    if (payment.receipt) return paid(payment);
    if (query.signature && payment.gatewaySignature && query.signature !== payment.gatewaySignature) return back("error", details);
    if (query.status !== "success") {
      const cancelled = query.status === "cancel";
      await prisma.payment.updateMany({
        where: { id: payment.id, status: "PENDING" },
        data: { status: "FAILED", gatewayStatus: cancelled ? "cancelled" : "failed" },
      });
      return back(cancelled ? "cancelled" : "failed", details);
    }

    // Only one request may confirm a payment, however often the customer's
    // browser lands here.
    const claimed = await prisma.payment.updateMany({
      where: { id: payment.id, status: "PENDING", gatewayStatus: "created" },
      data: { gatewayStatus: "executing" },
    });
    if (!claimed.count) {
      const current = await find();
      if (current?.receipt) return paid(current);
      return back(current?.status === "FAILED" ? "failed" : "pending", details);
    }

    let outcome: "paid" | "failed" | "pending";
    try {
      const result = await gateway.executePayment(payment.gatewayPaymentId ?? gatewayPaymentId!);
      if (result.status === "Completed") {
        await complete(payment.id, result);
        outcome = "paid";
      } else outcome = await confirm(payment);
    } catch (error) {
      req.log.warn({ error }, `${name} did not confirm the payment; checking its state`);
      outcome = await confirm(payment);
    }
    if (outcome === "paid") return paid((await find())!);
    return back(outcome, details);
  });

  // A payment received outside the website (cash, bank transfer), recorded
  // by an administrator.
  app.post("/", async (req: any, reply) => {
    await app.authenticate(req, reply);
    if (req.user.role !== "ADMIN") return reply.forbidden("Admin access required");
    const parsed = manualPaymentSchema.safeParse(req.body);
    if (!parsed.success)
      return reply.code(400).send({ error: { code: "VALIDATION_ERROR", message: "Check the payment details. The amount paid cannot be more than the total due." } });
    const { applicationId, transactionId, ...fields } = parsed.data;
    // A payment against an application belongs to the member who applied, so it shows on their dashboard.
    let userId = fields.userId;
    if (applicationId) {
      const application = await prisma.application.findUnique({ where: { id: applicationId }, select: { userId: true, amountDue: true } });
      if (!application) return reply.notFound("Application not found");
      userId ??= application.userId ?? undefined;
      if (application.amountDue === null) await prisma.application.update({ where: { id: applicationId }, data: { amountDue: fields.totalDue } });
    }
    const remaining = fields.totalDue - fields.amount;
    try {
      const payment = await prisma.payment.create({
        data: {
          ...fields,
          userId,
          applicationId,
          status: remaining === 0 ? "PAID" : "PARTIALLY_PAID",
          provider: "manual",
          transactionId: transactionId ?? `BP-PAY-${randomCode(10)}`,
          paidAt: new Date(),
          receipt: { create: { receiptNumber: receiptNumber(), previousDue: fields.totalDue, remainingDue: remaining } },
        },
        include: { receipt: true },
      });
      return reply.code(201).send({ data: payment });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002")
        return reply.code(409).send({ error: { code: "DUPLICATE_PAYMENT", message: "A payment with this transaction reference is already recorded." } });
      throw error;
    }
  });

  // Receipts are visible to admins, to the member the payment belongs to,
  // and to whoever holds the receipt's own link.
  app.get("/receipt/:number", async (req: any, reply) => {
    const number = req.params.number as string;
    const key = (req.query as { key?: string }).key;
    let allowed: (payment: { userId: string | null }) => boolean;
    if (key) {
      let token: { sub?: string; purpose?: string } | null = null;
      try {
        token = app.jwt.verify<{ sub?: string; purpose?: string }>(key);
      } catch {
        // An expired or altered link opens nothing.
      }
      const valid = token?.purpose === "receipt" && token.sub === number;
      allowed = () => valid;
    } else {
      await app.authenticate(req, reply);
      allowed = (payment) => req.user.role === "ADMIN" || payment.userId === req.user.sub;
    }
    const receipt = await prisma.receipt.findUnique({
      where: { receiptNumber: number },
      include: {
        payment: {
          include: {
            user: { select: { name: true } },
            application: { select: { reference: true, fullName: true } },
            // Money sent back, so that the receipt tells the whole story.
            refunds: { where: { status: "COMPLETED" }, select: { amount: true, method: true, createdAt: true }, orderBy: { createdAt: "asc" } },
          },
        },
      },
    });
    if (!receipt || !allowed(receipt.payment)) return reply.notFound("Receipt not found");
    return { data: receipt };
  });

  // A refund that has gone through: recorded, the payment closed when nothing
  // of it is left, and the payer and the team told.
  async function completeRefund(refundId: string, gatewayRefundId: string | null) {
    const refund = await prisma.refund.update({
      where: { id: refundId },
      data: { status: "COMPLETED", gatewayRefundId },
      include: { payment: { include: { refunds: true, application: true } } },
    });
    if (refundedInFull(refund.payment)) await prisma.payment.update({ where: { id: refund.paymentId }, data: { status: "REFUNDED" } });
    if (refund.payment.application)
      notifyRefund(app, { application: refund.payment.application, amount: Number(refund.amount), method: refund.method, transactionId: gatewayRefundId });
  }

  // Settles the refunds bKash never answered, from bKash's own list of the
  // refunds it made for the payment. One it lists is completed; one it still
  // does not list after a few minutes was never made and is given up.
  async function settleRefunds(payment: { id: string; provider: string; gatewayPaymentId: string | null; gatewayTransactionId: string | null }) {
    const waiting = await prisma.refund.findMany({ where: { paymentId: payment.id, status: "PENDING" }, orderBy: { createdAt: "asc" } });
    if (!waiting.length || !payment.gatewayPaymentId || !payment.gatewayTransactionId) return;
    let held: GatewayRefund[];
    try {
      held = await gatewayFor(payment.provider)!.refundStatus(payment.gatewayPaymentId, payment.gatewayTransactionId);
    } catch {
      return; // Still unknown; the amount stays held back.
    }
    const recorded = await prisma.refund.findMany({ where: { paymentId: payment.id, gatewayRefundId: { not: null } }, select: { gatewayRefundId: true } });
    const known = new Set(recorded.map((refund) => refund.gatewayRefundId));
    const unmatched = held.filter((item) => item.status === "Completed" && item.refundTrxId && !known.has(item.refundTrxId));
    const paisa = (value: unknown) => Math.round(Number(value) * 100);
    for (const refund of waiting) {
      const at = unmatched.findIndex((item) => item.amount !== null && paisa(item.amount) === paisa(refund.amount));
      if (at >= 0) await completeRefund(refund.id, unmatched.splice(at, 1)[0].refundTrxId);
      else if (Date.now() - refund.createdAt.getTime() > REFUND_GIVEN_UP_AFTER_MS)
        await prisma.refund.update({ where: { id: refund.id }, data: { status: "FAILED" } });
    }
  }

  const adminOnly = async (req: any, reply: any) => {
    await app.authenticate(req, reply);
    if (req.user.role !== "ADMIN") throw app.httpErrors.forbidden("Admin access required");
  };

  // The refunds of one payment and how much of it can still be sent back.
  app.get("/:id/refunds", { preHandler: adminOnly }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const found = await prisma.payment.findUnique({ where: { id } });
    if (!found) return reply.notFound("Payment not found");
    const gateway = gatewayFor(found.provider);
    if (gateway?.refunds) await settleRefunds(found);
    const payment = await prisma.payment.findUniqueOrThrow({
      where: { id },
      include: { refunds: { select: refundFields, orderBy: { createdAt: "desc" } }, application: { select: { reference: true, fullName: true } } },
    });
    return {
      data: {
        payment: { id: payment.id, amount: Number(payment.amount), method: payment.method, status: payment.status, payerAccount: payment.payerAccount, application: payment.application },
        // A bKash payment is refunded through bKash. A payment through a
        // provider whose refunds are made in its own portal (Nagad), and any
        // payment taken by staff, is recorded by staff.
        viaGateway: Boolean(gateway?.refunds),
        recordOnly: Boolean(gateway) && !gateway!.refunds,
        gatewayName: nameOf(payment.provider),
        gatewayReady: gateway?.configured ?? false,
        refundable: refundable(payment),
        refunds: payment.refunds,
      },
    };
  });

  // Sends money back for a payment, in full or in part.
  app.post("/:id/refunds", { preHandler: adminOnly }, async (req: any, reply) => {
    const { id } = req.params as { id: string };
    const parsed = refundSchema.safeParse(req.body);
    if (!parsed.success) return reply.badRequest("Enter the amount to refund and the reason for it.");
    const { amount, reason } = parsed.data;
    const payment = await prisma.payment.findUnique({ where: { id }, include: { refunds: true, application: true } });
    if (!payment) return reply.notFound("Payment not found");
    const gateway = gatewayFor(payment.provider);
    const viaGateway = Boolean(gateway?.refunds);
    const name = nameOf(payment.provider);
    const problem = refundProblem(amount, payment);
    if (problem) return reply.badRequest(problem);
    if (!viaGateway && !parsed.data.method) return reply.badRequest("Say how the money was returned.");
    if (viaGateway && !gateway!.configured)
      return reply.serviceUnavailable(`${name} is not connected, so this payment cannot be refunded here. Refund it in the ${name} merchant portal.`);
    if (viaGateway && (!payment.gatewayPaymentId || !payment.gatewayTransactionId))
      return reply.code(409).send({ error: { code: "NO_GATEWAY_TRANSACTION", message: `This payment has no ${name} transaction to refund.` } });
    const staff = await prisma.user.findUnique({ where: { id: req.user.sub }, select: { name: true } });

    // The payment is locked while the refund is added, so two refunds started
    // at the same moment cannot both take the same money.
    const refund = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${id} FOR UPDATE`;
      const current = await tx.payment.findUniqueOrThrow({ where: { id }, include: { refunds: true } });
      const late = refundProblem(amount, current);
      if (late) return late;
      return tx.refund.create({
        data: { paymentId: id, amount, reason, method: viaGateway ? name : parsed.data.method!, status: "PENDING", recordedBy: staff?.name ?? "Staff" },
      });
    });
    if (typeof refund === "string") return reply.badRequest(refund);
    const answer = async () => {
      const current = await prisma.refund.findUniqueOrThrow({ where: { id: refund.id }, select: refundFields });
      return reply.code(current.status === "COMPLETED" ? 201 : 202).send({ data: current });
    };

    if (!viaGateway) {
      await completeRefund(refund.id, null);
      return answer();
    }
    try {
      const result = await gateway!.refundPayment({
        paymentId: payment.gatewayPaymentId!,
        trxId: payment.gatewayTransactionId!,
        amount,
        reason,
        sku: payment.application?.reference ?? payment.transactionId,
      });
      if (result.status === "Completed" && result.refundTrxId) {
        await completeRefund(refund.id, result.refundTrxId);
        return answer();
      }
    } catch (error) {
      if (error instanceof GatewayError && error.code !== "NO_RESPONSE") {
        await prisma.refund.update({ where: { id: refund.id }, data: { status: "FAILED" } });
        return reply.code(502).send({ error: { code: "REFUND_REFUSED", message: `${name} refused the refund: ${error.message}` } });
      }
      req.log.warn({ error }, `${name} did not answer a refund; checking its list of refunds`);
    }
    // No clear answer. bKash's own list decides; until it shows the refund,
    // the refund waits and its amount cannot be refunded again.
    await settleRefunds(payment);
    return answer();
  });
};

export default routes;
