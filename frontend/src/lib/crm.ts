// The customer screens (CRM): how a customer's form is filled from a record
// and sent back, the quick contact links, and the sums on a customer's page.
// Pure functions, so they can be tested without a browser.
import { dateInput, fromDateInput, today } from "./office";

export type CustomerStatus = "LEAD" | "ACTIVE" | "INACTIVE";
export const CUSTOMER_STATUSES: { value: CustomerStatus; label: string }[] = [
  { value: "LEAD", label: "Lead" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

// A customer as the server sends it, in the list and on their page.
export type Customer = {
  id: string;
  code: number;
  customerCode: string;
  name: string;
  phone: string;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  category: string | null;
  leadSource: string | null;
  status: CustomerStatus;
  notes: string | null;
  nextFollowUpAt: string | null;
  passportNumber: string | null;
  passportCountry: string | null;
  passportExpiry: string | null;
  assignedToId?: string | null;
  branchId?: string | null;
  userId?: string | null;
  assignedTo?: { id: string; name: string } | null;
  branch?: { id: string; name: string } | null;
  user?: { id: string; email: string } | null;
  _count?: { deals: number; invoices: number };
  createdAt: string;
  updatedAt: string;
};

// Someone already on the list with the same phone number or email.
export type DuplicateCandidate = { id: string; customerCode: string; name: string; phone: string; email: string | null };

// What the customer form holds while it is being filled in. Dates are
// "YYYY-MM-DD" for the date boxes.
export type CustomerDraft = {
  id?: string;
  name: string;
  phone: string;
  whatsapp: string;
  sameWhatsapp: boolean;
  email: string;
  address: string;
  category: string;
  leadSource: string;
  status: CustomerStatus;
  assignedToId: string;
  branchId: string;
  nextFollowUpAt: string;
  notes: string;
  passportNumber: string;
  passportCountry: string;
  passportExpiry: string;
  // The linked website account, sent back unchanged so saving never unlinks it.
  userId: string | null;
};

const digits = (value: string | null | undefined) => String(value ?? "").replace(/\D/g, "");

// Most numbers here are on WhatsApp too, so a new customer starts with
// "same as phone" ticked.
export const blankCustomer = (): CustomerDraft => ({
  name: "",
  phone: "",
  whatsapp: "",
  sameWhatsapp: true,
  email: "",
  address: "",
  category: "",
  leadSource: "",
  status: "LEAD",
  assignedToId: "",
  branchId: "",
  nextFollowUpAt: "",
  notes: "",
  passportNumber: "",
  passportCountry: "",
  passportExpiry: "",
  userId: null,
});

export function draftFromCustomer(customer: Customer): CustomerDraft {
  const same = !!customer.whatsapp && digits(customer.whatsapp).slice(-10) === digits(customer.phone).slice(-10);
  return {
    id: customer.id,
    name: customer.name,
    phone: customer.phone,
    whatsapp: same ? "" : (customer.whatsapp ?? ""),
    sameWhatsapp: same,
    email: customer.email ?? "",
    address: customer.address ?? "",
    category: customer.category ?? "",
    leadSource: customer.leadSource ?? "",
    status: customer.status,
    assignedToId: customer.assignedToId ?? customer.assignedTo?.id ?? "",
    branchId: customer.branchId ?? customer.branch?.id ?? "",
    nextFollowUpAt: dateInput(customer.nextFollowUpAt),
    notes: customer.notes ?? "",
    // "Hidden" is what the server says to a role without the passport
    // permission; it is never put in a box to be saved back.
    passportNumber: customer.passportNumber === "Hidden" ? "" : (customer.passportNumber ?? ""),
    passportCountry: customer.passportCountry ?? "",
    passportExpiry: dateInput(customer.passportExpiry),
    userId: customer.userId ?? customer.user?.id ?? null,
  };
}

// The body for POST and PUT /office/customers: every field, every time.
// Without the passport permission the passport boxes are not shown and the
// server keeps what it has.
export function customerBody(draft: CustomerDraft, options: { passport: boolean; force?: boolean }) {
  return {
    name: draft.name,
    phone: draft.phone,
    whatsapp: draft.sameWhatsapp ? draft.phone : draft.whatsapp,
    email: draft.email,
    address: draft.address,
    category: draft.category || null,
    leadSource: draft.leadSource || null,
    status: draft.status,
    notes: draft.notes,
    nextFollowUpAt: fromDateInput(draft.nextFollowUpAt),
    assignedToId: draft.assignedToId || null,
    branchId: draft.branchId || null,
    userId: draft.userId,
    passportNumber: options.passport ? draft.passportNumber : null,
    passportCountry: options.passport ? draft.passportCountry : null,
    passportExpiry: options.passport ? fromDateInput(draft.passportExpiry) : null,
    ...(options.force ? { force: true } : {}),
  };
}

// A WhatsApp chat link. Numbers written the local way (01712-345678) get
// Bangladesh's country code, as WhatsApp needs it.
export function whatsappLink(number: string | null | undefined): string | null {
  let value = digits(number);
  if (value.startsWith("00")) value = value.slice(2);
  if (/^01\d{9}$/.test(value)) value = `88${value}`;
  return value.length >= 7 ? `https://wa.me/${value}` : null;
}

// A link that starts a phone call: spaces and dashes are left out.
export function telLink(number: string | null | undefined): string | null {
  const value = String(number ?? "").replace(/[^\d+]/g, "");
  return digits(value).length >= 5 ? `tel:${value}` : null;
}

// Is a follow-up date gone by, due today, or still to come?
export function followUpState(value: string | null | undefined, now = today()): "none" | "late" | "today" | "later" {
  if (!value) return "none";
  const date = dateInput(value);
  return date < now ? "late" : date === now ? "today" : "later";
}

// "1 deal", "3 invoices"
export const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

export const ACTIVITY_KINDS = { CALL: "Call", WHATSAPP: "WhatsApp", EMAIL: "Email", MEETING: "Meeting", NOTE: "Note" } as const;
export type ActivityKind = keyof typeof ACTIVITY_KINDS | "SYSTEM";
// One line of a customer's history.
export type Activity = { id: string; kind: ActivityKind; summary: string; at: string; byName: string | null };

// "12 Nov 2026, 3:40 pm", by the clock in Bangladesh.
const dayTimeFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Dhaka" });
export function dayTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : dayTimeFormat.format(date).replace(/\s?(am|pm)$/i, (_, half: string) => ` ${half.toLowerCase()}`);
}

// Invoices that count in the sums: drafts are not sent yet, and cancelled or
// refunded ones are owed by nobody. The server's own summary leaves them out
// the same way.
export const invoiceCounts = (status: string) => !["DRAFT", "CANCELLED", "REFUNDED"].includes(status);
// Payments that brought money in.
export const paymentCounts = (status: string) => status === "PAID" || status === "PARTIALLY_PAID";

// Adds up the chosen figures for each currency, taka first, so dollars and
// taka are never added together.
export function totalsByCurrency<K extends string>(rows: Array<{ currency: string } & Partial<Record<K, number | null>>>, fields: K[]) {
  const sums = new Map<string, Record<K, number>>();
  for (const row of rows) {
    const currency = row.currency || "BDT";
    const sum = sums.get(currency) ?? (Object.fromEntries(fields.map((field) => [field, 0])) as Record<K, number>);
    for (const field of fields) sum[field] = Math.round((sum[field] + Number(row[field] ?? 0)) * 100) / 100;
    sums.set(currency, sum);
  }
  return [...sums.entries()]
    .sort(([a], [b]) => (a === "BDT" ? -1 : b === "BDT" ? 1 : a.localeCompare(b)))
    .map(([currency, sum]) => ({ currency, ...sum }));
}
