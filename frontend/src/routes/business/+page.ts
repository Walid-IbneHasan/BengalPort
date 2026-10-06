import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { businessContentFrom } from '$lib/business-content';
import type { Partner } from '$lib/partners';
import type { PublicReview } from '$lib/reviews';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [page, suppliers, factories, reviews] = await Promise.all([
    fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/business`),
    fetchData<any[]>(fetch, `${apiUrl()}/suppliers`),
    fetchData<any[]>(fetch, `${apiUrl()}/factories`),
    fetchData<PublicReview[]>(fetch, `${apiUrl()}/reviews?division=business`),
  ]);
  const partners: Partner[] = [
    ...(suppliers ?? []).map((item) => ({ ...item, kind: 'Supplier' as const })),
    ...(factories ?? []).map((item) => ({ ...item, kind: 'Factory' as const })),
  ];
  return {
    // A page saved before the redesign still gets every section.
    content: businessContentFrom(page?.content),
    partners,
    partnersUnavailable: !suppliers || !factories,
    reviews: reviews ?? [],
  };
};
