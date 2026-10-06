import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { isHighlighted, upcomingDepartures } from "./umrah.js";

const today = new Date("2026-10-06T09:00:00");
const departures = [
  { date: "2026-09-20", label: "Already left" },
  { date: "2027-02-20", label: "Ramadan group" },
  { date: "2026-11-14", label: "November group" },
  { date: "2026-12-19", label: "Winter family group" },
  { date: "2027-04-03", label: "Spring group" },
];

describe("the next group departures", () => {
  test("past dates are hidden, the rest are sorted, three at most", () => {
    const shown = upcomingDepartures(departures, today);
    assert.deepEqual(shown.map((d) => d.label), ["November group", "Winter family group", "Ramadan group"]);
  });

  test("today's departure still counts", () => {
    assert.equal(upcomingDepartures([{ date: "2026-10-06", label: "Today" }], today).length, 1);
  });

  test("each has the day and the short month for its pill", () => {
    const [first] = upcomingDepartures(departures, today);
    assert.equal(first.day, "14");
    assert.equal(first.month, "Nov");
  });

  test("none left gives an empty list", () => {
    assert.deepEqual(upcomingDepartures([{ date: "2020-01-01", label: "Old" }], today), []);
  });
});

describe("the highlighted package", () => {
  test("is the one with a tag", () => {
    assert.equal(isHighlighted({ tag: "Most chosen" }), true);
    assert.equal(isHighlighted({ tag: "  " }), false);
  });
});
