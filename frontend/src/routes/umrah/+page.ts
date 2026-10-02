import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { defaultUmrahContent, type DivisionContent } from '$lib/division-content';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const page = await fetchData<{ content: DivisionContent }>(fetch, `${apiUrl()}/content/umrah`);
  return { content: page?.content ?? defaultUmrahContent };
};
