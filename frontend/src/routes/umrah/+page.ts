import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { defaultUmrahContent, type DivisionContent } from '$lib/division-content';
import type { PublicReview } from '$lib/reviews';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [page, reviews] = await Promise.all([
    fetchData<{ content: DivisionContent }>(fetch, `${apiUrl()}/content/umrah`),
    fetchData<PublicReview[]>(fetch, `${apiUrl()}/reviews?division=umrah`),
  ]);
  return { content: page?.content ?? defaultUmrahContent, reviews: reviews ?? [] };
};
