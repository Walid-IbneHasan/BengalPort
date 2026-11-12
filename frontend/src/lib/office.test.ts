import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { dateInput, day, money, pathPermission, ROLE_LABELS, toneOf } from "./office.js";

describe("office helpers", () => {
  test("taka is written with its sign, other currencies with their code", () => {
    assert.equal(money(125000), "৳1,25,000");
    assert.equal(money(1250.5, "BDT"), "৳1,250.50");
    assert.equal(money(1000, "USD"), "USD 1,000.00");
    assert.equal(money(null), "—");
  });

  test("dates read the same everywhere, in Bangladesh time", () => {
    assert.equal(day("2026-11-11T20:00:00Z"), "12 Nov 2026");
    assert.equal(day(null), "—");
    assert.equal(dateInput("2026-11-11T20:00:00Z"), "2026-11-12");
    assert.equal(dateInput(null), "");
  });

  test("every status has a colour", () => {
    assert.equal(toneOf("PAID"), "good");
    assert.equal(toneOf("OVERDUE"), "bad");
    assert.equal(toneOf("DRAFT"), "quiet");
    assert.equal(toneOf("SOMETHING"), "quiet");
  });

  test("each office page needs its own permission", () => {
    assert.equal(pathPermission("/admin/customers/abc"), "customers.read");
    assert.equal(pathPermission("/admin/finance"), "accounts.read");
    assert.equal(pathPermission("/admin/audit"), "audit.read");
    assert.equal(pathPermission("/admin/accounts"), "hisab.read");
    assert.equal(pathPermission("/admin/accounts/invoices"), "invoices.read");
    assert.equal(pathPermission("/admin/approvals"), null);
    assert.equal(pathPermission("/admin/education"), "directory.read");
  });

  test("roles have names people use", () => {
    assert.equal(ROLE_LABELS.ADMIN, "Super Admin / CEO");
    assert.equal(ROLE_LABELS.EMPLOYEE, "Employee");
  });
});

describe("the admin guide", () => {
  test("needs a permission no role but the Super Admin has", () => {
    assert.equal(pathPermission("/admin/guide"), "guide.read");
  });
});
