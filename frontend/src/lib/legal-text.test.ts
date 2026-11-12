import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { legalBlocks } from "./legal-text.js";

const values = { email: "info@example.test", address: "Dhaka" };
const text = (value: string) => ({ kind: "text", text: value });

describe("legalBlocks", () => {
  test("blank lines separate paragraphs", () => {
    const blocks = legalBlocks("First.\n\nSecond.", values);
    assert.deepEqual(blocks, [
      { kind: "paragraph", parts: [text("First.")] },
      { kind: "paragraph", parts: [text("Second.")] },
    ]);
  });

  test("lines of one paragraph are joined with a space", () => {
    assert.deepEqual(legalBlocks("One\ntwo", values), [{ kind: "paragraph", parts: [text("One two")] }]);
  });

  test("lines starting with a dash make one list", () => {
    assert.deepEqual(legalBlocks("- One\n- Two", values), [{ kind: "list", items: [[text("One")], [text("Two")]] }]);
  });

  test("a paragraph directly above a list stays a separate block", () => {
    const blocks = legalBlocks("Intro:\n- One", values);
    assert.equal(blocks.length, 2);
    assert.equal(blocks[0].kind, "paragraph");
    assert.equal(blocks[1].kind, "list");
  });

  test("Windows line endings make no difference", () => {
    assert.deepEqual(legalBlocks("A\r\n\r\nB", values).length, 2);
  });

  test("double stars make bold words", () => {
    assert.deepEqual(legalBlocks("**Contact** details", values), [
      { kind: "paragraph", parts: [{ kind: "bold", text: "Contact" }, text(" details")] },
    ]);
  });

  test("a link is written [words](address)", () => {
    assert.deepEqual(legalBlocks("See [our page](/contact).", values), [
      { kind: "paragraph", parts: [text("See "), { kind: "link", text: "our page", href: "/contact" }, text(".")] },
    ]);
  });

  test("{email} becomes a link to the site's email", () => {
    assert.deepEqual(legalBlocks("Write to {email}", values), [
      { kind: "paragraph", parts: [text("Write to "), { kind: "link", text: "info@example.test", href: "mailto:info@example.test" }] },
    ]);
  });

  test("{address} becomes the site's office address", () => {
    assert.deepEqual(legalBlocks("Based at {address}.", values), [{ kind: "paragraph", parts: [text("Based at "), text("Dhaka"), text(".")] }]);
  });

  for (const href of ["javascript:alert(1)", "data:text/html,x", "//evil.example", "vbscript:x"])
    test(`a link to ${href} is shown as plain words`, () => {
      assert.deepEqual(legalBlocks(`[click](${href})`, values), [{ kind: "paragraph", parts: [text("click")] }]);
    });

  for (const href of ["/privacy", "#top", "https://example.test/a", "mailto:a@example.test", "tel:+8801711"])
    test(`a link to ${href} is kept`, () => {
      assert.deepEqual(legalBlocks(`[go](${href})`, values), [{ kind: "paragraph", parts: [{ kind: "link", text: "go", href }] }]);
    });

  test("HTML is left as words", () => {
    assert.deepEqual(legalBlocks("<img src=x onerror=alert(1)>", values), [{ kind: "paragraph", parts: [text("<img src=x onerror=alert(1)>")] }]);
  });

  test("an unknown {word} is left alone", () => {
    assert.deepEqual(legalBlocks("Hello {name}", values), [{ kind: "paragraph", parts: [text("Hello {name}")] }]);
  });

  test("an empty body gives nothing to show", () => {
    assert.deepEqual(legalBlocks("  \n ", values), []);
  });
});
