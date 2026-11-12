// The two kinds of staff account. An administrator can open and do
// everything. A moderator adds and edits the website's content, looks after
// enquiries and applications and makes invoices, but never deletes anything
// and never sees the dashboard figures, Hisab Kitab, people, payments or
// settings. The server enforces the same rules; this only decides what the
// admin screens offer.
import { writable } from "svelte/store";

export type StaffRole = "ADMIN" | "MODERATOR" | "MANAGER" | "ACCOUNTANT" | "EMPLOYEE";

export const isStaff = (role: unknown): role is StaffRole => ["ADMIN", "MODERATOR", "MANAGER", "ACCOUNTANT", "EMPLOYEE"].includes(String(role));

const adminOnly = [/^\/admin\/?$/, /^\/admin\/accounts\/?$/, /^\/admin\/(users|payments|receipts|settings)(\/|$)/, /^\/admin\/print\/ledger/];

export function mayOpen(role: unknown, path: string): boolean {
  if (role === "ADMIN") return true;
  if (!isStaff(role) || !path.startsWith("/admin")) return false;
  // The other office roles: the admin layout checks each page against the
  // permissions the Super Admin set.
  if (role !== "MODERATOR") return true;
  return !adminOnly.some((pattern) => pattern.test(path));
}

// Where each starts in the admin.
export const staffHome = (role: unknown) => (role === "MODERATOR" ? "/admin/enquiries" : "/admin");

// The signed-in staff member's role: what this browser remembers from signing
// in, then what the server confirms when the admin opens.
function rememberedRole(): StaffRole | null {
  try {
    const role = typeof localStorage === "undefined" ? null : JSON.parse(localStorage.getItem("bp_user") || "null")?.role;
    return isStaff(role) ? role : null;
  } catch {
    return null;
  }
}
export const staffRole = writable<StaffRole | null>(rememberedRole());
