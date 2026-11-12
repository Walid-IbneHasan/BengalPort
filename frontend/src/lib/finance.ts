// The sums and rules behind the Collections and Finance screens, kept apart
// from the pages so they can be tested: sharing a payment out between
// invoices, checking that a journal entry balances, report periods, budget
// bars and the like. Money is added up in paisa so 0.1 + 0.2 stays 0.3.

// ---- Shapes the server sends -----------------------------------------------

export type MoneyAccount = { id: string; code: string; name: string; subtype: string | null; balance: number | null };

export type OfficePayment = {
  id: string;
  transactionId: string;
  method: string | null;
  provider: string | null;
  status: string;
  amount: number;
  currency: string;
  exchangeRate: number;
  paidAt: string;
  customer: { id: string; code: number; customerCode: string; name: string } | null;
  receiptNumber: string | null;
  allocations: { invoiceId: string; number: string | null; amount: number }[];
  allocated: number;
  refunded: number;
  unallocated: number;
};

export type OpenInvoice = {
  id: string;
  number: string;
  currency: string;
  exchangeRate: number;
  dueAt: string | null;
  total: number;
  paid: number;
  credited: number;
  due: number;
  status: string;
};

export type ExchangeRate = { id: string; currency: string; rate: number; date: string };

export type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE";
export type LedgerAccount = {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  subtype: string | null;
  currency: string;
  description: string | null;
  active: boolean;
  system: boolean;
  balance: number;
};

export type JournalLine = { account: { code: string; name: string }; debit: number; credit: number; currency: string; amount: number; exchangeRate: number; memo: string | null };
export type JournalEntry = {
  id: string;
  reference: string;
  date: string;
  memo: string;
  sourceType: string | null;
  status: "POSTED" | "REVERSED";
  reversalOf: string | null;
  reversedBy: string | null;
  createdByName: string;
  lines: JournalLine[];
};

export type BudgetLine = { accountId: string; name: string; type: string; budget: number; actual: number; variance: number; used: number };
export type Budget = { id: string; name: string; periodStart: string; periodEnd: string; branchId: string | null; lines: BudgetLine[] };

export type Branch = { id: string; code: string; name: string; active: boolean };

// ---- Amounts ---------------------------------------------------------------

const paisa = (value: unknown) => Math.round(amountOf(value) * 100);
export const round2 = (value: number) => Math.round(value * 100) / 100;

// What someone typed in an amount box, as a number: "1,250.50" → 1250.5;
// an empty or unreadable box counts as 0.
export function amountOf(value: unknown): number {
  if (value === null || value === undefined || value === "") return 0;
  const number = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(number) ? number : 0;
}

// The date of a posting as the server wants it: today means now, so the
// day's entries stay in the order they were made; another day means the
// start of that day in Bangladesh.
export function dayToSend(value: string, today: string, now = new Date()): string | null {
  if (!value) return null;
  return value === today ? now.toISOString() : `${value}T00:00:00+06:00`;
}
// The last moment of a day in Bangladesh, for the end of a period.
export const endOfDay = (value: string) => (value ? `${value}T23:59:59.999+06:00` : null);

// An amount in another currency, in taka at the given rate.
export const toTaka = (amount: number, rate: number) => Math.round(amountOf(amount) * amountOf(rate) * 100) / 100;

// ---- Sharing a payment out between invoices --------------------------------

// Puts the money on the invoices in the order given (the server lists them
// oldest first), each up to what it still owes. Every invoice gets an entry;
// 0 where nothing is left for it.
export function fillOldestFirst(available: number, invoices: { id: string; due: number }[]): Record<string, number> {
  let left = Math.max(0, paisa(available));
  const out: Record<string, number> = {};
  for (const invoice of invoices) {
    const take = Math.min(left, Math.max(0, paisa(invoice.due)));
    out[invoice.id] = take / 100;
    left -= take;
  }
  return out;
}

// How much of the money the boxes give to invoices, how much is left over
// (kept as the customer's advance), and whether they ask for more than there is.
export function allocationSummary(available: number, amounts: Record<string, unknown>) {
  const applied = Object.values(amounts).reduce<number>((sum, value) => sum + Math.max(0, paisa(value)), 0);
  const total = Math.max(0, paisa(available));
  return { applied: applied / 100, rest: Math.max(0, total - applied) / 100, over: applied > total };
}

