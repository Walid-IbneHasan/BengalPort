// The bKash client against a stand-in for bKash's servers: no network, no
// database. Request and response shapes follow bKash's v2 tokenized checkout
// documentation and what its sandbox returns.
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { GatewayError, createBkashGateway, type StoredToken } from "../src/lib/bkash.js";

const settings = {
  BKASH_USERNAME: "merchant-user",
  BKASH_PASSWORD: "merchant-pass",
  BKASH_APP_KEY: "app-key",
  BKASH_APP_SECRET: "app-secret",
};
const HOUR = 3600_000;

type Call = { path: string; headers: Record<string, string>; body: any };

// A fake bKash: answers each path with the given reply and records the calls.
function fakeBkash(replies: Record<string, (call: Call, count: number) => { status?: number; body: unknown } | Promise<never>> = {}) {
  const calls: Call[] = [];
  let tokens = 0;
  const defaults: typeof replies = {
    "/v2/tokenized-checkout/auth/grant-token": () => ({ body: { statusCode: "0000", statusMessage: "Successful", token_type: "Bearer", id_token: `id-token-${++tokens}`, refresh_token: `refresh-token-${tokens}`, expires_in: 3600 } }),
    "/v2/tokenized-checkout/auth/refresh-token": () => ({ body: { statusCode: "0000", statusMessage: "Successful", token_type: "Bearer", id_token: `id-token-${++tokens}`, refresh_token: `refresh-token-${tokens}`, expires_in: 3600 } }),
    "/v2/tokenized-checkout/payment/create": (call) => ({ body: { paymentId: "TR0011abc", bkashURL: "https://sandbox.payment.bkash.com/?paymentId=TR0011abc", transactionStatus: "Initiated", amount: call.body.amount, merchantInvoiceNumber: call.body.merchantInvoiceNumber, signature: "sig123" } }),
    "/v2/tokenized-checkout/payment/execute": (call) => ({ body: { paymentId: call.body.paymentId, trxId: "DIK20PG0H4", transactionStatus: "Completed", amount: "2500.00", currency: "BDT", payerAccount: "01770618575" } }),
    "/v2/tokenized-checkout/query/payment": (call) => ({ body: { paymentId: call.body.paymentId, verificationStatus: "Incomplete", amount: "2500.00", transactionStatus: "Initiated" } }),
  };
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const call: Call = { path: url.pathname, headers: Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v])), body: JSON.parse(String(init?.body ?? "{}")) };
    calls.push(call);
    const reply = await (replies[url.pathname] ?? defaults[url.pathname])(call, calls.filter((c) => c.path === url.pathname).length);
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof globalThis.fetch;
  return { fetch, calls, to: (path: string) => calls.filter((call) => call.path.endsWith(path)) };
}

function memoryStore(initial: StoredToken | null = null) {
  let stored = initial;
  return { saved: () => stored, load: async () => stored, save: async (token: StoredToken) => { stored = token; } };
}

const order = { amount: 2500, invoice: "BP-PAY-ABC123", payerReference: "BP-7KQ2M9XA", callbackURL: "https://api.example.com/api/payments/bkash/callback" };

describe("whether online payment is switched on", () => {
  test("it is off until the merchant login and app keys are all set", () => {
    assert.equal(createBkashGateway({ env: {}, tokens: memoryStore() }).configured, false);
    assert.equal(createBkashGateway({ env: { ...settings, BKASH_APP_SECRET: "" }, tokens: memoryStore() }).configured, false);
    assert.equal(createBkashGateway({ env: settings, tokens: memoryStore() }).configured, true);
  });

  test("a payment cannot be started while it is off", async () => {
    const gateway = createBkashGateway({ env: {}, tokens: memoryStore() });
    await assert.rejects(gateway.createPayment(order), GatewayError);
  });
});

