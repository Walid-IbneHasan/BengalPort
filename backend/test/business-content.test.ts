// Integration tests. They save the Global Business page in the database
// from backend/.env and put back whatever was there before.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers } = await import("./helpers.js");
const { defaultBusinessContent } = await import("../src/lib/business-content.js");

let app: Awaited<ReturnType<typeof buildApp>>;
let adminUser: Awaited<ReturnType<typeof createUser>>;
let saved: Awaited<ReturnType<typeof prisma.pageContent.findUnique>> = null;
const live = async () => (await app.inject({ method: "GET", url: "/api/content/business" })).json().data.content;
const save = (content: unknown, revision = 0) =>
  app.inject({ method: "PUT", url: "/api/admin/content/business", headers: bearer(app, adminUser), payload: { content, revision } });
const clear = () => prisma.pageContent.deleteMany({ where: { slug: "business" } });
const draft = () => structuredClone(defaultBusinessContent) as any;

// What the admin editor does before saving (a copy of the frontend's
// fillMissing): whatever the saved page lacks gets the built-in wording, and
// a list whose items lack what the built-in items carry is replaced whole.
const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
function fillMissing<T>(builtIn: T, stored: unknown): T {
  if (Array.isArray(builtIn)) {
    if (!Array.isArray(stored)) return structuredClone(builtIn) as T;
    const template = builtIn.find(isObject);
    const complete = !template || stored.every((item) => isObject(item) && Object.keys(template).every((key) => key in item));
    return structuredClone(complete ? stored : builtIn) as T;
  }
  if (isObject(builtIn)) {
    const from = isObject(stored) ? stored : {};
    return Object.fromEntries(Object.entries(builtIn).map(([key, value]) => [key, fillMissing(value, from[key])])) as T;
  }
  return (typeof stored === typeof builtIn ? stored : builtIn) as T;
}

before(async () => {
  app = await buildApp();
  adminUser = await createUser("ADMIN");
  saved = await prisma.pageContent.findUnique({ where: { slug: "business" } });
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

describe("the Global Business page before anyone edits it", () => {
  test("names the markets it sources from and six things it does", async () => {
    const content = await live();
    assert.deepEqual(content.hero.markets.slice(0, 3), ["Bangladesh", "China", "Turkey"]);
    assert.equal(content.services.items.length, 6);
    assert.ok(content.services.items.every((item: any) => item.image.startsWith("/images/")));
  });
});

describe("the quick links under the Business hero", () => {
  test("there are four, each pointing somewhere on the site", async () => {
    const content = await live();
    assert.equal(content.shortcuts.length, 4);
    assert.ok(content.shortcuts.every((item: any) => item.title && item.subtitle && (item.href.startsWith("#") || item.href.startsWith("/"))));
  });
});

describe("editing the Global Business page", () => {
  test("the team can change the markets and add a step", async () => {
    await clear();
    const content = draft();
    content.hero.markets = ["China", "Mongolia"];
    content.process.steps.push({ number: "06", title: "Review", description: "A short review call after delivery." });
    assert.equal((await save(content)).statusCode, 200);
    const shown = await live();
    assert.deepEqual(shown.hero.markets, ["China", "Mongolia"]);
    assert.equal(shown.process.steps.length, 6);
  });

  test("a page saved after the redesign that lacks a section gets the built-in one when the editor fills it", async () => {
    await clear();
    const partial = draft();
    delete partial.trust;
    delete partial.reviews;
    const filled = fillMissing(defaultBusinessContent, partial);
    assert.equal((await save(filled)).statusCode, 200);
    assert.equal((await live()).trust.title, defaultBusinessContent.trust.title);
  });

  test("the built-in page, which replaces a page saved before the redesign, saves as it is", async () => {
    await clear();
    assert.equal((await save(draft())).statusCode, 200);
    assert.equal((await live()).hero.lead, defaultBusinessContent.hero.lead);
  });

  test("a tile needs a picture", async () => {
    await clear();
    const content = draft();
    content.services.items[0].image = "not a path";
    assert.equal((await save(content)).statusCode, 400);
  });
});
