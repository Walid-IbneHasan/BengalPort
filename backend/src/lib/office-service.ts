// The office's money work, each step posted to the accounts: issuing,
// revising, cancelling and crediting invoices; payments and how they are
// shared out between invoices; refunds; recognising revenue; and the Hisab
// Kitab entries the cash book is made of.
import { prisma } from "./prisma.js";
import { ACCOUNT, categoryAccount, moneyCodeFor, postJournal, reverseJournal, round2, toBase } from "./accounting.js";
import { allocationPosting, creditNotePosting, invoiceDue, invoiceNumberText, invoiceStatus, issuePosting, paymentPosting, recognitionPosting } from "./invoice-lifecycle.js";
import { receiptNumber, randomCode } from "./reference.js";

type Db = any;
export type By = { id?: string | null; name: string };

export class OfficeError extends Error {
  constructor(public statusCode: number, public code: string, message: string) {
    super(message);
  }
}
const fail = (status: number, code: string, message: string): never => {
  throw new OfficeError(status, code, message);
};

// ---- Invoices --------------------------------------------------------------

export function invoiceFigures(row: { state: string; total: unknown; paid: unknown; dueAt: Date | null; creditNotes?: { amount: unknown }[] }, now = new Date()) {
  const total = Number(row.total), paid = Number(row.paid);
  const credited = round2((row.creditNotes ?? []).reduce((sum, note) => sum + Number(note.amount), 0));
  return { total, paid, credited, due: invoiceDue(total, paid, credited), status: invoiceStatus({ state: row.state, total, paid, credited, dueAt: row.dueAt }, now) };
}

// Whether issuing an invoice posts it to the accounts.
export const inTheBooks = (invoice: { transactionId?: string | null; applicationId?: string | null }) => !invoice.transactionId && !invoice.applicationId;

export async function issueInvoice(db: Db, id: string, by: By, signatureId: string | null) {
  const invoice = await db.invoice.findUnique({ where: { id } });
  if (!invoice) fail(404, "NOT_FOUND", "Invoice not found");
  if (invoice.state !== "DRAFT") fail(409, "ALREADY_ISSUED", "This invoice has already been issued. Change it with a revision, a credit note or a cancellation.");
  // A bill for a Hisab Kitab entry or a website application is paper only:
  // its money is already in the books through the cash book, as revenue
  // when it is received, so posting it again would count it twice.
  if (!inTheBooks(invoice)) return db.invoice.update({ where: { id }, data: { state: "ISSUED", signatureId, issuedByName: by.name } });
  const entry = await postJournal(db, {
    date: invoice.issuedAt,
    memo: `Invoice ${invoiceNumberText(invoice.serial)} issued to ${invoice.customerName}`,
    sourceType: "invoice",
    sourceId: id,
    branchId: invoice.branchId,
    by,
    lines: issuePosting({ total: Number(invoice.total), currency: invoice.currency, exchangeRate: Number(invoice.exchangeRate), customerId: invoice.customerId }),
  });
  return db.invoice.update({ where: { id }, data: { state: "ISSUED", journalEntryId: entry.id, signatureId, issuedByName: by.name } });
}

