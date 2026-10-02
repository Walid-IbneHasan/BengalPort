<script lang="ts">
  import DivisionPortal from '$lib/components/DivisionPortal.svelte';
  let { data } = $props();
</script>

<svelte:head><title>Global Education — Bengal Port</title><meta name="description" content={data.content.hero.description}/></svelte:head>
<DivisionPortal content={data.content} records={data.records} kind="education"/>
