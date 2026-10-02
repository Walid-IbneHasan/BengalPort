// Form state and request bodies for the records an administrator manages.
export type RecordKind = "opportunity" | "partner" | "institution" | "hospital" | "payment";

export const paymentMethods = ["Cash", "Bank transfer", "bKash", "Nagad", "Card", "Cheque", "Other"];

const defaultImages: Record<RecordKind, string> = {
  opportunity: "/images/global-business.webp",
  partner: "/images/global-business.webp",
  institution: "/images/global-education.webp",
  hospital: "/images/global-healthcare.webp",
  payment: "",
};

export const blankProgram = () => ({ title: "", level: "", discipline: "", deadline: "" });
export const blankService = () => ({ title: "", category: "", description: "" });

export function blankRecord(kind: RecordKind = "partner"): Record<string, any> {
  return {
    id: "",
    name: "",
    country: "",
    city: "",
    industry: "",
    product: "",
    description: "",
    featured: false,
    title: "",
    slug: "",
    category: "BUSINESS",
    location: "",
    deadline: "",
    image: defaultImages[kind],
    published: true,
    programs: [],
    services: [],
    applicationId: "",
    service: "",
    totalDue: "",
    amount: "",
    method: paymentMethods[0],
    transactionId: "",
  };
}

const dateValue = (value: unknown) => (typeof value === "string" ? value.slice(0, 10) : "");
const slugFrom = (title: string) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const filled = (row: Record<string, string>) => Object.values(row).some((value) => value.trim());

// Fills the form from a table row so the record can be edited.
export function recordFromRow(kind: RecordKind, row: Record<string, any>): Record<string, any> {
  return {
    ...blankRecord(kind),
    ...row,
    deadline: dateValue(row.deadline),
    programs: (row.programs ?? []).map((p: any) => ({ title: p.title, level: p.level, discipline: p.discipline, deadline: dateValue(p.deadline) })),
    services: (row.services ?? []).map((s: any) => ({ title: s.title, category: s.category, description: s.description })),
  };
}

export function recordBody(kind: RecordKind, form: Record<string, any>): Record<string, any> {
  const { name, country, city, industry, product, description, image, featured } = form;
  if (kind === "opportunity")
    return {
      slug: form.slug || slugFrom(form.title),
      category: form.category,
      title: form.title,
      description,
      country,
      location: form.location,
      deadline: form.deadline || null,
      image,
      published: form.published,
    };
  if (kind === "partner") return { name, country, industry, product, description, image, featured };
  if (kind === "payment")
    return {
      ...(form.applicationId ? { applicationId: form.applicationId } : {}),
      service: form.service,
      totalDue: Number(form.totalDue),
      amount: Number(form.amount),
      method: form.method,
      ...(String(form.transactionId).trim() ? { transactionId: String(form.transactionId).trim() } : {}),
    };
  if (kind === "institution")
    return {
      name,
      country,
      description,
      image,
      programs: form.programs.filter(filled).map((p: any) => ({ ...p, deadline: p.deadline || null })),
    };
  return { name, country, city, description, image, services: form.services.filter(filled) };
}
