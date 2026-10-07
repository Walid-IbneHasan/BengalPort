// The value for an <input type="datetime-local">, which works in the visitor's
// own time zone ("2026-10-02T14:05"), unlike toISOString(), which is UTC.
export function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// A deadline as "7 Oct 2026". Deadlines apply in Bangladesh, so the day is
// read in Dhaka's time zone whoever is looking, instead of shifting with the
// visitor's clock. A value that is not a date is shown as it came.
const deadlineFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Dhaka" });
export function shortDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : deadlineFormat.format(date);
}
