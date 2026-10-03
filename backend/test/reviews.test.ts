// Integration tests for customer reviews. They run against the database in
// backend/.env and remove every row they create.
import "dotenv/config";
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";
import type { Mail, Mailer } from "../src/lib/email.js";

process.env.LOG_LEVEL = "silent";
process.env.ADMIN_NOTIFY_EMAIL = "team@example.test";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

type Division = "BUSINESS" | "EDUCATION" | "HEALTHCARE" | "UMRAH";
type Account = Awaited<ReturnType<typeof createUser>>;

const sent: Mail[] = [];
const mailer: Mailer = { configured: true, async send(mail) { sent.push(mail); } };
let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Account, member: Account, stranger: Account;
const applications: string[] = [];
const added: string[] = [];

async function application(user: Account | null, type: Division = "EDUCATION") {
  const row = await prisma.application.create({
    data: { userId: user?.id ?? null, reference: `BP-${stamp()}`.toUpperCase(), type, fullName: "Review Tester", email: "reviewer@example.test", phone: "01711000000", details: {} },
  });
  applications.push(row.id);
  return row;
}
const payment = (applicationId: string, user: Account, status = "PAID", method = "bKash") =>
  prisma.payment.create({
    data: { applicationId, userId: user.id, service: "Service fee", amount: 5000, totalDue: 5000, method, transactionId: `TEST-${stamp()}`, status: status as "PAID", provider: "manual" },
  });
async function paidApplication(type: Division = "EDUCATION", user = member) {
  const row = await application(user, type);
  await payment(row.id, user);
  return row;
}
const words = { rating: 5, name: "Rahim U.", detail: "MBBS, Malaysia", body: "Clear guidance from the first call to the day I travelled." };
const write = (applicationId: string, payload: Record<string, unknown> = words, user: Account | null = member) =>
  app.inject({ method: "PUT", url: `/api/reviews/application/${applicationId}`, headers: user ? bearer(app, user) : {}, payload });
const published = async (division = "") =>
  (await app.inject({ method: "GET", url: `/api/reviews${division ? `?division=${division}` : ""}` })).json().data as any[];
const decide = (id: string, status: string, user = admin) =>
  app.inject({ method: "PATCH", url: `/api/admin/reviews/${id}`, headers: bearer(app, user), payload: { status } });
const waiting = async () =>
  (await app.inject({ method: "GET", url: "/api/admin/reviews", headers: bearer(app, admin) })).json().data as any[];
// A review written by the member and approved by the team.
async function approved(type: Division = "EDUCATION") {
  const row = await paidApplication(type);
  const id = (await write(row.id)).json().data.id as string;
  await decide(id, "APPROVED");
  return { id, application: row };
}

before(async () => {
  app = await buildApp({ mailer });
  admin = await createUser("ADMIN");
  member = await createUser("USER");
  stranger = await createUser("USER");
});
beforeEach(() => {
  sent.length = 0;
});
after(async () => {
  await prisma.review.deleteMany({ where: { OR: [{ applicationId: { in: applications } }, { id: { in: added } }] } });
  await prisma.refund.deleteMany({ where: { payment: { applicationId: { in: applications } } } });
  await prisma.payment.deleteMany({ where: { applicationId: { in: applications } } });
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await deleteUsers(admin.id, member.id, stranger.id);
  await app.close();
  await prisma.$disconnect();
});

