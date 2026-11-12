// The Healthcare page's destinations: the countries of the partner hospitals
// first, then the page's own list of places, one entry per country. Each
// country has its own page at /healthcare/<slug>.
import { countryOf, flagCode } from "./flags";

type Hospital = { country: string; city?: string };

// "Delhi, India" -> "india"
export const countrySlug = (place: string) =>
  countryOf(place)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

export type Destination = { slug: string; country: string; place: string; flag: string | undefined; hospitals: number };

export function destinations(hospitals: Hospital[], places: string[]): Destination[] {
  const bySlug = new Map<string, Destination>();
  const add = (country: string, place: string) => {
    const slug = countrySlug(country);
    if (!slug || bySlug.has(slug)) return;
    bySlug.set(slug, { slug, country, place, flag: flagCode(country), hospitals: 0 });
  };
  for (const hospital of hospitals) add(hospital.country.trim(), hospital.city ? `${hospital.city}, ${hospital.country.trim()}` : hospital.country.trim());
  for (const place of places) add(countryOf(place), place);
  // A place on the page's list names the city better than a hospital's own.
  for (const place of places) {
    const entry = bySlug.get(countrySlug(place));
    if (entry && place.includes(",")) entry.place = place;
  }
  for (const hospital of hospitals) {
    const entry = bySlug.get(countrySlug(hospital.country));
    if (entry) entry.hospitals += 1;
  }
  return [...bySlug.values()];
}

export const hospitalsIn = <T extends Hospital>(hospitals: T[], slug: string): T[] =>
  hospitals.filter((hospital) => countrySlug(hospital.country) === slug);
