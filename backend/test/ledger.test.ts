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

describe("the ledger's categories", () => {
  const created: string[] = [];
  const add = async (payload: Record<string, unknown>) => {
    const res = await call("POST", "/api/admin/accounts/categories", payload);
    if (res.statusCode === 201) created.push(res.json().data.id);
    return res;
  };
  after(async () => {
    await prisma.financialCategory.deleteMany({ where: { id: { in: created } } });
  });

  test("an admin can add a category for income or for expenses", async () => {
    const res = await add({ name: `${tag} visa fees`, type: "INCOME" });
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.type, "INCOME");
    assert.equal(await prisma.financialCategory.count({ where: { name: `${tag} visa fees` } }), 1);
  });

  test("a second category with the same name is refused", async () => {
    await add({ name: `${tag} courier`, type: "EXPENSE" });
    const res = await add({ name: `${tag} courier`, type: "EXPENSE" });
    assert.equal(res.statusCode, 409);
    assert.equal(await prisma.financialCategory.count({ where: { name: `${tag} courier` } }), 1);
  });

  test("a category needs a name and a kind", async () => {
    assert.equal((await add({ name: " ", type: "EXPENSE" })).statusCode, 400);
    assert.equal((await add({ name: `${tag} unknown kind`, type: "OTHER" })).statusCode, 400);
  });

  test("a category can be renamed", async () => {
    const id = (await add({ name: `${tag} ofice rent`, type: "EXPENSE" })).json().data.id;
    const res = await call("PUT", `/api/admin/accounts/categories/${id}`, { name: `${tag} office rent` });
    assert.equal(res.statusCode, 200);
    assert.equal((await prisma.financialCategory.findUniqueOrThrow({ where: { id } })).name, `${tag} office rent`);
  });

  test("renaming a category that does not exist is reported as not found", async () => {
    assert.equal((await call("PUT", "/api/admin/accounts/categories/no-such-category", { name: `${tag} anything` })).statusCode, 404);
  });

  test("a category nothing is recorded under can be deleted", async () => {
    const id = (await add({ name: `${tag} unused`, type: "EXPENSE" })).json().data.id;
    assert.equal((await call("DELETE", `/api/admin/accounts/categories/${id}`)).statusCode, 204);
    assert.equal(await prisma.financialCategory.count({ where: { id } }), 0);
  });

  test("a category with ledger entries is kept", async () => {
    await record();
    const res = await call("DELETE", `/api/admin/accounts/categories/${expenseCategory}`);
    assert.equal(res.statusCode, 409);
    assert.equal(await prisma.financialCategory.count({ where: { id: expenseCategory } }), 1);
  });

  test("the list tells how many entries each category holds", async () => {
    await record();
    const list = (await app.inject({ method: "GET", url: "/api/admin/accounts/categories", headers: bearer(app, admin) })).json().data as any[];
    assert.ok(list.find((item) => item.id === expenseCategory).entries >= 1);
    assert.equal(list.find((item) => item.id === incomeCategory).entries, 0);
  });
});
