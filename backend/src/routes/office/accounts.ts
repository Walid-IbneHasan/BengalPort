// Accounts and finance: the chart of accounts, the journal, transfers,
// budgets and the reports.
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { need, staffOf } from "../../lib/access.js";
import { audit } from "../../lib/audit.js";
import { accountSchema, budgetSchema, journalSchema, reversalSchema, transferSchema } from "../../lib/office-schemas.js";
import { accountBalances, agingBuckets, balanceSheet, budgetVsActual, cashFlow, journalNumber, MONEY_SUBTYPES, PostingError, postJournal, profitAndLoss, round2, toBase, trialBalance } from "../../lib/accounting.js";
import { invoiceNumberText } from "../../lib/invoice-lifecycle.js";
import { invoiceFigures, OfficeError } from "../../lib/office-service.js";
import { doOrAsk } from "../../lib/approvals.js";
import { dayWindow } from "../../lib/ledger.js";
import { csv, invalid, problem, withCode } from "./common.js";

// "2026-11-01" .. "2026-11-30" as whole days in Bangladesh.
function range(query: { from?: string; to?: string }) {
  const from = query.from ? dayWindow(query.from)?.start ?? null : null;
  const to = query.to ? dayWindow(query.to)?.end ?? null : null;
  return { from, to };
}