describe("who can write a review", () => {
  test("a member who has paid for a service can review it", async () => {
    const row = await paidApplication();
    const res = await write(row.id);
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.status, "PENDING");
    assert.equal(res.json().data.division, "EDUCATION");
  });

  test("a payment the team recorded by hand counts, also when only part is paid", async () => {
    const row = await application(member, "UMRAH");
    await payment(row.id, member, "PARTIALLY_PAID", "Bank Transfer");
    assert.equal((await write(row.id)).statusCode, 201);
  });

  test("every service can be reviewed", async () => {
    for (const type of ["BUSINESS", "HEALTHCARE"] as const) {
      const row = await paidApplication(type);
      const res = await write(row.id);
      assert.equal(res.statusCode, 201, type);
      assert.equal(res.json().data.division, type);
    }
  });

  test("an application nobody has paid for cannot be reviewed", async () => {
    const row = await application(member);
    const res = await write(row.id);
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error.code, "NOT_PAID");
  });

  test("a payment that is waiting or has failed does not count", async () => {
    for (const status of ["PENDING", "FAILED", "DUE"]) {
      const row = await application(member);
      await payment(row.id, member, status);
      assert.equal((await write(row.id)).statusCode, 403, status);
    }
  });

  test("a payment that was refunded in full does not count", async () => {
    const row = await application(member);
    const paid = await payment(row.id, member);
    await prisma.refund.create({ data: { paymentId: paid.id, amount: 5000, reason: "Test refund", method: "bKash", status: "COMPLETED", recordedBy: "test" } });
    assert.equal((await write(row.id)).statusCode, 403);
  });

  test("nobody can review an application that is not theirs", async () => {
    const row = await paidApplication();
    const res = await write(row.id, words, stranger);
    assert.equal(res.statusCode, 404);
    assert.equal(res.json().message, "Application not found");
  });

  test("a visitor who is not signed in cannot write a review", async () => {
    const row = await paidApplication();
    assert.equal((await write(row.id, words, null)).statusCode, 401);
  });
});

describe("what a review must contain", () => {
  test("a rating from 1 to 5", async () => {
    const row = await paidApplication();
    for (const rating of [0, 6, 4.5, "5", undefined])
      assert.equal((await write(row.id, { ...words, rating })).statusCode, 400, String(rating));
  });

  test("the customer's own words and a name to show", async () => {
    const row = await paidApplication();
    assert.equal((await write(row.id, { ...words, body: "Good" })).statusCode, 400);
    assert.equal((await write(row.id, { ...words, name: " " })).statusCode, 400);
  });

  test("the line about the service is optional", async () => {
    const row = await paidApplication();
    const res = await write(row.id, { rating: 4, name: "Rahim U.", body: "Helpful and patient with every question." });
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.detail, null);
  });
});

describe("changing a review", () => {
  test("a member can change their review while it waits for approval", async () => {
    const row = await paidApplication();
    const first = await write(row.id);
    const second = await write(row.id, { ...words, rating: 4, body: "Changed my mind about one thing, still very good." });
    assert.equal(second.statusCode, 200);
    assert.equal(second.json().data.id, first.json().data.id);
    assert.equal(second.json().data.rating, 4);
    assert.equal(await prisma.review.count({ where: { applicationId: row.id } }), 1);
  });

  test("once the team has approved or hidden it, the member cannot change it", async () => {
    const { application: row, id } = await approved();
    const res = await write(row.id, { ...words, body: "Trying to change it after approval." });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error.code, "REVIEW_LOCKED");
    await decide(id, "HIDDEN");
    assert.equal((await write(row.id)).statusCode, 409);
  });
});

describe("a member's own reviews", () => {
  test("lists the applications they can review, with the review once written", async () => {
    const mine = await createUser("USER");
    try {
      const unpaid = await application(mine);
      const paid = await paidApplication("HEALTHCARE", mine);
      const list = () => app.inject({ method: "GET", url: "/api/reviews/mine", headers: bearer(app, mine) });
      const before = (await list()).json().data;
      assert.deepEqual(before.map((x: any) => x.applicationId), [paid.id]);
      assert.equal(before[0].reference, paid.reference);
      assert.equal(before[0].division, "HEALTHCARE");
      assert.equal(before[0].review, null);
      await write(paid.id, words, mine);
      const after = (await list()).json().data;
      assert.equal(after[0].review.status, "PENDING");
      assert.equal(after[0].review.body, words.body);
      assert.ok(!after.some((x: any) => x.applicationId === unpaid.id));
    } finally {
      await prisma.review.deleteMany({ where: { userId: mine.id } });
      await prisma.payment.deleteMany({ where: { userId: mine.id } });
      await prisma.application.deleteMany({ where: { userId: mine.id } });
      await deleteUsers(mine.id);
    }
  });

  test("needs a signed-in member", async () => {
    assert.equal((await app.inject({ method: "GET", url: "/api/reviews/mine" })).statusCode, 401);
  });
});

