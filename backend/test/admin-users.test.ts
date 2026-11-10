// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import { OAuth2Client } from "google-auth-library";

process.env.LOG_LEVEL = "silent";
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "test-client.apps.googleusercontent.com";
process.env.AUTH_DEV_CODES = "false";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { temporaryPassword } = await import("../src/lib/passwords.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

type Mail = { to: string; subject: string; text: string; html: string };
const sent: Mail[] = [];
const mailer = { configured: true, async send(mail: Mail) { sent.push(mail); } };

let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;
const created: string[] = [];

let visitors = 0;
const visitor = () => `10.3.${Math.floor(++visitors / 250)}.${(visitors % 250) + 1}`;
const asAdmin = (method: "GET" | "POST" | "PATCH", url: string, payload?: Record<string, unknown>) =>
  app.inject({ method, url, payload, headers: bearer(app, admin), remoteAddress: visitor() });
const post = (url: string, payload: Record<string, unknown>, headers: Record<string, string> = {}) =>
  app.inject({ method: "POST", url, payload, headers, remoteAddress: visitor() });
const login = (email: string, password: string) => post("/api/auth/login", { email, password });
const session = (token: string) => ({ authorization: `Bearer ${token}` });
const get = (url: string, token: string) => app.inject({ method: "GET", url, headers: session(token), remoteAddress: visitor() });

const newEmail = () => `${stamp()}-added@example.test`;
const passwordIn = (mail: Mail) => mail.text.match(/Temporary password: (\S+)/)![1];

async function addUser(overrides: Record<string, unknown> = {}) {
  const email = newEmail();
  const res = await asAdmin("POST", "/api/admin/users", { name: "Added Person", email, phone: "01711000000", role: "USER", ...overrides });
  assert.equal(res.statusCode, 201, res.body);
  created.push(res.json().data.id);
  const mail = sent.filter((item) => item.to === email).at(-1)!;
  return { id: res.json().data.id as string, email, password: passwordIn(mail), mail, response: res };
}
const signedIn = async (email: string, password: string) => {
  const res = await login(email, password);
  assert.equal(res.statusCode, 200, res.body);
  return res.json().data as { token: string; user: { mustChangePassword: boolean; role: string } };
};

before(async () => {
  app = await buildApp({ mailer: mailer as any });
  admin = await createUser("ADMIN");
  member = await createUser("USER");
});

after(async () => {
  await deleteUsers(admin.id, member.id, ...created);
  await app.close();
});

describe("temporary passwords", () => {
  test("always meet the site's password rules and avoid look-alike characters", () => {
    for (let i = 0; i < 200; i++) {
      const value = temporaryPassword();
      assert.ok(value.length >= 14);
      assert.match(value, /[a-z]/);
      assert.match(value, /[A-Z]/);
      assert.match(value, /\d/);
      assert.doesNotMatch(value, /[0O1lI]/);
    }
  });

  test("are different every time", () => {
    assert.notEqual(temporaryPassword(), temporaryPassword());
  });
});

describe("an administrator adding a user", () => {
  test("creates the account and emails a temporary password", async () => {
    const { id, email, password, mail, response } = await addUser();
    assert.ok(password.length >= 14);
    assert.equal(mail.to, email);
    const row = await prisma.user.findUniqueOrThrow({ where: { id } });
    assert.equal(row.mustChangePassword, true);
    assert.ok(row.emailVerifiedAt);
    assert.equal(row.role, "USER");
    assert.doesNotMatch(response.body, new RegExp(password));
    assert.doesNotMatch(response.body, /passwordHash/);
  });

  test("can create another administrator", async () => {
    const { id } = await addUser({ role: "ADMIN" });
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id } })).role, "ADMIN");
  });

  test("an email already in use is refused, however it is capitalised", async () => {
    const { email } = await addUser();
    const res = await asAdmin("POST", "/api/admin/users", { name: "Again", email: email.toUpperCase(), role: "USER" });
    assert.equal(res.statusCode, 409);
  });

  for (const [what, body] of [
    ["an invalid email", { name: "Person", email: "nope", role: "USER" }],
    ["a missing name", { name: " ", email: "x@example.test", role: "USER" }],
    ["an unknown role", { name: "Person", email: "x@example.test", role: "OWNER" }],
  ] as const)
    test(`${what} is refused`, async () => {
      assert.equal((await asAdmin("POST", "/api/admin/users", { ...body })).statusCode, 400);
    });

  test("no account is left behind when the email cannot be sent", async () => {
    const broken = await buildApp({ mailer: { configured: true, async send() { throw new Error("535 refused at smtp"); } } as any });
    const email = newEmail();
    const res = await broken.inject({ method: "POST", url: "/api/admin/users", payload: { name: "Person", email, role: "USER" }, headers: bearer(broken, admin) });
    assert.equal(res.statusCode, 503);
    assert.doesNotMatch(res.body, /535|smtp/i);
    assert.equal(await prisma.user.count({ where: { email } }), 0);
    await broken.close();
  });

  test("no account is made when email is not set up", async () => {
    const off = await buildApp({ mailer: { configured: false, async send() {} } as any });
    const email = newEmail();
    const res = await off.inject({ method: "POST", url: "/api/admin/users", payload: { name: "Person", email, role: "USER" }, headers: bearer(off, admin) });
    assert.equal(res.statusCode, 503);
    assert.equal(await prisma.user.count({ where: { email } }), 0);
    await off.close();
  });

  test("a member cannot add users", async () => {
    const res = await app.inject({ method: "POST", url: "/api/admin/users", payload: { name: "Person", email: newEmail(), role: "ADMIN" }, headers: bearer(app, member) });
    assert.equal(res.statusCode, 403);
  });
});

