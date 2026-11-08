// What an invoice adds up to. Amounts are worked out in paisa so that taka
// with decimals add up exactly, and each line is rounded before the lines are
// added so that the printed lines always sum to the printed total.
export type InvoiceLine = { description: string; quantity: number; unitPrice: number };
export type InvoiceStatus = "PAID" | "PARTIALLY_PAID" | "DUE";

const paisa = (amount: number) => Math.round(amount * 100);

export const invoiceNumber = (serial: number) => `INV-${String(serial).padStart(6, "0")}`;

export function invoiceAmounts(items: InvoiceLine[], paid: number) {
  const total = items.reduce((sum, line) => sum + paisa(line.quantity * line.unitPrice), 0);
  const received = paisa(paid);
  const status: InvoiceStatus = received <= 0 ? "DUE" : received >= total ? "PAID" : "PARTIALLY_PAID";
  return { total: total / 100, paid: received / 100, due: Math.max(0, total - received) / 100, status };
}

// "INV-000123", "inv000123" or "123" as the serial it names, or null.
export function serialFromSearch(search: string): number | null {
  const digits = search.trim().match(/^(?:inv-?)?(\d{1,9})$/i)?.[1];
  return digits ? Number(digits) : null;
}
