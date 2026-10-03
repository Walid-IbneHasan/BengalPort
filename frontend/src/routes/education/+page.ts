import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { fillMissing } from '$lib/content-fields';
import { defaultEducationContent } from '$lib/division-content';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
  const [page, records] = await Promise.all([
    fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/education`),
    fetchData<any[]>(fetch, `${apiUrl()}/education`),
  ]);
  // A page saved before the four options existed still gets them.
  return { content: fillMissing(defaultEducationContent, page?.content), records: records ?? [] };
};
