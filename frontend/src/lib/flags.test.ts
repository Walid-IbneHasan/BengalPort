import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { countryOf, flagCode, flagCodes } from "./flags.js";

describe("flags for places", () => {
  test("one flag per country, in order, unknown ones left out", () => {
    assert.deepEqual(flagCodes(["UK", "Malaysia", "Atlantis", "uk"]), ["gb", "my"]);
  });

  test("a single country", () => {
    assert.equal(flagCode("Turkey"), "tr");
    assert.equal(flagCode("Nowhere"), undefined);
  });

  test("the country of a 'City, Country' place", () => {
    assert.equal(countryOf("Bangkok, Thailand"), "Thailand");
    assert.equal(countryOf("Singapore"), "Singapore");
  });
});