describe("starting a payment", () => {
  test("the merchant login is sent to get a token", async () => {
    const bkash = fakeBkash();
    await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).createPayment(order);
    const [grant] = bkash.to("/auth/grant-token");
    assert.equal(grant.headers.username, "merchant-user");
    assert.equal(grant.headers.password, "merchant-pass");
    assert.deepEqual(grant.body, { app_key: "app-key", app_secret: "app-secret" });
  });

  test("bKash is given the amount with two decimals, our invoice number and where to send the customer back", async () => {
    const bkash = fakeBkash();
    await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).createPayment(order);
    const [create] = bkash.to("/payment/create");
    assert.deepEqual(create.body, {
      payerReference: "BP-7KQ2M9XA",
      callbackURL: "https://api.example.com/api/payments/bkash/callback",
      amount: "2500.00",
      currency: "BDT",
      intent: "sale",
      merchantInvoiceNumber: "BP-PAY-ABC123",
    });
    assert.equal(create.headers.authorization, "id-token-1");
    assert.equal(create.headers["x-app-key"], "app-key");
  });

  test("the caller gets the bKash page to send the customer to", async () => {
    const bkash = fakeBkash();
    const payment = await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).createPayment(order);
    assert.deepEqual(payment, { paymentId: "TR0011abc", bkashURL: "https://sandbox.payment.bkash.com/?paymentId=TR0011abc", signature: "sig123" });
  });

  test("requests go to the sandbox unless a live address is configured", async () => {
    const sandbox = fakeBkash();
    let host = "";
    const spy = (async (input: any, init?: RequestInit) => { host = new URL(String(input)).host; return sandbox.fetch(input, init); }) as typeof fetch;
    await createBkashGateway({ env: settings, fetch: spy, tokens: memoryStore() }).createPayment(order);
    assert.equal(host, "tokenized.sandbox.bka.sh");
    await createBkashGateway({ env: { ...settings, BKASH_BASE_URL: "https://tokenized.pay.bka.sh/" }, fetch: spy, tokens: memoryStore() }).createPayment(order);
    assert.equal(host, "tokenized.pay.bka.sh");
  });

  test("a refusal from bKash is reported with its message and code", async () => {
    const bkash = fakeBkash({ "/v2/tokenized-checkout/payment/create": () => ({ status: 400, body: { internalCode: "invalid_amount", externalCode: "2006", errorMessageEn: "Invalid amount.", errorMessageBn: null } }) });
    await assert.rejects(
      createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).createPayment(order),
      (error: unknown) => error instanceof GatewayError && error.message === "Invalid amount." && error.code === "2006",
    );
  });
});

describe("bKash's limit of two token requests an hour", () => {
  test("one token serves many payments", async () => {
    const bkash = fakeBkash();
    const gateway = createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() });
    await gateway.createPayment(order);
    await gateway.createPayment(order);
    await gateway.executePayment("TR0011abc");
    assert.equal(bkash.to("/auth/grant-token").length, 1);
  });

  test("payments started at the same moment share one token request", async () => {
    const bkash = fakeBkash();
    const gateway = createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() });
    await Promise.all([gateway.createPayment(order), gateway.createPayment(order), gateway.createPayment(order)]);
    assert.equal(bkash.to("/auth/grant-token").length, 1);
  });

  test("the token is stored, and a restarted server uses it instead of asking again", async () => {
    const store = memoryStore();
    const first = fakeBkash();
    await createBkashGateway({ env: settings, fetch: first.fetch, tokens: store }).createPayment(order);
    const afterRestart = fakeBkash();
    await createBkashGateway({ env: settings, fetch: afterRestart.fetch, tokens: store }).createPayment(order);
    assert.equal(afterRestart.to("/auth/grant-token").length, 0);
    assert.equal(afterRestart.to("/payment/create")[0].headers.authorization, "id-token-1");
  });

  test("a token close to expiring is renewed with its refresh token", async () => {
    const now = Date.now();
    const store = memoryStore({ idToken: "old-token", refreshToken: "old-refresh", expiresAt: new Date(now + 2 * 60_000) });
    const bkash = fakeBkash();
    await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: store, now: () => now }).createPayment(order);
    assert.equal(bkash.to("/auth/grant-token").length, 0);
    assert.deepEqual(bkash.to("/auth/refresh-token")[0].body, { app_key: "app-key", app_secret: "app-secret", refresh_token: "old-refresh" });
    assert.equal(store.saved()!.idToken, "id-token-1");
    assert.equal(store.saved()!.expiresAt.getTime(), now + HOUR);
  });

  test("when the refresh token is refused, a fresh token is requested", async () => {
    const now = Date.now();
    const store = memoryStore({ idToken: "old-token", refreshToken: "expired-refresh", expiresAt: new Date(now - HOUR) });
    const bkash = fakeBkash({ "/v2/tokenized-checkout/auth/refresh-token": () => ({ status: 401, body: { message: "Unauthorized" } }) });
    await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: store, now: () => now }).createPayment(order);
    assert.equal(bkash.to("/auth/grant-token").length, 1);
  });

  test("a token bKash no longer accepts is replaced once and the call repeated", async () => {
    const now = Date.now();
    const store = memoryStore({ idToken: "revoked-token", refreshToken: "refresh", expiresAt: new Date(now + HOUR) });
    const bkash = fakeBkash({
      "/v2/tokenized-checkout/payment/create": (call, count) =>
        count === 1 ? { status: 401, body: { message: "Unauthorized" } } : { body: { paymentId: "TR0011abc", bkashURL: "https://sandbox.payment.bkash.com/?paymentId=TR0011abc", signature: "sig123" } },
    });
    const payment = await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: store, now: () => now }).createPayment(order);
    assert.equal(payment.paymentId, "TR0011abc");
    assert.equal(bkash.to("/payment/create").length, 2);
    assert.equal(bkash.to("/payment/create")[1].headers.authorization, "id-token-1");
  });

  test("bad merchant credentials are reported, not retried", async () => {
    const bkash = fakeBkash({ "/v2/tokenized-checkout/auth/grant-token": () => ({ status: 401, body: { message: "Unauthorized" } }) });
    await assert.rejects(createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).createPayment(order), GatewayError);
    assert.equal(bkash.to("/auth/grant-token").length, 1);
  });
});

