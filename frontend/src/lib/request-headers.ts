// Only the headers a request needs: a GET with no custom headers skips the
// browser's CORS preflight round trip.
export function requestHeaders(
  options: RequestInit | undefined,
  token: string | null,
): Record<string, string> {
  return {
    ...(options?.body ? { "content-type": "application/json" } : {}),
    // Signed-in visitors send their token with every request, so enquiries and
    // applications they submit are linked to their account.
    ...(token ? { authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };
}
