<script lang="ts">
  import EducationPortal from '$lib/components/EducationPortal.svelte';
  let { data } = $props();
</script>

<svelte:head><title>Global Education — Bengal Port</title><meta name="description" content={data.content.hero.description}/></svelte:head>
<EducationPortal content={data.content} records={data.records}/>
