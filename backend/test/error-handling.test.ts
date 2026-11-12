// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { bearer, createUser, deleteUsers } = await import("./helpers.js");

let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;

const asAdmin = (method: "GET" | "PATCH" | "POST" | "DELETE", url: string, payload?: Record<string, unknown>) =>
  app.inject({ method, url, payload, headers: bearer(app, admin) });

// Anything that would tell an outsider how the server is built.
const assertNothingInternal = (body: string) => {
  assert.doesNotMatch(body, /prisma|invocation|Invalid `|node_modules|[A-Z]:\\\\|\/home\//i);
};

before(async () => {
  app = await buildApp();
  admin = await createUser("ADMIN");
});

after(async () => {
  await deleteUsers(admin.id);
  await app.close();
});

describe("what a visitor sees when a request goes wrong", () => {
  test("a NUL character in an address is refused, not passed to the database", async () => {
    const res = await app.inject({ method: "GET", url: "/api/media/%00" });
    assert.equal(res.statusCode, 400);
    assertNothingInternal(res.body);
  });

  test("a NUL character in a search is refused", async () => {
    const res = await app.inject({ method: "GET", url: "/api/opportunities?search=%00" });
    assert.equal(res.statusCode, 400);
    assertNothingInternal(res.body);
  });

  test("a NUL character inside submitted text is refused", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/enquiries",
      payload: { type: "GENERAL", name: "Ka\u0000rim", phone: "01711000000", message: "A long enough message" },
      remoteAddress: "10.77.0.1",
    });
    assert.equal(res.statusCode, 400);
    assertNothingInternal(res.body);
  });

  test("a category nobody has made simply finds nothing", async () => {
    const res = await app.inject({ method: "GET", url: "/api/opportunities?category=NOPE" });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json().data, []);
  });

  test("a filter sent twice is a bad request, not a crash", async () => {
    const res = await app.inject({ method: "GET", url: "/api/opportunities?category=A&category=B" });
    assert.equal(res.statusCode, 400);
    assertNothingInternal(res.body);
  });

  test("errors are answered in the one shape the website reads", async () => {
    const res = await app.inject({ method: "GET", url: "/api/opportunities/does-not-exist" });
    assert.equal(res.statusCode, 404);
    assert.equal(res.json().error.message, "Opportunity not found");
  });
});

describe("what an administrator sees when a record is gone", () => {
  test("changing a record that does not exist is not found", async () => {
    const res = await asAdmin("PATCH", "/api/admin/resources/opportunities/missing", { published: false });
    assert.equal(res.statusCode, 404);
    assertNothingInternal(res.body);
  });

  test("a date that is not a date is a bad request", async () => {
    const res = await asAdmin("GET", "/api/admin/accounts?from=NOPE");
    assert.equal(res.statusCode, 400);
    assertNothingInternal(res.body);
  });
});

describe("the order of the checks", () => {
  test("a visitor is turned away before a broken body is read", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/admin/opportunities",
      payload: "{not json",
      headers: { "content-type": "application/json" },
    });
    assert.equal(res.statusCode, 401);
  });
});
