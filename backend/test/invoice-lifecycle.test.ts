// An invoice's life and what each step posts to the accounts.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { checkLines } from "../src/lib/accounting.js";
import { allocationPosting, creditNotePosting, invoiceDue, invoiceStatus, issuePosting, paymentPosting, recognitionPosting } from "../src/lib/invoice-lifecycle.js";

const now = new Date("2026-11-12T06:00:00Z");
const base = { state: "ISSUED", total: 100000, paid: 0, credited: 0, dueAt: null as Date | null };
const sum = (lines: any[], side: "debit" | "credit", account?: string) =>
  lines.filter((line) => !account || line.account === account).reduce((total, line) => total + (line[side] ?? 0), 0);

describe("an invoice's status", () => {
  test("a draft is a draft whatever it says", () => assert.equal(invoiceStatus({ ...base, state: "DRAFT", paid: 100000 }, now), "DRAFT"));
  test("issued with nothing paid is sent", () => assert.equal(invoiceStatus(base, now), "SENT"));
  test("part paid is partial", () => assert.equal(invoiceStatus({ ...base, paid: 10000 }, now), "PARTIAL"));
  test("paid in full is paid, counting credit notes", () => assert.equal(invoiceStatus({ ...base, paid: 90000, credited: 10000 }, now), "PAID"));
  test("past its due date with money owed is overdue", () => assert.equal(invoiceStatus({ ...base, paid: 10000, dueAt: new Date("2026-11-01") }, now), "OVERDUE"));
  test("a due date later today is not overdue yet", () => assert.equal(invoiceStatus({ ...base, dueAt: new Date("2026-11-12T17:00:00Z") }, now), "SENT"));
  test("cancelled and refunded stay so", () => {
    assert.equal(invoiceStatus({ ...base, state: "CANCELLED" }, now), "CANCELLED");
    assert.equal(invoiceStatus({ ...base, state: "REFUNDED", paid: 100000 }, now), "REFUNDED");
  });
  test("what is due never goes below nothing", () => {
    assert.equal(invoiceDue(100000, 95000, 10000), 0);
    assert.equal(invoiceDue(100000, 10000, 5000), 85000);
  });
});

describe("what each step posts", () => {
  test("issuing puts the total in receivables and in revenue not yet earned", () => {
    const lines = issuePosting({ total: 100000, currency: "BDT", exchangeRate: 1, customerId: "c1" });
    assert.equal(checkLines(lines), "");
    assert.equal(sum(lines, "debit", "1100"), 100000);
    assert.equal(sum(lines, "credit", "2200"), 100000);
  });

  test("an invoice in dollars is posted in taka at its rate, keeping the dollars", () => {
    const lines = issuePosting({ total: 1000, currency: "USD", exchangeRate: 120, customerId: "c1" });
    assert.equal(sum(lines, "debit", "1100"), 120000);
    assert.equal(lines[0].amount, 1000);
    assert.equal(lines[0].currency, "USD");
  });

  test("a payment pays the invoices it is given to and keeps the rest as an advance", () => {
    const lines = paymentPosting({ amount: 50000, currency: "BDT", exchangeRate: 1, moneyCode: "1000", customerId: "c1" }, [{ amount: 30000, invoiceRate: 1 }]);
    assert.equal(checkLines(lines), "");
    assert.equal(sum(lines, "debit", "1000"), 50000);
    assert.equal(sum(lines, "credit", "1100"), 30000);
    assert.equal(sum(lines, "credit", "2100"), 20000);
  });

  test("a dollar payment at a better rate than the invoice's shows an exchange gain", () => {
    const lines = paymentPosting({ amount: 1000, currency: "USD", exchangeRate: 122, moneyCode: "1010", customerId: "c1" }, [{ amount: 1000, invoiceRate: 120 }]);
    assert.equal(checkLines(lines), "");
    assert.equal(sum(lines, "debit", "1010"), 122000);
    assert.equal(sum(lines, "credit", "1100"), 120000);
    assert.equal(sum(lines, "credit", "4900"), 2000);
  });

  test("at a worse rate it shows an exchange loss", () => {
    const lines = paymentPosting({ amount: 1000, currency: "USD", exchangeRate: 118, moneyCode: "1010", customerId: "c1" }, [{ amount: 1000, invoiceRate: 120 }]);
    assert.equal(checkLines(lines), "");
    assert.equal(sum(lines, "debit", "4900"), 2000);
  });

  test("an advance given to an invoice later moves from advances to receivables", () => {
    const lines = allocationPosting({ amount: 5000, paymentRate: 1, invoiceRate: 1, currency: "BDT", customerId: "c1" });
    assert.equal(checkLines(lines), "");
    assert.equal(sum(lines, "debit", "2100"), 5000);
    assert.equal(sum(lines, "credit", "1100"), 5000);
  });

  test("a credit note takes the amount off receivables and off revenue not yet earned", () => {
    const lines = creditNotePosting({ amount: 2000, currency: "BDT", exchangeRate: 1, customerId: "c1" });
    assert.equal(checkLines(lines), "");
    assert.equal(sum(lines, "debit", "2200"), 2000);
    assert.equal(sum(lines, "credit", "1100"), 2000);
  });

  test("finishing the work turns revenue not yet earned into revenue", () => {
    const lines = recognitionPosting(75000, "c1");
    assert.equal(checkLines(lines), "");
    assert.equal(sum(lines, "debit", "2200"), 75000);
    assert.equal(sum(lines, "credit", "4000"), 75000);
  });
});
