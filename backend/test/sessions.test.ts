// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";
for (const key of ["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]) process.env[key] = "";
process.env.AUTH_DEV_CODES = "true";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { createUser, deleteUsers } = await import("./helpers.js");

let app: Awaited<ReturnType<typeof buildApp>>;
const created: string[] = [];
const account = async (role: "USER" | "ADMIN" = "USER") => {
  const user = await createUser(role);
  created.push(user.id);
  return user;
};
// A session as the sign-in route issues it for the account's current state.
const signIn = async (email: string, password = "Secret123") =>
  (await app.inject({ method: "POST", url: "/api/auth/login", payload: { email, password } })).json().data.token as string;
const me = (token: string) =>
  app.inject({ method: "GET", url: "/api/auth/me", headers: { authorization: `Bearer ${token}` } });

before(async () => {
  app = await buildApp();
});
after(async () => {
  await deleteUsers(...created);
  await app.close();
  await prisma.$disconnect();
});

describe("ending sessions when a password changes", () => {
  test("changing the password signs out the member's other devices", async () => {
    const user = await account();
    const phone = await signIn(user.email);
    const laptop = await signIn(user.email);
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      headers: { authorization: `Bearer ${laptop}` },
      payload: { currentPassword: "Secret123", newPassword: "Changed456" },
    });
    assert.equal(res.statusCode, 200);
    assert.equal((await me(phone)).statusCode, 401);
  });

  test("the device that changed the password stays signed in with a new session", async () => {
    const user = await account();
    const laptop = await signIn(user.email);
    const res = await app.inject({
      method: "POST",
      url: "/api/auth/change-password",
      headers: { authorization: `Bearer ${laptop}` },
      payload: { currentPassword: "Secret123", newPassword: "Changed456" },
    });
    assert.equal((await me(res.json().data.token)).statusCode, 200);
  });

  test("resetting a forgotten password ends every existing session", async () => {
    const user = await account();
    const stolen = await signIn(user.email);
    const forgot = (await app.inject({ method: "POST", url: "/api/auth/forgot-password", payload: { email: user.email } })).json().data;
    const reset = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: { challengeId: forgot.challengeId, code: forgot.developmentCode, password: "Recovered789" },
    });
    assert.equal(reset.statusCode, 200);
    assert.equal((await me(stolen)).statusCode, 401);
  });
});

describe("resetting a forgotten password", () => {
  const forgotten = async (email: string) =>
    (await app.inject({ method: "POST", url: "/api/auth/forgot-password", payload: { email } })).json().data;
  const reset = (payload: Record<string, unknown>) =>
    app.inject({ method: "POST", url: "/api/auth/reset-password", payload });

  test("a weak new password is refused with the rule it broke, and the code still works", async () => {
    const user = await account();
    const { challengeId, developmentCode: code } = await forgotten(user.email);
    const weak = await reset({ challengeId, code, password: "alllowercase" });
    assert.equal(weak.statusCode, 400);
    assert.match(weak.json().error.message, /uppercase, lowercase and a number/);
    assert.equal((await reset({ challengeId, code, password: "Recovered789" })).statusCode, 200);
  });

  test("a malformed code is still reported as bad reset details", async () => {
    const user = await account();
    const { challengeId } = await forgotten(user.email);
    const res = await reset({ challengeId, code: "12", password: "Recovered789" });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.message, "Invalid reset details");
  });
});

describe("how an account signs in", () => {
  const provider = async (data: { googleId?: string; passwordHash?: null }) => {
    const user = await account();
    await prisma.user.update({ where: { id: user.id }, data });
    return (await me(app.jwt.sign({ sub: user.id, role: user.role, v: user.tokenVersion }))).json().data.provider;
  };

  test("a password account is a password account", async () => {
    assert.equal(await provider({}), "password");
  });

  test("a password account that later used Google still has its password to manage", async () => {
    assert.equal(await provider({ googleId: `password-and-google-${crypto.randomUUID()}` }), "password");
  });

  test("an account with only Google is a Google account", async () => {
    assert.equal(await provider({ googleId: `only-google-${crypto.randomUUID()}`, passwordHash: null }), "google");
  });
});

describe("sessions follow the account", () => {
  test("an admin who is made a regular user loses admin access at once", async () => {
    const admin = await account("ADMIN");
    const token = await signIn(admin.email);
    const dashboard = () =>
      app.inject({ method: "GET", url: "/api/admin/dashboard", headers: { authorization: `Bearer ${token}` } });
    assert.equal((await dashboard()).statusCode, 200);
    await prisma.user.update({ where: { id: admin.id }, data: { role: "USER" } });
    assert.equal((await dashboard()).statusCode, 403);
  });

  test("a session for a deleted account is refused", async () => {
    const user = await account();
    const token = await signIn(user.email);
    await deleteUsers(user.id);
    assert.equal((await me(token)).statusCode, 401);
  });

  test("a session issued before this check existed keeps working", async () => {
    const user = await account();
    const older = app.jwt.sign({ sub: user.id, role: user.role });
    assert.equal((await me(older)).statusCode, 200);
  });
});
