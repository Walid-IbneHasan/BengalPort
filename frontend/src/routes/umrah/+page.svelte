<script lang="ts">
  import UmrahPortal from "$lib/components/UmrahPortal.svelte";
  let { data } = $props();
</script>

<svelte:head>
  <title>Global Umrah — Bengal Port</title>
  <meta name="description" content={data.content.hero.description} />
</svelte:head>

<UmrahPortal content={data.content} reviews={data.reviews} />
