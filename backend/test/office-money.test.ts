// Integration tests for the office's money work: deals, the invoice
// lifecycle, payments shared out between invoices, foreign currency,
// approvals, revenue recognition and the accounts staying balanced.
// Everything is created in a branch of its own and removed afterwards.
import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");
const { bearer, createUser, deleteUsers, stamp } = await import("./helpers.js");

const tag = stamp();
let app: Awaited<ReturnType<typeof buildApp>>;
let admin: any, manager: any, accountant: any, employee: any;
let branchId = "";
const customers: string[] = [];

type Who = { id: string; role: string; tokenVersion: number };
const call = (who: Who, method: string, url: string, payload?: unknown) =>
  app.inject({ method: method as any, url, payload: payload as any, headers: bearer(app, who) });
const ok = (res: { statusCode: number; body: string }, status = 200) => {
  assert.equal(res.statusCode, status, res.body);
  return JSON.parse(res.body).data;
};

async function customer(overrides: Record<string, unknown> = {}, who: Who = admin) {
  const data = ok(await call(who, "POST", "/api/office/customers", { name: `${tag} Customer ${customers.length}`, phone: `0171${String(Date.now()).slice(-7)}${customers.length}`.slice(0, 14), branchId, ...overrides }), 201);
  customers.push(data.id);
  return data;
}
async function deal(customerId: string, overrides: Record<string, unknown> = {}) {
  return ok(await call(admin, "POST", "/api/office/deals", { customerId, title: "MBBS admission, Malaysia", currency: "BDT", items: [{ description: "Admission service", quantity: 1, unitPrice: 100000 }], companyCommitments: "Admission letter within 60 days", clientCommitments: "Documents within 7 days", branchId, ...overrides }), 201);
}
async function issuedInvoice(dealId: string, body: Record<string, unknown> = {}) {
  const draft = ok(await call(admin, "POST", `/api/office/deals/${dealId}/invoice`, body), 201);
  ok(await call(admin, "POST", `/api/admin/invoices/${draft.id}/issue`));
  return ok(await call(admin, "GET", `/api/admin/invoices/${draft.id}`));
}
const linesOf = (entryIds: string[]) => prisma.journalLine.findMany({ where: { entryId: { in: entryIds } }, include: { account: true } });
const sumFor = (lines: any[], code: string, side: "debit" | "credit") => lines.filter((l) => l.account.code === code).reduce((s, l) => s + Number(l[side]), 0);

before(async () => {
  app = await buildApp();
  [admin, manager, accountant, employee] = await Promise.all([createUser("ADMIN"), createUser("MANAGER"), createUser("ACCOUNTANT"), createUser("EMPLOYEE")]);
  ok(await call(admin, "GET", "/api/office/branches"));
  const branch = ok(await call(admin, "POST", "/api/office/branches", { code: `T${String(Date.now()).slice(-6)}`, name: `${tag} Branch` }), 201);
  branchId = branch.id;
});

after(async () => {
  const deals = await prisma.deal.findMany({ where: { customerId: { in: customers } }, select: { id: true } });
  const invoices = await prisma.invoice.findMany({ where: { OR: [{ customerId: { in: customers } }, { dealId: { in: deals.map((d) => d.id) } }] }, select: { id: true } });
  const payments = await prisma.payment.findMany({ where: { customerId: { in: customers } }, select: { id: true } });
  const ids = [...invoices.map((i) => i.id), ...payments.map((p) => p.id), ...deals.map((d) => d.id)];
  await prisma.financialTransaction.deleteMany({ where: { OR: [{ paymentId: { in: payments.map((p) => p.id) } }, { refund: { paymentId: { in: payments.map((p) => p.id) } } }] } });
  await prisma.journalEntry.deleteMany({ where: { OR: [{ sourceId: { in: ids } }, { branchId }] } });
  await prisma.approvalRequest.deleteMany({ where: { entityId: { in: ids } } });
  await prisma.paymentAllocation.deleteMany({ where: { paymentId: { in: payments.map((p) => p.id) } } });
  await prisma.refund.deleteMany({ where: { paymentId: { in: payments.map((p) => p.id) } } });
  await prisma.receipt.deleteMany({ where: { paymentId: { in: payments.map((p) => p.id) } } });
  await prisma.payment.deleteMany({ where: { id: { in: payments.map((p) => p.id) } } });
  await prisma.creditNote.deleteMany({ where: { invoiceId: { in: invoices.map((i) => i.id) } } });
  await prisma.invoice.deleteMany({ where: { id: { in: invoices.map((i) => i.id) } } });
  await prisma.task.deleteMany({ where: { customerId: { in: customers } } });
  await prisma.deal.deleteMany({ where: { id: { in: deals.map((d) => d.id) } } });
  await prisma.customer.deleteMany({ where: { id: { in: customers } } });
  await prisma.auditLog.deleteMany({ where: { actorId: { in: [admin.id, manager.id, accountant.id, employee.id] } } });
  await prisma.branch.deleteMany({ where: { id: branchId } });
  await deleteUsers(admin.id, manager.id, accountant.id, employee.id);
  await app.close();
  await prisma.$disconnect();
});

