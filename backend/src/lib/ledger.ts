// Hisab Kitab entries the website makes by itself: every payment received,
// online or recorded by staff, is income, and every refund completed is an
// expense. Each is entered once, linked to the payment or refund it records.
import { prisma } from "./prisma.js";
import { received, taka } from "./payment-rules.js";
import { postCashbookEntry } from "./office-service.js";

type Db = Pick<typeof prisma, "payment" | "refund" | "financialCategory" | "financialTransaction">;

export const PAYMENTS_CATEGORY = "Service payments";
export const REFUNDS_CATEGORY = "Refunds";

// The category, made the first time it is needed. A category of that name
// kept for the other kind of entry is left alone and a separate one is made.
async function category(db: Db, name: string, type: "INCOME" | "EXPENSE") {
  const found = await db.financialCategory.findFirst({ where: { name: { equals: name, mode: "insensitive" }, type } });
  if (found) return found.id;
  const taken = await db.financialCategory.count({ where: { name: { equals: name, mode: "insensitive" } } });
  const label = taken ? `${name} (${type === "INCOME" ? "income" : "expense"})` : name;
  const existing = await db.financialCategory.findFirst({ where: { name: label, type } });
  return existing?.id ?? (await db.financialCategory.create({ data: { name: label, type } })).id;
}

// Enters a received payment as income. Safe to call more than once.
export async function enterPayment(db: Db, paymentId: string) {
  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: {
      ledgerEntry: { select: { id: true } },
      application: { select: { reference: true, fullName: true } },
      user: { select: { name: true } },
    },
  });
  if (!payment || payment.ledgerEntry || !received(payment.status)) return null;
  const reference = payment.application ? ` · ${payment.application.reference}` : "";
  const row = await db.financialTransaction.create({
    data: {
      type: "INCOME",
      date: payment.paidAt ?? payment.createdAt,
      description: `${payment.service} — paid by ${payment.method}`,
      notes: `Transaction ${payment.gatewayTransactionId ?? payment.transactionId}${reference}`,
      customer: payment.application?.fullName ?? payment.user?.name ?? null,
      total: payment.amount,
      paymentStatus: payment.status,
      categoryId: await category(db, PAYMENTS_CATEGORY, "INCOME"),
      userId: payment.userId,
      applicationId: payment.applicationId,
      paymentId: payment.id,
    },
  });
  // Posted at once: into the money account it came through, as income.
  await postCashbookEntry(db, row.id, { name: "Website payment" });
  return row;
}

// Enters a completed refund as an expense. Safe to call more than once.
export async function enterRefund(db: Db, refundId: string) {
  const refund = await db.refund.findUnique({
    where: { id: refundId },
    include: {
      ledgerEntry: { select: { id: true } },
      payment: { include: { application: { select: { reference: true, fullName: true } }, user: { select: { name: true } } } },
    },
  });
  if (!refund || refund.ledgerEntry || refund.status !== "COMPLETED") return null;
  const { payment } = refund;
  const row = await db.financialTransaction.create({
    data: {
      type: "EXPENSE",
      date: new Date(),
      description: `Refund of ${taka(Number(refund.amount))} — ${payment.service}`,
      notes: `${refund.reason} · returned by ${refund.method}${payment.application ? ` · ${payment.application.reference}` : ""}`,
      customer: payment.application?.fullName ?? payment.user?.name ?? null,
      total: refund.amount,
      categoryId: await category(db, REFUNDS_CATEGORY, "EXPENSE"),
      userId: payment.userId,
      applicationId: payment.applicationId,
      refundId: refund.id,
    },
  });
  await postCashbookEntry(db, row.id, { name: "Website refund" });
  return row;
}

// The start and end of a calendar day in Bangladesh (UTC+6, no daylight
// saving), whatever the server's own time zone is. Null for a bad date.
export const BUSINESS_OFFSET = "+06:00";
export function dayWindow(day: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  // 2025-02-30 is not a date, though JavaScript would read it as 2 March.
  const noon = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(noon.getTime()) || noon.toISOString().slice(0, 10) !== day) return null;
  const start = new Date(`${day}T00:00:00.000${BUSINESS_OFFSET}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start, end };
}

// Today's date in Bangladesh, as YYYY-MM-DD.
export const businessToday = (now = new Date()) => new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString().slice(0, 10);
