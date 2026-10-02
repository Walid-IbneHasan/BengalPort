// Writes a one-sheet Excel workbook (.xlsx) without a library. A workbook is a
// zip of small XML files; the zip is written uncompressed, which every
// spreadsheet program reads. Text cells are stored as text, so phone numbers
// keep their leading zero and nothing a customer typed can run as a formula.

export type Cell = string | number | null | undefined;

const encoder = new TextEncoder();

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function zip(files: [name: string, content: string][]): Uint8Array<ArrayBuffer> {
  const parts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;
  for (const [name, content] of files) {
    const nameBytes = encoder.encode(name);
    const data = encoder.encode(content);
    const crc = crc32(data);
    // Shared by the local header and the directory entry: version, flags
    // (UTF-8 names), no compression, a fixed date, checksum and sizes.
    const common = new DataView(new ArrayBuffer(26));
    common.setUint16(0, 20, true);
    common.setUint16(2, 0x0800, true);
    common.setUint16(4, 0, true);
    common.setUint16(6, 0, true);
    common.setUint16(8, 0x21, true);
    common.setUint32(10, crc, true);
    common.setUint32(14, data.length, true);
    common.setUint32(18, data.length, true);
    common.setUint16(22, nameBytes.length, true);
    common.setUint16(24, 0, true);
    const commonBytes = new Uint8Array(common.buffer);

    const local = new Uint8Array(4 + 26);
    new DataView(local.buffer).setUint32(0, 0x04034b50, true);
    local.set(commonBytes, 4);
    parts.push(local, nameBytes, data);

    const entry = new Uint8Array(46);
    const view = new DataView(entry.buffer);
    view.setUint32(0, 0x02014b50, true);
    view.setUint16(4, 20, true);
    entry.set(commonBytes, 6);
    view.setUint32(42, offset, true);
    directory.push(entry, nameBytes);
    offset += local.length + nameBytes.length + data.length;
  }
  const directorySize = directory.reduce((sum, part) => sum + part.length, 0);
  const end = new Uint8Array(22);
  const view = new DataView(end.buffer);
  view.setUint32(0, 0x06054b50, true);
  view.setUint16(8, files.length, true);
  view.setUint16(10, files.length, true);
  view.setUint32(12, directorySize, true);
  view.setUint32(16, offset, true);

  const all = [...parts, ...directory, end];
  const out = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0));
  let at = 0;
  for (const part of all) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

const escapeXml = (value: string) =>
  value
    // XML 1.0 has no way to write most control characters.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// 0 -> A, 25 -> Z, 26 -> AA
function columnName(index: number): string {
  let name = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) name = String.fromCharCode(65 + ((n - 1) % 26)) + name;
  return name;
}

function cell(value: Cell, column: number, row: number, heading: boolean): string {
  if (value === null || value === undefined || value === "") return "";
  const position = `r="${columnName(column)}${row}"${heading ? ' s="1"' : ""}`;
  if (typeof value === "number" && Number.isFinite(value)) return `<c ${position}><v>${value}</v></c>`;
  return `<c ${position} t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(value))}</t></is></c>`;
}

// Excel allows at most 31 characters in a sheet name and none of : \ / ? * [ ]
const sheetName = (name: string) => name.replace(/[:\\/?*[\]]/g, " ").replace(/\s+/g, " ").trim().slice(0, 31) || "Sheet1";

const declaration = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const main = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const relationships = "http://schemas.openxmlformats.org/package/2006/relationships";
const officeDocument = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

// The first row is the heading row.
export function xlsx(name: string, rows: Cell[][]): Uint8Array<ArrayBuffer> {
  const columns = Math.max(1, ...rows.map((row) => row.length));
  // Wide enough for the longest value, within reason.
  const widths = Array.from({ length: columns }, (_, column) =>
    Math.min(60, Math.max(10, ...rows.map((row) => String(row[column] ?? "").length + 2))),
  );
  const sheet =
    `${declaration}<worksheet xmlns="${main}">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${widths.map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join("")}</cols>` +
    `<sheetData>${rows.map((row, r) => `<row r="${r + 1}">${row.map((value, c) => cell(value, c, r + 1, r === 0)).join("")}</row>`).join("")}</sheetData>` +
    `</worksheet>`;
  return zip([
    [
      "[Content_Types].xml",
      `${declaration}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/>` +
        `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
        `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
        `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
        `</Types>`,
    ],
    [
      "_rels/.rels",
      `${declaration}<Relationships xmlns="${relationships}"><Relationship Id="rId1" Type="${officeDocument}/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
    ],
    [
      "xl/workbook.xml",
      `${declaration}<workbook xmlns="${main}" xmlns:r="${officeDocument}"><sheets><sheet name="${escapeXml(sheetName(name))}" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `${declaration}<Relationships xmlns="${relationships}">` +
        `<Relationship Id="rId1" Type="${officeDocument}/worksheet" Target="worksheets/sheet1.xml"/>` +
        `<Relationship Id="rId2" Type="${officeDocument}/styles" Target="styles.xml"/>` +
        `</Relationships>`,
    ],
    [
      "xl/styles.xml",
      // Style 0 is plain, style 1 is the bold heading row.
      `${declaration}<styleSheet xmlns="${main}">` +
        `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
        `<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>` +
        `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
        `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
        `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>` +
        `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
        `</styleSheet>`,
    ],
    ["xl/worksheets/sheet1.xml", sheet],
  ]);
}
