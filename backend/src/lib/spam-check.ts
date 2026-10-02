// Cloudflare Turnstile on the public forms. It is switched on by setting
// TURNSTILE_SITE_KEY and TURNSTILE_SECRET_KEY; without both, every visitor
// passes and the forms rely on their rate limits alone.

export type SpamCheck = {
  // The key the website shows the check with, or null while it is off.
  siteKey: string | null;
  passed(token: string | undefined, ip?: string): Promise<boolean>;
};

type Options = { env?: Record<string, string | undefined>; fetch?: typeof fetch; timeoutMs?: number; warn?: (message: string) => void };

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function createSpamCheck(options: Options = {}): SpamCheck {
  const env = options.env ?? process.env;
  const request = options.fetch ?? fetch;
  const secret = env.TURNSTILE_SECRET_KEY?.trim();
  const siteKey = (secret && env.TURNSTILE_SITE_KEY?.trim()) || null;
  return {
    siteKey,
    async passed(token, ip) {
      if (!siteKey || !secret) return true;
      if (!token) return false;
      try {
        const response = await request(VERIFY_URL, {
          method: "POST",
          headers: { "content-type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }).toString(),
          signal: AbortSignal.timeout(options.timeoutMs ?? 5000),
        });
        return (await response.json())?.success === true;
      } catch (error) {
        // Cloudflare being unreachable must not stop customers from getting
        // in touch; the rate limits still apply.
        options.warn?.(`The Turnstile check could not be reached: ${error instanceof Error ? error.message : error}`);
        return true;
      }
    },
  };
}
