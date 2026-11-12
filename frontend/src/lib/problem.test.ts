import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { ApiError } from "./api-error.js";
import { fieldName, problemText } from "./problem.js";

describe("what a person is told when something goes wrong", () => {
  test("a refused form names each field and what to fix", () => {
    const error = new ApiError("Complete all required fields", "VALIDATION_ERROR", {
      formErrors: [],
      fieldErrors: { description: ["This is required"], customerName: ["Use at least 2 characters"] },
    }, 400);
    assert.equal(
      problemText(error, "Could not save"),
      "Complete all required fields. Description: this is required. Customer name: use at least 2 characters.",
    );
  });

  test("a message with no field details is shown as it is", () => {
    assert.equal(problemText(new ApiError("Only an administrator can delete this.", "FORBIDDEN", undefined, 403), "x"), "Only an administrator can delete this.");
  });

  test("a whole-form problem is added to the message", () => {
    const error = new ApiError("Check the payment", "VALIDATION_ERROR", { formErrors: ["Enter a total amount, or both quantity and unit price"], fieldErrors: {} }, 400);
    assert.equal(problemText(error, "x"), "Check the payment. Enter a total amount, or both quantity and unit price.");
  });

  test("no connection gets a message that says so", () => {
    assert.equal(problemText(new TypeError("Failed to fetch"), "x"), "Could not reach the server. Check your connection and try again.");
  });

  test("anything else falls back to the message given", () => {
    assert.equal(problemText(undefined, "Could not save the invoice."), "Could not save the invoice.");
  });

  test("a server error never shows its technical wording", () => {
    assert.equal(problemText(new ApiError("Unexpected server error", "SERVER_ERROR", undefined, 500), "Could not save."), "Could not save. Something went wrong on our side; please try again in a minute.");
  });

  test("field names read as words", () => {
    assert.equal(fieldName("customerPhone"), "Customer phone");
    assert.equal(fieldName("unit_price"), "Unit price");
    assert.equal(fieldName("gallery"), "Gallery");
  });
});
