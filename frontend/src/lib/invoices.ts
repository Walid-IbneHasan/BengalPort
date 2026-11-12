import { toLocalInput } from "./datetime";

// A number input gives a number or null; values copied from a record are text.
type Amount = string | number | null | undefined;
export type InvoiceLine = { description: string; quantity: Amount; unitPrice: Amount };

// Where an invoice is in its life: a draft can still be changed; an issued
// invoice is only revised (a new version), credited or cancelled.
export type InvoiceState = "DRAFT" | "ISSUED" | "CANCELLED" | "REFUNDED";
// What the server works out from the state, the payments and the due date.
export type LifecycleStatus = "DRAFT" | "SENT" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED" | "REFUNDED";
// What has been paid against the total, as invoices showed it before the lifecycle.
export type PaymentStatus = "PAID" | "PARTIALLY_PAID" | "DUE";
export type InvoiceStatus = LifecycleStatus | PaymentStatus;

// The customer an invoice is for, from the customer list (CRM).
export type InvoiceCustomer = { id: string; customerCode: string; name: string; phone?: string | null; email?: string | null; address?: string | null; whatsapp?: string | null };
export type InvoiceDealLink = { id: string; number: number; title: string };

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
  // The office workflow. Optional so drafts made elsewhere still fit.
  customer?: InvoiceCustomer | null;
  dealId?: string | null;
  deal?: InvoiceDealLink | null;
  currency?: string;
  exchangeRate?: Amount;
  startDate?: string;
  endDate?: string;
  companyCommitments?: string;
  clientCommitments?: string;
  terms?: string;
  // Set when an existing invoice is opened: a draft is edited, an issued
  // invoice is revised.
  state?: InvoiceState;
  version?: number;
  number?: string;
  // Already settled on an issued invoice; a revision cannot go below it.
  credited?: number;
};

export type InvoiceSignature = { id?: string; ownerName: string; ownerTitle?: string | null; label?: string | null; image?: string };
export type CreditNote = { id?: string; reference: string; amount: number; reason: string; byName: string; createdAt: string };

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
  state: InvoiceState;
  credited: number;
  currency: string;
  exchangeRate: number;
  version: number;
  templateVersion?: string;
  terms?: string | null;
  companyCommitments?: string | null;
  clientCommitments?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  customerId?: string | null;
  dealId?: string | null;
  customer?: { id: string; code: number; name: string } | null;
  deal?: InvoiceDealLink | null;
  signature?: InvoiceSignature | null;
  creditNotes?: CreditNote[];
  issuedByName?: string | null;
  sentAt?: string | null;
  cancelReason?: string | null;
  paymentStatus?: PaymentStatus;
  allocations?: { amount: number; payment: { transactionId: string | null; method: string; paidAt: string | null } }[];
};

// One earlier version of an invoice, kept when it was revised.
export type InvoiceRevision = { id: string; version: number; snapshot: Record<string, any>; reason: string; byName: string; createdAt: string };

const number = (value: Amount) => Number(value) || 0;
const paisa = (value: number) => Math.round(value * 100);
const today = () => toLocalInput(new Date()).slice(0, 10);

