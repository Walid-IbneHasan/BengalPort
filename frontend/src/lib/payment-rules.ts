// The amount rules the API enforces, checked in the form first so the
// customer is told before being sent to bKash. Amounts are compared in paisa.
const paisa = (amount: number) => Math.round(amount * 100);

export const taka = (amount: number) =>
  `৳${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)}`;

// Why an amount cannot be paid, or "" when it can. A customer may pay
// everything that is left, or a part of it that is at least the minimum.
export function paymentProblem(amount: number, limits: { remaining: number | null; minimum: number }): string {
  if (limits.remaining === null) return "The amount due has not been confirmed yet.";
  if (limits.remaining <= 0) return "There is nothing left to pay on this application.";
  if (!Number.isFinite(amount) || amount <= 0) return "Enter the amount you want to pay.";
  if (Math.abs(amount * 100 - paisa(amount)) > 1e-6) return "Use at most two decimal places.";
  if (paisa(amount) > paisa(limits.remaining)) return `You can pay up to ${taka(limits.remaining)}, the amount still due.`;
  const smallest = Math.min(limits.minimum, limits.remaining);
  if (paisa(amount) < paisa(smallest)) return `The smallest part payment is ${taka(smallest)}.`;
  return "";
}

// What the API reports about an application's money.
export type PaymentSummary = {
  id: string;
  reference: string;
  type: string;
  amountDue: number | null;
  paid: number;
  remaining: number | null;
  minimumPayment: number;
  onlinePayment: boolean;
  payments: { id: string; amount: number; method: string; status: string; paidAt: string; receiptNumber: string | null; receiptKey: string | null }[];
};
