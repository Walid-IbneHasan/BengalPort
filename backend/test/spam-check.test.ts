// The Cloudflare check itself is tested with a stand-in for Cloudflare; the
// routes are integration tests that remove every row they create.
import "dotenv/config";
import { after, before, beforeEach, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";
process.env.ADMIN_NOTIFY_EMAIL = "";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { createSpamCheck } = await import("../src/lib/spam-check.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

describe("asking Cloudflare whether a visitor passed the check", () => {
  const keys = { TURNSTILE_SITE_KEY: "site-key", TURNSTILE_SECRET_KEY: "secret-key" };
  const answering = (body: unknown, calls: { url: string; body: string }[] = []) =>
    (async (url: any, init: any) => {
      calls.push({ url: String(url), body: String(init.body) });
      return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
    }) as typeof fetch;

  test("the check is off until both keys are set", () => {
    assert.equal(createSpamCheck({ env: {} }).siteKey, null);
    assert.equal(createSpamCheck({ env: { TURNSTILE_SITE_KEY: "site-key" } }).siteKey, null);
    assert.equal(createSpamCheck({ env: keys }).siteKey, "site-key");
  });

  test("while it is off every visitor passes", async () => {
    assert.equal(await createSpamCheck({ env: {} }).passed(undefined), true);
  });

  test("a token Cloudflare accepts passes", async () => {
    const calls: { url: string; body: string }[] = [];
    const check = createSpamCheck({ env: keys, fetch: answering({ success: true }, calls) });
    assert.equal(await check.passed("good-token", "203.0.113.9"), true);
    assert.equal(calls[0].url, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const sent = new URLSearchParams(calls[0].body);
    assert.deepEqual([sent.get("secret"), sent.get("response"), sent.get("remoteip")], ["secret-key", "good-token", "203.0.113.9"]);
  });

  test("a token Cloudflare rejects does not pass", async () => {
    const check = createSpamCheck({ env: keys, fetch: answering({ success: false, "error-codes": ["invalid-input-response"] }) });
    assert.equal(await check.passed("forged-token"), false);
  });

  test("a missing token does not pass, and Cloudflare is not asked", async () => {
    const calls: { url: string; body: string }[] = [];
    const check = createSpamCheck({ env: keys, fetch: answering({ success: true }, calls) });
    assert.equal(await check.passed(""), false);
    assert.equal(calls.length, 0);
  });

  test("when Cloudflare cannot be reached the visitor is let through", async () => {
    const check = createSpamCheck({ env: keys, fetch: (async () => { throw new Error("network down"); }) as typeof fetch });
    assert.equal(await check.passed("any-token"), true);
  });
});

describe("the public forms", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let member: Awaited<ReturnType<typeof createUser>>;
  const tag = stamp();
  const check = { siteKey: "site-key" as string | null, seen: [] as (string | undefined)[], async passed(token?: string) { this.seen.push(token); return this.siteKey === null || token === "good-token"; } };
  let caller = 0;
  const enquiry = (extra: Record<string, unknown> = {}, headers: Record<string, string> = {}) =>
    app.inject({
      method: "POST",
      url: "/api/enquiries",
      headers,
      remoteAddress: `10.8.0.${++caller}`,
      payload: { type: "GENERAL", name: `${tag} sender`, phone: "01711000000", email: "", message: "Do you arrange visas?", ...extra },
    });
  const saved = () => prisma.enquiry.count({ where: { name: `${tag} sender` } });

  before(async () => {
    app = await buildApp({ spamCheck: check });
    member = await createUser("USER");
  });
  beforeEach(async () => {
    check.siteKey = "site-key";
    check.seen.length = 0;
    await prisma.enquiry.deleteMany({ where: { name: `${tag} sender` } });
  });
  after(async () => {
    await prisma.enquiry.deleteMany({ where: { name: `${tag} sender` } });
    await prisma.application.deleteMany({ where: { fullName: `${tag} sender` } });
    await deleteUsers(member.id);
    await app.close();
    await prisma.$disconnect();
  });

  test("the site is told which key to show the check with", async () => {
    assert.deepEqual((await app.inject({ method: "GET", url: "/api/form-protection" })).json().data, { siteKey: "site-key" });
    check.siteKey = null;
    assert.deepEqual((await app.inject({ method: "GET", url: "/api/form-protection" })).json().data, { siteKey: null });
  });

  test("an enquiry with a passed check is saved", async () => {
    assert.equal((await enquiry({ captchaToken: "good-token" })).statusCode, 201);
    assert.equal(await saved(), 1);
  });

  test("an enquiry without a passed check is refused and not saved", async () => {
    for (const captchaToken of [undefined, "forged-token"]) {
      const res = await enquiry({ captchaToken });
      assert.equal(res.statusCode, 400);
      assert.equal(res.json().error.code, "CAPTCHA_FAILED");
    }
    assert.equal(await saved(), 0);
  });

  test("a signed-in member is not asked for the check", async () => {
    assert.equal((await enquiry({}, bearer(app, member))).statusCode, 201);
    assert.equal(check.seen.length, 0);
  });

  test("with the check switched off enquiries are accepted as before", async () => {
    check.siteKey = null;
    assert.equal((await enquiry()).statusCode, 201);
  });

  test("a submission that fills the hidden field is dropped without a trace", async () => {
    const res = await enquiry({ captchaToken: "good-token", contact_time_slot: "https://spam.example" });
    assert.equal(res.statusCode, 201);
    assert.equal(await saved(), 0);
  });

  test("the hidden field and the check token are not stored with an enquiry", async () => {
    await enquiry({ captchaToken: "good-token", contact_time_slot: "" });
    const row = await prisma.enquiry.findFirstOrThrow({ where: { name: `${tag} sender` } });
    assert.doesNotMatch(JSON.stringify(row), /good-token|contact_time_slot/);
  });

  test("an application needs the check too", async () => {
    const res = await app.inject({ method: "POST", url: "/api/applications", remoteAddress: `10.8.0.${++caller}`, payload: { type: "UMRAH", fullName: `${tag} sender`, email: "applicant@example.test", phone: "01711000000", details: {} } });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, "CAPTCHA_FAILED");
  });
});
