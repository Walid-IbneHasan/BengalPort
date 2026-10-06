// The Education page sorts the directory's institutions and programmes into
// its three fields of study and into study destinations.

export type FieldKey = "medical" | "engineering" | "general";
export const fieldKeys: FieldKey[] = ["medical", "engineering", "general"];

type Programme = { title?: string; level?: string; discipline?: string };
type Institution = { name: string; country: string; image?: string; programs?: Programme[] };

const medical = /mbbs|medic|dent|\bbds\b|nurs|pharm|surg|physio|health|clinical/i;
const technical = /comput|software|technolog|electr|mechan|robot|architect|cyber|data scien/i;
// Capitals only, so the word "it" in a title does not count.
const shortTechnical = /\b(IT|ICT)\b/;

// An engineering degree stays Engineering whatever it is applied to
// (Biomedical Engineering); otherwise a medical word wins over a technical
// one (Medical Laboratory Technology).
export function studyField(programme: Programme): FieldKey {
  const words = `${programme.discipline ?? ""} ${programme.title ?? ""}`;
  if (/engineer/i.test(words)) return "engineering";
  if (medical.test(words)) return "medical";
  if (technical.test(words) || shortTechnical.test(words)) return "engineering";
  return "general";
}

export function institutionFields(institution: Institution): FieldKey[] {
  const taught = new Set((institution.programs ?? []).map(studyField));
  return fieldKeys.filter((key) => taught.has(key));
}

export function fieldPrograms(institutions: Institution[], field: FieldKey) {
  return institutions.flatMap((institution) =>
    (institution.programs ?? [])
      .filter((programme) => studyField(programme) === field)
      .map((programme) => ({
        title: programme.title ?? "",
        level: programme.level ?? "",
        institution: institution.name,
        country: institution.country,
      })),
  );
}

// One entry per country, pictured by its first institution.
export function destinations(institutions: Institution[]) {
  const byCountry = new Map<string, { country: string; institutions: number; programs: number; image: string }>();
  for (const institution of institutions) {
    const entry =
      byCountry.get(institution.country) ??
      { country: institution.country, institutions: 0, programs: 0, image: institution.image ?? "" };
    entry.institutions += 1;
    entry.programs += institution.programs?.length ?? 0;
    byCountry.set(institution.country, entry);
  }
  return [...byCountry.values()].sort((a, b) => b.institutions - a.institutions || a.country.localeCompare(b.country));
}

// The flags for a list of destinations live with the other place helpers.
export { flagCodes } from "./flags.js";
