// The CEO dashboard: the company at a glance for a date range and branch.
// Money figures come only from posted accounting entries, so an invoice
// counts as revenue only once the work is recognised, and nothing is
// counted twice.
import type { FastifyPluginAsync } from "fastify";
import { prisma } from "../../lib/prisma.js";
import { allowed, need, ownOnly, staffOf } from "../../lib/access.js";
import { accountBalances, ACCOUNT, journalNumber, round2 } from "../../lib/accounting.js";
import { dayWindow, businessToday } from "../../lib/ledger.js";
import { STAFF_ROLES } from "../../lib/permissions.js";
import { withCode } from "./common.js";

const dhakaDay = (date: Date) => new Date(date.getTime() + 6 * 3600_000).toISOString().slice(0, 10);
// Weeks start on Saturday, as in offices in Bangladesh.
const weekOf = (day: string) => {
  const date = new Date(`${day}T12:00:00Z`);
  const saturday = new Date(date.getTime() - ((date.getUTCDay() + 1) % 7) * 86_400_000);
  return saturday.toISOString().slice(0, 10);
};

const dashboard: FastifyPluginAsync = async (app) => {
  app.get("/dashboard", { preHandler: need("dashboard.read") }, async (req) => {
    const query = req.query as { from?: string; to?: string; branchId?: string; group?: string };
    const staff = await staffOf(req);
    const today = businessToday();
    const fromDay = query.from && dayWindow(query.from) ? query.from : `${today.slice(0, 7)}-01`;
    const toDay = query.to && dayWindow(query.to) ? query.to : today;
    const from = dayWindow(fromDay)!.start, to = dayWindow(toDay)!.end;
    // Staff tied to one branch see that branch only.
    const branchId = staff.role !== "ADMIN" && staff.branchId && !staff.allBranches ? staff.branchId : query.branchId || null;
    const branch = branchId ? { branchId } : {};
    const own = ownOnly(staff);
    const finance = await allowed(staff.role, "finance.read");
    const group = query.group === "week" || query.group === "month" ? query.group : "day";

    const customerScope = { ...branch, ...(own ? { assignedToId: staff.id } : {}) };
    const dealScope = { ...branch, ...(own ? { OR: [{ assignedToId: staff.id }, { customer: { assignedToId: staff.id } }] } : {}) };
    const [totalClients, newClients, activeDeals, activeDealValue, pendingApprovals, openTasks, overdueTasks] = await Promise.all([
      prisma.customer.count({ where: customerScope }),
      prisma.customer.count({ where: { ...customerScope, createdAt: { gte: from, lte: to } } }),
      prisma.deal.count({ where: { ...dealScope, status: "ACTIVE" } }),
      finance ? prisma.deal.aggregate({ where: { ...dealScope, status: "ACTIVE" }, _sum: { total: true } }) : null,
      prisma.approvalRequest.count({ where: { status: "PENDING" } }),
      prisma.task.count({ where: { status: "OPEN", ...(own ? { assigneeId: staff.id } : {}) } }),
      prisma.task.count({ where: { status: "OPEN", dueAt: { lt: new Date() }, ...(own ? { assigneeId: staff.id } : {}) } }),
    ]);

    let money: Record<string, unknown> | null = null;
    if (finance) {
      const period = await accountBalances(prisma, { from, to, branchId });
      const allTime = await accountBalances(prisma, { to: new Date(), branchId });
      const sum = (rows: typeof period, type: string, skip: string[] = []) => round2(rows.filter((r) => r.type === type && !skip.includes(String(r.subtype))).reduce((s, r) => s + (type === "INCOME" ? r.credit - r.debit : r.debit - r.credit), 0));
      const balanceOf = (code: string, natural: "debit" | "credit") => {
        const row = allTime.find((r) => r.code === code);
        return row ? round2(natural === "debit" ? row.debit - row.credit : row.credit - row.debit) : 0;
      };
      const revenue = sum(period, "INCOME", ["FX"]);
      const fx = sum(period, "INCOME").valueOf() - revenue;
      const expense = sum(period, "EXPENSE");
      // What applicants from the website still owe on their applications.
      const applications = await prisma.application.findMany({
        where: { amountDue: { not: null }, status: { notIn: ["CANCELLED", "REJECTED"] } },
        select: { amountDue: true, payments: { select: { amount: true, status: true, refunds: { select: { amount: true, status: true } } } } },
      });
      const applicationDue = round2(applications.reduce((total, row) => {
        const paid = row.payments.filter((p) => p.status === "PAID" || p.status === "PARTIALLY_PAID").reduce((s, p) => s + Number(p.amount) - p.refunds.filter((r) => r.status === "COMPLETED").reduce((x, r) => x + Number(r.amount), 0), 0);
        return total + Math.max(0, Number(row.amountDue) - paid);
      }, 0));

      // Income and expense by day, week or month.
      const lines = await prisma.journalLine.findMany({
        where: { entry: { date: { gte: from, lte: to }, ...branch }, account: { type: { in: ["INCOME", "EXPENSE"] } } },
        select: { debit: true, credit: true, account: { select: { type: true } }, entry: { select: { date: true } } },
      });
      const buckets = new Map<string, { income: number; expense: number }>();
      for (const line of lines) {
        const day = dhakaDay(line.entry.date);
        const key = group === "day" ? day : group === "week" ? weekOf(day) : day.slice(0, 7);
        const bucket = buckets.get(key) ?? { income: 0, expense: 0 };
        if (line.account.type === "INCOME") bucket.income += Number(line.credit) - Number(line.debit);
        else bucket.expense += Number(line.debit) - Number(line.credit);
        buckets.set(key, bucket);
      }
      const series = [...buckets].sort(([a], [b]) => a.localeCompare(b)).map(([period, value]) => ({ period, income: round2(value.income), expense: round2(value.expense), net: round2(value.income - value.expense) }));

      // Each branch side by side.
      const branches = await prisma.branch.findMany({ select: { id: true, name: true } });
      const branchReport = await Promise.all(
        branches.map(async (row) => {
          const rows = await accountBalances(prisma, { from, to, branchId: row.id });
          const income = sum(rows, "INCOME"), spent = sum(rows, "EXPENSE");
          return { id: row.id, name: row.name, income, expense: spent, net: round2(income - spent), customers: await prisma.customer.count({ where: { branchId: row.id } }), activeDeals: await prisma.deal.count({ where: { branchId: row.id, status: "ACTIVE" } }) };
        }),
      );

      const recent = await prisma.journalEntry.findMany({ where: branch, orderBy: [{ date: "desc" }, { number: "desc" }], take: 10, include: { lines: { select: { debit: true } } } });
      money = {
        revenue,
        otherIncome: round2(fx),
        expense,
        netProfit: round2(revenue + fx - expense),
        pendingDue: round2(balanceOf(ACCOUNT.receivable, "debit") + applicationDue),
        invoiceDue: balanceOf(ACCOUNT.receivable, "debit"),
        applicationDue,
        advanceReceived: balanceOf(ACCOUNT.advances, "credit"),
        deferredRevenue: balanceOf(ACCOUNT.deferred, "credit"),
        activeDealValue: Number(activeDealValue?._sum.total ?? 0),
        series,
        branches: branchReport,
        recent: recent.map((entry) => ({ id: entry.id, reference: journalNumber(entry.number), date: entry.date, memo: entry.memo, amount: round2(entry.lines.reduce((s, l) => s + Number(l.debit), 0)), status: entry.status })),
      };
    }

    // How each member of staff is doing: their customers, deals, tasks and
    // contact with customers in the period.
    const people = await prisma.user.findMany({
      where: { role: { in: STAFF_ROLES.filter((role) => role !== "MODERATOR") as any }, blockedAt: null, ...(own ? { id: staff.id } : {}), ...(branchId ? { branchId } : {}) },
      select: { id: true, name: true, role: true },
    });
    const performance = await Promise.all(
      people.map(async (person) => {
        const [customers, active, completed, tasksDone, tasksOpen, overdue, contacts] = await Promise.all([
          prisma.customer.count({ where: { assignedToId: person.id } }),
          prisma.deal.count({ where: { assignedToId: person.id, status: "ACTIVE" } }),
          prisma.deal.count({ where: { assignedToId: person.id, status: "COMPLETED", completedAt: { gte: from, lte: to } } }),
          prisma.task.count({ where: { assigneeId: person.id, status: "DONE", completedAt: { gte: from, lte: to } } }),
          prisma.task.count({ where: { assigneeId: person.id, status: "OPEN" } }),
          prisma.task.count({ where: { assigneeId: person.id, status: "OPEN", dueAt: { lt: new Date() } } }),
          prisma.customerActivity.count({ where: { byId: person.id, kind: { not: "SYSTEM" }, at: { gte: from, lte: to } } }),
        ]);
        return { id: person.id, name: person.name, role: person.role, customers, activeDeals: active, dealsCompleted: completed, tasksDone, tasksOpen, overdue, contacts, score: completed * 5 + tasksDone * 2 + contacts - overdue };
      }),
    );
    performance.sort((a, b) => b.score - a.score);

    const upcoming = await prisma.task.findMany({
      where: { status: "OPEN", ...(own ? { assigneeId: staff.id } : {}) },
      include: { assignee: { select: { name: true } }, customer: { select: { id: true, code: true, name: true } } },
      orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }],
      take: 10,
    });
    const deadlines = await prisma.deal.findMany({
      where: { ...dealScope, status: "ACTIVE", endDate: { not: null } },
      select: { id: true, number: true, title: true, endDate: true, customer: { select: { name: true } } },
      orderBy: { endDate: "asc" },
      take: 8,
    });

    return {
      data: {
        range: { from: fromDay, to: toDay, branchId, group },
        totalClients,
        newClients,
        activeDeals,
        pendingApprovals,
        openTasks,
        overdueTasks,
        money,
        performance,
        topPerformers: performance.filter((row) => row.score > 0).slice(0, 5),
        pendingTasks: upcoming.map((task) => ({ ...task, customer: task.customer ? withCode(task.customer) : null })),
        deadlines: deadlines.map((deal) => ({ ...deal, dealNumber: `D-${String(deal.number).padStart(6, "0")}` })),
      },
    };
  });
};

export default dashboard;
