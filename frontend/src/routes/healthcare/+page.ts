import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { defaultHealthcareContent, type DivisionContent } from '$lib/division-content';
import type { PublicReview } from '$lib/reviews';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [page, records, reviews] = await Promise.all([
    fetchData<{ content: DivisionContent }>(fetch, `${apiUrl()}/content/healthcare`),
    fetchData<any[]>(fetch, `${apiUrl()}/healthcare`),
    fetchData<PublicReview[]>(fetch, `${apiUrl()}/reviews?division=healthcare`),
  ]);
  return { content: page?.content ?? defaultHealthcareContent, records: records ?? [], reviews: reviews ?? [] };
};
