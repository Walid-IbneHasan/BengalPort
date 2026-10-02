import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { toLocalInput } from "./datetime";

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
