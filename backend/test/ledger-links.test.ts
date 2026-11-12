// Integration tests: payments and refunds enter Hisab Kitab by themselves,
// staff record a customer's cash in Hisab Kitab, and any day's records can
// be looked up later. bKash is replaced by a stand-in; every row created here
// is removed afterwards.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Gateway, GatewayStatus } from "../src/lib/bkash.js";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { GatewayError } = await import("../src/lib/bkash.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

const tag = stamp();
let approve = true;
const amounts = new Map<string, number>();
const done = (paymentId: string): GatewayStatus => ({
  paymentId,
  status: "Completed",
  trxId: `TRX${paymentId.slice(-6)}`,
  amount: amounts.get(paymentId) ?? null,
  payerAccount: "01770618575",
});
const gateway: Gateway = {
  configured: true,
  refunds: true,
  async createPayment(order) {
    const paymentId = `TR-${stamp()}`;
    amounts.set(paymentId, order.amount);
    return { paymentId, redirectUrl: `https://bkash.test/pay/${paymentId}`, signature: `sig-${paymentId}` };
  },
  async executePayment(paymentId) {
    if (!approve) throw new GatewayError("Invalid Payment State", "2056");
    return done(paymentId);
  },
  async queryPayment(paymentId) {
    return approve ? done(paymentId) : { ...done(paymentId), status: "Cancelled", trxId: null };
  },
  async refundPayment() {
    throw new Error("Not used in these tests");
  },
  async refundStatus() {
    return [];
  },
};

let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let customer: Awaited<ReturnType<typeof createUser>>;
let other: Awaited<ReturnType<typeof createUser>>;
let income: { id: string };
let expense: { id: string };
const applications: string[] = [];
const entries: string[] = [];

const call = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: Record<string, unknown>) =>
  app.inject({ method, url, payload, headers: bearer(app, admin) });

