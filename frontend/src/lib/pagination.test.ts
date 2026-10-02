import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { lastPage, pageSummary } from "./pagination";

describe("the pager under an admin table", () => {
  test("a middle page shows which records are on screen", () => {
    assert.equal(pageSummary({ total: 132, page: 2, pageSize: 25 }), "Showing 26–50 of 132");
  });

  test("the last page stops at the total", () => {
    assert.equal(pageSummary({ total: 132, page: 6, pageSize: 25 }), "Showing 126–132 of 132");
  });

  test("an empty list says so", () => {
    assert.equal(pageSummary({ total: 0, page: 1, pageSize: 25 }), "No records");
  });

  test("a partly filled last page still counts as a page", () => {
    assert.equal(lastPage({ total: 132, page: 1, pageSize: 25 }), 6);
  });

  test("a list that exactly fills its pages has no extra page", () => {
    assert.equal(lastPage({ total: 50, page: 1, pageSize: 25 }), 2);
  });

  test("an empty list still has one page", () => {
    assert.equal(lastPage({ total: 0, page: 1, pageSize: 25 }), 1);
  });
});
