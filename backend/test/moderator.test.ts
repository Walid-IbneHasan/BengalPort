// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers, pdfBytes, stamp } = await import("./helpers.js");

const tag = stamp();
let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let moderator: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;
const suppliers: string[] = [];
const invoices: string[] = [];
const applications: string[] = [];
const users: string[] = [];

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
const call = (method: Method, url: string, payload?: Record<string, unknown>, who = moderator) =>
  app.inject({ method, url, payload, headers: bearer(app, who) });

const supplier = () => ({
  name: `${tag} Supplier`,
  country: "China",
  industry: "Textiles",
  product: "Yarn",
  description: "Spun yarn.",
  image: "/images/global-business.webp",
});

const application = async () => {
  const row = await prisma.application.create({
    data: {
      reference: `BP-${stamp()}`.toUpperCase(),
      type: "EDUCATION",
      fullName: `${tag} Student`,
      email: `${tag}@example.test`,
      phone: "01711000001",
      details: { fullName: `${tag} Student` },
    },
  });
  applications.push(row.id);
  return row;
};

before(async () => {
  app = await buildApp();
  admin = await createUser("ADMIN");
  moderator = await createUser("MODERATOR");
  member = await createUser("USER");
});

after(async () => {
  await prisma.invoice.deleteMany({ where: { id: { in: invoices } } });
  await prisma.supplier.deleteMany({ where: { id: { in: suppliers } } });
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await deleteUsers(admin.id, moderator.id, member.id, ...users);
  await app.close();
  await prisma.$disconnect();
});

describe("a moderator adds and edits content", () => {
  test("opens the lists of enquiries, applications and directory records", async () => {
    for (const resource of ["enquiries", "applications", "opportunities", "suppliers", "factories", "education", "healthcare"]) {
      const res = await call("GET", `/api/admin/resources/${resource}`);
      assert.equal(res.statusCode, 200, `${resource}: ${res.body}`);
    }
  });

  test("adds a supplier and corrects it", async () => {
    const created = await call("POST", "/api/admin/resources/suppliers", supplier());
    assert.equal(created.statusCode, 201, created.body);
    suppliers.push(created.json().data.id);
    const edited = await call("PUT", `/api/admin/resources/suppliers/${created.json().data.id}`, { ...supplier(), product: "Cotton yarn" });
    assert.equal(edited.statusCode, 200, edited.body);
    assert.equal(edited.json().data.product, "Cotton yarn");
  });

  test("reads the website's wording to edit it", async () => {
    assert.equal((await call("GET", "/api/admin/content/home")).statusCode, 200);
  });

  test("moves an application along and writes a staff note", async () => {
    const row = await application();
    assert.equal((await call("PATCH", `/api/admin/resources/applications/${row.id}`, { status: "IN_REVIEW" })).statusCode, 200);
    const note = await call("POST", `/api/admin/resources/applications/${row.id}/notes`, { body: "Called the student." });
    assert.equal(note.statusCode, 201, note.body);
  });

  test("opens a document attached to an application", async () => {
    const row = await application();
    const document = await prisma.applicationDocument.create({
      data: { applicationId: row.id, name: "passport.pdf", mimeType: "application/pdf", byteSize: 600, data: pdfBytes() },
    });
    const res = await call("GET", `/api/applications/documents/${document.id}`);
    assert.equal(res.statusCode, 200);
  });
});

describe("a moderator never deletes anything", () => {
  test("cannot delete a supplier, which stays", async () => {
    const created = await call("POST", "/api/admin/resources/suppliers", supplier());
    suppliers.push(created.json().data.id);
    const res = await call("DELETE", `/api/admin/resources/suppliers/${created.json().data.id}`);
    assert.equal(res.statusCode, 403);
    assert.match(res.json().error.message, /administrator/i);
    assert.equal(await prisma.supplier.count({ where: { id: created.json().data.id } }), 1);
  });

  test("cannot delete a staff note, a review or an image", async () => {
    const row = await application();
    const note = await call("POST", `/api/admin/resources/applications/${row.id}/notes`, { body: "Keep this." });
    assert.equal((await call("DELETE", `/api/admin/notes/${note.json().data.id}`)).statusCode, 403);
    assert.equal((await call("DELETE", "/api/admin/reviews/any")).statusCode, 403);
    assert.equal((await call("DELETE", "/api/admin/media/any")).statusCode, 403);
  });

  test("cannot remove a document from an application", async () => {
    const row = await application();
    const document = await prisma.applicationDocument.create({
      data: { applicationId: row.id, name: "keep.pdf", mimeType: "application/pdf", byteSize: 600, data: pdfBytes() },
    });
    const res = await call("DELETE", `/api/applications/documents/${document.id}`);
    assert.equal(res.statusCode, 403);
    assert.equal(await prisma.applicationDocument.count({ where: { id: document.id } }), 1);
  });
});

