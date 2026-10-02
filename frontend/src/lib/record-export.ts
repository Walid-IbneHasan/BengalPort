// Turns the admin's applications and enquiries into spreadsheet rows: a
// heading row, then one row per record.
import { applicationForms, type ApplicationDivision } from "./application-forms";
import { detailGroups } from "./submission-details";
import type { Cell } from "./xlsx";

type Row = Record<string, any>;

// "IN_REVIEW" -> "In review"
const words = (value: unknown) =>
  String(value ?? "")
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

const pad = (n: number) => String(n).padStart(2, "0");
const day = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const when = (value: unknown) => {
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "" : `${day(date)} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const received = (status: string) => status === "PAID" || status === "PARTIALLY_PAID";
const paisa = (value: unknown) => Math.round(Number(value) * 100);
// What was received, less what was sent back.
const netPaid = (payments: Row[]) =>
  payments
    .filter((payment) => received(payment.status))
    .reduce(
      (sum, payment) =>
        sum + paisa(payment.amount) - (payment.refunds ?? []).filter((refund: Row) => refund.status === "COMPLETED").reduce((back: number, refund: Row) => back + paisa(refund.amount), 0),
      0,
    ) / 100;
const amount = (value: unknown) => (value === null || value === undefined || value === "" ? null : Number(value));

// The applicant's own details have columns of their own.
const contactKeys = new Set(["fullName", "email", "phone"]);

// Every answer of one record under its question's label.
function answers(type: string | undefined, details: Row | null | undefined): Map<string, string> {
  const shown = Object.fromEntries(Object.entries(details ?? {}).filter(([key]) => !contactKeys.has(key)));
  return new Map(detailGroups(type, shown).flatMap((group) => group.rows.map((row) => [row.label, row.value] as const)));
}

// The labels to show as columns: each form's questions in the order they are
// asked, then anything else that was answered. Unanswered questions are left out.
function answerColumns(types: string[], all: Map<string, string>[]): string[] {
  const used = new Set(all.flatMap((one) => [...one.keys()]));
  const ordered: string[] = [];
  for (const type of ["BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"] as ApplicationDivision[])
    if (types.includes(type))
      for (const step of applicationForms[type].steps)
        for (const field of step.fields) if (used.has(field.label) && !ordered.includes(field.label)) ordered.push(field.label);
  for (const label of used) if (!ordered.includes(label)) ordered.push(label);
  return ordered;
}

export function applicationRows(applications: Row[]): Cell[][] {
  const all = applications.map((row) => answers(row.type, row.details));
  const columns = answerColumns(applications.map((row) => row.type), all);
  const heading = ["Reference", "Division", "Status", "Submitted", "Full name", "Email", "Phone", "Member account", "Amount due", "Paid", "Remaining", "Documents", ...columns];
  return [
    heading,
    ...applications.map((row, index) => {
      const due = amount(row.amountDue);
      const paid = netPaid(row.payments ?? []);
      return [
        row.reference,
        words(row.type),
        words(row.status),
        when(row.createdAt),
        row.fullName,
        row.email,
        row.phone,
        row.user?.email ?? "",
        due,
        paid,
        due === null ? null : Math.max(0, Math.round((due - paid) * 100) / 100),
        row.documents?.length ?? 0,
        ...columns.map((label) => all[index].get(label) ?? ""),
      ];
    }),
  ];
}

export function enquiryRows(enquiries: Row[]): Cell[][] {
  const all = enquiries.map((row) => answers(undefined, row.details));
  const columns = answerColumns([], all);
  return [
    ["Received", "Division", "Status", "Name", "Phone", "Email", "Member account", "Message", ...columns],
    ...enquiries.map((row, index) => [
      when(row.createdAt),
      words(row.type),
      words(row.status),
      row.name,
      row.phone,
      row.email ?? "",
      row.user?.email ?? "",
      row.message,
      ...columns.map((label) => all[index].get(label) ?? ""),
    ]),
  ];
}

export const exportFileName = (what: string, date = new Date()) => `bengal-port-${what}-${day(date)}.xlsx`;
