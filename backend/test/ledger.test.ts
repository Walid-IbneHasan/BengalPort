// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

const tag = stamp();
let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let expenseCategory = "";
let incomeCategory = "";
const call = (method: "POST" | "PUT" | "DELETE", url: string, payload?: Record<string, unknown>) =>
  app.inject({ method, url, payload, headers: bearer(app, admin) });
const entry = (overrides: Record<string, unknown> = {}) => ({
  type: "EXPENSE",
  date: "2026-10-01T10:00:00.000Z",
  description: `${tag} printer toner`,
  categoryId: expenseCategory,
  total: 7400,
  ...overrides,
});
const record = async (overrides: Record<string, unknown> = {}) =>
  (await call("POST", "/api/admin/accounts", entry(overrides))).json().data.id as string;

before(async () => {
  app = await buildApp();
  admin = await createUser("ADMIN");
  expenseCategory = (await prisma.financialCategory.create({ data: { name: `${tag} expense`, type: "EXPENSE" } })).id;
  incomeCategory = (await prisma.financialCategory.create({ data: { name: `${tag} income`, type: "INCOME" } })).id;
});
after(async () => {
  await prisma.financialTransaction.deleteMany({ where: { categoryId: { in: [expenseCategory, incomeCategory] } } });
  await prisma.financialCategory.deleteMany({ where: { id: { in: [expenseCategory, incomeCategory] } } });
  await deleteUsers(admin.id);
  await app.close();
  await prisma.$disconnect();
});

describe("correcting the ledger", () => {
  test("an admin can correct the amount and note of an entry", async () => {
    const id = await record();
    const res = await call("PUT", `/api/admin/accounts/${id}`, entry({ total: 7900, notes: "Five cartridges, not four." }));
    assert.equal(res.statusCode, 200);
    assert.equal(Number(res.json().data.total), 7900);
    assert.equal(res.json().data.notes, "Five cartridges, not four.");
  });

  test("an entry can be changed to quantity and unit price", async () => {
    const id = await record();
    const res = await call("PUT", `/api/admin/accounts/${id}`, entry({ total: undefined, quantity: 4, unitPrice: 1850 }));
    assert.equal(Number(res.json().data.total), 7400);
    assert.equal(Number(res.json().data.quantity), 4);
  });

  test("a correction that drops quantity and price clears them", async () => {
    const id = await record({ total: undefined, quantity: 4, unitPrice: 1850 });
    const res = await call("PUT", `/api/admin/accounts/${id}`, entry({ total: 8000 }));
    assert.equal(res.json().data.quantity, null);
    assert.equal(res.json().data.unitPrice, null);
  });

  test("an expense cannot be moved into an income category", async () => {
    const id = await record();
    const res = await call("PUT", `/api/admin/accounts/${id}`, entry({ categoryId: incomeCategory }));
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, "CATEGORY_TYPE_MISMATCH");
  });

  test("correcting an entry that does not exist is reported as not found", async () => {
    assert.equal((await call("PUT", "/api/admin/accounts/no-such-entry", entry())).statusCode, 404);
  });
});

describe("removing a ledger entry", () => {
  test("an admin can delete an entry made by mistake", async () => {
    const id = await record();
    assert.equal((await call("DELETE", `/api/admin/accounts/${id}`)).statusCode, 204);
    assert.equal(await prisma.financialTransaction.count({ where: { id } }), 0);
  });

  test("deleting an entry twice is reported as not found", async () => {
    const id = await record();
    await call("DELETE", `/api/admin/accounts/${id}`);
    assert.equal((await call("DELETE", `/api/admin/accounts/${id}`)).statusCode, 404);
  });
});
