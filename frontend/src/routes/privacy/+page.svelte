<script lang="ts">
  import LegalPage from "$lib/components/LegalPage.svelte";
  import type { LegalContent } from "$lib/site-pages";

  let { data }: { data: { content: LegalContent } } = $props();
</script>

<svelte:head>
  <title>Privacy Policy — Bengal Port</title>
  <meta name="description" content="How Bengal Port collects, uses, shares and protects the information you give us." />
</svelte:head>

<LegalPage content={data.content} />
