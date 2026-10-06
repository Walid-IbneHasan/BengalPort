<script lang="ts">
  import HealthcarePortal from "$lib/components/HealthcarePortal.svelte";
  let { data } = $props();
</script>

<svelte:head>
  <title>Global Healthcare — Bengal Port</title>
  <meta name="description" content={data.content.hero.description} />
</svelte:head>

<HealthcarePortal content={data.content} records={data.records} reviews={data.reviews} />
