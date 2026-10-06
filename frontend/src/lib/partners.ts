// The Business page's partner list: suppliers and factories from the live
// records, shown grouped by country.
export type Partner = {
  name: string;
  country: string;
  industry: string;
  product: string;
  description: string;
  image: string;
  featured: boolean;
  kind: "Supplier" | "Factory";
};
export type PartnerKind = "all" | Partner["kind"];

// The industry filter's choices: every industry the partners have, sorted.
export function industries(partners: Partner[]): string[] {
  const names = [...new Set(partners.map((partner) => partner.industry).filter(Boolean))];
  return ["All", ...names.sort((a, b) => a.localeCompare(b))];
}

// The partners that match the filters, grouped by country: Bangladesh first,
// then the other countries alphabetically; within a country the featured
// partners lead and the rest follow by name.
export function groupPartners(partners: Partner[], kind: PartnerKind, industry: string) {
  const shown = partners.filter(
    (partner) => (kind === "all" || partner.kind === kind) && (industry === "All" || partner.industry === industry),
  );
  const countries = [...new Set(shown.map((partner) => partner.country))].sort((a, b) =>
    a === "Bangladesh" ? -1 : b === "Bangladesh" ? 1 : a.localeCompare(b),
  );
  return countries.map((country) => ({
    country,
    items: shown
      .filter((partner) => partner.country === country)
      .sort((a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name)),
  }));
}
