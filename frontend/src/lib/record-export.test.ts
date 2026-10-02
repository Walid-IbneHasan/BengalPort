import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { applicationRows, enquiryRows, exportFileName } from "./record-export.js";

const umrah = {
  reference: "BP-UMRAH001",
  type: "UMRAH",
  status: "IN_REVIEW",
  createdAt: "2026-10-01T04:30:00.000Z",
  fullName: "Rahim Uddin",
  email: "rahim@example.test",
  phone: "01711000000",
  amountDue: "185000",
  user: { email: "member@example.test" },
  documents: [{ id: "d1" }, { id: "d2" }],
  payments: [
    { amount: "50000", status: "PARTIALLY_PAID" },
    { amount: "20000", status: "FAILED" },
  ],
  details: { fullName: "Rahim Uddin", email: "rahim@example.test", phone: "01711000000", passportNumber: "A01234567", travellers: 3, heardFrom: "A friend" },
};
const education = {
  reference: "BP-EDU001",
  type: "EDUCATION",
  status: "SUBMITTED",
  createdAt: "2026-10-02T04:30:00.000Z",
  fullName: "Salma Akter",
  email: "salma@example.test",
  phone: "01811000000",
  amountDue: null,
  user: null,
  documents: [],
  payments: [],
  details: { fullName: "Salma Akter", email: "salma@example.test", phone: "01811000000", passportNumber: "B7654321" },
};

const column = (rows: ReturnType<typeof applicationRows>, heading: string) => {
  const index = rows[0].indexOf(heading);
  assert.notEqual(index, -1, `no column called ${heading}`);
  return rows.slice(1).map((row) => row[index]);
};

describe("exporting applications", () => {
  test("there is one heading row and one row per application", () => {
    assert.equal(applicationRows([umrah, education]).length, 3);
  });

  test("each application's reference, contact details and status are listed", () => {
    const rows = applicationRows([umrah, education]);
    assert.deepEqual(column(rows, "Reference"), ["BP-UMRAH001", "BP-EDU001"]);
    assert.deepEqual(column(rows, "Phone"), ["01711000000", "01811000000"]);
    assert.deepEqual(column(rows, "Status"), ["In review", "Submitted"]);
    assert.deepEqual(column(rows, "Member account"), ["member@example.test", ""]);
  });

  test("money columns are numbers, and only received payments count as paid", () => {
    const rows = applicationRows([umrah, education]);
    assert.deepEqual(column(rows, "Amount due"), [185000, null]);
    assert.deepEqual(column(rows, "Paid"), [50000, 0]);
    assert.deepEqual(column(rows, "Remaining"), [135000, null]);
  });

  test("money that was refunded no longer counts as paid", () => {
    const refunded = { ...umrah, payments: [{ amount: "50000", status: "PARTIALLY_PAID", refunds: [{ amount: "10000", status: "COMPLETED" }, { amount: "5000", status: "PENDING" }] }] };
    const rows = applicationRows([refunded]);
    assert.deepEqual(column(rows, "Paid"), [40000]);
    assert.deepEqual(column(rows, "Remaining"), [145000]);
  });

  test("the number of attached documents is given", () => {
    assert.deepEqual(column(applicationRows([umrah, education]), "Documents"), [2, 0]);
  });

  test("answers appear under the question's label, shared between divisions", () => {
    const rows = applicationRows([umrah, education]);
    assert.equal(rows[0].filter((heading) => heading === "Passport number").length, 1);
    assert.deepEqual(column(rows, "Passport number"), ["A01234567", "B7654321"]);
  });

  test("the applicant's name, email and phone are not repeated among the answers", () => {
    const headings = applicationRows([umrah])[0];
    assert.equal(headings.filter((heading) => /^full name/i.test(String(heading))).length, 1);
    assert.equal(headings.filter((heading) => /^email/i.test(String(heading))).length, 1);
  });

  test("an answer the form does not define still gets a column", () => {
    assert.deepEqual(column(applicationRows([umrah, education]), "Heard from"), ["A friend", ""]);
  });

  test("questions nobody in the export answered are left out", () => {
    const headings = applicationRows([education])[0];
    assert.ok(!headings.includes("Heard from"));
  });
});

describe("exporting enquiries", () => {
  const enquiry = { type: "GENERAL", status: "SUBMITTED", createdAt: "2026-10-02T04:30:00.000Z", name: "Karim", phone: "01911000000", email: null, message: "Do you arrange visas?", details: { subject: "Visa help" } };

  test("each enquiry's sender, message and subject are listed", () => {
    const rows = enquiryRows([enquiry]);
    assert.deepEqual(column(rows, "Name"), ["Karim"]);
    assert.deepEqual(column(rows, "Email"), [""]);
    assert.deepEqual(column(rows, "Message"), ["Do you arrange visas?"]);
    assert.deepEqual(column(rows, "Subject"), ["Visa help"]);
  });
});

describe("naming the exported file", () => {
  test("the name says what was exported and on which day", () => {
    assert.equal(exportFileName("applications", new Date(2026, 9, 2, 15, 4)), "bengal-port-applications-2026-10-02.xlsx");
  });
});
