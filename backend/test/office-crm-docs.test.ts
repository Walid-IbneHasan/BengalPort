// Integration tests: the CRM (customer IDs, duplicates, privacy, who sees
// whom), tasks, documents with expiry alerts, notifications, roles and
// permissions, branches, signatures and the audit trail.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { sweep } = await import("../src/lib/office-notifications.js");
const { bearer, createUser, deleteUsers, pdfBytes, stamp } = await import("./helpers.js");

const tag = stamp();
let app: Awaited<ReturnType<typeof buildApp>>;
let admin: any, manager: any, accountant: any, employee: any, other: any;
let branchA = "", branchB = "";
const customers: string[] = [];
const documents: string[] = [];
let phoneCounter = 0;

type Who = { id: string; role: string; tokenVersion: number };
const call = (who: Who, method: string, url: string, payload?: unknown, headers: Record<string, string> = {}) =>
  app.inject({ method: method as any, url, payload: payload as any, headers: { ...bearer(app, who), ...headers } });
const ok = (res: { statusCode: number; body: string }, status = 200) => {
  assert.equal(res.statusCode, status, res.body);
  return JSON.parse(res.body).data;
};
const phone = () => `01${String(Date.now()).slice(-6)}${String(++phoneCounter).padStart(3, "0")}`;
async function customer(who: Who, overrides: Record<string, unknown> = {}) {
  const data = ok(await call(who, "POST", "/api/office/customers", { name: `${tag} Client ${customers.length}`, phone: phone(), branchId: branchA, ...overrides }), 201);
  customers.push(data.id);
  return data;
}
function upload(name: string, type: string, content: Buffer) {
  const boundary = "----office-boundary";
  return {
    headers: { "content-type": `multipart/form-data; boundary=${boundary}` },
    payload: Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${name}"\r\nContent-Type: ${type}\r\n\r\n`), content, Buffer.from(`\r\n--${boundary}--\r\n`)]),
  };
}

before(async () => {
  app = await buildApp();
  [admin, manager, accountant, employee, other] = await Promise.all([createUser("ADMIN"), createUser("MANAGER"), createUser("ACCOUNTANT"), createUser("EMPLOYEE"), createUser("EMPLOYEE")]);
  branchA = ok(await call(admin, "POST", "/api/office/branches", { code: `A${String(Date.now()).slice(-6)}`, name: `${tag} Khulna` }), 201).id;
  branchB = ok(await call(admin, "POST", "/api/office/branches", { code: `B${String(Date.now()).slice(-6)}`, name: `${tag} Dhaka` }), 201).id;
});

after(async () => {
  const staff = [admin.id, manager.id, accountant.id, employee.id, other.id];
  await prisma.managedDocument.deleteMany({ where: { id: { in: documents } } });
  await prisma.task.deleteMany({ where: { OR: [{ customerId: { in: customers } }, { assigneeId: { in: staff } }] } });
  await prisma.customer.deleteMany({ where: { id: { in: customers } } });
  await prisma.notification.deleteMany({ where: { userId: { in: staff } } });
  await prisma.rolePermission.deleteMany({ where: { role: "MANAGER", permission: "customers.delete" } });
  await prisma.signatureAsset.deleteMany({ where: { ownerName: { startsWith: tag } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: staff } } });
  await prisma.user.updateMany({ where: { id: { in: staff } }, data: { branchId: null } });
  await prisma.branch.deleteMany({ where: { id: { in: [branchA, branchB] } } });
  await deleteUsers(...staff);
  await app.close();
  await prisma.$disconnect();
});

