// Deals: a customer's agreed services, from draft to completion. What the
// deal form holds, what is sent to the server, and the figures and dates the
// deal pages show.

type Amount = string | number | null | undefined;
export type DealStatus = "DRAFT" | "ACTIVE" | "COMPLETED" | "CANCELLED";
export type DealItem = { description: string; serviceLine?: string | null; quantity: number; unitPrice: number };
export type DealItemDraft = { description: string; serviceLine: string; quantity: Amount; unitPrice: Amount };
export type DealCustomer = { id: string; customerCode: string; name: string; phone?: string | null; whatsapp?: string | null; email?: string | null; address?: string | null };
export type DealInvoice = {
  id: string;
  number: string;
  issuedAt: string;
  state: "DRAFT" | "ISSUED" | "CANCELLED" | "REFUNDED";
  currency: string;
  // Missing for staff who may not see money figures.
  total?: number;
  paid?: number;
  credited?: number;
  due?: number;
  status: string;
};

// A deal as GET /office/deals/:id sends it.
export type Deal = {
  id: string;
  number: number;
  dealNumber: string;
  title: string;
  serviceLine: string | null;
  description: string | null;
  status: DealStatus;
  currency: string;
  items: DealItem[];
  total: number | null;
  recognized: number | null;
  startDate: string | null;
  endDate: string | null;
  companyCommitments: string | null;
  clientCommitments: string | null;
  terms: string | null;
  assignedTo: { id: string; name: string } | null;
  assignedToId?: string | null;
  branch?: { id: string; name: string } | null;
  branchId?: string | null;
  customerId?: string;
  customer: DealCustomer;
  invoices: DealInvoice[];
  tasks?: { id: string; title: string; status: string; dueAt: string | null; kind: string; assignee: { id: string; name: string } | null }[];
  completedAt?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
};

// What the deal form holds while staff fill it in.
export type DealDraft = {
  id?: string;
  customer: DealCustomer | null;
  title: string;
  serviceLine: string;
  description: string;
  currency: string;
  items: DealItemDraft[];
  startDate: string;
  endDate: string;
  companyCommitments: string;
  clientCommitments: string;
  terms: string;
  assignedToId: string;
  branchId: string;
};

const number = (value: Amount) => Number(value) || 0;
const paisa = (value: number) => Math.round(value * 100);

// The day of a stored date in Bangladesh, as "YYYY-MM-DD".
const dhakaDay = (value: string | Date | null | undefined) => {
  if (!value) return "";
  const date = new Date(new Date(value).getTime() + 6 * 3600_000);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};
// A whole day in Bangladesh, sent as the start of that day there.
const dhakaMidnight = (value: string) => (value ? `${value}T00:00:00+06:00` : null);

export const blankDealItem = (serviceLine = ""): DealItemDraft => ({ description: "", serviceLine, quantity: "1", unitPrice: "" });

// Rounded line by line, as the server adds them up.
export const dealLineAmount = (item: { quantity: Amount; unitPrice: Amount }) => paisa(number(item.quantity) * number(item.unitPrice)) / 100;
export const dealItemsTotal = (items: { quantity: Amount; unitPrice: Amount }[]) => items.reduce((sum, item) => sum + paisa(dealLineAmount(item)), 0) / 100;

export const blankDeal = (terms = "", customer: DealCustomer | null = null): DealDraft => ({
  customer,
  title: "",
  serviceLine: "",
  description: "",
  currency: "BDT",
  items: [blankDealItem()],
  startDate: "",
  endDate: "",
  companyCommitments: "",
  clientCommitments: "",
  terms,
  assignedToId: "",
  branchId: "",
});

// An existing deal opened for changes.
export const dealDraftFrom = (deal: Deal): DealDraft => ({
  id: deal.id,
  customer: deal.customer,
  title: deal.title,
  serviceLine: deal.serviceLine ?? "",
  description: deal.description ?? "",
  currency: deal.currency,
  items: deal.items.map((item) => ({ description: item.description, serviceLine: item.serviceLine ?? "", quantity: String(item.quantity), unitPrice: String(item.unitPrice) })),
  startDate: dhakaDay(deal.startDate),
  endDate: dhakaDay(deal.endDate),
  companyCommitments: deal.companyCommitments ?? "",
  clientCommitments: deal.clientCommitments ?? "",
  terms: deal.terms ?? "",
  assignedToId: deal.assignedTo?.id ?? deal.assignedToId ?? "",
  branchId: deal.branch?.id ?? deal.branchId ?? "",
});

