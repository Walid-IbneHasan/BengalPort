// Double-entry accounting. Every posting has at least two lines whose debits
// and credits are equal, in taka; a line in another currency also keeps its
// own amount and rate. Posted entries are never changed or deleted: a
// reversal is a new entry that undoes one. Reports are made from the lines.
import { prisma } from "./prisma.js";

type Db = any;

// ---- Rules -----------------------------------------------------------------

const paisa = (value: unknown) => Math.round(Number(value ?? 0) * 100);
export const round2 = (value: number) => Math.round(value * 100) / 100;
// An amount in another currency, in taka at the given rate.
export const toBase = (amount: number, rate: number) => Math.round(amount * rate * 100) / 100;

type LineAmounts = { debit?: number; credit?: number };

// Why these lines cannot be posted, or "" when they can.
export function checkLines(lines: LineAmounts[]): string {
  if (lines.length < 2) return "A posting needs at least two lines.";
  for (const line of lines) {
    const debit = paisa(line.debit), credit = paisa(line.credit);
    if (debit < 0 || credit < 0 || (debit > 0) === (credit > 0)) return "Each line is either a debit or a credit of more than ৳0.";
  }
  const debits = lines.reduce((sum, line) => sum + paisa(line.debit), 0);
  const credits = lines.reduce((sum, line) => sum + paisa(line.credit), 0);
  if (debits !== credits) return `The debits (৳${(debits / 100).toFixed(2)}) and credits (৳${(credits / 100).toFixed(2)}) must be equal.`;
  return "";
}

export const reversedLines = <T extends { debit: number; credit: number }>(lines: T[]): T[] =>
  lines.map((line) => ({ ...line, debit: line.credit, credit: line.debit }));

// ---- Reports ---------------------------------------------------------------

export type Balance = { code: string; name: string; type: string; subtype: string | null; debit: number; credit: number; id?: string };
type Row = { code: string; name: string; amount: number; id?: string };

const natural = (row: Balance) =>
  row.type === "ASSET" || row.type === "EXPENSE" ? round2(row.debit - row.credit) : round2(row.credit - row.debit);
const rowsOf = (balances: Balance[], type: string): Row[] =>
  balances
    .filter((row) => row.type === type)
    .map((row) => ({ id: row.id, code: row.code, name: row.name, amount: natural(row) }))
    .filter((row) => row.amount !== 0)
    .sort((a, b) => a.code.localeCompare(b.code));
const total = (rows: Row[]) => round2(rows.reduce((sum, row) => sum + row.amount, 0));

export function profitAndLoss(balances: Balance[]) {
  const income = rowsOf(balances, "INCOME");
  const expense = rowsOf(balances, "EXPENSE");
  const totalIncome = total(income), totalExpense = total(expense);
  return { income, expense, totalIncome, totalExpense, net: round2(totalIncome - totalExpense) };
}

// `balances` run from the beginning up to the date of the sheet.
export function balanceSheet(balances: Balance[]) {
  const assets = rowsOf(balances, "ASSET");
  const liabilities = rowsOf(balances, "LIABILITY");
  const earnings = profitAndLoss(balances).net;
  const equity = [...rowsOf(balances, "EQUITY"), ...(earnings ? [{ code: "9999", name: "Current earnings", amount: earnings }] : [])];
  const totalAssets = total(assets), totalLiabilities = total(liabilities), totalEquity = total(equity);
  return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity, balanced: paisa(totalAssets) === paisa(totalLiabilities + totalEquity) };
}

export function trialBalance(balances: Balance[]) {
  const rows = balances
    .map((row) => {
      const net = round2(row.debit - row.credit);
      return { id: row.id, code: row.code, name: row.name, type: row.type, debit: net > 0 ? net : 0, credit: net < 0 ? -net : 0 };
    })
    .filter((row) => row.debit || row.credit)
    .sort((a, b) => a.code.localeCompare(b.code));
  return { rows, totalDebit: round2(rows.reduce((s, r) => s + r.debit, 0)), totalCredit: round2(rows.reduce((s, r) => s + r.credit, 0)) };
}