describe("finishing and checking a payment", () => {
  test("executing a payment returns the bKash transaction, the amount and the paying wallet", async () => {
    const bkash = fakeBkash();
    const result = await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).executePayment("TR0011abc");
    assert.deepEqual(bkash.to("/payment/execute")[0].body, { paymentId: "TR0011abc" });
    assert.deepEqual(result, { paymentId: "TR0011abc", status: "Completed", trxId: "DIK20PG0H4", amount: 2500, payerAccount: "01770618575" });
  });

  test("a payment the customer has not approved cannot be executed", async () => {
    const bkash = fakeBkash({ "/v2/tokenized-checkout/payment/execute": () => ({ status: 400, body: { internalCode: "invalid_payment_state", externalCode: "2056", errorMessageEn: "Invalid Payment State", errorMessageBn: null } }) });
    await assert.rejects(
      createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).executePayment("TR0011abc"),
      (error: unknown) => error instanceof GatewayError && error.code === "2056",
    );
  });

  test("querying reports a payment that is still waiting", async () => {
    const bkash = fakeBkash();
    const result = await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).queryPayment("TR0011abc");
    assert.deepEqual(result, { paymentId: "TR0011abc", status: "Initiated", trxId: null, amount: 2500, payerAccount: null });
  });

  test("a call bKash never answers is given up on", async () => {
    const hanging = ((_input: any, init?: RequestInit) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted"))))) as typeof fetch;
    const store = memoryStore({ idToken: "token", refreshToken: "refresh", expiresAt: new Date(Date.now() + HOUR) });
    const started = Date.now();
    await assert.rejects(createBkashGateway({ env: settings, fetch: hanging, tokens: store, timeoutMs: 40 }).executePayment("TR0011abc"), GatewayError);
    assert.ok(Date.now() - started < 2000);
  });
});