export const dealBody = (draft: DealDraft) => ({
  customerId: draft.customer?.id ?? "",
  title: draft.title.trim(),
  serviceLine: draft.serviceLine.trim() || null,
  description: draft.description.trim() || null,
  currency: draft.currency || "BDT",
  items: draft.items.map((item) => ({
    description: item.description.trim(),
    serviceLine: item.serviceLine.trim() || null,
    quantity: number(item.quantity),
    unitPrice: number(item.unitPrice),
  })),
  startDate: dhakaMidnight(draft.startDate),
  endDate: dhakaMidnight(draft.endDate),
  companyCommitments: draft.companyCommitments.trim() || null,
  clientCommitments: draft.clientCommitments.trim() || null,
  terms: draft.terms.trim() || null,
  assignedToId: draft.assignedToId || null,
  branchId: draft.branchId || null,
});

// Whole days from today to the deal's end, by the calendar in Bangladesh.
export function daysLeft(endDate: string | null | undefined, now = new Date()): number | null {
  const end = dhakaDay(endDate);
  if (!end) return null;
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${dhakaDay(now)}T00:00:00Z`)) / 86_400_000);
}

// "12 days left", "Ends today", "Ended 3 days ago".
export function timelineText(endDate: string | null | undefined, status: DealStatus, now = new Date()): string {
  const left = daysLeft(endDate, now);
  if (left === null) return "No end date";
  if (status === "COMPLETED") return "Completed";
  if (status === "CANCELLED") return "Cancelled";
  if (left > 1) return `${left} days left`;
  if (left === 1) return "1 day left";
  if (left === 0) return "Ends today";
  return left === -1 ? "Ended yesterday" : `Ended ${-left} days ago`;
}

// What the deal's invoices add up to. Drafts and cancelled invoices ask for
// nothing; credit notes lower what was invoiced. Null without money figures.
export function dealFigures(invoices: DealInvoice[]) {
  if (invoices.some((invoice) => invoice.total === undefined)) return null;
  const counted = invoices.filter((invoice) => invoice.state === "ISSUED" || invoice.state === "REFUNDED");
  const sum = (pick: (invoice: DealInvoice) => number) => counted.reduce((total, invoice) => total + paisa(pick(invoice)), 0) / 100;
  return {
    invoiced: sum((invoice) => number(invoice.total) - number(invoice.credited)),
    paid: sum((invoice) => number(invoice.paid)),
    due: sum((invoice) => number(invoice.due)),
  };
}

// The buttons a deal page offers, from the deal's status and the permissions.
export type DealAction = "edit" | "activate" | "complete" | "cancel" | "reopen" | "recognize" | "invoice" | "payment";
export function dealActions(status: DealStatus, may: (permission: string) => boolean): DealAction[] {
  const actions: DealAction[] = [];
  const open = status === "DRAFT" || status === "ACTIVE";
  if (open && may("deals.update")) actions.push("edit");
  if (status === "DRAFT" && may("deals.update")) actions.push("activate");
  if (status === "ACTIVE" && may("deals.update")) actions.push("complete");
  if (status !== "CANCELLED" && may("invoices.create")) actions.push("invoice");
  if (status !== "CANCELLED" && may("payments.create")) actions.push("payment");
  if ((status === "ACTIVE" || status === "COMPLETED") && may("accounts.create")) actions.push("recognize");
  if (open && may("deals.cancel")) actions.push("cancel");
  if (status === "CANCELLED" && may("deals.update")) actions.push("reopen");
  return actions;
}

// The tabs on the deals page and the status each asks the server for.
export const DEAL_TABS = [
  { key: "", label: "All" },
  { key: "DRAFT", label: "Draft" },
  { key: "ACTIVE", label: "Active" },
  { key: "COMPLETED", label: "Completed" },
  { key: "CANCELLED", label: "Cancelled" },
] as const;

export function dealListQuery(options: { status?: string; customerId?: string | null; search?: string }) {
  const params = new URLSearchParams();
  if (options.status) params.set("status", options.status);
  if (options.customerId) params.set("customerId", options.customerId);
  const term = options.search?.trim();
  if (term) params.set("search", term);
  const query = params.toString();
  return `/office/deals${query ? `?${query}` : ""}`;
}
