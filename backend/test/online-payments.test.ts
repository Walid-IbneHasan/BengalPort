// Integration tests for paying an application online. bKash is replaced by a
// stand-in; the database is the one in backend/.env, and every row created
// here is removed afterwards (service fees are put back as they were).
import "dotenv/config";
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Gateway, GatewayStatus, PaymentOrder } from "../src/lib/bkash.js";
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
  create: "ok" as "ok" | "down",
  execute: "completed" as "completed" | "refused" | "silent",
  query: "initiated" as "initiated" | "completed" | "silent",
  reportedAmount: null as number | null,
  orders: [] as (PaymentOrder & { paymentId: string })[],
  executed: [] as string[],
  queried: [] as string[],
};
const status = (paymentId: string, state: string): GatewayStatus => ({
  paymentId,
  status: state,
  trxId: state === "Completed" ? `TRX${paymentId.slice(-6)}` : null,
  amount: bkash.reportedAmount ?? bkash.orders.find((order) => order.paymentId === paymentId)?.amount ?? null,
  payerAccount: state === "Completed" ? "01770618575" : null,
});
const gateway: Gateway = {
  get configured() {
    return bkash.configured;
  },
  async createPayment(order) {
    if (bkash.create === "down") throw new GatewayError("bKash is unavailable", "NO_RESPONSE");
    const paymentId = `TR-${stamp()}`;
    bkash.orders.push({ ...order, paymentId });
    return { paymentId, bkashURL: `https://bkash.test/pay/${paymentId}`, signature: `sig-${paymentId}` };
  },
  async executePayment(paymentId) {
    bkash.executed.push(paymentId);
    if (bkash.execute === "silent") throw new GatewayError("bKash did not respond", "NO_RESPONSE");
    if (bkash.execute === "refused") throw new GatewayError("Invalid Payment State", "2056");
    return status(paymentId, "Completed");
  },
  async queryPayment(paymentId) {
    bkash.queried.push(paymentId);
    if (bkash.query === "silent") throw new GatewayError("bKash did not respond", "NO_RESPONSE");
    return status(paymentId, bkash.query === "completed" ? "Completed" : "Initiated");
  },
};
const sent: Mail[] = [];
const mailer: Mailer = { configured: true, async send(mail) { sent.push(mail); } };

let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;
let stranger: Awaited<ReturnType<typeof createUser>>;
let feesBefore: Awaited<ReturnType<typeof prisma.serviceFee.findMany>>;
const applications: string[] = [];

async function application(amountDue: number | null = 60000, userId?: string) {
  const row = await prisma.application.create({
    data: { reference: `BP-${stamp()}`.toUpperCase(), type: "UMRAH", fullName: "Payment Tester", email: "Payer@Example.Test", phone: "+880 1711-991035", details: {}, amountDue, userId },
  });
  applications.push(row.id);
  return row;
}
const payToken = (applicationId: string) => ({ authorization: `Bearer ${app.jwt.sign({ sub: applicationId, purpose: "pay" }, { expiresIn: "1h" })}` });
// Each request comes from its own visitor, so the per-visitor rate limits do not add up across tests.
let visitors = 0;
const visitor = () => `10.1.${Math.floor(++visitors / 250)}.${visitors % 250 + 1}`;
const start = (applicationId: string, amount: number, headers: Record<string, string> = payToken(applicationId)) =>
  app.inject({ method: "POST", url: "/api/payments/bkash/create", headers, payload: { applicationId, amount }, remoteAddress: visitor() });
const lastOrder = () => bkash.orders.at(-1)!;
const comeBack = (paymentId: string, outcome = "success", signature = `sig-${paymentId}`) =>
  app.inject({ method: "GET", url: `/api/payments/bkash/callback?paymentID=${paymentId}&status=${outcome}&signature=${signature}` });
const landing = (res: { headers: Record<string, unknown> }) => new URL(String(res.headers.location));
const summary = async (applicationId: string) =>
  (await app.inject({ method: "GET", url: `/api/payments/application/${applicationId}`, headers: payToken(applicationId) })).json().data;
// Starts a payment and returns from bKash having approved it.
async function pay(applicationId: string, amount: number) {
  await start(applicationId, amount);
  return comeBack(lastOrder().paymentId);
}
const setFees = (fees: Record<string, unknown>[], who = admin) =>
  app.inject({ method: "PUT", url: "/api/admin/payment-settings", headers: bearer(app, who), payload: { fees } });
