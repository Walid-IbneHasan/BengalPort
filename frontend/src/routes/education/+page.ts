import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { fillMissing } from '$lib/content-fields';
import { defaultEducationContent } from '$lib/division-content';
import type { PublicReview } from '$lib/reviews';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [page, records, reviews] = await Promise.all([
    fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/education`),
    fetchData<any[]>(fetch, `${apiUrl()}/education`),
    fetchData<PublicReview[]>(fetch, `${apiUrl()}/reviews?division=education`),
  ]);
  // A page saved before the four options existed still gets them.
  return { content: fillMissing(defaultEducationContent, page?.content), records: records ?? [], reviews: reviews ?? [] };
};