describe("a deal and its invoice", () => {
  test("a deal holds the services, timeline, commitments and the standard terms", async () => {
    const c = await customer();
    const d = await deal(c.id, { startDate: "2026-11-15", endDate: "2027-01-15" });
    assert.match(d.dealNumber, /^D-\d{6}$/);
    assert.equal(Number(d.total), 100000);
    assert.match(d.terms, /Cancellation/);
  });

  test("an invoice made from a deal is a draft with the deal's details, and issuing it is not revenue", async () => {
    const c = await customer();
    const d = await deal(c.id);
    const draft = ok(await call(admin, "POST", `/api/office/deals/${d.id}/invoice`), 201);
    const shown = ok(await call(admin, "GET", `/api/admin/invoices/${draft.id}`));
    assert.equal(shown.status, "DRAFT");
    assert.equal(shown.companyCommitments, "Admission letter within 60 days");
    const issued = ok(await call(admin, "POST", `/api/admin/invoices/${draft.id}/issue`));
    assert.equal(issued.status, "SENT");
    const lines = await linesOf([issued.journalEntryId]);
    assert.equal(sumFor(lines, "1100", "debit"), 100000);
    assert.equal(sumFor(lines, "2200", "credit"), 100000);
    assert.equal(sumFor(lines, "4000", "credit"), 0);
  });

  test("an issued invoice is not edited or deleted; a revision keeps the old version", async () => {
    const c = await customer();
    const invoice = await issuedInvoice((await deal(c.id)).id);
    const body = { issuedAt: "2026-11-12", customerName: c.name, customerId: c.id, items: [{ description: "Admission service", quantity: 1, unitPrice: 120000 }] };
    assert.equal((await call(admin, "PUT", `/api/admin/invoices/${invoice.id}`, body)).statusCode, 409);
    assert.equal((await call(admin, "DELETE", `/api/admin/invoices/${invoice.id}`)).statusCode, 409);
    const revised = ok(await call(admin, "POST", `/api/admin/invoices/${invoice.id}/revise`, { ...body, reason: "Hostel added" }));
    assert.equal(revised.version, 2);
    assert.equal(revised.total, 120000);
    const revisions = ok(await call(admin, "GET", `/api/admin/invoices/${invoice.id}/revisions`));
    assert.equal(revisions[0].version, 1);
    assert.equal(Number(revisions[0].snapshot.total), 100000);
    const original = await prisma.journalEntry.findUnique({ where: { id: invoice.journalEntryId } });
    assert.equal(original?.status, "REVERSED");
  });

  test("a shared invoice opens with its link and nothing else", async () => {
    const c = await customer({ phone: "01711-000111" });
    const invoice = await issuedInvoice((await deal(c.id)).id);
    const shared = ok(await call(admin, "POST", `/api/admin/invoices/${invoice.id}/share`));
    assert.match(shared.whatsapp, /^https:\/\/wa\.me\/880\d+\?text=/);
    const key = new URL(shared.url).searchParams.get("key");
    const opened = await app.inject({ method: "GET", url: `/api/share/invoice/${invoice.id}?key=${encodeURIComponent(key!)}` });
    assert.equal(opened.statusCode, 200, opened.body);
    assert.equal(opened.json().data.number, invoice.number);
    assert.equal((await app.inject({ method: "GET", url: `/api/share/invoice/${invoice.id}?key=nonsense` })).statusCode, 404);
    assert.equal((await app.inject({ method: "GET", url: `/api/share/invoice/${invoice.id}` })).statusCode, 404);
  });
});

