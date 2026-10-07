// The Nagad client against a stand-in for Nagad's servers: no network, no
// database. The stand-in holds Nagad's side of the keys, so it can open what
// the client encrypts and check what it signs, and answers in Nagad's own
// encrypted and signed form. Request and response shapes follow Nagad's
// merchant Payment Gateway documentation (checkout initialize, checkout
// complete, verify payment).
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { constants, createPublicKey, createPrivateKey, generateKeyPairSync, privateDecrypt, publicEncrypt, sign, verify } from "node:crypto";
import { GatewayError } from "../src/lib/gateway.js";
import { createNagadGateway } from "../src/lib/nagad.js";

const nagadKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const merchantKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const der = (key: ReturnType<typeof createPublicKey> | ReturnType<typeof createPrivateKey>, type: "spki" | "pkcs8") =>
  (key.export({ type, format: "der" }) as Buffer).toString("base64");

// What Nagad hands a merchant: Nagad's public key and the merchant's private key, both base64 without PEM lines.
const settings = {
  NAGAD_MERCHANT_ID: "683002007104225",
  NAGAD_MERCHANT_NUMBER: "01711111111",
  NAGAD_PUBLIC_KEY: der(nagadKeys.publicKey, "spki"),
  NAGAD_PRIVATE_KEY: der(merchantKeys.privateKey, "pkcs8"),
};

type Call = { method: string; path: string; headers: Record<string, string>; body: any; opened: any };

// Nagad's side of the cryptography.
const nagadOpen = (sensitiveData: string) => JSON.parse(privateDecrypt({ key: nagadKeys.privateKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(sensitiveData, "base64")).toString("utf8"));
const merchantSigned = (plain: string, signature: string) => verify("sha256", Buffer.from(plain), merchantKeys.publicKey, Buffer.from(signature, "base64"));
const nagadSeal = (payload: unknown, badSignature = false) => {
  const plain = JSON.stringify(payload);
  return {
    sensitiveData: publicEncrypt({ key: merchantKeys.publicKey, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(plain)).toString("base64"),
    signature: sign("sha256", Buffer.from(badSignature ? plain + " " : plain), nagadKeys.privateKey).toString("base64"),
  };
};

type Reply = { status?: number; body: unknown };
// A fake Nagad: answers each path with the given reply and records the calls.
function fakeNagad(replies: Partial<Record<"initialize" | "complete" | "verify", (call: Call) => Reply | Promise<never>>> = {}) {
  const calls: Call[] = [];
  const defaults = {
    initialize: (call: Call) => ({ body: nagadSeal({ paymentReferenceId: "MDkxMjIwMjAxMTM5MDAx", challenge: "4c7e8f2a", acceptDateTime: call.body.dateTime }) }),
    complete: () => ({ body: { callBackUrl: "https://sandbox.mynagad.com/check-out/MDkxMjIwMjAxMTM5MDAx", status: "Success" } }),
    verify: () => ({ body: { merchantId: settings.NAGAD_MERCHANT_ID, orderId: "BPPAYABC123", paymentRefId: "MDkxMjIwMjAxMTM5MDAx", amount: "2500.00", clientMobileNo: "01711222333", status: "Success", statusCode: "000", issuerPaymentRefNo: "NGD7ZK2Q" } }),
  };
  const fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    const kind = url.pathname.includes("/check-out/initialize/") ? "initialize" : url.pathname.includes("/check-out/complete/") ? "complete" : "verify";
    const body = init?.body ? JSON.parse(String(init.body)) : null;
    const call: Call = {
      method: init?.method ?? "GET",
      path: url.pathname,
      headers: Object.fromEntries(Object.entries((init?.headers ?? {}) as Record<string, string>).map(([k, v]) => [k.toLowerCase(), v])),
      body,
      opened: body?.sensitiveData ? nagadOpen(body.sensitiveData) : null,
    };
    if (call.opened && !merchantSigned(JSON.stringify(call.opened), body.signature)) throw new Error(`The merchant signature on ${kind} did not verify`);
    calls.push(call);
    const reply = await (replies[kind] ?? defaults[kind])(call);
    return new Response(JSON.stringify(reply.body), { status: reply.status ?? 200, headers: { "content-type": "application/json" } });
  }) as typeof globalThis.fetch;
  return { fetch, calls, of: (kind: string) => calls.filter((call) => call.path.includes(`/${kind}`)) };
}

