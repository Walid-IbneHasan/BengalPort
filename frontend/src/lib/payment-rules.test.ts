import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { paymentProblem, taka } from "./payment-rules";

describe("showing an amount of money", () => {
  test("thousands are grouped and whole amounts have no decimals", () => {
    assert.equal(taka(185000), "৳185,000");
  });

  test("paisa are shown when present", () => {
    assert.equal(taka(1250.5), "৳1,250.5");
  });
});

// The API applies the same rules; these keep the form's own messages in step.
describe("checking the amount before sending the customer to bKash", () => {
  const owing = { remaining: 35000, minimum: 5000 };

  test("the full remaining amount and a part payment above the minimum are accepted", () => {
    assert.equal(paymentProblem(35000, owing), "");
    assert.equal(paymentProblem(5000, owing), "");
  });

  test("a part payment below the minimum is refused with the minimum", () => {
    assert.equal(paymentProblem(1000, owing), "The smallest part payment is ৳5,000.");
  });

  test("more than what is owed is refused with the amount owed", () => {
    assert.equal(paymentProblem(40000, owing), "You can pay up to ৳35,000, the amount still due.");
  });

  test("a last amount smaller than the minimum can be paid in full", () => {
    assert.equal(paymentProblem(1200, { remaining: 1200, minimum: 5000 }), "");
  });

  test("an empty or zero amount asks for one", () => {
    assert.equal(paymentProblem(Number(""), owing), "Enter the amount you want to pay.");
    assert.equal(paymentProblem(Number.NaN, owing), "Enter the amount you want to pay.");
  });

  test("fractions of a paisa are refused", () => {
    assert.equal(paymentProblem(5000.555, owing), "Use at most two decimal places.");
  });
});
