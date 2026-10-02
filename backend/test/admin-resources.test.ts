// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");

const stamp = `Test ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
let app: Awaited<ReturnType<typeof buildApp>>;
const as = (role: "ADMIN" | "USER") => ({
  authorization: `Bearer ${app.jwt.sign({ sub: "test-user", role })}`,
});
const call = (method: "GET" | "POST" | "PUT" | "DELETE", url: string, payload?: Record<string, unknown>, role: "ADMIN" | "USER" = "ADMIN") =>
  app.inject({ method, url, payload, headers: as(role) });
const publicList = async (path: string) =>
  (await app.inject({ method: "GET", url: `/api/${path}` })).json().data as any[];

before(async () => {
  app = await buildApp();
});
after(async () => {
  const named = { name: { startsWith: stamp } };
  await prisma.educationProgram.deleteMany({ where: { institution: named } });
  await prisma.institution.deleteMany({ where: named });
  await prisma.healthcareService.deleteMany({ where: { hospital: named } });
  await prisma.hospital.deleteMany({ where: named });
  await prisma.supplier.deleteMany({ where: named });
  await prisma.opportunity.deleteMany({ where: { title: { startsWith: stamp } } });
  await prisma.enquiry.deleteMany({ where: named });
  await app.close();
  await prisma.$disconnect();
});

const institution = (overrides: Record<string, unknown> = {}) => ({
  name: `${stamp} University`,
  country: "Malaysia",
  description: "A university used by the automated tests.",
  image: "/images/global-education.webp",
  programs: [
    { title: "MBBS", level: "Undergraduate", discipline: "Medicine" },
    { title: "BSc Nursing", level: "Undergraduate", discipline: "Nursing" },
  ],
  ...overrides,
});
const hospital = (overrides: Record<string, unknown> = {}) => ({
  name: `${stamp} Hospital`,
  country: "Thailand",
  city: "Bangkok",
  description: "A hospital used by the automated tests.",
  image: "/images/global-healthcare.webp",
  services: [{ title: "Cardiology", category: "Specialist care", description: "Heart care and surgery." }],
  ...overrides,
});

describe("managing the education directory", () => {
  let id = "";

  test("an admin can add an institution with its programmes", async () => {
    const res = await call("POST", "/api/admin/resources/education", institution());
    assert.equal(res.statusCode, 201);
    id = res.json().data.id;
    const listed = (await publicList("education")).find((item) => item.id === id);
    assert.deepEqual(listed.programs.map((p: any) => p.title).sort(), ["BSc Nursing", "MBBS"]);
  });

  test("an admin can correct an institution and replace its programmes", async () => {
    const res = await call("PUT", `/api/admin/resources/education/${id}`, institution({
      country: "Türkiye",
      programs: [{ title: "MD", level: "Postgraduate", discipline: "Medicine", deadline: "2027-03-31" }],
    }));
    assert.equal(res.statusCode, 200);
    const listed = (await publicList("education")).find((item) => item.id === id);
    assert.equal(listed.country, "Türkiye");
    assert.deepEqual(listed.programs.map((p: any) => p.title), ["MD"]);
  });

  test("an institution without a name is rejected", async () => {
    const res = await call("POST", "/api/admin/resources/education", institution({ name: " " }));
    assert.equal(res.statusCode, 400);
  });

  test("an admin can remove an institution and its programmes", async () => {
    const res = await call("DELETE", `/api/admin/resources/education/${id}`);
    assert.equal(res.statusCode, 204);
    assert.equal((await publicList("education")).some((item) => item.id === id), false);
    assert.equal(await prisma.educationProgram.count({ where: { institutionId: id } }), 0);
  });
});

describe("managing the hospital directory", () => {
  let id = "";

  test("an admin can add a hospital with its services", async () => {
    const res = await call("POST", "/api/admin/resources/healthcare", hospital());
    assert.equal(res.statusCode, 201);
    id = res.json().data.id;
    const listed = (await publicList("healthcare")).find((item) => item.id === id);
    assert.equal(listed.city, "Bangkok");
    assert.deepEqual(listed.services.map((s: any) => s.title), ["Cardiology"]);
  });

  test("an admin can correct a hospital and replace its services", async () => {
    const res = await call("PUT", `/api/admin/resources/healthcare/${id}`, hospital({
      city: "Chiang Mai",
      services: [],
    }));
    assert.equal(res.statusCode, 200);
    const listed = (await publicList("healthcare")).find((item) => item.id === id);
    assert.equal(listed.city, "Chiang Mai");
    assert.deepEqual(listed.services, []);
  });

  test("an admin can remove a hospital", async () => {
    const res = await call("DELETE", `/api/admin/resources/healthcare/${id}`);
    assert.equal(res.statusCode, 204);
    assert.equal((await publicList("healthcare")).some((item) => item.id === id), false);
  });
});

describe("correcting existing records", () => {
  test("an admin can edit a supplier", async () => {
    const supplier = { name: `${stamp} Supplier`, country: "China", industry: "Textiles", product: "Cotton fabric", description: "A supplier used by the automated tests." };
    const created = await call("POST", "/api/admin/resources/suppliers", supplier);
    const res = await call("PUT", `/api/admin/resources/suppliers/${created.json().data.id}`, { ...supplier, product: "Denim fabric", featured: true });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.product, "Denim fabric");
    assert.equal(res.json().data.featured, true);
  });

  test("an admin can edit an opportunity", async () => {
    const opportunity = { slug: `${stamp.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-opportunity`, category: "EVENT", title: `${stamp} opportunity`, description: "An opportunity used by the automated tests.", country: "Bangladesh", location: "Dhaka", image: "/images/global-business.webp", published: false };
    const created = await call("POST", "/api/admin/opportunities", opportunity);
    const res = await call("PUT", `/api/admin/resources/opportunities/${created.json().data.id}`, { ...opportunity, location: "Chattogram" });
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.location, "Chattogram");
  });

  test("adding an opportunity whose link name is taken is refused with a clear message", async () => {
    const opportunity = { slug: `${stamp.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-duplicate`, category: "EVENT", title: `${stamp} duplicate`, description: "An opportunity used by the automated tests.", country: "Bangladesh", location: "Dhaka", image: "/images/global-business.webp", published: false };
    await call("POST", "/api/admin/opportunities", opportunity);
    const res = await call("POST", "/api/admin/opportunities", opportunity);
    assert.equal(res.statusCode, 409);
    assert.equal(res.json().error.code, "SLUG_TAKEN");
  });

  test("editing a record that does not exist is reported as not found", async () => {
    const res = await call("PUT", "/api/admin/resources/education/does-not-exist", institution());
    assert.equal(res.statusCode, 404);
  });
});

describe("clearing out spam", () => {
  test("an admin can delete an enquiry", async () => {
    const enquiry = await prisma.enquiry.create({ data: { type: "GENERAL", name: `${stamp} Spammer`, phone: "0000000", message: "Buy followers now" } });
    const res = await call("DELETE", `/api/admin/resources/enquiries/${enquiry.id}`);
    assert.equal(res.statusCode, 204);
    assert.equal(await prisma.enquiry.count({ where: { id: enquiry.id } }), 0);
  });
});

describe("who may change the directory", () => {
  test("a signed-in member cannot add an institution", async () => {
    const res = await call("POST", "/api/admin/resources/education", institution(), "USER");
    assert.equal(res.statusCode, 403);
  });
});