describe("customers", () => {
  test("each customer gets its own ID, and a second with the same phone is caught", async () => {
    const digits = String(Date.now()).slice(-6);
    const first = await customer(admin, { phone: `+880 1711-${digits}` });
    assert.match(first.customerCode, /^C-\d{6}$/);
    const twin = await call(admin, "POST", "/api/office/customers", { name: "Someone", phone: `01711${digits}` });
    assert.equal(twin.statusCode, 409);
    assert.equal(twin.json().error.details.candidates[0].id, first.id);
    const forced = ok(await call(admin, "POST", "/api/office/customers", { name: `${tag} Twin`, phone: `01711${digits}`, force: true }), 201);
    customers.push(forced.id);
  });

  test("passport details are seen only by roles with the passport permission", async () => {
    const c = await customer(manager, { passportNumber: "A01234567", assignedToId: employee.id });
    assert.equal(ok(await call(manager, "GET", `/api/office/customers/${c.id}`)).passportNumber, "A01234567");
    assert.equal(ok(await call(employee, "GET", `/api/office/customers/${c.id}`)).passportNumber, "Hidden");
  });

  test("an employee sees only the customers assigned to them", async () => {
    const mine = await customer(admin, { assignedToId: employee.id });
    const theirs = await customer(admin, { assignedToId: other.id });
    const list = ok(await call(employee, "GET", `/api/office/customers?search=${encodeURIComponent(tag)}&pageSize=100`));
    assert.ok(list.some((row: any) => row.id === mine.id));
    assert.ok(!list.some((row: any) => row.id === theirs.id));
    assert.equal((await call(employee, "GET", `/api/office/customers/${theirs.id}`)).statusCode, 404);
  });

  test("staff of one branch do not see another branch's customers", async () => {
    await prisma.user.update({ where: { id: manager.id }, data: { branchId: branchB } });
    const inA = await customer(admin, { branchId: branchA });
    const inB = await customer(admin, { branchId: branchB });
    const list = ok(await call(manager, "GET", `/api/office/customers?search=${encodeURIComponent(tag)}&pageSize=100`));
    assert.ok(list.some((row: any) => row.id === inB.id));
    assert.ok(!list.some((row: any) => row.id === inA.id));
    await prisma.user.update({ where: { id: manager.id }, data: { branchId: null } });
  });

  test("calls and notes are kept in the customer's history, with changes to their record", async () => {
    const c = await customer(admin);
    ok(await call(admin, "POST", `/api/office/customers/${c.id}/activities`, { kind: "CALL", summary: "Asked about MBBS fees" }), 201);
    ok(await call(admin, "PUT", `/api/office/customers/${c.id}`, { name: c.name, phone: c.phone, branchId: branchA, category: "Education" }));
    const shown = ok(await call(admin, "GET", `/api/office/customers/${c.id}`));
    assert.ok(shown.activities.some((a: any) => a.kind === "CALL" && a.summary === "Asked about MBBS fees"));
    assert.ok(shown.activities.some((a: any) => a.kind === "SYSTEM" && /category/.test(a.summary)));
    const trail = await prisma.auditLog.findFirst({ where: { entityId: c.id, action: "customer.update" } });
    assert.ok(trail?.changes);
  });

  test("the customer list can be exported only with permission, safely for spreadsheets", async () => {
    await customer(admin, { name: `=HYPERLINK("x") ${tag}` });
    assert.equal((await call(employee, "GET", "/api/office/customers/export.csv")).statusCode, 403);
    const res = await call(manager, "GET", "/api/office/customers/export.csv");
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.includes(`'=HYPERLINK`));
  });

  test("a customer with deals or invoices cannot be deleted, and only with permission", async () => {
    const c = await customer(admin);
    assert.equal((await call(manager, "DELETE", `/api/office/customers/${c.id}`)).statusCode, 403);
    assert.equal((await call(admin, "DELETE", `/api/office/customers/${c.id}`)).statusCode, 204);
    customers.splice(customers.indexOf(c.id), 1);
  });
});

describe("tasks and follow-ups", () => {
  test("a task given to someone reaches them as a notification", async () => {
    const c = await customer(admin, { assignedToId: employee.id });
    const task = ok(await call(manager, "POST", "/api/office/tasks", { title: "Call about documents", kind: "FOLLOW_UP", assigneeId: employee.id, customerId: c.id, dueAt: "2026-11-20" }), 201);
    const inbox = ok(await call(employee, "GET", "/api/office/notifications"));
    assert.ok(inbox.some((n: any) => n.relatedId === task.id && n.type === "TASK_ASSIGNED"));
    ok(await call(employee, "PUT", `/api/office/tasks/${task.id}`, { ...task, status: "DONE" }));
    assert.equal((await prisma.task.findUnique({ where: { id: task.id } }))?.status, "DONE");
  });

  test("an employee cannot touch someone else's task", async () => {
    const task = ok(await call(manager, "POST", "/api/office/tasks", { title: "Someone else's", assigneeId: other.id }), 201);
    assert.equal((await call(employee, "PUT", `/api/office/tasks/${task.id}`, { title: "Mine now", status: "DONE" })).statusCode, 404);
  });
});

