<script lang="ts">
  import { page } from '$app/state';
  import DivisionContentEditor from '$lib/components/DivisionContentEditor.svelte';
  import { defaultEducationContent, defaultHealthcareContent, defaultUmrahContent } from '$lib/division-content';

  // The Education page's lists can grow and shrink, and its student reviews
  // start empty.
  const pages = {
    education: {
      title: 'Education',
      fallback: defaultEducationContent,
      lists: true,
      examples: { 'reviews.items': { name: '', detail: '', quote: '' } },
      note: 'The four options at the top of the page are Fields · medical, Fields · engineering, Fields · general and Reviews. Reviews · items are the student reviews: add each student\'s name, a detail such as their programme and country, and their own words.',
    },
    healthcare: { title: 'Healthcare', fallback: defaultHealthcareContent, lists: false, examples: {}, note: '' },
    umrah: { title: 'Umrah', fallback: defaultUmrahContent, lists: false, examples: {}, note: '' },
  };
  const division = $derived(
    ((page.params.division ?? '') in pages ? page.params.division : 'education') as keyof typeof pages,
  );
</script>

<svelte:head><title>{pages[division].title} Content — Bengal Port Admin</title></svelte:head>
<!-- Re-created when the sidebar switches between division pages. -->
{#key division}<DivisionContentEditor
    {division}
    fallback={pages[division].fallback}
    lists={pages[division].lists}
    examples={pages[division].examples}
    note={pages[division].note}
  />{/key}
