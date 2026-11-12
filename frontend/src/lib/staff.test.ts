import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isStaff, mayOpen, staffHome } from "./staff.js";
import { afterLogin } from "./safe-next.js";

describe("who works in the admin", () => {
  test("administrators, managers, accountants, employees and moderators are staff, members are not", () => {
    for (const role of ["ADMIN", "MODERATOR", "MANAGER", "ACCOUNTANT", "EMPLOYEE"]) assert.equal(isStaff(role), true, role);
    assert.equal(isStaff("USER"), false);
    assert.equal(isStaff(undefined), false);
  });

  test("an administrator opens every admin page", () => {
    for (const path of ["/admin", "/admin/accounts", "/admin/users", "/admin/settings", "/admin/print/ledger-day/2026-11-11"])
      assert.equal(mayOpen("ADMIN", path), true, path);
  });

  test("a moderator works on content, enquiries, applications and invoices", () => {
    for (const path of ["/admin/enquiries", "/admin/applications", "/admin/education", "/admin/content", "/admin/division-content/umrah", "/admin/page-content/documents", "/admin/media", "/admin/reviews", "/admin/accounts/invoices", "/admin/print/invoice/abc", "/admin/print/application/abc"])
      assert.equal(mayOpen("MODERATOR", path), true, path);
  });

  test("a moderator never sees the dashboard figures, Hisab Kitab, people, payments or settings", () => {
    for (const path of ["/admin", "/admin/", "/admin/accounts", "/admin/users", "/admin/payments", "/admin/receipts", "/admin/settings", "/admin/print/ledger-day/2026-11-11", "/admin/print/ledger-entry/abc"])
      assert.equal(mayOpen("MODERATOR", path), false, path);
  });

  test("each starts where their work is", () => {
    assert.equal(staffHome("ADMIN"), "/admin");
    assert.equal(staffHome("ACCOUNTANT"), "/admin");
    assert.equal(staffHome("MODERATOR"), "/admin/enquiries");
  });
});

describe("after signing in", () => {
  test("a moderator with nowhere to return to starts at the enquiries", () => {
    assert.equal(afterLogin(null, "MODERATOR"), "/admin/enquiries");
  });
  test("a moderator goes back to the admin page they came from", () => {
    assert.equal(afterLogin("/admin/education", "MODERATOR"), "/admin/education");
  });
  test("a moderator is not sent to Hisab Kitab", () => {
    assert.equal(afterLogin("/admin/accounts", "MODERATOR"), "/admin/enquiries");
  });
});
