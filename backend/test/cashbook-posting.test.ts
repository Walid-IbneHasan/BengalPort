// Integration tests: every Hisab Kitab entry is posted to the double-entry
// accounts, corrected by reversal and never edited in place.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

const tag = stamp();
let app: Awaited<ReturnType<typeof buildApp>>;
let admin: any;
let income: { id: string }, rent: { id: string };
const entries: string[] = [];

const call = (method: string, url: string, payload?: unknown) => app.inject({ method: method as any, url, payload: payload as any, headers: bearer(app, admin) });
const linesOf = (entryId: string) => prisma.journalLine.findMany({ where: { entryId }, include: { account: true } });

before(async () => {
  app = await buildApp();
  admin = await createUser("ADMIN");
  income = await prisma.financialCategory.create({ data: { name: `${tag} Consultations`, type: "INCOME" } });
  rent = await prisma.financialCategory.create({ data: { name: `${tag} Rent`, type: "EXPENSE" } });
});

after(async () => {
  const rows = await prisma.financialTransaction.findMany({ where: { id: { in: entries } }, select: { id: true } });
  await prisma.journalEntry.deleteMany({ where: { sourceId: { in: entries } } });
  await prisma.financialTransaction.deleteMany({ where: { id: { in: rows.map((r) => r.id) } } });
  const cats = await prisma.financialCategory.findMany({ where: { id: { in: [income.id, rent.id] } }, select: { accountId: true } });
  await prisma.financialCategory.deleteMany({ where: { id: { in: [income.id, rent.id] } } });
  await prisma.ledgerAccount.deleteMany({ where: { id: { in: cats.map((c) => c.accountId!).filter(Boolean) }, lines: { none: {} } } });
  await deleteUsers(admin.id);
  await app.close();
  await prisma.$disconnect();
});

async function record(body: Record<string, unknown>) {
  const res = await call("POST", "/api/admin/accounts", { date: "2026-11-12", ...body });
  assert.equal(res.statusCode, 201, res.body);
  entries.push(res.json().data.id);
  return res.json().data;
}

describe("Hisab Kitab in the accounts", () => {
  test("income goes into cash and its category's income account", async () => {
    const row = await record({ type: "INCOME", description: `${tag} consultation`, total: 1500, categoryId: income.id });
    assert.ok(row.journalEntryId);
    const lines = await linesOf(row.journalEntryId);
    assert.equal(Number(lines.find((l) => l.account.code === "1000")?.debit), 1500);
    const credit = lines.find((l) => Number(l.credit) > 0);
    assert.equal(credit?.account.type, "INCOME");
    assert.equal(credit?.account.name, `${tag} Consultations`);
  });

  test("a corrected entry is posted again; the old posting is reversed, not changed", async () => {
    const row = await record({ type: "INCOME", description: `${tag} fee`, total: 1000, categoryId: income.id });
    const res = await call("PUT", `/api/admin/accounts/${row.id}`, { type: "INCOME", date: "2026-11-12", description: `${tag} fee`, total: 1200, categoryId: income.id });
    assert.equal(res.statusCode, 200, res.body);
    assert.notEqual(res.json().data.journalEntryId, row.journalEntryId);
    assert.equal((await prisma.journalEntry.findUnique({ where: { id: row.journalEntryId } }))?.status, "REVERSED");
    const lines = await linesOf(res.json().data.journalEntryId);
    assert.equal(Number(lines.find((l) => l.account.code === "1000")?.debit), 1200);
  });

  test("a deleted entry's posting is reversed and kept", async () => {
    const row = await record({ type: "EXPENSE", description: `${tag} stationery`, total: 300, categoryId: rent.id });
    assert.equal((await call("DELETE", `/api/admin/accounts/${row.id}`)).statusCode, 204);
    entries.splice(entries.indexOf(row.id), 1);
    assert.equal((await prisma.journalEntry.findUnique({ where: { id: row.journalEntryId } }))?.status, "REVERSED");
  });

  test("a bill still due is owed; paying it later takes the money out", async () => {
    const row = await record({ type: "EXPENSE", description: `${tag} November rent`, total: 20000, categoryId: rent.id, paymentStatus: "DUE" });
    const owed = await linesOf(row.journalEntryId);
    assert.equal(Number(owed.find((l) => l.account.code === "2000")?.credit), 20000);
    const payables = (await call("GET", "/api/office/reports/payables")).json().data;
    assert.ok(payables.rows.some((r: any) => r.id === row.id));
    const paid = await call("POST", `/api/admin/accounts/${row.id}/pay`, {});
    assert.equal(paid.statusCode, 200, paid.body);
    assert.equal(paid.json().data.paymentStatus, "PAID");
    const settled = await prisma.journalEntry.findFirst({ where: { sourceType: "bill", sourceId: row.id }, include: { lines: { include: { account: true } } } });
    assert.equal(Number(settled?.lines.find((l) => l.account.code === "2000")?.debit), 20000);
    entries.push(row.id);
  });

  test("money paid from the bank or received by bKash goes through that account, not cash", async () => {
    const out = await record({ type: "EXPENSE", description: `${tag} rent by transfer`, total: 15000, categoryId: rent.id, moneyAccount: "1010" });
    assert.equal(Number((await linesOf(out.journalEntryId)).find((l) => l.account.code === "1010")?.credit), 15000);
    const into = await record({ type: "INCOME", description: `${tag} fee by bKash`, total: 800, categoryId: income.id, moneyAccount: "1020" });
    assert.equal(Number((await linesOf(into.journalEntryId)).find((l) => l.account.code === "1020")?.debit), 800);
    const refused = await call("POST", "/api/admin/accounts", { date: "2026-11-12", type: "EXPENSE", description: `${tag} wrong account`, total: 10, categoryId: rent.id, moneyAccount: "5000" });
    assert.equal(refused.statusCode, 400, refused.body);
  });

  test("a bill paid later stays paid, and counted once, when the entry is corrected or deleted", async () => {
    const row = await record({ type: "EXPENSE", description: `${tag} electricity`, total: 4000, categoryId: rent.id, paymentStatus: "DUE" });
    assert.equal(row.moneyAccountId, null);
    assert.equal((await call("POST", `/api/admin/accounts/${row.id}/pay`, { moneyAccount: "1020" })).statusCode, 200);
    // Corrected afterwards, even with "not paid yet" sent again by mistake.
    const fixed = await call("PUT", `/api/admin/accounts/${row.id}`, { type: "EXPENSE", date: "2026-11-12", description: `${tag} electricity (October)`, total: 4000, categoryId: rent.id, paymentStatus: "DUE" });
    assert.equal(fixed.statusCode, 200, fixed.body);
    assert.equal(fixed.json().data.paymentStatus, "PAID");
    // Balances count every entry: a reversed one and its reversal cancel out.
    const posted = await prisma.journalLine.findMany({ where: { entry: { sourceId: row.id } }, include: { account: true } });
    const net = (code: string) => posted.filter((l) => l.account.code === code).reduce((s, l) => s + Number(l.debit) - Number(l.credit), 0);
    assert.equal(net("2000"), 0, "the payable is cleared");
    assert.equal(net("1020"), -4000, "bKash paid once");
    // Deleted: both postings are undone.
    assert.equal((await call("DELETE", `/api/admin/accounts/${row.id}`)).statusCode, 204);
    const left = await prisma.journalEntry.count({ where: { sourceId: row.id, status: "POSTED", reversalOfId: null } });
    assert.equal(left, 0);
  });
});
