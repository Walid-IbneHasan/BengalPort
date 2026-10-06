// Helpers for the Umrah page: the departures strip and the highlighted package.
export type Departure = { date: string; label: string };

// The next group departures: dates on or after today, soonest first, three
// at most, each with the day and short month its pill shows.
export function upcomingDepartures(departures: Departure[], today = new Date()) {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return departures
    .map((departure) => ({ ...departure, when: new Date(`${departure.date}T00:00:00`) }))
    .filter((departure) => !Number.isNaN(departure.when.getTime()) && departure.when >= start)
    .sort((a, b) => a.when.getTime() - b.when.getTime())
    .slice(0, 3)
    .map(({ when, label, date }) => ({
      date,
      label,
      day: String(when.getDate()),
      month: when.toLocaleDateString("en-GB", { month: "short" }),
    }));
}

// The package the page sets apart: the one the team gave a tag.
export const isHighlighted = (pkg: { tag: string }) => pkg.tag.trim().length > 0;