// A revision keeps the issued version as it was and makes the new one.
export async function reviseInvoice(db: Db, id: string, by: By, changes: Record<string, any>, reason: string) {
  const invoice = await db.invoice.findUnique({ where: { id }, include: { creditNotes: true } });
  if (!invoice) fail(404, "NOT_FOUND", "Invoice not found");
  if (invoice.state !== "ISSUED") fail(409, "NOT_ISSUED", invoice.state === "DRAFT" ? "A draft is edited directly." : "A cancelled or refunded invoice cannot be revised.");
  const { credited } = invoiceFigures(invoice);
  if (Math.round(changes.total * 100) < Math.round((Number(invoice.paid) + credited) * 100))
    fail(400, "BELOW_SETTLED", `The new total cannot be less than what is already paid or credited (${invoice.currency} ${(Number(invoice.paid) + credited).toLocaleString("en-US")}).`);
  if (changes.currency && changes.currency !== invoice.currency && Number(invoice.paid) > 0) fail(400, "CURRENCY_LOCKED", "The currency cannot change once money has been received.");
  const { creditNotes, ...snapshot } = invoice;
  await db.invoiceRevision.create({ data: { invoiceId: id, version: invoice.version, snapshot: JSON.parse(JSON.stringify(snapshot)), reason, byName: by.name } });
  if (!invoice.journalEntryId) return db.invoice.update({ where: { id }, data: { ...changes, version: invoice.version + 1 } });
  await reverseJournal(db, invoice.journalEntryId, by, `revised (version ${invoice.version + 1})`);
  const next = { ...invoice, ...changes };
  const entry = await postJournal(db, {
    date: new Date(),
    memo: `Invoice ${invoiceNumberText(invoice.serial)} revised to version ${invoice.version + 1}`,
    sourceType: "invoice",
    sourceId: id,
    branchId: invoice.branchId,
    by,
    lines: issuePosting({ total: Number(next.total), currency: next.currency, exchangeRate: Number(next.exchangeRate), customerId: next.customerId }),
  });
  return db.invoice.update({ where: { id }, data: { ...changes, version: invoice.version + 1, journalEntryId: entry.id } });
}

export async function cancelInvoice(db: Db, id: string, by: By, reason: string) {
  const invoice = await db.invoice.findUnique({ where: { id }, include: { creditNotes: true } });
  if (!invoice) fail(404, "NOT_FOUND", "Invoice not found");
  if (invoice.state === "CANCELLED") fail(409, "ALREADY_CANCELLED", "This invoice is already cancelled.");
  if (invoice.state === "REFUNDED") fail(409, "REFUNDED", "A refunded invoice cannot be cancelled.");
  if (Number(invoice.paid) > 0) fail(409, "HAS_PAYMENTS", "Money has been received on this invoice. Refund the payment or add a credit note instead of cancelling.");
  if (invoice.state === "ISSUED" && invoice.journalEntryId) {
    const { due } = invoiceFigures(invoice);
    if (due > 0)
      await postJournal(db, {
        date: new Date(),
        memo: `Invoice ${invoiceNumberText(invoice.serial)} cancelled: ${reason}`,
        sourceType: "invoice",
        sourceId: id,
        branchId: invoice.branchId,
        by,
        lines: creditNotePosting({ amount: due, currency: invoice.currency, exchangeRate: Number(invoice.exchangeRate), customerId: invoice.customerId }),
      });
  }
  return db.invoice.update({ where: { id }, data: { state: "CANCELLED", cancelledAt: new Date(), cancelReason: reason } });
}

export async function addCreditNote(db: Db, id: string, by: By, amount: number, reason: string) {
  const invoice = await db.invoice.findUnique({ where: { id }, include: { creditNotes: true } });
  if (!invoice) fail(404, "NOT_FOUND", "Invoice not found");
  if (invoice.state !== "ISSUED") fail(409, "NOT_ISSUED", "A credit note is for an issued invoice.");
  const { due } = invoiceFigures(invoice);
  if (Math.round(amount * 100) > Math.round(due * 100)) fail(400, "MORE_THAN_DUE", `A credit note can be at most what is still due: ${invoice.currency} ${due.toLocaleString("en-US")}.`);
  if (!invoice.journalEntryId) return db.creditNote.create({ data: { invoiceId: id, amount, reason, byName: by.name } });
  const entry = await postJournal(db, {
    date: new Date(),
    memo: `Credit note on ${invoiceNumberText(invoice.serial)}: ${reason}`,
    sourceType: "credit-note",
    sourceId: id,
    branchId: invoice.branchId,
    by,
    lines: creditNotePosting({ amount, currency: invoice.currency, exchangeRate: Number(invoice.exchangeRate), customerId: invoice.customerId }),
  });
  return db.creditNote.create({ data: { invoiceId: id, amount, reason, journalEntryId: entry.id, byName: by.name } });
}

// ---- Payments --------------------------------------------------------------

type Allocation = { invoiceId: string; amount: number };

