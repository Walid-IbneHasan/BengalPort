// These tests read content and send invalid saves; the only rows they create
// are their own two accounts, removed afterwards.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers } = await import("./helpers.js");

let app: Awaited<ReturnType<typeof buildApp>>;
let adminUser: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;
const admin = () => bearer(app, adminUser);
before(async () => {
  app = await buildApp();
  adminUser = await createUser("ADMIN");
  member = await createUser("USER");
});
after(async () => {
  await deleteUsers(adminUser.id, member.id);
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
      headers: bearer(app, member),
    });
    assert.equal(res.statusCode, 403);
  });
});

describe("social links in the site header", () => {
  const base = async () => {
    const { defaultHomeContent } = await import("../src/lib/home-content.js");
    const { homeContentSchema } = await import("../src/lib/schemas.js");
    return { content: structuredClone(defaultHomeContent) as any, schema: homeContentSchema };
  };

  test("a full web address is accepted", async () => {
    const { content, schema } = await base();
    content.utility.facebook = "https://facebook.com/bengalport";
    const parsed = schema.safeParse(content);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data!.utility.facebook, "https://facebook.com/bengalport");
  });

  test("links can be left blank", async () => {
    const { content, schema } = await base();
    Object.assign(content.utility, { facebook: "", linkedin: "", youtube: "" });
    assert.equal(schema.safeParse(content).success, true);
  });

  test("homepage content saved before social links existed is still valid", async () => {
    const { content, schema } = await base();
    for (const key of ["facebook", "linkedin", "youtube"]) delete content.utility[key];
    const parsed = schema.safeParse(content);
    assert.equal(parsed.success, true);
    assert.equal(parsed.data!.utility.linkedin, "");
  });

  test("anything that is not a web address is rejected", async () => {
    const { content, schema } = await base();
    content.utility.youtube = "javascript:alert(1)";
    assert.equal(schema.safeParse(content).success, false);
  });
});