const fee = (overrides: Record<string, unknown> = {}) => ({ division: "UMRAH", label: "Umrah booking fee", amount: 5000, minimumPayment: 1000, ...overrides });

before(async () => {
  app = await buildApp({ gateway, mailer });
  admin = await createUser("ADMIN");
  member = await createUser("USER");
  stranger = await createUser("USER");
  feesBefore = await prisma.serviceFee.findMany();
});
beforeEach(() => {
  Object.assign(bkash, { configured: true, create: "ok", execute: "completed", query: "initiated", reportedAmount: null });
  bkash.executed.length = bkash.queried.length = sent.length = 0;
});
after(async () => {
  const mine = { applicationId: { in: applications } };
  await prisma.receipt.deleteMany({ where: { payment: mine } });
  await prisma.payment.deleteMany({ where: mine });
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await prisma.serviceFee.deleteMany();
  if (feesBefore.length) await prisma.serviceFee.createMany({ data: feesBefore });
  await deleteUsers(admin.id, member.id, stranger.id);
  await app.close();
  await prisma.$disconnect();
});

describe("service fees and whether online payment is on", () => {
  const config = async () => (await app.inject({ method: "GET", url: "/api/payments/config" })).json().data;

  test("online payment shows as unavailable until bKash is set up", async () => {
    bkash.configured = false;
    assert.equal((await config()).enabled, false);
  });

  test("an admin sets a division's service fee and smallest part payment", async () => {
    assert.equal((await setFees([fee()])).statusCode, 200);
    const { enabled, fees } = await config();
    assert.equal(enabled, true);
    assert.deepEqual(fees.UMRAH, { label: "Umrah booking fee", amount: 5000, minimumPayment: 1000 });
  });

  test("a smallest part payment larger than the fee is refused", async () => {
    assert.equal((await setFees([fee({ amount: 5000, minimumPayment: 6000 })])).statusCode, 400);
  });

  test("a member cannot change the fees", async () => {
    assert.equal((await setFees([fee()], member)).statusCode, 403);
  });

  // Submits a completed Umrah application the way the website does.
  async function submitUmrah() {
    const { applicationForms } = await import("../../frontend/src/lib/application-forms.js");
    const details: Record<string, unknown> = {};
    for (const field of applicationForms.UMRAH.steps.flatMap((step) => step.fields)) {
      if (!field.required && field.type !== "checkbox") continue;
      details[field.key] = field.type === "multi" ? [field.options![0]] : field.type === "checkbox" ? true : field.type === "select" ? field.options![0] : field.type === "email" ? "payer@example.test" : field.type === "tel" ? "01711991035" : field.type === "date" ? "2031-01-15" : field.type === "number" ? "2" : "Test answer";
    }
    const submitted = (await app.inject({ method: "POST", url: "/api/applications", payload: { type: "UMRAH", fullName: details.fullName, email: details.email, phone: details.phone, details } })).json().data;
    applications.push(submitted.id);
    return submitted;
  }

  test("a new application owes its division's fee and can be paid without an account", async () => {
    await setFees([fee({ amount: 5000 })]);
    const submitted = await submitUmrah();
    assert.equal(Number(submitted.amountDue), 5000);
    const res = await start(submitted.id, 5000, { authorization: `Bearer ${submitted.payToken}` });
    assert.equal(res.statusCode, 200);
  });

  test("a division without a fee leaves the amount open until staff set it", async () => {
    await setFees([fee({ amount: 0, minimumPayment: 0 })]);
    const submitted = await submitUmrah();
    assert.equal(submitted.amountDue, null);
    assert.equal((await summary(submitted.id)).remaining, null);
  });
});

