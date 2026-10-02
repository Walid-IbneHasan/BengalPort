import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { editBody, editProblem, editSteps, editValues } from "./application-edit.js";

const application = {
  type: "UMRAH",
  fullName: "Rahim Uddin",
  email: "rahim@example.test",
  phone: "01711000000",
  details: { fullName: "Rahim Uddin", email: "rahim@example.test", phone: "01711000000", passportNumber: "A01234567", heardFrom: "A friend" },
};

describe("the questions staff can correct", () => {
  test("they follow the steps of the division's own form", () => {
    const steps = editSteps("UMRAH");
    assert.ok(steps.length >= 2);
    assert.ok(steps.some((step) => step.fields.some((field) => field.key === "passportNumber")));
  });

  test("declarations the applicant ticked are theirs and cannot be edited", () => {
    for (const division of ["BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"])
      assert.ok(!editSteps(division).some((step) => step.fields.some((field) => field.type === "checkbox")), division);
  });

  test("a division without a form has nothing to correct", () => {
    assert.deepEqual(editSteps("UNKNOWN"), []);
  });
});

describe("starting a correction", () => {
  test("the form starts from the stored answers", () => {
    assert.equal(editValues(application).passportNumber, "A01234567");
  });

  test("the name, email and phone start from the application itself", () => {
    const values = editValues({ ...application, fullName: "Rahim U.", details: { passportNumber: "A01234567" } });
    assert.equal(values.fullName, "Rahim U.");
    assert.equal(values.email, "rahim@example.test");
  });

  test("changing the form does not change the application being shown", () => {
    const values = editValues(application);
    values.passportNumber = "CHANGED";
    assert.equal(application.details.passportNumber, "A01234567");
  });
});

describe("checking a correction", () => {
  const values = () => editValues(application);

  test("an application with a name, email and phone can be saved", () => {
    assert.equal(editProblem("UMRAH", values()), "");
  });

  test("a missing name is pointed out", () => {
    assert.match(editProblem("UMRAH", { ...values(), fullName: " " }), /name/i);
  });

  test("a malformed email is pointed out", () => {
    assert.match(editProblem("UMRAH", { ...values(), email: "rahim@" }), /email/i);
  });

  test("a phone number that is too short is pointed out", () => {
    assert.match(editProblem("UMRAH", { ...values(), phone: "123" }), /phone/i);
  });

  test("other questions may stay unanswered", () => {
    assert.equal(editProblem("UMRAH", { ...values(), passportNumber: "" }), "");
  });
});

describe("saving a correction", () => {
  test("the corrected name, email and phone are sent trimmed, with all answers", () => {
    const body = editBody(application, { ...editValues(application), fullName: "  Rahim Uddin Ahmed ", passportNumber: "B7654321" });
    assert.equal(body.fullName, "Rahim Uddin Ahmed");
    assert.equal(body.details.fullName, "Rahim Uddin Ahmed");
    assert.equal(body.details.passportNumber, "B7654321");
  });

  test("answers the form does not show are kept", () => {
    const body = editBody(application, editValues(application));
    assert.equal(body.details.heardFrom, "A friend");
  });
});