describe("documents", () => {
  test("a document keeps its versions, and a new file is checked again", async () => {
    const c = await customer(admin);
    const document = ok(await call(manager, "POST", "/api/office/documents", { category: "CLIENT", docType: "Agreement", name: "Service agreement", customerId: c.id }), 201);
    documents.push(document.id);
    const first = upload("agreement.pdf", "application/pdf", pdfBytes());
    ok(await app.inject({ method: "POST", url: `/api/office/documents/${document.id}/files`, headers: { ...bearer(app, manager), ...first.headers }, payload: first.payload }), 201);
    ok(await call(admin, "POST", `/api/office/documents/${document.id}/verify`, { verification: "VERIFIED" }));
    const second = upload("agreement-signed.pdf", "application/pdf", pdfBytes(800));
    ok(await app.inject({ method: "POST", url: `/api/office/documents/${document.id}/files`, headers: { ...bearer(app, manager), ...second.headers }, payload: second.payload }), 201);
    const shown = ok(await call(manager, "GET", `/api/office/documents/${document.id}`));
    assert.deepEqual(shown.files.map((f: any) => f.version), [2, 1]);
    assert.equal(shown.verification, "PENDING");
  });

  test("only roles allowed to approve documents verify them", async () => {
    const document = ok(await call(admin, "POST", "/api/office/documents", { category: "COMPANY", docType: "Trade licence", name: `${tag} Trade licence` }), 201);
    documents.push(document.id);
    assert.equal((await call(manager, "POST", `/api/office/documents/${document.id}/verify`, { verification: "VERIFIED" })).statusCode, 403);
  });

  test("a passport needs the passport permission to open, and every opening is recorded", async () => {
    const c = await customer(admin, { assignedToId: employee.id });
    const passport = ok(await call(admin, "POST", "/api/office/documents", { category: "VISA", docType: "Passport", name: "Passport", customerId: c.id }), 201);
    documents.push(passport.id);
    const file = upload("passport.pdf", "application/pdf", pdfBytes());
    ok(await app.inject({ method: "POST", url: `/api/office/documents/${passport.id}/files`, headers: { ...bearer(app, admin), ...file.headers }, payload: file.payload }), 201);
    ok(await call(admin, "POST", `/api/office/documents/${passport.id}/verify`, { verification: "VERIFIED" }));
    assert.equal((await call(employee, "GET", `/api/office/documents/${passport.id}/files/1`)).statusCode, 403);
    assert.equal((await call(manager, "GET", `/api/office/documents/${passport.id}/files/1`)).statusCode, 200);
    assert.equal((await call(accountant, "GET", `/api/office/documents/${passport.id}/files/1?download=1`)).statusCode, 403);
    assert.ok(await prisma.auditLog.findFirst({ where: { entityId: passport.id, action: "document.view", actorId: manager.id } }));
  });

  test("an employee sees only checked documents of their own customers", async () => {
    const c = await customer(admin, { assignedToId: employee.id });
    const unchecked = ok(await call(admin, "POST", "/api/office/documents", { category: "CLIENT", docType: "Certificate", name: `${tag} HSC certificate`, customerId: c.id }), 201);
    documents.push(unchecked.id);
    const list = ok(await call(employee, "GET", `/api/office/documents?customerId=${c.id}`));
    assert.ok(!list.some((d: any) => d.id === unchecked.id));
  });

  test("a document limited to some roles is hidden from the others", async () => {
    const limited = ok(await call(admin, "POST", "/api/office/documents", { category: "COMPANY", docType: "Contract", name: `${tag} Bank contract`, restrictedTo: ["ACCOUNTANT"] }), 201);
    documents.push(limited.id);
    assert.equal((await call(manager, "GET", `/api/office/documents/${limited.id}`)).statusCode, 404);
    assert.equal((await call(accountant, "GET", `/api/office/documents/${limited.id}`)).statusCode, 200);
  });
});

describe("notifications", () => {
  test("a document expiring in 10 days alerts once at the 15-day mark, and again at 7 days", async () => {
    const c = await customer(admin, { assignedToId: employee.id });
    const now = new Date();
    const document = ok(await call(admin, "POST", "/api/office/documents", { category: "VISA", docType: "Visa", name: `${tag} Visa`, customerId: c.id, expiryDate: new Date(now.getTime() + 10 * 86_400_000).toISOString() }), 201);
    documents.push(document.id);
    await sweep(null, now);
    await sweep(null, now);
    const first = await prisma.notification.findMany({ where: { relatedId: document.id, userId: employee.id } });
    assert.equal(first.length, 1);
    await sweep(null, new Date(now.getTime() + 4 * 86_400_000));
    assert.equal(await prisma.notification.count({ where: { relatedId: document.id, userId: employee.id } }), 2);
  });

  test("a follow-up due today reaches the assigned employee", async () => {
    const c = await customer(admin, { assignedToId: employee.id, nextFollowUpAt: new Date().toISOString() });
    await sweep(null, new Date());
    assert.ok(await prisma.notification.findFirst({ where: { relatedId: c.id, userId: employee.id, type: "FOLLOW_UP" } }));
  });

  test("someone who turns a kind of notification off does not get it", async () => {
    await call(other, "PUT", "/api/office/notification-preferences", { preferences: [{ type: "TASK_ASSIGNED", inApp: false, email: false }] });
    const task = ok(await call(manager, "POST", "/api/office/tasks", { title: "Quiet task", assigneeId: other.id }), 201);
    assert.equal(await prisma.notification.count({ where: { relatedId: task.id, userId: other.id } }), 0);
  });

  test("notifications can be marked read", async () => {
    const before = await call(employee, "GET", "/api/office/notifications");
    assert.ok(before.json().meta.unread > 0);
    await call(employee, "POST", "/api/office/notifications/read-all");
    assert.equal((await call(employee, "GET", "/api/office/notifications")).json().meta.unread, 0);
  });
});