// The day of a stored date by the calendar in Bangladesh, as "YYYY-MM-DD".
// Dates saved as a plain day (midnight UTC) and as midnight in Dhaka both
// come back as the day they were meant to be.
export function dayInput(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(new Date(value).getTime() + 6 * 3600_000);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

// C-000012 and D-000034, as the server numbers customers and deals.
export const customerCodeText = (code: number | null | undefined) => (code ? `C-${String(code).padStart(6, "0")}` : "");
export const dealNumberOf = (number: number | null | undefined) => (number ? `D-${String(number).padStart(6, "0")}` : "");

export const blankLine = (): InvoiceLine => ({ description: "", quantity: "1", unitPrice: "" });

// Rounded line by line, so the printed lines always add up to the printed total.
export const lineAmount = (line: InvoiceLine) => paisa(number(line.quantity) * number(line.unitPrice)) / 100;

export function invoiceTotals(items: InvoiceLine[], paid: Amount, credited: Amount = 0) {
  const total = items.reduce((sum, line) => sum + paisa(lineAmount(line)), 0);
  const received = paisa(number(paid));
  const lowered = paisa(number(credited));
  return { total: total / 100, paid: received / 100, due: Math.max(0, total - received - lowered) / 100 };
}

const twoPlaces = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const bdt = (amount: number) => `৳${twoPlaces.format(amount)}`;

// Money as printed on an invoice: ৳3,250.50 for taka, USD 1,000.00 otherwise.
export function invoiceMoney(amount: number | null | undefined, currency = "BDT") {
  if (amount === null || amount === undefined || !Number.isFinite(Number(amount))) return "—";
  const value = Number(amount);
  const sign = value < 0 ? "−" : "";
  return currency === "BDT" ? `${sign}৳${twoPlaces.format(Math.abs(value))}` : `${currency} ${sign}${twoPlaces.format(Math.abs(value))}`;
}

// "1 USD = ৳121.50", for an invoice in another currency.
export const rateText = (currency: string, rate: number) =>
  `1 ${currency} = ৳${new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(rate)}`;

const labels: Record<InvoiceStatus, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  PARTIAL: "Part paid",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
  PARTIALLY_PAID: "Partly paid",
  DUE: "Due",
};
export const statusLabel = (status: InvoiceStatus | string) =>
  labels[status as InvoiceStatus] ?? (status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ") : "");

// The latest saved rate for a currency (taka per unit), or null.
export function latestRate(rates: { currency: string; rate: number; date: string }[], currency: string): number | null {
  if (currency === "BDT") return 1;
  const found = rates.filter((row) => row.currency === currency).sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))[0];
  return found ? Number(found.rate) : null;
}

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
  customer: null,
  dealId: null,
  deal: null,
  currency: "BDT",
  exchangeRate: "1",
  startDate: "",
  endDate: "",
  companyCommitments: "",
  clientCommitments: "",
  terms: "",
});

// A new invoice for a customer from the customer list: their details filled in.
export function draftForCustomer(customer: InvoiceCustomer, issuedAt = today()): InvoiceDraft {
  return {
    ...blankDraft(issuedAt),
    customer: { id: customer.id, customerCode: customer.customerCode, name: customer.name, phone: customer.phone ?? null, email: customer.email ?? null, address: customer.address ?? null },
    customerName: customer.name,
    customerPhone: customer.phone ?? "",
    customerEmail: customer.email ?? "",
    customerAddress: customer.address ?? "",
  };
}

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

// What draftFromInvoice needs: the invoice as the server sends it, of which
// the office fields may be missing on older records.
type InvoiceSource = Pick<
  Invoice,
  "id" | "issuedAt" | "dueAt" | "customerName" | "customerPhone" | "customerEmail" | "customerAddress" | "items" | "paid" | "notes" | "applicationId" | "transactionId"
> &
  Partial<Omit<Invoice, "id" | "issuedAt" | "dueAt" | "customerName" | "customerPhone" | "customerEmail" | "customerAddress" | "items" | "paid" | "notes" | "applicationId" | "transactionId">>;

