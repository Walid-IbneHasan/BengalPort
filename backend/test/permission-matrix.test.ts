// The permission matrix: what each role may do by default, changes made by
// the Super Admin, and which permission each admin request needs.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { adminPermission, can, defaultAllowed, isStaff, PERMISSIONS } from "../src/lib/permissions.js";

describe("roles and their defaults", () => {
  test("the Super Admin may do everything, members nothing", () => {
    for (const permission of PERMISSIONS) {
      assert.equal(can("ADMIN", permission), true, permission);
      assert.equal(can("USER", permission), false, permission);
    }
  });

  test("an accountant works on the money but not on the website or people", () => {
    for (const p of ["accounts.read", "accounts.create", "hisab.create", "payments.create", "invoices.read", "finance.read", "payments.approve"]) assert.equal(can("ACCOUNTANT", p), true, p);
    for (const p of ["content.update", "users.create", "roles.update", "customers.delete", "passport.read"]) assert.equal(can("ACCOUNTANT", p), false, p);
  });

  test("a manager runs customers, deals and the invoice workflow", () => {
    for (const p of ["customers.create", "customers.export", "deals.create", "invoices.create", "invoices.cancel", "tasks.create", "passport.read", "signature.use"]) assert.equal(can("MANAGER", p), true, p);
    for (const p of ["accounts.create", "roles.update", "audit.read", "customers.delete"]) assert.equal(can("MANAGER", p), false, p);
  });

  test("an employee looks after their own customers, tasks and documents", () => {
    for (const p of ["customers.create", "customers.read", "tasks.update", "documents.read", "documents.create"]) assert.equal(can("EMPLOYEE", p), true, p);
    for (const p of ["finance.read", "invoices.create", "accounts.read", "passport.read", "customers.export"]) assert.equal(can("EMPLOYEE", p), false, p);
  });

  test("a moderator keeps exactly the website work they had", () => {
    for (const p of ["content.update", "directory.create", "directory.update", "media.create", "reviews.update", "enquiries.update", "applications.update", "invoices.create"]) assert.equal(can("MODERATOR", p), true, p);
    for (const p of ["directory.delete", "media.delete", "reviews.delete", "hisab.read", "finance.read", "users.read"]) assert.equal(can("MODERATOR", p), false, p);
  });

  test("staff are everyone but members", () => {
    for (const role of ["ADMIN", "MODERATOR", "MANAGER", "ACCOUNTANT", "EMPLOYEE"]) assert.equal(isStaff(role), true, role);
    assert.equal(isStaff("USER"), false);
  });
});

describe("changes made by the Super Admin", () => {
  test("a permission can be given to or taken from a role", () => {
    const overrides = new Map([["EMPLOYEE:customers.export", true], ["MANAGER:deals.cancel", false]]);
    assert.equal(can("EMPLOYEE", "customers.export", overrides), true);
    assert.equal(can("MANAGER", "deals.cancel", overrides), false);
    assert.equal(defaultAllowed("MANAGER", "deals.cancel"), true);
  });

  test("nothing can be taken from the Super Admin", () => {
    assert.equal(can("ADMIN", "roles.update", new Map([["ADMIN:roles.update", false]])), true);
  });
});

describe("what each admin request needs", () => {
  const cases: Array<[string, string, string | null]> = [
    ["GET", "/dashboard", "finance.read"],
    ["GET", "/resources/suppliers", "directory.read"],
    ["POST", "/resources/suppliers", "directory.create"],
    ["PUT", "/resources/education/x", "directory.update"],
    ["DELETE", "/resources/factories/x", "directory.delete"],
    ["GET", "/resources/enquiries", "enquiries.read"],
    ["PATCH", "/resources/applications/x", "applications.update"],
    ["DELETE", "/resources/applications/x", "applications.delete"],
    ["GET", "/resources/users", "users.read"],
    ["PATCH", "/resources/users/x", "roles.update"],
    ["GET", "/resources/payments", "payments.read"],
    ["GET", "/resources/receipts", "payments.read"],
    ["POST", "/resources/applications/x/notes", "applications.update"],
    ["DELETE", "/notes/x", "applications.delete"],
    ["POST", "/users", "users.create"],
    ["PATCH", "/users/x/block", "users.update"],
    ["PUT", "/content/home", "content.update"],
    ["GET", "/content/umrah", "content.read"],
    ["POST", "/media", "media.create"],
    ["DELETE", "/media/x", "media.delete"],
    ["GET", "/accounts", "hisab.read"],
    ["POST", "/accounts", "hisab.create"],
    ["DELETE", "/accounts/x", "hisab.delete"],
    ["GET", "/accounts/categories", "hisab.read"],
    ["GET", "/accounts/customers", "hisab.read"],
    ["PUT", "/payment-settings", "settings.update"],
    ["GET", "/backup-link", "settings.update"],
    ["PATCH", "/reviews/x", "reviews.update"],
    ["POST", "/opportunities", "directory.create"],
    ["GET", "/opportunity-categories", "directory.read"],
    ["GET", "/invoices", "invoices.read"],
    ["POST", "/invoices", "invoices.create"],
    ["PUT", "/invoices/x", "invoices.update"],
    ["DELETE", "/invoices/x", "invoices.delete"],
    ["POST", "/invoices/x/issue", "invoices.update"],
    ["POST", "/invoices/x/cancel", "invoices.cancel"],
    ["POST", "/invoices/x/credit-notes", "invoices.cancel"],
    ["POST", "/invoices/x/share", "invoices.export"],
    ["GET", "/something-new", null],
  ];
  for (const [method, path, permission] of cases)
    test(`${method} ${path} needs ${permission ?? "an administrator"}`, () => assert.equal(adminPermission(method, path), permission));
});