async function checkAllocations(db: Db, customerId: string, currency: string, allocations: Allocation[], available: number) {
  const total = round2(allocations.reduce((sum, item) => sum + item.amount, 0));
  if (Math.round(total * 100) > Math.round(available * 100)) fail(400, "OVER_ALLOCATED", `Only ${currency} ${available.toLocaleString("en-US")} of this payment is left to share out.`);
  const invoices = await db.invoice.findMany({ where: { id: { in: allocations.map((item) => item.invoiceId) } }, include: { creditNotes: true } });
  for (const item of allocations) {
    const invoice = invoices.find((row: any) => row.id === item.invoiceId);
    if (!invoice || invoice.customerId !== customerId) fail(400, "WRONG_INVOICE", "Choose invoices of this customer.");
    if (invoice.state !== "ISSUED") fail(400, "NOT_ISSUED", `${invoiceNumberText(invoice.serial)} is not an issued invoice.`);
    if (!invoice.journalEntryId) fail(400, "NOT_IN_BOOKS", `${invoiceNumberText(invoice.serial)} is paid through its ${invoice.applicationId ? "application" : "Hisab Kitab entry"}, not here.`);
    if (invoice.currency !== currency) fail(400, "CURRENCY_MISMATCH", `${invoiceNumberText(invoice.serial)} is in ${invoice.currency}; record the payment in the same currency.`);
    const { due } = invoiceFigures(invoice);
    if (Math.round(item.amount * 100) > Math.round(due * 100)) fail(400, "MORE_THAN_DUE", `${invoiceNumberText(invoice.serial)} has only ${currency} ${due.toLocaleString("en-US")} due.`);
  }
  return invoices;
}

async function moneyAccountId(db: Db, chosen: string | null | undefined, method: string) {
  if (chosen) {
    const account = await db.ledgerAccount.findFirst({ where: { OR: [{ id: chosen }, { code: chosen }], subtype: { in: ["CASH", "BANK", "MOBILE"] }, active: true } });
    if (!account) fail(400, "NOT_MONEY_ACCOUNT", "Choose a cash, bank or mobile banking account.");
    return account;
  }
  return db.ledgerAccount.findUniqueOrThrow({ where: { code: moneyCodeFor(method) } });
}

async function servicePaymentsCategory(db: Db) {
  const found = await db.financialCategory.findFirst({ where: { name: { equals: "Service payments", mode: "insensitive" }, type: "INCOME" } });
  return found ?? db.financialCategory.create({ data: { name: "Service payments", type: "INCOME" } });
}

