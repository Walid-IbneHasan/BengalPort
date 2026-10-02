import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { balance, paymentProblem } from "../src/lib/payment-rules.js";

describe("what is still owed on an application", () => {
  test("nothing has been paid yet", () => {
    assert.deepEqual(balance(60000, []), { amountDue: 60000, paid: 0, remaining: 60000 });
  });

  test("part payments reduce what is left", () => {
    const payments = [{ amount: "25000.00", status: "PARTIALLY_PAID" }, { amount: "10000.00", status: "PARTIALLY_PAID" }];
    assert.deepEqual(balance(60000, payments), { amountDue: 60000, paid: 35000, remaining: 25000 });
  });

  test("payments that were abandoned or failed do not count", () => {
    const payments = [{ amount: 25000, status: "PENDING" }, { amount: 25000, status: "FAILED" }, { amount: 5000, status: "PARTIALLY_PAID" }];
    assert.equal(balance(60000, payments).paid, 5000);
  });

  test("paying it off leaves nothing", () => {
    assert.equal(balance(60000, [{ amount: 25000, status: "PARTIALLY_PAID" }, { amount: 35000, status: "PAID" }]).remaining, 0);
  });

  test("an overpayment never shows as a negative balance", () => {
    assert.equal(balance(1000, [{ amount: 1500, status: "PAID" }]).remaining, 0);
  });

  test("before an amount is set there is no balance, only what was paid", () => {
    assert.deepEqual(balance(null, [{ amount: 500, status: "PAID" }]), { amountDue: null, paid: 500, remaining: null });
  });

  test("taka and paisa add up exactly", () => {
    assert.equal(balance(0.3, [{ amount: 0.1, status: "PARTIALLY_PAID" }, { amount: 0.2, status: "PAID" }]).remaining, 0);
  });
});

describe("checking the amount a customer wants to pay", () => {
  const owing = { remaining: 35000, minimum: 5000 };

  test("the full remaining amount is accepted", () => {
    assert.equal(paymentProblem(35000, owing), "");
  });

  test("a part payment at or above the minimum is accepted", () => {
    assert.equal(paymentProblem(5000, owing), "");
    assert.equal(paymentProblem(12500.5, owing), "");
  });

  test("a part payment below the minimum is refused with the minimum", () => {
    assert.equal(paymentProblem(1000, owing), "The smallest part payment is ৳5,000.");
  });

  test("more than what is owed is refused with the amount owed", () => {
    assert.equal(paymentProblem(40000, owing), "You can pay up to ৳35,000, the amount still due.");
  });

  test("when less than the minimum is left, that last amount can still be paid", () => {
    assert.equal(paymentProblem(1200, { remaining: 1200, minimum: 5000 }), "");
  });

  test("but not a part of that last amount", () => {
    assert.equal(paymentProblem(600, { remaining: 1200, minimum: 5000 }), "The smallest part payment is ৳1,200.");
  });

  test("zero, negative and non-numeric amounts are refused", () => {
    for (const amount of [0, -50, Number.NaN, Number.POSITIVE_INFINITY])
      assert.equal(paymentProblem(amount, owing), "Enter the amount you want to pay.");
  });

  test("fractions of a paisa are refused", () => {
    assert.equal(paymentProblem(5000.555, owing), "Use at most two decimal places.");
  });

  test("an application that is fully paid cannot be paid again", () => {
    assert.equal(paymentProblem(100, { remaining: 0, minimum: 0 }), "There is nothing left to pay on this application.");
  });

  test("an application without a confirmed amount cannot be paid yet", () => {
    assert.equal(paymentProblem(100, { remaining: null, minimum: 0 }), "The amount due has not been confirmed yet.");
  });
});
