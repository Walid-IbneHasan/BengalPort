import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { crc32 } from "node:zlib";
import { xlsx } from "./xlsx.js";

// Reads back the files of an uncompressed zip the way a spreadsheet program
// would: from the directory at the end of the file.
function unzip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (from: number, length: number) => new TextDecoder().decode(bytes.subarray(from, from + length));
  const end = bytes.length - 22;
  assert.equal(view.getUint32(end, true), 0x06054b50, "end-of-directory record");
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const files = new Map<string, string>();
  for (let i = 0; i < count; i++) {
    assert.equal(view.getUint32(at, true), 0x02014b50, "directory entry");
    const crc = view.getUint32(at + 16, true);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const local = view.getUint32(at + 42, true);
    const name = text(at + 46, nameLength);
    assert.equal(view.getUint32(local, true), 0x04034b50, `local header of ${name}`);
    assert.equal(view.getUint16(local + 8, true), 0, `${name} is stored uncompressed`);
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
    const content = bytes.subarray(start, start + size);
    assert.equal(crc32(content), crc, `checksum of ${name}`);
    files.set(name, new TextDecoder().decode(content));
    at += 46 + nameLength + view.getUint16(at + 30, true) + view.getUint16(at + 32, true);
  }
  return files;
}

const sheet = (rows: Parameters<typeof xlsx>[1]) => unzip(xlsx("Applications", rows)).get("xl/worksheets/sheet1.xml")!;

describe("writing an Excel workbook", () => {
  test("the file holds every part a workbook needs", () => {
    const files = unzip(xlsx("Applications", [["Reference"], ["BP-1"]]));
    for (const part of ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels", "xl/styles.xml", "xl/worksheets/sheet1.xml"])
      assert.ok(files.has(part), part);
    assert.match(files.get("xl/workbook.xml")!, /<sheet name="Applications" sheetId="1"/);
  });

  test("text is stored as text, so a phone number keeps its leading zero", () => {
    assert.match(sheet([["Phone"], ["01711000000"]]), /<c r="A2" t="inlineStr"><is><t xml:space="preserve">01711000000<\/t><\/is><\/c>/);
  });

  test("text that looks like a formula stays text", () => {
    assert.match(sheet([["Name"], ["=HYPERLINK(\"http://evil.test\")"]]), /t="inlineStr"><is><t xml:space="preserve">=HYPERLINK\(&quot;http:\/\/evil\.test&quot;\)<\/t>/);
  });

  test("numbers are stored as numbers", () => {
    assert.match(sheet([["Amount due"], [185000.5]]), /<c r="A2"><v>185000\.5<\/v><\/c>/);
  });

  test("characters that mean something in XML are escaped", () => {
    assert.match(sheet([["Note"], ["Fish & <Chips>"]]), /Fish &amp; &lt;Chips&gt;/);
  });

  test("characters XML cannot hold are dropped", () => {
    assert.match(sheet([["Note"], ["bell\u0007 and null\u0000 gone"]]), />bell and null gone</);
  });

  test("empty cells are left out and the next cell keeps its column", () => {
    const xml = sheet([["A", "B", "C"], ["one", null, "three"]]);
    assert.doesNotMatch(xml, /r="B2"/);
    assert.match(xml, /<c r="C2" t="inlineStr">/);
  });

  test("columns past Z are named AA, AB and so on", () => {
    const xml = sheet([Array.from({ length: 28 }, (_, i) => `H${i}`)]);
    assert.match(xml, /<c r="Z1"/);
    assert.match(xml, /<c r="AA1"/);
    assert.match(xml, /<c r="AB1"/);
  });

  test("the first row is the heading: bold and kept in view while scrolling", () => {
    const xml = sheet([["Reference"], ["BP-1"]]);
    assert.match(xml, /<c r="A1" s="1" t="inlineStr">/);
    assert.match(xml, /<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/);
  });

  test("a sheet name Excel would reject is cleaned up", () => {
    const files = unzip(xlsx("Enquiries: 2026/10 [all] and a very long name indeed", [["A"]]));
    const name = /<sheet name="([^"]*)"/.exec(files.get("xl/workbook.xml")!)![1];
    assert.ok(name.length <= 31);
    assert.doesNotMatch(name, /[:\\/?*[\]]/);
  });
});
