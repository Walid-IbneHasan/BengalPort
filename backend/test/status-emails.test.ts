// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Mail, Mailer } from "../src/lib/email.js";
import type { Gateway } from "../src/lib/bkash.js";

process.env.LOG_LEVEL = "silent";
process.env.ADMIN_NOTIFY_EMAIL = "";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

const sent: Mail[] = [];
const mailer: Mailer = { configured: true, async send(mail) { sent.push(mail); } };
const unused = async (): Promise<never> => { throw new Error("The gateway is not used here"); };
const gateway: Gateway = { configured: true, createPayment: unused, executePayment: unused, queryPayment: unused, refundPayment: unused, refundStatus: unused };
let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
const applications: string[] = [];
const enquiries: string[] = [];

async function application(status: "SUBMITTED" | "IN_REVIEW" = "SUBMITTED", userId: string | null = null) {
  const row = await prisma.application.create({
    data: { userId, reference: `BP-${stamp()}`.toUpperCase(), type: "EDUCATION", status, fullName: "Status Tester", email: "applicant@example.test", phone: "01711000000", details: {} },
  });
  applications.push(row.id);
  return row;
}
const change = (resource: "applications" | "enquiries", id: string, payload: Record<string, unknown>) =>
  app.inject({ method: "PATCH", url: `/api/admin/resources/${resource}/${id}`, headers: bearer(app, admin), payload });

before(async () => {
  app = await buildApp({ mailer, gateway });
  admin = await createUser("ADMIN");
});
beforeEach(() => {
  sent.length = 0;
});
after(async () => {
  await prisma.payment.deleteMany({ where: { applicationId: { in: applications } } });
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await prisma.enquiry.deleteMany({ where: { id: { in: enquiries } } });
  await deleteUsers(admin.id);
  await app.close();
  await prisma.$disconnect();
});

describe("telling an applicant how their application is going", () => {
  test("starting the review emails the applicant with their reference", async () => {
    const row = await application();
    await change("applications", row.id, { status: "IN_REVIEW" });
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "applicant@example.test");
    assert.match(sent[0].subject, new RegExp(row.reference));
    assert.match(sent[0].text, /review/i);
  });

  test("an approval is announced as approved", async () => {
    const row = await application("IN_REVIEW");
    await change("applications", row.id, { status: "APPROVED" });
    assert.match(sent[0].subject, /approved/i);
  });

  test("a rejection is worded gently and invites the applicant to get in touch", async () => {
    const row = await application("IN_REVIEW");
    await change("applications", row.id, { status: "REJECTED" });
    assert.doesNotMatch(sent[0].subject + sent[0].text, /rejected/i);
    assert.match(sent[0].text, /unable to proceed/i);
    assert.match(sent[0].text, /contact/i);
  });

  test("a cancellation is confirmed to the applicant", async () => {
    const row = await application();
    await change("applications", row.id, { status: "CANCELLED" });
    assert.match(sent[0].subject, /cancelled/i);
  });

  test("a member is pointed at their account, a guest is not", async () => {
    const guest = await application();
    await change("applications", guest.id, { status: "IN_REVIEW" });
    assert.doesNotMatch(sent[0].text, /dashboard/);
    sent.length = 0;
    const member = await application("SUBMITTED", admin.id);
    await change("applications", member.id, { status: "IN_REVIEW" });
    assert.match(sent[0].text, /dashboard/);
  });

  test("saving the status it already has sends nothing", async () => {
    const row = await application("IN_REVIEW");
    await change("applications", row.id, { status: "IN_REVIEW" });
    assert.equal(sent.length, 0);
  });

  test("moving an application back to received sends nothing", async () => {
    const row = await application("IN_REVIEW");
    await change("applications", row.id, { status: "SUBMITTED" });
    assert.equal(sent.length, 0);
  });

  test("an enquiry's status is for staff only and sends nothing", async () => {
    const enquiry = await prisma.enquiry.create({ data: { type: "GENERAL", name: "Status Tester", phone: "01711000000", email: "applicant@example.test", message: "A question" } });
    enquiries.push(enquiry.id);
    await change("enquiries", enquiry.id, { status: "IN_REVIEW" });
    assert.equal(sent.length, 0);
  });
});

describe("telling an applicant what their application costs", () => {
  test("setting the amount due emails the amount and where to pay", async () => {
    const row = await application();
    await change("applications", row.id, { amountDue: 185000 });
    assert.equal(sent.length, 1);
    assert.match(sent[0].text, /185,000/);
    assert.match(sent[0].text, new RegExp(`/pay\\?ref=${row.reference}`));
  });

  test("without online payment the email promises a call instead of a link", async () => {
    const row = await application();
    gateway.configured = false;
    try { await change("applications", row.id, { amountDue: 185000 }); }
    finally { gateway.configured = true; }
    assert.match(sent[0].text, /185,000/);
    assert.doesNotMatch(sent[0].text, /\/pay/);
  });

  test("an amount that is already covered by payments sends nothing", async () => {
    const row = await application();
    await prisma.payment.create({ data: { applicationId: row.id, service: "Education", amount: 500, totalDue: 500, method: "CASH", transactionId: `TEST-${stamp()}`, status: "PAID" } });
    await change("applications", row.id, { amountDue: 500 });
    assert.equal(sent.length, 0);
  });

  test("saving the same amount again sends nothing", async () => {
    const row = await application();
    await change("applications", row.id, { amountDue: 185000 });
    sent.length = 0;
    await change("applications", row.id, { amountDue: 185000 });
    assert.equal(sent.length, 0);
  });

  test("clearing the amount sends nothing", async () => {
    const row = await application();
    await change("applications", row.id, { amountDue: 185000 });
    sent.length = 0;
    await change("applications", row.id, { amountDue: null });
    assert.equal(sent.length, 0);
  });
});