// Money in and out of the cash, bank and mobile accounts, grouped by the
// account on the other side of each posting. Transfers between money
// accounts are left out.
export function cashFlow(
  entries: { lines: { accountId: string; debit: number; credit: number }[] }[],
  accounts: Map<string, { name: string; money: boolean }>,
  opening: number,
) {
  const inflows = new Map<string, number>(), outflows = new Map<string, number>();
  for (const entry of entries) {
    const money = entry.lines.filter((line) => accounts.get(line.accountId)?.money);
    const others = entry.lines.filter((line) => !accounts.get(line.accountId)?.money);
    const net = money.reduce((sum, line) => sum + Number(line.debit) - Number(line.credit), 0);
    if (!others.length || Math.abs(net) < 0.005) continue;
    // Split the money movement over the other lines in proportion.
    const weight = others.reduce((sum, line) => sum + Number(line.debit) + Number(line.credit), 0) || 1;
    for (const line of others) {
      const name = accounts.get(line.accountId)?.name ?? "Other";
      const share = (Math.abs(net) * (Number(line.debit) + Number(line.credit))) / weight;
      const into = net > 0 ? inflows : outflows;
      into.set(name, round2((into.get(name) ?? 0) + share));
    }
  }
  const list = (map: Map<string, number>) => [...map].map(([name, amount]) => ({ name, amount })).sort((a, b) => b.amount - a.amount);
  const totalIn = round2([...inflows.values()].reduce((s, v) => s + v, 0));
  const totalOut = round2([...outflows.values()].reduce((s, v) => s + v, 0));
  return { opening: round2(opening), inflows: list(inflows), outflows: list(outflows), totalIn, totalOut, net: round2(totalIn - totalOut), closing: round2(opening + totalIn - totalOut) };
}

// What customers owe, by how many days past its due date. Without a due
// date it counts as current.
export function agingBuckets(invoices: { due: number; dueAt: Date | null }[], today: Date) {
  const out = { current: 0, days1to30: 0, days31to60: 0, days61to90: 0, over90: 0, total: 0 };
  for (const invoice of invoices) {
    if (invoice.due <= 0) continue;
    const late = invoice.dueAt ? Math.floor((today.getTime() - invoice.dueAt.getTime()) / 86_400_000) : 0;
    const bucket = late <= 0 ? "current" : late <= 30 ? "days1to30" : late <= 60 ? "days31to60" : late <= 90 ? "days61to90" : "over90";
    out[bucket] = round2(out[bucket] + invoice.due);
    out.total = round2(out.total + invoice.due);
  }
  return out;
}

export function budgetVsActual(lines: { accountId: string; name: string; type: string; amount: number }[], actuals: Map<string, { debit: number; credit: number }>) {
  return lines.map((line) => {
    const sums = actuals.get(line.accountId) ?? { debit: 0, credit: 0 };
    const actual = line.type === "INCOME" ? round2(sums.credit - sums.debit) : round2(sums.debit - sums.credit);
    return { accountId: line.accountId, name: line.name, type: line.type, budget: round2(line.amount), actual, variance: round2(actual - line.amount), used: line.amount ? Math.round((actual / line.amount) * 100) : 0 };
  });
}

// ---- The chart of accounts -------------------------------------------------

