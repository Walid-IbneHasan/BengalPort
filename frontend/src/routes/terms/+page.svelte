<script lang="ts">
  import LegalPage from "$lib/components/LegalPage.svelte";
  import type { LegalContent } from "$lib/site-pages";

  let { data }: { data: { content: LegalContent } } = $props();
</script>

<svelte:head>
  <title>Terms of Use — Bengal Port</title>
  <meta name="description" content="The terms that apply when you use the Bengal Port website and services." />
</svelte:head>

<LegalPage content={data.content} />
