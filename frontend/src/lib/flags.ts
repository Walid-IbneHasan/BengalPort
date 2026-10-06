// Two-letter flag codes of the countries the site talks about, by the names
// an administrator is likely to type. Used for the Education hero's flags,
// the Business partner list and the Healthcare destination chips.
const flags: Record<string, string> = {
  uk: "gb", "united kingdom": "gb", england: "gb", "great britain": "gb",
  usa: "us", us: "us", "united states": "us", "united states of america": "us",
  canada: "ca", australia: "au", "new zealand": "nz", ireland: "ie",
  malaysia: "my", china: "cn", india: "in", japan: "jp", "south korea": "kr", singapore: "sg", thailand: "th",
  vietnam: "vn", indonesia: "id", philippines: "ph", "sri lanka": "lk", nepal: "np", pakistan: "pk",
  germany: "de", france: "fr", italy: "it", spain: "es", netherlands: "nl", switzerland: "ch", austria: "at",
  finland: "fi", sweden: "se", norway: "no", denmark: "dk", poland: "pl", hungary: "hu", romania: "ro", cyprus: "cy",
  turkey: "tr", türkiye: "tr", russia: "ru", georgia: "ge", uzbekistan: "uz", kazakhstan: "kz", kyrgyzstan: "kg",
  "saudi arabia": "sa", uae: "ae", "united arab emirates": "ae", qatar: "qa", oman: "om", kuwait: "kw", bahrain: "bh",
  egypt: "eg", bangladesh: "bd",
};

const key = (name: string) => name.trim().toLowerCase().replace(/\./g, "");

// The flag of one country, or nothing when the name is not known.
export const flagCode = (name: string): string | undefined => flags[key(name)];

// The flags to show for a list of destinations: one per country, in the
// order given. A country whose flag is not known is left out.
export function flagCodes(countries: string[]): string[] {
  const codes = countries.map((name) => flags[key(name)]).filter(Boolean);
  return [...new Set(codes)];
}

// "Bangkok, Thailand" -> "Thailand"; a bare name is its own country.
export const countryOf = (place: string): string => place.split(",").at(-1)!.trim();
