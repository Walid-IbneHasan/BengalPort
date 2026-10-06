import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { defaultHealthcareContent, healthcareContentFrom } from "./division-content.js";

describe("reading the saved Healthcare page", () => {
  test("a page saved with the redesign keeps its words and gains what it lacks", () => {
    const saved = structuredClone(defaultHealthcareContent) as any;
    saved.hero.title = "Care abroad for";
    delete saved.reviews;
    const content = healthcareContentFrom(saved);
    assert.equal(content.hero.title, "Care abroad for");
    assert.equal(content.reviews.heading, defaultHealthcareContent.reviews.heading);
  });

  test("a page saved before the pathway existed is replaced by the built-in page", () => {
    const old = { hero: { eyebrow: "GLOBAL HEALTHCARE", title: "Care, connected globally.", tagline: "x", description: "y", image: "/images/old.webp", primary: "a", secondary: "b" }, shortcuts: [] };
    assert.deepEqual(healthcareContentFrom(old), defaultHealthcareContent);
  });

  test("nothing saved gives the built-in page", () => {
    assert.deepEqual(healthcareContentFrom(null), defaultHealthcareContent);
  });
});
