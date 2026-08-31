const API = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(message: string, public code?: string, public details?: any, public status?: number) { super(message); }
}

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
    throw new ApiError(body?.error?.message || body?.message || 'Request failed', body?.error?.code, body?.error?.details, response.status);
  }

  return (body?.data ?? undefined) as T;
}
