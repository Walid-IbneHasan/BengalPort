import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { defaultServicesContent, type ServicesContent } from '$lib/site-pages';
import type { PageLoad } from './$types';

// Until October 2026 the service cards reused the home hero's pictures; a
// saved page that still names them gets each card's own picture instead.
function servicesContentFrom(saved: ServicesContent | undefined): ServicesContent {
  const content = structuredClone(saved ?? defaultServicesContent);
  for (const key of Object.keys(content.groups) as Array<keyof ServicesContent["groups"]>) {
    if (content.groups[key].image === `/images/global-${key}.webp`) content.groups[key].image = defaultServicesContent.groups[key].image;
  }
  return content;
}

export const load: PageLoad = async ({ fetch }) => ({
  content: servicesContentFrom((await fetchData<{ content: ServicesContent }>(fetch, `${apiUrl()}/content/services`))?.content),
});
