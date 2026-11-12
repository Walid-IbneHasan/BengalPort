import { apiUrl } from '$lib/config';
import { fetchData } from '$lib/fetch-data';
import { fillMissing } from '$lib/content-fields';
import { defaultOpportunitiesContent } from '$lib/site-pages';
import type { PageLoad } from './$types';

// Shown when the list of categories cannot be reached.
const builtInCategories = [
  { value: 'BUSINESS', label: 'Business' },
  { value: 'EDUCATION', label: 'Education' },
  { value: 'HEALTHCARE', label: 'Healthcare' },
  { value: 'UMRAH', label: 'Umrah' },
  { value: 'FACTORY_VISIT', label: 'Factory visit' },
  { value: 'BUSINESS_TOUR', label: 'Business tour' },
  { value: 'SCHOLARSHIP', label: 'Scholarship' },
  { value: 'EVENT', label: 'Event' },
];

export const load: PageLoad = async ({ fetch }) => {
  const [items, categories, page] = await Promise.all([
    fetchData<any[]>(fetch, `${apiUrl()}/opportunities`),
    fetchData<Array<{ value: string; label: string }>>(fetch, `${apiUrl()}/opportunities/categories`),
    fetchData<{ content: unknown }>(fetch, `${apiUrl()}/content/opportunities`),
  ]);
  return {
    items,
    categories: categories ?? builtInCategories,
    content: fillMissing(defaultOpportunitiesContent, page?.content),
  };
};
