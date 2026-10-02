// Client for bKash Tokenized Checkout, API v2 (https://developer.bka.sh).
//
// The flow: createPayment() returns a bKash page; the customer approves the
// payment there with their wallet PIN and is sent back to our callback; only
// executePayment() then moves the money. queryPayment() reports the state of
// a payment when an execute call went unanswered. refundPayment() sends money
// back to the wallet that paid, in full or in part (bKash allows up to ten
// part refunds, within 60 days of the payment); refundStatus() lists the
// refunds bKash holds for a payment.
//
// Settings: BKASH_USERNAME, BKASH_PASSWORD, BKASH_APP_KEY, BKASH_APP_SECRET,
// and BKASH_BASE_URL (the sandbox when unset; bKash supplies the live address
// with the live credentials).

export type StoredToken = { idToken: string; refreshToken: string; expiresAt: Date };
export type TokenStore = { load(): Promise<StoredToken | null>; save(token: StoredToken): Promise<void> };
export type GatewayPayment = { paymentId: string; bkashURL: string; signature: string | null };
export type GatewayStatus = { paymentId: string; status: string; trxId: string | null; amount: number | null; payerAccount: string | null };
export type PaymentOrder = { amount: number; invoice: string; payerReference: string; callbackURL: string };
// `paymentId` and `trxId` are the ones bKash gave the original payment; `sku`
// is a tag for what was bought, which bKash requires.
export type RefundOrder = { paymentId: string; trxId: string; amount: number; reason: string; sku: string };
export type GatewayRefund = { refundTrxId: string | null; status: string; amount: number | null };
export type Gateway = {
  configured: boolean;
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

const SANDBOX = "https://tokenized.sandbox.bka.sh";
const API = "/v2/tokenized-checkout";
// A token is renewed once it has less than this left, so no call starts with
// a token about to expire.
const RENEW_BEFORE_MS = 5 * 60_000;

export function createBkashGateway(options: {
  env?: NodeJS.ProcessEnv;
  fetch?: typeof globalThis.fetch;
  tokens: TokenStore;
  now?: () => number;
  timeoutMs?: number;
}): Gateway {
  const env = options.env ?? process.env;
  const request = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const base = (env.BKASH_BASE_URL || SANDBOX).replace(/\/+$/, "");
  const { BKASH_USERNAME: username, BKASH_PASSWORD: password, BKASH_APP_KEY: appKey, BKASH_APP_SECRET: appSecret } = env;
  const configured = Boolean(username && password && appKey && appSecret);

  async function post(path: string, headers: Record<string, string>, body: unknown) {
    let response: Response;
    try {
      response = await request(`${base}${API}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new GatewayError("bKash did not respond", "NO_RESPONSE");
    }
    const data = (await response.json().catch(() => ({}))) as Record<string, any>;
    return { status: response.status, ok: response.ok, data };
  }

  const refusal = (reply: { status: number; data: Record<string, any> }, fallback: string) =>
    new GatewayError(
      reply.data.errorMessageEn || reply.data.statusMessage || reply.data.message || `${fallback} (HTTP ${reply.status})`,
      reply.data.externalCode ?? reply.data.statusCode ?? String(reply.status),
    );

  // bKash allows two token requests an hour and blocks the merchant beyond
  // that, so a token is stored, shared by concurrent calls, and renewed with
  // its refresh token only when it is about to expire.
  let current: StoredToken | null = null;
  let renewing: Promise<StoredToken> | null = null;

  async function requestToken(path: "/auth/grant-token" | "/auth/refresh-token", refreshToken?: string) {
    const reply = await post(
      path,
      { username: username!, password: password! },
      { app_key: appKey, app_secret: appSecret, ...(refreshToken ? { refresh_token: refreshToken } : {}) },
    );
    if (!reply.ok || !reply.data.id_token) throw refusal(reply, "bKash refused the merchant login");
    const token: StoredToken = {
      idToken: reply.data.id_token,
      refreshToken: reply.data.refresh_token ?? refreshToken ?? "",
      expiresAt: new Date(now() + (Number(reply.data.expires_in) || 3600) * 1000),
    };
    await options.tokens.save(token);
    return token;
  }

  async function renew(replaceRejected: boolean) {
    const stored = replaceRejected ? null : (current ?? (await options.tokens.load()));
    if (stored && stored.expiresAt.getTime() - now() > RENEW_BEFORE_MS) return stored;
    if (stored?.refreshToken) {
      try {
        return await requestToken("/auth/refresh-token", stored.refreshToken);
      } catch {
        // The refresh token has expired or been revoked: ask for a new one.
      }
    }
    return requestToken("/auth/grant-token");
  }

  function token(replaceRejected = false): Promise<StoredToken> {
    renewing ??= renew(replaceRejected)
      .then((token) => (current = token))
      .finally(() => (renewing = null));
    return renewing;
  }

  async function call(path: string, body: unknown, fallback: string) {
    if (!configured) throw new GatewayError("Online payment is not configured", "NOT_CONFIGURED");
    const send = async (replaceRejected: boolean) =>
      post(path, { Authorization: (await token(replaceRejected)).idToken, "X-App-Key": appKey! }, body);
    let reply = await send(false);
    if (reply.status === 401) reply = await send(true);
    if (!reply.ok || reply.data.externalCode) throw refusal(reply, fallback);
    return reply.data;
  }

  const status = (data: Record<string, any>, paymentId: string): GatewayStatus => ({
    paymentId: data.paymentId ?? data.paymentID ?? paymentId,
    status: data.transactionStatus ?? "Unknown",
    trxId: data.trxId ?? data.trxID ?? null,
    amount: data.amount == null ? null : Number(data.amount),
    payerAccount: data.payerAccount ?? data.customerMsisdn ?? null,
  });

  const refund = (data: Record<string, any>): GatewayRefund => ({
    refundTrxId: data.refundTrxId ?? null,
    status: data.refundTransactionStatus ?? "Unknown",
    amount: data.refundAmount == null ? null : Number(data.refundAmount),
  });

  return {
    configured,
    async createPayment(order) {
      const data = await call(
        "/payment/create",
        {
          payerReference: order.payerReference,
          callbackURL: order.callbackURL,
          amount: order.amount.toFixed(2),
          currency: "BDT",
          intent: "sale",
          merchantInvoiceNumber: order.invoice,
        },
        "bKash could not start the payment",
      );
      const paymentId = data.paymentId ?? data.paymentID;
      if (!paymentId || !data.bkashURL) throw new GatewayError("bKash returned an incomplete payment", "INCOMPLETE");
      return { paymentId, bkashURL: data.bkashURL, signature: data.signature ?? null };
    },
    async executePayment(paymentId) {
      return status(await call("/payment/execute", { paymentId }, "bKash could not complete the payment"), paymentId);
    },
    async queryPayment(paymentId) {
      return status(await call("/query/payment", { paymentId }, "bKash could not report the payment"), paymentId);
    },
    async refundPayment(order) {
      const data = await call(
        "/refund/payment/transaction",
        {
          paymentId: order.paymentId,
          trxId: order.trxId,
          refundAmount: order.amount.toFixed(2),
          reason: order.reason.slice(0, 255),
          sku: order.sku.slice(0, 255),
        },
        "bKash could not make the refund",
      );
      return refund(data);
    },
    async refundStatus(paymentId, trxId) {
      const data = await call("/refund/payment/status", { paymentId, trxId }, "bKash could not report the refunds");
      return Array.isArray(data.refundTransactions) ? data.refundTransactions.map(refund) : [];
    },
  };
}
