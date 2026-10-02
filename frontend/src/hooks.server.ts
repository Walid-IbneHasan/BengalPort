import type { Handle } from '@sveltejs/kit';
import { apiUrl } from '$lib/config';
import { allowApiOrigin, securityHeaders } from '$lib/security-headers';

export const handle: Handle = async ({ event, resolve }) => {
  const response = await resolve(event);
  for (const [name, value] of Object.entries(securityHeaders({ https: event.url.protocol === 'https:' })))
    response.headers.set(name, value);
  const policy = response.headers.get('content-security-policy');
  if (policy) response.headers.set('content-security-policy', allowApiOrigin(policy, apiUrl(), event.url.origin));
  return response;
};
