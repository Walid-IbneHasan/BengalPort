// Integration tests. They run against the database in backend/.env and put
// back every page they change. Test files run at the same time, so this one
// writes only to pages no other file touches; the pages others edit are
// checked against their save rules directly.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers } = await import("./helpers.js");
const schemas = await import("../src/lib/schemas.js");
const site = await import("../../frontend/src/lib/site-pages.ts");
const { defaultHomeContent } = await import("../../frontend/src/lib/home-content.ts");
const { defaultBusinessContent } = await import("../../frontend/src/lib/business-content.ts");
const { defaultEducationContent, defaultHealthcareContent, defaultUmrahContent } = await import("../../frontend/src/lib/division-content.ts");

let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;
const before_: Array<Record<string, any>> = [];

const newPages: Record<string, any> = {
  opportunities: site.defaultOpportunitiesContent,
  apply: site.defaultApplyContent,
  pay: site.defaultPayContent,
  login: site.defaultLoginContent,
  privacy: site.defaultPrivacyContent,
  terms: site.defaultTermsContent,
};
const sharedPages: Array<[string, { safeParse(value: unknown): { success: boolean; error?: unknown } }, unknown]> = [
  ["home", schemas.homeContentSchema, defaultHomeContent],
  ["business", schemas.businessContentSchema, defaultBusinessContent],
  ["education", schemas.educationContentSchema, defaultEducationContent],
  ["healthcare", schemas.healthcareContentSchema, defaultHealthcareContent],
  ["umrah", schemas.umrahContentSchema, defaultUmrahContent],
  ["about", schemas.aboutContentSchema, site.defaultAboutContent],
  ["services", schemas.servicesContentSchema, site.defaultServicesContent],
  ["contact", schemas.contactContentSchema, site.defaultContactContent],
];
const revisionOf = async (slug: string) =>
  (await app.inject({ method: "GET", url: `/api/admin/content/${slug}`, headers: bearer(app, admin) })).json().data.revision as number;
const save = async (slug: string, content: unknown) =>
  app.inject({ method: "PUT", url: `/api/admin/content/${slug}`, payload: { content, published: true, revision: await revisionOf(slug) }, headers: bearer(app, admin) });

before(async () => {
  app = await buildApp();
  admin = await createUser("ADMIN");
  member = await createUser("USER");
  before_.push(...(await prisma.pageContent.findMany({ where: { slug: { in: Object.keys(newPages) } } })));
});
after(async () => {
  await prisma.pageContent.deleteMany({ where: { slug: { in: Object.keys(newPages) } } });
  for (const row of before_) await prisma.pageContent.create({ data: row as never });
  await deleteUsers(admin.id, member.id);
  await app.close();
  await prisma.$disconnect();
});

describe("every page the website shows can be saved", () => {
  for (const [slug, schema, content] of sharedPages)
    test(`the ${slug} page's built-in wording passes the save rules`, () => {
      const result = schema.safeParse(content);
      assert.ok(result.success, String(JSON.stringify(result.error)).slice(0, 400));
    });
  for (const [slug, content] of Object.entries(newPages))
    test(`the ${slug} page's built-in wording saves`, async () => {
      const res = await save(slug, content);
      assert.equal(res.statusCode, 200, JSON.stringify(res.json().error?.details ?? res.json()).slice(0, 400));
    });
});

describe("pages added to the editor", () => {
  for (const [slug, content] of Object.entries(newPages)) {
    test(`/${slug}: what the administrator saves is what visitors get`, async () => {
      const edited = structuredClone(content);
      const key = "hero" in edited ? "hero" : null;
      if (key) edited[key].title = `Edited ${slug} title`;
      else if ("title" in edited) edited.title = `Edited ${slug} title`;
      else edited.story.eyebrow = `Edited ${slug} title`;
      assert.equal((await save(slug, edited)).statusCode, 200);
      const shown = (await app.inject({ method: "GET", url: `/api/content/${slug}` })).json().data.content;
      assert.ok(JSON.stringify(shown).includes(`Edited ${slug} title`));
    });

    test(`/${slug}: a blank field is refused`, async () => {
      const edited = structuredClone(content);
      if ("hero" in edited) edited.hero.title = "   ";
      else if ("title" in edited) edited.title = "   ";
      else edited.story.eyebrow = "   ";
      assert.equal((await save(slug, edited)).statusCode, 400);
    });

    test(`/${slug}: only an administrator can save it`, async () => {
      const res = await app.inject({ method: "PUT", url: `/api/admin/content/${slug}`, payload: { content, published: true, revision: 0 }, headers: bearer(app, member) });
      assert.equal(res.statusCode, 403);
    });
  }

  test("a page nobody has edited yet is served empty, so the site shows its built-in wording", async () => {
    await prisma.pageContent.deleteMany({ where: { slug: "pay" } });
    const res = await app.inject({ method: "GET", url: "/api/content/pay" });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json().data.content, {});
  });
});

describe("the logo and WhatsApp number", () => {
  const accepted = (content: unknown) => schemas.homeContentSchema.safeParse(content).success;

  test("a logo must be a path or web address, not a script", () => {
    assert.equal(accepted({ ...defaultHomeContent, brand: { ...defaultHomeContent.brand, logo: "javascript:alert(1)" } }), false);
  });

  test("a WhatsApp number may be left blank to keep the current one", () => {
    assert.equal(accepted({ ...defaultHomeContent, whatsapp: { ...defaultHomeContent.whatsapp, number: "" } }), true);
  });

  test("a WhatsApp number may be written with a plus, spaces and dashes", () => {
    assert.equal(accepted({ ...defaultHomeContent, whatsapp: { ...defaultHomeContent.whatsapp, number: "+880 1711-991035" } }), true);
  });

  test("a WhatsApp number holds only digits, spaces, dashes and a plus", () => {
    assert.equal(accepted({ ...defaultHomeContent, whatsapp: { ...defaultHomeContent.whatsapp, number: "call me" } }), false);
  });
});
