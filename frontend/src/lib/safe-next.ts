// Where to go after signing in. The address comes from the link that led to
// the sign-in page, so anyone can write it: only a path on this site counts.
const SITE = "https://site.invalid";

export function afterLogin(next: string | null, role: string): string {
  const home = role === "ADMIN" ? "/admin" : "/dashboard";
  if (!next || !next.startsWith("/") || /[\s\\\u0000-\u001f]/.test(next)) return home;
  let target: URL;
  try {
    target = new URL(next, SITE);
  } catch {
    return home;
  }
  if (target.origin !== SITE || target.pathname === "/login") return home;
  if (target.pathname.startsWith("/admin") && role !== "ADMIN") return home;
  return target.pathname + target.search;
}
