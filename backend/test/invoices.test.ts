// Integration tests. They run against the database in backend/.env and remove
// every row they create.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { invoiceAmounts, invoiceNumber } = await import("../src/lib/invoices.js");
const { bearer, createUser, deleteUsers, pdfBytes, stamp } = await import("./helpers.js");

const tag = stamp();
let app: Awaited<ReturnType<typeof buildApp>>;
let admin: Awaited<ReturnType<typeof createUser>>;
let member: Awaited<ReturnType<typeof createUser>>;
const invoices: string[] = [];
const applications: string[] = [];
const enquiries: string[] = [];

const call = (
  method: "GET" | "POST" | "PUT" | "DELETE",
  url: string,
  payload?: Record<string, unknown>,
  who: typeof admin = admin,
) => app.inject({ method, url, payload, headers: bearer(app, who) });

const invoice = (overrides: Record<string, unknown> = {}) => ({
  issuedAt: "2026-11-08",
  customerName: `${tag} Rahim Uddin`,
  customerPhone: "01711000000",
  items: [
    { description: "Visa processing", quantity: 2, unitPrice: 1500 },
    { description: "Courier", quantity: 1, unitPrice: 250.5 },
  ],
  paid: 1000,
  ...overrides,
});

const generate = async (overrides: Record<string, unknown> = {}) => {
  const res = await call("POST", "/api/admin/invoices", invoice(overrides));
  assert.equal(res.statusCode, 201, res.body);
  invoices.push(res.json().data.id);
  return res.json().data;
};

const application = async () => {
  const row = await prisma.application.create({
    data: {
      reference: `BP-${stamp()}`.toUpperCase(),
      type: "EDUCATION",
      fullName: `${tag} Student`,
      email: `${tag}@example.test`,
      phone: "01711000001",
      details: { fullName: `${tag} Student`, preferredCountry: "Malaysia" },
    },
  });
  applications.push(row.id);
  return row;
};

before(async () => {
  app = await buildApp();
  admin = await createUser("ADMIN");
  member = await createUser("USER");
});

after(async () => {
  await prisma.invoice.deleteMany({ where: { id: { in: invoices } } });
  await prisma.applicationDocument.deleteMany({ where: { applicationId: { in: applications } } });
  await prisma.application.deleteMany({ where: { id: { in: applications } } });
  await prisma.enquiry.deleteMany({ where: { id: { in: enquiries } } });
  await deleteUsers(admin.id, member.id);
  await app.close();
  await prisma.$disconnect();
});

describe("what an invoice adds up to", () => {
  test("each line is rounded to paisa before the lines are added", () => {
    const items = [
      { description: "A", quantity: 1, unitPrice: 0.1 },
      { description: "B", quantity: 1, unitPrice: 0.2 },
    ];
    assert.equal(invoiceAmounts(items, 0).total, 0.3);
  });

  test("the part still owed is the total less what was paid", () => {
    const amounts = invoiceAmounts([{ description: "A", quantity: 3, unitPrice: 33.33 }], 50);
    assert.deepEqual(amounts, { total: 99.99, paid: 50, due: 49.99, status: "PARTIALLY_PAID" });
  });

  test("nothing paid is due, and everything paid is paid", () => {
    const items = [{ description: "A", quantity: 1, unitPrice: 500 }];
    assert.equal(invoiceAmounts(items, 0).status, "DUE");
    assert.equal(invoiceAmounts(items, 500).status, "PAID");
  });

  test("invoice numbers are padded to six digits", () => {
    assert.equal(invoiceNumber(42), "INV-000042");
  });
});

describe("generating an invoice", () => {
  test("it states the total, what was paid, what is due and the date", async () => {
    const created = await generate();
    assert.match(created.number, /^INV-\d{6}$/);
    assert.equal(created.total, 3250.5);
    assert.equal(created.paid, 1000);
    assert.equal(created.due, 2250.5);
    assert.equal(created.status, "PARTIALLY_PAID");
    assert.equal(created.issuedAt.slice(0, 10), "2026-11-08");
    assert.equal(created.items.length, 2);
  });

  test("the total comes from the lines, not from what the browser sends", async () => {
    const created = await generate({ total: 1 });
    assert.equal(created.total, 3250.5);
  });

  test("an invoice cannot record more paid than its total", async () => {
    const res = await call("POST", "/api/admin/invoices", invoice({ paid: 3250.51 }));
    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.message, /more than the total/i);
  });

  test("an invoice needs at least one line", async () => {
    const res = await call("POST", "/api/admin/invoices", invoice({ items: [] }));
    assert.equal(res.statusCode, 400);
  });

  test("an invoice needs a customer", async () => {
    const res = await call("POST", "/api/admin/invoices", invoice({ customerName: " " }));
    assert.equal(res.statusCode, 400);
  });

  test("an invoice for nothing is refused", async () => {
    const res = await call(
      "POST",
      "/api/admin/invoices",
      invoice({ items: [{ description: "Free", quantity: 1, unitPrice: 0 }], paid: 0 }),
    );
    assert.equal(res.statusCode, 400);
  });

  test("an invoice cannot point at an application that does not exist", async () => {
    const res = await call("POST", "/api/admin/invoices", invoice({ applicationId: "missing" }));
    assert.equal(res.statusCode, 400);
  });

  test("an invoice cannot point at a ledger entry that does not exist", async () => {
    const res = await call("POST", "/api/admin/invoices", invoice({ transactionId: "missing" }));
    assert.equal(res.statusCode, 400);
  });
});

