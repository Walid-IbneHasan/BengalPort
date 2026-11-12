import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { fillMissing } from '$lib/content-fields';
import { defaultPayContent } from '$lib/site-pages';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => ({
  content: fillMissing(defaultPayContent, (await fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/pay`))?.content),
});
