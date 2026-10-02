import "dotenv/config";
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";

process.env.LOG_LEVEL = "silent";

const { buildApp } = await import("../src/app.js");
const { prisma } = await import("../src/lib/prisma.js");

let app: Awaited<ReturnType<typeof buildApp>>;
let headers: Record<string, unknown>;

before(async () => {
  app = await buildApp();
  headers = (await app.inject({ method: "GET", url: "/api/health" })).headers;
});
after(async () => {
  await app.close();
  await prisma.$disconnect();
});

describe("the headers the API answers with", () => {
  test("a response is never treated as a page: nothing may load or frame it", () => {
    assert.match(String(headers["content-security-policy"]), /default-src 'none'/);
    assert.match(String(headers["content-security-policy"]), /frame-ancestors 'none'/);
    assert.equal(headers["x-frame-options"], "DENY");
  });

  test("browsers may not guess a different content type", () => {
    assert.equal(headers["x-content-type-options"], "nosniff");
  });

  test("the website, on another address, may still show the API's images", () => {
    assert.equal(headers["cross-origin-resource-policy"], "cross-origin");
  });

  test("browsers are told to keep using HTTPS, for this address only", () => {
    assert.match(String(headers["strict-transport-security"]), /^max-age=\d{8}$/);
  });

  test("the address of the page is not passed on to other sites", () => {
    assert.equal(headers["referrer-policy"], "no-referrer");
  });

  test("the server does not advertise what it runs on", () => {
    assert.equal(headers["x-powered-by"], undefined);
  });
});
