// The figures on a division page's trust panel beside what the page can count
// for itself. A figure about partners, hospitals, institutions, programs,
// treatments or countries shows the live count, so "500+ partners" never sits
// above a directory of five. A live count of zero drops the figure; a figure
// about something the page cannot count is kept as the admin wrote it.

export type Stat = { value: string; label: string; icon: string };
export type LiveCounts = Partial<Record<"partners" | "hospitals" | "institutions" | "programs" | "treatments" | "countries", number>>;

// What a figure's label is about, most specific first: "Partner hospitals"
// counts hospitals, not partners.
const subjects: Array<[RegExp, keyof LiveCounts]> = [
  [/institution/i, "institutions"],
  [/hospital/i, "hospitals"],
  [/program/i, "programs"],
  [/treatment|specialt/i, "treatments"],
  [/destination|countr/i, "countries"],
  [/partner|supplier|factor/i, "partners"],
];

export function liveStats<T extends Stat>(stats: T[], counts: LiveCounts): T[] {
  const shown: T[] = [];
  for (const stat of stats) {
    const subject = subjects.find(([pattern]) => pattern.test(stat.label))?.[1];
    const count = subject ? counts[subject] : undefined;
    if (typeof count !== "number") {
      shown.push(stat);
      continue;
    }
    if (count > 0) shown.push({ ...stat, value: String(count) });
  }
  return shown;
}

// The number of distinct, non-blank values of a field across records.
export function distinct(records: Array<Record<string, unknown>>, field: string): number {
  return new Set(records.map((record) => record[field]).filter(Boolean)).size;
}
