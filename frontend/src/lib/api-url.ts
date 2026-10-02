// Where the website finds the API. PUBLIC_API_URL sets it. Without it, a
// developer's machine uses the API running locally; a published site uses
// /api on its own address. A published site must never fall back to
// localhost: that is the visitor's own computer, and browsers then ask the
// visitor for permission to reach their local network.
export function resolveApiUrl(configured: string | undefined, options: { dev: boolean }): string {
  const value = (configured ?? "").trim().replace(/\/+$/, "");
  if (value) return value;
  return options.dev ? "http://localhost:4000/api" : "/api";
}
