// Integration tests. They save the About, Services and Contact pages in the
// database from backend/.env and put back whatever was there before.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers } = await import("./helpers.js");
const { defaultAboutContent, defaultContactContent, defaultServicesContent } = await import("../src/lib/site-pages.js");

const slugs = ["about", "services", "contact"];
let app: Awaited<ReturnType<typeof buildApp>>;
let adminUser: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;
let saved: Awaited<ReturnType<typeof prisma.pageContent.findMany>> = [];
const live = async (slug: string) => (await app.inject({ method: "GET", url: `/api/content/${slug}` })).json().data;
const open = (slug: string, user = adminUser) => app.inject({ method: "GET", url: `/api/admin/content/${slug}`, headers: bearer(app, user) });
const save = (slug: string, payload: Record<string, unknown>, user = adminUser) =>
  app.inject({ method: "PUT", url: `/api/admin/content/${slug}`, headers: bearer(app, user), payload });
const clear = () => prisma.pageContent.deleteMany({ where: { slug: { in: slugs } } });

before(async () => {
  app = await buildApp();
  adminUser = await createUser("ADMIN");
  member = await createUser("USER");
  saved = await prisma.pageContent.findMany({ where: { slug: { in: slugs } } });
  await clear();
});
after(async () => {
  await clear();
  for (const { content, ...page } of saved) await prisma.pageContent.create({ data: { ...page, content: content as object } });
  await deleteUsers(adminUser.id, member.id);
  await app.close();
  await prisma.$disconnect();
});

describe("the About, Services and Contact pages before anyone edits them", () => {
  test("each page is served with its built-in wording", async () => {
    assert.equal((await live("about")).content.hero.eyebrow, "ABOUT BENGAL PORT");
    assert.equal((await live("services")).content.groups.umrah.title, "Global Umrah");
    assert.match((await live("contact")).content.hours, /Saturday/);
  });

  test("the editor opens with the same wording at revision 0", async () => {
    const page = (await open("contact")).json().data;
    assert.equal(page.revision, 0);
    assert.deepEqual(page.content, defaultContactContent);
  });

  test("a member cannot open the editor content", async () => {
    assert.equal((await open("about", member)).statusCode, 403);
  });
});

describe("editing a page", () => {
  test("what an admin saves is what visitors get", async () => {
    await clear();
    const content = structuredClone(defaultAboutContent);
    content.hero.title = "Built on trust.";
    const res = await save("about", { content, revision: 0 });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.revision, 1);
    assert.equal((await live("about")).content.hero.title, "Built on trust.");
  });

  test("a save made from an out-of-date editor is refused", async () => {
    await clear();
    await save("contact", { content: defaultContactContent, revision: 0 });
    const res = await save("contact", { content: defaultContactContent, revision: 0 });
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error.code, "CONTENT_CONFLICT");
  });

  test("an unpublished page falls back to the built-in wording", async () => {
    await clear();
    const content = structuredClone(defaultContactContent);
    content.hours = "Closed for renovation";
    await save("contact", { content, revision: 0, published: false });
    assert.match((await live("contact")).content.hours, /Saturday/);
  });

  test("a member cannot save a page", async () => {
    await clear();
    const res = await save("about", { content: defaultAboutContent, revision: 0 }, member);
    assert.equal(res.statusCode, 403);
    assert.equal(await prisma.pageContent.count({ where: { slug: "about" } }), 0);
  });
});

describe("what a page must contain", () => {
  const rejected = async (slug: string, content: unknown) => {
    await clear();
    const res = await save(slug, { content, revision: 0 });
    assert.equal(res.statusCode, 400);
    assert.equal(res.json().error.code, "VALIDATION_ERROR");
  };

  test("the About page needs at least one value and one point", async () => {
    await rejected("about", { ...structuredClone(defaultAboutContent), values: [] });
    const content = structuredClone(defaultAboutContent);
    content.work.points = [];
    await rejected("about", content);
  });

  test("the Services page needs all four divisions", async () => {
    const content: any = structuredClone(defaultServicesContent);
    delete content.groups.umrah;
    await rejected("services", content);
  });

  test("a service image must be a path or a web address", async () => {
    const content = structuredClone(defaultServicesContent);
    content.groups.business.image = "javascript:alert(1)";
    await rejected("services", content);
  });

  test("the Contact page needs its opening hours", async () => {
    await rejected("contact", { ...structuredClone(defaultContactContent), hours: " " });
  });
});
