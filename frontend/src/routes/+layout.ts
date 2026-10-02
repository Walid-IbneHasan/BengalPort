import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import type { HomeContent } from '$lib/home-content';
import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ fetch }) => ({
  home: (await fetchData<{ content: HomeContent }>(fetch, `${apiUrl()}/content/home`))?.content,
});
