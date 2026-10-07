// What every online payment provider looks like to the rest of the API. bKash
// (bkash.ts) and Nagad (nagad.ts) each implement it; payments.ts talks to
// whichever one a payment was made through.

export type Provider = "bkash" | "nagad";
// The providers in the order the customer is offered them.
export const providers: Record<Provider, { name: string }> = {
  bkash: { name: "bKash" },
  nagad: { name: "Nagad" },
};
export const providerKeys = Object.keys(providers) as Provider[];
export const isProvider = (value: string): value is Provider => value in providers;

// A started payment: the provider's id for it and the page to send the
// customer to. `signature` is bKash's check on the return address; null for
// providers without one.
export type GatewayPayment = { paymentId: string; redirectUrl: string; signature: string | null };
// The state of a payment as the provider reports it. `status` is "Completed"
// when the money has moved, "Cancelled" or "Failed" when it will not, and
// "Initiated" while nothing is decided.
export type GatewayStatus = { paymentId: string; status: string; trxId: string | null; amount: number | null; payerAccount: string | null };
// `clientIp` is the customer's address, which Nagad requires with every call.
export type PaymentOrder = { amount: number; invoice: string; payerReference: string; callbackURL: string; clientIp?: string };
// `paymentId` and `trxId` are the ones the provider gave the original
// payment; `sku` is a tag for what was bought, which bKash requires.
export type RefundOrder = { paymentId: string; trxId: string; amount: number; reason: string; sku: string };
export type GatewayRefund = { refundTrxId: string | null; status: string; amount: number | null };

export type Gateway = {
  configured: boolean;
  // Whether refunds go through the provider's API. When false, staff refund
  // in the provider's merchant portal and record it on the site.
  refunds: boolean;
  createPayment(order: PaymentOrder): Promise<GatewayPayment>;
  executePayment(paymentId: string): Promise<GatewayStatus>;
  queryPayment(paymentId: string): Promise<GatewayStatus>;
  refundPayment(order: RefundOrder): Promise<GatewayRefund>;
  refundStatus(paymentId: string, trxId: string): Promise<GatewayRefund[]>;
};

export class GatewayError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
  }
}
