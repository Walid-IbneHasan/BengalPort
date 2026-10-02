// These tests only read content and send invalid saves, so they write nothing.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");

let app: Awaited<ReturnType<typeof buildApp>>;
const admin = () => ({
  authorization: `Bearer ${app.jwt.sign({ sub: "an-admin", role: "ADMIN" })}`,
});
before(async () => {
  app = await buildApp();
});
after(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("editing the Global Umrah page", () => {
  test("an admin can open its content", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/content/umrah",
      headers: admin(),
    });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.content.hero.eyebrow, "GLOBAL UMRAH");
  });

  test("content that is missing sections is rejected", async () => {
    const res = await app.inject({
      method: "PUT",
      url: "/api/admin/content/umrah",
      headers: admin(),
      payload: { content: { hero: {} }, revision: 0 },
    });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, "VALIDATION_ERROR");
  });

  test("a visitor who is not an admin cannot open the editor content", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/api/admin/content/umrah",
      headers: {
        authorization: `Bearer ${app.jwt.sign({ sub: "a-member", role: "USER" })}`,
      },
    });
    assert.equal(res.statusCode, 403);
  });
});