describe("setting what an application costs", () => {
  const setAmount = (id: string, amountDue: number | null, who = admin) =>
    app.inject({ method: "PATCH", url: `/api/admin/resources/applications/${id}`, headers: bearer(app, who), payload: { amountDue } });

  test("an admin sets the amount due after quoting the customer", async () => {
    const quoted = await application(null);
    assert.equal((await setAmount(quoted.id, 185000)).statusCode, 200);
    assert.equal((await summary(quoted.id)).remaining, 185000);
  });

  test("a negative amount is refused", async () => {
    const quoted = await application(null);
    assert.equal((await setAmount(quoted.id, -1)).statusCode, 400);
  });

  test("a member cannot change what their application costs", async () => {
    const mine = await application(60000, member.id);
    assert.equal((await setAmount(mine.id, 1, member)).statusCode, 403);
  });

  test("the status of an application can still be changed on its own", async () => {
    const one = await application();
    const res = await app.inject({ method: "PATCH", url: `/api/admin/resources/applications/${one.id}`, headers: bearer(app, admin), payload: { status: "IN_REVIEW" } });
    assert.equal(res.json().data.status, "IN_REVIEW");
  });
});

describe("starting a payment", () => {
  test("a part payment sends the customer to bKash with our invoice and reference", async () => {
    await setFees([fee({ amount: 5000, minimumPayment: 1000 })]);
    const owed = await application(60000);
    const res = await start(owed.id, 25000);
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.bkashURL, `https://bkash.test/pay/${lastOrder().paymentId}`);
    assert.equal(lastOrder().amount, 25000);
    assert.equal(lastOrder().payerReference, owed.reference);
    assert.match(lastOrder().invoice, /^BP-PAY-/);
    assert.match(lastOrder().callbackURL, /\/api\/payments\/bkash\/callback$/);
  });

  test("nothing is recorded as paid until bKash confirms it", async () => {
    const owed = await application(60000);
    await start(owed.id, 25000);
    assert.equal((await summary(owed.id)).paid, 0);
  });

  test("more than what is owed is refused before bKash is contacted", async () => {
    const owed = await application(60000);
    const orders = bkash.orders.length;
    const res = await start(owed.id, 70000);
    assert.equal(res.statusCode, 400);
    assert.match(res.json().message, /You can pay up to ৳60,000/);
    assert.equal(bkash.orders.length, orders);
  });

  test("less than the smallest part payment is refused", async () => {
    await setFees([fee({ amount: 5000, minimumPayment: 1000 })]);
    const owed = await application(60000);
    assert.match((await start(owed.id, 500)).json().message, /smallest part payment is ৳1,000/);
  });

  test("an application with no amount set cannot be paid yet", async () => {
    const open = await application(null);
    assert.equal((await start(open.id, 1000)).statusCode, 400);
  });

  test("the member who applied can pay from their account", async () => {
    const mine = await application(60000, member.id);
    assert.equal((await start(mine.id, 60000, bearer(app, member))).statusCode, 200);
  });

  test("another member cannot pay into or look at an application that is not theirs", async () => {
    const mine = await application(60000, member.id);
    assert.equal((await start(mine.id, 60000, bearer(app, stranger))).statusCode, 404);
    const peek = await app.inject({ method: "GET", url: `/api/payments/application/${mine.id}`, headers: bearer(app, stranger) });
    assert.equal(peek.statusCode, 404);
  });

  test("a payment link for one application does not work for another", async () => {
    const one = await application();
    const other = await application();
    assert.equal((await start(other.id, 1000, payToken(one.id))).statusCode, 404);
  });

  test("without any token a payment cannot be started", async () => {
    const owed = await application();
    assert.equal((await start(owed.id, 1000, {})).statusCode, 401);
  });

  test("when bKash cannot start the payment the customer is told and nothing is recorded as paid", async () => {
    bkash.create = "down";
    const owed = await application(60000);
    const res = await start(owed.id, 25000);
    assert.equal(res.statusCode, 502);
    assert.equal((await summary(owed.id)).paid, 0);
    assert.equal(await prisma.payment.count({ where: { applicationId: owed.id, status: "PENDING" } }), 0);
  });

  test("a payment cannot be started while bKash is not set up", async () => {
    bkash.configured = false;
    const owed = await application();
    assert.equal((await start(owed.id, 1000)).statusCode, 503);
  });
});

