<script lang="ts">
  import { page } from "$app/state";
  import { ArrowRight } from "lucide-svelte";

  let missing = $derived(page.status === 404);
</script>

<svelte:head><title>{missing ? "Page not found" : "Something went wrong"} — Bengal Port</title><meta name="robots" content="noindex" /></svelte:head>

<section class="page-hero problem">
  <div class="wrap">
    <span class="eyebrow">{missing ? "PAGE NOT FOUND" : `ERROR ${page.status}`}</span>
    <h1>{missing ? "We couldn’t find that page." : "Something went wrong."}</h1>
    <p>{page.error?.message && page.error.message !== "Not Found" ? page.error.message : "The link may be out of date, or the page may have moved."}</p>
    <div class="actions">
      <a class="btn" href="/">BACK TO HOME <ArrowRight size={17} /></a>
      <a href="/services">Our services</a>
      <a href="/contact">Contact us</a>
    </div>
  </div>
</section>

<style>
  .problem{min-height:60svh;display:grid;align-items:center}
  .actions{display:flex;flex-wrap:wrap;align-items:center;gap:1rem 1.6rem;margin-top:2rem}
  .actions a:not(.btn){color:var(--navy);font-weight:750}
</style>
