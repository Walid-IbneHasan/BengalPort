// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

let app: Awaited<ReturnType<typeof buildApp>>;
const users = {} as Record<"ADMIN" | "OTHER_ADMIN" | "USER", Awaited<ReturnType<typeof createUser>>>;
let applicationId = "";
let enquiryId = "";
type Role = keyof typeof users;
const notes = (resource: string, id: string, role: Role = "ADMIN") =>
  app.inject({ method: "GET", url: `/api/admin/resources/${resource}/${id}/notes`, headers: bearer(app, users[role]) });
const write = (resource: string, id: string, body: unknown, role: Role = "ADMIN") =>
  app.inject({ method: "POST", url: `/api/admin/resources/${resource}/${id}/notes`, payload: { body }, headers: bearer(app, users[role]) });
const remove = (id: string, role: Role = "ADMIN") =>
  app.inject({ method: "DELETE", url: `/api/admin/notes/${id}`, headers: bearer(app, users[role]) });

before(async () => {
  app = await buildApp();
  users.ADMIN = await createUser("ADMIN");
  users.OTHER_ADMIN = await createUser("ADMIN");
  users.USER = await createUser("USER");
  applicationId = (await prisma.application.create({
    data: { reference: `BP-${stamp()}`.toUpperCase(), type: "UMRAH", fullName: "Notes Tester", email: "notes@example.test", phone: "01711000000", details: {}, userId: users.USER.id },
  })).id;
  enquiryId = (await prisma.enquiry.create({ data: { type: "GENERAL", name: "Notes Tester", phone: "01711000000", message: "A question" } })).id;
});
after(async () => {
  await prisma.application.deleteMany({ where: { id: applicationId } });
  await prisma.enquiry.deleteMany({ where: { id: enquiryId } });
  await deleteUsers(users.ADMIN.id, users.OTHER_ADMIN.id, users.USER.id);
  await app.close();
  await prisma.$disconnect();
});

describe("staff notes on an application or enquiry", () => {
  test("a note is saved with who wrote it and when", async () => {
    const response = await write("applications", applicationId, "Called the applicant; passport copy is on its way.");
    assert.equal(response.statusCode, 201);
    const note = response.json().data;
    assert.equal(note.body, "Called the applicant; passport copy is on its way.");
    assert.equal(note.authorName, users.ADMIN.name);
    assert.ok(Date.parse(note.createdAt) > Date.now() - 60_000);
  });

  test("notes are listed newest first", async () => {
    await write("enquiries", enquiryId, "First note");
    await write("enquiries", enquiryId, "Second note");
    const list = (await notes("enquiries", enquiryId)).json().data as { body: string }[];
    assert.deepEqual(list.map((note) => note.body), ["Second note", "First note"]);
  });

  test("an application's notes and an enquiry's notes are kept apart", async () => {
    await write("applications", applicationId, "Only on the application");
    const list = (await notes("enquiries", enquiryId)).json().data as { body: string }[];
    assert.ok(!list.some((note) => note.body === "Only on the application"));
  });

  test("an empty note is refused", async () => {
    assert.equal((await write("applications", applicationId, "   ")).statusCode, 400);
  });

  test("a note longer than 2,000 characters is refused", async () => {
    assert.equal((await write("applications", applicationId, "x".repeat(2001))).statusCode, 400);
  });

  test("a note cannot be written on a record that does not exist", async () => {
    assert.equal((await write("applications", "missing", "Hello")).statusCode, 404);
  });

  test("only applications and enquiries take notes", async () => {
    assert.equal((await write("users", users.USER.id, "Hello")).statusCode, 404);
  });

  test("a note can be deleted", async () => {
    const id = (await write("applications", applicationId, "Written by mistake")).json().data.id;
    assert.equal((await remove(id)).statusCode, 204);
    const list = (await notes("applications", applicationId)).json().data as { id: string }[];
    assert.ok(!list.some((note) => note.id === id));
  });

  test("the list of applications tells how many notes each has", async () => {
    await write("applications", applicationId, "Counted");
    const list = (await app.inject({ method: "GET", url: "/api/admin/resources/applications?search=notes@example.test", headers: bearer(app, users.ADMIN) })).json().data as any[];
    assert.ok(list.find((row) => row.id === applicationId)._count.notes >= 1);
  });

  test("the member who applied never sees staff notes", async () => {
    await write("applications", applicationId, "Internal: check the sponsor letter");
    assert.equal((await notes("applications", applicationId, "USER")).statusCode, 403);
    assert.equal((await write("applications", applicationId, "Hello", "USER")).statusCode, 403);
    const activity = await app.inject({ method: "GET", url: "/api/auth/me/activity", headers: bearer(app, users.USER) });
    assert.doesNotMatch(activity.body, /sponsor letter/);
  });

  test("a note outlives the account of the admin who wrote it", async () => {
    await write("enquiries", enquiryId, "Written by a colleague", "OTHER_ADMIN");
    await deleteUsers(users.OTHER_ADMIN.id);
    const list = (await notes("enquiries", enquiryId)).json().data as { body: string; authorName: string }[];
    assert.equal(list.find((note) => note.body === "Written by a colleague")?.authorName, "Test Admin");
  });
});
