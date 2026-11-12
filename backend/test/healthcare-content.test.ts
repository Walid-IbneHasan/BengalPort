// Integration tests. They save the Global Healthcare page in the database
// from backend/.env and put back whatever was there before.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers } = await import("./helpers.js");
const { defaultHealthcareContent } = await import("../src/lib/division-content.js");

let app: Awaited<ReturnType<typeof buildApp>>;
let adminUser: Awaited<ReturnType<typeof createUser>>;
let saved: Awaited<ReturnType<typeof prisma.pageContent.findUnique>> = null;
const live = async () => (await app.inject({ method: "GET", url: "/api/content/healthcare" })).json().data.content;
const save = (content: unknown, revision = 0) =>
  app.inject({ method: "PUT", url: "/api/admin/content/healthcare", headers: bearer(app, adminUser), payload: { content, revision } });
const clear = () => prisma.pageContent.deleteMany({ where: { slug: "healthcare" } });
const draft = () => structuredClone(defaultHealthcareContent) as any;

before(async () => {
  app = await buildApp();
  adminUser = await createUser("ADMIN");
  saved = await prisma.pageContent.findUnique({ where: { slug: "healthcare" } });
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

describe("the Global Healthcare page before anyone edits it", () => {
  test("names six treatments", async () => {
    const content = await live();
    assert.equal(content.treatments.length, 6);
    assert.equal(content.treatments[0].title, "Cardiology");
    assert.equal("shortcuts" in content, false);
  });

  test("the hero lists only destinations: Delhi and Beijing, no longer Chennai or Istanbul", async () => {
    const content = await live();
    assert.ok(content.hero.cities.includes("Delhi, India"));
    assert.ok(content.hero.cities.includes("Beijing, China"));
    assert.equal(content.hero.cities.some((city: string) => /Chennai|Istanbul|Turkey/.test(city)), false);
    assert.equal("pathway" in content.hero, false);
    assert.equal("specialties" in content.hero, false);
  });
});

describe("editing the Global Healthcare page", () => {
  test("the team can reword a treatment and its procedures", async () => {
    await clear();
    const content = draft();
    content.treatments[1].description = "Second opinions and treatment plans from oncology centres.";
    content.treatments[1].procedures = ["Chemotherapy", "Radiotherapy"];
    assert.equal((await save(content)).statusCode, 200);
    const shown = await live();
    assert.equal(shown.treatments[1].description, "Second opinions and treatment plans from oncology centres.");
    assert.deepEqual(shown.treatments[1].procedures, ["Chemotherapy", "Radiotherapy"]);
  });

  test("the hero keeps at least one destination", async () => {
    await clear();
    const content = draft();
    content.hero.cities = [];
    assert.equal((await save(content)).statusCode, 400);
  });

  test("a treatment needs a picture", async () => {
    await clear();
    const content = draft();
    content.treatments[0].image = "not a path";
    assert.equal((await save(content)).statusCode, 400);
  });
});
