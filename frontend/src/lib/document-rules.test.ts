import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { documentProblem, formatBytes } from "./document-rules";

describe("showing a file size", () => {
  test("small files are shown in KB", () => {
    assert.equal(formatBytes(48_300), "47 KB");
  });

  test("a tiny file still shows as 1 KB", () => {
    assert.equal(formatBytes(120), "1 KB");
  });

  test("larger files are shown in MB with one decimal", () => {
    assert.equal(formatBytes(2_621_440), "2.5 MB");
  });
});

describe("checking a file before it is uploaded", () => {
  test("a PDF within the size limit can be attached", () => {
    assert.equal(documentProblem({ name: "passport.pdf", size: 400_000 }, 0), "");
  });

  test("a phone photo with an upper-case extension can be attached", () => {
    assert.equal(documentProblem({ name: "IMG_2041.JPG", size: 3_000_000 }, 2), "");
  });

  test("a Word document is turned away with the accepted types", () => {
    assert.equal(
      documentProblem({ name: "cv.docx", size: 90_000 }, 0),
      "“cv.docx” is not a PDF, JPEG, PNG or WebP file.",
    );
  });

  test("a file over 10 MB is turned away with its size", () => {
    assert.equal(
      documentProblem({ name: "scan.pdf", size: 12 * 1024 * 1024 }, 0),
      "“scan.pdf” is 12.0 MB. The limit is 10 MB per file.",
    );
  });

  test("an eleventh file is turned away", () => {
    assert.equal(
      documentProblem({ name: "extra.pdf", size: 1000 }, 10),
      "An application can hold up to 10 documents.",
    );
  });
});
