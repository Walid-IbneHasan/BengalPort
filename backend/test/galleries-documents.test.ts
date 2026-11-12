// Integration tests: several photos for an institution or hospital, the
// Education pages an institution is listed on, short descriptions, and the
// settings for printed documents. Every row created here is removed.
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
const institutions: string[] = [];
const hospitals: string[] = [];
const suppliers: string[] = [];
let documentsBefore: Awaited<ReturnType<typeof prisma.pageContent.findUnique>>;

const call = (method: "GET" | "POST" | "PUT", url: string, payload?: unknown) =>
  app.inject({ method, url, payload: payload as any, headers: bearer(app, admin) });

const institution = (overrides: Record<string, unknown> = {}) => ({
  name: `${tag} Medical University`,
  country: "Malaysia",
  description: "MBBS.",
  image: "/images/edu-medical.webp",
  gallery: ["/images/edu-card-medical.webp", "/api/media/abc.webp"],
  fields: ["medical"],
  programs: [{ title: "MBBS", level: "Bachelor", discipline: "Medicine" }],
  ...overrides,
});

const documents = (overrides: Record<string, unknown> = {}) => ({
  letterhead: { backgroundImage: "", subtitle: "Business · Education · Healthcare · Umrah", tagline: "Connecting Bengal to the World", website: "www.bengalport.com" },
  signatures: { customerLabel: "Customer's signature", ownerLabel: "Authorised signature", ownerName: "Owner Name", ownerTitle: "Proprietor", signatureImage: "" },
  closing: { thanks: "Thank you for choosing Bengal Port." },
  ...overrides,
});

before(async () => {
  app = await buildApp();
  admin = await createUser("ADMIN");
  documentsBefore = await prisma.pageContent.findUnique({ where: { slug: "documents" } });
});

after(async () => {
  await prisma.educationProgram.deleteMany({ where: { institutionId: { in: institutions } } });
  await prisma.institution.deleteMany({ where: { id: { in: institutions } } });
  await prisma.healthcareService.deleteMany({ where: { hospitalId: { in: hospitals } } });
  await prisma.hospital.deleteMany({ where: { id: { in: hospitals } } });
  await prisma.supplier.deleteMany({ where: { id: { in: suppliers } } });
  await prisma.pageContent.deleteMany({ where: { slug: "documents" } });
  if (documentsBefore) {
    const { content, ...page } = documentsBefore;
    await prisma.pageContent.create({ data: { ...page, content: content as object } });
  }
  await deleteUsers(admin.id);
  await app.close();
  await prisma.$disconnect();
});

describe("an institution with several photos", () => {
  test("keeps its photos and the Education pages it is listed on, and the website gets them", async () => {
    const res = await call("POST", "/api/admin/resources/education", institution());
    assert.equal(res.statusCode, 201, res.body);
    institutions.push(res.json().data.id);
    const listed = (await app.inject({ method: "GET", url: "/api/education" })).json().data.find((x: any) => x.id === res.json().data.id);
    assert.deepEqual(listed.gallery, ["/images/edu-card-medical.webp", "/api/media/abc.webp"]);
    assert.deepEqual(listed.fields, ["medical"]);
  });

  test("photos can be changed later", async () => {
    const created = await call("POST", "/api/admin/resources/education", institution({ gallery: [] }));
    institutions.push(created.json().data.id);
    const res = await call("PUT", `/api/admin/resources/education/${created.json().data.id}`, institution({ gallery: ["/images/edu-hero.webp"], fields: ["medical", "general"] }));
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(res.json().data.gallery, ["/images/edu-hero.webp"]);
    assert.deepEqual(res.json().data.fields, ["medical", "general"]);
  });

  test("a photo must be a path or web address", async () => {
    const res = await call("POST", "/api/admin/resources/education", institution({ gallery: ["javascript:alert(1)"] }));
    assert.equal(res.statusCode, 400);
  });

  test("an Education page that does not exist is refused", async () => {
    const res = await call("POST", "/api/admin/resources/education", institution({ fields: ["cooking"] }));
    assert.equal(res.statusCode, 400);
  });

  test("a hospital keeps several photos too", async () => {
    const res = await call("POST", "/api/admin/resources/healthcare", {
      name: `${tag} Hospital`, country: "India", city: "Delhi", description: "Cardiac care.", image: "/images/global-healthcare.webp",
      gallery: ["/images/divisions/care-cardiology.webp"], services: [],
    });
    assert.equal(res.statusCode, 201, res.body);
    hospitals.push(res.json().data.id);
    assert.deepEqual(res.json().data.gallery, ["/images/divisions/care-cardiology.webp"]);
  });
});

describe("descriptions of any length", () => {
  test("a one-word description is accepted", async () => {
    const res = await call("POST", "/api/admin/resources/suppliers", {
      name: `${tag} Supplier`, country: "China", industry: "Textiles", product: "Yarn", description: "Yarn", image: "/images/global-business.webp",
    });
    assert.equal(res.statusCode, 201, res.body);
    suppliers.push(res.json().data.id);
  });

  test("an empty description is refused, and the reply says which field and why", async () => {
    const res = await call("POST", "/api/admin/resources/suppliers", {
      name: `${tag} Supplier`, country: "China", industry: "Textiles", product: "Yarn", description: "  ", image: "/images/global-business.webp",
    });
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.json().error.details.fieldErrors.description, ["This is required"]);
  });
});

describe("the settings for printed documents", () => {
  test("are served empty until saved, so the website uses its own", async () => {
    await prisma.pageContent.deleteMany({ where: { slug: "documents" } });
    const res = await app.inject({ method: "GET", url: "/api/content/documents" });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json().data.content, {});
  });

  test("an administrator sets the letterhead and the owner's signature", async () => {
    const res = await call("PUT", "/api/admin/content/documents", { content: documents({ signatures: { ...documents().signatures, signatureImage: "/api/media/sig.webp" } }), published: true, revision: 0 });
    assert.equal(res.statusCode, 200, res.body);
    const shown = (await app.inject({ method: "GET", url: "/api/content/documents" })).json().data.content;
    assert.equal(shown.signatures.signatureImage, "/api/media/sig.webp");
  });

  test("the letterhead must be a picture's path or web address", async () => {
    const revision = (await call("GET", "/api/admin/content/documents")).json().data.revision;
    const res = await call("PUT", "/api/admin/content/documents", { content: documents({ letterhead: { ...documents().letterhead, backgroundImage: "javascript:alert(1)" } }), published: true, revision });
    assert.equal(res.statusCode, 400);
  });
});
