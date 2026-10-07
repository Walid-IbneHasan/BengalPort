// Client for Nagad's merchant Payment Gateway.
//
// The flow: createPayment() initialises the order with Nagad, completes the
// checkout with the amount, and returns Nagad's payment page; the customer
// pays there with their wallet PIN and is sent back to our callback. The
// money moves on Nagad's page, so there is no separate execute step:
// executePayment() and queryPayment() both verify the payment with Nagad,
// and only that verification counts. Refunds are made in Nagad's merchant
// portal and recorded on the site by staff.
//
// Every request to Nagad carries the order encrypted with Nagad's public key
// and signed with the merchant's private key; Nagad answers the same way,
// encrypted for the merchant and signed by Nagad.
//
// Settings: NAGAD_MERCHANT_ID, NAGAD_MERCHANT_NUMBER (the merchant wallet),
// NAGAD_PUBLIC_KEY (Nagad's key, as issued), NAGAD_PRIVATE_KEY (the merchant's
// key, as issued), and NAGAD_BASE_URL (the sandbox when unset; Nagad supplies
// the live address with the live credentials).
import { constants, createPrivateKey, createPublicKey, privateDecrypt, publicEncrypt, randomBytes, sign, verify, type KeyObject } from "node:crypto";
import { GatewayError, type Gateway, type GatewayStatus } from "./gateway.js";

const SANDBOX = "http://sandbox.mynagad.com:10080/remote-payment-gateway-1.0/api/dfs";
const API_VERSION = "v-0.2.0";
// Nagad's currency code for Taka.
const BDT = "050";
const outcomes: Record<string, string> = { Success: "Completed", Aborted: "Cancelled", Cancelled: "Cancelled", Failed: "Failed", Fail: "Failed" };

// Nagad issues keys as base64 without PEM lines; keys pasted with the lines
// are accepted too.
function pem(key: string, type: "PUBLIC KEY" | "PRIVATE KEY") {
  if (key.includes("-----BEGIN")) return key;
  const body = key.replace(/\s+/g, "").match(/.{1,64}/g)?.join("\n") ?? "";
  return `-----BEGIN ${type}-----\n${body}\n-----END ${type}-----`;
}
const isIPv4 = (value: string | undefined): value is string => /^\d{1,3}(\.\d{1,3}){3}$/.test(value ?? "");

