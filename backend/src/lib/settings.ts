// Office settings the Super Admin can change: reminder timings, the
// invoice's standard terms, the currencies in use.
import { prisma } from "./prisma.js";

export const DEFAULT_SETTINGS = {
  // Days before a document expires when its alerts go out.
  documentExpiryDays: [15, 7] as number[],
  // Days before an invoice's due date when a payment reminder goes out.
  paymentReminderDays: [3] as number[],
  // Days before a deal's end date when a deadline alert goes out.
  dealDeadlineDays: [7, 1] as number[],
  // The standard terms printed on invoices and agreements (cancellation,
  // refund, additional charges). The team will write their own.
  invoiceTerms:
    "Cancellation: tell us in writing; work already done is charged.\nRefunds: made to the way you paid, less costs already paid to third parties.\nAdditional charges: government, embassy and courier fees are charged as they are paid.",
  currencies: ["BDT", "USD", "EUR", "GBP", "MYR"] as string[],
};
export type Settings = typeof DEFAULT_SETTINGS;

export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const saved = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  const out: any = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS)) if (saved[key] !== undefined) out[key] = saved[key];
  return out;
}

export async function saveSettings(changes: Partial<Settings>) {
  for (const [key, value] of Object.entries(changes))
    if (value !== undefined && key in DEFAULT_SETTINGS)
      await prisma.setting.upsert({ where: { key }, update: { value: value as any }, create: { key, value: value as any } });
  return getSettings();
}