const accounts: FastifyPluginAsync = async (app) => {
  const fail = (reply: any, error: unknown) => {
    if (error instanceof OfficeError || error instanceof PostingError) return problem(reply, (error as any).statusCode, (error as any).code, error.message);
    if ((error as any)?.statusCode) return problem(reply, (error as any).statusCode, "REFUSED", (error as Error).message);
    throw error;
  };

  // ---- Chart of accounts ---------------------------------------------------
  app.get("/ledger-accounts", { preHandler: need("accounts.read") }, async () => {
    const balances = await accountBalances(prisma);
    const accounts = await prisma.ledgerAccount.findMany({ orderBy: { code: "asc" } });
    const sums = new Map(balances.map((row) => [row.id, row]));
    return {
      data: accounts.map((account) => {
        const sum = sums.get(account.id) ?? { debit: 0, credit: 0 };
        const natural = account.type === "ASSET" || account.type === "EXPENSE" ? sum.debit - sum.credit : sum.credit - sum.debit;
        return { ...account, balance: round2(natural) };
      }),
    };
  });

  app.post("/ledger-accounts", { preHandler: need("accounts.create") }, async (req, reply) => {
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (await prisma.ledgerAccount.count({ where: { code: parsed.data.code } })) return problem(reply, 409, "CODE_TAKEN", `Account ${parsed.data.code} already exists.`);
    const account = await prisma.ledgerAccount.create({ data: parsed.data });
    await audit(req, { action: "account.create", entityType: "ledger-account", entityId: account.id, summary: `${account.code} ${account.name}` });
    return reply.code(201).send({ data: account });
  });

  app.put("/ledger-accounts/:id", { preHandler: need("accounts.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const before = await prisma.ledgerAccount.findUnique({ where: { id }, include: { _count: { select: { lines: true } } } });
    if (!before) return reply.notFound("Account not found");
    const parsed = accountSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    // Postings already made keep their meaning: an account with postings
    // (or a built-in one) keeps its code and kind.
    if ((before.system || before._count.lines) && (parsed.data.code !== before.code || parsed.data.type !== before.type))
      return problem(reply, 409, "ACCOUNT_IN_USE", "This account has postings or is built in, so its code and kind cannot change. Its name can.");
    if (before.system && !parsed.data.active) return problem(reply, 409, "SYSTEM_ACCOUNT", "Built-in accounts stay active.");
    const account = await prisma.ledgerAccount.update({ where: { id }, data: parsed.data });
    await audit(req, { action: "account.update", entityType: "ledger-account", entityId: id, summary: `${account.code} ${account.name}` });
    return { data: account };
  });

  // ---- Journal -------------------------------------------------------------
  app.get("/journal", { preHandler: need("accounts.read") }, async (req) => {
    const query = req.query as { from?: string; to?: string; accountId?: string; search?: string; sourceType?: string };
    const { from, to } = range(query);
    const search = String(query.search ?? "").trim();
    const number = search.match(/^JE-?0*(\d+)$/i);
    const rows = await prisma.journalEntry.findMany({
      where: {
        ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
        ...(query.accountId ? { lines: { some: { accountId: query.accountId } } } : {}),
        ...(query.sourceType ? { sourceType: query.sourceType } : {}),
        ...(search ? { OR: [{ memo: { contains: search, mode: "insensitive" } }, ...(number ? [{ number: Number(number[1]) }] : [])] } : {}),
      },
      include: { lines: { include: { account: { select: { code: true, name: true } } } }, reversalOf: { select: { number: true } }, reversedBy: { select: { number: true } } },
      orderBy: [{ date: "desc" }, { number: "desc" }],
      take: 300,
    });
    return {
      data: rows.map((row) => ({
        ...row,
        reference: journalNumber(row.number),
        reversalOf: row.reversalOf ? journalNumber(row.reversalOf.number) : null,
        reversedBy: row.reversedBy ? journalNumber(row.reversedBy.number) : null,
        lines: row.lines.map((line) => ({ ...line, debit: Number(line.debit), credit: Number(line.credit), amount: Number(line.amount), exchangeRate: Number(line.exchangeRate) })),
      })),
    };
  });

  app.post("/journal", { preHandler: need("accounts.create") }, async (req, reply) => {
    const parsed = journalSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const staff = await staffOf(req);
    try {
      const entry = await postJournal(prisma, {
        date: parsed.data.date,
        memo: parsed.data.memo,
        sourceType: "manual",
        branchId: parsed.data.branchId ?? staff.branchId,
        by: staff,
        lines: parsed.data.lines.map((line) => ({
          account: line.accountId,
          debit: line.debit ? toBase(line.debit, line.exchangeRate) : 0,
          credit: line.credit ? toBase(line.credit, line.exchangeRate) : 0,
          currency: line.currency,
          amount: line.debit || line.credit,
          exchangeRate: line.exchangeRate,
          customerId: line.customerId,
          memo: line.memo,
        })),
      });
      await audit(req, { action: "journal.post", entityType: "journal", entityId: entry.id, summary: `${journalNumber(entry.number)}: ${entry.memo}` });
      return reply.code(201).send({ data: { ...entry, reference: journalNumber(entry.number) } });
    } catch (error) {
      return fail(reply, error);
    }
  });

  // Undo a posting with a reversal; asks for approval without accounts.approve.
  app.post("/journal/:id/reverse", { preHandler: need("accounts.create") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const parsed = reversalSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    const entry = await prisma.journalEntry.findUnique({ where: { id } });
    if (!entry) return reply.notFound("Journal entry not found");
    if (entry.sourceType && !["manual", "transfer"].includes(entry.sourceType))
      return problem(reply, 409, "MADE_BY_SYSTEM", "This entry was made by an invoice, payment or Hisab Kitab entry. Correct it there (revision, credit note, refund or a change to the entry).");
    const staff = await staffOf(req);
    try {
      const outcome = await doOrAsk(app, { role: staff.role, by: { id: staff.id, name: staff.name } }, "JOURNAL_REVERSAL", { type: "journal", id, summary: `Reverse ${journalNumber(entry.number)} (${entry.memo}): ${parsed.data.reason}` }, parsed.data);
      await audit(req, { action: outcome.done ? "journal.reverse" : "approval.request", entityType: "journal", entityId: id, summary: `${outcome.done ? "Reversed" : "Asked to reverse"} ${journalNumber(entry.number)}: ${parsed.data.reason}` });
      return outcome.done ? reply.code(201).send({ data: { done: true } }) : reply.code(202).send({ data: { done: false, approvalId: outcome.approval.id, message: "Your request is waiting for an approver." } });
    } catch (error) {
      return fail(reply, error);
    }
  });

  // Money moved between the cash, bank and mobile accounts.
  app.post("/transfers", { preHandler: need("accounts.create") }, async (req, reply) => {
    const parsed = transferSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (parsed.data.fromAccountId === parsed.data.toAccountId) return problem(reply, 400, "SAME_ACCOUNT", "Choose two different accounts.");
    const pair = await prisma.ledgerAccount.findMany({ where: { id: { in: [parsed.data.fromAccountId, parsed.data.toAccountId] }, subtype: { in: MONEY_SUBTYPES } } });
    if (pair.length !== 2) return problem(reply, 400, "NOT_MONEY_ACCOUNT", "Transfers are between cash, bank and mobile banking accounts.");
    const staff = await staffOf(req);
    const from = pair.find((a) => a.id === parsed.data.fromAccountId)!, to = pair.find((a) => a.id === parsed.data.toAccountId)!;
    const entry = await postJournal(prisma, {
      date: parsed.data.date,
      memo: parsed.data.memo || `Transfer from ${from.name} to ${to.name}`,
      sourceType: "transfer",
      by: staff,
      lines: [{ account: to.id, debit: parsed.data.amount }, { account: from.id, credit: parsed.data.amount }],
    });
    await audit(req, { action: "journal.transfer", entityType: "journal", entityId: entry.id, summary: `৳${parsed.data.amount} from ${from.name} to ${to.name}` });
    return reply.code(201).send({ data: { ...entry, reference: journalNumber(entry.number) } });
  });

  // ---- Reports -------------------------------------------------------------
  app.get("/reports/profit-and-loss", { preHandler: need("accounts.read") }, async (req) => {
    const query = req.query as { from?: string; to?: string; branchId?: string };
    const { from, to } = range(query);
    return { data: { from: query.from ?? null, to: query.to ?? null, ...profitAndLoss(await accountBalances(prisma, { from, to, branchId: query.branchId || null })) } };
  });

  app.get("/reports/balance-sheet", { preHandler: need("accounts.read") }, async (req) => {
    const query = req.query as { to?: string; branchId?: string };
    const { to } = range(query);
    return { data: { to: query.to ?? null, ...balanceSheet(await accountBalances(prisma, { to, branchId: query.branchId || null })) } };
  });

  app.get("/reports/trial-balance", { preHandler: need("accounts.read") }, async (req) => {
    const query = req.query as { to?: string };
    return { data: trialBalance(await accountBalances(prisma, { to: range(query).to })) };
  });

  app.get("/reports/cash-flow", { preHandler: need("accounts.read") }, async (req) => {
    const query = req.query as { from?: string; to?: string };
    const { from, to } = range(query);
    const accounts = await prisma.ledgerAccount.findMany();
    const names = new Map(accounts.map((a) => [a.id, { name: a.name, money: MONEY_SUBTYPES.includes(String(a.subtype)) }]));
    const moneyIds = accounts.filter((a) => MONEY_SUBTYPES.includes(String(a.subtype))).map((a) => a.id);
    const before = from ? await accountBalances(prisma, { to: new Date(from.getTime() - 1) }) : [];
    const opening = before.filter((row) => moneyIds.includes(String(row.id))).reduce((sum, row) => sum + row.debit - row.credit, 0);
    const entries = await prisma.journalEntry.findMany({
      where: { ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}), lines: { some: { accountId: { in: moneyIds } } } },
      select: { lines: { select: { accountId: true, debit: true, credit: true } } },
    });
    return { data: { from: query.from ?? null, to: query.to ?? null, ...cashFlow(entries.map((entry) => ({ lines: entry.lines.map((l) => ({ accountId: l.accountId, debit: Number(l.debit), credit: Number(l.credit) })) })), names, opening) } };
  });

  // What each customer owes, by how late it is.
  app.get("/reports/receivables", { preHandler: need("accounts.read") }, async () => {
    // Only invoices in the books; bills for applications and Hisab Kitab
    // entries are settled through the cash book.
    const invoices = await prisma.invoice.findMany({ where: { state: "ISSUED", journalEntryId: { not: null } }, include: { creditNotes: { select: { amount: true } }, customer: { select: { id: true, code: true, name: true } } } });
    const now = new Date();
    const rows = invoices
      .map((invoice) => {
        const figures = invoiceFigures(invoice);
        return { id: invoice.id, number: invoiceNumberText(invoice.serial), customer: invoice.customer ? withCode(invoice.customer) : { name: invoice.customerName }, dueAt: invoice.dueAt, currency: invoice.currency, due: figures.due, dueBase: toBase(figures.due, Number(invoice.exchangeRate)), status: figures.status };
      })
      .filter((row) => row.due > 0);
    return { data: { rows, buckets: agingBuckets(rows.map((row) => ({ due: row.dueBase, dueAt: row.dueAt })), now) } };
  });

  // Bills entered as still due in Hisab Kitab.
  app.get("/reports/payables", { preHandler: need("accounts.read") }, async () => {
    const rows = await prisma.financialTransaction.findMany({ where: { type: "EXPENSE", paymentStatus: { in: ["DUE", "PENDING"] } }, include: { category: { select: { name: true } } }, orderBy: { date: "asc" } });
    return { data: { rows: rows.map((row) => ({ ...row, total: Number(row.total) })), total: round2(rows.reduce((sum, row) => sum + Number(row.total), 0)) } };
  });

  app.get("/reports/export/:report", { preHandler: need("accounts.export") }, async (req, reply) => {
    const { report } = req.params as { report: string };
    const query = req.query as { from?: string; to?: string };
    const { from, to } = range(query);
    let rows: (string | number)[][];
    if (report === "trial-balance") {
      const data = trialBalance(await accountBalances(prisma, { to }));
      rows = [["Code", "Account", "Debit", "Credit"], ...data.rows.map((r) => [r.code, r.name, r.debit, r.credit]), ["", "Total", data.totalDebit, data.totalCredit]];
    } else if (report === "profit-and-loss") {
      const data = profitAndLoss(await accountBalances(prisma, { from, to }));
      rows = [["Section", "Account", "Amount"], ...data.income.map((r) => ["Income", r.name, r.amount]), ...data.expense.map((r) => ["Expense", r.name, r.amount]), ["", "Net", data.net]];
    } else if (report === "journal") {
      const entries = await prisma.journalEntry.findMany({ where: { ...(from || to ? { date: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}) }, include: { lines: { include: { account: true } } }, orderBy: { number: "asc" } });
      rows = [["Entry", "Date", "Memo", "Account", "Debit", "Credit", "Currency", "Amount", "Rate"], ...entries.flatMap((e) => e.lines.map((l) => [journalNumber(e.number), e.date.toISOString().slice(0, 10), e.memo, `${l.account.code} ${l.account.name}`, Number(l.debit), Number(l.credit), l.currency, Number(l.amount), Number(l.exchangeRate)]))];
    } else return reply.notFound("Unknown report");
    await audit(req, { action: "report.export", entityType: "report", entityId: report, summary: `Exported ${report}` });
    return reply.header("Content-Type", "text/csv; charset=utf-8").header("Content-Disposition", `attachment; filename="${report}.csv"`).send("﻿" + csv(rows));
  });

  // ---- Budgets -------------------------------------------------------------
  app.get("/budgets", { preHandler: need("accounts.read") }, async () => {
    const budgets = await prisma.budget.findMany({ include: { lines: { include: { account: true } } }, orderBy: { periodStart: "desc" } });
    const out = [];
    for (const budget of budgets) {
      const balances = await accountBalances(prisma, { from: budget.periodStart, to: budget.periodEnd, branchId: budget.branchId });
      const actuals = new Map(balances.map((row) => [String(row.id), { debit: row.debit, credit: row.credit }]));
      out.push({ ...budget, lines: budgetVsActual(budget.lines.map((line) => ({ accountId: line.accountId, name: `${line.account.code} ${line.account.name}`, type: line.account.type, amount: Number(line.amount) })), actuals) });
    }
    return { data: out };
  });

  async function saveBudget(req: any, reply: any, id?: string) {
    const parsed = budgetSchema.safeParse(req.body);
    if (!parsed.success) return invalid(reply, parsed.error);
    if (parsed.data.periodEnd < parsed.data.periodStart) return problem(reply, 400, "BAD_PERIOD", "The period must end after it starts.");
    const accounts = await prisma.ledgerAccount.findMany({ where: { id: { in: parsed.data.lines.map((l) => l.accountId) }, type: { in: ["INCOME", "EXPENSE"] } } });
    if (accounts.length !== new Set(parsed.data.lines.map((l) => l.accountId)).size) return problem(reply, 400, "BAD_ACCOUNT", "A budget is set for income and expense accounts.");
    const staff = await staffOf(req);
    const { lines, ...fields } = parsed.data;
    const budget = await prisma.$transaction(async (tx) => {
      if (id) {
        await tx.budgetLine.deleteMany({ where: { budgetId: id } });
        return tx.budget.update({ where: { id }, data: { ...fields, lines: { create: lines } } });
      }
      return tx.budget.create({ data: { ...fields, createdById: staff.id, lines: { create: lines } } });
    });
    await audit(req, { action: id ? "budget.update" : "budget.create", entityType: "budget", entityId: budget.id, summary: budget.name });
    return reply.code(id ? 200 : 201).send({ data: budget });
  }
  app.post("/budgets", { preHandler: need("accounts.create") }, (req, reply) => saveBudget(req, reply));
  app.put("/budgets/:id", { preHandler: need("accounts.update") }, async (req, reply) => {
    const { id } = req.params as { id: string };
    if (!(await prisma.budget.count({ where: { id } }))) return reply.notFound("Budget not found");
    return saveBudget(req, reply, id);
  });
};

export default accounts;
