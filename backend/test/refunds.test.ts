// Integration tests for refunds. bKash is replaced by a stand-in; the database
// is the one in backend/.env, and every row created here is removed afterwards.
import "dotenv/config";
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Gateway, GatewayRefund, RefundOrder } from "../src/lib/bkash.js";
import type { Mail, Mailer } from "../src/lib/email.js";

process.env.LOG_LEVEL = "silent";
process.env.ADMIN_NOTIFY_EMAIL = "accounts@example.test";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { GatewayError } = await import("../src/lib/bkash.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

// A stand-in for bKash whose behaviour each test can set.
const bkash = {
  configured: true,
  refund: "completed" as "completed" | "refused" | "silent",
  // What bKash's own list of refunds says for a payment.
  held: [] as GatewayRefund[],
  orders: [] as RefundOrder[],
  statusCalls: 0,
};
const unused = async (): Promise<never> => { throw new Error("Not used in these tests"); };
const gateway: Gateway = {
  get configured() { return bkash.configured; },
  createPayment: unused,
  executePayment: unused,
  queryPayment: unused,
  async refundPayment(order) {
    bkash.orders.push(order);
    if (bkash.refund === "silent") throw new GatewayError("bKash did not respond", "NO_RESPONSE");
    if (bkash.refund === "refused") throw new GatewayError("Refund amount not valid", "2072");
    return { refundTrxId: `RF${stamp()}`, status: "Completed", amount: order.amount };
  },
  async refundStatus() {
    bkash.statusCalls++;
    return bkash.held;
  },
};
const sent: Mail[] = [];
const mailer: Mailer = { configured: true, async send(mail) { sent.push(mail); } };

let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;
const applications: string[] = [];

// An application with one received payment of 5,000 against 20,000 due.
async function paid(provider: "bkash" | "manual" = "bkash") {
  const application = await prisma.application.create({
    data: { reference: `BP-${stamp()}`.toUpperCase(), type: "UMRAH", fullName: "Refund Tester", email: "refund@example.test", phone: "01711000000", details: {}, amountDue: 20000, userId: member.id },
  });
  applications.push(application.id);
  const payment = await prisma.payment.create({
    data: {
      applicationId: application.id,
      userId: member.id,
      service: "Umrah application",
      amount: 5000,
      totalDue: 20000,
      method: provider === "bkash" ? "bKash" : "Cash",
      transactionId: `TEST-${stamp()}`,
      status: "PARTIALLY_PAID",
      provider,
      paidAt: new Date(),
      ...(provider === "bkash" ? { gatewayPaymentId: `TR-${stamp()}`, gatewayTransactionId: `TRX${stamp()}`, gatewayStatus: "completed", payerAccount: "01770618575" } : {}),
      receipt: { create: { receiptNumber: `BPR-TEST-${stamp()}`, previousDue: 20000, remainingDue: 15000 } },
    },
    include: { receipt: true },
  });
  return { application, payment };
}
const refund = (paymentId: string, payload: Record<string, unknown>, user: typeof admin | null = admin) =>
  app.inject({ method: "POST", url: `/api/payments/${paymentId}/refunds`, payload, headers: user ? bearer(app, user) : {} });
const refunds = async (paymentId: string) =>
  (await app.inject({ method: "GET", url: `/api/payments/${paymentId}/refunds`, headers: bearer(app, admin) })).json().data;
const owed = async (applicationId: string) =>
  (await app.inject({ method: "GET", url: `/api/payments/application/${applicationId}`, headers: bearer(app, admin) })).json().data;
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

before(async () => {
  app = await buildApp({ mailer, gateway });
  admin = await createUser("ADMIN");
  member = await createUser("USER");
});
beforeEach(() => {
  Object.assign(bkash, { configured: true, refund: "completed", held: [], statusCalls: 0 });
  bkash.orders.length = 0;
  sent.length = 0;
});
after(async () => {
  const mine = { payment: { applicationId: { in: applications } } };
  await prisma.refund.deleteMany({ where: mine });
  await prisma.receipt.deleteMany({ where: mine });
  await prisma.payment.deleteMany({ where: { applicationId: { in: applications } } });
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await deleteUsers(admin.id, member.id);
  await app.close();
  await prisma.$disconnect();
});

describe("refunding a bKash payment", () => {
  test("part of a payment is sent back through bKash and recorded", async () => {
    const { application, payment } = await paid();
    const res = await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.status, "COMPLETED");
    assert.equal(res.json().data.method, "bKash");
    assert.deepEqual(bkash.orders, [{ paymentId: payment.gatewayPaymentId, trxId: payment.gatewayTransactionId, amount: 1500, reason: "One pilgrim withdrew", sku: application.reference }]);
    const row = await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } });
    assert.match(row.gatewayRefundId ?? "", /^RF/);
    assert.equal(row.recordedBy, admin.name);
  });

  test("the money sent back is owed again", async () => {
    const { application, payment } = await paid();
    await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    const state = await owed(application.id);
    assert.deepEqual({ paid: state.paid, remaining: state.remaining }, { paid: 3500, remaining: 16500 });
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status, "PARTIALLY_PAID");
  });

  test("refunding all of it marks the payment as refunded", async () => {
    const { application, payment } = await paid();
    await refund(payment.id, { amount: 2000, reason: "Trip postponed" });
    await refund(payment.id, { amount: 3000, reason: "Trip cancelled" });
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status, "REFUNDED");
    const state = await owed(application.id);
    assert.deepEqual({ paid: state.paid, remaining: state.remaining }, { paid: 0, remaining: 20000 });
  });

  test("more than is left on the payment is refused before bKash is asked", async () => {
    const { payment } = await paid();
    await refund(payment.id, { amount: 4000, reason: "Trip postponed" });
    const res = await refund(payment.id, { amount: 1000.01, reason: "Trip cancelled" });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /up to ৳1,000/);
    assert.equal(bkash.orders.length, 1);
  });

  test("when bKash refuses, its explanation is shown and nothing is held back", async () => {
    const { payment } = await paid();
    bkash.refund = "refused";
    const res = await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    assert.equal(res.statusCode, 502);
    assert.match(res.json().error.message, /Refund amount not valid/);
    assert.equal((await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } })).status, "FAILED");
    assert.equal((await refunds(payment.id)).refundable, 5000);
  });

  test("when bKash does not answer, the refund waits and its amount is held back", async () => {
    const { payment } = await paid();
    bkash.refund = "silent";
    const res = await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    assert.equal(res.statusCode, 202);
    assert.equal(res.json().data.status, "PENDING");
    bkash.refund = "completed";
    assert.equal((await refund(payment.id, { amount: 5000, reason: "Trip cancelled" })).statusCode, 400);
    assert.equal((await owed(payment.applicationId!)).paid, 5000);
  });

  test("an unanswered refund that bKash did make is found straight away", async () => {
    const { payment } = await paid();
    bkash.refund = "silent";
    bkash.held = [{ refundTrxId: "RFFOUND1", status: "Completed", amount: 1500 }];
    const res = await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.status, "COMPLETED");
    assert.equal((await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } })).gatewayRefundId, "RFFOUND1");
  });

  test("a waiting refund is settled the next time the payment's refunds are opened", async () => {
    const { payment } = await paid();
    bkash.refund = "silent";
    await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    bkash.held = [{ refundTrxId: "RFLATER1", status: "Completed", amount: 1500 }];
    const state = await refunds(payment.id);
    assert.equal(state.refunds[0].status, "COMPLETED");
    assert.equal(state.refundable, 3500);
  });

  test("a refund bKash already counted is not matched twice", async () => {
    const { payment } = await paid();
    await prisma.refund.create({ data: { paymentId: payment.id, amount: 1500, reason: "Earlier refund", method: "bKash", status: "COMPLETED", gatewayRefundId: `RFOLD${stamp()}`, recordedBy: "Test Admin" } });
    const earlier = (await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } })).gatewayRefundId;
    bkash.refund = "silent";
    bkash.held = [{ refundTrxId: earlier, status: "Completed", amount: 1500 }];
    const res = await refund(payment.id, { amount: 1500, reason: "Second refund of the same amount" });
    assert.equal(res.statusCode, 202);
    assert.equal(res.json().data.status, "PENDING");
  });

  test("a waiting refund bKash still knows nothing about after a few minutes is given up", async () => {
    const { payment } = await paid();
    bkash.refund = "silent";
    const id = (await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" })).json().data.id;
    assert.equal((await refunds(payment.id)).refunds[0].status, "PENDING");
    await prisma.refund.update({ where: { id }, data: { createdAt: new Date(Date.now() - 5 * 60_000) } });
    const state = await refunds(payment.id);
    assert.equal(state.refunds[0].status, "FAILED");
    assert.equal(state.refundable, 5000);
  });

  test("while bKash is not connected a bKash payment cannot be refunded here", async () => {
    const { payment } = await paid();
    bkash.configured = false;
    assert.equal((await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" })).statusCode, 503);
    assert.equal(await prisma.refund.count({ where: { paymentId: payment.id } }), 0);
  });

  test("the payer and the team are told about a completed refund", async () => {
    const { application, payment } = await paid();
    await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    await settle();
    assert.deepEqual(sent.map((mail) => mail.to).sort(), ["accounts@example.test", "refund@example.test"]);
    const toPayer = sent.find((mail) => mail.to === "refund@example.test")!;
    assert.match(toPayer.text, /1,500/);
    assert.match(toPayer.subject + toPayer.text, new RegExp(application.reference));
    assert.doesNotMatch(toPayer.text, /One pilgrim withdrew/);
  });
});

describe("recording a refund of a payment taken by staff", () => {
  test("it is recorded with how the money was returned, without asking bKash", async () => {
    const { payment } = await paid("manual");
    const res = await refund(payment.id, { amount: 2000, reason: "Duplicate payment", method: "Bank transfer" });
    assert.equal(res.statusCode, 201);
    assert.deepEqual({ status: res.json().data.status, method: res.json().data.method }, { status: "COMPLETED", method: "Bank transfer" });
    assert.equal(bkash.orders.length, 0);
  });

  test("how the money was returned must be given", async () => {
    const { payment } = await paid("manual");
    assert.equal((await refund(payment.id, { amount: 2000, reason: "Duplicate payment" })).statusCode, 400);
  });
});

describe("who may refund, and what", () => {
  test("a reason is required", async () => {
    const { payment } = await paid();
    assert.equal((await refund(payment.id, { amount: 1500, reason: " " })).statusCode, 400);
    assert.equal(bkash.orders.length, 0);
  });

  test("a payment that was never received cannot be refunded", async () => {
    const { payment } = await paid();
    await prisma.payment.update({ where: { id: payment.id }, data: { status: "FAILED" } });
    assert.equal((await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" })).statusCode, 400);
  });

  test("an unknown payment answers 404", async () => {
    assert.equal((await refund("missing", { amount: 1500, reason: "One pilgrim withdrew" })).statusCode, 404);
  });

  test("the member who paid cannot refund themselves", async () => {
    const { payment } = await paid();
    assert.equal((await refund(payment.id, { amount: 1500, reason: "I want it back" }, member)).statusCode, 403);
    assert.equal((await app.inject({ method: "GET", url: `/api/payments/${payment.id}/refunds`, headers: bearer(app, member) })).statusCode, 403);
  });

  test("a visitor who is not signed in cannot refund", async () => {
    const { payment } = await paid();
    assert.equal((await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" }, null)).statusCode, 401);
  });
});

describe("where a refund shows afterwards", () => {
  test("the receipt lists the money that was sent back", async () => {
    const { payment } = await paid();
    await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    bkash.refund = "refused";
    await refund(payment.id, { amount: 100, reason: "Refused by bKash" });
    const receipt = (await app.inject({ method: "GET", url: `/api/payments/receipt/${payment.receipt!.receiptNumber}`, headers: bearer(app, member) })).json().data;
    assert.equal(receipt.payment.refunds.length, 1);
    assert.equal(Number(receipt.payment.refunds[0].amount), 1500);
    assert.equal(receipt.payment.refunds[0].reason, undefined);
  });

  test("the member's own list of payments carries their refunds", async () => {
    const { payment } = await paid();
    await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    const activity = (await app.inject({ method: "GET", url: "/api/auth/me/activity", headers: bearer(app, member) })).json().data;
    const mine = activity.payments.find((item: { id: string }) => item.id === payment.id);
    assert.equal(Number(mine.refunds[0].amount), 1500);
  });

  test("the admin's list of payments carries each payment's refunds", async () => {
    const { payment } = await paid();
    await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    const rows = (await app.inject({ method: "GET", url: `/api/admin/resources/payments?search=${payment.transactionId}`, headers: bearer(app, admin) })).json().data as any[];
    assert.equal(Number(rows[0].refunds[0].amount), 1500);
  });

  test("money received on the dashboard is counted after refunds", async () => {
    const { payment } = await paid();
    await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    // Other test files add payments while this one runs, so the total is
    // compared with the database only when nothing changed in between.
    const counted = { status: { in: ["PAID", "PARTIALLY_PAID"] as ("PAID" | "PARTIALLY_PAID")[] } };
    const expected = async () =>
      Number((await prisma.payment.aggregate({ _sum: { amount: true }, where: counted }))._sum.amount ?? 0) -
      Number((await prisma.refund.aggregate({ _sum: { amount: true }, where: { status: "COMPLETED", payment: counted } }))._sum.amount ?? 0);
    for (let attempt = 0; attempt < 20; attempt++) {
      const before = await expected();
      const shown = (await app.inject({ method: "GET", url: "/api/admin/dashboard", headers: bearer(app, admin) })).json().data.paymentsReceived;
      if (before !== (await expected())) continue;
      assert.equal(Math.round(shown * 100), Math.round(before * 100));
      return;
    }
    assert.fail("The payments kept changing while the dashboard was read");
  });

  test("a part refund lowers the dashboard's total by what was sent back", async () => {
    const { payment } = await paid();
    const completed = async () => Number((await prisma.refund.aggregate({ _sum: { amount: true }, where: { paymentId: payment.id, status: "COMPLETED" } }))._sum.amount ?? 0);
    assert.equal(await completed(), 0);
    await refund(payment.id, { amount: 1500, reason: "One pilgrim withdrew" });
    assert.equal(await completed(), 1500);
  });
});
