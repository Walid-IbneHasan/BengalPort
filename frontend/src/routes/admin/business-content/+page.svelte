<script lang="ts">
  import DivisionContentEditor from "$lib/components/DivisionContentEditor.svelte";
  import { businessContentFrom, defaultBusinessContent } from "$lib/business-content";
</script>

<svelte:head><title>Business Content — Bengal Port Admin</title></svelte:head>
<DivisionContentEditor
  division="business"
  fallback={defaultBusinessContent}
  prepare={businessContentFrom}
  lists
  note="Hero · markets are the places the map at the top of the page draws trade routes to; keep them country names, such as Bangladesh, China or Turkey; Bangladesh lights the home beacon instead of drawing a route. Hero · categories are the product chips that drift around the title. Services · phones show only the first, third and sixth tiles; larger screens show all six."
/>
