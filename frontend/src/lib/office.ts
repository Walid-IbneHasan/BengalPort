// Shared by the office (business management) screens: what the signed-in
// member of staff may do, and how money, dates and statuses are shown.
import { writable } from "svelte/store";

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Super Admin / CEO",
  MANAGER: "Manager",
  ACCOUNTANT: "Accountant",
  EMPLOYEE: "Employee",
  MODERATOR: "Moderator",
  USER: "Member",
};

// What the signed-in member of staff may do: "customers.read" and the like.
// Filled by the admin layout from /office/me/permissions.
export type OfficeMe = { id?: string; role: string; name: string; branchId: string | null; allBranches: boolean; permissions: string[] };
export const officeMe = writable<OfficeMe | null>(null);
export const officePermissions = writable<Set<string>>(new Set());
export function setOfficeMe(me: OfficeMe) {
  officeMe.set(me);
  officePermissions.set(new Set(me.permissions));
}

const taka = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
const other = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ৳1,25,000 for taka (lakh grouping, as people here write it); USD 1,000.00 otherwise.
export function money(amount: number | string | null | undefined, currency = "BDT") {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = Number(amount);
  if (!Number.isFinite(value)) return "—";
  if (currency === "BDT") {
    const text = taka.format(Math.abs(value));
    const fixed = Number.isInteger(Math.round(value * 100) / 100) ? text : taka.format(Math.abs(value)).replace(/(\.\d)$/, "$10");
    return `${value < 0 ? "−" : ""}৳${fixed}`;
  }
  return `${currency} ${value < 0 ? "−" : ""}${other.format(Math.abs(value))}`;
}

const dhaka = (value: string | Date) => new Date(new Date(value).getTime() + 6 * 3600_000);
const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "12 Nov 2026", by the calendar in Bangladesh.
export function day(value: string | Date | null | undefined) {
  if (!value) return "—";
  const date = dhaka(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// A date for an <input type="date">, by the calendar in Bangladesh.
export function dateInput(value: string | Date | null | undefined) {
  if (!value) return "";
  const date = dhaka(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export const today = () => dateInput(new Date());

const TONES: Record<string, "good" | "bad" | "warn" | "info" | "quiet"> = {
  PAID: "good", VERIFIED: "good", COMPLETED: "good", APPROVED: "good", DONE: "good", ACTIVE: "info", SENT: "info",
  PARTIAL: "warn", PENDING: "warn", OPEN: "warn", LEAD: "warn",
  OVERDUE: "bad", REJECTED: "bad", CANCELLED: "bad", REFUNDED: "bad", FAILED: "bad",
  DRAFT: "quiet", INACTIVE: "quiet",
};
export const toneOf = (status: string) => TONES[status] ?? "quiet";
export const statusText = (status: string) => (status ? status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ") : "");

// The permission each admin page needs, from its address. Null: every
// member of staff may open it.
export function pathPermission(path: string): string | null {
  const rules: [RegExp, string][] = [
    [/^\/admin\/?$/, "dashboard.read"],
    [/^\/admin\/guide/, "guide.read"],
    [/^\/admin\/customers/, "customers.read"],
    [/^\/admin\/deals/, "deals.read"],
    [/^\/admin\/collections/, "payments.read"],
    [/^\/admin\/finance/, "accounts.read"],
    [/^\/admin\/documents/, "documents.read"],
    [/^\/admin\/tasks/, "tasks.read"],
    [/^\/admin\/audit/, "audit.read"],
    [/^\/admin\/office-settings/, "settings.update"],
    [/^\/admin\/accounts\/invoices/, "invoices.read"],
    [/^\/admin\/accounts/, "hisab.read"],
    [/^\/admin\/(enquiries)/, "enquiries.read"],
    [/^\/admin\/(applications)/, "applications.read"],
    [/^\/admin\/(opportunities|suppliers|factories|education|healthcare)/, "directory.read"],
    [/^\/admin\/users/, "users.read"],
    [/^\/admin\/(payments|receipts)/, "payments.read"],
    [/^\/admin\/reviews/, "reviews.read"],
    [/^\/admin\/media/, "media.read"],
    [/^\/admin\/(content|business-content|division-content|page-content)/, "content.read"],
    [/^\/admin\/settings/, "settings.update"],
    [/^\/admin\/print\/ledger/, "hisab.read"],
    [/^\/admin\/print\/agreement/, "deals.read"],
    [/^\/admin\/print\/invoice/, "invoices.read"],
  ];
  return rules.find(([pattern]) => pattern.test(path))?.[1] ?? null;
}

// C-000012 and D-000034, as the server numbers customers and deals.
export const customerNumber = (code: number | null | undefined) => (code ? `C-${String(code).padStart(6, "0")}` : "");
export const dealNumberText = (number: number | null | undefined) => (number ? `D-${String(number).padStart(6, "0")}` : "");

// A whole day in Bangladesh, sent to the server as the start of that day.
export const fromDateInput = (value: string) => (value ? `${value}T00:00:00+06:00` : null);

// Today's date, n days from now, by the calendar in Bangladesh.
export const daysFromToday = (n: number) => dateInput(new Date(Date.now() + n * 86_400_000));
