import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { resolveApiUrl } from "./api-url.js";

describe("where the website finds the API", () => {
  test("the configured address is used", () => {
    assert.equal(resolveApiUrl("https://api.bengalport.com/api", { dev: false }), "https://api.bengalport.com/api");
  });

  test("a trailing slash or stray spaces in the setting do not matter", () => {
    assert.equal(resolveApiUrl("  https://api.bengalport.com/api/ ", { dev: false }), "https://api.bengalport.com/api");
  });

  test("while developing, the API on this computer is the default", () => {
    assert.equal(resolveApiUrl(undefined, { dev: true }), "http://localhost:4000/api");
    assert.equal(resolveApiUrl("", { dev: true }), "http://localhost:4000/api");
  });

  test("a published site with no address set never points at the visitor's own computer", () => {
    for (const unset of [undefined, "", "   "]) {
      const url = resolveApiUrl(unset, { dev: false });
      assert.doesNotMatch(url, /localhost|127\.0\.0\.1/);
      assert.equal(url, "/api");
    }
  });
});
