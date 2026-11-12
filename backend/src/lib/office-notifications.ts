// Notifications for staff: shown in the admin and, when the person has
// asked for it, sent by email. Each has a key so the same reminder is never
// sent twice, however often the sweep runs.
import type { FastifyInstance } from "fastify";
import { prisma } from "./prisma.js";
import { overrides } from "./access.js";
import { can, STAFF_ROLES } from "./permissions.js";
import { brandedMail, siteUrl } from "./email-layout.js";
import { getSettings } from "./settings.js";
import { invoiceDue } from "./invoice-lifecycle.js";

export const NOTIFICATION_TYPES = {
  PAYMENT_REMINDER: "Payment reminder",
  FOLLOW_UP: "Follow-up reminder",
  DEADLINE: "Work deadline",
  DOCUMENT_EXPIRY: "Document expiry",
  NEW_INVOICE: "New invoice",
  PENDING_APPROVAL: "Waiting for approval",
  TASK_ASSIGNED: "Task given to you",
} as const;
export type NotificationType = keyof typeof NOTIFICATION_TYPES;

type Message = { type: NotificationType; title: string; body: string; link?: string; relatedType?: string; relatedId?: string; key: string };

// Sends one message to each person once. Returns how many were new.
export async function notify(app: FastifyInstance | null, userIds: (string | null | undefined)[], message: Message) {
  const people = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (!people.length) return 0;
  const users = await prisma.user.findMany({
    where: { id: { in: people }, blockedAt: null, role: { in: [...STAFF_ROLES] as any } },
    select: { id: true, email: true, name: true, notificationPreferences: { where: { type: message.type } } },
  });
  let created = 0;
  for (const user of users) {
    const preference = user.notificationPreferences[0];
    const inApp = preference?.inApp ?? true;
    const byEmail = preference?.email ?? false;
    if (!inApp && !byEmail) continue;
    const dedupeKey = `${message.key}:${user.id}`;
    try {
      const row = await prisma.notification.create({
        data: {
          userId: user.id,
          type: message.type,
          title: message.title.slice(0, 200),
          body: message.body.slice(0, 1000),
          link: message.link ?? null,
          relatedType: message.relatedType ?? null,
          relatedId: message.relatedId ?? null,
          channel: byEmail ? "EMAIL" : "IN_APP",
          status: "SENT",
          sentAt: new Date(),
          dedupeKey,
        },
      });
      created++;
      if (byEmail && app?.mailer?.configured)
        app.mailer
          .send(brandedMail(user.email, message.title, { heading: message.title, paragraphs: [message.body], ...(message.link ? { action: { label: "Open in the admin", url: `${siteUrl()}${message.link}` } } : {}) }))
          .catch(async (error: unknown) => {
            await prisma.notification.update({ where: { id: row.id }, data: { status: "FAILED", error: String((error as Error)?.message ?? error).slice(0, 300) } });
          });
    } catch (error) {
      // The key exists: this reminder was sent before.
      if ((error as { code?: string }).code !== "P2002") throw error;
    }
  }
  return created;
}

// The active staff whose role has a permission.
export async function staffWith(permission: string) {
  const changes = await overrides();
  const roles = STAFF_ROLES.filter((role) => can(role, permission, changes));
  const users = await prisma.user.findMany({ where: { role: { in: roles as any }, blockedAt: null }, select: { id: true } });
  return users.map((user) => user.id);
}

const DAY = 86_400_000;
const dhakaDate = (date: Date) => new Date(date.getTime() + 6 * 3600_000).toISOString().slice(0, 10);
const endOfToday = (now: Date) => new Date(`${dhakaDate(now)}T23:59:59.999+06:00`);