// Money from a customer, recorded at the office. The parts given to invoices
// pay them; the rest waits as the customer's advance.
export async function recordPayment(db: Db, input: { customerId: string; amount: number; currency: string; exchangeRate: number; method: string; moneyAccount?: string | null; reference?: string | null; date?: Date | null; notes?: string | null; allocations: Allocation[] }, by: By) {
  const customer = await db.customer.findUnique({ where: { id: input.customerId } });
  if (!customer) fail(404, "NOT_FOUND", "Customer not found");
  const invoices = await checkAllocations(db, customer.id, input.currency, input.allocations, input.amount);
  const account = await moneyAccountId(db, input.moneyAccount, input.method);
  const date = input.date ?? new Date();
  const owedBefore = round2(invoices.reduce((sum: number, invoice: any) => sum + invoiceFigures(invoice).due, 0));
  const allocated = round2(input.allocations.reduce((sum, item) => sum + item.amount, 0));
  const payment = await db.payment.create({
    data: {
      customerId: customer.id,
      userId: customer.userId,
      service: input.notes || `Payment from ${customer.name}`,
      amount: input.amount,
      totalDue: Math.max(input.amount, owedBefore),
      method: input.method,
      transactionId: input.reference || `BP-PAY-${randomCode(10)}`,
      status: "PAID",
      provider: "office",
      paidAt: date,
      currency: input.currency,
      exchangeRate: input.exchangeRate,
      moneyAccountId: account.id,
      receipt: { create: { receiptNumber: receiptNumber(), previousDue: owedBefore || input.amount, remainingDue: Math.max(0, round2(owedBefore - allocated)) } },
    },
    include: { receipt: true },
  });
  const entry = await postJournal(db, {
    date,
    memo: `Payment from ${customer.name} by ${input.method}`,
    sourceType: "payment",
    sourceId: payment.id,
    branchId: customer.branchId,
    by,
    lines: paymentPosting(
      { amount: input.amount, currency: input.currency, exchangeRate: input.exchangeRate, moneyCode: account.id, customerId: customer.id },
      input.allocations.map((item) => ({ amount: item.amount, invoiceRate: Number(invoices.find((invoice: any) => invoice.id === item.invoiceId).exchangeRate) })),
    ),
  });
  for (const item of input.allocations) {
    await db.paymentAllocation.create({ data: { paymentId: payment.id, invoiceId: item.invoiceId, amount: item.amount, journalEntryId: entry.id } });
    await db.invoice.update({ where: { id: item.invoiceId }, data: { paid: { increment: item.amount } } });
  }
  await db.payment.update({ where: { id: payment.id }, data: { journalEntryId: entry.id } });
  // It is in the day's cash book too, already posted.
  const category = await servicePaymentsCategory(db);
  await db.financialTransaction.create({
    data: {
      type: "INCOME",
      date,
      description: `${customer.name} — paid by ${input.method}`,
      notes: `${input.currency !== "BDT" ? `${input.currency} ${input.amount} at ${input.exchangeRate} · ` : ""}Transaction ${payment.transactionId}`,
      customer: customer.name,
      total: toBase(input.amount, input.exchangeRate),
      paymentStatus: "PAID",
      categoryId: category.id,
      userId: customer.userId,
      paymentId: payment.id,
      journalEntryId: entry.id,
      moneyAccountId: account.id,
    },
  });
  return { ...payment, journalEntryId: entry.id };
}

// Part of an earlier payment, still an advance, given to invoices.
export async function allocatePayment(db: Db, paymentId: string, allocations: Allocation[], by: By) {
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { allocations: true, refunds: true } });
  if (!payment || !payment.customerId) fail(404, "NOT_FOUND", "Office payment not found");
  const refunded = payment.refunds.filter((r: any) => r.status === "COMPLETED").reduce((s: number, r: any) => s + Number(r.amount), 0);
  const free = round2(Number(payment.amount) - payment.allocations.reduce((s: number, a: any) => s + Number(a.amount), 0) - refunded);
  const invoices = await checkAllocations(db, payment.customerId, payment.currency, allocations, free);
  const lines = allocations.flatMap((item) =>
    allocationPosting({ amount: item.amount, paymentRate: Number(payment.exchangeRate), invoiceRate: Number(invoices.find((invoice: any) => invoice.id === item.invoiceId).exchangeRate), currency: payment.currency, customerId: payment.customerId }),
  );
  const entry = await postJournal(db, { date: new Date(), memo: `Advance from payment ${payment.transactionId} given to invoices`, sourceType: "allocation", sourceId: paymentId, by, lines });
  for (const item of allocations) {
    await db.paymentAllocation.create({ data: { paymentId, invoiceId: item.invoiceId, amount: item.amount, journalEntryId: entry.id } });
    await db.invoice.update({ where: { id: item.invoiceId }, data: { paid: { increment: item.amount } } });
  }
  return entry;
}

async function refundsCategory(db: Db) {
  const found = await db.financialCategory.findFirst({ where: { name: { equals: "Refunds", mode: "insensitive" }, type: "EXPENSE" } });
  return found ?? db.financialCategory.create({ data: { name: "Refunds", type: "EXPENSE" } });
}

