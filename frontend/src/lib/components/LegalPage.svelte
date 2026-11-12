<script lang="ts">
  import { cmsContent } from "$lib/cms";
  import { legalBlocks, type Inline } from "$lib/legal-text";
  import type { LegalContent } from "$lib/site-pages";

  let { content }: { content: LegalContent } = $props();
  let values = $derived({ email: $cmsContent.utility.email, address: $cmsContent.footer.address });
</script>

{#snippet line(parts: Inline[])}{#each parts as part}{#if part.kind === "bold"}<b>{part.text}</b>{:else if part.kind === "link"}<a href={part.href}>{part.text}</a>{:else}{part.text}{/if}{/each}{/snippet}

<section class="page-hero legal-hero">
  <div class="wrap">
    <span class="eyebrow">{content.eyebrow}</span>
    <h1>{content.title}</h1>
    <p>{content.updatedLabel} {content.updated}</p>
  </div>
</section>
<section class="section legal">
  <div class="wrap">
    {#each content.sections as section}
      <h2>{section.heading}</h2>
      {#each legalBlocks(section.body, values) as block}
        {#if block.kind === "list"}<ul>{#each block.items as item}<li>{@render line(item)}</li>{/each}</ul>{:else}<p>{@render line(block.parts)}</p>{/if}
      {/each}
    {/each}
  </div>
</section>

<style>
  .legal-hero{padding-bottom:3.5rem}.legal-hero h1{font-size:clamp(2.2rem,5vw,3.6rem)}
  .legal{padding-top:3.5rem}.legal .wrap{max-width:50rem}
  .legal h2{margin:2.4rem 0 .7rem;font-size:1.3rem;color:var(--heading)}
  .legal h2:first-child{margin-top:0}
  .legal p,.legal li{line-height:1.8;color:var(--text)}
  .legal ul{padding-left:1.2rem;margin:.4rem 0 1rem}
  .legal a{color:var(--gold-deep);font-weight:700}
</style>
