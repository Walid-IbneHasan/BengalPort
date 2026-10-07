import { derived } from 'svelte/store';
import { page } from '$app/stores';
import { defaultHomeContent, homeContentFrom, type HomeContent } from './home-content';

// Homepage, header and footer content. The root layout loads it for every
// page; the built-in content is used when the API cannot be reached.
export const cmsContent = derived(
  page,
  ($page) => ($page.data.home ? homeContentFrom($page.data.home as HomeContent) : defaultHomeContent),
);
