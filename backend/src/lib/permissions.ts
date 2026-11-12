// Who may do what. Every permission is a resource and an action
// ("invoices.cancel"). The Super Admin (role ADMIN) may do everything; each
// other role starts from the defaults below, which the Super Admin can change
// one permission at a time (stored in RolePermission). The website's member
// accounts (USER) have none.

export const ROLES = ["ADMIN", "MANAGER", "ACCOUNTANT", "EMPLOYEE", "MODERATOR", "USER"] as const;
export type Role = (typeof ROLES)[number];
export const STAFF_ROLES = ["ADMIN", "MANAGER", "ACCOUNTANT", "EMPLOYEE", "MODERATOR"] as const;

export const isStaff = (role: unknown): boolean => (STAFF_ROLES as readonly string[]).includes(String(role));

// Resources and the actions that mean something for each.
export const RESOURCES: Record<string, string[]> = {
  dashboard: ["read"],
  // Money figures: dashboard totals, reports, what a customer owes.
  finance: ["read"],
  customers: ["create", "read", "update", "delete", "export"],
  // Passport and identity details on a customer.
  passport: ["read"],
  deals: ["create", "read", "update", "cancel", "approve"],
  invoices: ["create", "read", "update", "approve", "cancel", "export"],
  // Issuing with the authority signature, and changing the signature.
  signature: ["use", "update"],
  payments: ["create", "read", "update", "approve", "export"],
  // Chart of accounts, journal, budgets, reports.
  accounts: ["create", "read", "update", "approve", "export"],
  // Hisab Kitab, the daily cash book.
  hisab: ["create", "read", "update", "delete"],
  documents: ["create", "read", "update", "delete", "approve", "export"],
  tasks: ["create", "read", "update", "delete"],
  approvals: ["read", "approve"],
  users: ["create", "read", "update"],
  roles: ["update"],
  branches: ["create", "update"],
  audit: ["read"],
  settings: ["update"],
  // The website.
  content: ["read", "update"],
  directory: ["create", "read", "update", "delete"],
  media: ["create", "read", "delete"],
  reviews: ["create", "read", "update", "delete"],
  enquiries: ["read", "update", "delete"],
  applications: ["read", "update", "delete"],
};
export const PERMISSIONS = Object.entries(RESOURCES).flatMap(([resource, actions]) => actions.map((action) => `${resource}.${action}`));

const all = (resource: string) => RESOURCES[resource].map((action) => `${resource}.${action}`);
const DEFAULTS: Record<string, string[]> = {
  ADMIN: PERMISSIONS,
  MANAGER: [
    "dashboard.read", "finance.read",
    "customers.create", "customers.read", "customers.update", "customers.export", "passport.read",
    "deals.create", "deals.read", "deals.update", "deals.cancel",
    "invoices.create", "invoices.read", "invoices.update", "invoices.cancel", "invoices.export", "signature.use",
    "payments.read",
    ...all("tasks"),
    "documents.create", "documents.read", "documents.update", "documents.export",
    "approvals.read", "users.read",
    "enquiries.read", "enquiries.update", "applications.read", "applications.update",
  ],
  ACCOUNTANT: [
    "dashboard.read", "finance.read",
    "customers.read", "deals.read",
    "invoices.create", "invoices.read", "invoices.update", "invoices.approve", "invoices.export", "signature.use",
    ...all("payments"),
    "accounts.create", "accounts.read", "accounts.update", "accounts.export",
    "hisab.create", "hisab.read", "hisab.update",
    "documents.read", "tasks.create", "tasks.read", "tasks.update",
    "approvals.read", "approvals.approve",
  ],
  EMPLOYEE: [
    "dashboard.read",
    "customers.create", "customers.read", "customers.update",
    "deals.read", "invoices.read",
    "tasks.create", "tasks.read", "tasks.update",
    "documents.create", "documents.read",
  ],
  MODERATOR: [
    "content.read", "content.update",
    "directory.create", "directory.read", "directory.update",
    "media.create", "media.read",
    "reviews.create", "reviews.read", "reviews.update",
    "enquiries.read", "enquiries.update", "applications.read", "applications.update",
    "invoices.create", "invoices.read",
  ],
  USER: [],
};
const defaults = new Map(Object.entries(DEFAULTS).map(([role, list]) => [role, new Set(list)]));

export const defaultAllowed = (role: string, permission: string) => defaults.get(role)?.has(permission) ?? false;

// Changes made by the Super Admin, "ROLE:permission" -> allowed.
export type Overrides = Map<string, boolean>;

export function can(role: unknown, permission: string, overrides: Overrides = new Map()): boolean {
  const name = String(role);
  if (name === "ADMIN") return true;
  if (!isStaff(name)) return false;
  const changed = overrides.get(`${name}:${permission}`);
  return changed ?? defaultAllowed(name, permission);
}

// Which permission a request to the website admin (/api/admin) needs, from
// its method and its path below /api/admin. Null: administrators only.
export function adminPermission(method: string, path: string): string | null {
  const verb = method === "GET" ? "read" : method === "POST" ? "create" : method === "DELETE" ? "delete" : "update";
  const parts = path.split("/").filter(Boolean);
  const [first, second, third, fourth] = parts;
  if (first === "dashboard") return "finance.read";
  if (first === "media") return method === "GET" ? "media.read" : method === "DELETE" ? "media.delete" : "media.create";
  if (first === "opportunity-categories") return method === "GET" ? "directory.read" : "directory.create";
  if (first === "opportunities" && !second && method === "POST") return "directory.create";
  if (first === "content" && second) return method === "GET" ? "content.read" : "content.update";
  if (first === "reviews") return `reviews.${verb}`;
  if (first === "notes" && method === "DELETE") return "applications.delete";
  if (first === "users" && !second && method === "POST") return "users.create";
  if (first === "users" && third === "block") return "users.update";
  if (first === "payment-settings") return method === "GET" ? "payments.read" : "settings.update";
  if (first === "status" || first === "backup-link") return "settings.update";
  if (first === "invoices") {
    if (!second) return method === "GET" ? "invoices.read" : "invoices.create";
    if (!third) return method === "GET" ? "invoices.read" : method === "PUT" ? "invoices.update" : method === "DELETE" ? "invoices.delete" : null;
    if (third === "cancel" || third === "credit-notes") return "invoices.cancel";
    if (third === "share") return "invoices.export";
    if (third === "revisions") return "invoices.read";
    return "invoices.update";
  }
  if (first === "accounts") {
    if (second === "categories") return `hisab.${verb}`;
    if (second === "customers") return "hisab.read";
    return `hisab.${verb}`;
  }
  if (first === "resources" && second) {
    if (fourth === "notes") return method === "GET" ? `${second}.read` : `${second}.update`;
    if (["opportunities", "suppliers", "factories", "education", "healthcare"].includes(second)) return `directory.${verb}`;
    if (second === "enquiries" || second === "applications") return `${second}.${verb === "create" ? "update" : verb}`;
    if (second === "users") return method === "GET" ? "users.read" : "roles.update";
    if (second === "payments" || second === "receipts") return "payments.read";
  }
  return null;
}

// What a member of staff is told when a permission is missing.
export const refusal = (method: string) =>
  method === "DELETE"
    ? "You do not have permission to delete this. Ask an administrator."
    : "You do not have permission to do this. Ask an administrator to give your role access.";
