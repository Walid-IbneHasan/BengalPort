<script lang="ts">
  import { onMount } from 'svelte';
  import { api } from '$lib/api';
  import DivisionPortal from '$lib/components/DivisionPortal.svelte';
  import { defaultUmrahContent, type DivisionContent } from '$lib/division-content';
  
  let content: DivisionContent = structuredClone(defaultUmrahContent),
      records: any[] = [],
      loading = true;
      
  onMount(async () => {
    try {
      const page = await api<{content:DivisionContent}>('/content/umrah');
      content = page.content;
    } catch {} finally {
      loading = false;
    }
  });
</script>

<svelte:head>
  <title>Global Umrah — Bengal Port</title>
  <meta name="description" content={content.hero.description}/>
</svelte:head>

<DivisionPortal {content} {records} {loading} kind="umrah"/>
