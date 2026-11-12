import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  allocationList,
  allocationSummary,
  amountOf,
  budgetLineState,
  dayToSend,
  endOfDay,
  fillOldestFirst,
  groupAccounts,
  journalCheck,
  latestRate,
  moneyCodeFor,
  paymentPill,
  periodRange,
  reversible,
  sourceLabel,
  toTaka,
  wholeMonth,
} from "./finance.js";

describe("finance helpers", () => {
  test("amount boxes read as numbers, empty ones as nothing", () => {
    assert.equal(amountOf("1,250.50"), 1250.5);
    assert.equal(amountOf(300), 300);
    assert.equal(amountOf(""), 0);
    assert.equal(amountOf(null), 0);
    assert.equal(amountOf(undefined), 0);
    assert.equal(amountOf("abc"), 0);
  });

  test("dates sent with a posting", () => {
    const now = new Date("2026-11-12T08:30:00.000Z");
    assert.equal(dayToSend("2026-11-12", "2026-11-12", now), "2026-11-12T08:30:00.000Z", "today keeps the time");
    assert.equal(dayToSend("2026-11-01", "2026-11-12", now), "2026-11-01T00:00:00+06:00");
    assert.equal(dayToSend("", "2026-11-12", now), null);
    assert.equal(endOfDay("2026-11-30"), "2026-11-30T23:59:59.999+06:00");
  });

  test("another currency in taka, to the paisa", () => {
    assert.equal(toTaka(100, 121.5), 12150);
    assert.equal(toTaka(10.01, 109.333), 1094.42);
  });

  test("a payment fills the oldest invoices first, each up to what it owes", () => {
    const invoices = [{ id: "a", due: 3000 }, { id: "b", due: 5000 }, { id: "c", due: 2000 }];
    assert.deepEqual(fillOldestFirst(6000, invoices), { a: 3000, b: 3000, c: 0 });
    assert.deepEqual(fillOldestFirst(20000, invoices), { a: 3000, b: 5000, c: 2000 });
    assert.deepEqual(fillOldestFirst(0, invoices), { a: 0, b: 0, c: 0 });
    assert.deepEqual(fillOldestFirst(0.3, [{ id: "a", due: 0.1 }, { id: "b", due: 0.2 }]), { a: 0.1, b: 0.2 });
  });

  test("what is applied and what stays as an advance", () => {
    assert.deepEqual(allocationSummary(10000, { a: 3000, b: "2,500", c: null }), { applied: 5500, rest: 4500, over: false });
    assert.deepEqual(allocationSummary(1000, { a: 1500 }), { applied: 1500, rest: 0, over: true });
    assert.deepEqual(allocationSummary(0.3, { a: 0.1, b: 0.2 }), { applied: 0.3, rest: 0, over: false });
  });

  test("only invoices that get something are sent", () => {
    assert.deepEqual(allocationList({ a: 3000, b: 0, c: null, d: "12.345" }), [{ invoiceId: "a", amount: 3000 }, { invoiceId: "d", amount: 12.35 }]);
  });

  test("a journal entry can be saved only when it balances", () => {
    assert.equal(journalCheck([{ debit: 500, credit: 0 }, { debit: 0, credit: 500 }]).ready, true);
    const short = journalCheck([{ debit: 500, credit: "" }, { debit: "", credit: 400 }]);
    assert.equal(short.balanced, false);
    assert.equal(short.difference, 100);
    assert.equal(short.ready, false);
    assert.equal(journalCheck([{ debit: 0, credit: 0 }, { debit: 0, credit: 0 }]).ready, false, "nothing to post");
    assert.equal(journalCheck([{ debit: 500, credit: 500 }, { debit: 0, credit: 0 }]).bothSides, true);
    assert.equal(journalCheck([{ debit: 0.1, credit: 0 }, { debit: 0.2, credit: 0 }, { debit: 0, credit: 0.3 }]).ready, true);
  });

  test("only hand-made entries and transfers are reversed here, once", () => {
    const entry = { sourceType: "manual", status: "POSTED" as const, reversalOf: null, reversedBy: null };
    assert.equal(reversible(entry), true);
    assert.equal(reversible({ ...entry, sourceType: "transfer" }), true);
    assert.equal(reversible({ ...entry, sourceType: null }), true);
    assert.equal(reversible({ ...entry, sourceType: "payment" }), false);
    assert.equal(reversible({ ...entry, status: "REVERSED" }), false);
    assert.equal(reversible({ ...entry, reversalOf: "JE-000003" }), false);
    assert.equal(sourceLabel("cashbook"), "Hisab Kitab");
    assert.equal(sourceLabel(null), "Entered by hand");
  });

  test("each payment method has its money account, as the server picks it", () => {
    assert.equal(moneyCodeFor("Cash"), "1000");
    assert.equal(moneyCodeFor("Bank transfer"), "1010");
    assert.equal(moneyCodeFor("Cheque"), "1010");
    assert.equal(moneyCodeFor("Card"), "1010");
    assert.equal(moneyCodeFor("bKash"), "1020");
    assert.equal(moneyCodeFor("Nagad"), "1030");
    assert.equal(moneyCodeFor("Other"), "1000");
  });

  test("a payment's pill", () => {
    assert.deepEqual(paymentPill({ status: "PAID", refunded: 0 }), { status: "PAID", label: "Received" });
    assert.deepEqual(paymentPill({ status: "PAID", refunded: 50 }), { status: "PARTIAL", label: "Part refunded" });
    assert.deepEqual(paymentPill({ status: "REFUNDED", refunded: 100 }), { status: "REFUNDED", label: "Refunded" });
  });

  test("the latest saved rate for a currency", () => {
    const rates = [
      { currency: "USD", rate: 120, date: "2026-11-01T00:00:00.000Z" },
      { currency: "USD", rate: 122.5, date: "2026-11-10T00:00:00.000Z" },
      { currency: "EUR", rate: 131, date: "2026-11-11T00:00:00.000Z" },
    ];
    assert.equal(latestRate(rates, "USD"), 122.5);
    assert.equal(latestRate(rates, "GBP"), null);
    assert.equal(latestRate(rates, "BDT"), 1);
  });

  test("report periods, counted from today", () => {
    assert.deepEqual(periodRange("this-month", "2026-11-12"), { from: "2026-11-01", to: "2026-11-12" });
    assert.deepEqual(periodRange("last-month", "2026-11-12"), { from: "2026-10-01", to: "2026-10-31" });
    assert.deepEqual(periodRange("last-month", "2026-01-05"), { from: "2025-12-01", to: "2025-12-31" });
    assert.deepEqual(periodRange("last-month", "2028-03-02"), { from: "2028-02-01", to: "2028-02-29" });
    assert.deepEqual(periodRange("this-year", "2026-11-12"), { from: "2026-01-01", to: "2026-11-12" });
    assert.deepEqual(wholeMonth("2026-11-12"), { from: "2026-11-01", to: "2026-11-30" });
    assert.deepEqual(wholeMonth("2028-02-10"), { from: "2028-02-01", to: "2028-02-29" });
  });

  test("budget bars: amber from 90 % of an expense, red once over", () => {
    assert.equal(budgetLineState("EXPENSE", 10000, 5000).tone, "good");
    assert.equal(budgetLineState("EXPENSE", 10000, 9000).tone, "warn");
    const over = budgetLineState("EXPENSE", 10000, 12000);
    assert.equal(over.tone, "bad");
    assert.equal(over.width, 100);
    assert.equal(over.used, 120);
    assert.deepEqual(over.text, { lead: "Over budget by", amount: 2000 });
    assert.deepEqual(budgetLineState("EXPENSE", 10000, 4000).text, { lead: "Left to spend", amount: 6000 });
    assert.equal(budgetLineState("INCOME", 10000, 12000).tone, "good", "income above target is good news");
    assert.deepEqual(budgetLineState("INCOME", 10000, 7000).text, { lead: "Short of target by", amount: 3000 });
  });

  test("accounts grouped under their kind, in code order", () => {
    const groups = groupAccounts([
      { type: "EXPENSE", code: "5100" },
      { type: "ASSET", code: "1010" },
      { type: "ASSET", code: "1000" },
    ]);
    assert.deepEqual(groups.map((group) => [group.label, group.rows.map((row) => row.code)]), [["Assets", ["1000", "1010"]], ["Expenses", ["5100"]]]);
  });
});