const order = { amount: 2500, invoice: "BPPAYABC123", payerReference: "BP-7KQ2M9XA", callbackURL: "https://api.example.com/api/payments/nagad/callback", clientIp: "103.4.145.22" };
const gatewayWith = (fake: ReturnType<typeof fakeNagad>, env: Record<string, string> = settings) =>
  createNagadGateway({ env, fetch: fake.fetch, now: () => Date.UTC(2026, 9, 7, 8, 30, 15) });

describe("whether Nagad is switched on", () => {
  test("it is off until the merchant id, number and both keys are set", () => {
    assert.equal(createNagadGateway({ env: {} }).configured, false);
    assert.equal(createNagadGateway({ env: { ...settings, NAGAD_PRIVATE_KEY: "" } }).configured, false);
    assert.equal(createNagadGateway({ env: settings }).configured, true);
  });

  test("a payment cannot be started while it is off", async () => {
    await assert.rejects(createNagadGateway({ env: {} }).createPayment(order), (error: GatewayError) => error.code === "NOT_CONFIGURED");
  });

  test("Nagad payments are refunded in Nagad's merchant portal, not through the site", async () => {
    const gateway = createNagadGateway({ env: settings });
    assert.equal(gateway.refunds, false);
    await assert.rejects(gateway.refundPayment({ paymentId: "x", trxId: "y", amount: 1, reason: "r", sku: "s" }), (error: GatewayError) => error.code === "NOT_SUPPORTED");
  });
});

describe("starting a payment", () => {
  test("the order is initialised, then completed, and the customer is sent to Nagad's page", async () => {
    const fake = fakeNagad();
    const payment = await gatewayWith(fake).createPayment(order);
    assert.deepEqual(payment, { paymentId: "MDkxMjIwMjAxMTM5MDAx", redirectUrl: "https://sandbox.mynagad.com/check-out/MDkxMjIwMjAxMTM5MDAx", signature: null });
    assert.deepEqual(fake.calls.map((call) => call.path), [
      `/remote-payment-gateway-1.0/api/dfs/check-out/initialize/${settings.NAGAD_MERCHANT_ID}/BPPAYABC123`,
      "/remote-payment-gateway-1.0/api/dfs/check-out/complete/MDkxMjIwMjAxMTM5MDAx",
    ]);
  });

  test("the initialise call carries the merchant account, Dhaka time and an encrypted, signed order", async () => {
    const fake = fakeNagad();
    await gatewayWith(fake).createPayment(order);
    const [init] = fake.of("initialize");
    assert.equal(init.body.accountNumber, settings.NAGAD_MERCHANT_NUMBER);
    // 08:30:15 UTC is 14:30:15 in Dhaka.
    assert.equal(init.body.dateTime, "20261007143015");
    assert.equal(init.opened.merchantId, settings.NAGAD_MERCHANT_ID);
    assert.equal(init.opened.orderId, "BPPAYABC123");
    assert.equal(init.opened.datetime, "20261007143015");
    assert.match(init.opened.challenge, /^[0-9a-f]{40}$/);
  });

  test("the completion call sends the amount in paisa-exact Taka, Nagad's challenge and our callback", async () => {
    const fake = fakeNagad();
    await gatewayWith(fake).createPayment(order);
    const [complete] = fake.of("complete");
    assert.deepEqual(complete.opened, { merchantId: settings.NAGAD_MERCHANT_ID, orderId: "BPPAYABC123", currencyCode: "050", amount: "2500.00", challenge: "4c7e8f2a" });
    assert.equal(complete.body.merchantCallbackURL, order.callbackURL);
    assert.equal(complete.body.additionalMerchantInfo.payerReference, order.payerReference);
  });

  test("every call carries Nagad's API version, the customer's address and the client type", async () => {
    const fake = fakeNagad();
    await gatewayWith(fake).createPayment(order);
    for (const call of fake.calls) {
      assert.equal(call.headers["x-km-api-version"], "v-0.2.0");
      assert.equal(call.headers["x-km-ip-v4"], "103.4.145.22");
      assert.equal(call.headers["x-km-client-type"], "PC_WEB");
      assert.equal(call.headers["content-type"], "application/json");
    }
  });

  test("an address that is not IPv4 is replaced, since Nagad only accepts IPv4", async () => {
    const fake = fakeNagad();
    await gatewayWith(fake).createPayment({ ...order, clientIp: "::1" });
    assert.equal(fake.calls[0].headers["x-km-ip-v4"], "127.0.0.1");
  });

  test("keys pasted with their PEM lines work too", async () => {
    const fake = fakeNagad();
    const env = {
      ...settings,
      NAGAD_PUBLIC_KEY: nagadKeys.publicKey.export({ type: "spki", format: "pem" }) as string,
      NAGAD_PRIVATE_KEY: merchantKeys.privateKey.export({ type: "pkcs8", format: "pem" }) as string,
    };
    const payment = await gatewayWith(fake, env).createPayment(order);
    assert.equal(payment.paymentId, "MDkxMjIwMjAxMTM5MDAx");
  });

  test("an answer whose signature is not Nagad's is not trusted", async () => {
    const fake = fakeNagad({ initialize: (call) => ({ body: nagadSeal({ paymentReferenceId: "forged", challenge: "x", acceptDateTime: call.body.dateTime }, true) }) });
    await assert.rejects(gatewayWith(fake).createPayment(order), (error: GatewayError) => error.code === "BAD_SIGNATURE");
  });

  test("Nagad's refusal is passed on in its own words", async () => {
    const fake = fakeNagad({ initialize: () => ({ body: { reason: "INVALID_MERCHANT", message: "Merchant is not active" } }) });
    await assert.rejects(gatewayWith(fake).createPayment(order), (error: GatewayError) => error.message === "Merchant is not active" && error.code === "INVALID_MERCHANT");
  });

  test("a completion that does not open the payment page is a refusal", async () => {
    const fake = fakeNagad({ complete: () => ({ body: { status: "Failed", message: "Amount exceeds the limit" } }) });
    await assert.rejects(gatewayWith(fake).createPayment(order), (error: GatewayError) => error.message === "Amount exceeds the limit");
  });

  test("when Nagad does not answer the customer is told so", async () => {
    const gateway = createNagadGateway({ env: settings, fetch: (async () => { throw new TypeError("fetch failed"); }) as typeof globalThis.fetch });
    await assert.rejects(gateway.createPayment(order), (error: GatewayError) => error.code === "NO_RESPONSE");
  });

  test("keys that cannot be read are reported, not thrown as a crash", async () => {
    const fake = fakeNagad();
    await assert.rejects(gatewayWith(fake, { ...settings, NAGAD_PRIVATE_KEY: "not-a-key" }).createPayment(order), (error: GatewayError) => error.code === "BAD_KEYS");
  });
});

