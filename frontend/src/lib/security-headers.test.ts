import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { allowApiOrigin, securityHeaders } from "./security-headers.js";

const policy = "default-src 'self'; connect-src 'self' https://accounts.google.com/gsi/; img-src 'self' data: https:; script-src 'self' 'nonce-abc'";

describe("the content security policy and the API", () => {
  test("an API on another address may be called and may serve images", () => {
    const result = allowApiOrigin(policy, "http://localhost:4000/api", "http://localhost:5173");
    assert.match(result, /connect-src 'self' https:\/\/accounts\.google\.com\/gsi\/ http:\/\/localhost:4000(;|$)/);
    assert.match(result, /img-src 'self' data: https: http:\/\/localhost:4000(;|$)/);
  });

  test("only the API's origin is added, not its path", () => {
    const result = allowApiOrigin(policy, "https://api.example.com/api", "https://example.com");
    assert.match(result, /https:\/\/api\.example\.com(;| |$)/);
    assert.doesNotMatch(result, /api\.example\.com\/api/);
  });

  test("the other directives are left alone", () => {
    const result = allowApiOrigin(policy, "https://api.example.com/api", "https://example.com");
    assert.match(result, /default-src 'self'(;|$)/);
    assert.match(result, /script-src 'self' 'nonce-abc'(;|$)/);
  });

  test("an API on the site's own address needs nothing added", () => {
    assert.equal(allowApiOrigin(policy, "https://example.com/api", "https://example.com"), policy);
  });

  test("an address that cannot be read leaves the policy unchanged", () => {
    assert.equal(allowApiOrigin(policy, "not an address", "https://example.com"), policy);
  });
});

describe("the headers every page is sent with", () => {
  test("pages cannot be framed, sniffed or leak the full address they were on", () => {
    const headers = securityHeaders({ https: false });
    assert.equal(headers["x-frame-options"], "DENY");
    assert.equal(headers["x-content-type-options"], "nosniff");
    assert.equal(headers["referrer-policy"], "strict-origin-when-cross-origin");
  });

  test("Google's sign-in window can still report back to the page", () => {
    assert.equal(securityHeaders({ https: false })["cross-origin-opener-policy"], "same-origin-allow-popups");
  });

  test("browsers are told to stay on HTTPS only when the page came over HTTPS", () => {
    assert.equal(securityHeaders({ https: false })["strict-transport-security"], undefined);
    assert.match(securityHeaders({ https: true })["strict-transport-security"], /^max-age=\d{8}$/);
  });
});
