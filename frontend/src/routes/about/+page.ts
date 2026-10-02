import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { defaultAboutContent, type AboutContent } from '$lib/site-pages';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => ({
  content: (await fetchData<{ content: AboutContent }>(fetch, `${apiUrl()}/content/about`))?.content ?? defaultAboutContent,
});
