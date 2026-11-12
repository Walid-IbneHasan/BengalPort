// Countries and their flags. COUNTRIES is every country and territory, by
// its common English name, with the two-letter code of its flag (the images
// come from flagcdn.com, as on the website). Used for the Healthcare page's
// destination list in the admin, its destination chips on the website, the
// Education hero's flags and the Business partner list.

const LIST: [string, string][] = [
  ["Afghanistan", "af"], ["Åland Islands", "ax"], ["Albania", "al"], ["Algeria", "dz"], ["American Samoa", "as"],
  ["Andorra", "ad"], ["Angola", "ao"], ["Anguilla", "ai"], ["Antarctica", "aq"], ["Antigua and Barbuda", "ag"],
  ["Argentina", "ar"], ["Armenia", "am"], ["Aruba", "aw"], ["Australia", "au"], ["Austria", "at"],
  ["Azerbaijan", "az"], ["Bahamas", "bs"], ["Bahrain", "bh"], ["Bangladesh", "bd"], ["Barbados", "bb"],
  ["Belarus", "by"], ["Belgium", "be"], ["Belize", "bz"], ["Benin", "bj"], ["Bermuda", "bm"],
  ["Bhutan", "bt"], ["Bolivia", "bo"], ["Bosnia and Herzegovina", "ba"], ["Botswana", "bw"], ["Bouvet Island", "bv"],
  ["Brazil", "br"], ["British Indian Ocean Territory", "io"], ["British Virgin Islands", "vg"], ["Brunei", "bn"], ["Bulgaria", "bg"],
  ["Burkina Faso", "bf"], ["Burundi", "bi"], ["Cambodia", "kh"], ["Cameroon", "cm"], ["Canada", "ca"],
  ["Cape Verde", "cv"], ["Caribbean Netherlands", "bq"], ["Cayman Islands", "ky"], ["Central African Republic", "cf"], ["Chad", "td"],
  ["Chile", "cl"], ["China", "cn"], ["Christmas Island", "cx"], ["Cocos (Keeling) Islands", "cc"], ["Colombia", "co"],
  ["Comoros", "km"], ["Congo", "cg"], ["Cook Islands", "ck"], ["Costa Rica", "cr"], ["Côte d'Ivoire", "ci"],
  ["Croatia", "hr"], ["Cuba", "cu"], ["Curaçao", "cw"], ["Cyprus", "cy"], ["Czechia", "cz"],
  ["Denmark", "dk"], ["Djibouti", "dj"], ["Dominica", "dm"], ["Dominican Republic", "do"], ["DR Congo", "cd"],
  ["Ecuador", "ec"], ["Egypt", "eg"], ["El Salvador", "sv"], ["Equatorial Guinea", "gq"], ["Eritrea", "er"],
  ["Estonia", "ee"], ["Eswatini", "sz"], ["Ethiopia", "et"], ["Falkland Islands", "fk"], ["Faroe Islands", "fo"],
  ["Fiji", "fj"], ["Finland", "fi"], ["France", "fr"], ["French Guiana", "gf"], ["French Polynesia", "pf"],
  ["French Southern Territories", "tf"], ["Gabon", "ga"], ["Gambia", "gm"], ["Georgia", "ge"], ["Germany", "de"],
  ["Ghana", "gh"], ["Gibraltar", "gi"], ["Greece", "gr"], ["Greenland", "gl"], ["Grenada", "gd"],
  ["Guadeloupe", "gp"], ["Guam", "gu"], ["Guatemala", "gt"], ["Guernsey", "gg"], ["Guinea", "gn"],
  ["Guinea-Bissau", "gw"], ["Guyana", "gy"], ["Haiti", "ht"], ["Heard Island and McDonald Islands", "hm"], ["Honduras", "hn"],
  ["Hong Kong", "hk"], ["Hungary", "hu"], ["Iceland", "is"], ["India", "in"], ["Indonesia", "id"],
  ["Iran", "ir"], ["Iraq", "iq"], ["Ireland", "ie"], ["Isle of Man", "im"], ["Israel", "il"],
  ["Italy", "it"], ["Jamaica", "jm"], ["Japan", "jp"], ["Jersey", "je"], ["Jordan", "jo"],
  ["Kazakhstan", "kz"], ["Kenya", "ke"], ["Kiribati", "ki"], ["Kosovo", "xk"], ["Kuwait", "kw"],
  ["Kyrgyzstan", "kg"], ["Laos", "la"], ["Latvia", "lv"], ["Lebanon", "lb"], ["Lesotho", "ls"],
  ["Liberia", "lr"], ["Libya", "ly"], ["Liechtenstein", "li"], ["Lithuania", "lt"], ["Luxembourg", "lu"],
  ["Macau", "mo"], ["Madagascar", "mg"], ["Malawi", "mw"], ["Malaysia", "my"], ["Maldives", "mv"],
  ["Mali", "ml"], ["Malta", "mt"], ["Marshall Islands", "mh"], ["Martinique", "mq"], ["Mauritania", "mr"],
  ["Mauritius", "mu"], ["Mayotte", "yt"], ["Mexico", "mx"], ["Micronesia", "fm"], ["Moldova", "md"],
  ["Monaco", "mc"], ["Mongolia", "mn"], ["Montenegro", "me"], ["Montserrat", "ms"], ["Morocco", "ma"],
  ["Mozambique", "mz"], ["Myanmar", "mm"], ["Namibia", "na"], ["Nauru", "nr"], ["Nepal", "np"],
  ["Netherlands", "nl"], ["New Caledonia", "nc"], ["New Zealand", "nz"], ["Nicaragua", "ni"], ["Niger", "ne"],
  ["Nigeria", "ng"], ["Niue", "nu"], ["Norfolk Island", "nf"], ["North Korea", "kp"], ["North Macedonia", "mk"],
  ["Northern Mariana Islands", "mp"], ["Norway", "no"], ["Oman", "om"], ["Pakistan", "pk"], ["Palau", "pw"],
  ["Palestine", "ps"], ["Panama", "pa"], ["Papua New Guinea", "pg"], ["Paraguay", "py"], ["Peru", "pe"],
  ["Philippines", "ph"], ["Pitcairn Islands", "pn"], ["Poland", "pl"], ["Portugal", "pt"], ["Puerto Rico", "pr"],
  ["Qatar", "qa"], ["Réunion", "re"], ["Romania", "ro"], ["Russia", "ru"], ["Rwanda", "rw"],
  ["Saint Barthélemy", "bl"], ["Saint Helena", "sh"], ["Saint Kitts and Nevis", "kn"], ["Saint Lucia", "lc"], ["Saint Martin", "mf"],
  ["Saint Pierre and Miquelon", "pm"], ["Saint Vincent and the Grenadines", "vc"], ["Samoa", "ws"], ["San Marino", "sm"], ["São Tomé and Príncipe", "st"],
  ["Saudi Arabia", "sa"], ["Senegal", "sn"], ["Serbia", "rs"], ["Seychelles", "sc"], ["Sierra Leone", "sl"],
  ["Singapore", "sg"], ["Sint Maarten", "sx"], ["Slovakia", "sk"], ["Slovenia", "si"], ["Solomon Islands", "sb"],
  ["Somalia", "so"], ["South Africa", "za"], ["South Georgia and the South Sandwich Islands", "gs"], ["South Korea", "kr"], ["South Sudan", "ss"],
  ["Spain", "es"], ["Sri Lanka", "lk"], ["Sudan", "sd"], ["Suriname", "sr"], ["Svalbard and Jan Mayen", "sj"],
  ["Sweden", "se"], ["Switzerland", "ch"], ["Syria", "sy"], ["Taiwan", "tw"], ["Tajikistan", "tj"],
  ["Tanzania", "tz"], ["Thailand", "th"], ["Timor-Leste", "tl"], ["Togo", "tg"], ["Tokelau", "tk"],
  ["Tonga", "to"], ["Trinidad and Tobago", "tt"], ["Tunisia", "tn"], ["Turkey", "tr"], ["Turkmenistan", "tm"],
  ["Turks and Caicos Islands", "tc"], ["Tuvalu", "tv"], ["U.S. Virgin Islands", "vi"], ["Uganda", "ug"], ["Ukraine", "ua"],
  ["United Arab Emirates", "ae"], ["United Kingdom", "gb"], ["United States", "us"], ["United States Minor Outlying Islands", "um"], ["Uruguay", "uy"],
  ["Uzbekistan", "uz"], ["Vanuatu", "vu"], ["Vatican City", "va"], ["Venezuela", "ve"], ["Vietnam", "vn"],
  ["Wallis and Futuna", "wf"], ["Western Sahara", "eh"], ["Yemen", "ye"], ["Zambia", "zm"], ["Zimbabwe", "zw"],
];