// Money returned from an office payment. What was still an advance comes off
// the advance; the rest is a refund expense. When everything paid on an
// invoice has gone back, the invoice is marked refunded.
export async function refundOfficePayment(db: Db, paymentId: string, input: { amount: number; reason: string; method: string }, by: By) {
  const payment = await db.payment.findUnique({ where: { id: paymentId }, include: { allocations: true, refunds: true, customer: true } });
  if (!payment || payment.provider !== "office") fail(404, "NOT_FOUND", "Office payment not found");
  const refunded = payment.refunds.filter((r: any) => r.status === "COMPLETED").reduce((s: number, r: any) => s + Number(r.amount), 0);
  const left = round2(Number(payment.amount) - refunded);
  if (Math.round(input.amount * 100) > Math.round(left * 100)) fail(400, "MORE_THAN_PAID", `At most ${payment.currency} ${left.toLocaleString("en-US")} of this payment can be refunded.`);
  const allocated = payment.allocations.reduce((s: number, a: any) => s + Number(a.amount), 0);
  const advance = Math.max(0, round2(Number(payment.amount) - allocated - refunded));
  const fromAdvance = Math.min(advance, input.amount);
  const rate = Number(payment.exchangeRate);
  const lines = [
    ...(fromAdvance > 0 ? [{ account: ACCOUNT.advances, debit: toBase(fromAdvance, rate), currency: payment.currency, amount: fromAdvance, exchangeRate: rate, customerId: payment.customerId }] : []),
    ...(input.amount - fromAdvance > 0 ? [{ account: ACCOUNT.refunds, debit: toBase(round2(input.amount - fromAdvance), rate), currency: payment.currency, amount: round2(input.amount - fromAdvance), exchangeRate: rate, customerId: payment.customerId }] : []),
    { account: payment.moneyAccountId ?? ACCOUNT.cash, credit: toBase(input.amount, rate), currency: payment.currency, amount: input.amount, exchangeRate: rate, customerId: payment.customerId },
  ];
  // The two debits are rounded on their own; any paisa left goes on the first.
  const debits = round2(lines.slice(0, -1).reduce((s, l: any) => s + l.debit, 0));
  const credit = (lines.at(-1) as any).credit;
  if (debits !== credit) (lines[0] as any).debit = round2((lines[0] as any).debit + credit - debits);
  const entry = await postJournal(db, { date: new Date(), memo: `Refund to ${payment.customer?.name ?? "customer"}: ${input.reason}`, sourceType: "refund", sourceId: paymentId, by, lines });
  const refund = await db.refund.create({ data: { paymentId, amount: input.amount, reason: input.reason, method: input.method, status: "COMPLETED", recordedBy: by.name } });
  const category = await refundsCategory(db);
  await db.financialTransaction.create({
    data: { type: "EXPENSE", date: new Date(), description: `Refund to ${payment.customer?.name ?? "customer"}`, notes: input.reason, customer: payment.customer?.name ?? null, total: toBase(input.amount, rate), categoryId: category.id, userId: payment.userId, refundId: refund.id, journalEntryId: entry.id, moneyAccountId: payment.moneyAccountId },
  });
  const totalRefunded = round2(refunded + input.amount);
  if (totalRefunded >= Number(payment.amount)) await db.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED" } });
  for (const allocation of payment.allocations) {
    const invoice = await db.invoice.findUnique({ where: { id: allocation.invoiceId } });
    if (invoice && totalRefunded >= allocated && Number(invoice.paid) <= Number(allocation.amount) + 0.001 && Number(invoice.paid) > 0)
      await db.invoice.update({ where: { id: invoice.id }, data: { state: "REFUNDED" } });
  }
  return refund;
}

// ---- Revenue ---------------------------------------------------------------

// Revenue earned on a deal: what its issued invoices ask for (in taka, less
// credit notes) and not yet recognised. Recognises all of it, or `amount`.
export async function recognizeDeal(db: Db, dealId: string, by: By, amount?: number) {
  const deal = await db.deal.findUnique({ where: { id: dealId }, include: { invoices: { where: { state: { in: ["ISSUED", "REFUNDED"] } }, include: { creditNotes: true } } } });
  if (!deal) fail(404, "NOT_FOUND", "Deal not found");
  const invoiced = round2(deal.invoices.reduce((sum: number, invoice: any) => {
    const credited = invoice.creditNotes.reduce((s: number, n: any) => s + Number(n.amount), 0);
    return sum + toBase(Number(invoice.total) - credited, Number(invoice.exchangeRate));
  }, 0));
  const open = round2(invoiced - Number(deal.recognized));
  const value = amount === undefined ? open : round2(amount);
  if (value <= 0) return null;
  if (Math.round(value * 100) > Math.round(open * 100)) fail(400, "MORE_THAN_INVOICED", `Only ৳${open.toLocaleString("en-US")} invoiced on this deal is not yet recognised.`);
  const entry = await postJournal(db, { date: new Date(), memo: `Revenue earned on D-${String(deal.number).padStart(6, "0")} ${deal.title}`, sourceType: "deal", sourceId: dealId, branchId: deal.branchId, by, lines: recognitionPosting(value, deal.customerId) });
  await db.deal.update({ where: { id: dealId }, data: { recognized: { increment: value } } });
  return entry;
}

