import { applicationForms, type ApplicationDivision } from "./application-forms";

export type DetailGroup = {
  title: string;
  rows: { label: string; value: string }[];
};

function display(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) return value.map(display).filter(Boolean).join(", ");
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).trim();
}

// "purposeOfVisit" -> "Purpose of visit"
const readable = (key: string) =>
  key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .toLowerCase()
    .replace(/^./, (c) => c.toUpperCase());

// Turns the stored answers of an application or enquiry into labelled groups
// an administrator can read. Application answers follow the form's steps;
// anything the form does not define ends up under "Additional details".
export function detailGroups(
  type: string | undefined,
  details: Record<string, unknown> | null | undefined,
): DetailGroup[] {
  const answers = details ?? {};
  const form = applicationForms[type as ApplicationDivision];
  const known = new Set<string>();
  const groups: DetailGroup[] = (form?.steps ?? []).map((step) => ({
    title: step.title,
    rows: step.fields.flatMap((field) => {
      known.add(field.key);
      const value = display(answers[field.key]);
      return value ? [{ label: field.label, value }] : [];
    }),
  }));
  groups.push({
    title: "Additional details",
    rows: Object.entries(answers).flatMap(([key, raw]) => {
      const value = display(raw);
      return !known.has(key) && value ? [{ label: readable(key), value }] : [];
    }),
  });
  return groups.filter((group) => group.rows.length > 0);
}
