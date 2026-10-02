// Response headers the website adds to every page. The content security policy
// itself is declared in svelte.config.js; the API's address is only known when
// the site starts, so it is added to that policy here.

const origin = (address: string) => {
  try {
    return new URL(address).origin;
  } catch {
    return null;
  }
};

// The site calls the API and shows the images it serves.
export function allowApiOrigin(policy: string, apiUrl: string, siteOrigin: string): string {
  const api = origin(apiUrl);
  if (!api || api === origin(siteOrigin)) return policy;
  return policy
    .split(";")
    .map((directive) => (/^\s*(connect-src|img-src)\s/.test(directive) ? `${directive.trimEnd()} ${api}` : directive))
    .join(";");
}

export function securityHeaders(options: { https: boolean }): Record<string, string> {
  return {
    "x-frame-options": "DENY",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    // Google's sign-in opens a window that has to message the page back.
    "cross-origin-opener-policy": "same-origin-allow-popups",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    // Only this address is pinned to HTTPS, not every subdomain beside it.
    ...(options.https ? { "strict-transport-security": "max-age=31536000" } : {}),
  };
}
