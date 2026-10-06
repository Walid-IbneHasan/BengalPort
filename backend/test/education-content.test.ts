// Integration tests. They save the Global Education page in the database
// from backend/.env and put back whatever was there before.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers } = await import("./helpers.js");
const { defaultEducationContent } = await import("../src/lib/division-content.js");
const { divisionContentSchema } = await import("../src/lib/schemas.js");

let app: Awaited<ReturnType<typeof buildApp>>;
let adminUser: Awaited<ReturnType<typeof createUser>>;
let saved: Awaited<ReturnType<typeof prisma.pageContent.findUnique>> = null;
const live = async () => (await app.inject({ method: "GET", url: "/api/content/education" })).json().data.content;
const save = (content: unknown, revision = 0) =>
  app.inject({ method: "PUT", url: "/api/admin/content/education", headers: bearer(app, adminUser), payload: { content, revision } });
const clear = () => prisma.pageContent.deleteMany({ where: { slug: "education" } });
const draft = () => structuredClone(defaultEducationContent) as any;

before(async () => {
  app = await buildApp();
  adminUser = await createUser("ADMIN");
  saved = await prisma.pageContent.findUnique({ where: { slug: "education" } });
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

describe("the Global Education page before anyone edits it", () => {
  test("offers Medical, Engineering, General Subjects and Student Reviews", async () => {
    const content = await live();
    assert.equal(content.fields.medical.title, "Medical");
    assert.equal(content.fields.engineering.title, "Engineering");
    assert.equal(content.fields.general.title, "General Subjects");
    assert.equal(content.reviews.title, "Student Reviews");
  });

  test("no longer has the row of shortcuts", async () => {
    assert.equal("shortcuts" in (await live()), false);
  });
});

describe("editing the Global Education page", () => {
  test("an admin can reword the reviews section", async () => {
    await clear();
    const content = draft();
    content.reviews.heading = "What our students say";
    const res = await save(content);
    assert.equal(res.statusCode, 200);
    assert.equal((await live()).reviews.heading, "What our students say");
  });

  test("an admin can change the picture of an option and the photo of its section", async () => {
    await clear();
    const content = draft();
    content.fields.medical.image = "/images/new-medical-tile.webp";
    content.fields.medical.photo = "/images/new-medical-photo.webp";
    content.reviews.photo = "/images/new-students.webp";
    assert.equal((await save(content)).statusCode, 200);
    const shown = await live();
    assert.equal(shown.fields.medical.image, "/images/new-medical-tile.webp");
    assert.equal(shown.fields.medical.photo, "/images/new-medical-photo.webp");
    assert.equal(shown.reviews.photo, "/images/new-students.webp");
  });

  test("a picture needs a path or a web address", async () => {
    await clear();
    const content = draft();
    content.fields.engineering.photo = "not a path";
    assert.equal((await save(content)).statusCode, 400);
  });

  test("reviews are not part of the page: they come from customers", async () => {
    await clear();
    const content = draft();
    content.reviews.items = [{ name: "A student", detail: "MBBS, Malaysia", quote: "Typed into the page." }];
    assert.equal((await save(content)).statusCode, 200);
    assert.equal("items" in (await live()).reviews, false);
  });

  test("a page without its fields of study is refused", async () => {
    await clear();
    const content = draft();
    delete content.fields;
    const res = await save(content);
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, "VALIDATION_ERROR");
  });

  test("the other division pages still need their shortcuts", () => {
    assert.equal(divisionContentSchema.safeParse(draft()).success, false);
  });
});
