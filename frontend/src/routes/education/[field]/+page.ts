import { error } from '@sveltejs/kit';
import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { fillMissing } from '$lib/content-fields';
import { defaultEducationContent } from '$lib/division-content';
import type { PublicReview } from '$lib/reviews';
import type { PageLoad } from './$types';

// The Education page's four options each have a page of their own:
// /education/medical, /engineering, /general and /reviews.
const fields = ['medical', 'engineering', 'general', 'reviews'] as const;
export type FieldPage = (typeof fields)[number];

export const load: PageLoad = async ({ fetch, params }) => {
  const field = params.field as FieldPage;
  if (!fields.includes(field)) error(404, 'Page not found');
  const [page, records, reviews] = await Promise.all([
    fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/education`),
    field === 'reviews' ? Promise.resolve([]) : fetchData<any[]>(fetch, `${apiUrl()}/education`),
    fetchData<PublicReview[]>(fetch, `${apiUrl()}/reviews?division=education`),
  ]);
  return { field, content: fillMissing(defaultEducationContent, page?.content), records: records ?? [], reviews: reviews ?? [] };
};
