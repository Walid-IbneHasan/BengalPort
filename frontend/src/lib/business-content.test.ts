import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { businessContentFrom, defaultBusinessContent } from "./business-content.js";

describe("reading the saved Business page", () => {
  test("a page saved with the redesign keeps its hero", () => {
    const saved = structuredClone(defaultBusinessContent) as any;
    saved.hero.lead = "Buying from";
    saved.hero.markets = ["China"];
    const content = businessContentFrom(saved);
    assert.equal(content.hero.lead, "Buying from");
    assert.deepEqual(content.hero.markets, ["China"]);
  });

  test("a page saved before the map existed is replaced by the built-in page", () => {
    const old = {
      hero: { eyebrow: "Home / Global Business", title: "GLOBAL BUSINESS", tagline: "Trade.", description: "Old words.", image: "/images/old.webp" },
      services: { eyebrow: "WHAT WE OFFER", title: "End-to-end solutions", description: "Old", items: [] },
      closing: { ...defaultBusinessContent.closing, title: "Old closing" },
    };
    assert.deepEqual(businessContentFrom(old), defaultBusinessContent);
  });

  test("nothing saved gives the built-in page", () => {
    assert.deepEqual(businessContentFrom(undefined), defaultBusinessContent);
  });
});