export function createNagadGateway(options: {
  env?: NodeJS.ProcessEnv;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
  timeoutMs?: number;
} = {}): Gateway {
  const env = options.env ?? process.env;
  const request = options.fetch ?? globalThis.fetch;
  const now = options.now ?? Date.now;
  const timeoutMs = options.timeoutMs ?? 30_000;
  const base = (env.NAGAD_BASE_URL || SANDBOX).replace(/\/+$/, "");
  const { NAGAD_MERCHANT_ID: merchantId, NAGAD_MERCHANT_NUMBER: merchantNumber, NAGAD_PUBLIC_KEY: nagadKey, NAGAD_PRIVATE_KEY: merchantKey } = env;
  const configured = Boolean(merchantId && merchantNumber && nagadKey && merchantKey);

  let keys: { nagad: KeyObject; merchant: KeyObject } | null = null;
  function loadKeys() {
    if (keys) return keys;
    try {
      keys = { nagad: createPublicKey(pem(nagadKey!, "PUBLIC KEY")), merchant: createPrivateKey(pem(merchantKey!, "PRIVATE KEY")) };
      return keys;
    } catch {
      throw new GatewayError("The Nagad keys could not be read; check NAGAD_PUBLIC_KEY and NAGAD_PRIVATE_KEY", "BAD_KEYS");
    }
  }
  // The order, encrypted for Nagad and signed by the merchant.
  function seal(payload: unknown) {
    const { nagad, merchant } = loadKeys();
    const plain = Buffer.from(JSON.stringify(payload));
    return {
      sensitiveData: publicEncrypt({ key: nagad, padding: constants.RSA_PKCS1_PADDING }, plain).toString("base64"),
      signature: sign("sha256", plain, merchant).toString("base64"),
    };
  }
  // Nagad's answer, opened with the merchant key and checked against Nagad's signature.
  function open(data: Record<string, any>): Record<string, any> {
    const { nagad, merchant } = loadKeys();
    let plain: Buffer;
    try {
      plain = privateDecrypt({ key: merchant, padding: constants.RSA_PKCS1_PADDING }, Buffer.from(String(data.sensitiveData), "base64"));
    } catch {
      throw new GatewayError("Nagad's answer could not be read", "BAD_ANSWER");
    }
    if (data.signature && !verify("sha256", plain, nagad, Buffer.from(String(data.signature), "base64")))
      throw new GatewayError("Nagad's answer failed its signature check", "BAD_SIGNATURE");
    try {
      return JSON.parse(plain.toString("utf8"));
    } catch {
      throw new GatewayError("Nagad's answer could not be read", "BAD_ANSWER");
    }
  }
  // Nagad wants the merchant's local time, yyyyMMddHHmmss; Bangladesh is UTC+6 all year.
  function stamp() {
    const dhaka = new Date(now() + 6 * 3_600_000);
    const two = (value: number) => String(value).padStart(2, "0");
    return `${dhaka.getUTCFullYear()}${two(dhaka.getUTCMonth() + 1)}${two(dhaka.getUTCDate())}${two(dhaka.getUTCHours())}${two(dhaka.getUTCMinutes())}${two(dhaka.getUTCSeconds())}`;
  }

  async function send(method: "GET" | "POST", path: string, body: unknown, clientIp?: string) {
    if (!configured) throw new GatewayError("Online payment is not configured", "NOT_CONFIGURED");
    let response: Response;
    try {
      response = await request(`${base}${path}`, {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-KM-Api-Version": API_VERSION,
          "X-KM-IP-V4": isIPv4(clientIp) ? clientIp : "127.0.0.1",
          "X-KM-Client-Type": "PC_WEB",
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new GatewayError("Nagad did not respond", "NO_RESPONSE");
    }
    const data = (await response.json().catch(() => ({}))) as Record<string, any>;
    return { status: response.status, ok: response.ok, data };
  }
  const refusal = (reply: { status: number; data: Record<string, any> }, fallback: string) =>
    new GatewayError(
      reply.data.message || reply.data.devMessage || reply.data.reason || `${fallback} (HTTP ${reply.status})`,
      reply.data.reason ?? reply.data.statusCode ?? String(reply.status),
    );

  const state = (data: Record<string, any>, paymentId: string): GatewayStatus => ({
    paymentId: data.paymentRefId ?? data.paymentReferenceId ?? paymentId,
    status: outcomes[String(data.status)] ?? "Initiated",
    trxId: data.issuerPaymentRefNo ?? null,
    amount: data.amount == null || data.amount === "" ? null : Number(data.amount),
    payerAccount: data.clientMobileNo ?? null,
  });

  async function verifyPayment(paymentId: string): Promise<GatewayStatus> {
    const reply = await send("GET", `/verify/payment/${encodeURIComponent(paymentId)}`, undefined);
    if (!reply.ok || !reply.data.status) throw refusal(reply, "Nagad could not report the payment");
    return state(reply.data, paymentId);
  }

  const unsupported = () => Promise.reject(new GatewayError("Nagad refunds are made in the Nagad merchant portal and recorded here by staff", "NOT_SUPPORTED"));

  return {
    configured,
    refunds: false,
    async createPayment(order) {
      if (!configured) throw new GatewayError("Online payment is not configured", "NOT_CONFIGURED");
      const datetime = stamp();
      const first = await send(
        "POST",
        `/check-out/initialize/${encodeURIComponent(merchantId!)}/${encodeURIComponent(order.invoice)}`,
        { accountNumber: merchantNumber, dateTime: datetime, ...seal({ merchantId, datetime, orderId: order.invoice, challenge: randomBytes(20).toString("hex") }) },
        order.clientIp,
      );
      if (!first.ok || !first.data.sensitiveData) throw refusal(first, "Nagad could not start the payment");
      const opened = open(first.data);
      if (!opened.paymentReferenceId || !opened.challenge) throw new GatewayError("Nagad returned an incomplete payment", "INCOMPLETE");
      const second = await send(
        "POST",
        `/check-out/complete/${encodeURIComponent(opened.paymentReferenceId)}`,
        {
          ...seal({ merchantId, orderId: order.invoice, currencyCode: BDT, amount: order.amount.toFixed(2), challenge: opened.challenge }),
          merchantCallbackURL: order.callbackURL,
          additionalMerchantInfo: { payerReference: order.payerReference },
        },
        order.clientIp,
      );
      if (!second.ok || second.data.status !== "Success" || !second.data.callBackUrl) throw refusal(second, "Nagad could not open the payment page");
      return { paymentId: opened.paymentReferenceId, redirectUrl: second.data.callBackUrl, signature: null };
    },
    executePayment: verifyPayment,
    queryPayment: verifyPayment,
    refundPayment: unsupported,
    refundStatus: unsupported,
  };
}
