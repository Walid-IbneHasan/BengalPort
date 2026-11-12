import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { countrySlug, destinations, hospitalsIn } from "./healthcare-places.js";

const hospitals = [
  { name: "Apollo", country: "India", city: "Delhi" },
  { name: "Bumrungrad", country: "Thailand", city: "Bangkok" },
  { name: "Fortis", country: "india", city: "Delhi" },
];

describe("Healthcare destinations", () => {
  test("a country's address on the site is its name in plain letters", () => {
    assert.equal(countrySlug("Delhi, India"), "india");
    assert.equal(countrySlug("United Arab Emirates"), "united-arab-emirates");
    assert.equal(countrySlug("Singapore"), "singapore");
  });

  test("each country appears once, the hospitals' countries first, with its flag", () => {
    const list = destinations(hospitals, ["Bangkok, Thailand", "Delhi, India", "Beijing, China", "Singapore"]);
    assert.deepEqual(list.map((x) => x.slug), ["india", "thailand", "china", "singapore"]);
    assert.equal(list[0].country, "India");
    assert.equal(list[0].flag, "in");
    assert.equal(list[0].hospitals, 2);
    assert.equal(list[2].place, "Beijing, China");
    assert.equal(list[2].hospitals, 0);
  });

  test("a country's page lists only its own hospitals, whatever the capitals", () => {
    assert.deepEqual(hospitalsIn(hospitals, "india").map((x) => x.name), ["Apollo", "Fortis"]);
    assert.deepEqual(hospitalsIn(hospitals, "china"), []);
  });
});