// Goes through everything with a date and sends what is due. Safe to run as
// often as wanted.
export async function sweep(app: FastifyInstance | null, now = new Date()) {
  const settings = await getSettings();
  let sent = 0;
  const admins = await staffWith("approvals.approve");

  // Documents about to expire.
  const longest = Math.max(0, ...settings.documentExpiryDays);
  const documents = await prisma.managedDocument.findMany({
    where: { expiryDate: { not: null, lte: new Date(now.getTime() + longest * DAY), gte: new Date(now.getTime() - DAY) } },
    select: { id: true, name: true, expiryDate: true, uploadedById: true, customer: { select: { assignedToId: true, name: true } } },
  });
  for (const document of documents) {
    const left = Math.ceil((document.expiryDate!.getTime() - now.getTime()) / DAY);
    const threshold = [...settings.documentExpiryDays].sort((a, b) => a - b).find((days) => left <= days);
    if (threshold === undefined) continue;
    sent += await notify(app, [document.uploadedById, document.customer?.assignedToId, ...admins], {
      type: "DOCUMENT_EXPIRY",
      title: left <= 0 ? `${document.name} has expired` : `${document.name} expires in ${left} day${left === 1 ? "" : "s"}`,
      body: `${document.name}${document.customer ? ` (${document.customer.name})` : ""} expires on ${dhakaDate(document.expiryDate!)}.`,
      link: `/admin/documents?open=${document.id}`,
      relatedType: "document",
      relatedId: document.id,
      key: `doc-expiry:${document.id}:${threshold}`,
    });
  }

  // Invoices coming due, and overdue ones once a week.
  const accountants = await staffWith("payments.create");
  const reminderDays = Math.max(0, ...settings.paymentReminderDays);
  const invoices = await prisma.invoice.findMany({
    where: { state: "ISSUED", dueAt: { not: null, lte: new Date(now.getTime() + reminderDays * DAY) } },
    select: { id: true, serial: true, customerName: true, total: true, paid: true, dueAt: true, currency: true, customer: { select: { assignedToId: true } }, creditNotes: { select: { amount: true } } },
  });
  for (const invoice of invoices) {
    const credited = invoice.creditNotes.reduce((sum, note) => sum + Number(note.amount), 0);
    const due = invoiceDue(Number(invoice.total), Number(invoice.paid), credited);
    if (due <= 0) continue;
    const late = invoice.dueAt!.getTime() < now.getTime();
    const week = Math.floor(now.getTime() / (7 * DAY));
    const number = `INV-${String(invoice.serial).padStart(6, "0")}`;
    sent += await notify(app, [invoice.customer?.assignedToId, ...accountants], {
      type: "PAYMENT_REMINDER",
      title: late ? `${number} is overdue` : `${number} is due on ${dhakaDate(invoice.dueAt!)}`,
      body: `${invoice.customerName} still owes ${invoice.currency} ${due.toLocaleString("en-US")} on ${number}.`,
      link: `/admin/print/invoice/${invoice.id}`,
      relatedType: "invoice",
      relatedId: invoice.id,
      key: late ? `invoice-overdue:${invoice.id}:${week}` : `invoice-due:${invoice.id}`,
    });
  }

  // Follow-ups with customers and tasks due today or earlier.
  const today = endOfToday(now);
  const customers = await prisma.customer.findMany({ where: { nextFollowUpAt: { not: null, lte: today } }, select: { id: true, name: true, nextFollowUpAt: true, assignedToId: true } });
  for (const customer of customers)
    sent += await notify(app, customer.assignedToId ? [customer.assignedToId] : admins, {
      type: "FOLLOW_UP",
      title: `Follow up with ${customer.name}`,
      body: `A follow-up with ${customer.name} was due on ${dhakaDate(customer.nextFollowUpAt!)}.`,
      link: `/admin/customers/${customer.id}`,
      relatedType: "customer",
      relatedId: customer.id,
      key: `followup:${customer.id}:${dhakaDate(customer.nextFollowUpAt!)}`,
    });
  const tasks = await prisma.task.findMany({ where: { status: "OPEN", dueAt: { not: null, lte: today } }, select: { id: true, title: true, kind: true, dueAt: true, assigneeId: true, customerId: true } });
  for (const task of tasks)
    sent += await notify(app, task.assigneeId ? [task.assigneeId] : admins, {
      type: task.kind === "FOLLOW_UP" ? "FOLLOW_UP" : "DEADLINE",
      title: task.dueAt! < now ? `Overdue: ${task.title}` : `Due today: ${task.title}`,
      body: `${task.title} was due on ${dhakaDate(task.dueAt!)}.`,
      link: task.customerId ? `/admin/customers/${task.customerId}` : "/admin/tasks",
      relatedType: "task",
      relatedId: task.id,
      key: `task-due:${task.id}:${dhakaDate(task.dueAt!)}`,
    });

  // Deals whose work is due to finish soon.
  const deadlineDays = Math.max(0, ...settings.dealDeadlineDays);
  const deals = await prisma.deal.findMany({
    where: { status: "ACTIVE", endDate: { not: null, lte: new Date(now.getTime() + deadlineDays * DAY) } },
    select: { id: true, number: true, title: true, endDate: true, assignedToId: true, customer: { select: { name: true, assignedToId: true } } },
  });
  for (const deal of deals) {
    const left = Math.ceil((deal.endDate!.getTime() - now.getTime()) / DAY);
    const threshold = [...settings.dealDeadlineDays].sort((a, b) => a - b).find((days) => left <= days) ?? 0;
    sent += await notify(app, [deal.assignedToId ?? deal.customer.assignedToId, ...(deal.assignedToId ? [] : admins)], {
      type: "DEADLINE",
      title: left <= 0 ? `Deadline passed: ${deal.title}` : `${deal.title} is due in ${left} day${left === 1 ? "" : "s"}`,
      body: `The work for ${deal.customer.name} (D-${String(deal.number).padStart(6, "0")}) is due to be finished on ${dhakaDate(deal.endDate!)}.`,
      link: `/admin/deals/${deal.id}`,
      relatedType: "deal",
      relatedId: deal.id,
      key: `deal-deadline:${deal.id}:${left <= 0 ? "passed" : threshold}`,
    });
  }
  return sent;
}
