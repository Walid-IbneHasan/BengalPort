// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

const tag = stamp();
let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;
const created: string[] = [];
const opportunities: string[] = [];

const addCategory = async (label: string) => {
  const res = await app.inject({ method: "POST", url: "/api/admin/opportunity-categories", payload: { label }, headers: bearer(app, admin) });
  if (res.statusCode === 201) created.push(res.json().data.value);
  return res;
};
const adminList = async () =>
  (await app.inject({ method: "GET", url: "/api/admin/opportunity-categories", headers: bearer(app, admin) })).json().data as Array<{ value: string; label: string }>;
const opportunity = (category: string, suffix = "a") => ({
  slug: `${tag}-${suffix}`.toLowerCase(),
  category,
  title: `${tag} opening`,
  description: "A real opening for testing.",
  country: "Bangladesh",
  location: "Dhaka",
  deadline: null,
  image: "/images/global-business.webp",
  published: true,
});
const saveOpportunity = async (body: Record<string, unknown>) => {
  const res = await app.inject({ method: "POST", url: "/api/admin/opportunities", payload: body, headers: bearer(app, admin) });
  if (res.statusCode === 201) opportunities.push(res.json().data.id);
  return res;
};

before(async () => {
  app = await buildApp();
  admin = await createUser("ADMIN");
  member = await createUser("USER");
});
after(async () => {
  await prisma.opportunity.deleteMany({ where: { id: { in: opportunities } } });
  await prisma.opportunityCategory.deleteMany({ where: { value: { in: created } } });
  await deleteUsers(admin.id, member.id);
  await app.close();
  await prisma.$disconnect();
});

describe("opportunity categories", () => {
  test("the eight original categories are there, in their original order", async () => {
    const list = await adminList();
    assert.deepEqual(
      list.slice(0, 8).map((category) => category.value),
      ["BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH", "FACTORY_VISIT", "BUSINESS_TOUR", "SCHOLARSHIP", "EVENT"],
    );
    assert.equal(list[4].label, "Factory visit");
  });

  test("an administrator adds a category and it joins the list, last", async () => {
    const res = await addCategory(`${tag} Trade Fair`);
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.label, `${tag} Trade Fair`);
    assert.equal((await adminList()).at(-1)?.label, `${tag} Trade Fair`);
  });

  test("visitors see a new category in the public list too", async () => {
    const { value } = (await addCategory(`${tag} Public One`)).json().data;
    const list = (await app.inject({ method: "GET", url: "/api/opportunities/categories" })).json().data as Array<{ value: string }>;
    assert.ok(list.some((category) => category.value === value));
  });

  test("the stored value is safe to put in a web address", async () => {
    const { value } = (await addCategory(`${tag} Food & Drink / Expo`)).json().data;
    assert.equal(encodeURIComponent(value), value);
  });

  test("a category can be named in Bangla", async () => {
    const res = await addCategory(`বাণিজ্য মেলা ${tag}`);
    assert.equal(res.statusCode, 201);
    assert.ok(res.json().data.value.length > 0);
  });

  test("the same name again is refused, whatever its capitals", async () => {
    await addCategory(`${tag} Expo`);
    assert.equal((await addCategory(`${tag} EXPO`)).statusCode, 409);
  });

  test("a name that matches an original category is refused", async () => {
    assert.equal((await addCategory("business tour")).statusCode, 409);
  });

  test("a name too short to mean anything is refused", async () => {
    assert.equal((await addCategory("a")).statusCode, 400);
  });

  test("a name with no letters or numbers is refused", async () => {
    assert.equal((await addCategory("&&&")).statusCode, 400);
  });

  test("only an administrator can add one", async () => {
    const anonymous = await app.inject({ method: "POST", url: "/api/admin/opportunity-categories", payload: { label: `${tag} No` } });
    assert.equal(anonymous.statusCode, 401);
    const notAdmin = await app.inject({ method: "POST", url: "/api/admin/opportunity-categories", payload: { label: `${tag} No` }, headers: bearer(app, member) });
    assert.equal(notAdmin.statusCode, 403);
  });

  test("an opportunity can be filed under a new category and found by it", async () => {
    const { value } = (await addCategory(`${tag} Filed`)).json().data;
    assert.equal((await saveOpportunity(opportunity(value, "filed"))).statusCode, 201);
    const found = (await app.inject({ method: "GET", url: `/api/opportunities?category=${encodeURIComponent(value)}` })).json().data as Array<{ slug: string }>;
    assert.deepEqual(found.map((item) => item.slug), [`${tag}-filed`.toLowerCase()]);
  });

  test("an opportunity cannot be filed under a category that does not exist", async () => {
    assert.equal((await saveOpportunity(opportunity("NOT_A_CATEGORY", "bad"))).statusCode, 400);
  });

  test("editing an opportunity cannot move it to a category that does not exist", async () => {
    const id = (await saveOpportunity(opportunity("EVENT", "edit"))).json().data.id;
    const res = await app.inject({ method: "PUT", url: `/api/admin/resources/opportunities/${id}`, payload: opportunity("NOT_A_CATEGORY", "edit"), headers: bearer(app, admin) });
    assert.equal(res.statusCode, 400);
  });
});
