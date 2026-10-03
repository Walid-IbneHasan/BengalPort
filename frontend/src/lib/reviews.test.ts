import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { reviewProblem, reviewState, serviceName, stars } from "./reviews.js";

const review = { rating: 5, name: "Rahim U.", body: "Clear guidance from the first call." };

describe("checking a review before it is sent", () => {
  test("a rating, a name and a sentence are enough", () => {
    assert.equal(reviewProblem(review), "");
  });

  test("a rating has to be chosen", () => {
    assert.equal(reviewProblem({ ...review, rating: 0 }), "Choose a rating from 1 to 5 stars.");
  });

  test("the name to show cannot be left empty", () => {
    assert.equal(reviewProblem({ ...review, name: "  " }), "Enter the name to show with your review.");
  });

  test("the review needs at least a sentence", () => {
    assert.equal(reviewProblem({ ...review, body: "Good" }), "Write at least a sentence about your experience.");
  });

  test("a very long review is turned back with the limit", () => {
    assert.equal(reviewProblem({ ...review, body: "a".repeat(1501) }), "Keep your review under 1,500 characters.");
  });
});

describe("what a member is told about their review", () => {
  test("a new review waits for approval and can still be changed", () => {
    assert.deepEqual(reviewState("PENDING"), { label: "Waiting for approval", tone: "progress", editable: true });
  });

  test("an approved review is published and fixed", () => {
    assert.deepEqual(reviewState("APPROVED"), { label: "Published", tone: "good", editable: false });
  });

  test("a hidden review is not published", () => {
    assert.deepEqual(reviewState("HIDDEN"), { label: "Not published", tone: "neutral", editable: false });
  });
});

describe("showing a rating", () => {
  test("is five stars, filled up to the rating", () => {
    assert.deepEqual(stars(3), [true, true, true, false, false]);
    assert.deepEqual(stars(5), [true, true, true, true, true]);
  });

  test("a rating outside 1 to 5 is brought inside it", () => {
    assert.deepEqual(stars(9), [true, true, true, true, true]);
    assert.deepEqual(stars(0), [false, false, false, false, false]);
  });
});

describe("naming a service", () => {
  test("uses the name the website gives each service", () => {
    assert.equal(serviceName("EDUCATION"), "Global Education");
    assert.equal(serviceName("UMRAH"), "Global Umrah");
  });

  test("an unknown service is shown as written", () => {
    assert.equal(serviceName("LOGISTICS"), "Logistics");
  });
});
