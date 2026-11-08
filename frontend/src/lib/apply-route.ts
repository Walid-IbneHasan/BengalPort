export type ApplyTab = "GENERAL" | "BUSINESS" | "EDUCATION" | "HEALTHCARE" | "UMRAH";
export type ApplyForm = "enquiry" | "application";

const tabs: ApplyTab[] = ["GENERAL", "BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"];
const SUBJECT_LENGTH = 150;

// The heading of the quick enquiry form, on the site and on its printed copy.
export const enquiryCopy: Record<ApplyTab, { eyebrow: string; title: string; text: string }> = {
  GENERAL: { eyebrow: "QUICK ENQUIRY", title: "Ask a question without registering.", text: "Only the essentials are required. Login is optional." },
  BUSINESS: { eyebrow: "BUSINESS ENQUIRY", title: "Tell us what you are looking for.", text: "Sourcing, supplier connections, factory visits or a quotation. No account is required." },
  EDUCATION: { eyebrow: "EDUCATION ENQUIRY", title: "Ask about studying abroad.", text: "Programmes, institutions, admission requirements or costs. No account is required." },
  HEALTHCARE: { eyebrow: "HEALTHCARE ENQUIRY", title: "Ask about treatment abroad.", text: "Hospitals, treatment options, estimates or travel support. No account is required." },
  UMRAH: { eyebrow: "UMRAH ENQUIRY", title: "Plan your sacred journey.", text: "Share your preferred travel period, traveller count and priorities. No account is required." },
};

// The form a division link opens when it does not say which one it wants.
// Umrah buttons across the site are worded as enquiries; the other divisions
// have always opened their application.
const defaultForm = (tab: ApplyTab): ApplyForm =>
  tab === "GENERAL" || tab === "UMRAH" ? "enquiry" : "application";

// Reads /apply?tab=…&form=…&about=… ("type" is the older name for "tab").
export function applyState(params: URLSearchParams): { tab: ApplyTab; form: ApplyForm; subject: string } {
  const requested = (params.get("tab") || params.get("type") || "").toUpperCase() as ApplyTab;
  const tab = tabs.includes(requested) ? requested : "GENERAL";
  const wanted = params.get("form");
  const form = tab !== "GENERAL" && (wanted === "enquiry" || wanted === "application") ? wanted : defaultForm(tab);
  return { tab, form, subject: (params.get("about") || "").trim().slice(0, SUBJECT_LENGTH) };
}

export function applyHref(tab: ApplyTab, form?: ApplyForm, about?: string): string {
  const params = new URLSearchParams({ tab: tab.toLowerCase() });
  if (form) params.set("form", form);
  if (about) params.set("about", about);
  return `/apply?${params}`;
}

const opportunityTabs: Record<string, ApplyTab> = {
  BUSINESS: "BUSINESS",
  FACTORY_VISIT: "BUSINESS",
  BUSINESS_TOUR: "BUSINESS",
  EDUCATION: "EDUCATION",
  SCHOLARSHIP: "EDUCATION",
  HEALTHCARE: "HEALTHCARE",
  UMRAH: "UMRAH",
};

export function opportunityTab(category: string): ApplyTab {
  return opportunityTabs[category] ?? "GENERAL";
}
