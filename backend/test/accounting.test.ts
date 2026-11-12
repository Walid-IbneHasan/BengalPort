// Double-entry accounting: the rules every posting follows, and the reports
// made from the postings.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { agingBuckets, balanceSheet, budgetVsActual, cashFlow, checkLines, profitAndLoss, reversedLines, toBase, trialBalance } from "../src/lib/accounting.js";

describe("a posting", () => {
  test("is balanced when the debits equal the credits", () => {
    assert.equal(checkLines([{ debit: 1000 }, { credit: 600 }, { credit: 400 }]), "");
  });
  test("is refused when the debits and credits differ, by even a paisa", () => {
    assert.match(checkLines([{ debit: 1000 }, { credit: 999.99 }]), /debits.*credits/i);
  });
  test("needs at least two lines", () => {
    assert.match(checkLines([{ debit: 0 }]), /two lines/i);
  });
  test("each line is a debit or a credit, never both and never nothing", () => {
    assert.match(checkLines([{ debit: 10, credit: 10 }, { credit: 0 }]), /either a debit or a credit/i);
    assert.match(checkLines([{ debit: -5 }, { credit: -5 }]), /either a debit or a credit/i);
  });
  test("a reversal swaps every debit and credit", () => {
    assert.deepEqual(reversedLines([{ accountId: "cash", debit: 500, credit: 0 }, { accountId: "revenue", debit: 0, credit: 500 }]), [
      { accountId: "cash", debit: 0, credit: 500 },
      { accountId: "revenue", debit: 500, credit: 0 },
    ]);
  });
  test("an amount in another currency becomes taka at the rate, to the paisa", () => {
    assert.equal(toBase(100, 121.555), 12155.5);
    assert.equal(toBase(0.1, 3), 0.3);
  });
});

const balances = [
  { code: "1000", name: "Cash in hand", type: "ASSET", subtype: "CASH", debit: 50000, credit: 12000 },
  { code: "1100", name: "Accounts receivable", type: "ASSET", subtype: "RECEIVABLE", debit: 100000, credit: 30000 },
  { code: "2100", name: "Customer advances", type: "LIABILITY", subtype: "ADVANCE", debit: 0, credit: 8000 },
  { code: "2200", name: "Deferred revenue", type: "LIABILITY", subtype: "DEFERRED", debit: 40000, credit: 100000 },
  { code: "3000", name: "Owner's equity", type: "EQUITY", subtype: null, debit: 0, credit: 12000 },
  { code: "4000", name: "Service revenue", type: "INCOME", subtype: "REVENUE", debit: 0, credit: 40000 },
  { code: "5000", name: "General expenses", type: "EXPENSE", subtype: null, debit: 12000, credit: 0 },
];

describe("reports", () => {
  test("profit and loss counts only income and expense accounts", () => {
    const report = profitAndLoss(balances);
    assert.equal(report.totalIncome, 40000);
    assert.equal(report.totalExpense, 12000);
    assert.equal(report.net, 28000);
  });

  test("the balance sheet balances, with the period's earnings under equity", () => {
    const sheet = balanceSheet(balances);
    assert.equal(sheet.totalAssets, 108000);
    assert.equal(sheet.totalLiabilities, 68000);
    assert.equal(sheet.totalEquity, 40000);
    assert.ok(sheet.equity.some((row) => row.name === "Current earnings" && row.amount === 28000));
    assert.equal(sheet.balanced, true);
  });

  test("the trial balance's two columns agree", () => {
    const report = trialBalance(balances);
    assert.equal(report.totalDebit, report.totalCredit);
    assert.equal(report.rows.find((row) => row.code === "1000")?.debit, 38000);
    assert.equal(report.rows.find((row) => row.code === "2200")?.credit, 60000);
  });

  test("cash flow shows money in and out of the cash and bank accounts, by where it came from", () => {
    const report = cashFlow(
      [
        { lines: [{ accountId: "cash", debit: 5000, credit: 0 }, { accountId: "ar", debit: 0, credit: 5000 }] },
        { lines: [{ accountId: "cash", debit: 0, credit: 1200 }, { accountId: "rent", debit: 1200, credit: 0 }] },
        { lines: [{ accountId: "cash", debit: 0, credit: 300 }, { accountId: "bank", debit: 300, credit: 0 }] },
      ],
      new Map([
        ["cash", { name: "Cash in hand", money: true }],
        ["bank", { name: "Bank", money: true }],
        ["ar", { name: "Accounts receivable", money: false }],
        ["rent", { name: "Rent", money: false }],
      ]),
      10000,
    );
    assert.deepEqual(report.inflows, [{ name: "Accounts receivable", amount: 5000 }]);
    assert.deepEqual(report.outflows, [{ name: "Rent", amount: 1200 }]);
    assert.equal(report.net, 3800);
    assert.equal(report.closing, 13800);
  });

  test("what customers owe is grouped by how late it is", () => {
    const today = new Date("2026-11-12T06:00:00Z");
    const buckets = agingBuckets(
      [
        { due: 1000, dueAt: new Date("2026-11-20") },
        { due: 2000, dueAt: new Date("2026-11-01") },
        { due: 3000, dueAt: new Date("2026-09-20") },
        { due: 4000, dueAt: new Date("2026-06-01") },
        { due: 500, dueAt: null },
        { due: 0, dueAt: new Date("2026-01-01") },
      ],
      today,
    );
    assert.deepEqual(buckets, { current: 1500, days1to30: 2000, days31to60: 3000, days61to90: 0, over90: 4000, total: 10500 });
  });

  test("a budget is compared with what was really earned and spent", () => {
    const rows = budgetVsActual(
      [
        { accountId: "rev", name: "Service revenue", type: "INCOME", amount: 50000 },
        { accountId: "exp", name: "General expenses", type: "EXPENSE", amount: 10000 },
      ],
      new Map([
        ["rev", { debit: 0, credit: 40000 }],
        ["exp", { debit: 12000, credit: 0 }],
      ]),
    );
    assert.deepEqual(rows[0], { accountId: "rev", name: "Service revenue", type: "INCOME", budget: 50000, actual: 40000, variance: -10000, used: 80 });
    assert.deepEqual(rows[1], { accountId: "exp", name: "General expenses", type: "EXPENSE", budget: 10000, actual: 12000, variance: 2000, used: 120 });
  });
});
