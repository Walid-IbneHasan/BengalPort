import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { defaultBusinessContent, type BusinessContent } from '$lib/business-content';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [page, suppliers, factories] = await Promise.all([
    fetchData<{ content: BusinessContent }>(fetch, `${apiUrl()}/content/business`),
    fetchData<any[]>(fetch, `${apiUrl()}/suppliers`),
    fetchData<any[]>(fetch, `${apiUrl()}/factories`),
  ]);
  return {
    content: page?.content ?? defaultBusinessContent,
    // Featured partners first, six at most.
    partners: [
      ...(suppliers ?? []).map((item) => ({ ...item, kind: 'Supplier' })),
      ...(factories ?? []).map((item) => ({ ...item, kind: 'Factory' })),
    ]
      .sort((a, b) => Number(b.featured) - Number(a.featured))
      .slice(0, 6),
    partnersUnavailable: !suppliers || !factories,
  };
};