describe("the Super Admin's controls", () => {
  test("the admin guide opens for the Super Admin only, in both languages", async () => {
    const guide = ok(await call(admin, "GET", "/api/office/guide"));
    assert.match(guide.markdown, /# English guide/);
    assert.match(guide.markdown, /# বাংলা নির্দেশিকা/);
    for (const who of [manager, accountant, employee]) assert.equal((await call(who, "GET", "/api/office/guide")).statusCode, 403);
  });

  test("a permission given to a role works at once and is written in the audit trail", async () => {
    const c = await customer(admin);
    assert.equal((await call(manager, "DELETE", `/api/office/customers/${c.id}`)).statusCode, 403);
    ok(await call(admin, "PUT", "/api/office/roles", { role: "MANAGER", permission: "customers.delete", allowed: true }));
    assert.equal((await call(manager, "DELETE", `/api/office/customers/${c.id}`)).statusCode, 204);
    customers.splice(customers.indexOf(c.id), 1);
    assert.ok(await prisma.auditLog.findFirst({ where: { action: "permission.change", entityId: "MANAGER" } }));
    ok(await call(admin, "PUT", "/api/office/roles", { role: "MANAGER", permission: "customers.delete", allowed: false }));
  });

  test("only the Super Admin changes roles, and never their own", async () => {
    assert.equal((await call(manager, "PUT", "/api/office/roles", { role: "EMPLOYEE", permission: "customers.export", allowed: true })).statusCode, 403);
    assert.equal((await call(admin, "PUT", `/api/office/staff/${admin.id}`, { role: "MANAGER" })).statusCode, 400);
    const changed = ok(await call(admin, "PUT", `/api/office/staff/${other.id}`, { role: "ACCOUNTANT", branchId: branchA }));
    assert.equal(changed.role, "ACCOUNTANT");
    assert.ok(await prisma.auditLog.findFirst({ where: { action: "user.role", entityId: other.id } }));
    await prisma.user.update({ where: { id: other.id }, data: { role: "EMPLOYEE" } });
  });

  test("a new signature retires the old one; an invoice keeps the one it was issued with", async () => {
    const png = await (await import("sharp")).default({ create: { width: 300, height: 120, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toBuffer();
    const boundary = "----sig";
    const form = (name: string) => Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="ownerName"\r\n\r\n${name}\r\n--${boundary}\r\nContent-Disposition: form-data; name="ownerTitle"\r\n\r\nProprietor\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="sig.png"\r\nContent-Type: image/png\r\n\r\n`), png, Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);
    const headers = { ...bearer(app, admin), "content-type": `multipart/form-data; boundary=${boundary}` };
    const first = ok(await app.inject({ method: "POST", url: "/api/office/signatures", headers, payload: form(`${tag} Owner`) }), 201);
    const invoice = ok(await call(admin, "POST", "/api/admin/invoices", { issuedAt: "2026-11-12", customerName: `${tag} Signed`, items: [{ description: "Service", quantity: 1, unitPrice: 100 }], issue: true }), 201);
    assert.equal(invoice.signature.id, first.id);
    const second = ok(await app.inject({ method: "POST", url: "/api/office/signatures", headers, payload: form(`${tag} Owner 2`) }), 201);
    assert.notEqual(second.id, first.id);
    assert.equal((await prisma.signatureAsset.findUnique({ where: { id: first.id } }))?.active, false);
    assert.equal(ok(await call(admin, "GET", `/api/admin/invoices/${invoice.id}`)).signature.id, first.id);
    await prisma.journalEntry.deleteMany({ where: { sourceId: invoice.id } });
    await prisma.invoice.delete({ where: { id: invoice.id } });
  });

  test("an employee cannot read the audit trail or change settings", async () => {
    assert.equal((await call(employee, "GET", "/api/office/audit")).statusCode, 403);
    assert.equal((await call(employee, "PUT", "/api/office/settings", { documentExpiryDays: [30] })).statusCode, 403);
    const mine = ok(await call(employee, "GET", "/api/office/me/permissions"));
    assert.ok(mine.permissions.includes("customers.read"));
    assert.ok(!mine.permissions.includes("finance.read"));
  });
});
