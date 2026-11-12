// Money received at the office: payments shared out between invoices or kept
// as advances, refunds, the cash, bank and mobile accounts, exchange rates.
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { allowed, need, staffOf } from "../../lib/access.js";
import { audit } from "../../lib/audit.js";
import { allocationSchema, officePaymentSchema, rateSchema, refundRequestSchema } from "../../lib/office-schemas.js";
import { accountBalances, MONEY_SUBTYPES, round2 } from "../../lib/accounting.js";
import { invoiceNumberText } from "../../lib/invoice-lifecycle.js";
import { allocatePayment, invoiceFigures, OfficeError, recordPayment } from "../../lib/office-service.js";
import { doOrAsk } from "../../lib/approvals.js";
import { invalid, problem, withCode } from "./common.js";

const money: FastifyPluginAsync = async (app) => {
  const fail = (reply: any, error: unknown) => {
    if (error instanceof OfficeError) return problem(reply, error.statusCode, error.code, error.message);
    throw error;
  };
  const view = (payment: any) => {
    const allocated = round2(payment.allocations.reduce((s: number, a: any) => s + Number(a.amount), 0));
    const refunded = round2(payment.refunds.filter((r: any) => r.status === "COMPLETED").reduce((s: number, r: any) => s + Number(r.amount), 0));
    return {
      id: payment.id, transactionId: payment.transactionId, method: payment.method, provider: payment.provider, status: payment.status,
      amount: Number(payment.amount), currency: payment.currency, exchangeRate: Number(payment.exchangeRate), paidAt: payment.paidAt ?? payment.createdAt,
      customer: payment.customer ? withCode(payment.customer) : null, receiptNumber: payment.receipt?.receiptNumber ?? null,
      allocations: payment.allocations.map((a: any) => ({ invoiceId: a.invoiceId, number: a.invoice ? invoiceNumberText(a.invoice.serial) : null, amount: Number(a.amount) })),
      allocated, refunded, unallocated: payment.customerId ? Math.max(0, round2(Number(payment.amount) - allocated - refunded)) : 0,
    };
  };
  const include = { customer: { select: { id: true, code: true, name: true } }, receipt: { select: { receiptNumber: true } }, allocations: { include: { invoice: { select: { serial: true } } } }, refunds: { select: { amount: true, status: true } } } as const;

  app.get("/payments", { preHandler: need("payments.read") }, async (req) => {
    const query = req.query as { customerId?: string; search?: string };
    const rows = await prisma.payment.findMany({
      where: {
        status: { in: ["PAID", "PARTIALLY_PAID", "REFUNDED"] },
        ...(query.customerId ? { customerId: query.customerId } : {}),
        ...(query.search ? { OR: [{ transactionId: { contains: query.search, mode: "insensitive" } }, { customer: { name: { contains: query.search, mode: "insensitive" } } }, { service: { contains: query.search, mode: "insensitive" } }] } : {}),
      },
      include,
      orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
      take: 200,
    });
    return { data: rows.map(view) };
  });

  // A customer's issued invoices with money still owed, for sharing out a payment.
  app.get("/customers/:id/open-invoices", { preHandler: need("payments.read") }, async (req) => {
    const rows = await prisma.invoice.findMany({ where: { customerId: (req.params as { id: string }).id, state: "ISSUED", journalEntryId: { not: null } }, include: { creditNotes: { select: { amount: true } } }, orderBy: { serial: "asc" } });
    return {
      data: rows
        .map((row) => ({ id: row.id, number: invoiceNumberText(row.serial), currency: row.currency, exchangeRate: Number(row.exchangeRate), dueAt: row.dueAt, ...invoiceFigures(row) }))
        .filter((row) => row.due > 0),
    };
  });

  app.post("/payments", { preHandler: need("payments.create") }, async (req, reply) => {
    const parsed = officePaymentSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const staff = await staffOf(req);
    try {
      const payment = await prisma.$transaction((tx) => recordPayment(tx, parsed.data, staff));
      await prisma.customerActivity.create({ data: { customerId: parsed.data.customerId, kind: "SYSTEM", summary: `Payment of ${parsed.data.currency} ${parsed.data.amount.toLocaleString("en-US")} received by ${parsed.data.method}`, byId: staff.id, byName: staff.name } });
      await audit(req, { action: "payment.create", entityType: "payment", entityId: payment.id, summary: `${parsed.data.currency} ${parsed.data.amount} by ${parsed.data.method}${parsed.data.allocations.length ? ` for ${parsed.data.allocations.length} invoice(s)` : " as an advance"}` });
      return reply.code(201).send({ data: view(await prisma.payment.findUniqueOrThrow({ where: { id: payment.id }, include })) });
    } catch (error) {
      return fail(reply, error);
    }
  });

  app.post("/payments/:id/allocate", { preHandler: need("payments.create") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = allocationSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const staff = await staffOf(req);
    try {
      await prisma.$transaction((tx) => allocatePayment(tx, id, parsed.data.allocations, staff));
    } catch (error) {
      return fail(reply, error);
    }
    await audit(req, { action: "payment.allocate", entityType: "payment", entityId: id, summary: `Advance given to ${parsed.data.allocations.length} invoice(s)` });
    return { data: view(await prisma.payment.findUniqueOrThrow({ where: { id }, include })) };
  });

  // Money back to the customer; an accountant or administrator does it at
  // once, anyone else asks for approval.
  app.post("/payments/:id/refund", { preHandler: need("payments.create") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = refundRequestSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const payment = await prisma.payment.findUnique({ where: { id }, include: { customer: { select: { name: true } } } });
    if (!payment || payment.provider !== "office") return reply.notFound("Office payment not found");
    const staff = await staffOf(req);
    try {
      const outcome = await doOrAsk(app, { role: staff.role, by: { id: staff.id, name: staff.name } }, "PAYMENT_REFUND", { type: "payment", id, summary: `Refund ${payment.currency} ${parsed.data.amount} to ${payment.customer?.name ?? "the customer"}: ${parsed.data.reason}` }, parsed.data);
      await audit(req, { action: outcome.done ? "payment.refund" : "approval.request", entityType: "payment", entityId: id, summary: `${outcome.done ? "Refunded" : "Asked to refund"} ${payment.currency} ${parsed.data.amount}: ${parsed.data.reason}` });
      return outcome.done ? reply.code(201).send({ data: { done: true } }) : reply.code(202).send({ data: { done: false, approvalId: outcome.approval.id, message: "Your request is waiting for an approver." } });
    } catch (error) {
      return fail(reply, error);
    }
  });

  // The cash, bank and mobile banking accounts and what is in each.
  app.get("/money-accounts", async (req, reply) => {
    const role = (req.user as any).role;
    if (!(await allowed(role, "payments.read")) && !(await allowed(role, "accounts.read")) && !(await allowed(role, "hisab.read"))) return reply.forbidden("You do not have permission to see the money accounts.");
    const finance = await allowed(role, "finance.read");
    const balances = await accountBalances(prisma);
    return { data: balances.filter((row) => MONEY_SUBTYPES.includes(String(row.subtype))).map((row) => ({ id: row.id, code: row.code, name: row.name, subtype: row.subtype, balance: finance ? round2(row.debit - row.credit) : null })) };
  });

  app.get("/exchange-rates", async () => ({
    data: await prisma.exchangeRate.findMany({ orderBy: [{ date: "desc" }, { currency: "asc" }], take: 100 }).then((rows) => rows.map((row) => ({ ...row, rate: Number(row.rate) }))),
  }));

  app.post("/exchange-rates", { preHandler: need("accounts.update") }, async (req, reply) => {
    const parsed = rateSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (parsed.data.currency === "BDT") return problem(reply, 400, "BASE_CURRENCY", "Taka is the base currency; its rate is always 1.");
    const date = new Date(parsed.data.date.toISOString().slice(0, 10));
    const row = await prisma.exchangeRate.upsert({ where: { currency_date: { currency: parsed.data.currency, date } }, update: { rate: parsed.data.rate }, create: { currency: parsed.data.currency, rate: parsed.data.rate, date } });
    await audit(req, { action: "rate.set", entityType: "exchange-rate", entityId: row.id, summary: `1 ${row.currency} = ৳${parsed.data.rate} on ${date.toISOString().slice(0, 10)}` });
    return reply.code(201).send({ data: { ...row, rate: Number(row.rate) } });
  });
};

export default money;
