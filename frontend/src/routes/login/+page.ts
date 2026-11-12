import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { fillMissing } from '$lib/content-fields';
import { defaultLoginContent } from '$lib/site-pages';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => ({
  content: fillMissing(defaultLoginContent, (await fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/login`))?.content),
});
