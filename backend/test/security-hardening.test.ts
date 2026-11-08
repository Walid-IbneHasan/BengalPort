// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";

process.env.LOG_LEVEL = "silent";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-client.apps.googleusercontent.com";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { secretProblem } = await import("../src/plugins/auth.js");
const { requestForLog } = await import("../src/lib/errors.js");
const { MAX_APPLICATION_BYTES } = await import("../src/lib/documents.js");
const { bearer, createUser, deleteUsers, fileUpload, pdfBytes, stamp } = await import("./helpers.js");

type Mail = { to: string; subject: string; text: string; html: string };
const sent: Mail[] = [];
const mailer = { configured: true, async send(mail: Mail) { sent.push(mail); } };

let app: Awaited<ReturnType<typeof buildApp>>;
let behindProxy: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;
const users: string[] = [];
const applications: string[] = [];

let visitors = 0;
const visitor = () => `10.2.${Math.floor(++visitors / 250)}.${(visitors % 250) + 1}`;
const post = (url: string, payload: Record<string, unknown>) => app.inject({ method: "POST", url, payload, remoteAddress: visitor() });
const lastCode = () => sent.at(-1)!.text.match(/\b(\d{6})\b/)![1];

const newApplication = async () => {
  const row = await prisma.application.create({
    data: { reference: `BP-${stamp()}`.toUpperCase(), type: "EDUCATION", fullName: "Hardening Test", email: "hardening@example.test", phone: "01711000000", details: {} },
  });
  applications.push(row.id);
  return row;
};

before(async () => {
  app = await buildApp({ mailer: mailer as any });
  const trust = process.env.TRUST_PROXY;
  process.env.TRUST_PROXY = "true";
  behindProxy = await buildApp({ mailer: mailer as any });
  if (trust === undefined) delete process.env.TRUST_PROXY;
  else process.env.TRUST_PROXY = trust;
  admin = await createUser("ADMIN");
  member = await createUser("USER");
});

after(async () => {
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await deleteUsers(admin.id, member.id, ...users);
  await app.close();
  await behindProxy.close();
});

describe("rate limits behind a proxy", () => {
  const attempt = (forwardedFor: string, remoteAddress: string) =>
    behindProxy.inject({ method: "POST", url: "/api/enquiries", payload: {}, remoteAddress, headers: { "x-forwarded-for": forwardedFor } });

  test("a visitor cannot dodge a limit by inventing forwarding addresses", async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await attempt(`203.0.113.${i + 1}`, "198.51.100.7")).statusCode;
    assert.equal(last, 429);
  });

  test("the address given by a proxy on this machine is honoured", async () => {
    let last = 0;
    for (let i = 0; i < 12; i++) last = (await attempt(`192.0.2.${i + 1}`, "127.0.0.1")).statusCode;
    assert.equal(last, 400);
  });
});

describe("the limit on sign-in attempts", () => {
  test("repeated password guesses from one address are stopped", async () => {
    let last = 0;
    for (let i = 0; i < 25; i++) last = (await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "nobody@example.test", password: "x" }, remoteAddress: "198.51.100.20" })).statusCode;
    assert.equal(last, 429);
  });

  test("a signed-in member's ordinary page loads are not counted", async () => {
    let last = 0;
    for (let i = 0; i < 25; i++) last = (await app.inject({ method: "GET", url: "/api/auth/me", headers: bearer(app, member), remoteAddress: "198.51.100.21" })).statusCode;
    assert.equal(last, 200);
  });
});

describe("special-purpose keys", () => {
  test("a backup download key cannot be used as an admin session", async () => {
    const key = app.jwt.sign({ sub: admin.id, purpose: "backup", v: admin.tokenVersion });
    const res = await app.inject({ method: "GET", url: "/api/admin/dashboard", headers: { authorization: `Bearer ${key}` } });
    assert.equal(res.statusCode, 401);
  });
});