export const SYSTEM_ACCOUNTS = [
  { code: "1000", name: "Cash in hand", type: "ASSET", subtype: "CASH" },
  { code: "1010", name: "Bank account", type: "ASSET", subtype: "BANK" },
  { code: "1020", name: "bKash", type: "ASSET", subtype: "MOBILE" },
  { code: "1030", name: "Nagad", type: "ASSET", subtype: "MOBILE" },
  { code: "1100", name: "Accounts receivable", type: "ASSET", subtype: "RECEIVABLE" },
  { code: "2000", name: "Accounts payable", type: "LIABILITY", subtype: "PAYABLE" },
  { code: "2100", name: "Customer advances", type: "LIABILITY", subtype: "ADVANCE" },
  { code: "2200", name: "Deferred revenue", type: "LIABILITY", subtype: "DEFERRED" },
  { code: "3000", name: "Owner's equity", type: "EQUITY", subtype: null },
  { code: "3100", name: "Retained earnings", type: "EQUITY", subtype: null },
  { code: "4000", name: "Service revenue", type: "INCOME", subtype: "REVENUE" },
  { code: "4100", name: "Other income", type: "INCOME", subtype: null },
  { code: "4900", name: "Exchange gain or loss", type: "INCOME", subtype: "FX" },
  { code: "5000", name: "General expenses", type: "EXPENSE", subtype: null },
  { code: "5100", name: "Refunds to customers", type: "EXPENSE", subtype: null },
] as const;
export const ACCOUNT = {
  cash: "1000", bank: "1010", bkash: "1020", nagad: "1030", receivable: "1100", payable: "2000",
  advances: "2100", deferred: "2200", revenue: "4000", otherIncome: "4100", fx: "4900", expenses: "5000", refunds: "5100",
} as const;
export const MONEY_SUBTYPES = ["CASH", "BANK", "MOBILE"];

let chartReady: Promise<void> | null = null;
// The built-in accounts, the company and its first branch. Safe to call often.
export function ensureChart(db: Db = prisma) {
  chartReady ??= (async () => {
    for (const account of SYSTEM_ACCOUNTS)
      await db.ledgerAccount.upsert({ where: { code: account.code }, update: { system: true }, create: { ...account, system: true } });
    if (!(await db.company.count()))
      await db.company.create({ data: { name: "Bengal Port", branches: { create: { code: "HQ", name: "Head office" } } } });
  })().catch((error) => {
    chartReady = null;
    throw error;
  });
  return chartReady;
}

// Looked up each time (it is one indexed read), so a database restored from
// a backup never leaves the server holding ids that no longer exist. A
// missing built-in account, as after restoring an older backup, is made again.
export async function accountId(db: Db, code: string): Promise<string> {
  let account = await db.ledgerAccount.findUnique({ where: { code }, select: { id: true } });
  if (!account) {
    chartReady = null;
    await ensureChart();
    account = await db.ledgerAccount.findUnique({ where: { code }, select: { id: true } });
  }
  if (!account) throw new Error(`No account ${code}`);
  return account.id;
}

// The cash, bank or mobile account a payment method puts money into.
export function moneyCodeFor(method: string | null | undefined): string {
  const text = String(method ?? "").toLowerCase();
  if (text.includes("bkash")) return ACCOUNT.bkash;
  if (text.includes("nagad")) return ACCOUNT.nagad;
  if (/bank|transfer|cheque|check|card|deposit/.test(text)) return ACCOUNT.bank;
  return ACCOUNT.cash;
}

// The income or expense account for a Hisab Kitab category, made the first
// time it is needed.
export async function categoryAccount(db: Db, category: { id: string; name: string; type: string; accountId?: string | null }) {
  if (category.accountId) return category.accountId;
  await ensureChart();
  const type = category.type === "INCOME" ? "INCOME" : "EXPENSE";
  const same = await db.ledgerAccount.findFirst({ where: { type, name: { equals: category.name, mode: "insensitive" } }, select: { id: true } });
  let id = same?.id;
  if (!id) {
    const prefix = type === "INCOME" ? "41" : "51";
    const taken = await db.ledgerAccount.findMany({ where: { code: { startsWith: prefix } }, select: { code: true } });
    let next = 10;
    while (taken.some((row: { code: string }) => row.code === `${prefix}${next}`)) next++;
    id = (await db.ledgerAccount.create({ data: { code: `${prefix}${next}`, name: category.name, type } })).id;
  }
  await db.financialCategory.update({ where: { id: category.id }, data: { accountId: id } });
  return id;
}

// ---- Posting ---------------------------------------------------------------

export type PostingLine = { account: string; debit?: number; credit?: number; currency?: string; amount?: number; exchangeRate?: number; customerId?: string | null; memo?: string | null };
export type Posting = {
  date: Date;
  memo: string;
  sourceType?: string;
  sourceId?: string;
  branchId?: string | null;
  by: { id?: string | null; name: string };
  lines: PostingLine[];
};

