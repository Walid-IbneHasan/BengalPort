// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers, fileUpload, pdfBytes, stamp } = await import("./helpers.js");

let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let owner: Awaited<ReturnType<typeof createUser>>;
let stranger: Awaited<ReturnType<typeof createUser>>;
const applications: string[] = [];

// An application as the public form would have created it.
async function application(userId?: string) {
  const row = await prisma.application.create({
    data: { reference: `BP-${stamp()}`, type: "UMRAH", fullName: "Document Tester", email: "documents@example.test", phone: "01711000000", details: {}, userId },
  });
  applications.push(row.id);
  return row;
}
const uploadToken = (applicationId: string) => ({
  authorization: `Bearer ${app.jwt.sign({ sub: applicationId, purpose: "documents" }, { expiresIn: "2h" })}`,
});
const attach = (applicationId: string, headers: Record<string, string>, file = fileUpload("passport.pdf", "application/pdf", pdfBytes())) =>
  app.inject({ method: "POST", url: `/api/applications/${applicationId}/documents`, headers: { ...headers, ...file.headers }, payload: file.payload });
const list = (applicationId: string, headers: Record<string, string>) =>
  app.inject({ method: "GET", url: `/api/applications/${applicationId}/documents`, headers });
const download = (documentId: string, headers: Record<string, string> = {}) =>
  app.inject({ method: "GET", url: `/api/applications/documents/${documentId}`, headers });

before(async () => {
  app = await buildApp();
  admin = await createUser("ADMIN");
  owner = await createUser("USER");
  stranger = await createUser("USER");
});
after(async () => {
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await deleteUsers(admin.id, owner.id, stranger.id);
  await app.close();
  await prisma.$disconnect();
});

describe("attaching documents to an application", () => {
  test("submitting an application lets the applicant attach documents without an account", async () => {
    const { applicationForms } = await import("../../frontend/src/lib/application-forms.js");
    const details: Record<string, unknown> = {};
    for (const field of applicationForms.UMRAH.steps.flatMap((step) => step.fields)) {
      if (!field.required && field.type !== "checkbox") continue;
      details[field.key] = field.type === "multi" ? [field.options![0]] : field.type === "checkbox" ? true : field.type === "select" ? field.options![0] : field.type === "email" ? "documents@example.test" : field.type === "tel" ? "01711000000" : field.type === "date" ? "2031-01-15" : field.type === "number" ? "2" : "Test answer";
    }
    const submitted = (await app.inject({ method: "POST", url: "/api/applications", payload: { type: "UMRAH", fullName: details.fullName, email: details.email, phone: details.phone, details } })).json().data;
    applications.push(submitted.id);
    const res = await attach(submitted.id, { authorization: `Bearer ${submitted.uploadToken}` });
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.name, "passport.pdf");
  });

  test("a signed-in applicant can attach documents later", async () => {
    const mine = await application(owner.id);
    assert.equal((await attach(mine.id, bearer(app, owner))).statusCode, 201);
  });

  test("an upload link works only for its own application", async () => {
    const mine = await application();
    const other = await application();
    assert.equal((await attach(other.id, uploadToken(mine.id))).statusCode, 404);
  });

  test("another member cannot attach to an application that is not theirs", async () => {
    const mine = await application(owner.id);
    assert.equal((await attach(mine.id, bearer(app, stranger))).statusCode, 404);
  });

  test("nothing can be attached without a token", async () => {
    const mine = await application();
    assert.equal((await attach(mine.id, {})).statusCode, 401);
  });

  test("a JPEG photo is accepted", async () => {
    const mine = await application();
    const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(300)]);
    const res = await attach(mine.id, uploadToken(mine.id), fileUpload("photo.jpg", "image/jpeg", jpeg));
    assert.equal(res.statusCode, 201);
    assert.equal(res.json().data.mimeType, "image/jpeg");
  });

  test("a file that only claims to be a PDF is refused", async () => {
    const mine = await application();
    const res = await attach(mine.id, uploadToken(mine.id), fileUpload("notes.pdf", "application/pdf", Buffer.from("<script>alert(1)</script>")));
    assert.equal(res.statusCode, 400);
  });

  test("a file larger than 10 MB is refused", async () => {
    const mine = await application();
    const res = await attach(mine.id, uploadToken(mine.id), fileUpload("scan.pdf", "application/pdf", pdfBytes(10 * 1024 * 1024 + 1024)));
    assert.equal(res.statusCode, 413);
  });

  test("an application holds at most 10 documents", async () => {
    const mine = await application();
    for (let i = 0; i < 10; i++) assert.equal((await attach(mine.id, uploadToken(mine.id))).statusCode, 201);
    assert.equal((await attach(mine.id, uploadToken(mine.id))).statusCode, 400);
  });

  test("the applicant can remove a document attached by mistake", async () => {
    const mine = await application();
    const id = (await attach(mine.id, uploadToken(mine.id))).json().data.id;
    const res = await app.inject({ method: "DELETE", url: `/api/applications/documents/${id}`, headers: uploadToken(mine.id) });
    assert.equal(res.statusCode, 204);
    assert.deepEqual((await list(mine.id, uploadToken(mine.id))).json().data, []);
  });
});

describe("who can read attached documents", () => {
  let mine: Awaited<ReturnType<typeof application>>;
  let documentId = "";
  before(async () => {
    mine = await application(owner.id);
    documentId = (await attach(mine.id, bearer(app, owner), fileUpload("medical report.pdf", "application/pdf", pdfBytes(900)))).json().data.id;
  });

  test("an admin downloads the file exactly as uploaded, as an attachment", async () => {
    const res = await download(documentId, bearer(app, admin));
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.rawPayload, pdfBytes(900));
    assert.equal(res.headers["content-type"], "application/pdf");
    assert.match(String(res.headers["content-disposition"]), /^attachment;/);
    assert.equal(res.headers["x-content-type-options"], "nosniff");
  });

  test("the applicant can download their own document", async () => {
    assert.equal((await download(documentId, bearer(app, owner))).statusCode, 200);
  });

  test("another member cannot download it", async () => {
    assert.equal((await download(documentId, bearer(app, stranger))).statusCode, 404);
  });

  test("an upload link cannot be used to download documents", async () => {
    assert.equal((await download(documentId, uploadToken(mine.id))).statusCode, 401);
  });

  test("a visitor without a session cannot download it", async () => {
    assert.equal((await download(documentId)).statusCode, 401);
  });

  test("another member cannot list the documents", async () => {
    assert.equal((await list(mine.id, bearer(app, stranger))).statusCode, 404);
  });

  test("the admin application list names the documents without their contents", async () => {
    const rows = (await app.inject({ method: "GET", url: `/api/admin/resources/applications?search=${mine.reference}`, headers: bearer(app, admin) })).json().data;
    assert.deepEqual(Object.keys(rows[0].documents[0]).sort(), ["byteSize", "createdAt", "id", "mimeType", "name"]);
  });

  test("the member activity names the documents without their contents", async () => {
    const activity = (await app.inject({ method: "GET", url: "/api/auth/me/activity", headers: bearer(app, owner) })).json().data;
    const found = activity.applications.find((item: { id: string }) => item.id === mine.id);
    assert.deepEqual(Object.keys(found.documents[0]).sort(), ["byteSize", "createdAt", "id", "mimeType", "name"]);
  });

  test("an upload link is not a sign-in", async () => {
    const res = await app.inject({ method: "GET", url: "/api/auth/me", headers: uploadToken(mine.id) });
    assert.equal(res.statusCode, 401);
  });
});
