import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DHAKA, arcPath, marketPlace, project } from "./markets.js";

describe("placing a market on the map", () => {
  test("knows the markets the business page names, in any case", () => {
    assert.deepEqual(marketPlace("China"), { name: "China", lat: 23.1, lon: 113.3 });
    assert.equal(marketPlace("u.a.e.")?.lon, 55.3);
  });

  test("a place it does not know draws nothing", () => {
    assert.equal(marketPlace("Mongolia"), null);
  });

  test("projects degrees onto the 360 by 180 map", () => {
    assert.deepEqual(project(0, 0), { x: 180, y: 90 });
    assert.deepEqual(project(DHAKA.lat, DHAKA.lon), { x: 270.4, y: 66.2 });
  });

  test("an arc starts at the origin and bows north", () => {
    const d = arcPath(DHAKA, { name: "China", lat: 23.1, lon: 113.3 });
    assert.match(d, /^M270\.4 66\.2 Q/);
    const control = Number(d.split(" ")[3]);
    assert.ok(control < 66.2, "control point sits above both ends");
  });
});