describe("keeping invoices", () => {
  test("recording a later payment updates what is due and keeps the number", async () => {
    const created = await generate();
    const res = await call("PUT", `/api/admin/invoices/${created.id}`, invoice({ paid: 3250.5 }));
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().data.number, created.number);
    assert.equal(res.json().data.due, 0);
    assert.equal(res.json().data.status, "PAID");
  });

  test("a deleted invoice's number is never given to another", async () => {
    const first = await generate();
    assert.equal((await call("DELETE", `/api/admin/invoices/${first.id}`)).statusCode, 204);
    const next = await generate();
    assert.ok(next.serial > first.serial);
  });

  test("one invoice can be opened again", async () => {
    const created = await generate();
    const res = await call("GET", `/api/admin/invoices/${created.id}`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.number, created.number);
    assert.equal(res.json().data.due, 2250.5);
  });

  test("an unknown invoice is not found", async () => {
    assert.equal((await call("GET", "/api/admin/invoices/missing")).statusCode, 404);
    assert.equal((await call("PUT", "/api/admin/invoices/missing", invoice())).statusCode, 404);
    assert.equal((await call("DELETE", "/api/admin/invoices/missing")).statusCode, 404);
  });

  test("the list can be searched by customer", async () => {
    const created = await generate();
    const res = await call("GET", `/api/admin/invoices?page=1&pageSize=10&search=${encodeURIComponent(tag)}`);
    assert.equal(res.statusCode, 200);
    assert.ok(res.json().data.some((row: { id: string }) => row.id === created.id));
    assert.ok(res.json().meta.total >= 1);
  });

  test("the list can be searched by invoice number", async () => {
    const created = await generate();
    const res = await call("GET", `/api/admin/invoices?page=1&pageSize=10&search=${created.number}`);
    assert.deepEqual(res.json().data.map((row: { id: string }) => row.id), [created.id]);
  });

  test("the newest invoice comes first", async () => {
    await generate();
    const newest = await generate();
    const res = await call("GET", `/api/admin/invoices?page=1&pageSize=10&search=${encodeURIComponent(tag)}`);
    assert.equal(res.json().data[0].id, newest.id);
  });

  test("an invoice shows the application it was made for", async () => {
    const row = await application();
    const created = await generate({ applicationId: row.id });
    assert.equal(created.application.reference, row.reference);
  });

  test("an invoice outlives the application it was made for", async () => {
    const row = await application();
    const created = await generate({ applicationId: row.id });
    await prisma.application.delete({ where: { id: row.id } });
    const res = await call("GET", `/api/admin/invoices/${created.id}`);
    assert.equal(res.statusCode, 200);
    assert.equal(res.json().data.applicationId, null);
    assert.equal(res.json().data.customerName, `${tag} Rahim Uddin`);
  });
});

describe("who may use invoices", () => {
  test("a member cannot see or make invoices", async () => {
    assert.equal((await call("GET", "/api/admin/invoices", undefined, member)).statusCode, 403);
    assert.equal((await call("POST", "/api/admin/invoices", invoice(), member)).statusCode, 403);
  });

  test("a visitor who is not signed in cannot see invoices", async () => {
    const res = await app.inject({ method: "GET", url: "/api/admin/invoices" });
    assert.equal(res.statusCode, 401);
  });
});

describe("opening one submission to print", () => {
  test("an application comes with its answers and the names of its documents", async () => {
    const row = await application();
    await prisma.applicationDocument.create({
      data: { applicationId: row.id, name: "passport.pdf", mimeType: "application/pdf", byteSize: 600, data: pdfBytes() },
    });
    const res = await call("GET", `/api/admin/resources/applications/${row.id}`);
    assert.equal(res.statusCode, 200, res.body);
    const data = res.json().data;
    assert.equal(data.reference, row.reference);
    assert.equal(data.details.preferredCountry, "Malaysia");
    assert.equal(data.documents[0].name, "passport.pdf");
    assert.equal(data.documents[0].data, undefined);
  });

  test("an enquiry comes with its message and details", async () => {
    const row = await prisma.enquiry.create({
      data: { type: "UMRAH", name: `${tag} Karim`, phone: "01711000002", message: "Family of four", details: { subject: "Umrah in March" } },
    });
    enquiries.push(row.id);
    const res = await call("GET", `/api/admin/resources/enquiries/${row.id}`);
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().data.message, "Family of four");
    assert.equal(res.json().data.details.subject, "Umrah in March");
  });

  test("an unknown submission is not found", async () => {
    assert.equal((await call("GET", "/api/admin/resources/applications/missing")).statusCode, 404);
  });

  test("other kinds of record cannot be opened this way", async () => {
    assert.equal((await call("GET", `/api/admin/resources/users/${member.id}`)).statusCode, 404);
  });

  test("a member cannot open someone's submission here", async () => {
    const row = await application();
    assert.equal((await call("GET", `/api/admin/resources/applications/${row.id}`, undefined, member)).statusCode, 403);
  });
});