describe("payments", () => {
  test("a payment pays the invoices it is given to; the rest is the customer's advance", async () => {
    const c = await customer();
    const invoice = await issuedInvoice((await deal(c.id)).id);
    const payment = ok(await call(accountant, "POST", "/api/office/payments", { customerId: c.id, amount: 30000, method: "bKash", allocations: [{ invoiceId: invoice.id, amount: 10000 }] }), 201);
    assert.equal(payment.allocated, 10000);
    assert.equal(payment.unallocated, 20000);
    const after = ok(await call(admin, "GET", `/api/admin/invoices/${invoice.id}`));
    assert.equal(after.paid, 10000);
    assert.equal(after.status, "PARTIAL");
    const lines = await linesOf([payment.id ? (await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).journalEntryId! : ""]);
    assert.equal(sumFor(lines, "1020", "debit"), 30000);
    assert.equal(sumFor(lines, "1100", "credit"), 10000);
    assert.equal(sumFor(lines, "2100", "credit"), 20000);
    // It is in the cash book as well, posted once.
    const cash = await prisma.financialTransaction.findFirst({ where: { paymentId: payment.id } });
    assert.equal(cash?.journalEntryId, (await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).journalEntryId);
  });

  test("an advance is given to an invoice later, and the invoice is paid", async () => {
    const c = await customer();
    const invoice = await issuedInvoice((await deal(c.id, { items: [{ description: "Visa", quantity: 1, unitPrice: 20000 }] })).id);
    const payment = ok(await call(accountant, "POST", "/api/office/payments", { customerId: c.id, amount: 20000, method: "Cash" }), 201);
    ok(await call(accountant, "POST", `/api/office/payments/${payment.id}/allocate`, { allocations: [{ invoiceId: invoice.id, amount: 20000 }] }));
    assert.equal(ok(await call(admin, "GET", `/api/admin/invoices/${invoice.id}`)).status, "PAID");
  });

  test("a bill for a website application is issued without touching the accounts", async () => {
    const c = await customer();
    const application = await prisma.application.create({ data: { reference: `BP-${stamp()}`.toUpperCase().slice(0, 24), type: "EDUCATION", fullName: "Applicant", email: `${tag}-app@example.test`, phone: "01711000000", details: {}, customerId: c.id } });
    try {
      const made = ok(await call(admin, "POST", "/api/admin/invoices", { issuedAt: new Date().toISOString(), customerName: "Applicant", customerId: c.id, applicationId: application.id, items: [{ description: "Application fee", quantity: 1, unitPrice: 5000 }], paid: 2000, issue: true }), 201);
      const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: made.id } });
      assert.equal(invoice.state, "ISSUED");
      assert.equal(invoice.journalEntryId, null);
      assert.equal(await prisma.journalEntry.count({ where: { sourceId: made.id } }), 0);
      // Office payments cannot be put against it, and it is not in the receivables report.
      const open = ok(await call(accountant, "GET", `/api/office/customers/${c.id}/open-invoices`));
      assert.ok(!open.some((row: any) => row.id === made.id));
      const refused = await call(accountant, "POST", "/api/office/payments", { customerId: c.id, amount: 3000, method: "Cash", allocations: [{ invoiceId: made.id, amount: 3000 }] });
      assert.equal(refused.statusCode, 400, refused.body);
      assert.match(refused.json().error.message, /through its application/);
      const receivables = ok(await call(accountant, "GET", "/api/office/reports/receivables"));
      assert.ok(!receivables.rows.some((row: any) => row.id === made.id));
      // A credit note on it is recorded without a posting.
      ok(await call(admin, "POST", `/api/admin/invoices/${made.id}/credit-notes`, { amount: 500, reason: "Early-bird discount" }));
      assert.equal(await prisma.journalEntry.count({ where: { sourceId: made.id } }), 0);
    } finally {
      await prisma.creditNote.deleteMany({ where: { invoice: { applicationId: application.id } } });
      await prisma.invoice.deleteMany({ where: { applicationId: application.id } });
      await prisma.application.delete({ where: { id: application.id } });
    }
  });

  test("a payment cannot pay more than an invoice owes, or be shared out twice", async () => {
    const c = await customer();
    const invoice = await issuedInvoice((await deal(c.id, { items: [{ description: "Visa", quantity: 1, unitPrice: 5000 }] })).id);
    const res = await call(accountant, "POST", "/api/office/payments", { customerId: c.id, amount: 9000, method: "Cash", allocations: [{ invoiceId: invoice.id, amount: 6000 }] });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.message, /5,000/);
    const payment = ok(await call(accountant, "POST", "/api/office/payments", { customerId: c.id, amount: 3000, method: "Cash" }), 201);
    assert.equal((await call(accountant, "POST", `/api/office/payments/${payment.id}/allocate`, { allocations: [{ invoiceId: invoice.id, amount: 4000 }] })).statusCode, 400);
  });

  test("a dollar invoice paid at a better rate shows an exchange gain", async () => {
    const c = await customer();
    const invoice = await issuedInvoice((await deal(c.id, { currency: "USD", items: [{ description: "Tuition", quantity: 1, unitPrice: 1000 }] })).id, { exchangeRate: 120 });
    assert.equal(invoice.currency, "USD");
    assert.equal(invoice.exchangeRate, 120);
    const payment = ok(await call(accountant, "POST", "/api/office/payments", { customerId: c.id, amount: 1000, currency: "USD", exchangeRate: 122, method: "Bank transfer", allocations: [{ invoiceId: invoice.id, amount: 1000 }] }), 201);
    const entry = (await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).journalEntryId!;
    const lines = await linesOf([entry]);
    assert.equal(sumFor(lines, "1010", "debit"), 122000);
    assert.equal(sumFor(lines, "1100", "credit"), 120000);
    assert.equal(sumFor(lines, "4900", "credit"), 2000);
    const usd = lines.find((l) => l.account.code === "1010");
    assert.equal(usd?.currency, "USD");
    assert.equal(Number(usd?.amount), 1000);
    // The customer's page adds up in taka, at the invoice's own rate.
    const profile = ok(await call(admin, "GET", `/api/office/customers/${c.id}`));
    assert.deepEqual(profile.summary, { invoiced: 120000, paid: 120000, due: 0 });
  });

  test("a refund by an accountant happens at once and comes off the advance", async () => {
    const c = await customer();
    const payment = ok(await call(accountant, "POST", "/api/office/payments", { customerId: c.id, amount: 8000, method: "Cash" }), 201);
    const res = await call(accountant, "POST", `/api/office/payments/${payment.id}/refund`, { amount: 3000, reason: "Overpaid", method: "Cash" });
    assert.equal(res.statusCode, 201, res.body);
    const refund = await prisma.refund.findFirstOrThrow({ where: { paymentId: payment.id } });
    assert.equal(Number(refund.amount), 3000);
  });
});

