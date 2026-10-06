import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { healthcareContentFrom } from '$lib/division-content';
import type { PublicReview } from '$lib/reviews';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [page, records, reviews] = await Promise.all([
    fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/healthcare`),
    fetchData<any[]>(fetch, `${apiUrl()}/healthcare`),
    fetchData<PublicReview[]>(fetch, `${apiUrl()}/reviews?division=healthcare`),
  ]);
  // A page saved before the redesign still gets every section.
  return { content: healthcareContentFrom(page?.content), records: records ?? [], reviews: reviews ?? [] };
};
