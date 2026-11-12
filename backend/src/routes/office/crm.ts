// CRM: customers with their own ID, the history of contact with them, their
// follow-ups and tasks, and lists the staff can add to.
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { allowed, branchScope, need, ownOnly, staffOf } from "../../lib/access.js";
import { audit, changedFields } from "../../lib/audit.js";
import { activitySchema, customerSchema, lookupSchema, taskSchema } from "../../lib/office-schemas.js";
import { invoiceDue, invoiceStatus, invoiceNumberText } from "../../lib/invoice-lifecycle.js";
import { notify } from "../../lib/office-notifications.js";
import { csv, invalid, num, page, phoneKey, problem, withCode, withNumber } from "./common.js";
import { STAFF_ROLES } from "../../lib/permissions.js";

const LOOKUP_KINDS = ["customer-category", "lead-source", "service-line", "document-type"];
const person = { select: { id: true, name: true } } as const;

const crm: FastifyPluginAsync = async (app) => {
  // Customers the member of staff may see: their branch, and for an
  // employee only those assigned to them.
  async function visible(req: any, extra: Record<string, unknown> = {}) {
    const staff = await staffOf(req);
    const and: Record<string, unknown>[] = [branchScope(staff), extra];
    if (ownOnly(staff)) and.push({ assignedToId: staff.id });
    return { AND: and.filter((part) => Object.keys(part).length) };
  }
  const hidePassport = async (req: any, customer: any) =>
    (await allowed(req.user.role, "passport.read")) ? customer : { ...customer, passportNumber: customer.passportNumber ? "Hidden" : null, passportCountry: null, passportExpiry: null };

  async function duplicates(phone: string, email: string | null, notId?: string) {
    const key = phoneKey(phone);
    const rows = await prisma.customer.findMany({
      where: {
        ...(notId ? { id: { not: notId } } : {}),
        // Numbers are written with spaces, dashes and country codes: the last
        // four digits find the candidates, the last ten decide.
        OR: [...(key.length >= 7 ? [{ phone: { contains: key.slice(-4) } }] : []), ...(email ? [{ email: { equals: email, mode: "insensitive" as const } }] : [])],
      },
      select: { id: true, code: true, name: true, phone: true, email: true },
      take: 500,
    });
    return rows.filter((row) => (key && phoneKey(row.phone) === key) || (email && row.email?.toLowerCase() === email.toLowerCase())).map(withCode);
  }

  app.get("/customers", { preHandler: need("customers.read") }, async (req) => {
    const query = req.query as Record<string, string | undefined>;
    const search = String(query.search ?? "").trim();
    const codeMatch = search.match(/^C-?0*(\d+)$/i);
    const where = await visible(req, {
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { phone: { contains: search } }, { email: { contains: search, mode: "insensitive" } }, ...(codeMatch ? [{ code: Number(codeMatch[1]) }] : [])] }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.assignedTo ? { assignedToId: query.assignedTo === "none" ? null : query.assignedTo } : {}),
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.followUp === "due" ? { nextFollowUpAt: { lte: new Date() } } : {}),
    });
    const paging = page(query);
    const [rows, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: { assignedTo: person, branch: { select: { id: true, name: true } }, _count: { select: { deals: true, invoices: true } } },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        take: paging.take,
        skip: paging.skip,
      }),
      prisma.customer.count({ where }),
    ]);
    return { data: await Promise.all(rows.map(async (row) => withCode(await hidePassport(req, row)))), meta: paging.meta(total) };
  });

  app.get("/customers/duplicates", { preHandler: need("customers.read") }, async (req) => {
    const query = req.query as { phone?: string; email?: string; notId?: string };
    return { data: await duplicates(String(query.phone ?? ""), query.email || null, query.notId) };
  });

  app.get("/customers/export.csv", { preHandler: need("customers.export") }, async (req, reply) => {
    const passport = await allowed((req.user as any).role, "passport.read");
    const rows = await prisma.customer.findMany({ where: await visible(req), include: { assignedTo: person }, orderBy: { code: "asc" } });
    await audit(req, { action: "customers.export", entityType: "customer", summary: `Exported ${rows.length} customers${passport ? " with passport details" : ""}` });
    const header = ["ID", "Name", "Phone", "WhatsApp", "Email", "Address", "Category", "Lead source", "Status", "Assigned to", ...(passport ? ["Passport", "Passport country", "Passport expiry"] : [])];
    const body = rows.map((row) => [
      withCode(row).customerCode, row.name, row.phone, row.whatsapp, row.email, row.address, row.category, row.leadSource, row.status, row.assignedTo?.name,
      ...(passport ? [row.passportNumber, row.passportCountry, row.passportExpiry?.toISOString().slice(0, 10)] : []),
    ]);
    return reply.header("Content-Type", "text/csv; charset=utf-8").header("Content-Disposition", 'attachment; filename="customers.csv"').send("﻿" + csv([header, ...body]));
  });

  app.post("/customers", { preHandler: need("customers.create") }, async (req, reply) => {
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const { force, ...data } = parsed.data;
    const staff = await staffOf(req);
    if (!force) {
      const same = await duplicates(data.phone, data.email);
      if (same.length)
        return problem(reply, 409, "DUPLICATE_CUSTOMER", `A customer with this ${same.some((row) => phoneKey(row.phone) === phoneKey(data.phone)) ? "phone number" : "email"} already exists: ${same[0].customerCode} ${same[0].name}.`, { details: { candidates: same } });
    }
    if (!(await allowed(staff.role, "passport.read"))) Object.assign(data, { passportNumber: null, passportCountry: null, passportExpiry: null });
    const customer = await prisma.customer.create({
      data: {
        ...data,
        assignedToId: data.assignedToId ?? (ownOnly(staff) ? staff.id : null),
        branchId: data.branchId ?? staff.branchId,
        createdById: staff.id,
        activities: { create: { kind: "SYSTEM", summary: "Customer added", byId: staff.id, byName: staff.name } },
      },
    });
    await audit(req, { action: "customer.create", entityType: "customer", entityId: customer.id, summary: `Added ${withCode(customer).customerCode} ${customer.name}` });
    return reply.code(201).send({ data: withCode(customer) });
  });

  async function findVisible(req: any, id: string) {
    return prisma.customer.findFirst({ where: { AND: [{ id }, await visible(req)] } });
  }

  app.get("/customers/:id", { preHandler: need("customers.read") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await findVisible(req, id))) return reply.notFound("Customer not found");
    const role = (req.user as any).role;
    const [finance, documentsAllowed] = await Promise.all([allowed(role, "finance.read"), allowed(role, "documents.read")]);
    const customer = await prisma.customer.findUniqueOrThrow({
      where: { id },
      include: {
        assignedTo: person,
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, email: true } },
        activities: { orderBy: [{ at: "desc" }, { createdAt: "desc" }], take: 100 },
        tasks: { include: { assignee: person }, orderBy: [{ status: "asc" }, { dueAt: "asc" }] },
        deals: { orderBy: { createdAt: "desc" } },
        invoices: { include: { creditNotes: { select: { amount: true } } }, orderBy: { serial: "desc" } },
        payments: { include: { receipt: { select: { receiptNumber: true } }, allocations: { select: { amount: true, invoiceId: true } } }, orderBy: { createdAt: "desc" } },
        applications: { select: { id: true, reference: true, type: true, status: true, amountDue: true, createdAt: true }, orderBy: { createdAt: "desc" } },
        documents: { select: { id: true, name: true, docType: true, category: true, expiryDate: true, verification: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      },
    });
    const invoices = customer.invoices.map((invoice) => {
      const credited = invoice.creditNotes.reduce((sum, note) => sum + Number(note.amount), 0);
      return {
        id: invoice.id, number: invoiceNumberText(invoice.serial), issuedAt: invoice.issuedAt, dueAt: invoice.dueAt, currency: invoice.currency, exchangeRate: Number(invoice.exchangeRate),
        total: Number(invoice.total), paid: Number(invoice.paid), credited,
        due: invoiceDue(Number(invoice.total), Number(invoice.paid), credited),
        status: invoiceStatus({ state: invoice.state, total: Number(invoice.total), paid: Number(invoice.paid), credited, dueAt: invoice.dueAt }),
      };
    });
    const open = invoices.filter((invoice) => !["DRAFT", "CANCELLED", "REFUNDED"].includes(invoice.status));
    // In taka, each invoice at the rate it was issued with.
    const inTaka = (pick: (invoice: (typeof open)[number]) => number) => Math.round(open.reduce((s, i) => s + pick(i) * (i.exchangeRate || 1), 0) * 100) / 100;
    const summary = finance ? { invoiced: inTaka((i) => i.total), paid: inTaka((i) => i.paid), due: inTaka((i) => i.due) } : null;
    const shown = await hidePassport(req, customer);
    return {
      data: {
        ...withCode(shown),
        deals: customer.deals.map((deal) => withNumber({ ...deal, total: finance ? Number(deal.total) : null, recognized: finance ? Number(deal.recognized) : null })),
        invoices: finance ? invoices : invoices.map(({ total, paid, credited, due, ...rest }) => rest),
        payments: finance ? customer.payments.map((payment) => ({ id: payment.id, amount: Number(payment.amount), currency: payment.currency, method: payment.method, status: payment.status, paidAt: payment.paidAt ?? payment.createdAt, receiptNumber: payment.receipt?.receiptNumber ?? null, allocated: payment.allocations.reduce((s, a) => s + Number(a.amount), 0) })) : [],
        documents: documentsAllowed ? customer.documents : [],
        summary,
      },
    };
  });

  app.put("/customers/:id", { preHandler: need("customers.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const before = await findVisible(req, id);
    if (!before) return reply.notFound("Customer not found");
    const parsed = customerSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const { force, ...data } = parsed.data;
    if (!force) {
      const same = await duplicates(data.phone, data.email, id);
      if (same.length) return problem(reply, 409, "DUPLICATE_CUSTOMER", `Another customer already has this phone number or email: ${same[0].customerCode} ${same[0].name}.`, { details: { candidates: same } });
    }
    const staff = await staffOf(req);
    // Without the passport permission the passport details stay as they are.
    if (!(await allowed(staff.role, "passport.read"))) Object.assign(data, { passportNumber: before.passportNumber, passportCountry: before.passportCountry, passportExpiry: before.passportExpiry });
    // An employee cannot hand their customer to someone else.
    if (ownOnly(staff)) data.assignedToId = before.assignedToId;
    const updated = await prisma.customer.update({ where: { id }, data });
    const changes = changedFields(before as any, updated as any);
    delete (changes as any).updatedAt;
    if (Object.keys(changes).length) {
      await prisma.customerActivity.create({ data: { customerId: id, kind: "SYSTEM", summary: `Changed: ${Object.keys(changes).join(", ")}`, byId: staff.id, byName: staff.name } });
      await audit(req, { action: "customer.update", entityType: "customer", entityId: id, summary: `Changed ${withCode(updated).customerCode} ${updated.name}`, changes });
      if (data.assignedToId && data.assignedToId !== before.assignedToId && data.assignedToId !== staff.id)
        await notify(app, [data.assignedToId], { type: "TASK_ASSIGNED", title: `${updated.name} is now your customer`, body: `${staff.name} gave you ${withCode(updated).customerCode} ${updated.name}.`, link: `/admin/customers/${id}`, relatedType: "customer", relatedId: id, key: `customer-assigned:${id}:${data.assignedToId}:${Date.now()}` });
    }
    return { data: withCode(await hidePassport(req, updated)) };
  });

  app.delete("/customers/:id", { preHandler: need("customers.delete") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const customer = await prisma.customer.findUnique({ where: { id }, include: { _count: { select: { deals: true, invoices: true, payments: true } } } });
    if (!customer) return reply.notFound("Customer not found");
    if (customer._count.deals || customer._count.invoices || customer._count.payments)
      return problem(reply, 409, "CUSTOMER_IN_USE", "This customer has deals, invoices or payments, so the record is kept. Mark them Inactive instead.");
    await prisma.customer.delete({ where: { id } });
    await audit(req, { action: "customer.delete", entityType: "customer", entityId: id, summary: `Deleted ${withCode(customer).customerCode} ${customer.name}` });
    return reply.code(204).send();
  });

  app.post("/customers/:id/activities", { preHandler: need("customers.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await findVisible(req, id))) return reply.notFound("Customer not found");
    const parsed = activitySchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const staff = await staffOf(req);
    const activity = await prisma.customerActivity.create({ data: { customerId: id, kind: parsed.data.kind, summary: parsed.data.summary, at: parsed.data.at ?? new Date(), byId: staff.id, byName: staff.name } });
    await prisma.customer.update({ where: { id }, data: { updatedAt: new Date() } });
    return reply.code(201).send({ data: activity });
  });

  // A website application (and its applicant's account) becomes, or joins,
  // a customer.
  app.post("/customers/from-application/:applicationId", { preHandler: need("customers.create") }, async (req, reply) => {
    const { applicationId } = req.params as { applicationId: string };
    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) return reply.notFound("Application not found");
    const staff = await staffOf(req);
    let customer = application.customerId ? await prisma.customer.findUnique({ where: { id: application.customerId } }) : null;
    if (!customer) {
      const same = await duplicates(application.phone, application.email);
      customer = same.length ? await prisma.customer.findUnique({ where: { id: same[0].id } }) : null;
    }
    if (!customer)
      customer = await prisma.customer.create({
        data: {
          name: application.fullName, phone: application.phone, email: application.email.toLowerCase(), status: "ACTIVE", leadSource: "Website",
          category: application.type.charAt(0) + application.type.slice(1).toLowerCase(),
          assignedToId: ownOnly(staff) ? staff.id : null, branchId: staff.branchId, createdById: staff.id,
          ...(application.userId && !(await prisma.customer.count({ where: { userId: application.userId } })) ? { userId: application.userId } : {}),
          activities: { create: { kind: "SYSTEM", summary: `Added from application ${application.reference}`, byId: staff.id, byName: staff.name } },
        },
      });
    await prisma.application.update({ where: { id: applicationId }, data: { customerId: customer.id } });
    await prisma.payment.updateMany({ where: { applicationId, customerId: null }, data: { customerId: customer.id } });
    await audit(req, { action: "customer.link", entityType: "customer", entityId: customer.id, summary: `Linked application ${application.reference} to ${withCode(customer).customerCode}` });
    return reply.code(201).send({ data: withCode(customer) });
  });

  // ---- Tasks and follow-ups ------------------------------------------------

  async function taskScope(req: any) {
    const staff = await staffOf(req);
    return ownOnly(staff) ? { OR: [{ assigneeId: staff.id }, { createdById: staff.id }] } : {};
  }

  app.get("/tasks", { preHandler: need("tasks.read") }, async (req) => {
    const query = req.query as Record<string, string | undefined>;
    const staff = await staffOf(req);
    const where: any = { AND: [await taskScope(req)] };
    if (query.scope === "mine") where.AND.push({ assigneeId: staff.id });
    if (query.status) where.AND.push({ status: query.status });
    if (query.customerId) where.AND.push({ customerId: query.customerId });
    if (query.dealId) where.AND.push({ dealId: query.dealId });
    if (query.due === "overdue") where.AND.push({ status: "OPEN", dueAt: { lt: new Date() } });
    const rows = await prisma.task.findMany({
      where,
      include: { assignee: person, customer: { select: { id: true, name: true, code: true } }, deal: { select: { id: true, number: true, title: true } } },
      orderBy: [{ status: "asc" }, { dueAt: { sort: "asc", nulls: "last" } }, { createdAt: "desc" }],
      take: 300,
    });
    return { data: rows };
  });

  app.post("/tasks", { preHandler: need("tasks.create") }, async (req, reply) => {
    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const staff = await staffOf(req);
    const data = { ...parsed.data, assigneeId: ownOnly(staff) ? staff.id : parsed.data.assigneeId ?? staff.id };
    const task = await prisma.task.create({ data: { ...data, createdById: staff.id, createdByName: staff.name, completedAt: data.status === "DONE" ? new Date() : null } });
    if (task.assigneeId && task.assigneeId !== staff.id)
      await notify(app, [task.assigneeId], { type: "TASK_ASSIGNED", title: `New ${task.kind === "FOLLOW_UP" ? "follow-up" : "task"}: ${task.title}`, body: `${staff.name} gave you this${task.dueAt ? `, due ${task.dueAt.toISOString().slice(0, 10)}` : ""}.`, link: task.customerId ? `/admin/customers/${task.customerId}` : "/admin/tasks", relatedType: "task", relatedId: task.id, key: `task-assigned:${task.id}` });
    if (task.customerId) await prisma.customerActivity.create({ data: { customerId: task.customerId, kind: "SYSTEM", summary: `${task.kind === "FOLLOW_UP" ? "Follow-up" : "Task"} added: ${task.title}`, byId: staff.id, byName: staff.name } });
    return reply.code(201).send({ data: task });
  });

  app.put("/tasks/:id", { preHandler: need("tasks.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const before = await prisma.task.findFirst({ where: { AND: [{ id }, await taskScope(req)] } });
    if (!before) return reply.notFound("Task not found");
    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const staff = await staffOf(req);
    const data = { ...parsed.data, assigneeId: ownOnly(staff) ? before.assigneeId : parsed.data.assigneeId ?? before.assigneeId };
    const task = await prisma.task.update({
      where: { id },
      data: { ...data, completedAt: data.status === "DONE" ? before.completedAt ?? new Date() : null },
    });
    if (task.status === "DONE" && before.status !== "DONE" && task.customerId)
      await prisma.customerActivity.create({ data: { customerId: task.customerId, kind: "SYSTEM", summary: `Done: ${task.title}`, byId: staff.id, byName: staff.name } });
    if (task.assigneeId && task.assigneeId !== before.assigneeId && task.assigneeId !== staff.id)
      await notify(app, [task.assigneeId], { type: "TASK_ASSIGNED", title: `Task given to you: ${task.title}`, body: `${staff.name} gave you this task.`, link: "/admin/tasks", relatedType: "task", relatedId: task.id, key: `task-assigned:${task.id}:${task.assigneeId}` });
    return { data: task };
  });

  app.delete("/tasks/:id", { preHandler: need("tasks.delete") }, async (req, reply) => {
    const { count } = await prisma.task.deleteMany({ where: { AND: [{ id: (req.params as { id: string }).id }, await taskScope(req)] } });
    return count ? reply.code(204).send() : reply.notFound("Task not found");
  });

  // ---- Lists and people ------------------------------------------------------

  app.get("/lookups/:kind", async (req, reply) => {
    const { kind } = req.params as { kind: string };
    if (!LOOKUP_KINDS.includes(kind)) return reply.notFound("Unknown list");
    return { data: await prisma.lookup.findMany({ where: { kind }, orderBy: { value: "asc" }, select: { value: true } }).then((rows) => rows.map((row) => row.value)) };
  });

  app.post("/lookups/:kind", async (req, reply) => {
    const { kind } = req.params as { kind: string };
    if (!LOOKUP_KINDS.includes(kind)) return reply.notFound("Unknown list");
    const parsed = lookupSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const existing = await prisma.lookup.findFirst({ where: { kind, value: { equals: parsed.data.value, mode: "insensitive" } } });
    if (existing) return { data: existing.value };
    await prisma.lookup.create({ data: { kind, value: parsed.data.value } });
    return reply.code(201).send({ data: parsed.data.value });
  });

  // Staff to assign work to.
  app.get("/staff", async () => ({
    data: await prisma.user.findMany({
      where: { role: { in: [...STAFF_ROLES] as any }, blockedAt: null },
      select: { id: true, name: true, email: true, role: true, branchId: true, allBranches: true, branch: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  }));

  void num;
};

export default crm;
