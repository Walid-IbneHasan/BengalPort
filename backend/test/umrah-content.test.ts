// Integration tests. They save the Global Umrah page in the database from
// backend/.env and put back whatever was there before.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers } = await import("./helpers.js");
const { defaultUmrahContent } = await import("../src/lib/division-content.js");

let app: Awaited<ReturnType<typeof buildApp>>;
let adminUser: Awaited<ReturnType<typeof createUser>>;
let saved: Awaited<ReturnType<typeof prisma.pageContent.findUnique>> = null;
const live = async () => (await app.inject({ method: "GET", url: "/api/content/umrah" })).json().data.content;
const save = (content: unknown, revision = 0) =>
  app.inject({ method: "PUT", url: "/api/admin/content/umrah", headers: bearer(app, adminUser), payload: { content, revision } });
const clear = () => prisma.pageContent.deleteMany({ where: { slug: "umrah" } });
const draft = () => structuredClone(defaultUmrahContent) as any;

before(async () => {
  app = await buildApp();
  adminUser = await createUser("ADMIN");
  saved = await prisma.pageContent.findUnique({ where: { slug: "umrah" } });
  await clear();
});
after(async () => {
  await clear();
  if (saved) {
    const { content, ...page } = saved;
    await prisma.pageContent.create({ data: { ...page, content: content as object } });
  }
  await deleteUsers(adminUser.id);
  await app.close();
  await prisma.$disconnect();
});

describe("the Global Umrah page before anyone edits it", () => {
  test("offers three packages, four stages and the next departures", async () => {
    const content = await live();
    assert.equal(content.packages.length, 3);
    assert.equal(content.packages.filter((item: any) => item.tag).length, 1);
    assert.equal(content.stages.length, 4);
    assert.ok(content.hero.departures.length >= 1);
    assert.ok(content.hero.journeys.includes("in Ramadan"));
    assert.equal("directory" in content, false);
  });
});

describe("the quick links under the Umrah hero", () => {
  test("there are four, each pointing somewhere on the site", async () => {
    const content = await live();
    assert.equal(content.shortcuts.length, 4);
    assert.ok(content.shortcuts.every((item: any) => item.title && item.subtitle && (item.href.startsWith("#") || item.href.startsWith("/"))));
  });
});

describe("editing the Global Umrah page", () => {
  test("the team can change a package price and its inclusions", async () => {
    await clear();
    const content = draft();
    content.packages[0].price = "From ৳ 1,25,000";
    content.packages[0].inclusions.push("Zamzam water on departure");
    assert.equal((await save(content)).statusCode, 200);
    const shown = await live();
    assert.equal(shown.packages[0].price, "From ৳ 1,25,000");
    assert.ok(shown.packages[0].inclusions.includes("Zamzam water on departure"));
  });

  test("a departure needs a date written as year-month-day", async () => {
    await clear();
    const content = draft();
    content.hero.departures[0].date = "14 Nov 2026";
    assert.equal((await save(content)).statusCode, 400);
  });

  test("the journey keeps exactly four stages", async () => {
    await clear();
    const content = draft();
    content.stages.push({ ...content.stages[3], title: "A fifth stage" });
    assert.equal((await save(content)).statusCode, 400);
  });

  test("a package tag may be left empty", async () => {
    await clear();
    const content = draft();
    content.packages = content.packages.map((item: any) => ({ ...item, tag: "" }));
    assert.equal((await save(content)).statusCode, 200);
  });
});
