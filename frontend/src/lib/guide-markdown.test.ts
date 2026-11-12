import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { renderMarkdown, slug, splitGuide } from "./guide-markdown.js";

describe("the admin guide's two languages", () => {
  const file = "# Title — বাংলা\n\nIntro\n\n---\n\n# English guide\n\n## 1. One\n\nText\n\n---\n\n# বাংলা নির্দেশিকা\n\n## 1. এক\n\nলেখা\n";
  test("English shows only the English half, Bangla only the Bangla half", () => {
    const { en, bn } = splitGuide(file);
    assert.ok(en.startsWith("# English guide"));
    assert.ok(!en.includes("বাংলা নির্দেশিকা") && !en.includes("Intro"));
    assert.ok(!en.trimEnd().endsWith("---"));
    assert.ok(bn.startsWith("# বাংলা নির্দেশিকা") && bn.includes("লেখা") && !bn.includes("English guide"));
  });
  test("the real guide splits, and every contents link finds its heading", () => {
    const { en, bn } = splitGuide(readFileSync(new URL("../../../docs/ADMIN-GUIDE.md", import.meta.url), "utf8"));
    for (const half of [en, bn]) {
      const html = renderMarkdown(half);
      const ids = new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]));
      const links = [...html.matchAll(/href="#([^"]+)"/g)].map((m) => m[1]);
      assert.ok(links.length > 20);
      for (const link of links) assert.ok(ids.has(link), `missing heading for #${link}`);
    }
  });
});

describe("Markdown into HTML", () => {
  test("headings get GitHub's anchors, in English and Bangla", () => {
    assert.equal(slug("5.1 Dashboard"), "51-dashboard");
    assert.equal(slug("1. সাইন ইন, রোল ও অনুমতি"), "1-সাইন-ইন-রোল-ও-অনুমতি");
    assert.match(renderMarkdown("### 5.2 Customers (গ্রাহক)"), /<h3 id="52-customers-গ্রাহক">/);
  });
  test("tables, nested lists, code and inline marks", () => {
    const html = renderMarkdown("| A | B |\n|---|---|\n| **x** | `y` |\n\n1. First\n   - inner *note*\n2. Second\n\n```\na → b\n```").replace(/\n/g, "");
    assert.match(html, /<div class="table"><table><thead><tr><th>A<\/th><th>B<\/th><\/tr><\/thead><tbody><tr><td><strong>x<\/strong><\/td><td><code>y<\/code><\/td><\/tr>/);
    assert.match(html, /<ol><li>First<ul><li>inner <em>note<\/em><\/li><\/ul><\/li><li>Second<\/li><\/ol>/);
    assert.match(html, /<pre><code>a → b<\/code><\/pre>/);
  });
  test("nothing in the text can become HTML", () => {
    const html = renderMarkdown('<script>alert(1)</script> [x](javascript:alert(1)) "quoted"');
    assert.ok(!html.includes("<script>"));
    assert.ok(html.includes("&lt;script&gt;"));
    assert.ok(!html.includes("javascript:"));
  });
  test("lines of a paragraph stay on their own lines", () => {
    assert.equal(renderMarkdown("**Changes:** a\n**Connected to:** b"), "<p><strong>Changes:</strong> a<br><strong>Connected to:</strong> b</p>");
  });
});