export const draftFromInvoice = (invoice: InvoiceSource): InvoiceDraft => ({
  id: invoice.id,
  issuedAt: dayInput(invoice.issuedAt),
  dueAt: dayInput(invoice.dueAt),
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
  customer: invoice.customer
    ? { id: invoice.customer.id, customerCode: customerCodeText(invoice.customer.code), name: invoice.customer.name, phone: invoice.customerPhone, email: invoice.customerEmail, address: invoice.customerAddress }
    : null,
  dealId: invoice.deal?.id ?? invoice.dealId ?? null,
  deal: invoice.deal ?? null,
  currency: invoice.currency ?? "BDT",
  exchangeRate: String(invoice.exchangeRate ?? 1),
  startDate: dayInput(invoice.startDate),
  endDate: dayInput(invoice.endDate),
  companyCommitments: invoice.companyCommitments ?? "",
  clientCommitments: invoice.clientCommitments ?? "",
  terms: invoice.terms ?? "",
  state: invoice.state ?? "DRAFT",
  version: invoice.version ?? 1,
  number: invoice.number,
  credited: invoice.credited ?? 0,
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
  if ((draft.currency ?? "BDT") !== "BDT" && number(draft.exchangeRate) <= 0) return `Enter the exchange rate: how many taka make 1 ${draft.currency}.`;
  const totals = invoiceTotals(draft.items, draft.paid);
  if (totals.total <= 0) return "An invoice must be for more than ৳0.";
  if (totals.paid > totals.total) return "The amount paid cannot be more than the total.";
  return "";
}

export const invoiceBody = (draft: InvoiceDraft) => {
  const currency = draft.currency || "BDT";
  return {
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
    customerId: draft.customer?.id ?? null,
    dealId: draft.dealId ?? null,
    currency,
    exchangeRate: currency === "BDT" ? 1 : number(draft.exchangeRate),
    startDate: draft.startDate || null,
    endDate: draft.endDate || null,
    companyCommitments: draft.companyCommitments?.trim() || null,
    clientCommitments: draft.clientCommitments?.trim() || null,
    terms: draft.terms?.trim() || null,
  };
};

// The tabs on the invoices page and what each asks the server for. The
// server filters by state; Sent, Part paid, Paid and Overdue are worked out
// from the payments and the due date, so those are picked out of the
// issued invoices here.
export const INVOICE_TABS = [
  { key: "all", label: "All", state: null, status: null },
  { key: "drafts", label: "Drafts", state: "DRAFT", status: null },
  { key: "sent", label: "Sent", state: "ISSUED", status: "SENT" },
  { key: "partial", label: "Part paid", state: "ISSUED", status: "PARTIAL" },
  { key: "paid", label: "Paid", state: "ISSUED", status: "PAID" },
  { key: "overdue", label: "Overdue", state: "ISSUED", status: "OVERDUE" },
  { key: "cancelled", label: "Cancelled", state: "CANCELLED", status: null },
] as const;
export type InvoiceTab = (typeof INVOICE_TABS)[number]["key"];

// The list address for a tab. Tabs picked out here ask for the largest page.
export function invoiceListQuery(tab: InvoiceTab, options: { search?: string; customerId?: string | null; page?: number; pageSize?: number } = {}) {
  const chosen = INVOICE_TABS.find((item) => item.key === tab) ?? INVOICE_TABS[0];
  const params = new URLSearchParams();
  params.set("page", String(options.page ?? 1));
  params.set("pageSize", String(chosen.status ? 100 : (options.pageSize ?? 25)));
  if (chosen.state) params.set("state", chosen.state);
  const term = options.search?.trim();
  if (term) params.set("search", term);
  if (options.customerId) params.set("customerId", options.customerId);
  return `/admin/invoices?${params.toString()}`;
}

export const invoicesForTab = <T extends { status: string }>(tab: InvoiceTab, rows: T[]) => {
  const chosen = INVOICE_TABS.find((item) => item.key === tab);
  return chosen?.status ? rows.filter((row) => row.status === chosen.status) : rows;
};

// What staff may do with an invoice, from its state and their permissions.
export type InvoiceAction = "edit" | "delete" | "issue" | "revise" | "payment" | "credit" | "cancel" | "share" | "history";
export function invoiceActions(
  invoice: Pick<Invoice, "state" | "due" | "version"> & { customer?: { id: string } | null; customerId?: string | null },
  may: (permission: string) => boolean,
  role?: string | null,
): InvoiceAction[] {
  const actions: InvoiceAction[] = [];
  const draft = invoice.state === "DRAFT";
  const issued = invoice.state === "ISSUED";
  const owing = Number(invoice.due) > 0;
  if (draft && may("invoices.update")) actions.push("edit", "issue");
  // Deleting has no permission of its own: only the Super Admin may.
  if (draft && (may("invoices.delete") || role === "ADMIN")) actions.push("delete");
  if (issued && may("invoices.update")) actions.push("revise");
  if (issued && owing && (invoice.customer?.id || invoice.customerId) && may("payments.create")) actions.push("payment");
  if (issued && owing && may("invoices.cancel")) actions.push("credit");
  if ((draft || issued) && may("invoices.cancel")) actions.push("cancel");
  if (issued && may("invoices.export")) actions.push("share");
  if (Number(invoice.version) > 1 && may("invoices.read")) actions.push("history");
  return actions;
}

// Where to record a payment on an invoice, under Collections.
export const paymentLink = (invoice: { id: string; customer?: { id: string } | null; customerId?: string | null }) =>
  `/admin/collections?new=1&customer=${encodeURIComponent(invoice.customer?.id ?? invoice.customerId ?? "")}&invoice=${encodeURIComponent(invoice.id)}`;
