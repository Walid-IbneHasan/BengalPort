<script lang="ts">
  import { page } from '$app/state';
  import DivisionContentEditor from '$lib/components/DivisionContentEditor.svelte';
  import { defaultAboutContent, defaultContactContent, defaultServicesContent } from '$lib/site-pages';

  const pages = {
    about: { title: 'About', fallback: defaultAboutContent, note: '' },
    services: { title: 'Services', fallback: defaultServicesContent, note: 'Each division keeps its own icon and link; its title, image and list of services are edited here.' },
    contact: {
      title: 'Contact',
      fallback: defaultContactContent,
      note: 'The phone number, email and office address shown on the Contact page are the ones in the site header and footer. Change them under Website content.',
    },
  };
  const slug = $derived(((page.params.page ?? '') in pages ? page.params.page : 'about') as keyof typeof pages);
</script>

<svelte:head><title>{pages[slug].title} Page — Bengal Port Admin</title></svelte:head>
<!-- Re-created when the sidebar switches between pages. -->
{#key slug}<DivisionContentEditor division={slug} fallback={pages[slug].fallback} note={pages[slug].note} lists />{/key}
