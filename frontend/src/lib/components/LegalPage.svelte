<script lang="ts">
  import type { Snippet } from "svelte";

  let { eyebrow, title, updated, children }: { eyebrow: string; title: string; updated: string; children: Snippet } = $props();
</script>

<section class="page-hero legal-hero">
  <div class="wrap">
    <span class="eyebrow">{eyebrow}</span>
    <h1>{title}</h1>
    <p>Last updated {updated}</p>
  </div>
</section>
<section class="section legal">
  <div class="wrap">{@render children()}</div>
</section>

<style>
  .legal-hero{padding-bottom:3.5rem}.legal-hero h1{font-size:clamp(2.2rem,5vw,3.6rem)}
  .legal{padding-top:3.5rem}.legal .wrap{max-width:50rem}
  .legal :global(h2){margin:2.4rem 0 .7rem;font-size:1.3rem;color:var(--heading)}
  .legal :global(h2:first-child){margin-top:0}
  .legal :global(p),.legal :global(li){line-height:1.8;color:var(--text)}
  .legal :global(ul){padding-left:1.2rem;margin:.4rem 0 1rem}
  .legal :global(a){color:var(--gold-deep);font-weight:700}
</style>