// The boxes as the server wants them: only invoices that get something.
export function allocationList(amounts: Record<string, unknown>) {
  return Object.entries(amounts)
    .map(([invoiceId, value]) => ({ invoiceId, amount: paisa(value) / 100 }))
    .filter((item) => item.amount > 0);
}

// ---- Journal entries -------------------------------------------------------

// Debits and credits of a journal entry being written. It may be saved when
// both sides are equal and more than nothing, and no line has both.
export function journalCheck(lines: { debit: unknown; credit: unknown }[]) {
  const debits = lines.reduce((sum, line) => sum + Math.max(0, paisa(line.debit)), 0);
  const credits = lines.reduce((sum, line) => sum + Math.max(0, paisa(line.credit)), 0);
  const bothSides = lines.some((line) => paisa(line.debit) > 0 && paisa(line.credit) > 0);
  const used = lines.filter((line) => paisa(line.debit) > 0 || paisa(line.credit) > 0).length;
  const balanced = debits === credits;
  return { debits: debits / 100, credits: credits / 100, difference: Math.abs(debits - credits) / 100, balanced, bothSides, ready: balanced && debits > 0 && !bothSides && used >= 2 };
}

// Where an entry came from, in words.
export const SOURCE_LABELS: Record<string, string> = {
  manual: "Entered by hand",
  transfer: "Transfer between accounts",
  invoice: "Invoice",
  "credit-note": "Credit note",
  payment: "Payment received",
  allocation: "Advance applied to invoices",
  refund: "Refund",
  deal: "Revenue earned on a deal",
  cashbook: "Hisab Kitab",
  bill: "Bill paid",
};
export const sourceLabel = (sourceType: string | null | undefined) => (sourceType ? SOURCE_LABELS[sourceType] ?? sourceType : "Entered by hand");

// Only entries made by hand (and transfers) are reversed here; the rest are
// corrected where they came from. A reversal is never reversed itself.
export const madeByHand = (entry: { sourceType: string | null }) => !entry.sourceType || entry.sourceType === "manual" || entry.sourceType === "transfer";
export const reversible = (entry: Pick<JournalEntry, "sourceType" | "status" | "reversalOf" | "reversedBy">) =>
  madeByHand(entry) && entry.status === "POSTED" && !entry.reversalOf && !entry.reversedBy;

// ---- The chart of accounts -------------------------------------------------

export const ACCOUNT_TYPES: { type: AccountType; label: string; one: string }[] = [
  { type: "ASSET", label: "Assets", one: "Asset" },
  { type: "LIABILITY", label: "Liabilities", one: "Liability" },
  { type: "EQUITY", label: "Equity", one: "Equity" },
  { type: "INCOME", label: "Income", one: "Income" },
  { type: "EXPENSE", label: "Expenses", one: "Expense" },
];

export const SUBTYPE_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK: "Bank",
  MOBILE: "Mobile wallet",
  RECEIVABLE: "Receivable",
  PAYABLE: "Payable",
  ADVANCE: "Customer advances",
  DEFERRED: "Deferred revenue",
  REVENUE: "Revenue",
  FX: "Exchange gain or loss",
};
export const MONEY_SUBTYPES = ["CASH", "BANK", "MOBILE"];

// The accounts under their kind, in code order, leaving out empty kinds.
export function groupAccounts<T extends { type: string; code: string }>(accounts: T[], types: AccountType[] = ACCOUNT_TYPES.map((item) => item.type)) {
  return ACCOUNT_TYPES.filter((item) => types.includes(item.type))
    .map((item) => ({ ...item, rows: accounts.filter((account) => account.type === item.type).sort((a, b) => a.code.localeCompare(b.code)) }))
    .filter((group) => group.rows.length);
}

// ---- Payments --------------------------------------------------------------

export const METHODS = ["Cash", "Bank transfer", "bKash", "Nagad", "Card", "Cheque", "Other"];

// The cash, bank or mobile account a payment method puts money into, as the
// server works it out when no account is chosen.
export function moneyCodeFor(method: string | null | undefined): string {
  const text = String(method ?? "").toLowerCase();
  if (text.includes("bkash")) return "1020";
  if (text.includes("nagad")) return "1030";
  if (/bank|transfer|cheque|check|card|deposit/.test(text)) return "1010";
  return "1000";
}

