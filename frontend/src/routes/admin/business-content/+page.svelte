<script lang="ts">
  import DivisionContentEditor from "$lib/components/DivisionContentEditor.svelte";
  import { defaultBusinessContent } from "$lib/business-content";
</script>

<svelte:head><title>Business Content — Bengal Port Admin</title></svelte:head>
<DivisionContentEditor
  division="business"
  fallback={defaultBusinessContent}
  lists
  note="Hero · markets are the places the map at the top of the page draws trade routes to; keep them country names, such as China or Turkey. Hero · categories are the product chips that drift around the title."
/>
