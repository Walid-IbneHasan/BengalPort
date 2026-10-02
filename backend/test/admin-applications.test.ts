// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers, pdfBytes, stamp } = await import("./helpers.js");

let app: Awaited<ReturnType<typeof buildApp>>;
const users = {} as Record<"ADMIN" | "USER", Awaited<ReturnType<typeof createUser>>>;
const applications: string[] = [];
const call = (method: "GET" | "PUT" | "DELETE", id: string, payload?: Record<string, unknown>, role: "ADMIN" | "USER" = "ADMIN") =>
  app.inject({ method, url: `/api/admin/resources/applications/${id}`, payload, headers: bearer(app, users[role]) });

const answers = { fullName: "Edit Tester", email: "edit@example.test", phone: "01711000000", preferredCountry: "Malaysia", intendedProgram: "MBBS" };
async function application(overrides: Record<string, unknown> = {}) {
  const row = await prisma.application.create({
    data: { reference: `BP-${stamp()}`.toUpperCase(), type: "EDUCATION", status: "IN_REVIEW", amountDue: 4000, fullName: answers.fullName, email: answers.email, phone: answers.phone, details: answers, ...overrides },
  });
  applications.push(row.id);
  return row;
}
const payment = (applicationId: string, status: "PAID" | "FAILED" | "PENDING") =>
  prisma.payment.create({ data: { applicationId, service: "Education", amount: 500, totalDue: 4000, method: "bKash", transactionId: `TEST-${stamp()}`, status } });

before(async () => {
  app = await buildApp();
  users.ADMIN = await createUser("ADMIN");
  users.USER = await createUser("USER");
});
after(async () => {
  await prisma.payment.deleteMany({ where: { applicationId: { in: applications } } });
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await deleteUsers(users.ADMIN.id, users.USER.id);
  await app.close();
  await prisma.$disconnect();
});

describe("correcting an application", () => {
  test("staff can correct the applicant's contact details and answers", async () => {
    const row = await application();
    const response = await call("PUT", row.id, { fullName: "Edited Tester", email: "edited@example.test", phone: "01811000000", details: { ...answers, preferredCountry: "Türkiye" } });
    assert.equal(response.statusCode, 200);
    const saved = await prisma.application.findUniqueOrThrow({ where: { id: row.id } });
    assert.equal(saved.fullName, "Edited Tester");
    assert.equal(saved.email, "edited@example.test");
    assert.equal(saved.phone, "01811000000");
    assert.equal((saved.details as Record<string, unknown>).preferredCountry, "Türkiye");
  });

  test("the contact details inside the answers follow the corrected ones", async () => {
    const row = await application();
    await call("PUT", row.id, { fullName: "Edited Tester", email: "edited@example.test", phone: "01811000000", details: answers });
    const { details } = await prisma.application.findUniqueOrThrow({ where: { id: row.id } });
    assert.deepEqual(
      { fullName: (details as any).fullName, email: (details as any).email, phone: (details as any).phone },
      { fullName: "Edited Tester", email: "edited@example.test", phone: "01811000000" },
    );
  });

  test("the reference, division, status and amount due cannot be changed this way", async () => {
    const row = await application();
    await call("PUT", row.id, { ...answers, details: answers, reference: "BP-HACKED", type: "UMRAH", status: "APPROVED", amountDue: 1 });
    const saved = await prisma.application.findUniqueOrThrow({ where: { id: row.id } });
    assert.deepEqual(
      { reference: saved.reference, type: saved.type, status: saved.status, amountDue: Number(saved.amountDue) },
      { reference: row.reference, type: "EDUCATION", status: "IN_REVIEW", amountDue: 4000 },
    );
  });

  test("an application staff are still completing may have unanswered questions", async () => {
    const row = await application();
    const response = await call("PUT", row.id, { fullName: answers.fullName, email: answers.email, phone: answers.phone, details: { fullName: answers.fullName } });
    assert.equal(response.statusCode, 200);
  });

  test("a name, a valid email and a phone number are still required", async () => {
    const row = await application();
    for (const broken of [{ fullName: "" }, { email: "not-an-email" }, { phone: "12" }]) {
      const response = await call("PUT", row.id, { fullName: answers.fullName, email: answers.email, phone: answers.phone, details: answers, ...broken });
      assert.equal(response.statusCode, 400, JSON.stringify(broken));
    }
    assert.equal((await prisma.application.findUniqueOrThrow({ where: { id: row.id } })).email, answers.email);
  });

  test("an unknown application answers 404", async () => {
    const response = await call("PUT", "missing", { fullName: answers.fullName, email: answers.email, phone: answers.phone, details: answers });
    assert.equal(response.statusCode, 404);
  });

  test("a member cannot correct applications", async () => {
    const row = await application();
    const response = await call("PUT", row.id, { fullName: "Edited Tester", email: answers.email, phone: answers.phone, details: answers }, "USER");
    assert.equal(response.statusCode, 403);
  });
});

