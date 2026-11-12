import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { fillMissing } from '$lib/content-fields';
import { defaultPrivacyContent } from '$lib/site-pages';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => ({
  content: fillMissing(defaultPrivacyContent, (await fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/privacy`))?.content),
});
