import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { afterLogin } from "./safe-next";

describe("where someone goes after signing in", () => {
  test("a member goes back to the page they came from", () => {
    assert.equal(afterLogin("/profile", "USER"), "/profile");
  });

  test("the page's own query is kept", () => {
    assert.equal(afterLogin("/receipt/BP-1?key=abc", "USER"), "/receipt/BP-1?key=abc");
  });

  test("a member with nowhere to return to goes to their dashboard", () => {
    assert.equal(afterLogin(null, "USER"), "/dashboard");
  });

  test("an administrator with nowhere to return to goes to the admin", () => {
    assert.equal(afterLogin(null, "ADMIN"), "/admin");
  });

  test("an administrator goes back to the admin page they came from", () => {
    assert.equal(afterLogin("/admin/applications", "ADMIN"), "/admin/applications");
  });

  test("a member is not sent to a page only administrators can open", () => {
    assert.equal(afterLogin("/admin", "USER"), "/dashboard");
  });

  for (const hostile of ["https://evil.example/", "//evil.example/", "/\\evil.example/", "\\\\evil.example", "javascript:alert(1)", "evil.example", "/\t/evil.example", " //evil.example"])
    test(`${JSON.stringify(hostile)} is never followed`, () => {
      assert.equal(afterLogin(hostile, "USER"), "/dashboard");
    });

  test("the sign-in page itself is not a destination", () => {
    assert.equal(afterLogin("/login", "USER"), "/dashboard");
  });
});