describe("approvals for high-risk actions", () => {
  test("a manager's credit note waits for an approver, who is never the one who asked", async () => {
    const c = await customer();
    const invoice = await issuedInvoice((await deal(c.id)).id);
    const asked = await call(manager, "POST", `/api/admin/invoices/${invoice.id}/credit-notes`, { amount: 5000, reason: "Discount agreed" });
    assert.equal(asked.statusCode, 202, asked.body);
    const approvalId = asked.json().data.approvalId;
    assert.equal((await prisma.creditNote.count({ where: { invoiceId: invoice.id } })), 0);
    assert.equal((await call(manager, "POST", `/api/office/approvals/${approvalId}/decide`, { approve: true })).statusCode, 403);
    ok(await call(accountant, "POST", `/api/office/approvals/${approvalId}/decide`, { approve: true }));
    const after = ok(await call(admin, "GET", `/api/admin/invoices/${invoice.id}`));
    assert.equal(after.credited, 5000);
    assert.equal(after.due, 95000);
    assert.equal(after.creditNotes[0].reference.slice(0, 3), "CN-");
  });

  test("an invoice with money received cannot be cancelled; an unpaid one can", async () => {
    const c = await customer();
    const paidOne = await issuedInvoice((await deal(c.id)).id);
    ok(await call(accountant, "POST", "/api/office/payments", { customerId: c.id, amount: 1000, method: "Cash", allocations: [{ invoiceId: paidOne.id, amount: 1000 }] }), 201);
    const refused = await call(admin, "POST", `/api/admin/invoices/${paidOne.id}/cancel`, { reason: "Client withdrew" });
    assert.equal(refused.statusCode, 409);
    assert.match(refused.json().error.message, /refund|credit note/i);
    const unpaid = await issuedInvoice((await deal(c.id)).id);
    assert.equal(ok(await call(admin, "POST", `/api/admin/invoices/${unpaid.id}/cancel`, { reason: "Client withdrew" })).status, "CANCELLED");
  });

  test("a journal entry reversed by an accountant waits for the administrator", async () => {
    const accounts = ok(await call(admin, "GET", "/api/office/ledger-accounts"));
    const cash = accounts.find((a: any) => a.code === "1000"), equity = accounts.find((a: any) => a.code === "3000");
    const entry = ok(await call(admin, "POST", "/api/office/journal", { date: "2026-11-12", memo: `${tag} owner's investment`, branchId, lines: [{ accountId: cash.id, debit: 500 }, { accountId: equity.id, credit: 500 }] }), 201);
    assert.equal((await call(accountant, "POST", `/api/office/journal/${entry.id}/reverse`, { reason: "Entered twice" })).statusCode, 202);
    ok(await call(admin, "POST", `/api/office/journal/${entry.id}/reverse`, { reason: "Entered twice" }), 201);
    assert.equal((await prisma.journalEntry.findUnique({ where: { id: entry.id } }))?.status, "REVERSED");
  });

  test("an unbalanced journal entry is refused with the two totals", async () => {
    const accounts = ok(await call(admin, "GET", "/api/office/ledger-accounts"));
    const cash = accounts.find((a: any) => a.code === "1000"), equity = accounts.find((a: any) => a.code === "3000");
    const res = await call(admin, "POST", "/api/office/journal", { date: "2026-11-12", memo: "Wrong", lines: [{ accountId: cash.id, debit: 500 }, { accountId: equity.id, credit: 400 }] });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().error.message, /debits.*500.*credits.*400/i);
  });
});

