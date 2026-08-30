const API = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/api';

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options?.headers || {})
    }
  });

  const text = await response.text();
  let body: any = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(body?.error?.message || body?.message || 'Request failed');
  }

  return (body?.data ?? undefined) as T;
}