describe("refunding a payment through bKash", () => {
  const refund = { paymentId: "TR0011abc", trxId: "DIK20PG0H4", amount: 1000.5, reason: "Application withdrawn", sku: "BP-7KQ2M9XA" };
  const completed = (call: Call) => ({ body: { originalTrxId: call.body.trxId, refundTrxId: "DIK50PG0VX", refundTransactionStatus: "Completed", originalTrxAmount: "2500", refundAmount: "1000.50", currency: "BDT", completedTime: "2026-09-20T14:47:03:555 GMT+0600", sku: call.body.sku, reason: call.body.reason } });

  test("bKash is told which payment, how much and why", async () => {
    const bkash = fakeBkash({ "/v2/tokenized-checkout/refund/payment/transaction": completed });
    await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).refundPayment(refund);
    const [call] = bkash.to("/refund/payment/transaction");
    assert.deepEqual(call.body, { paymentId: "TR0011abc", trxId: "DIK20PG0H4", refundAmount: "1000.50", reason: "Application withdrawn", sku: "BP-7KQ2M9XA" });
    assert.equal(call.headers["x-app-key"], "app-key");
    assert.equal(call.headers.authorization, "id-token-1");
  });

  test("a completed refund comes back with bKash's own refund number", async () => {
    const bkash = fakeBkash({ "/v2/tokenized-checkout/refund/payment/transaction": completed });
    const result = await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).refundPayment(refund);
    assert.deepEqual(result, { refundTrxId: "DIK50PG0VX", status: "Completed", amount: 1000.5 });
  });

  test("the reason and the product tag are cut to what bKash accepts", async () => {
    const bkash = fakeBkash({ "/v2/tokenized-checkout/refund/payment/transaction": completed });
    await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).refundPayment({ ...refund, reason: "r".repeat(400), sku: "s".repeat(400) });
    const [call] = bkash.to("/refund/payment/transaction");
    assert.equal(call.body.reason.length, 255);
    assert.equal(call.body.sku.length, 255);
  });

  test("a refusal carries bKash's explanation", async () => {
    const bkash = fakeBkash({ "/v2/tokenized-checkout/refund/payment/transaction": () => ({ status: 400, body: { internalCode: "refund_amount_exceed_payment_amount", externalCode: "2072", errorMessageEn: "Refund amount not valid", errorMessageBn: null } }) });
    await assert.rejects(
      createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).refundPayment(refund),
      (error: unknown) => error instanceof GatewayError && error.message === "Refund amount not valid" && error.code === "2072",
    );
  });

  test("no answer from bKash is told apart from a refusal", async () => {
    const bkash = fakeBkash({ "/v2/tokenized-checkout/refund/payment/transaction": () => Promise.reject(new Error("socket hang up")) });
    await assert.rejects(
      createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).refundPayment(refund),
      (error: unknown) => error instanceof GatewayError && error.code === "NO_RESPONSE",
    );
  });

  test("the refunds bKash holds for a payment can be listed", async () => {
    const bkash = fakeBkash({
      "/v2/tokenized-checkout/refund/payment/status": (call) => ({
        body: {
          originalTrxId: call.body.trxId,
          originalTrxAmount: "2500",
          originalTrxCompletedTime: "2026-09-20T14:39:02:266 GMT+0600",
          refundTransactions: [
            { refundTrxId: "DIK50PG0VX", refundTransactionStatus: "Completed", refundAmount: "1000.50", completedTime: "2026-09-20T14:47:02:000" },
            { refundTrxId: "DIK60PG0ZZ", refundTransactionStatus: "Completed", refundAmount: "200.00", completedTime: "2026-09-21T10:00:00:000" },
          ],
        },
      }),
    });
    const list = await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).refundStatus("TR0011abc", "DIK20PG0H4");
    assert.deepEqual(bkash.to("/refund/payment/status")[0].body, { paymentId: "TR0011abc", trxId: "DIK20PG0H4" });
    assert.deepEqual(list, [
      { refundTrxId: "DIK50PG0VX", status: "Completed", amount: 1000.5 },
      { refundTrxId: "DIK60PG0ZZ", status: "Completed", amount: 200 },
    ]);
  });

  test("a payment bKash has no refunds for gives an empty list", async () => {
    const bkash = fakeBkash({ "/v2/tokenized-checkout/refund/payment/status": (call) => ({ body: { originalTrxId: call.body.trxId, originalTrxAmount: "2500" } }) });
    assert.deepEqual(await createBkashGateway({ env: settings, fetch: bkash.fetch, tokens: memoryStore() }).refundStatus("TR0011abc", "DIK20PG0H4"), []);
  });
});
