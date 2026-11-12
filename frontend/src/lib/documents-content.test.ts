import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { defaultDocumentsContent, documentsContentFrom } from "./documents-content.js";

describe("the settings for printed documents", () => {
  test("nothing saved gives Bengal Port's own letterhead and blank signature lines", () => {
    const content = documentsContentFrom({});
    assert.equal(content.letterhead.backgroundImage, "");
    assert.equal(content.letterhead.website, "www.bengalport.com");
    assert.doesNotMatch(JSON.stringify(content), /Global Education/);
    assert.equal(content.signatures.signatureImage, "");
    assert.equal(content.signatures.customerLabel, "Customer's signature");
  });

  test("what was saved is kept and the rest filled in", () => {
    const content = documentsContentFrom({ signatures: { ownerName: "Md. Rahman" } });
    assert.equal(content.signatures.ownerName, "Md. Rahman");
    assert.equal(content.signatures.ownerLabel, defaultDocumentsContent.signatures.ownerLabel);
  });
});
