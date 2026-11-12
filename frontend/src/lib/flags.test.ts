import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { COUNTRIES, countryOf, flagCode, flagCodes, joinPlace, searchCountries, splitPlace } from "./flags.js";

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

describe("a Healthcare place: country from the list, city typed", () => {
  test("every country in the list has its flag", () => {
    for (const country of COUNTRIES) assert.equal(flagCode(country.name), country.code, country.name);
    assert.deepEqual([...COUNTRIES].map((c) => c.name), [...COUNTRIES].map((c) => c.name).sort((a, b) => a.localeCompare(b)));
  });
  test("the list has every country and territory, each once, none with a comma", () => {
    assert.ok(COUNTRIES.length >= 245, `${COUNTRIES.length} countries`);
    for (const name of ["Argentina", "Palestine", "Zambia", "Zimbabwe", "Kosovo", "Brazil", "Nigeria", "Kenya", "Iran", "Taiwan", "Côte d'Ivoire"])
      assert.ok(COUNTRIES.some((country) => country.name === name), name);
    assert.equal(new Set(COUNTRIES.map((country) => country.code)).size, COUNTRIES.length);
    // A comma would split "City, Country" in the wrong place.
    for (const country of COUNTRIES) assert.ok(!country.name.includes(","), country.name);
  });
  test("other spellings find the same flag", () => {
    assert.equal(flagCode("Ivory Coast"), "ci");
    assert.equal(flagCode("cote d'ivoire"), "ci");
    assert.equal(flagCode("Türkiye"), "tr");
    assert.equal(flagCode("U.K."), "gb");
    assert.equal(flagCode("Burma"), "mm");
    assert.equal(flagCode("State of Palestine"), "ps");
  });
  test("the search box finds countries by name or short name, accents ignored", () => {
    assert.deepEqual(searchCountries("zim").map((c) => c.name), ["Zimbabwe"]);
    assert.ok(searchCountries("cote").some((c) => c.name === "Côte d'Ivoire"));
    assert.ok(searchCountries("uk").some((c) => c.name === "United Kingdom"));
    assert.ok(searchCountries("uae").some((c) => c.name === "United Arab Emirates"));
    assert.equal(searchCountries("").length, COUNTRIES.length);
    assert.equal(searchCountries("Atlantis").length, 0);
  });
  test("a saved place splits into city and country", () => {
    assert.deepEqual(splitPlace("Kuala Lumpur, Malaysia"), { city: "Kuala Lumpur", country: "Malaysia" });
    assert.deepEqual(splitPlace("Singapore"), { city: "", country: "Singapore" });
    assert.deepEqual(splitPlace("Delhi, india"), { city: "Delhi", country: "India" });
    assert.deepEqual(splitPlace("Bangkok, Siam"), { city: "Bangkok", country: "Siam" });
    assert.deepEqual(splitPlace(""), { city: "", country: "" });
  });
  test("and joins back the way the website reads it", () => {
    assert.equal(joinPlace("Bangkok", "Thailand"), "Bangkok, Thailand");
    assert.equal(joinPlace("", "Singapore"), "Singapore");
    assert.equal(joinPlace("  Kuala   Lumpur ", "Malaysia"), "Kuala Lumpur, Malaysia");
    assert.equal(joinPlace("Delhi, NCR", "India"), "Delhi NCR, India");
    assert.equal(countryOf(joinPlace("Delhi, NCR", "India")), "India");
  });
});
