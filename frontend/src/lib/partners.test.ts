import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { groupPartners, industries, type Partner } from "./partners.js";

let next = 0;
const partner = (over: Partial<Partner>): Partner => ({
  id: `p${++next}`,
  name: "A partner", country: "China", industry: "Textiles", product: "Fabric", description: "", image: "", featured: false, kind: "Supplier", ...over,
});
const partners = [
  partner({ name: "Pacific Machinery", country: "China", industry: "Industrial", kind: "Supplier" }),
  partner({ name: "Bengal Apparel", country: "Bangladesh", industry: "Apparel", kind: "Factory" }),
  partner({ name: "Guangzhou Pack", country: "China", industry: "Packaging", kind: "Factory", featured: true }),
  partner({ name: "Delta Agro", country: "Bangladesh", industry: "Agriculture", kind: "Supplier" }),
];

describe("grouping partners by country", () => {
  test("Bangladesh comes first, then the other countries alphabetically", () => {
    const groups = groupPartners(partners, "all", "All");
    assert.deepEqual(groups.map((g) => g.country), ["Bangladesh", "China"]);
  });

  test("within a country, featured partners lead and the rest follow by name", () => {
    const china = groupPartners(partners, "all", "All").find((g) => g.country === "China")!;
    assert.deepEqual(china.items.map((p) => p.name), ["Guangzhou Pack", "Pacific Machinery"]);
  });

  test("filters by kind and by industry", () => {
    assert.deepEqual(groupPartners(partners, "Factory", "All").flatMap((g) => g.items.map((p) => p.name)), ["Bengal Apparel", "Guangzhou Pack"]);
    assert.deepEqual(groupPartners(partners, "all", "Agriculture").flatMap((g) => g.items.map((p) => p.name)), ["Delta Agro"]);
    assert.deepEqual(groupPartners(partners, "Supplier", "Apparel"), []);
  });

  test("the industry choices are the partners' industries, sorted, after All", () => {
    assert.deepEqual(industries(partners), ["All", "Agriculture", "Apparel", "Industrial", "Packaging"]);
  });
});
