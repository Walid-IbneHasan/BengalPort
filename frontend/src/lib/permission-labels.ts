// Plain names for the permissions the Super Admin gives each role, and the
// ones that need care (money, passports, the signature, downloads).
export const RESOURCE_LABELS: Record<string, { name: string; hint?: string; group: "office" | "website" | "control" }> = {
  dashboard: { name: "Dashboard", group: "office" },
  finance: { name: "Money figures", hint: "Totals on the dashboard, what customers owe, deal values", group: "office" },
  customers: { name: "Customers", group: "office" },
  passport: { name: "Passport details", hint: "Passport number, country and expiry on a customer", group: "office" },
  deals: { name: "Deals", group: "office" },
  invoices: { name: "Invoices", group: "office" },
  signature: { name: "Authority signature", hint: "Issuing invoices with it, or changing it", group: "office" },
  payments: { name: "Payments", hint: "Money received at the office and on the website", group: "office" },
  accounts: { name: "Accounts", hint: "Journal, chart of accounts, reports and budgets", group: "office" },
  hisab: { name: "Hisab Kitab", hint: "The daily cash book", group: "office" },
  documents: { name: "Documents", group: "office" },
  tasks: { name: "Tasks and follow-ups", group: "office" },
  approvals: { name: "Approvals", hint: "Seeing everyone's requests, and deciding them", group: "office" },
  enquiries: { name: "Website enquiries", group: "website" },
  applications: { name: "Website applications", group: "website" },
  content: { name: "Website content", group: "website" },
  directory: { name: "Opportunities, suppliers, factories, universities, hospitals", group: "website" },
  media: { name: "Media library", group: "website" },
  reviews: { name: "Reviews", group: "website" },
  users: { name: "Staff and member accounts", group: "control" },
  roles: { name: "Roles and permissions", group: "control" },
  branches: { name: "Branches", group: "control" },
  audit: { name: "Audit log", group: "control" },
  settings: { name: "Settings", group: "control" },
};

export const ACTION_LABELS: Record<string, string> = {
  read: "See",
  create: "Add",
  update: "Change",
  delete: "Delete",
  export: "Export",
  approve: "Approve",
  cancel: "Cancel",
  use: "Use",
};

// Shown in the order people think of them: see, add, change, then the rest.
const ORDER = ["read", "create", "update", "use", "cancel", "approve", "export", "delete"];
export const sortActions = (actions: string[]) => [...actions].sort((a, b) => ORDER.indexOf(a) - ORDER.indexOf(b));

// Permissions that open money, identity or signing powers.
export const isSensitive = (permission: string) =>
  ["finance.read", "passport.read", "signature.use", "signature.update", "documents.export", "roles.update", "users.update", "settings.update"].includes(permission) ||
  permission.endsWith(".approve") ||
  permission.endsWith(".delete");

export const permissionLabel = (permission: string) => {
  const [resource, action] = permission.split(".");
  return `${ACTION_LABELS[action] ?? action} · ${RESOURCE_LABELS[resource]?.name ?? resource}`;
};

// "15, 7" → [15, 7]: whole days, largest first, no repeats.
export function parseDays(text: string, max: number): number[] | null {
  const parts = text.split(/[\s,;]+/).filter(Boolean);
  if (!parts.length) return null;
  const days = parts.map(Number);
  if (days.some((n) => !Number.isInteger(n) || n < 0 || n > max)) return null;
  return [...new Set(days)].sort((a, b) => b - a);
}

// "usd, eur gbp" → ["USD", "EUR", "GBP"], with BDT always first.
export function parseCurrencies(text: string): string[] | null {
  const codes = text.toUpperCase().split(/[\s,;]+/).filter(Boolean);
  if (codes.some((code) => !/^[A-Z]{3}$/.test(code))) return null;
  return ["BDT", ...new Set(codes.filter((code) => code !== "BDT"))];
}
