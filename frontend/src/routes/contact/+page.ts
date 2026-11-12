import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { fillMissing } from '$lib/content-fields';
import { defaultContactContent } from '$lib/site-pages';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => ({
  // A page saved before a text was added still gets that text.
  content: fillMissing(defaultContactContent, (await fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/contact`))?.content),
});
