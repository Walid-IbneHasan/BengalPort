import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { fieldError, phoneProblem } from "./application-validation";
import type { ApplicationField } from "./application-forms";

const text: ApplicationField = { key: "nationality", label: "Nationality", required: true };
const email: ApplicationField = { key: "email", label: "Email address", type: "email", required: true };
const phone: ApplicationField = { key: "phone", label: "Mobile / WhatsApp", type: "tel", required: true };

describe("checking an answer before moving to the next step", () => {
  test("a filled-in required answer is accepted", () => {
    assert.equal(fieldError(text, "Bangladeshi"), "");
  });

  test("a blank required answer asks for it by name", () => {
    assert.equal(fieldError(text, "   "), "Please complete “Nationality”.");
  });

  test("an optional answer may be left blank", () => {
    assert.equal(fieldError({ key: "companyWebsite", label: "Company website" }, ""), "");
  });

  test("a required list needs at least one choice", () => {
    const field: ApplicationField = { key: "packageTypes", label: "Type of Umrah journey", type: "multi", required: true, options: ["Family Umrah"] };
    assert.equal(fieldError(field, []), "Please complete “Type of Umrah journey”.");
    assert.equal(fieldError(field, ["Family Umrah"]), "");
  });

  test("a declaration must be ticked", () => {
    const field: ApplicationField = { key: "truthDeclaration", label: "I confirm that the information is accurate.", type: "checkbox", required: true };
    assert.equal(fieldError(field, false), "Please tick “I confirm that the information is accurate.”");
    assert.equal(fieldError(field, true), "");
  });

  test("an email address without a domain is caught on its own step", () => {
    assert.equal(fieldError(email, "nadia@gmail"), "Enter a valid email address, like name@example.com.");
  });

  test("a normal email address is accepted", () => {
    assert.equal(fieldError(email, "nadia.rahman@example.com"), "");
  });

  test("a phone number that is too short is caught on its own step", () => {
    assert.equal(fieldError(phone, "01711"), "Enter a full phone number, including the area or country code.");
  });

  test("a phone number with spaces and a country code is accepted", () => {
    assert.equal(fieldError(phone, "+880 1711-991035"), "");
  });

  test("a phone number that is one digit repeated is questioned", () => {
    assert.equal(fieldError(phone, "0000000"), "That does not look like a real phone number. Please check the digits.");
  });
});

// The same phone check serves the quick enquiry form, which has no field
// definitions.
describe("checking a phone number on its own", () => {
  test("a Bangladeshi mobile number is accepted", () => {
    assert.equal(phoneProblem("01711991035"), "");
    assert.equal(phoneProblem("+880 1711-991035"), "");
  });

  test("too few digits ask for the full number", () => {
    assert.equal(phoneProblem("12345"), "Enter a full phone number, including the area or country code.");
  });

  test("one digit repeated, or more digits than any number has, is questioned", () => {
    const message = "That does not look like a real phone number. Please check the digits.";
    assert.equal(phoneProblem("0000000"), message);
    assert.equal(phoneProblem("1111111111"), message);
    assert.equal(phoneProblem("1234567890123456"), message);
  });

  test("a blank number is left to the required check", () => {
    assert.equal(phoneProblem(""), "");
  });

  test("a passport that has already expired is questioned", () => {
    const field: ApplicationField = { key: "passportExpiryDate", label: "Passport expiry date", type: "date", required: true };
    assert.equal(fieldError(field, "2020-01-01"), "“Passport expiry date” is in the past. Please check the date.");
  });

  test("a date of birth in the past is fine", () => {
    const field: ApplicationField = { key: "dateOfBirth", label: "Date of birth", type: "date", required: true };
    assert.equal(fieldError(field, "1990-05-20"), "");
  });
});
