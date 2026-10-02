import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => ({
  items: await fetchData<any[]>(fetch, `${apiUrl()}/opportunities`),
});
