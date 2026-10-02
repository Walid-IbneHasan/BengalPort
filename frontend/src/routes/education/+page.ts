import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { defaultEducationContent, type DivisionContent } from '$lib/division-content';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [page, records] = await Promise.all([
    fetchData<{ content: DivisionContent }>(fetch, `${apiUrl()}/content/education`),
    fetchData<any[]>(fetch, `${apiUrl()}/education`),
  ]);
  return { content: page?.content ?? defaultEducationContent, records: records ?? [] };
};
