// The value for an <input type="datetime-local">, which works in the visitor's
// own time zone ("2026-10-02T14:05"), unlike toISOString(), which is UTC.
export function toLocalInput(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
