import { error } from '@sveltejs/kit';
import { apiUrl } from '$lib/config';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch, params }) => {
  const unavailable = 'Opportunities are temporarily unavailable. Please try again shortly.';
  let response: Response;
  try {
    response = await fetch(`${apiUrl()}/opportunities/${encodeURIComponent(params.slug)}`);
  } catch {
    error(503, unavailable);
  }
  if (response.status === 404) error(404, 'This opportunity is no longer available.');
  if (!response.ok) error(503, unavailable);
  return { opportunity: (await response.json()).data };
};
