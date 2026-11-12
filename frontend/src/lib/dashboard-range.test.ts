import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { defaultGroup, greeting, niceMax, periodLabel, presetRange, rangeDays, rangeLabel, shortTaka } from "./dashboard-range.js";

// 12 Nov 2026, 15:00 in Dhaka (a Thursday).
const now = new Date("2026-11-12T09:00:00Z");

describe("the dashboard's period", () => {
  test("presets follow the calendar in Bangladesh", () => {
    assert.deepEqual(presetRange("today", now), { from: "2026-11-12", to: "2026-11-12" });
    assert.deepEqual(presetRange("month", now), { from: "2026-11-01", to: "2026-11-12" });
    assert.deepEqual(presetRange("last-month", now), { from: "2026-10-01", to: "2026-10-31" });
    assert.deepEqual(presetRange("year", now), { from: "2026-01-01", to: "2026-11-12" });
  });

  test("the week starts on Saturday", () => {
    assert.deepEqual(presetRange("week", now), { from: "2026-11-07", to: "2026-11-12" });
    // Saturday itself starts a new week.
    assert.deepEqual(presetRange("week", new Date("2026-11-07T04:00:00Z")), { from: "2026-11-07", to: "2026-11-07" });
  });

  test("just after midnight in Dhaka it is already the next day", () => {
    assert.deepEqual(presetRange("today", new Date("2026-11-12T18:30:00Z")), { from: "2026-11-13", to: "2026-11-13" });
  });

  test("the chart groups by day, week or month by length", () => {
    assert.equal(rangeDays({ from: "2026-11-01", to: "2026-11-30" }), 30);
    assert.equal(defaultGroup({ from: "2026-11-01", to: "2026-11-30" }), "day");
    assert.equal(defaultGroup({ from: "2026-09-01", to: "2026-11-30" }), "week");
    assert.equal(defaultGroup({ from: "2026-01-01", to: "2026-11-30" }), "month");
  });

  test("periods and ranges read naturally", () => {
    assert.equal(periodLabel("2026-11-03", "day"), "3 Nov");
    assert.equal(periodLabel("2026-11-02", "week"), "Week of 2 Nov");
    assert.equal(periodLabel("2026-11", "month"), "Nov 2026");
    assert.equal(rangeLabel({ from: "2026-11-01", to: "2026-11-12" }), "1–12 Nov 2026");
    assert.equal(rangeLabel({ from: "2026-10-28", to: "2026-11-03" }), "28 Oct – 3 Nov 2026");
    assert.equal(rangeLabel({ from: "2025-12-01", to: "2026-01-02" }), "1 Dec 2025 – 2 Jan 2026");
    assert.equal(rangeLabel({ from: "2026-11-12", to: "2026-11-12" }), "12 Nov 2026");
  });

  test("the chart's scale ends on a round figure and is written short", () => {
    assert.equal(niceMax(0), 1);
    assert.equal(niceMax(830), 1000);
    assert.equal(niceMax(1800), 2000);
    assert.equal(niceMax(23_000), 25_000);
    assert.equal(shortTaka(12_500), "৳12.5k");
    assert.equal(shortTaka(320_000), "৳3.2L");
    assert.equal(shortTaka(11_000_000), "৳1.1Cr");
    assert.equal(shortTaka(-500), "−৳500");
  });

  test("the greeting follows the time in Dhaka", () => {
    assert.equal(greeting(new Date("2026-11-12T03:00:00Z")), "Good morning");
    assert.equal(greeting(now), "Good afternoon");
    assert.equal(greeting(new Date("2026-11-12T13:00:00Z")), "Good evening");
  });
});
