import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isSensitive, parseCurrencies, parseDays, permissionLabel, sortActions } from "./permission-labels.js";

describe("permission names", () => {
  test("read plainly", () => {
    assert.equal(permissionLabel("customers.read"), "See · Customers");
    assert.equal(permissionLabel("signature.use"), "Use · Authority signature");
  });
  test("actions come in a natural order", () => {
    assert.deepEqual(sortActions(["delete", "update", "read", "create", "export"]), ["read", "create", "update", "export", "delete"]);
  });
  test("money, passports, the signature and approvals are marked as needing care", () => {
    for (const permission of ["finance.read", "passport.read", "signature.use", "documents.export", "invoices.approve", "customers.delete"]) assert.equal(isSensitive(permission), true, permission);
    for (const permission of ["customers.read", "tasks.create"]) assert.equal(isSensitive(permission), false, permission);
  });
});

describe("reminder days and currencies typed by hand", () => {
  test("days are whole numbers, largest first, without repeats", () => {
    assert.deepEqual(parseDays("7, 15", 365), [15, 7]);
    assert.deepEqual(parseDays("30 15 7 7", 365), [30, 15, 7]);
    assert.equal(parseDays("", 365), null);
    assert.equal(parseDays("seven", 365), null);
    assert.equal(parseDays("400", 365), null);
    assert.equal(parseDays("2.5", 90), null);
  });
  test("currency codes keep taka first", () => {
    assert.deepEqual(parseCurrencies("usd, eur gbp"), ["BDT", "USD", "EUR", "GBP"]);
    assert.deepEqual(parseCurrencies("BDT USD BDT"), ["BDT", "USD"]);
    assert.equal(parseCurrencies("US DOLLAR"), null);
  });
});
