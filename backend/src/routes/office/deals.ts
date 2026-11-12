// Deals: the service agreement with a customer (what will be done, by when,
// for how much, and what each side commits to), from draft to completion.
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { allowed, branchScope, need, ownOnly, staffOf } from "../../lib/access.js";
import { audit, changedFields } from "../../lib/audit.js";
import { dealSchema } from "../../lib/office-schemas.js";
import { getSettings } from "../../lib/settings.js";
import { round2 } from "../../lib/accounting.js";
import { invoiceNumberText } from "../../lib/invoice-lifecycle.js";
import { invoiceFigures, OfficeError, recognizeDeal } from "../../lib/office-service.js";
import { invalid, problem, withCode, withNumber } from "./common.js";
import { z } from "zod";

const person = { select: { id: true, name: true } } as const;
const lineTotal = (items: { quantity: number; unitPrice: number }[]) => round2(items.reduce((sum, item) => sum + Math.round(item.quantity * item.unitPrice * 100) / 100, 0));

const deals: FastifyPluginAsync = async (app) => {
  async function visible(req: any, extra: Record<string, unknown> = {}) {
    const staff = await staffOf(req);
    const and: Record<string, unknown>[] = [branchScope(staff), extra];
    if (ownOnly(staff)) and.push({ OR: [{ assignedToId: staff.id }, { customer: { assignedToId: staff.id } }] });
    return { AND: and.filter((part) => Object.keys(part).length) };
  }
  const fail = (reply: any, error: unknown) => {
    if (error instanceof OfficeError) return problem(reply, error.statusCode, error.code, error.message);
    throw error;
  };

  app.get("/deals", { preHandler: need("deals.read") }, async (req) => {
    const query = req.query as Record<string, string | undefined>;
    const search = String(query.search ?? "").trim();
    const numberMatch = search.match(/^D-?0*(\d+)$/i);
    const where = await visible(req, {
      ...(query.status ? { status: query.status } : {}),
      ...(query.customerId ? { customerId: query.customerId } : {}),
      ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" } }, { customer: { name: { contains: search, mode: "insensitive" } } }, ...(numberMatch ? [{ number: Number(numberMatch[1]) }] : [])] } : {}),
    });
    const finance = await allowed((req.user as any).role, "finance.read");
    const rows = await prisma.deal.findMany({
      where,
      include: { customer: { select: { id: true, name: true, code: true } }, assignedTo: person, _count: { select: { invoices: true } } },
      orderBy: [{ updatedAt: "desc" }],
      take: 300,
    });
    return { data: rows.map((row) => withNumber({ ...row, customer: withCode(row.customer), total: finance ? Number(row.total) : null, recognized: finance ? Number(row.recognized) : null })) };
  });

  app.post("/deals", { preHandler: need("deals.create") }, async (req, reply) => {
    const parsed = dealSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const staff = await staffOf(req);
    const customer = await prisma.customer.findFirst({ where: { AND: [{ id: parsed.data.customerId }, ownOnly(staff) ? { assignedToId: staff.id } : {}, branchScope(staff)] } });
    if (!customer) return problem(reply, 400, "UNKNOWN_CUSTOMER", "Choose one of your customers.");
    const settings = await getSettings();
    const deal = await prisma.deal.create({
      data: {
        ...parsed.data,
        items: parsed.data.items,
        total: lineTotal(parsed.data.items),
        terms: parsed.data.terms ?? settings.invoiceTerms,
        assignedToId: parsed.data.assignedToId ?? customer.assignedToId ?? staff.id,
        branchId: parsed.data.branchId ?? customer.branchId ?? staff.branchId,
        createdById: staff.id,
      },
    });
    await prisma.customerActivity.create({ data: { customerId: customer.id, kind: "SYSTEM", summary: `Deal ${withNumber(deal).dealNumber} started: ${deal.title}`, byId: staff.id, byName: staff.name } });
    await audit(req, { action: "deal.create", entityType: "deal", entityId: deal.id, summary: `${withNumber(deal).dealNumber} ${deal.title} for ${customer.name}` });
    return reply.code(201).send({ data: withNumber(deal) });
  });

  async function dealView(req: any, id: string) {
    const deal = await prisma.deal.findFirst({
      where: { AND: [{ id }, await visible(req)] },
      include: {
        customer: true,
        assignedTo: person,
        branch: { select: { id: true, name: true } },
        invoices: { include: { creditNotes: { select: { amount: true } } }, orderBy: { serial: "desc" } },
        tasks: { include: { assignee: person }, orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
      },
    });
    if (!deal) return null;
    const finance = await allowed(req.user.role, "finance.read");
    return withNumber({
      ...deal,
      customer: withCode({ id: deal.customer.id, code: deal.customer.code, name: deal.customer.name, phone: deal.customer.phone, email: deal.customer.email, address: deal.customer.address, whatsapp: deal.customer.whatsapp }),
      total: finance ? Number(deal.total) : null,
      recognized: finance ? Number(deal.recognized) : null,
      invoices: deal.invoices.map((invoice) => ({ id: invoice.id, number: invoiceNumberText(invoice.serial), issuedAt: invoice.issuedAt, dueAt: invoice.dueAt, state: invoice.state, currency: invoice.currency, ...(finance ? invoiceFigures(invoice) : { status: invoiceFigures(invoice).status }) })),
    });
  }

  app.get("/deals/:id", { preHandler: need("deals.read") }, async (req, reply) => {
    const deal = await dealView(req, (req.params as { id: string }).id);
    return deal ? { data: deal } : reply.notFound("Deal not found");
  });

  app.put("/deals/:id", { preHandler: need("deals.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const before = await prisma.deal.findFirst({ where: { AND: [{ id }, await visible(req)] } });
    if (!before) return reply.notFound("Deal not found");
    if (before.status === "COMPLETED" || before.status === "CANCELLED") return problem(reply, 409, "DEAL_CLOSED", "A completed or cancelled deal cannot be changed.");
    const parsed = dealSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (parsed.data.customerId !== before.customerId) return problem(reply, 400, "CUSTOMER_LOCKED", "A deal stays with its customer. Start a new deal for another customer.");
    const deal = await prisma.deal.update({ where: { id }, data: { ...parsed.data, items: parsed.data.items, total: lineTotal(parsed.data.items) } });
    await audit(req, { action: "deal.update", entityType: "deal", entityId: id, summary: `Changed ${withNumber(deal).dealNumber} ${deal.title}`, changes: changedFields(before as any, deal as any) });
    return { data: withNumber(deal) };
  });

  // Draft -> active -> completed; or cancelled.
  const transition = z.object({ action: z.enum(["activate", "complete", "cancel", "reopen"]), reason: z.string().trim().max(300).optional() });
  app.post("/deals/:id/status", { preHandler: need("deals.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = transition.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const deal = await prisma.deal.findFirst({ where: { AND: [{ id }, await visible(req)] }, include: { invoices: { select: { state: true } } } });
    if (!deal) return reply.notFound("Deal not found");
    const staff = await staffOf(req);
    const { action } = parsed.data;
    try {
      if (action === "activate") {
        if (deal.status !== "DRAFT") return problem(reply, 409, "NOT_DRAFT", "Only a draft deal can be started.");
        await prisma.deal.update({ where: { id }, data: { status: "ACTIVE", startDate: deal.startDate ?? new Date() } });
      } else if (action === "complete") {
        if (deal.status !== "ACTIVE") return problem(reply, 409, "NOT_ACTIVE", "Only an active deal can be completed.");
        // The work is done: what was invoiced is now earned.
        await prisma.$transaction(async (tx) => {
          await recognizeDeal(tx, id, staff);
          await tx.deal.update({ where: { id }, data: { status: "COMPLETED", completedAt: new Date() } });
        });
      } else if (action === "cancel") {
        if (!(await allowed(staff.role, "deals.cancel"))) return problem(reply, 403, "FORBIDDEN", "You do not have permission to cancel deals.");
        if (deal.status === "COMPLETED" || deal.status === "CANCELLED") return problem(reply, 409, "DEAL_CLOSED", "This deal is already closed.");
        if (deal.invoices.some((invoice) => invoice.state === "ISSUED")) return problem(reply, 409, "HAS_INVOICES", "This deal has issued invoices. Cancel them, or add credit notes, first.");
        await prisma.deal.update({ where: { id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      } else {
        if (deal.status !== "CANCELLED") return problem(reply, 409, "NOT_CANCELLED", "Only a cancelled deal can be reopened.");
        await prisma.deal.update({ where: { id }, data: { status: "DRAFT", cancelledAt: null } });
      }
    } catch (error) {
      return fail(reply, error);
    }
    await prisma.customerActivity.create({ data: { customerId: deal.customerId, kind: "SYSTEM", summary: `Deal ${withNumber(deal).dealNumber} ${action === "activate" ? "started" : action === "complete" ? "completed" : action === "cancel" ? "cancelled" : "reopened"}`, byId: staff.id, byName: staff.name } });
    await audit(req, { action: `deal.${action}`, entityType: "deal", entityId: id, summary: `${withNumber(deal).dealNumber} ${action}${parsed.data.reason ? `: ${parsed.data.reason}` : ""}` });
    return { data: await dealView(req, id) };
  });

  // Part of a deal's invoiced value recognised as revenue before it ends.
  app.post("/deals/:id/recognize", { preHandler: need("accounts.create") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const amount = Number((req.body as { amount?: unknown })?.amount);
    if (!Number.isFinite(amount) || amount <= 0) return problem(reply, 400, "VALIDATION_ERROR", "Enter the amount earned so far, in taka.");
    const staff = await staffOf(req);
    try {
      await prisma.$transaction((tx) => recognizeDeal(tx, id, staff, amount));
    } catch (error) {
      return fail(reply, error);
    }
    await audit(req, { action: "deal.recognize", entityType: "deal", entityId: id, summary: `Recognised ৳${amount} of revenue` });
    return { data: await dealView(req, id) };
  });

  // A draft invoice made from the deal: its services, currency, timeline,
  // commitments and terms.
  app.post("/deals/:id/invoice", { preHandler: need("invoices.create") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const deal = await prisma.deal.findFirst({ where: { AND: [{ id }, await visible(req)] }, include: { customer: true } });
    if (!deal) return reply.notFound("Deal not found");
    if (deal.status === "CANCELLED") return problem(reply, 409, "DEAL_CLOSED", "This deal is cancelled.");
    const body = (req.body ?? {}) as { exchangeRate?: number; dueAt?: string };
    const rate = deal.currency === "BDT" ? 1 : Number(body.exchangeRate) || Number((await prisma.exchangeRate.findFirst({ where: { currency: deal.currency }, orderBy: { date: "desc" } }))?.rate ?? 0);
    if (!rate) return problem(reply, 400, "NO_RATE", `Enter the ${deal.currency} to taka exchange rate for this invoice.`);
    const items = (deal.items as any[]).map((item) => ({ description: item.description, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice) }));
    const invoice = await prisma.invoice.create({
      data: {
        state: "DRAFT",
        issuedAt: new Date(),
        dueAt: body.dueAt ? new Date(body.dueAt) : null,
        customerName: deal.customer.name,
        customerPhone: deal.customer.phone,
        customerEmail: deal.customer.email,
        customerAddress: deal.customer.address,
        items,
        total: Number(deal.total),
        paid: 0,
        customerId: deal.customerId,
        dealId: deal.id,
        currency: deal.currency,
        exchangeRate: rate,
        terms: deal.terms,
        companyCommitments: deal.companyCommitments,
        clientCommitments: deal.clientCommitments,
        startDate: deal.startDate,
        endDate: deal.endDate,
        branchId: deal.branchId,
      },
    });
    await audit(req, { action: "invoice.create", entityType: "invoice", entityId: invoice.id, summary: `Draft ${invoiceNumberText(invoice.serial)} from ${withNumber(deal).dealNumber}` });
    return reply.code(201).send({ data: { id: invoice.id, number: invoiceNumberText(invoice.serial) } });
  });
};

export default deals;
