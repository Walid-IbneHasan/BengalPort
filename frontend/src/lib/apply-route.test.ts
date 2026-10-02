import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { applyHref, applyState, opportunityTab } from "./apply-route";

const state = (query: string) => applyState(new URLSearchParams(query));

describe("what the Apply page opens for a link", () => {
  test("a bare link opens the general enquiry", () => {
    assert.deepEqual(state(""), { tab: "GENERAL", form: "enquiry", subject: "" });
  });

  test("a division link opens that division's full application", () => {
    assert.deepEqual(state("tab=education"), { tab: "EDUCATION", form: "application", subject: "" });
  });

  test("links using the older type parameter still work", () => {
    assert.equal(state("type=business").tab, "BUSINESS");
  });

  test("an Umrah link opens the quick enquiry, as existing buttons promise", () => {
    assert.deepEqual(state("tab=umrah"), { tab: "UMRAH", form: "enquiry", subject: "" });
  });

  test("a link can ask for a division's quick enquiry", () => {
    assert.equal(state("tab=business&form=enquiry").form, "enquiry");
  });

  test("a link can ask for the Umrah application", () => {
    assert.equal(state("tab=umrah&form=application").form, "application");
  });

  test("the general tab has no application form", () => {
    assert.equal(state("tab=general&form=application").form, "enquiry");
  });

  test("an unknown division falls back to the general enquiry", () => {
    assert.deepEqual(state("tab=shipping"), { tab: "GENERAL", form: "enquiry", subject: "" });
  });

  test("the thing being asked about becomes the enquiry subject", () => {
    assert.equal(state("tab=business&form=enquiry&about=Eastern+Textiles+Group").subject, "Eastern Textiles Group");
  });

  test("an overlong subject from a link is cut to fit the field", () => {
    assert.equal(state(`about=${"x".repeat(400)}`).subject.length, 150);
  });
});

describe("links to the Apply page", () => {
  test("a division link names the division", () => {
    assert.equal(applyHref("HEALTHCARE"), "/apply?tab=healthcare");
  });

  test("an enquiry link about something carries its name", () => {
    assert.equal(
      applyHref("BUSINESS", "enquiry", "Eastern Textiles Group"),
      "/apply?tab=business&form=enquiry&about=Eastern+Textiles+Group",
    );
  });

  test("a link round-trips through the Apply page", () => {
    assert.deepEqual(
      state(applyHref("UMRAH", "application", "Ramadan Umrah 2027").split("?")[1]),
      { tab: "UMRAH", form: "application", subject: "Ramadan Umrah 2027" },
    );
  });
});

describe("which division an opportunity belongs to", () => {
  test("factory visits and business tours are business enquiries", () => {
    assert.equal(opportunityTab("FACTORY_VISIT"), "BUSINESS");
    assert.equal(opportunityTab("BUSINESS_TOUR"), "BUSINESS");
  });

  test("scholarships are education enquiries", () => {
    assert.equal(opportunityTab("SCHOLARSHIP"), "EDUCATION");
  });

  test("a division category maps to itself", () => {
    assert.equal(opportunityTab("UMRAH"), "UMRAH");
    assert.equal(opportunityTab("HEALTHCARE"), "HEALTHCARE");
  });

  test("events go to the general enquiry", () => {
    assert.equal(opportunityTab("EVENT"), "GENERAL");
  });
});