// ---- The cash book ---------------------------------------------------------

// Posts a Hisab Kitab entry that has no posting yet: income into a cash,
// bank or mobile account; an expense out of one, or into accounts payable
// while it is still due.
export async function postCashbookEntry(db: Db, entryId: string, by: By) {
  const entry = await db.financialTransaction.findUnique({ where: { id: entryId }, include: { category: true, payment: { select: { method: true } } } });
  if (!entry || entry.journalEntryId) return null;
  const categoryAccountId = await categoryAccount(db, entry.category);
  const money = entry.moneyAccountId ?? (await db.ledgerAccount.findUniqueOrThrow({ where: { code: moneyCodeFor(entry.payment?.method) } })).id;
  const total = Number(entry.total);
  // A bill entered as still to pay owes the money; one paid later through
  // "Mark paid" still went through the payable, which that payment cleared.
  const paidLater = entry.type === "EXPENSE" && (await db.journalEntry.count({ where: { sourceType: "bill", sourceId: entry.id, status: "POSTED" } })) > 0;
  const unpaid = entry.type === "EXPENSE" && (paidLater || ["DUE", "PENDING"].includes(String(entry.paymentStatus)));
  const lines =
    entry.type === "INCOME"
      ? [{ account: money, debit: total }, { account: categoryAccountId, credit: total }]
      : [{ account: categoryAccountId, debit: total }, { account: unpaid ? ACCOUNT.payable : money, credit: total }];
  const journal = await postJournal(db, { date: entry.date, memo: `Hisab Kitab: ${entry.description}`, sourceType: "cashbook", sourceId: entry.id, by, lines });
  return db.financialTransaction.update({ where: { id: entry.id }, data: { journalEntryId: journal.id, moneyAccountId: unpaid ? entry.moneyAccountId : (entry.moneyAccountId ?? money) } });
}

// Undoes a Hisab Kitab entry's posting before it changes or is removed.
export async function unpostCashbookEntry(db: Db, entryId: string, by: By, reason: string) {
  const entry = await db.financialTransaction.findUnique({ where: { id: entryId } });
  if (!entry?.journalEntryId || entry.paymentId || entry.refundId) return;
  const journal = await db.journalEntry.findUnique({ where: { id: entry.journalEntryId } });
  if (journal?.status === "POSTED") await reverseJournal(db, journal.id, by, reason);
  await db.financialTransaction.update({ where: { id: entryId }, data: { journalEntryId: null } });
}

// A bill entered as still due, now paid: out of the payable, out of the money account.
export async function payBill(db: Db, entryId: string, moneyAccount: string | null, by: By) {
  const entry = await db.financialTransaction.findUnique({ where: { id: entryId } });
  if (!entry || entry.type !== "EXPENSE" || !["DUE", "PENDING"].includes(String(entry.paymentStatus))) fail(409, "NOT_DUE", "Only an expense still due can be marked paid.");
  const account = await moneyAccountId(db, moneyAccount, "Cash");
  await postJournal(db, { date: new Date(), memo: `Paid: ${entry.description}`, sourceType: "bill", sourceId: entryId, by, lines: [{ account: ACCOUNT.payable, debit: Number(entry.total) }, { account: account.id, credit: Number(entry.total) }] });
  return db.financialTransaction.update({ where: { id: entryId }, data: { paymentStatus: "PAID", moneyAccountId: account.id } });
}