describe("revenue and the dashboard", () => {
  test("completing a deal recognises its invoiced revenue, and the dashboard shows it", async () => {
    const c = await customer();
    const d = await deal(c.id, { items: [{ description: "Health check-up", quantity: 1, unitPrice: 40000 }] });
    await issuedInvoice(d.id);
    const before = ok(await call(admin, "GET", `/api/office/dashboard?branchId=${branchId}&from=2026-01-01&to=2030-12-31`));
    ok(await call(admin, "POST", `/api/office/deals/${d.id}/status`, { action: "activate" }));
    const done = ok(await call(admin, "POST", `/api/office/deals/${d.id}/status`, { action: "complete" }));
    assert.equal(done.status, "COMPLETED");
    assert.equal(done.recognized, 40000);
    const after = ok(await call(admin, "GET", `/api/office/dashboard?branchId=${branchId}&from=2026-01-01&to=2030-12-31`));
    assert.equal(after.money.revenue - before.money.revenue, 40000);
  });

  test("an employee's dashboard has no money figures", async () => {
    const data = ok(await call(employee, "GET", "/api/office/dashboard"));
    assert.equal(data.money, null);
  });

  test("the books balance: trial balance and balance sheet", async () => {
    const trial = ok(await call(accountant, "GET", "/api/office/reports/trial-balance"));
    assert.equal(Math.round(trial.totalDebit * 100), Math.round(trial.totalCredit * 100));
    const sheet = ok(await call(accountant, "GET", "/api/office/reports/balance-sheet"));
    assert.equal(sheet.balanced, true);
    const receivables = ok(await call(accountant, "GET", "/api/office/reports/receivables"));
    assert.ok(receivables.buckets.total >= 0);
  });

  test("a budget is compared with what was really spent", async () => {
    const accounts = ok(await call(admin, "GET", "/api/office/ledger-accounts"));
    const expense = accounts.find((a: any) => a.code === "5000");
    ok(await call(accountant, "POST", "/api/office/budgets", { name: `${tag} Office budget`, periodStart: "2026-11-01", periodEnd: "2026-11-30", branchId, lines: [{ accountId: expense.id, amount: 10000 }] }), 201);
    const budgets = ok(await call(accountant, "GET", "/api/office/budgets"));
    const mine = budgets.find((b: any) => b.name === `${tag} Office budget`);
    assert.equal(mine.lines[0].budget, 10000);
    await prisma.budget.deleteMany({ where: { name: `${tag} Office budget` } });
  });

  test("an employee cannot see the accounts", async () => {
    assert.equal((await call(employee, "GET", "/api/office/ledger-accounts")).statusCode, 403);
    assert.equal((await call(employee, "POST", "/api/office/payments", { customerId: "x", amount: 1 })).statusCode, 403);
  });
});