describe("sign-in codes", () => {
  const account = async () => {
    const user = await createUser("USER");
    users.push(user.id);
    return user;
  };

  test("guesses made at the same moment are all counted", async () => {
    const user = await account();
    const { challengeId } = (await post("/api/auth/forgot-password", { email: user.email })).json().data;
    await Promise.all(Array.from({ length: 15 }, () => post("/api/auth/reset-password", { challengeId, code: "000000", password: "Another-Pass1" })));
    const row = await prisma.authCode.findUniqueOrThrow({ where: { id: challengeId } });
    assert.ok(row.attempts <= 5, `${row.attempts} guesses were tried`);
  });

  test("the right code is refused after five wrong guesses", async () => {
    const user = await account();
    const { challengeId } = (await post("/api/auth/forgot-password", { email: user.email })).json().data;
    const code = lastCode();
    for (let i = 0; i < 5; i++) await post("/api/auth/reset-password", { challengeId, code: code === "000000" ? "000001" : "000000", password: "Another-Pass1" });
    assert.equal((await post("/api/auth/reset-password", { challengeId, code, password: "Another-Pass1" })).statusCode, 401);
  });

  test("a code works once", async () => {
    const user = await account();
    const { challengeId } = (await post("/api/auth/forgot-password", { email: user.email })).json().data;
    const code = lastCode();
    assert.equal((await post("/api/auth/reset-password", { challengeId, code, password: "Another-Pass1" })).statusCode, 200);
    assert.equal((await post("/api/auth/reset-password", { challengeId, code, password: "Third-Pass22" })).statusCode, 401);
  });

  test("an inbox cannot be flooded with codes", async () => {
    const user = await account();
    const before = sent.filter((mail) => mail.to === user.email).length;
    for (let i = 0; i < 8; i++) assert.equal((await post("/api/auth/forgot-password", { email: user.email })).statusCode, 200);
    assert.equal(sent.filter((mail) => mail.to === user.email).length - before, 5);
  });

  test("asking for a reset looks the same whether or not the account exists", async () => {
    const user = await account();
    const known = (await post("/api/auth/forgot-password", { email: user.email })).json().data;
    const unknown = (await post("/api/auth/forgot-password", { email: `nobody-${stamp()}@example.test` })).json().data;
    assert.deepEqual(Object.keys(unknown).sort(), Object.keys(known).sort());
    assert.equal(unknown.delivered, known.delivered);
    assert.equal(unknown.challengeId.length, known.challengeId.length);
  });

  test("asking for a new verification code looks the same either way", async () => {
    const user = await prisma.user.create({ data: { name: "Unverified", email: `${stamp()}-unverified@example.test`, passwordHash: "x" } });
    users.push(user.id);
    const known = (await post("/api/auth/resend-verification", { email: user.email })).json().data;
    const unknown = (await post("/api/auth/resend-verification", { email: `nobody-${stamp()}@example.test` })).json().data;
    assert.deepEqual(Object.keys(unknown).sort(), Object.keys(known).sort());
  });

  test("a code email does not repeat a name a stranger typed", async () => {
    const email = `${stamp()}-named@example.test`;
    await post("/api/auth/register", { name: "Visit evil dot example now", email, password: "Member-Pass1" });
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    users.push(user.id);
    const mail = sent.filter((item) => item.to === email).at(-1)!;
    assert.doesNotMatch(mail.text + mail.html, /evil dot example/);
  });

  test("a mail server refusing does not crash the request", async () => {
    const broken = await buildApp({ mailer: { configured: true, async send() { throw new Error("535 bad credentials at smtp"); } } as any });
    const user = await account();
    const res = await broken.inject({ method: "POST", url: "/api/auth/forgot-password", payload: { email: user.email }, remoteAddress: visitor() });
    assert.equal(res.statusCode, 503);
    assert.doesNotMatch(res.body, /535|smtp/i);
    await broken.close();
  });
});

describe("signing in with Google", () => {
  const google = (email: string) =>
    mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({ getPayload: () => ({ sub: `google-${stamp()}`, email, email_verified: true, name: "Victim" }) }) as any);
  const signIn = () => post("/api/auth/google", { credential: "x".repeat(40) });

  test("a credential that is not one is refused", async () => {
    assert.equal((await signIn()).statusCode, 401);
  });

  test("a password set by someone who never proved the email is removed", async () => {
    const email = `${stamp()}-squatted@example.test`;
    const squatter = await prisma.user.create({ data: { name: "Squatter", email, passwordHash: await bcrypt.hash("Squatter-Pass1", 4) } });
    users.push(squatter.id);
    const replaced = google(email);
    assert.equal((await signIn()).statusCode, 200);
    replaced.mock.restore();
    const after = await prisma.user.findUniqueOrThrow({ where: { id: squatter.id } });
    assert.equal(after.passwordHash, null);
    assert.equal(after.tokenVersion, squatter.tokenVersion + 1);
  });

  test("the password of an account that proved its email stays", async () => {
    const user = await createUser("USER");
    users.push(user.id);
    const replaced = google(user.email);
    assert.equal((await signIn()).statusCode, 200);
    replaced.mock.restore();
    assert.ok((await prisma.user.findUniqueOrThrow({ where: { id: user.id } })).passwordHash);
  });
});

