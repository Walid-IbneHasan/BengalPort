// Money rules shared by every way of paying. Amounts are compared in paisa so
// that taka with decimals add up exactly.
export type Balance = { amountDue: number | null; paid: number; remaining: number | null };

const paisa = (amount: unknown) => Math.round(Number(amount) * 100);

// A payment counts once the money has been received.
export const received = (status: string) => status === "PAID" || status === "PARTIALLY_PAID";

export const taka = (amount: number) =>
  `৳${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(amount)}`;

type RefundRow = { amount: unknown; status: string };
type PaymentRow = { amount: unknown; status: string; refunds?: RefundRow[] };

const sum = (refunds: RefundRow[] | undefined, statuses: string[]) =>
  (refunds ?? []).filter((refund) => statuses.includes(refund.status)).reduce((total, refund) => total + paisa(refund.amount), 0);

// What an application costs, what has been received, and what is left.
// `remaining` is null until an amount due has been set. Money that was sent
// back no longer counts as paid.
export function balance(amountDue: number | null, payments: PaymentRow[]): Balance {
  const paid = payments
    .filter((payment) => received(payment.status))
    .reduce((total, payment) => total + paisa(payment.amount) - sum(payment.refunds, ["COMPLETED"]), 0);
  return {
    amountDue,
    paid: paid / 100,
    remaining: amountDue === null ? null : Math.max(0, paisa(amountDue) - paid) / 100,
  };
}

// How much of a payment can still be sent back. A refund bKash has not
// answered yet is held back too, so the same money is never refunded twice.
export function refundable(payment: PaymentRow): number {
  if (!received(payment.status)) return 0;
  return Math.max(0, paisa(payment.amount) - sum(payment.refunds, ["COMPLETED", "PENDING"])) / 100;
}

// Whether everything received on a payment has gone back to the customer.
export const refundedInFull = (payment: PaymentRow) =>
  received(payment.status) && paisa(payment.amount) - sum(payment.refunds, ["COMPLETED"]) <= 0;

// Why an amount cannot be refunded on a payment, or "" when it can.
export function refundProblem(amount: number, payment: PaymentRow): string {
  if (payment.status === "REFUNDED") return "This payment has already been refunded in full.";
  if (!received(payment.status)) return "This payment was not received, so there is nothing to refund.";
  const left = refundable(payment);
  if (left <= 0) return "This payment has already been refunded in full.";
  if (!Number.isFinite(amount) || amount <= 0) return "Enter the amount to refund.";
  if (Math.abs(amount * 100 - paisa(amount)) > 1e-6) return "Use at most two decimal places.";
  if (paisa(amount) > paisa(left)) return `You can refund up to ${taka(left)} of this payment.`;
  return "";
}

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