describe("checking what became of a payment", () => {
  test("a payment Nagad verifies as successful is complete, with its transaction and the wallet that paid", async () => {
    const fake = fakeNagad();
    const state = await gatewayWith(fake).queryPayment("MDkxMjIwMjAxMTM5MDAx");
    assert.deepEqual(state, { paymentId: "MDkxMjIwMjAxMTM5MDAx", status: "Completed", trxId: "NGD7ZK2Q", amount: 2500, payerAccount: "01711222333" });
    assert.equal(fake.calls[0].method, "GET");
    assert.equal(fake.calls[0].path, "/remote-payment-gateway-1.0/api/dfs/verify/payment/MDkxMjIwMjAxMTM5MDAx");
  });

  test("a payment the customer abandoned is cancelled, and one Nagad has not settled is still open", async () => {
    const aborted = fakeNagad({ verify: () => ({ body: { status: "Aborted", statusCode: "009", paymentRefId: "p1" } }) });
    assert.equal((await gatewayWith(aborted).queryPayment("p1")).status, "Cancelled");
    const open = fakeNagad({ verify: () => ({ body: { status: "Ready", paymentRefId: "p2" } }) });
    assert.equal((await gatewayWith(open).queryPayment("p2")).status, "Initiated");
  });

  test("the money moves on Nagad's page, so completing a payment is the same check", async () => {
    const fake = fakeNagad();
    const state = await gatewayWith(fake).executePayment("MDkxMjIwMjAxMTM5MDAx");
    assert.equal(state.status, "Completed");
    assert.equal(fake.calls.length, 1);
  });
});