// Other names people type for the same countries.
const ALIASES: Record<string, string> = {
  uk: "gb", england: "gb", scotland: "gb", wales: "gb", "great britain": "gb", britain: "gb", "northern ireland": "gb",
  usa: "us", us: "us", america: "us", "united states of america": "us",
  uae: "ae", emirates: "ae", dubai: "ae", ksa: "sa",
  türkiye: "tr", turkiye: "tr", "czech republic": "cz", "ivory coast": "ci",
  "democratic republic of the congo": "cd", "congo-kinshasa": "cd", drc: "cd", "republic of the congo": "cg", "congo-brazzaville": "cg",
  burma: "mm", "east timor": "tl", swaziland: "sz", "cabo verde": "cv", macedonia: "mk", macao: "mo",
  "holy see": "va", vatican: "va", "viet nam": "vn", "russian federation": "ru", korea: "kr", "republic of korea": "kr",
  "lao pdr": "la", "brunei darussalam": "bn", "syrian arab republic": "sy", "state of palestine": "ps", "palestinian territories": "ps",
  "the gambia": "gm", "the bahamas": "bs", "the netherlands": "nl", holland: "nl", "republic of ireland": "ie",
  "federated states of micronesia": "fm", "saint kitts": "kn", "st kitts and nevis": "kn", "st lucia": "lc", "st vincent and the grenadines": "vc",
};

