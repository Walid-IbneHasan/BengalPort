// Files an applicant attaches to an application (passport copy, certificates,
// medical reports). They are stored in the database and are never public.
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENTS = 10;

// What lists show about a document: everything except its contents.
export const documentSummary = {
  id: true,
  name: true,
  mimeType: true,
  byteSize: true,
  createdAt: true,
} as const;

// The file type according to the file's own first bytes, not the name or type
// the browser sent. Anything else is refused.
export function detectDocumentType(bytes: Buffer): string | null {
  const text = (from: number, to: number) => bytes.subarray(from, to).toString("latin1");
  if (text(0, 5) === "%PDF-") return "application/pdf";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (text(0, 8) === "\x89PNG\r\n\x1a\n") return "image/png";
  if (text(0, 4) === "RIFF" && text(8, 12) === "WEBP") return "image/webp";
  return null;
}
