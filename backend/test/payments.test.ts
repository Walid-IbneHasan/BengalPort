// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");

const stamp = `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let app: Awaited<ReturnType<typeof buildApp>>;
let memberId = "";
let applicationId = "";
const token = (sub: string, role: "ADMIN" | "USER") => ({
  authorization: `Bearer ${app.jwt.sign({ sub, role })}`,
});
const record = (payload: Record<string, unknown>) =>
  app.inject({ method: "POST", url: "/api/payments", headers: token("an-admin", "ADMIN"), payload });
const payment = (overrides: Record<string, unknown> = {}) => ({
  applicationId,
  service: "Umrah package",
  totalDue: 60000,
  amount: 25000,
  method: "Bank transfer",
  ...overrides,
});

before(async () => {
  app = await buildApp();
  const member = await prisma.user.create({
    data: { name: "Paying Member", email: `${stamp}@example.test`, emailVerifiedAt: new Date() },
  });
  memberId = member.id;
  const application = await prisma.application.create({
    data: { reference: `BP-${stamp}`, type: "UMRAH", fullName: "Paying Member", email: member.email, phone: "01711000000", details: {}, userId: member.id },
  });
  applicationId = application.id;
});

after(async () => {
  const mine = { OR: [{ applicationId }, { service: { startsWith: stamp } }] };
  await prisma.receipt.deleteMany({ where: { payment: mine } });
  await prisma.payment.deleteMany({ where: mine });
  await prisma.application.deleteMany({ where: { id: applicationId } });
  await prisma.user.deleteMany({ where: { id: memberId } });
  await app.close();
  await prisma.$disconnect();
});

describe("recording a payment as an admin", () => {
  test("a part payment gets a receipt showing what is still due", async () => {
    const res = await record(payment());
    assert.equal(res.statusCode, 201);
    const { data } = res.json();
    assert.equal(data.status, "PARTIALLY_PAID");
    assert.equal(Number(data.receipt.remainingDue), 35000);
    assert.match(data.receipt.receiptNumber, /^BPR-\d{4}-/);
  });

  test("a payment against an application belongs to the applicant", async () => {
    const res = await record(payment());
    assert.equal(res.json().data.userId, memberId);
  });

  test("the applicant sees the payment and its receipt in their account", async () => {
    const recorded = (await record(payment({ amount: 60000 }))).json().data;
    const activity = await app.inject({ method: "GET", url: "/api/auth/me/activity", headers: token(memberId, "USER") });
    const mine = activity.json().data.payments.find((item: { id: string }) => item.id === recorded.id);
    assert.equal(mine.status, "PAID");
    assert.equal(mine.receipt.receiptNumber, recorded.receipt.receiptNumber);
  });

  test("a walk-in payment needs no application", async () => {
    const res = await record(payment({ applicationId: undefined, service: `${stamp} consultation` }));
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.userId, null);
  });

  test("the bank's transaction reference is kept when given", async () => {
    const res = await record(payment({ transactionId: `${stamp}-TXN-1` }));
    assert.equal(res.json().data.transactionId, `${stamp}-TXN-1`);
  });

  test("the same transaction reference cannot be recorded twice", async () => {
    await record(payment({ transactionId: `${stamp}-TXN-2` }));
    const res = await record(payment({ transactionId: `${stamp}-TXN-2` }));
    assert.equal(res.statusCode, 409);
  });

  test("payments recorded at the same instant get different receipt numbers", async (t) => {
    t.mock.timers.enable({ apis: ["Date"], now: new Date("2027-01-15T10:00:00Z") });
    const first = await record(payment());
    const second = await record(payment());
    assert.equal(second.statusCode, 201);
    assert.notEqual(first.json().data.receipt.receiptNumber, second.json().data.receipt.receiptNumber);
  });
});

describe("payments that are refused", () => {
  test("an application that does not exist", async () => {
    const res = await record(payment({ applicationId: "no-such-application" }));
    assert.equal(res.statusCode, 404);
  });

  test("paying more than the total due", async () => {
    const res = await record(payment({ amount: 70000 }));
    assert.equal(res.statusCode, 400);
  });
});
