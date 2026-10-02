import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { defaultHealthcareContent, type DivisionContent } from '$lib/division-content';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [page, records] = await Promise.all([
    fetchData<{ content: DivisionContent }>(fetch, `${apiUrl()}/content/healthcare`),
    fetchData<any[]>(fetch, `${apiUrl()}/healthcare`),
  ]);
  return { content: page?.content ?? defaultHealthcareContent, records: records ?? [] };
};
