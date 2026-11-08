import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { answerText, choiceOptions, filledApplication, filledEnquiry, printTitle } from "./printable";

describe("showing an answer on the printed form", () => {
  test("a date reads as a day, month and year", () => {
    assert.equal(answerText({ key: "dob", label: "Date of birth", type: "date" }, "2004-03-12"), "12 Mar 2004");
  });

  test("an answer that is not a date is shown as it was typed", () => {
    assert.equal(answerText({ key: "dob", label: "Date of birth", type: "date" }, "around 2004"), "around 2004");
  });

  test("a number is shown as text", () => {
    assert.equal(answerText({ key: "years", label: "Years", type: "number" }, 4), "4");
  });

  test("an unanswered field is empty", () => {
    assert.equal(answerText({ key: "note", label: "Note" }, undefined), "");
    assert.equal(answerText({ key: "note", label: "Note" }, null), "");
  });
});

describe("listing the choices of a multiple-choice question", () => {
  const field = { key: "kinds", label: "Kinds", type: "multi" as const, options: ["One", "Two"] };

  test("the form's own choices come first, in order", () => {
    assert.deepEqual(choiceOptions(field, ["Two"]), ["One", "Two"]);
  });

  test("a choice since removed from the form still appears, so no answer is lost", () => {
    assert.deepEqual(choiceOptions(field, ["Old choice", "One"]), ["One", "Two", "Old choice"]);
  });

  test("a question never answered shows just the form's choices", () => {
    assert.deepEqual(choiceOptions(field, undefined), ["One", "Two"]);
  });
});

describe("preparing an application for printing", () => {
  const record = {
    reference: "BP-22UM52DZ",
    type: "EDUCATION",
    fullName: "Sadia Rahman (corrected)",
    email: "new@example.test",
    phone: "01711000000",
    createdAt: "2026-11-08T04:30:00.000Z",
    details: { fullName: "Sadia Rahman", email: "old@example.test", phone: "0100", oldQuestion: "Kept answer" },
    documents: [{ id: "d1", name: "passport.pdf" }],
  };

  test("a staff correction to the name, email or phone is what prints", () => {
    const filled = filledApplication(record);
    assert.equal(filled.answers.fullName, "Sadia Rahman (corrected)");
    assert.equal(filled.answers.email, "new@example.test");
    assert.equal(filled.answers.phone, "01711000000");
  });

  test("an answer the form no longer asks for still prints", () => {
    assert.deepEqual(filledApplication(record).extras, [{ label: "Old question", value: "Kept answer" }]);
  });

  test("the reference, date and document names come along", () => {
    const filled = filledApplication(record);
    assert.equal(filled.reference, "BP-22UM52DZ");
    assert.equal(filled.submittedAt, "2026-11-08T04:30:00.000Z");
    assert.deepEqual(filled.documents, ["passport.pdf"]);
  });

  test("an application with no answers stored still prints", () => {
    const filled = filledApplication({ ...record, details: null, documents: undefined });
    assert.deepEqual(filled.extras, []);
    assert.deepEqual(filled.documents, []);
  });
});

describe("preparing an enquiry for printing", () => {
  const record = {
    type: "UMRAH",
    name: "Karim",
    phone: "01711000002",
    email: null,
    message: "Family of four",
    details: { subject: "Umrah in March", service: "UMRAH", budget: "৳3 lakh" },
    createdAt: "2026-11-08T04:30:00.000Z",
  };

  test("its fields are the ones on the enquiry form", () => {
    const filled = filledEnquiry(record);
    assert.equal(filled.name, "Karim");
    assert.equal(filled.phone, "01711000002");
    assert.equal(filled.email, "");
    assert.equal(filled.subject, "Umrah in March");
    assert.equal(filled.message, "Family of four");
  });

  test("anything else stored with it prints too, but not the internal division tag", () => {
    assert.deepEqual(filledEnquiry(record).extras, [{ label: "Budget", value: "৳3 lakh" }]);
  });

  test("an unknown enquiry type uses the general enquiry wording", () => {
    assert.equal(filledEnquiry({ ...record, type: "OTHER" }).type, "GENERAL");
  });
});

describe("naming the file a browser saves", () => {
  test("an application is named by reference and applicant", () => {
    assert.equal(
      printTitle("application", { reference: "BP-22UM52DZ", type: "EDUCATION", fullName: "Sadia Rahman" }),
      "BP-22UM52DZ - Education application - Sadia Rahman",
    );
  });

  test("an enquiry is named by its sender", () => {
    assert.equal(printTitle("enquiry", { type: "GENERAL", name: "Karim" }), "General enquiry - Karim");
  });

  test("an invoice is named by number and customer", () => {
    assert.equal(printTitle("invoice", { number: "INV-000012", customerName: "Rahim" }), "INV-000012 - Rahim");
  });
});
