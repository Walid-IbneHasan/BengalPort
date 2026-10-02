export type ApplyTab = "GENERAL" | "BUSINESS" | "EDUCATION" | "HEALTHCARE" | "UMRAH";
export type ApplyForm = "enquiry" | "application";

const tabs: ApplyTab[] = ["GENERAL", "BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"];
const SUBJECT_LENGTH = 150;

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
