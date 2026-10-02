import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { detailGroups } from "./submission-details";

describe("reading a submitted application", () => {
  test("answers appear under their form step, labelled and ordered as on the form", () => {
    assert.deepEqual(
      detailGroups("BUSINESS", {
        preferredCountry: "China",
        applicationTypes: ["Trade Fair Visit", "Factory / Supplier Visit"],
      }),
      [
        {
          title: "Travel request",
          rows: [
            {
              label: "Application type",
              value: "Trade Fair Visit, Factory / Supplier Visit",
            },
            { label: "Preferred destination country", value: "China" },
          ],
        },
      ],
    );
  });

  test("a ticked declaration reads as Yes", () => {
    const rows = detailGroups("BUSINESS", { truthDeclaration: true }).flatMap(
      (group) => group.rows,
    );
    assert.deepEqual(
      rows.map((row) => row.value),
      ["Yes"],
    );
  });

  test("questions left blank are not listed", () => {
    assert.deepEqual(
      detailGroups("BUSINESS", {
        companyWebsite: "",
        documents: [],
        currentVisaStatus: null,
      }),
      [],
    );
  });

  test("answers that are not on the form are kept under Additional details", () => {
    assert.deepEqual(
      detailGroups("BUSINESS", {
        visitors: 2,
        passportExpiryDate: "2029-08-29",
        purposeOfVisit: "Supplier meetings",
      }).at(-1),
      {
        title: "Additional details",
        rows: [
          { label: "Visitors", value: "2" },
          { label: "Purpose of visit", value: "Supplier meetings" },
        ],
      },
    );
  });
});

describe("reading a submitted enquiry", () => {
  test("its extra details are listed with readable labels", () => {
    assert.deepEqual(detailGroups(undefined, { subject: "Pricing" }), [
      { title: "Additional details", rows: [{ label: "Subject", value: "Pricing" }] },
    ]);
  });

  test("an enquiry without extra details has nothing to list", () => {
    assert.deepEqual(detailGroups(undefined, null), []);
  });
});
