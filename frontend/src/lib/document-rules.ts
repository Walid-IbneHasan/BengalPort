// The same limits the API enforces, checked in the browser first so a wrong
// file is turned away before it is uploaded.
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const MAX_DOCUMENTS = 10;
export const DOCUMENT_ACCEPT = ".pdf,.jpg,.jpeg,.png,.webp";

const MB = 1024 * 1024;

export function formatBytes(bytes: number): string {
  return bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Why a chosen file cannot be attached, or "" when it can.
export function documentProblem(file: { name: string; size: number }, alreadyAttached: number): string {
  if (alreadyAttached >= MAX_DOCUMENTS) return `An application can hold up to ${MAX_DOCUMENTS} documents.`;
  if (!/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) return `“${file.name}” is not a PDF, JPEG, PNG or WebP file.`;
  if (file.size > MAX_DOCUMENT_BYTES) return `“${file.name}” is ${formatBytes(file.size)}. The limit is 10 MB per file.`;
  return "";
}