describe("coming back from bKash", () => {
  test("a successful part payment is recorded with a receipt for what is left", async () => {
    const owed = await application(60000);
    const res = await pay(owed.id, 25000);
    assert.equal(res.statusCode, 302);
    assert.equal(landing(res).pathname, "/payment/result");
    assert.equal(landing(res).searchParams.get("status"), "success");
    const receipt = await prisma.receipt.findUniqueOrThrow({ where: { receiptNumber: landing(res).searchParams.get("receipt")! }, include: { payment: true } });
    assert.equal(Number(receipt.previousDue), 60000);
    assert.equal(Number(receipt.remainingDue), 35000);
    assert.equal(receipt.payment.status, "PARTIALLY_PAID");
    assert.equal(receipt.payment.provider, "bkash");
    assert.equal(receipt.payment.payerAccount, "01770618575");
    assert.match(String(receipt.payment.gatewayTransactionId), /^TRX/);
  });

  test("paying the rest marks the application as fully paid", async () => {
    const owed = await application(60000);
    await pay(owed.id, 25000);
    const res = await pay(owed.id, 35000);
    const receipt = await prisma.receipt.findUniqueOrThrow({ where: { receiptNumber: landing(res).searchParams.get("receipt")! }, include: { payment: true } });
    assert.equal(receipt.payment.status, "PAID");
    assert.equal(Number(receipt.previousDue), 35000);
    const state = await summary(owed.id);
    assert.deepEqual([state.paid, state.remaining], [60000, 0]);
    assert.equal(state.payments.length, 2);
  });

  test("a payment the customer cancelled records nothing", async () => {
    const owed = await application(60000);
    await start(owed.id, 25000);
    const res = await comeBack(lastOrder().paymentId, "cancel");
    assert.equal(landing(res).searchParams.get("status"), "cancelled");
    assert.equal(bkash.executed.length, 0);
    assert.equal((await summary(owed.id)).paid, 0);
    assert.equal(await prisma.receipt.count({ where: { payment: { applicationId: owed.id } } }), 0);
  });

  test("a payment bKash reports as failed records nothing", async () => {
    const owed = await application(60000);
    await start(owed.id, 25000);
    assert.equal(landing(await comeBack(lastOrder().paymentId, "failure")).searchParams.get("status"), "failed");
    assert.equal((await summary(owed.id)).paid, 0);
  });

  test("returning twice records the payment once", async () => {
    const owed = await application(60000);
    const first = await pay(owed.id, 25000);
    const second = await comeBack(lastOrder().paymentId);
    assert.equal(landing(second).searchParams.get("status"), "success");
    assert.equal(landing(second).searchParams.get("receipt"), landing(first).searchParams.get("receipt"));
    assert.equal(bkash.executed.length, 1);
    assert.equal((await summary(owed.id)).paid, 25000);
  });

  test("two returns at the same moment record the payment once", async () => {
    const owed = await application(60000);
    await start(owed.id, 25000);
    await Promise.all([comeBack(lastOrder().paymentId), comeBack(lastOrder().paymentId)]);
    assert.equal(bkash.executed.length, 1);
    assert.equal(await prisma.receipt.count({ where: { payment: { applicationId: owed.id } } }), 1);
  });

  test("when the confirmation goes unanswered, bKash is asked whether the money moved", async () => {
    bkash.execute = "silent";
    bkash.query = "completed";
    const owed = await application(60000);
    const res = await pay(owed.id, 25000);
    assert.equal(landing(res).searchParams.get("status"), "success");
    assert.equal((await summary(owed.id)).paid, 25000);
  });

  test("when bKash cannot be reached at all the payment waits, and is confirmed on the next look", async () => {
    bkash.execute = "silent";
    bkash.query = "silent";
    const owed = await application(60000);
    const res = await pay(owed.id, 25000);
    assert.equal(landing(res).searchParams.get("status"), "pending");
    assert.equal((await summary(owed.id)).paid, 0);
    bkash.query = "completed";
    assert.equal((await summary(owed.id)).paid, 25000);
  });

  test("a payment the customer never approved is marked failed", async () => {
    bkash.execute = "refused";
    const owed = await application(60000);
    const res = await pay(owed.id, 25000);
    assert.equal(landing(res).searchParams.get("status"), "failed");
    assert.equal((await summary(owed.id)).paid, 0);
  });

  test("a made-up payment id is turned away", async () => {
    const res = await comeBack("TR-does-not-exist");
    assert.equal(landing(res).searchParams.get("status"), "error");
    assert.equal(bkash.executed.length, 0);
  });

  test("a return whose signature does not match is not acted on", async () => {
    const owed = await application(60000);
    await start(owed.id, 25000);
    const res = await comeBack(lastOrder().paymentId, "success", "forged");
    assert.equal(landing(res).searchParams.get("status"), "error");
    assert.equal(bkash.executed.length, 0);
  });

  test("the amount bKash says it collected is the amount recorded", async () => {
    bkash.reportedAmount = 20000;
    const owed = await application(60000);
    await pay(owed.id, 25000);
    const state = await summary(owed.id);
    assert.deepEqual([state.paid, state.remaining], [20000, 40000]);
  });
});

