import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { enquiryTitle, statusInfo } from "./member-activity";

describe("how a status is shown to a member", () => {
  test("a new submission reads as received, not as an internal code", () => {
    assert.deepEqual(statusInfo("SUBMITTED"), { label: "Received", tone: "neutral" });
  });

  test("a submission being worked on is marked as in progress", () => {
    assert.deepEqual(statusInfo("IN_REVIEW"), { label: "In review", tone: "progress" });
  });

  test("an approved application is marked as good news", () => {
    assert.deepEqual(statusInfo("APPROVED"), { label: "Approved", tone: "good" });
  });

  test("a rejected application is worded gently", () => {
    assert.deepEqual(statusInfo("REJECTED"), { label: "Not approved", tone: "bad" });
  });

  test("a part payment shows that a balance remains", () => {
    assert.deepEqual(statusInfo("PARTIALLY_PAID"), { label: "Partly paid", tone: "progress" });
  });

  test("a full payment is marked as paid", () => {
    assert.deepEqual(statusInfo("PAID"), { label: "Paid", tone: "good" });
  });

  test("a status added later still reads as words", () => {
    assert.deepEqual(statusInfo("ON_HOLD"), { label: "On hold", tone: "neutral" });
  });
});

describe("the heading of an enquiry in the member's list", () => {
  test("the subject is used when the member gave one", () => {
    assert.equal(
      enquiryTitle({ message: "Details follow", details: { subject: "Family Umrah" } }),
      "Family Umrah",
    );
  });

  test("a short message stands in for a missing subject", () => {
    assert.equal(enquiryTitle({ message: "Call me back please", details: null }), "Call me back please");
  });

  test("a long message is cut at a word with an ellipsis", () => {
    const title = enquiryTitle({
      message: "I would like to know the admission requirements, tuition fees and intake dates for medical programmes in Malaysia",
    });
    assert.equal(title, "I would like to know the admission requirements, tuition fees and intake…");
  });
});
