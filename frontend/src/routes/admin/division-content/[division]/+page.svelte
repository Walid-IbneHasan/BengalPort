<script lang="ts">
  import { page } from '$app/state';
  import DivisionContentEditor from '$lib/components/DivisionContentEditor.svelte';
  import {
    defaultEducationContent,
    defaultHealthcareContent,
    defaultUmrahContent,
    healthcareContentFrom,
    umrahContentFrom,
  } from '$lib/division-content';

  // The Education page's lists can grow and shrink.
  // `prepare` reads a saved page the way its public page does; without it the
  // editor fills whatever the saved page lacks from the fallback.
  type Page = { title: string; fallback: Record<string, any>; lists: boolean; note: string; prepare?: (saved: unknown) => Record<string, any> };
  const pages: Record<"education" | "healthcare" | "umrah", Page> = {
    education: {
      title: 'Education',
      fallback: defaultEducationContent,
      lists: true,
      note: 'The four options at the top of the page are Fields · medical, Fields · engineering, Fields · general and Reviews. The reviews themselves are written by customers and approved under Reviews in the menu; here you edit only the wording around them.',
    },
    healthcare: {
      title: 'Healthcare',
      fallback: defaultHealthcareContent,
      prepare: healthcareContentFrom,
      lists: true,
      note: 'Hero · specialties are the words that take turns in the title; Hero · pathway is the three-step line under it and keeps exactly three steps. Hero · cities are the destination chips shown when the hospital directory is empty.',
    },
    umrah: {
      title: 'Umrah',
      fallback: defaultUmrahContent,
      prepare: umrahContentFrom,
      lists: true,
      note: 'Hero · journeys are the words that take turns in the title. Hero · departures are the next group dates (year-month-day, three at most; past dates are hidden on the page). The package with a tag, such as Most chosen, is shown highlighted; leave the others blank. The journey keeps exactly four stages.',
    },
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
    prepare={pages[division].prepare}
    lists={pages[division].lists}
    note={pages[division].note}
  />{/key}
