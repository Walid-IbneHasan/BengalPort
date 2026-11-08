import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { brotliDecompressSync, gunzipSync } from "node:zlib";
import { compressHtml } from "./compression";

const page = `<!doctype html><html><body>${"<p>Bengal Port</p>".repeat(400)}</body></html>`;
const html = (body = page, headers: Record<string, string> = {}) =>
  new Response(body, { status: 200, headers: { "content-type": "text/html; charset=utf-8", ...headers } });

describe("compressing a page", () => {
  test("Brotli is used when the browser accepts it", async () => {
    const result = await compressHtml(html(), "gzip, deflate, br");
    assert.equal(result.headers.get("content-encoding"), "br");
    assert.equal(brotliDecompressSync(Buffer.from(await result.arrayBuffer())).toString(), page);
  });

  test("gzip is used when Brotli is not accepted", async () => {
    const result = await compressHtml(html(), "gzip");
    assert.equal(result.headers.get("content-encoding"), "gzip");
    assert.equal(gunzipSync(Buffer.from(await result.arrayBuffer())).toString(), page);
  });

  test("the compressed page is much smaller", async () => {
    const result = await compressHtml(html(), "br");
    assert.ok((await result.arrayBuffer()).byteLength < page.length / 4);
  });

  test("caches are told the page depends on what the browser accepts", async () => {
    const result = await compressHtml(html(), "br");
    assert.match(String(result.headers.get("vary")), /accept-encoding/i);
  });

  test("the status and other headers survive", async () => {
    const result = await compressHtml(new Response(page, { status: 404, headers: { "content-type": "text/html", "x-frame-options": "DENY" } }), "br");
    assert.equal(result.status, 404);
    assert.equal(result.headers.get("x-frame-options"), "DENY");
  });

  test("a browser that accepts neither gets the page as it was", async () => {
    const result = await compressHtml(html(), "");
    assert.equal(result.headers.get("content-encoding"), null);
    assert.equal(await result.text(), page);
  });

  test("anything that is not a page is left alone", async () => {
    const result = await compressHtml(new Response(page, { headers: { "content-type": "application/json" } }), "br");
    assert.equal(result.headers.get("content-encoding"), null);
  });

  test("a response already compressed is not compressed twice", async () => {
    const result = await compressHtml(html(page, { "content-encoding": "gzip" }), "br");
    assert.equal(result.headers.get("content-encoding"), "gzip");
  });

  test("a 'not modified' answer has no body to compress", async () => {
    const result = await compressHtml(new Response(null, { status: 304, headers: { "content-type": "text/html" } }), "br");
    assert.equal(result.status, 304);
    assert.equal(result.headers.get("content-encoding"), null);
  });

  test("a very small page is not worth compressing", async () => {
    const result = await compressHtml(html("<p>Hi</p>"), "br");
    assert.equal(result.headers.get("content-encoding"), null);
  });
});
