// An invoice's life (draft, issued, cancelled, refunded) and what each step
// posts to the accounts. Issuing an invoice is not income: it is money owed
// and revenue not yet earned. Revenue is recognised when the work is done.
import { ACCOUNT, round2, toBase, type PostingLine } from "./accounting.js";

export type InvoiceStatus = "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED" | "REFUNDED";

const paisa = (value: number) => Math.round(value * 100);

export const invoiceDue = (total: number, paid: number, credited: number) => Math.max(0, paisa(total) - paisa(paid) - paisa(credited)) / 100;

export function invoiceStatus(invoice: { state: string; total: number; paid: number; credited: number; dueAt: Date | null }, now = new Date()): InvoiceStatus {
  if (invoice.state === "DRAFT") return "DRAFT";
  if (invoice.state === "CANCELLED") return "CANCELLED";
  if (invoice.state === "REFUNDED") return "REFUNDED";
  const due = invoiceDue(invoice.total, invoice.paid, invoice.credited);
  if (due <= 0) return "PAID";
  if (invoice.dueAt && invoice.dueAt.getTime() < now.getTime()) return "OVERDUE";
  return invoice.paid > 0 ? "PARTIAL" : "SENT";
}

export const STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Draft", SENT: "Sent", PARTIAL: "Partial", PAID: "Paid", OVERDUE: "Overdue", CANCELLED: "Cancelled", REFUNDED: "Refunded",
};

type Money = { currency: string; exchangeRate: number; customerId?: string | null };
const line = (account: string, side: "debit" | "credit", base: number, money: Money, amount: number): PostingLine => ({
  account,
  [side]: base,
  currency: money.currency,
  amount: round2(amount),
  exchangeRate: money.exchangeRate,
  customerId: money.customerId ?? null,
});

// Issued: the customer owes the total; it is revenue not yet earned.
export function issuePosting(invoice: Money & { total: number }): PostingLine[] {
  const base = toBase(invoice.total, invoice.exchangeRate);
  return [line(ACCOUNT.receivable, "debit", base, invoice, invoice.total), line(ACCOUNT.deferred, "credit", base, invoice, invoice.total)];
}

// Money received into a cash, bank or mobile account. The parts given to
// invoices pay what is owed on them (at each invoice's own rate, any
// difference being an exchange gain or loss); the rest is an advance.
export function paymentPosting(payment: Money & { amount: number; moneyCode: string }, allocations: { amount: number; invoiceRate: number }[]): PostingLine[] {
  const received = toBase(payment.amount, payment.exchangeRate);
  const lines: PostingLine[] = [line(payment.moneyCode, "debit", received, payment, payment.amount)];
  let allocated = 0, allocatedBase = 0;
  for (const allocation of allocations) {
    const owed = toBase(allocation.amount, allocation.invoiceRate);
    lines.push(line(ACCOUNT.receivable, "credit", owed, { ...payment, exchangeRate: allocation.invoiceRate }, allocation.amount));
    allocated += allocation.amount;
    allocatedBase += owed;
  }
  const advance = round2(payment.amount - allocated);
  const advanceBase = toBase(advance, payment.exchangeRate);
  if (advance > 0) lines.push(line(ACCOUNT.advances, "credit", advanceBase, payment, advance));
  const difference = round2(received - allocatedBase - (advance > 0 ? advanceBase : 0));
  if (difference > 0) lines.push(line(ACCOUNT.fx, "credit", difference, { ...payment, currency: "BDT", exchangeRate: 1 }, difference));
  if (difference < 0) lines.push(line(ACCOUNT.fx, "debit", -difference, { ...payment, currency: "BDT", exchangeRate: 1 }, -difference));
  return lines;
}

// Part of an earlier payment, kept as an advance, given to an invoice.
export function allocationPosting(allocation: { amount: number; paymentRate: number; invoiceRate: number; currency: string; customerId?: string | null }): PostingLine[] {
  const fromAdvance = toBase(allocation.amount, allocation.paymentRate);
  const owed = toBase(allocation.amount, allocation.invoiceRate);
  const money = { currency: allocation.currency, exchangeRate: allocation.paymentRate, customerId: allocation.customerId };
  const lines = [line(ACCOUNT.advances, "debit", fromAdvance, money, allocation.amount), line(ACCOUNT.receivable, "credit", owed, { ...money, exchangeRate: allocation.invoiceRate }, allocation.amount)];
  const difference = round2(fromAdvance - owed);
  if (difference > 0) lines.push(line(ACCOUNT.fx, "credit", difference, { ...money, currency: "BDT", exchangeRate: 1 }, difference));
  if (difference < 0) lines.push(line(ACCOUNT.fx, "debit", -difference, { ...money, currency: "BDT", exchangeRate: 1 }, -difference));
  return lines;
}

// A credit note lowers what is owed and the revenue not yet earned.
export function creditNotePosting(credit: Money & { amount: number }): PostingLine[] {
  const base = toBase(credit.amount, credit.exchangeRate);
  return [line(ACCOUNT.deferred, "debit", base, credit, credit.amount), line(ACCOUNT.receivable, "credit", base, credit, credit.amount)];
}

// The work is done (or part of it): revenue not yet earned becomes revenue.
export function recognitionPosting(amountBase: number, customerId?: string | null): PostingLine[] {
  const money = { currency: "BDT", exchangeRate: 1, customerId };
  return [line(ACCOUNT.deferred, "debit", round2(amountBase), money, amountBase), line(ACCOUNT.revenue, "credit", round2(amountBase), money, amountBase)];
}

export const invoiceNumberText = (serial: number) => `INV-${String(serial).padStart(6, "0")}`;
export const creditNoteNumber = (n: number) => `CN-${String(n).padStart(6, "0")}`;
export const customerCode = (n: number) => `C-${String(n).padStart(6, "0")}`;
export const dealNumber = (n: number) => `D-${String(n).padStart(6, "0")}`;
