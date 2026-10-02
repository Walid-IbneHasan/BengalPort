import { apiUrl } from './config';
import { requestHeaders } from './request-headers';

export class ApiError extends Error {
  constructor(message: string, public code?: string, public details?: any, public status?: number) { super(message); }
}

function sessionToken(): string | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage.getItem('bp_token');
  } catch {
    return null;
  }
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiUrl()}${path}`, {
    ...options,
    headers: requestHeaders(options, sessionToken())
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
