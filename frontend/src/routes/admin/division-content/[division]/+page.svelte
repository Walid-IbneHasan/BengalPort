<script lang="ts">
  import { page } from '$app/state';
  import DivisionContentEditor from '$lib/components/DivisionContentEditor.svelte';
  import { defaultEducationContent, defaultHealthcareContent, defaultUmrahContent } from '$lib/division-content';

  // The Education page's lists can grow and shrink.
  const pages = {
    education: {
      title: 'Education',
      fallback: defaultEducationContent,
      lists: true,
      note: 'The four options at the top of the page are Fields · medical, Fields · engineering, Fields · general and Reviews. The reviews themselves are written by customers and approved under Reviews in the menu; here you edit only the wording around them.',
    },
    healthcare: { title: 'Healthcare', fallback: defaultHealthcareContent, lists: false, note: '' },
    umrah: { title: 'Umrah', fallback: defaultUmrahContent, lists: false, note: '' },
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
    note={pages[division].note}
  />{/key}
