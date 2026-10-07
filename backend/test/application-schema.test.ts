// The rules a submitted application must meet, checked without a database.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { applicationSchema, requiredApplicationFields } from "../src/lib/schemas.js";

// Every answer the Umrah form requires, as the form would send it.
function umrah(overrides: Record<string, unknown> = {}) {
  const details: Record<string, unknown> = {};
  for (const key of requiredApplicationFields.UMRAH) details[key] = "answer";
  Object.assign(details, { fullName: "Nadia Rahman", email: "nadia@example.com", phone: "+880 1711-991035", truthDeclaration: true, contactConsent: true, visaAcknowledgement: true, packageTypes: ["Family Umrah"] }, overrides);
  return { type: "UMRAH", fullName: details.fullName, email: details.email, phone: details.phone, details };
}

describe("checking a submitted application", () => {
  test("a complete application is accepted", () => {
    assert.equal(applicationSchema.safeParse(umrah()).success, true);
  });

  test("stray spaces around the name, phone and email are forgiven, not refused", () => {
    const parsed = applicationSchema.safeParse(umrah({ fullName: "Nadia Rahman ", phone: " +880 1711-991035", email: " nadia@example.com " }));
    assert.equal(parsed.success, true, JSON.stringify(parsed.success ? null : parsed.error.flatten()));
    if (!parsed.success) return;
    assert.equal(parsed.data.fullName, "Nadia Rahman");
    assert.equal(parsed.data.email, "nadia@example.com");
    assert.equal(parsed.data.details.fullName, "Nadia Rahman");
    assert.equal(parsed.data.details.email, "nadia@example.com");
  });

  test("every written answer is stored without its surrounding spaces", () => {
    const parsed = applicationSchema.safeParse(umrah({ departureCity: "  Dhaka  " }));
    assert.equal(parsed.success, true);
    if (parsed.success) assert.equal(parsed.data.details.departureCity, "Dhaka");
  });

  test("an email with a space inside is still refused", () => {
    const parsed = applicationSchema.safeParse(umrah({ email: "nadia @example.com" }));
    assert.equal(parsed.success, false);
  });

  test("a required answer left blank is reported with the field's own name", () => {
    const parsed = applicationSchema.safeParse(umrah({ departureCity: "" }));
    assert.equal(parsed.success, false);
    if (parsed.success) return;
    const issue = parsed.error.issues.find((item) => item.path.join(".") === "details.departureCity");
    assert.ok(issue, "the issue names details.departureCity");
    assert.equal(issue!.message, "Required field");
  });

  test("a declaration left unticked is a missing answer", () => {
    const parsed = applicationSchema.safeParse(umrah({ truthDeclaration: false }));
    assert.equal(parsed.success, false);
  });
});
