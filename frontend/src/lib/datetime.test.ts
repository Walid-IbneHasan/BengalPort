import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { shortDate, toLocalInput } from "./datetime";

describe("filling a date-and-time field", () => {
  test("the field shows the local clock time, not UTC", () => {
    assert.equal(toLocalInput(new Date(2026, 9, 2, 14, 5)), "2026-10-02T14:05");
  });

  test("single-digit months, days and hours are padded", () => {
    assert.equal(toLocalInput(new Date(2027, 0, 3, 9, 7)), "2027-01-03T09:07");
  });

  test("reading the field back gives the same moment", () => {
    const moment = new Date(2026, 11, 31, 23, 59);
    assert.equal(new Date(toLocalInput(moment)).getTime(), moment.getTime());
  });
});

describe("showing an opportunity's deadline", () => {
  test("a date reads as day, short month and year, the same for every visitor", () => {
    assert.equal(shortDate("2026-10-07"), "7 Oct 2026");
    // 18:30 UTC is already the next day in Bangladesh, where the deadline applies.
    assert.equal(shortDate("2026-12-31T18:30:00.000Z"), "1 Jan 2027");
  });

  test("an unreadable date is shown as it came", () => {
    assert.equal(shortDate("soon"), "soon");
  });
});
