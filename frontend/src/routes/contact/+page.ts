import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { defaultContactContent, type ContactContent } from '$lib/site-pages';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => ({
  content: (await fetchData<{ content: ContactContent }>(fetch, `${apiUrl()}/content/contact`))?.content ?? defaultContactContent,
});
