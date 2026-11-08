import { toLocalInput } from "./datetime";

// A number input gives a number or null; values copied from a record are text.
type Amount = string | number | null | undefined;
export type InvoiceLine = { description: string; quantity: Amount; unitPrice: Amount };
export type InvoiceStatus = "PAID" | "PARTIALLY_PAID" | "DUE";

// What the invoice form holds while staff fill it in.
export type InvoiceDraft = {
  id?: string;
  issuedAt: string;
  dueAt: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  customerAddress: string;
  items: InvoiceLine[];
  paid: Amount;
  notes: string;
  applicationId: string | null;
  transactionId: string | null;
};

// An invoice as the server sends it.
export type Invoice = {
  id: string;
  serial: number;
  number: string;
  issuedAt: string;
  dueAt: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  customerAddress: string | null;
  items: { description: string; quantity: number; unitPrice: number }[];
  total: number;
  paid: number;
  due: number;
  status: InvoiceStatus;
  notes: string | null;
  applicationId: string | null;
  transactionId: string | null;
  application?: { reference: string; type: string } | null;
};

const number = (value: Amount) => Number(value) || 0;
const paisa = (value: number) => Math.round(value * 100);
const today = () => toLocalInput(new Date()).slice(0, 10);

export const blankLine = (): InvoiceLine => ({ description: "", quantity: "1", unitPrice: "" });

// Rounded line by line, so the printed lines always add up to the printed total.
export const lineAmount = (line: InvoiceLine) => paisa(number(line.quantity) * number(line.unitPrice)) / 100;

export function invoiceTotals(items: InvoiceLine[], paid: Amount) {
  const total = items.reduce((sum, line) => sum + paisa(lineAmount(line)), 0);
  const received = paisa(number(paid));
  return { total: total / 100, paid: received / 100, due: Math.max(0, total - received) / 100 };
}

export const bdt = (amount: number) =>
  `৳${new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount)}`;

const labels: Record<InvoiceStatus, string> = { PAID: "Paid", PARTIALLY_PAID: "Partly paid", DUE: "Due" };
export const statusLabel = (status: InvoiceStatus) => labels[status];

export const blankDraft = (issuedAt = today()): InvoiceDraft => ({
  issuedAt,
  dueAt: "",
  customerName: "",
  customerPhone: "",
  customerEmail: "",
  customerAddress: "",
  items: [blankLine()],
  paid: "0",
  notes: "",
  applicationId: null,
  transactionId: null,
});

type LedgerEntry = {
  id: string;
  date: string;
  description: string;
  customer?: string | null;
  notes?: string | null;
  quantity?: number | null;
  unitPrice?: number | null;
  total: number;
};

// An income entry is money already received, so it starts out as paid; staff
// lower the amount when the entry was only part of the bill.
export function draftFromEntry(entry: LedgerEntry): InvoiceDraft {
  const counted = Boolean(entry.quantity && entry.unitPrice);
  return {
    ...blankDraft(toLocalInput(new Date(entry.date)).slice(0, 10)),
    customerName: entry.customer ?? "",
    notes: entry.notes ?? "",
    items: [
      {
        description: entry.description,
        quantity: String(counted ? entry.quantity : 1),
        unitPrice: String(counted ? entry.unitPrice : entry.total),
      },
    ],
    paid: String(entry.total),
    transactionId: entry.id,
  };
}

type ApplicationSource = { id: string; reference: string; type: string; fullName: string; phone: string; email: string };

export function draftFromApplication(
  application: ApplicationSource,
  owing: { amountDue: number | null; paid: number },
  issuedAt = today(),
): InvoiceDraft {
  const division = application.type.charAt(0) + application.type.slice(1).toLowerCase();
  return {
    ...blankDraft(issuedAt),
    customerName: application.fullName,
    customerPhone: application.phone,
    customerEmail: application.email,
    items: [
      {
        description: `${division} application ${application.reference}`,
        quantity: "1",
        unitPrice: owing.amountDue === null ? "" : String(owing.amountDue),
      },
    ],
    paid: String(owing.paid),
    applicationId: application.id,
  };
}

export const draftFromInvoice = (invoice: Omit<Invoice, "serial" | "number" | "total" | "due" | "status">): InvoiceDraft => ({
  id: invoice.id,
  issuedAt: invoice.issuedAt.slice(0, 10),
  dueAt: invoice.dueAt?.slice(0, 10) ?? "",
  customerName: invoice.customerName,
  customerPhone: invoice.customerPhone ?? "",
  customerEmail: invoice.customerEmail ?? "",
  customerAddress: invoice.customerAddress ?? "",
  items: invoice.items.map((line) => ({
    description: line.description,
    quantity: String(line.quantity),
    unitPrice: String(line.unitPrice),
  })),
  paid: String(invoice.paid),
  notes: invoice.notes ?? "",
  applicationId: invoice.applicationId,
  transactionId: invoice.transactionId,
});

// Why an invoice cannot be saved yet, or "" when it can.
export function invoiceProblem(draft: InvoiceDraft): string {
  if (draft.customerName.trim().length < 2) return "Enter the customer's name.";
  if (!draft.issuedAt) return "Choose the invoice date.";
  if (!draft.items.length) return "Add at least one line to the invoice.";
  if (draft.items.some((line) => !line.description.trim())) return "Describe every line of the invoice.";
  if (draft.items.some((line) => number(line.quantity) <= 0)) return "Every line needs a quantity above zero.";
  if (draft.items.some((line) => number(line.unitPrice) < 0)) return "A unit price cannot be negative.";
  if (number(draft.paid) < 0) return "The amount paid cannot be negative.";
  const totals = invoiceTotals(draft.items, draft.paid);
  if (totals.total <= 0) return "An invoice must be for more than ৳0.";
  if (totals.paid > totals.total) return "The amount paid cannot be more than the total.";
  return "";
}

export const invoiceBody = (draft: InvoiceDraft) => ({
  issuedAt: draft.issuedAt,
  dueAt: draft.dueAt || null,
  customerName: draft.customerName.trim(),
  customerPhone: draft.customerPhone.trim() || null,
  customerEmail: draft.customerEmail.trim() || null,
  customerAddress: draft.customerAddress.trim() || null,
  items: draft.items.map((line) => ({
    description: line.description.trim(),
    quantity: number(line.quantity),
    unitPrice: number(line.unitPrice),
  })),
  paid: number(draft.paid),
  notes: draft.notes.trim() || null,
  applicationId: draft.applicationId,
  transactionId: draft.transactionId,
});