describe("deleting an application", () => {
  test("an application is removed together with its documents", async () => {
    const row = await application();
    await prisma.applicationDocument.create({ data: { applicationId: row.id, name: "passport.pdf", mimeType: "application/pdf", byteSize: 600, data: pdfBytes() } });
    const response = await call("DELETE", row.id);
    assert.equal(response.statusCode, 204);
    assert.equal(await prisma.application.count({ where: { id: row.id } }), 0);
    assert.equal(await prisma.applicationDocument.count({ where: { applicationId: row.id } }), 0);
  });

  test("payment attempts that never went through are removed with it", async () => {
    const row = await application();
    await payment(row.id, "FAILED");
    const response = await call("DELETE", row.id);
    assert.equal(response.statusCode, 204);
    assert.equal(await prisma.payment.count({ where: { applicationId: row.id } }), 0);
  });

  test("an application money was received for is kept for the accounts", async () => {
    const row = await application();
    await payment(row.id, "PAID");
    const response = await call("DELETE", row.id);
    assert.equal(response.statusCode, 409);
    assert.match(response.json().error.message, /payment/i);
    assert.equal(await prisma.application.count({ where: { id: row.id } }), 1);
  });

  test("an application with a payment still in progress is kept", async () => {
    const row = await application();
    await payment(row.id, "PENDING");
    assert.equal((await call("DELETE", row.id)).statusCode, 409);
    assert.equal(await prisma.application.count({ where: { id: row.id } }), 1);
  });

  test("an unknown application answers 404", async () => {
    assert.equal((await call("DELETE", "missing")).statusCode, 404);
  });

  test("a member cannot delete applications", async () => {
    const row = await application();
    assert.equal((await call("DELETE", row.id, undefined, "USER")).statusCode, 403);
    assert.equal(await prisma.application.count({ where: { id: row.id } }), 1);
  });
});

describe("what the settings page says about the system", () => {
  const status = async (role: "ADMIN" | "USER" = "ADMIN") =>
    app.inject({ method: "GET", url: "/api/admin/status", headers: bearer(app, users[role]) });

  test("it reports the database, email, online payment and the team inbox", async () => {
    const before = process.env.ADMIN_NOTIFY_EMAIL;
    process.env.ADMIN_NOTIFY_EMAIL = "team@example.test";
    try {
      const { data } = (await status()).json();
      assert.equal(data.database, true);
      assert.equal(data.email, app.mailer.configured);
      assert.equal(data.onlinePayment, app.gateway.configured);
      assert.equal(data.teamInbox, true);
      assert.equal(data.formProtection, app.spamCheck.siteKey !== null);
    } finally {
      process.env.ADMIN_NOTIFY_EMAIL = before ?? "";
    }
  });

  test("no team inbox is reported when none is set", async () => {
    const before = process.env.ADMIN_NOTIFY_EMAIL;
    process.env.ADMIN_NOTIFY_EMAIL = "";
    try {
      assert.equal((await status()).json().data.teamInbox, false);
    } finally {
      process.env.ADMIN_NOTIFY_EMAIL = before ?? "";
    }
  });

  test("a member cannot read it", async () => {
    assert.equal((await status("USER")).statusCode, 403);
  });
});