async function application(amountDue: number | null, userId: string | null = customer.id) {
  const row = await prisma.application.create({
    data: { reference: `BP-${stamp()}`.toUpperCase(), type: "EDUCATION", fullName: `${tag} Student`, email: `${tag}@example.test`, phone: "01711000001", details: {}, amountDue, userId },
  });
  applications.push(row.id);
  return row;
}
const payToken = (applicationId: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub: applicationId, purpose: "pay" }, { expiresIn: "1h" })}` });
let visitors = 0;
async function payOnline(applicationId: string, amount: number) {
  const started = await app.inject({ method: "POST", url: "/api/payments/bkash/create", headers: payToken(applicationId), payload: { applicationId, amount }, remoteAddress: `10.9.0.${++visitors}` });
  assert.equal(started.statusCode, 200, started.body);
  const paymentId = [...amounts.keys()].at(-1)!;
  await app.inject({ method: "GET", url: `/api/payments/bkash/callback?paymentID=${paymentId}&status=success&signature=sig-${paymentId}` });
  return paymentId;
}
const entryFor = (where: Record<string, unknown>) => prisma.financialTransaction.findFirst({ where, include: { category: true } });
const entry = (overrides: Record<string, unknown> = {}) => ({
  type: "INCOME",
  date: "2026-11-12",
  description: `${tag} cash received`,
  total: 10000,
  categoryId: income.id,
  ...overrides,
});
async function record(overrides: Record<string, unknown> = {}) {
  const res = await call("POST", "/api/admin/accounts", entry(overrides));
  if (res.statusCode === 201) entries.push(res.json().data.id);
  return res;
}

before(async () => {
  app = await buildApp({ gateway });
  admin = await createUser("ADMIN");
  customer = await createUser("USER");
  other = await createUser("USER");
  income = await prisma.financialCategory.create({ data: { name: `${tag} Tuition`, type: "INCOME" } });
  expense = await prisma.financialCategory.create({ data: { name: `${tag} Couriers`, type: "EXPENSE" } });
});

after(async () => {
  const mine = { applicationId: { in: applications } };
  const payments = (await prisma.payment.findMany({ where: mine, select: { id: true } })).map((p) => p.id);
  await prisma.financialTransaction.deleteMany({
    where: { OR: [{ id: { in: entries } }, { paymentId: { in: payments } }, { refund: { paymentId: { in: payments } } }, mine] },
  });
  await prisma.refund.deleteMany({ where: { paymentId: { in: payments } } });
  await prisma.receipt.deleteMany({ where: { paymentId: { in: payments } } });
  await prisma.payment.deleteMany({ where: mine });
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await prisma.financialCategory.deleteMany({ where: { id: { in: [income.id, expense.id] } } });
  await deleteUsers(admin.id, customer.id, other.id);
  await app.close();
  await prisma.$disconnect();
});

describe("payments enter Hisab Kitab by themselves", () => {
  test("a bKash payment that goes through is entered as income", async () => {
    const row = await application(60000);
    await payOnline(row.id, 15000);
    const payment = await prisma.payment.findFirstOrThrow({ where: { applicationId: row.id } });
    const found = await entryFor({ paymentId: payment.id });
    assert.ok(found, "no ledger entry for the payment");
    assert.equal(found.type, "INCOME");
    assert.equal(Number(found.total), 15000);
    assert.equal(found.category.name, "Service payments");
    assert.equal(found.userId, customer.id);
    assert.equal(found.applicationId, row.id);
    assert.equal(found.paymentStatus, "PARTIALLY_PAID");
  });

  test("a payment that does not go through is not entered", async () => {
    const row = await application(60000);
    approve = false;
    try {
      await payOnline(row.id, 5000);
    } finally {
      approve = true;
    }
    assert.equal(await prisma.financialTransaction.count({ where: { applicationId: row.id } }), 0);
  });

  test("confirming the same payment again enters it once", async () => {
    const row = await application(60000);
    const paymentId = await payOnline(row.id, 5000);
    await app.inject({ method: "GET", url: `/api/payments/bkash/callback?paymentID=${paymentId}&status=success&signature=sig-${paymentId}` });
    assert.equal(await prisma.financialTransaction.count({ where: { applicationId: row.id } }), 1);
  });

  test("cash an admin records against an application is entered as income", async () => {
    const row = await application(20000);
    const res = await call("POST", "/api/payments", { applicationId: row.id, service: "Admission", amount: 8000, totalDue: 20000, method: "Cash" });
    assert.equal(res.statusCode, 201, res.body);
    const found = await entryFor({ paymentId: res.json().data.id });
    assert.equal(Number(found?.total), 8000);
    assert.equal(found?.category.name, "Service payments");
  });

  test("a completed refund is entered as an expense", async () => {
    const row = await application(20000);
    const paid = await call("POST", "/api/payments", { applicationId: row.id, service: "Admission", amount: 8000, totalDue: 20000, method: "Cash" });
    const refund = await call("POST", `/api/payments/${paid.json().data.id}/refunds`, { amount: 3000, reason: "Overpaid", method: "Cash" });
    assert.equal(refund.statusCode, 201, refund.body);
    const found = await entryFor({ refundId: refund.json().data.id });
    assert.equal(found?.type, "EXPENSE");
    assert.equal(Number(found?.total), 3000);
    assert.equal(found?.category.name, "Refunds");
  });
});

describe("staff record a customer's money in Hisab Kitab", () => {
  test("an entry names an existing customer, and the list shows who", async () => {
    const res = await record({ userId: customer.id });
    assert.equal(res.statusCode, 201, res.body);
    const list = await call("GET", `/api/admin/accounts?search=${encodeURIComponent(tag)}&from=2026-11-01&to=2026-11-30`);
    const row = list.json().data.rows.find((x: any) => x.id === res.json().data.id);
    assert.equal(row.user.email, customer.email);
  });

  test("income for a customer's application is recorded as a cash payment on it", async () => {
    const row = await application(100000);
    const res = await record({ userId: customer.id, applicationId: row.id, paymentMethod: "Cash", description: "MBBS first instalment" });
    assert.equal(res.statusCode, 201, res.body);
    const payment = await prisma.payment.findFirstOrThrow({ where: { applicationId: row.id }, include: { receipt: true } });
    assert.equal(payment.provider, "manual");
    assert.equal(payment.method, "Cash");
    assert.equal(Number(payment.amount), 10000);
    assert.equal(payment.status, "PARTIALLY_PAID");
    assert.equal(Number(payment.receipt?.remainingDue), 90000);
    assert.equal(res.json().data.paymentId, payment.id);
    // The receipt shows the whole fee as well as what was paid.
    const receipt = await call("GET", `/api/payments/receipt/${payment.receipt!.receiptNumber}`);
    assert.equal(Number(receipt.json().data.payment.application.amountDue), 100000);
    // Entered once: the payment did not add a second entry of its own.
    assert.equal(await prisma.financialTransaction.count({ where: { applicationId: row.id } }), 1);
  });

  test("the customer is taken from the application when only it is chosen", async () => {
    const row = await application(50000);
    const res = await record({ applicationId: row.id });
    assert.equal(res.statusCode, 201, res.body);
    assert.equal(res.json().data.userId, customer.id);
  });

  test("more than is still due on the application is refused", async () => {
    const row = await application(5000);
    const res = await record({ applicationId: row.id, total: 6000 });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.message, /5,000/);
    assert.equal(await prisma.payment.count({ where: { applicationId: row.id } }), 0);
  });

  test("an application that is not the chosen customer's is refused", async () => {
    const row = await application(50000, other.id);
    const res = await record({ userId: customer.id, applicationId: row.id });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.message, /not this customer's/i);
  });

  test("an unknown customer is refused", async () => {
    const res = await record({ userId: "nobody" });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.message, /customer/i);
  });

  test("an expense for a customer's application records no payment", async () => {
    const row = await application(50000);
    const res = await record({ type: "EXPENSE", categoryId: expense.id, applicationId: row.id, total: 700, description: "Courier to embassy" });
    assert.equal(res.statusCode, 201, res.body);
    assert.equal(await prisma.payment.count({ where: { applicationId: row.id } }), 0);
    assert.equal(res.json().data.applicationId, row.id);
  });

  test("an entry that records a payment keeps its amount when edited", async () => {
    const row = await application(100000);
    const created = await record({ applicationId: row.id });
    const res = await call("PUT", `/api/admin/accounts/${created.json().data.id}`, entry({ applicationId: row.id, total: 99, description: "Renamed instalment" }));
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(Number(res.json().data.total), 10000);
    assert.equal(res.json().data.description, "Renamed instalment");
  });

  test("an entry that records a payment cannot be deleted", async () => {
    const row = await application(100000);
    const created = await record({ applicationId: row.id });
    const res = await call("DELETE", `/api/admin/accounts/${created.json().data.id}`);
    assert.equal(res.statusCode, 409);
    assert.match(res.json().error.message, /refund/i);
  });

  test("searching for a customer finds their account and applications", async () => {
    const row = await application(30000);
    const res = await call("GET", `/api/admin/accounts/customers?search=${encodeURIComponent(customer.email)}`);
    assert.equal(res.statusCode, 200, res.body);
    const found = res.json().data.find((x: any) => x.id === customer.id);
    assert.ok(found);
    const listed = found.applications.find((x: any) => x.id === row.id);
    assert.equal(listed.reference, row.reference);
    assert.equal(listed.remaining, 30000);
  });
});

describe("any day's records can be looked up later", () => {
  test("only the entries of the day asked for are listed, with that day's totals", async () => {
    await record({ date: "2025-11-11", description: `${tag} day one`, total: 1200 });
    await record({ date: "2025-11-12", description: `${tag} day two`, total: 800 });
    const res = await call("GET", `/api/admin/accounts?day=2025-11-11&search=${encodeURIComponent(tag)}`);
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(res.json().data.rows.map((x: any) => x.description), [`${tag} day one`]);
    assert.equal(res.json().data.summary.income, 1200);
  });

  test("a payment late in the evening in Bangladesh belongs to that day", async () => {
    await record({ date: "2025-11-11T17:30:00.000Z", description: `${tag} late evening`, total: 50 });
    const day = async (d: string) =>
      (await call("GET", `/api/admin/accounts?day=${d}&search=${encodeURIComponent(`${tag} late`)}`)).json().data.rows.length;
    assert.equal(await day("2025-11-11"), 1);
    assert.equal(await day("2025-11-12"), 0);
  });

  test("one entry can be opened on its own, to print it", async () => {
    const created = await record({ userId: customer.id, description: `${tag} printable` });
    const res = await call("GET", `/api/admin/accounts/${created.json().data.id}`);
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().data.description, `${tag} printable`);
    assert.equal(res.json().data.category.name, `${tag} Tuition`);
    assert.equal(res.json().data.user.email, customer.email);
    assert.equal((await call("GET", "/api/admin/accounts/nothing-here")).statusCode, 404);
  });

  test("a day that is not a date is refused", async () => {
    const res = await call("GET", "/api/admin/accounts?day=yesterday");
    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.message, /date/i);
  });
});
