import type { ApplicationField } from "./application-forms";
import { enquiryCopy, type ApplyTab } from "./apply-route";
import { shortDate } from "./datetime";
import { ADDITIONAL_DETAILS, detailGroups } from "./submission-details";

// Turns a stored application or enquiry into what the printed form shows.
export type ExtraAnswer = { label: string; value: string };
export type FilledApplication = {
  answers: Record<string, unknown>;
  reference: string;
  submittedAt: string;
  extras: ExtraAnswer[];
  documents: string[];
};
export type FilledEnquiry = {
  type: ApplyTab;
  name: string;
  phone: string;
  email: string;
  subject: string;
  message: string;
  submittedAt: string;
  extras: ExtraAnswer[];
};

const additional = (type: string | undefined, answers: Record<string, unknown>) =>
  detailGroups(type, answers).find((group) => group.title === ADDITIONAL_DETAILS)?.rows ?? [];

export function answerText(field: ApplicationField, value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value).trim();
  return field.type === "date" && /^\d{4}-\d{2}-\d{2}/.test(text) ? shortDate(text) : text;
}

// The form's choices, then any stored choice the form no longer offers.
export function choiceOptions(field: ApplicationField, value: unknown): string[] {
  const options = field.options ?? [];
  const stored = Array.isArray(value) ? value.map(String) : [];
  return [...options, ...stored.filter((item) => !options.includes(item))];
}

type StoredApplication = {
  reference: string;
  type: string;
  fullName: string;
  email: string;
  phone: string;
  createdAt: string;
  details?: Record<string, unknown> | null;
  documents?: { name: string }[];
};

// Staff can correct the name, email and phone on the record, so those win
// over the copies stored with the answers.
export function filledApplication(record: StoredApplication): FilledApplication {
  const answers = { ...(record.details ?? {}), fullName: record.fullName, email: record.email, phone: record.phone };
  return {
    answers,
    reference: record.reference,
    submittedAt: record.createdAt,
    extras: additional(record.type, answers),
    documents: (record.documents ?? []).map((document) => document.name),
  };
}

type StoredEnquiry = {
  type: string;
  name: string;
  phone: string;
  email?: string | null;
  message: string;
  createdAt: string;
  details?: Record<string, unknown> | null;
};

export function filledEnquiry(record: StoredEnquiry): FilledEnquiry {
  const { subject, service: _service, ...others } = record.details ?? {};
  return {
    type: record.type in enquiryCopy ? (record.type as ApplyTab) : "GENERAL",
    name: record.name,
    phone: record.phone,
    email: record.email ?? "",
    subject: subject === undefined || subject === null ? "" : String(subject),
    message: record.message,
    submittedAt: record.createdAt,
    extras: additional(undefined, others),
  };
}

const titleCase = (text: string) => text.charAt(0) + text.slice(1).toLowerCase();

// The page title, which browsers offer as the name of the saved PDF.
export function printTitle(kind: string, record: any): string {
  if (kind === "invoice") return `${record.number} - ${record.customerName}`;
  if (kind === "ledger-entry") return `${ledgerNumber(record.id)} - ${titleCase(record.type)} - ${record.description}`;
  if (kind === "ledger-day") return `Hisab Kitab - ${record.day}`;
  if (kind === "enquiry") return `${titleCase(record.type)} enquiry - ${record.name}`;
  return `${record.reference} - ${titleCase(record.type)} application - ${record.fullName}`;
}

// The number printed on one Hisab Kitab entry: HK- and the end of its id.
export const ledgerNumber = (id: string) => `HK-${id.slice(-7).toUpperCase()}`;
