<script lang="ts">
  import BusinessPortal from "$lib/components/BusinessPortal.svelte";
  let { data } = $props();
</script>

<svelte:head>
  <title>Global Business — Bengal Port</title>
  <meta name="description" content={data.content.hero.description} />
</svelte:head>

<BusinessPortal
  content={data.content}
  partners={data.partners}
  partnersUnavailable={data.partnersUnavailable}
  reviews={data.reviews}
/>
