import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { umrahContentFrom } from '$lib/division-content';
import type { PublicReview } from '$lib/reviews';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [page, reviews] = await Promise.all([
    fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/umrah`),
    fetchData<PublicReview[]>(fetch, `${apiUrl()}/reviews?division=umrah`),
  ]);
  // A page saved before the redesign still gets every section.
  return { content: umrahContentFrom(page?.content), reviews: reviews ?? [] };
};
