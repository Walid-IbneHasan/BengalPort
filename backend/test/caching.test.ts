// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers } = await import("./helpers.js");

let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;
let image = "";

const caching = async (url: string, headers: Record<string, string> = {}) =>
  String((await app.inject({ method: "GET", url, headers })).headers["cache-control"]);

before(async () => {
  app = await buildApp();
  admin = await createUser("ADMIN");
  member = await createUser("USER");
  image = (
    await prisma.mediaAsset.create({
      data: { originalName: "cache-test.webp", data: Buffer.from("RIFF"), width: 1, height: 1, byteSize: 4, orientation: "square" },
    })
  ).id;
});

after(async () => {
  await prisma.mediaAsset.deleteMany({ where: { id: image } });
  await deleteUsers(admin.id, member.id);
  await app.close();
});

describe("what browsers may keep", () => {
  for (const url of ["/api/content/home", "/api/content/about", "/api/opportunities", "/api/suppliers", "/api/factories", "/api/education", "/api/healthcare", "/api/reviews?division=business"])
    test(`${url} is kept for a minute at most`, async () => {
      assert.match(await caching(url), /^public, max-age=60\b/);
    });

  test("an uploaded image is kept for a year, because a new upload gets a new address", async () => {
    assert.equal(await caching(`/api/media/${image}.webp`), "public, max-age=31536000, immutable");
  });
});

describe("what browsers must not keep", () => {
  test("the health check is always live", async () => {
    assert.equal(await caching("/api/health"), "no-store");
  });

  test("an error is not remembered", async () => {
    assert.equal(await caching("/api/opportunities/does-not-exist"), "no-store");
  });

  test("a member's own details are not stored", async () => {
    assert.equal(await caching("/api/auth/me", bearer(app, member)), "no-store");
  });

  test("a member's own reviews are not stored", async () => {
    assert.equal(await caching("/api/reviews/mine", bearer(app, member)), "no-store");
  });

  test("administration data is not stored", async () => {
    assert.equal(await caching("/api/admin/dashboard", bearer(app, admin)), "no-store");
    assert.equal(await caching("/api/admin/resources/users?page=1", bearer(app, admin)), "no-store");
  });
});