// The pill a payment shows in the list.
export function paymentPill(payment: { status: string; refunded: number }): { status: string; label: string } {
  if (payment.status === "REFUNDED") return { status: "REFUNDED", label: "Refunded" };
  if (payment.refunded > 0) return { status: "PARTIAL", label: "Part refunded" };
  if (payment.status === "PARTIALLY_PAID") return { status: "PARTIAL", label: "Part paid" };
  return { status: "PAID", label: "Received" };
}

// The most recent rate saved for a currency (taka for one unit), if any.
export function latestRate(rates: { currency: string; rate: number; date: string }[], currency: string): number | null {
  if (currency === "BDT") return 1;
  const found = rates.filter((row) => row.currency === currency).sort((a, b) => String(b.date).localeCompare(String(a.date)))[0];
  return found ? Number(found.rate) : null;
}

// ---- Report periods --------------------------------------------------------

export type PeriodKey = "this-month" | "last-month" | "this-year" | "custom";
export const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: "this-month", label: "This month" },
  { key: "last-month", label: "Last month" },
  { key: "this-year", label: "This year" },
  { key: "custom", label: "Custom" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const lastDay = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

// From and to dates (YYYY-MM-DD, both days included) for a period, counted
// from today's date. This month and this year run up to today.
export function periodRange(key: Exclude<PeriodKey, "custom">, today: string): { from: string; to: string } {
  const [year, month] = today.split("-").map(Number);
  if (key === "this-year") return { from: `${year}-01-01`, to: today };
  if (key === "last-month") {
    const y = month === 1 ? year - 1 : year, m = month === 1 ? 12 : month - 1;
    return { from: `${y}-${pad(m)}-01`, to: `${y}-${pad(m)}-${pad(lastDay(y, m))}` };
  }
  return { from: `${year}-${pad(month)}-01`, to: today };
}

// The whole of the month today is in, first day to last.
export function wholeMonth(today: string): { from: string; to: string } {
  const [year, month] = today.split("-").map(Number);
  return { from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${pad(lastDay(year, month))}` };
}

// ---- Reports ---------------------------------------------------------------

export const REPORTS = [
  { key: "profit-and-loss", label: "Profit and loss" },
  { key: "balance-sheet", label: "Balance sheet" },
  { key: "cash-flow", label: "Cash flow" },
  { key: "trial-balance", label: "Trial balance" },
  { key: "receivables", label: "Owed to us" },
  { key: "payables", label: "Unpaid bills" },
] as const;

// ---- Receivables -----------------------------------------------------------

export const AGING: { key: "current" | "days1to30" | "days31to60" | "days61to90" | "over90"; label: string; hint: string }[] = [
  { key: "current", label: "Not yet due", hint: "Due date still to come" },
  { key: "days1to30", label: "1–30 days late", hint: "Past the due date" },
  { key: "days31to60", label: "31–60 days late", hint: "Worth a reminder" },
  { key: "days61to90", label: "61–90 days late", hint: "Call the customer" },
  { key: "over90", label: "Over 90 days late", hint: "May not be paid" },
];

// ---- Budgets ---------------------------------------------------------------

// How a budget line is doing. For an expense, amber from 90 % used and red
// once over; for income, the target is good news once reached.
export function budgetLineState(type: string, budget: number, actual: number) {
  const used = budget > 0 ? Math.round((actual / budget) * 100) : actual > 0 ? 100 : 0;
  const width = Math.max(0, Math.min(100, used));
  const gap = round2(Math.abs(actual - budget));
  if (type === "INCOME") {
    const tone = used >= 100 ? "good" : "quiet";
    return { used, width, tone, over: false, text: actual >= budget ? { lead: "Above target by", amount: gap } : { lead: "Short of target by", amount: gap } } as const;
  }
  const tone = budget <= 0 ? (actual > 0 ? "bad" : "quiet") : used > 100 ? "bad" : used >= 90 ? "warn" : "good";
  return { used, width, tone, over: actual > budget, text: actual > budget ? { lead: "Over budget by", amount: gap } : { lead: "Left to spend", amount: gap } } as const;
}