describe("the first sign-in with a temporary password", () => {
  test("signs in and says the password must be changed", async () => {
    const { email, password } = await addUser();
    const data = await signedIn(email, password);
    assert.equal(data.user.mustChangePassword, true);
  });

  test("their own details can be read, so the page can load", async () => {
    const { email, password } = await addUser();
    const { token } = await signedIn(email, password);
    assert.equal((await get("/api/auth/me", token)).statusCode, 200);
  });

  test("nothing else works until the password is changed", async () => {
    const { email, password } = await addUser();
    const { token } = await signedIn(email, password);
    const res = await get("/api/auth/me/activity", token);
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error.code, "PASSWORD_CHANGE_REQUIRED");
    const patch = await app.inject({ method: "PATCH", url: "/api/auth/me", payload: { name: "New Name" }, headers: session(token), remoteAddress: visitor() });
    assert.equal(patch.statusCode, 403);
  });

  test("a new administrator cannot use the admin until it is changed", async () => {
    const { email, password } = await addUser({ role: "ADMIN" });
    const { token } = await signedIn(email, password);
    const res = await get("/api/admin/dashboard", token);
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error.code, "PASSWORD_CHANGE_REQUIRED");
  });

  test("changing it opens the account and retires the temporary password", async () => {
    const { id, email, password } = await addUser();
    const { token } = await signedIn(email, password);
    const res = await post("/api/auth/change-password", { currentPassword: password, newPassword: "Chosen-Pass-2026" }, session(token));
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().data.user.mustChangePassword, false);
    assert.equal((await get("/api/auth/me/activity", res.json().data.token)).statusCode, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id } })).mustChangePassword, false);
    assert.equal((await login(email, password)).statusCode, 401);
    assert.equal((await login(email, "Chosen-Pass-2026")).statusCode, 200);
  });

  test("the temporary password cannot be kept as the new one", async () => {
    const { email, password } = await addUser();
    const { token } = await signedIn(email, password);
    const res = await post("/api/auth/change-password", { currentPassword: password, newPassword: password }, session(token));
    assert.equal(res.statusCode, 400);
  });

  test("setting a password by reset code also counts", async () => {
    const { id, email } = await addUser();
    const { challengeId } = (await post("/api/auth/forgot-password", { email })).json().data;
    const code = sent.filter((item) => item.to === email).at(-1)!.text.match(/\b(\d{6})\b/)![1];
    assert.equal((await post("/api/auth/reset-password", { challengeId, code, password: "Reset-Pass-2026" })).statusCode, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id } })).mustChangePassword, false);
  });

  test("signing in with Google removes the temporary password", async () => {
    const { id, email } = await addUser();
    const replaced = mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({ getPayload: () => ({ sub: `google-${stamp()}`, email, email_verified: true, name: "Person" }) }) as any);
    const res = await post("/api/auth/google", { credential: "x".repeat(40) });
    replaced.mock.restore();
    assert.equal(res.statusCode, 200, res.body);
    const row = await prisma.user.findUniqueOrThrow({ where: { id } });
    assert.equal(row.mustChangePassword, false);
    assert.equal(row.passwordHash, null);
  });
});

