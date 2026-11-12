import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  accessText,
  blankDocument,
  daysLeft,
  documentBody,
  draftFromDocument,
  expiryText,
  expiryTone,
  fileProblem,
  fileSize,
  latestFile,
  needsCustomer,
  type OfficeDocument,
} from "./office-documents.js";

const passport: OfficeDocument = {
  id: "d1",
  category: "VISA",
  docType: "Passport",
  name: "Passport of Rahima Begum",
  number: "A1234567",
  customer: { id: "c1", code: 12, customerCode: "C-000012", name: "Rahima Begum" },
  employee: null,
  branchId: "b1",
  issueDate: "2021-01-31T18:00:00.000Z",
  expiryDate: "2031-01-30T18:00:00.000Z",
  verification: "PENDING",
  verifiedByName: null,
  verifiedAt: null,
  notes: null,
  restrictedTo: ["MANAGER"],
  uploadedByName: "Karim",
  files: [
    { id: "f2", version: 2, fileName: "passport-new.pdf", mimeType: "application/pdf", byteSize: 2048, uploadedByName: "Karim", createdAt: "2026-11-02T10:00:00Z" },
    { id: "f1", version: 1, fileName: "passport.pdf", mimeType: "application/pdf", byteSize: 1024, uploadedByName: "Karim", createdAt: "2026-11-01T10:00:00Z" },
  ],
  sensitive: true,
};

describe("expiry dates", () => {
  const now = new Date("2026-11-12T06:00:00Z");
  test("days are counted by the calendar in Bangladesh", () => {
    assert.equal(daysLeft("2026-11-23T18:00:00Z", now), 12);
    assert.equal(daysLeft("2026-11-11T18:00:00Z", now), 0);
    assert.equal(daysLeft("2026-11-08T18:00:00Z", now), -3);
    assert.equal(daysLeft(null, now), null);
  });

  test("they read as words and turn amber at 15 days, red at 7", () => {
    assert.equal(expiryText(12), "in 12 days");
    assert.equal(expiryText(1), "tomorrow");
    assert.equal(expiryText(0), "expires today");
    assert.equal(expiryText(-1), "expired yesterday");
    assert.equal(expiryText(-3), "expired 3 days ago");
    assert.equal(expiryText(null), "");
    assert.equal(expiryTone(30), "");
    assert.equal(expiryTone(15), "warn");
    assert.equal(expiryTone(8), "warn");
    assert.equal(expiryTone(7), "bad");
    assert.equal(expiryTone(-2), "bad");
    assert.equal(expiryTone(null), "");
  });
});

describe("files", () => {
  test("sizes are short, the newest version is found, and wrong files are named before upload", () => {
    assert.equal(fileSize(512), "512 B");
    assert.equal(fileSize(240 * 1024), "240 KB");
    assert.equal(fileSize(1.45 * 1024 * 1024), "1.4 MB");
    assert.equal(latestFile(passport)?.version, 2);
    assert.equal(latestFile({ files: [] }), null);
    assert.equal(fileProblem({ type: "application/pdf", size: 1000 }), "");
    assert.equal(fileProblem({ type: "image/jpeg", size: 20 * 1024 * 1024 }), "", "photos are made smaller first");
    assert.match(fileProblem({ type: "application/pdf", size: 11 * 1024 * 1024 }), /10 MB/);
    assert.match(fileProblem({ type: "application/msword", size: 1000 }), /PDF, JPEG, PNG or WebP/);
  });
});

describe("document form", () => {
  test("who may open it reads in words", () => {
    assert.equal(accessText([]), "Everyone whose role may see documents");
    assert.equal(accessText(["ACCOUNTANT", "MANAGER"]), "Only Accountant, Manager (and the Super Admin)");
  });

  test("a document fills the form and goes back with its branch and customer", () => {
    const draft = draftFromDocument(passport);
    assert.equal(draft.issueDate, "2021-02-01");
    assert.equal(draft.customer?.customerCode, "C-000012");
    const body = documentBody(draft);
    assert.equal(body.customerId, "c1");
    assert.equal(body.employeeId, null);
    assert.equal(body.branchId, "b1");
    assert.equal(body.expiryDate, "2031-01-31T00:00:00+06:00");
    assert.deepEqual(body.restrictedTo, ["MANAGER"]);
  });

  test("only client and visa papers carry a customer, only employee papers a member of staff", () => {
    const company = documentBody({ ...draftFromDocument(passport), category: "COMPANY", employeeId: "u1" });
    assert.equal(company.customerId, null);
    assert.equal(company.employeeId, null);
    const staff = documentBody({ ...blankDocument(), category: "EMPLOYEE", employeeId: "u1" });
    assert.equal(staff.employeeId, "u1");
    assert.equal(needsCustomer("CLIENT"), true);
    assert.equal(needsCustomer("COMPANY"), false);
    assert.equal(blankDocument().category, "CLIENT");
    assert.equal(blankDocument().issueDate, "");
  });
});
