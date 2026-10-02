import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { defaultServicesContent, type ServicesContent } from '$lib/site-pages';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => ({
  content: (await fetchData<{ content: ServicesContent }>(fetch, `${apiUrl()}/content/services`))?.content ?? defaultServicesContent,
});