describe("receipts and finding an application to pay", () => {
  test("the receipt link given after paying opens the receipt without an account", async () => {
    const owed = await application(60000);
    const back = landing(await pay(owed.id, 25000));
    const res = await app.inject({ method: "GET", url: `/api/payments/receipt/${back.searchParams.get("receipt")}?key=${back.searchParams.get("key")}` });
    assert.equal(res.statusCode, 200);
    assert.equal(Number(res.json().data.payment.amount), 25000);
  });

  test("that link does not open any other receipt", async () => {
    const one = landing(await pay((await application(60000)).id, 25000));
    const other = landing(await pay((await application(60000)).id, 25000));
    const res = await app.inject({ method: "GET", url: `/api/payments/receipt/${other.searchParams.get("receipt")}?key=${one.searchParams.get("key")}` });
    assert.equal(res.statusCode, 404);
  });

  const lookup = (reference: string, contact: string) =>
    app.inject({ method: "POST", url: "/api/payments/lookup", payload: { reference, contact }, remoteAddress: visitor() });

  test("a guest finds what they owe with their reference and the phone number they applied with", async () => {
    const owed = await application(60000);
    const res = await lookup(` ${owed.reference.toLowerCase()} `, "01711991035");
    assert.equal(res.statusCode, 200);
    const { application: found, token } = res.json().data;
    assert.deepEqual([found.reference, found.remaining], [owed.reference, 60000]);
    assert.equal((await start(owed.id, 60000, { authorization: `Bearer ${token}` })).statusCode, 200);
  });

  test("the email address they applied with works too", async () => {
    const owed = await application(60000);
    assert.equal((await lookup(owed.reference, "payer@example.test")).statusCode, 200);
  });

  test("a wrong phone number reveals nothing", async () => {
    const owed = await application(60000);
    assert.equal((await lookup(owed.reference, "01800000000")).statusCode, 404);
  });

  test("the lookup does not show who applied", async () => {
    const owed = await application(60000);
    const body = (await lookup(owed.reference, "01711991035")).body;
    assert.doesNotMatch(body, /Payment Tester|Payer@Example|1711-991035/i);
  });
});

describe("emails about a payment", () => {
  test("the team is told about the payment and the payer is sent their receipt", async () => {
    const owed = await application(60000);
    const back = landing(await pay(owed.id, 25000));
    const team = sent.find((mail) => mail.to === "accounts@example.test");
    const payer = sent.find((mail) => mail.to === "Payer@Example.Test");
    assert.ok(team && payer, "both emails should be sent");
    assert.match(team.subject, new RegExp(owed.reference));
    assert.match(team.text, /25,000/);
    assert.match(payer.text, /35,000/);
    assert.match(payer.text, new RegExp(`/receipt/${back.searchParams.get("receipt")}`));
  });

  test("a cancelled payment sends nothing", async () => {
    const owed = await application(60000);
    await start(owed.id, 25000);
    await comeBack(lastOrder().paymentId, "cancel");
    assert.equal(sent.length, 0);
  });
});

describe("payments recorded by staff", () => {
  const record = (payload: Record<string, unknown>) =>
    app.inject({ method: "POST", url: "/api/payments", headers: bearer(app, admin), payload });

  test("cash recorded by an admin counts toward the same balance", async () => {
    const owed = await application(60000);
    await record({ applicationId: owed.id, service: "Umrah package", totalDue: 60000, amount: 10000, method: "Cash" });
    await pay(owed.id, 20000);
    const state = await summary(owed.id);
    assert.deepEqual([state.paid, state.remaining], [30000, 30000]);
  });

  test("the first recorded payment sets the amount due when none was set", async () => {
    const open = await application(null);
    await record({ applicationId: open.id, service: "Consultation", totalDue: 30000, amount: 10000, method: "Cash" });
    const state = await summary(open.id);
    assert.deepEqual([state.amountDue, state.remaining], [30000, 20000]);
  });
});
