<script lang="ts">
  import DivisionPortal from '$lib/components/DivisionPortal.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>Global Umrah — Bengal Port</title>
  <meta name="description" content={data.content.hero.description}/>
</svelte:head>

<DivisionPortal content={data.content} records={[]} reviews={data.reviews} kind="umrah"/>
