import { apiUrl } from './config';
import { requestHeaders } from './request-headers';
import type { PageMeta } from './pagination';

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

async function request(path: string, options?: RequestInit): Promise<any> {
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

  return body;
}

export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  return ((await request(path, options))?.data ?? undefined) as T;
}

// For paged lists: the rows together with { total, page, pageSize }.
export async function apiPage<T>(path: string, options?: RequestInit): Promise<{ rows: T[]; meta: PageMeta }> {
  const body = await request(path, options);
  return { rows: body?.data ?? [], meta: body?.meta ?? { total: body?.data?.length ?? 0, page: 1, pageSize: body?.data?.length || 1 } };
}
