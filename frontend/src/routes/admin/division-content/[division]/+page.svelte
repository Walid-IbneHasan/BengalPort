<script lang="ts">
  import { page } from '$app/state';
  import DivisionContentEditor from '$lib/components/DivisionContentEditor.svelte';
  import { defaultEducationContent, defaultHealthcareContent, defaultUmrahContent } from '$lib/division-content';

  const pages = {
    education: { title: 'Education', fallback: defaultEducationContent },
    healthcare: { title: 'Healthcare', fallback: defaultHealthcareContent },
    umrah: { title: 'Umrah', fallback: defaultUmrahContent },
  };
  const division = $derived(
    ((page.params.division ?? '') in pages ? page.params.division : 'education') as keyof typeof pages,
  );
</script>

<svelte:head><title>{pages[division].title} Content — Bengal Port Admin</title></svelte:head>
<!-- Re-created when the sidebar switches between division pages. -->
{#key division}<DivisionContentEditor {division} fallback={pages[division].fallback} />{/key}
