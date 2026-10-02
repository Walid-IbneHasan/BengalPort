// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

let app: Awaited<ReturnType<typeof buildApp>>;
let member: Awaited<ReturnType<typeof createUser>>;
let other: Awaited<ReturnType<typeof createUser>>;
const applications: string[] = [];
let caller = 0;
// Each request comes from its own address, so the rate limit never interferes.
const claim = (payload: Record<string, unknown>, user: typeof member | null = member) =>
  app.inject({ method: "POST", url: "/api/applications/claim", payload, headers: user ? bearer(app, user) : {}, remoteAddress: `10.9.0.${++caller}` });

async function guestApplication(overrides: Record<string, unknown> = {}) {
  const row = await prisma.application.create({
    data: { reference: `BP-${stamp()}`.toUpperCase(), type: "UMRAH", fullName: "Guest Applicant", email: "Guest.Applicant@example.test", phone: "+880 1711-000000", details: {}, ...overrides },
  });
  applications.push(row.id);
  return row;
}
const owner = async (id: string) => (await prisma.application.findUniqueOrThrow({ where: { id } })).userId;

before(async () => {
  app = await buildApp();
  member = await createUser("USER");
  other = await createUser("USER");
});
after(async () => {
  await prisma.payment.deleteMany({ where: { applicationId: { in: applications } } });
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await deleteUsers(member.id, other.id);
  await app.close();
  await prisma.$disconnect();
});

describe("adding an application made before signing up to an account", () => {
  test("the reference with the phone number it was made with links it to the member", async () => {
    const row = await guestApplication();
    const res = await claim({ reference: row.reference, contact: "01711000000" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.reference, row.reference);
    assert.equal(await owner(row.id), member.id);
  });

  test("the email it was made with works too, whatever the capitals", async () => {
    const row = await guestApplication();
    const res = await claim({ reference: row.reference.toLowerCase(), contact: "guest.applicant@EXAMPLE.test" });
    assert.equal(res.statusCode, 200);
    assert.equal(await owner(row.id), member.id);
  });

  test("it then shows among the member's applications", async () => {
    const row = await guestApplication();
    await claim({ reference: row.reference, contact: "01711000000" });
    const activity = (await app.inject({ method: "GET", url: "/api/auth/me/activity", headers: bearer(app, member) })).json().data;
    assert.ok(activity.applications.some((item: { id: string }) => item.id === row.id));
  });

  test("payments made on it as a guest come along", async () => {
    const row = await guestApplication();
    const payment = await prisma.payment.create({ data: { applicationId: row.id, service: "Umrah", amount: 500, totalDue: 500, method: "bKash", transactionId: `TEST-${stamp()}`, status: "PAID" } });
    await claim({ reference: row.reference, contact: "01711000000" });
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).userId, member.id);
  });

  test("a wrong phone number or email links nothing", async () => {
    const row = await guestApplication();
    for (const contact of ["01999999999", "someone.else@example.test"]) {
      const res = await claim({ reference: row.reference, contact });
      assert.equal(res.statusCode, 404, contact);
    }
    assert.equal(await owner(row.id), null);
  });

  test("an unknown reference gets the same answer as a wrong contact detail", async () => {
    const row = await guestApplication();
    const wrongContact = await claim({ reference: row.reference, contact: "01999999999" });
    const unknown = await claim({ reference: "BP-NOSUCHREF", contact: "01711000000" });
    assert.equal(unknown.statusCode, 404);
    assert.equal(unknown.json().message, wrongContact.json().message);
  });

  test("an application that belongs to another account stays with it", async () => {
    const row = await guestApplication({ userId: other.id });
    const res = await claim({ reference: row.reference, contact: "01711000000" });
    assert.equal(res.statusCode, 409);
    assert.equal(await owner(row.id), other.id);
  });

  test("adding an application that is already yours is fine", async () => {
    const row = await guestApplication({ userId: member.id });
    assert.equal((await claim({ reference: row.reference, contact: "01711000000" })).statusCode, 200);
    assert.equal(await owner(row.id), member.id);
  });

  test("a visitor who is not signed in cannot add an application", async () => {
    const row = await guestApplication();
    assert.equal((await claim({ reference: row.reference, contact: "01711000000" }, null)).statusCode, 401);
    assert.equal(await owner(row.id), null);
  });
});
