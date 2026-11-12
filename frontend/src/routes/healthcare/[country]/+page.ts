import { error } from '@sveltejs/kit';
import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { healthcareContentFrom } from '$lib/division-content';
import { destinations, hospitalsIn } from '$lib/healthcare-places';
import type { PageLoad } from './$types';

// One destination of the Healthcare page: only the hospitals and services
// Bengal Port arranges in that country.
export const load: PageLoad = async ({ fetch, params }) => {
  const [page, records] = await Promise.all([
    fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/healthcare`),
    fetchData<any[]>(fetch, `${apiUrl()}/healthcare`),
  ]);
  const content = healthcareContentFrom(page?.content);
  const hospitals = records ?? [];
  const places = destinations(hospitals, content.hero.cities);
  const land = places.find((place) => place.slug === params.country);
  if (!land) error(404, 'Page not found');
  return { content, land, places, hospitals: hospitalsIn(hospitals, land.slug) };
};