describe("how much can be submitted", () => {
  const enquiry = (overrides: Record<string, unknown>) => post("/api/enquiries", { type: "GENERAL", name: "Karim", phone: "01711000000", message: "A long enough message", ...overrides });

  test("an oversized name is refused", async () => {
    assert.equal((await enquiry({ name: "x".repeat(121) })).statusCode, 400);
  });

  test("an oversized phone number is refused", async () => {
    assert.equal((await enquiry({ phone: "1".repeat(31) })).statusCode, 400);
  });

  test("an oversized message is refused", async () => {
    assert.equal((await enquiry({ message: "x".repeat(5001) })).statusCode, 400);
  });

  test("oversized extra details are refused", async () => {
    assert.equal((await enquiry({ details: { subject: "x".repeat(5000) } })).statusCode, 400);
  });

  test("an application cannot carry a huge set of answers", async () => {
    const res = await post("/api/applications", { type: "UMRAH", fullName: "Karim", email: "k@example.test", phone: "01711000000", details: { padding: "x".repeat(120_000) } });
    assert.equal(res.statusCode, 400);
  });

  test("a body far larger than any form is turned away", async () => {
    const res = await post("/api/enquiries", { type: "GENERAL", name: "Karim", phone: "01711000000", message: "x".repeat(400_000) });
    assert.equal(res.statusCode, 413);
  });

  test("an application's documents have a total size limit", async () => {
    const application = await newApplication();
    await prisma.applicationDocument.create({ data: { applicationId: application.id, name: "big.pdf", mimeType: "application/pdf", byteSize: MAX_APPLICATION_BYTES, data: new Uint8Array(pdfBytes()) } });
    const { headers, payload } = fileUpload("more.pdf", "application/pdf", pdfBytes());
    const res = await app.inject({ method: "POST", url: `/api/applications/${application.id}/documents`, headers: { ...headers, ...bearer(app, admin) }, payload });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.message, /total/i);
  });
});

describe("what comes back", () => {
  test("a receipt does not include the gateway's internal fields", async () => {
    const application = await newApplication();
    await prisma.application.update({ where: { id: application.id }, data: { userId: member.id } });
    const created = await app.inject({ method: "POST", url: "/api/payments", headers: bearer(app, admin), payload: { applicationId: application.id, service: "Education", amount: 100, totalDue: 500, method: "Cash" } });
    assert.equal(created.statusCode, 201, created.body);
    const number = created.json().data.receipt.receiptNumber;
    const receipt = await app.inject({ method: "GET", url: `/api/payments/receipt/${number}`, headers: bearer(app, member) });
    assert.equal(receipt.statusCode, 200, receipt.body);
    assert.doesNotMatch(receipt.body, /gatewaySignature|gatewayPaymentId/);
    const activity = await app.inject({ method: "GET", url: "/api/auth/me/activity", headers: bearer(app, member) });
    assert.doesNotMatch(activity.body, /gatewaySignature|gatewayPaymentId/);
  });

  test("the admin payment list does not include the gateway's signature", async () => {
    const res = await app.inject({ method: "GET", url: "/api/admin/resources/payments?page=1&pageSize=5", headers: bearer(app, admin) });
    assert.doesNotMatch(res.body, /gatewaySignature/);
  });
});

describe("odd requests are refused, not crashes", () => {
  test("a resource named after a built-in property is not found", async () => {
    const res = await app.inject({ method: "GET", url: "/api/admin/resources/constructor", headers: bearer(app, admin) });
    assert.equal(res.statusCode, 404);
  });

  test("a change with no body is a bad request", async () => {
    const application = await newApplication();
    const res = await app.inject({ method: "PATCH", url: `/api/admin/resources/applications/${application.id}`, headers: bearer(app, admin) });
    assert.ok(res.statusCode < 500, `answered ${res.statusCode}`);
  });

  test("an amount too large to store is a bad request", async () => {
    const res = await app.inject({ method: "POST", url: "/api/admin/invoices", headers: bearer(app, admin), payload: { issuedAt: "2026-11-08", customerName: "Karim", items: [{ description: "x", quantity: 1000000, unitPrice: 9999999999 }] } });
    assert.equal(res.statusCode, 400);
  });

  test("an upload with a malformed multipart header is a bad request", async () => {
    const application = await newApplication();
    const res = await app.inject({ method: "POST", url: `/api/applications/${application.id}/documents`, headers: { ...bearer(app, admin), "content-type": "multipart/form-data" }, payload: "not really" });
    assert.ok(res.statusCode >= 400 && res.statusCode < 500, `answered ${res.statusCode}`);
  });
});

describe("the server's own settings", () => {
  test("production refuses a missing, short or example signing secret", () => {
    assert.match(secretProblem(undefined, true)!, /not set/);
    assert.match(secretProblem("short", true)!, /32/);
    assert.match(secretProblem("replace-with-at-least-32-random-characters", true)!, /example/);
  });

  test("a strong secret is accepted", () => {
    assert.equal(secretProblem("a".repeat(16) + "b7Qz".repeat(5), true), null);
  });

  test("development still runs with a short secret", () => {
    assert.equal(secretProblem("dev", false), null);
  });

  test("request logs leave out the query, where keys and tokens travel", () => {
    const logged = requestForLog({ method: "GET", url: "/api/backup/download?key=secret-value", ip: "203.0.113.9" });
    assert.equal(logged.url, "/api/backup/download");
    assert.doesNotMatch(JSON.stringify(logged), /secret-value/);
  });
});
