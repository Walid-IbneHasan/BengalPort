// The office's document library: client, visa, employee and company papers.
// How expiry dates, file sizes and who-may-open-it read, and what the form
// sends. Pure functions, so they can be tested without a browser.
import { dateInput, fromDateInput } from "./office";

export type DocCategory = "CLIENT" | "VISA" | "EMPLOYEE" | "COMPANY";
export type Verification = "PENDING" | "VERIFIED" | "REJECTED";

export const DOC_CATEGORIES: { value: DocCategory; label: string }[] = [
  { value: "CLIENT", label: "Client" },
  { value: "VISA", label: "Visa" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "COMPANY", label: "Company" },
];
export const categoryLabel = (category: string) => DOC_CATEGORIES.find((item) => item.value === category)?.label ?? category;

export const VERIFICATIONS: { value: Verification; label: string }[] = [
  { value: "PENDING", label: "Waiting to be checked" },
  { value: "VERIFIED", label: "Verified" },
  { value: "REJECTED", label: "Rejected" },
];

// The roles a document can be kept to. The Super Admin can always open it.
export const ACCESS_ROLES = [
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "MANAGER", label: "Manager" },
  { value: "EMPLOYEE", label: "Employee" },
  { value: "MODERATOR", label: "Moderator" },
] as const;

export type DocFile = { id: string; version: number; fileName: string; mimeType: string; byteSize: number; uploadedByName: string | null; createdAt: string };
export type OfficeDocument = {
  id: string;
  category: DocCategory;
  docType: string;
  name: string;
  number: string | null;
  customerId?: string | null;
  employeeId?: string | null;
  branchId?: string | null;
  customer: { id: string; code?: number; customerCode: string; name: string } | null;
  employee: { id: string; name: string } | null;
  issueDate: string | null;
  expiryDate: string | null;
  verification: Verification;
  verifiedByName: string | null;
  verifiedAt: string | null;
  notes: string | null;
  restrictedTo: string[];
  uploadedByName: string | null;
  files: DocFile[];
  sensitive: boolean;
  createdAt?: string;
};

// Client and visa papers belong to a customer; employee papers to a member of staff.
export const needsCustomer = (category: string) => category === "CLIENT" || category === "VISA";
export const needsEmployee = (category: string) => category === "EMPLOYEE";

// Days from today to the expiry date, by the calendar in Bangladesh:
// 0 is today, negative has gone by, null has no expiry date.
export function daysLeft(expiry: string | null | undefined, now: Date = new Date()): number | null {
  if (!expiry) return null;
  const end = dateInput(expiry);
  if (!end) return null;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${dateInput(now)}T00:00:00Z`)) / 86_400_000);
}

// "in 12 days", "today", "expired 3 days ago"
export function expiryText(days: number | null): string {
  if (days === null) return "";
  if (days > 1) return `in ${days} days`;
  if (days === 1) return "tomorrow";
  if (days === 0) return "expires today";
  if (days === -1) return "expired yesterday";
  return `expired ${-days} days ago`;
}

// Alerts go out 15 and 7 days before: amber from 15 days, red from 7 or once expired.
export function expiryTone(days: number | null): "bad" | "warn" | "" {
  if (days === null) return "";
  if (days <= 7) return "bad";
  if (days <= 15) return "warn";
  return "";
}

// "240 KB", "1.4 MB"
export function fileSize(bytes: number | null | undefined): string {
  const value = Number(bytes ?? 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

// The newest file first, as the server sends them.
export const latestFile = (document: Pick<OfficeDocument, "files">): DocFile | null =>
  document.files.reduce<DocFile | null>((best, file) => (!best || file.version > best.version ? file : best), null);

// What the server accepts, said before the upload rather than after it.
export const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;
export const DOCUMENT_ACCEPT = "application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png,.webp";
const ACCEPTED = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
// Photos are made smaller in the browser before they go, so only a PDF can
// still be too big when it is sent.
export function fileProblem(file: { type: string; size: number }): string {
  if (file.type && !ACCEPTED.includes(file.type)) return "Choose a PDF, JPEG, PNG or WebP file.";
  if (file.type === "application/pdf" && file.size > MAX_DOCUMENT_BYTES) return "This PDF is over 10 MB. Choose a smaller file.";
  return "";
}

// Who may open it, in words.
export function accessText(restrictedTo: string[]): string {
  if (!restrictedTo.length) return "Everyone whose role may see documents";
  const names = restrictedTo.map((role) => ACCESS_ROLES.find((item) => item.value === role)?.label ?? role);
  return `Only ${names.join(", ")} (and the Super Admin)`;
}

type Picked = { id: string; customerCode: string; name: string };

// What the document form holds while it is filled in. Dates are "YYYY-MM-DD".
export type DocumentDraft = {
  id?: string;
  category: DocCategory;
  docType: string;
  name: string;
  number: string;
  customer: Picked | null;
  employeeId: string;
  issueDate: string;
  expiryDate: string;
  notes: string;
  restrictedTo: string[];
  // Kept as it is, so editing never moves the document to another branch.
  branchId: string | null;
};

// Most papers are a client's, so a new document starts as one.
export const blankDocument = (customer: Picked | null = null, category: DocCategory = "CLIENT"): DocumentDraft => ({
  category,
  docType: "",
  name: "",
  number: "",
  customer,
  employeeId: "",
  issueDate: "",
  expiryDate: "",
  notes: "",
  restrictedTo: [],
  branchId: null,
});

export const draftFromDocument = (document: OfficeDocument): DocumentDraft => ({
  id: document.id,
  category: document.category,
  docType: document.docType,
  name: document.name,
  number: document.number ?? "",
  customer: document.customer ? { id: document.customer.id, customerCode: document.customer.customerCode, name: document.customer.name } : null,
  employeeId: document.employee?.id ?? document.employeeId ?? "",
  issueDate: dateInput(document.issueDate),
  expiryDate: dateInput(document.expiryDate),
  notes: document.notes ?? "",
  restrictedTo: [...document.restrictedTo],
  branchId: document.branchId ?? null,
});

// The body for POST and PUT /office/documents. A customer or member of staff
// is sent only for the categories that have one.
export const documentBody = (draft: DocumentDraft) => ({
  category: draft.category,
  docType: draft.docType,
  name: draft.name,
  number: draft.number,
  customerId: needsCustomer(draft.category) ? (draft.customer?.id ?? null) : null,
  employeeId: needsEmployee(draft.category) ? draft.employeeId || null : null,
  issueDate: fromDateInput(draft.issueDate),
  expiryDate: fromDateInput(draft.expiryDate),
  notes: draft.notes,
  restrictedTo: draft.restrictedTo,
  branchId: draft.branchId,
});