// Names compared without capitals, accents or full stops: "Cote d'Ivoire",
// "côte d'ivoire" and "Côte d'Ivoire" are the same country.
const plain = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ");

export const COUNTRIES: { name: string; code: string }[] = LIST.map(([name, code]) => ({ name, code })).sort((a, b) => a.name.localeCompare(b.name));

const flags = new Map<string, string>([
  ...COUNTRIES.map((country) => [plain(country.name), country.code] as [string, string]),
  ...Object.entries(ALIASES).map(([alias, code]) => [plain(alias), code] as [string, string]),
]);

// The flag of one country, or nothing when the name is not known.
export const flagCode = (name: string): string | undefined => flags.get(plain(name));

// The flags to show for a list of destinations: one per country, in the
// order given. A country whose flag is not known is left out.
export function flagCodes(countries: string[]): string[] {
  const codes = countries.map((name) => flagCode(name)).filter((code): code is string => Boolean(code));
  return [...new Set(codes)];
}

// "Bangkok, Thailand" -> "Thailand"; a bare name is its own country.
export const countryOf = (place: string): string => place.split(",").at(-1)!.trim();

export const flagImage = (code: string, width = 40) => `https://flagcdn.com/w${width}/${code}.png`;

// "Kuala Lumpur, Malaysia" -> city "Kuala Lumpur", country "Malaysia" (the
// list's own spelling when the country is known); "Singapore" -> no city.
export function splitPlace(place: string): { city: string; country: string } {
  const parts = place.split(",").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return { city: "", country: "" };
  const typed = parts.at(-1)!;
  const code = flagCode(typed);
  const known = code ? (COUNTRIES.find((country) => plain(country.name) === plain(typed)) ?? COUNTRIES.find((country) => country.code === code)) : undefined;
  return { city: parts.slice(0, -1).join(", "), country: known?.name ?? typed };
}

// Back to the words the website reads: "City, Country", or the country alone.
export function joinPlace(city: string, country: string): string {
  const town = city.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  const land = country.trim();
  if (!land) return town;
  return town ? `${town}, ${land}` : land;
}

// The countries matching what is typed in the list's search box: by name
// (accents ignored) or by a short name such as "uk", "usa" or "uae".
export function searchCountries(query: string): { name: string; code: string }[] {
  const wanted = plain(query);
  if (!wanted) return COUNTRIES;
  const byAlias = new Set(Object.entries(ALIASES).filter(([alias]) => plain(alias).startsWith(wanted)).map(([, code]) => code));
  return COUNTRIES.filter((country) => plain(country.name).includes(wanted) || byAlias.has(country.code));
}