describe("what visitors see", () => {
  test("a review is not shown until the team approves it", async () => {
    const row = await paidApplication();
    const id = (await write(row.id)).json().data.id;
    assert.ok(!(await published()).some((x) => x.id === id));
    assert.equal((await decide(id, "APPROVED")).statusCode, 200);
    assert.ok((await published()).some((x) => x.id === id));
  });

  test("each service's page gets its own reviews", async () => {
    const { id } = await approved("BUSINESS");
    assert.ok((await published("business")).some((x) => x.id === id));
    assert.ok(!(await published("education")).some((x) => x.id === id));
  });

  test("hiding a review takes it off the website", async () => {
    const { id } = await approved();
    await decide(id, "HIDDEN");
    assert.ok(!(await published()).some((x) => x.id === id));
  });

  test("only the words, the rating and the name to show are given out", async () => {
    const { id } = await approved();
    const shown = (await published("education")).find((x) => x.id === id);
    assert.deepEqual(Object.keys(shown).sort(), ["body", "createdAt", "detail", "division", "id", "name", "rating"]);
  });

  test("an unknown service is refused", async () => {
    assert.equal((await app.inject({ method: "GET", url: "/api/reviews?division=shipping" })).statusCode, 400);
  });
});

describe("the team's side", () => {
  test("the team is told by email when a review arrives, once", async () => {
    const row = await paidApplication();
    await write(row.id);
    await write(row.id, { ...words, rating: 4 });
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.equal(sent.length, 1);
    assert.equal(sent[0].to, "team@example.test");
    assert.match(sent[0].text, /\/admin\/reviews/);
    assert.match(sent[0].text, new RegExp(row.reference));
  });

  test("the admin's list shows who wrote each review and for which application", async () => {
    const row = await paidApplication();
    const id = (await write(row.id)).json().data.id;
    const listed = (await waiting()).find((x) => x.id === id);
    assert.equal(listed.status, "PENDING");
    assert.equal(listed.application.reference, row.reference);
    assert.equal(listed.user.email, member.email);
  });

  test("an admin can add a review received outside the website, already approved", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/reviews",
      headers: bearer(app, admin),
      payload: { division: "UMRAH", rating: 5, name: "A pilgrim", detail: "Umrah, family of four", body: "Everything was arranged with care from start to finish." },
    });
    assert.equal(res.statusCode, 201);
    added.push(res.json().data.id);
    assert.equal(res.json().data.status, "APPROVED");
    assert.ok((await published("umrah")).some((x) => x.id === res.json().data.id));
  });

  test("an admin can delete a review", async () => {
    const { id } = await approved();
    const res = await app.inject({ method: "DELETE", url: `/api/admin/reviews/${id}`, headers: bearer(app, admin) });
    assert.equal(res.statusCode, 204);
    assert.equal(await prisma.review.count({ where: { id } }), 0);
  });

  test("a member cannot approve, add or list reviews", async () => {
    const row = await paidApplication();
    const id = (await write(row.id)).json().data.id;
    assert.equal((await decide(id, "APPROVED", member)).statusCode, 403);
    assert.equal((await app.inject({ method: "GET", url: "/api/admin/reviews", headers: bearer(app, member) })).statusCode, 403);
    assert.equal((await app.inject({ method: "POST", url: "/api/admin/reviews", headers: bearer(app, member), payload: { division: "UMRAH", ...words } })).statusCode, 403);
  });

  test("a status that does not exist is refused", async () => {
    const { id } = await approved();
    assert.equal((await decide(id, "FEATURED")).statusCode, 400);
  });
});
