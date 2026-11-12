// The dashboard's period: preset ranges by the calendar in Bangladesh, and
// how a period from the server ("2026-11-03", "2026-11") is written.
export type Preset = "today" | "week" | "month" | "last-month" | "year" | "custom";
export type Range = { from: string; to: string };

const pad = (n: number) => String(n).padStart(2, "0");
const iso = (date: Date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
// "Now" moved to Dhaka time, read with the UTC getters.
const dhakaNow = (now: Date) => new Date(now.getTime() + 6 * 3600_000);

export function presetRange(preset: Exclude<Preset, "custom">, now = new Date()): Range {
  const d = dhakaNow(now);
  const today = iso(d);
  const y = d.getUTCFullYear(), m = d.getUTCMonth();
  if (preset === "today") return { from: today, to: today };
  if (preset === "week") {
    // The week starts on Saturday in Bangladesh offices.
    const back = (d.getUTCDay() + 1) % 7;
    return { from: iso(new Date(Date.UTC(y, m, d.getUTCDate() - back))), to: today };
  }
  if (preset === "month") return { from: `${y}-${pad(m + 1)}-01`, to: today };
  if (preset === "last-month") {
    const start = new Date(Date.UTC(y, m - 1, 1));
    const end = new Date(Date.UTC(y, m, 0));
    return { from: iso(start), to: iso(end) };
  }
  return { from: `${y}-01-01`, to: today };
}

// How many days the range covers, both ends included.
export const rangeDays = (range: Range) =>
  Math.round((Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86_400_000) + 1;

// A sensible grouping for the chart: days for a month, weeks for a quarter, months beyond.
export const defaultGroup = (range: Range): "day" | "week" | "month" => {
  const days = rangeDays(range);
  return days <= 35 ? "day" : days <= 120 ? "week" : "month";
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "3 Nov", "Week of 3 Nov", "Nov 2026".
export function periodLabel(period: string, group: "day" | "week" | "month", short = false) {
  const [y, m, d] = period.split("-").map(Number);
  if (group === "month") return short ? MONTHS[m - 1] : `${MONTHS[m - 1]} ${y}`;
  const text = `${d} ${MONTHS[m - 1]}`;
  return group === "week" && !short ? `Week of ${text}` : text;
}

// "1–12 Nov 2026", "28 Oct – 3 Nov 2026", "1 Jan 2025 – 2 Feb 2026".
export function rangeLabel(range: Range) {
  const [fy, fm, fd] = range.from.split("-").map(Number);
  const [ty, tm, td] = range.to.split("-").map(Number);
  if (range.from === range.to) return `${fd} ${MONTHS[fm - 1]} ${fy}`;
  if (fy === ty && fm === tm) return `${fd}–${td} ${MONTHS[tm - 1]} ${ty}`;
  if (fy === ty) return `${fd} ${MONTHS[fm - 1]} – ${td} ${MONTHS[tm - 1]} ${ty}`;
  return `${fd} ${MONTHS[fm - 1]} ${fy} – ${td} ${MONTHS[tm - 1]} ${ty}`;
}

// A round top for the chart's scale: 1, 2, 2.5 or 5 times a power of ten.
export function niceMax(value: number) {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) if (step * power >= value) return step * power;
  return 10 * power;
}

// ৳12.5k, ৳3.2L (lakh), ৳1.1Cr (crore) for the chart's axis.
export function shortTaka(value: number) {
  const abs = Math.abs(value);
  const sign = value < 0 ? "−" : "";
  const trim = (n: number) => String(Math.round(n * 10) / 10);
  if (abs >= 1e7) return `${sign}৳${trim(abs / 1e7)}Cr`;
  if (abs >= 1e5) return `${sign}৳${trim(abs / 1e5)}L`;
  if (abs >= 1e3) return `${sign}৳${trim(abs / 1e3)}k`;
  return `${sign}৳${Math.round(abs)}`;
}

// A greeting by the time of day in Bangladesh.
export function greeting(now = new Date()) {
  const hour = dhakaNow(now).getUTCHours();
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}
