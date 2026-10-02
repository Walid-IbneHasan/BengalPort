// Loads the `data` of an API response for a page's load function. Any failure
// (API down, slow, erroring, or refusing this site's origin) gives null so the
// page can render its built-in content instead of an error. The failure is
// logged, because a page quietly showing fallback content is easy to miss.
export async function fetchData<T>(
  fetch: typeof globalThis.fetch,
  url: string,
  timeoutMs = 5000,
): Promise<T | null> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return ((await response.json()).data ?? null) as T | null;
  } catch (error) {
    console.warn(`Could not load ${url}: ${error instanceof Error ? error.message : error}`);
    return null;
  }
}
