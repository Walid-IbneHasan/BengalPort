// Integration tests: whoever has paid for a service may review it, whether
// they paid online or in cash at the office. Every row created here is
// removed afterwards.
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
let income: { id: string };
let costs: { id: string };
const people: string[] = [];
const applications: string[] = [];

const as = (who: { id: string; role: string; tokenVersion: number }) => bearer(app, who);
const review = { rating: 5, name: "Rahim", body: "Good" };
async function person() {
  const user = await createUser("USER");
  people.push(user.id);
  return user;
}
async function cash(userId: string, overrides: Record<string, unknown> = {}) {
  const res = await app.inject({
    method: "POST",
    url: "/api/admin/accounts",
    headers: as(admin),
    payload: { type: "INCOME", date: "2026-11-12", description: `${tag} paid at the office`, total: 3000, categoryId: income.id, userId, ...overrides },
  });
  assert.equal(res.statusCode, 201, res.body);
  return res.json().data;
}
const mine = async (user: { id: string; role: string; tokenVersion: number }) =>
  (await app.inject({ method: "GET", url: "/api/reviews/mine", headers: as(user) })).json().data as any[];

before(async () => {
  app = await buildApp();
  admin = await createUser("ADMIN");
  income = await prisma.financialCategory.create({ data: { name: `${tag} Office income`, type: "INCOME" } });
  costs = await prisma.financialCategory.create({ data: { name: `${tag} Office costs`, type: "EXPENSE" } });
});

after(async () => {
  await prisma.review.deleteMany({ where: { userId: { in: people } } });
  const payments = await prisma.payment.findMany({ where: { applicationId: { in: applications } }, select: { id: true } });
  await prisma.financialTransaction.deleteMany({ where: { OR: [{ userId: { in: people } }, { paymentId: { in: payments.map((p) => p.id) } }] } });
  await prisma.receipt.deleteMany({ where: { paymentId: { in: payments.map((p) => p.id) } } });
  await prisma.payment.deleteMany({ where: { applicationId: { in: applications } } });
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await prisma.financialCategory.deleteMany({ where: { id: { in: [income.id, costs.id] } } });
  await deleteUsers(admin.id, ...people);
  await app.close();
  await prisma.$disconnect();
});

describe("cash paid for an application", () => {
  test("lets the member review that application", async () => {
    const member = await person();
    const application = await prisma.application.create({
      data: { reference: `BP-${stamp()}`.toUpperCase(), type: "HEALTHCARE", fullName: "Cash Payer", email: member.email, phone: "01711000002", details: {}, amountDue: 9000, userId: member.id },
    });
    applications.push(application.id);
    assert.equal((await mine(member)).length, 0);
    await cash(member.id, { applicationId: application.id });
    assert.deepEqual((await mine(member)).map((item) => item.applicationId), [application.id]);
    const res = await app.inject({ method: "PUT", url: `/api/reviews/application/${application.id}`, headers: as(member), payload: review });
    assert.equal(res.statusCode, 201, res.body);
  });
});

describe("cash paid without an application", () => {
  test("lets the member review the service they choose", async () => {
    const member = await person();
    await cash(member.id);
    const general = (await mine(member)).find((item) => item.general);
    assert.ok(general, "no general review offered");
    assert.equal(general.review, null);
    const res = await app.inject({ method: "PUT", url: "/api/reviews/general/education", headers: as(member), payload: review });
    assert.equal(res.statusCode, 201, res.body);
    assert.equal(res.json().data.division, "EDUCATION");
    assert.equal(res.json().data.status, "PENDING");
    const written = (await mine(member)).find((item) => item.general && item.division === "EDUCATION");
    assert.equal(written?.review?.body, "Good");
  });

  test("writing again for the same service changes the review, never adds a second", async () => {
    const member = await person();
    await cash(member.id);
    await app.inject({ method: "PUT", url: "/api/reviews/general/UMRAH", headers: as(member), payload: review });
    const again = await app.inject({ method: "PUT", url: "/api/reviews/general/UMRAH", headers: as(member), payload: { ...review, body: "Very good" } });
    assert.equal(again.statusCode, 200, again.body);
    assert.equal(await prisma.review.count({ where: { userId: member.id, division: "UMRAH" } }), 1);
  });

  test("an expense entered under someone does not count as their payment", async () => {
    const member = await person();
    await cash(member.id, { type: "EXPENSE", categoryId: costs.id });
    assert.equal((await mine(member)).some((item) => item.general), false);
    const res = await app.inject({ method: "PUT", url: "/api/reviews/general/education", headers: as(member), payload: review });
    assert.equal(res.statusCode, 403);
    assert.match(res.json().error.message, /payment/i);
  });

  test("a member who has paid nothing cannot review", async () => {
    const member = await person();
    const res = await app.inject({ method: "PUT", url: "/api/reviews/general/healthcare", headers: as(member), payload: review });
    assert.equal(res.statusCode, 403);
  });

  test("an unknown service is refused", async () => {
    const member = await person();
    await cash(member.id);
    const res = await app.inject({ method: "PUT", url: "/api/reviews/general/shopping", headers: as(member), payload: review });
    assert.equal(res.statusCode, 400);
  });
});