describe("blocking an account", () => {
  const block = (id: string, blocked: boolean) => asAdmin("PATCH", `/api/admin/users/${id}/block`, { blocked });
  const ready = async () => {
    const { id, email, password } = await addUser();
    const { token } = await signedIn(email, password);
    const changed = await post("/api/auth/change-password", { currentPassword: password, newPassword: "Chosen-Pass-2026" }, session(token));
    return { id, email, token: changed.json().data.token as string };
  };

  test("a blocked person cannot sign in and is told why", async () => {
    const { id, email } = await ready();
    assert.equal((await block(id, true)).statusCode, 200);
    const res = await login(email, "Chosen-Pass-2026");
    assert.equal(res.statusCode, 403);
    assert.equal(res.json().error.code, "ACCOUNT_BLOCKED");
  });

  test("a wrong password says nothing about the block", async () => {
    const { id, email } = await ready();
    await block(id, true);
    const res = await login(email, "Wrong-Pass-2026");
    assert.equal(res.statusCode, 401);
    assert.doesNotMatch(res.body, /block/i);
  });

  test("a session already open stops working at once", async () => {
    const { id, token } = await ready();
    assert.equal((await get("/api/auth/me", token)).statusCode, 200);
    await block(id, true);
    assert.equal((await get("/api/auth/me", token)).statusCode, 401);
  });

  test("no reset code is sent to a blocked account", async () => {
    const { id, email } = await ready();
    await block(id, true);
    const before = sent.filter((item) => item.to === email).length;
    const res = await post("/api/auth/forgot-password", { email });
    assert.equal(res.statusCode, 200);
    assert.equal(sent.filter((item) => item.to === email).length, before);
  });

  test("a code issued before the block no longer works", async () => {
    const { id, email } = await ready();
    const { challengeId } = (await post("/api/auth/forgot-password", { email })).json().data;
    const code = sent.filter((item) => item.to === email).at(-1)!.text.match(/\b(\d{6})\b/)![1];
    await block(id, true);
    assert.equal((await post("/api/auth/reset-password", { challengeId, code, password: "Another-Pass-2026" })).statusCode, 401);
  });

  test("Google sign-in is refused too", async () => {
    const { id, email } = await ready();
    await block(id, true);
    const replaced = mock.method(OAuth2Client.prototype, "verifyIdToken", async () => ({ getPayload: () => ({ sub: `google-${stamp()}`, email, email_verified: true, name: "Person" }) }) as any);
    const res = await post("/api/auth/google", { credential: "x".repeat(40) });
    replaced.mock.restore();
    assert.equal(res.statusCode, 403);
  });

  test("unblocking lets them back in", async () => {
    const { id, email } = await ready();
    await block(id, true);
    assert.equal((await block(id, false)).statusCode, 200);
    assert.equal((await login(email, "Chosen-Pass-2026")).statusCode, 200);
  });

  test("the list shows who is blocked", async () => {
    const { id, email } = await ready();
    await block(id, true);
    const res = await asAdmin("GET", `/api/admin/resources/users?page=1&pageSize=5&search=${encodeURIComponent(email)}`);
    assert.ok(res.json().data[0].blockedAt);
    assert.equal(res.json().data[0].id, id);
  });

  test("an administrator cannot block their own account", async () => {
    const res = await block(admin.id, true);
    assert.equal(res.statusCode, 400);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: admin.id } })).blockedAt, null);
  });

  test("an unknown account is not found", async () => {
    assert.equal((await block("missing", true)).statusCode, 404);
  });

  test("a body that is not a yes or no is refused", async () => {
    const { id } = await ready();
    assert.equal((await asAdmin("PATCH", `/api/admin/users/${id}/block`, { blocked: "maybe" })).statusCode, 400);
  });

  test("a member cannot block anyone", async () => {
    const { id } = await ready();
    const res = await app.inject({ method: "PATCH", url: `/api/admin/users/${id}/block`, payload: { blocked: true }, headers: bearer(app, member) });
    assert.equal(res.statusCode, 403);
  });
});