describe("a moderator stays out of the money and the people", () => {
  test("cannot see the dashboard figures", async () => {
    assert.equal((await call("GET", "/api/admin/dashboard")).statusCode, 403);
  });

  test("cannot open or write in Hisab Kitab", async () => {
    assert.equal((await call("GET", "/api/admin/accounts")).statusCode, 403);
    assert.equal((await call("GET", "/api/admin/accounts/categories")).statusCode, 403);
    assert.equal((await call("POST", "/api/admin/accounts", { type: "INCOME" })).statusCode, 403);
  });

  test("cannot list accounts, payments or receipts", async () => {
    for (const resource of ["users", "payments", "receipts"])
      assert.equal((await call("GET", `/api/admin/resources/${resource}`)).statusCode, 403, resource);
  });

  test("cannot add, block or promote people", async () => {
    assert.equal((await call("POST", "/api/admin/users", { name: "X Person", email: `${tag}-x@example.test`, role: "USER" })).statusCode, 403);
    assert.equal((await call("PATCH", `/api/admin/users/${member.id}/block`, { blocked: true })).statusCode, 403);
    assert.equal((await call("PATCH", `/api/admin/resources/users/${member.id}`, { role: "ADMIN" })).statusCode, 403);
  });

  test("cannot set what an application costs", async () => {
    const row = await application();
    const res = await call("PATCH", `/api/admin/resources/applications/${row.id}`, { amountDue: 50000 });
    assert.equal(res.statusCode, 403);
    assert.equal((await prisma.application.findUnique({ where: { id: row.id } }))?.amountDue, null);
  });

  test("cannot record a payment, change fees or download a backup", async () => {
    assert.equal((await call("POST", "/api/payments", { service: "Visa", amount: 10, totalDue: 10, method: "Cash" })).statusCode, 403);
    assert.equal((await call("GET", "/api/admin/payment-settings")).statusCode, 403);
    assert.equal((await call("GET", "/api/admin/backup-link")).statusCode, 403);
    assert.equal((await call("GET", "/api/admin/status")).statusCode, 403);
  });
});

describe("a moderator makes bills", () => {
  const bill = {
    issuedAt: "2026-11-12",
    customerName: `${tag} Customer`,
    items: [{ description: "MBBS admission service", quantity: 1, unitPrice: 100000 }],
    paid: 10000,
  };

  test("generates an invoice and opens it to print", async () => {
    const created = await call("POST", "/api/admin/invoices", bill);
    assert.equal(created.statusCode, 201, created.body);
    invoices.push(created.json().data.id);
    const shown = await call("GET", `/api/admin/invoices/${created.json().data.id}`);
    assert.equal(shown.statusCode, 200);
    assert.equal(shown.json().data.total, 100000);
    assert.equal(shown.json().data.paid, 10000);
  });

  test("reads what an application costs and what has been paid, to bill it", async () => {
    const row = await application();
    await prisma.application.update({ where: { id: row.id }, data: { amountDue: 100000 } });
    const res = await call("GET", `/api/payments/application/${row.id}`);
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().data.amountDue, 100000);
  });

  test("cannot change or delete an invoice", async () => {
    const created = await call("POST", "/api/admin/invoices", bill);
    invoices.push(created.json().data.id);
    const id = created.json().data.id;
    assert.equal((await call("PUT", `/api/admin/invoices/${id}`, { ...bill, paid: 0 })).statusCode, 403);
    assert.equal((await call("DELETE", `/api/admin/invoices/${id}`)).statusCode, 403);
    assert.equal(Number((await prisma.invoice.findUnique({ where: { id } }))?.paid), 10000);
  });

  test("an invoice made by a moderator is not tied to a ledger entry", async () => {
    const category = await prisma.financialCategory.create({ data: { name: `${tag} Fees`, type: "INCOME" } });
    const entry = await prisma.financialTransaction.create({
      data: { type: "INCOME", date: new Date(), description: "Fee", total: 5, categoryId: category.id },
    });
    const created = await call("POST", "/api/admin/invoices", { ...bill, transactionId: entry.id });
    invoices.push(created.json().data.id);
    assert.equal(created.statusCode, 201, created.body);
    assert.equal(created.json().data.transactionId, null);
    await prisma.invoice.deleteMany({ where: { id: created.json().data.id } });
    await prisma.financialTransaction.delete({ where: { id: entry.id } });
    await prisma.financialCategory.delete({ where: { id: category.id } });
  });
});

describe("administrators appoint moderators", () => {
  test("an admin makes a member a moderator", async () => {
    const someone = await createUser("USER");
    users.push(someone.id);
    const res = await call("PATCH", `/api/admin/resources/users/${someone.id}`, { role: "MODERATOR" }, admin);
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().data.role, "MODERATOR");
  });

  test("an admin adds a moderator's account", async () => {
    const res = await call("POST", "/api/admin/users", { name: "New Moderator", email: `${tag}-mod@example.test`, role: "MODERATOR" }, admin);
    assert.equal(res.statusCode, 201, res.body);
    users.push(res.json().data.id);
    assert.equal(res.json().data.role, "MODERATOR");
  });

  test("an admin gives the office roles; the person signs in again and the change is recorded", async () => {
    const someone = await createUser("USER");
    users.push(someone.id);
    const res = await call("PATCH", `/api/admin/resources/users/${someone.id}`, { role: "ACCOUNTANT" }, admin);
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().data.role, "ACCOUNTANT");
    const after = await prisma.user.findUniqueOrThrow({ where: { id: someone.id }, select: { tokenVersion: true } });
    assert.equal(after.tokenVersion, someone.tokenVersion + 1);
    const logged = await prisma.auditLog.findFirst({ where: { action: "user.role", entityId: someone.id } });
    assert.match(logged?.summary ?? "", /USER → ACCOUNTANT/);
    await prisma.auditLog.deleteMany({ where: { entityId: someone.id } });
  });

  test("an admin adds an employee's account", async () => {
    const res = await call("POST", "/api/admin/users", { name: "New Employee", email: `${tag}-emp@example.test`, role: "EMPLOYEE" }, admin);
    assert.equal(res.statusCode, 201, res.body);
    users.push(res.json().data.id);
    assert.equal(res.json().data.role, "EMPLOYEE");
  });

  test("nobody changes their own role", async () => {
    const res = await call("PATCH", `/api/admin/resources/users/${admin.id}`, { role: "MANAGER" }, admin);
    assert.equal(res.statusCode, 400, res.body);
  });

  test("a member still cannot open the admin", async () => {
    assert.equal((await call("GET", "/api/admin/resources/enquiries", undefined, member)).statusCode, 403);
  });
});