export class PostingError extends Error {
  statusCode = 400;
  code = "UNBALANCED";
}

// `account` is a code ("1000") or an account id.
export async function postJournal(db: Db, posting: Posting) {
  const lines = posting.lines.filter((line) => paisa(line.debit) || paisa(line.credit));
  const problem = checkLines(lines);
  if (problem) throw new PostingError(problem);
  const resolved = [];
  for (const line of lines) {
    const id = /^\d{4}$/.test(line.account) ? await accountId(db, line.account) : line.account;
    const debit = round2(Number(line.debit ?? 0)), credit = round2(Number(line.credit ?? 0));
    resolved.push({
      accountId: id,
      debit,
      credit,
      currency: line.currency ?? "BDT",
      amount: line.amount ?? debit + credit,
      exchangeRate: line.exchangeRate ?? 1,
      customerId: line.customerId ?? null,
      memo: line.memo ?? null,
    });
  }
  return db.journalEntry.create({
    data: {
      date: posting.date,
      memo: posting.memo.slice(0, 300),
      sourceType: posting.sourceType ?? null,
      sourceId: posting.sourceId ?? null,
      branchId: posting.branchId ?? null,
      createdById: posting.by.id ?? null,
      createdByName: posting.by.name,
      lines: { create: resolved },
    },
    include: { lines: true },
  });
}

export async function reverseJournal(db: Db, entryId: string, by: { id?: string | null; name: string }, reason: string, date = new Date()) {
  const entry = await db.journalEntry.findUnique({ where: { id: entryId }, include: { lines: true, reversedBy: { select: { id: true } } } });
  if (!entry) throw Object.assign(new Error("Journal entry not found"), { statusCode: 404 });
  if (entry.status === "REVERSED" || entry.reversedBy) throw Object.assign(new Error("This entry has already been reversed."), { statusCode: 409 });
  if (entry.reversalOfId) throw Object.assign(new Error("A reversal cannot itself be reversed; post a new entry instead."), { statusCode: 409 });
  const reversal = await db.journalEntry.create({
    data: {
      date,
      memo: `Reversal of JE-${String(entry.number).padStart(6, "0")}: ${reason}`.slice(0, 300),
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      branchId: entry.branchId,
      reversalOfId: entry.id,
      createdById: by.id ?? null,
      createdByName: by.name,
      lines: {
        create: entry.lines.map((line: any) => ({
          accountId: line.accountId,
          debit: line.credit,
          credit: line.debit,
          currency: line.currency,
          amount: line.amount,
          exchangeRate: line.exchangeRate,
          customerId: line.customerId,
          memo: line.memo,
        })),
      },
    },
    include: { lines: true },
  });
  await db.journalEntry.update({ where: { id: entry.id }, data: { status: "REVERSED" } });
  return reversal;
}

// Sums of debits and credits per account over a period (both ends
// included), optionally for one branch. Reversed entries and their
// reversals both count, so they cancel out.
export async function accountBalances(db: Db, range: { from?: Date | null; to?: Date | null; branchId?: string | null } = {}): Promise<Balance[]> {
  await ensureChart();
  const date = { ...(range.from ? { gte: range.from } : {}), ...(range.to ? { lte: range.to } : {}) };
  const grouped = await db.journalLine.groupBy({
    by: ["accountId"],
    where: { entry: { ...(Object.keys(date).length ? { date } : {}), ...(range.branchId ? { branchId: range.branchId } : {}) } },
    _sum: { debit: true, credit: true },
  });
  const accounts = await db.ledgerAccount.findMany({ orderBy: { code: "asc" } });
  const sums = new Map(grouped.map((row: any) => [row.accountId, row._sum]));
  return accounts.map((account: any) => {
    const sum: any = sums.get(account.id) ?? {};
    return { id: account.id, code: account.code, name: account.name, type: account.type, subtype: account.subtype, debit: Number(sum.debit ?? 0), credit: Number(sum.credit ?? 0) };
  });
}

export const journalNumber = (n: number) => `JE-${String(n).padStart(6, "0")}`;
