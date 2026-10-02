<script lang="ts">
  import {
    Target,
    Eye,
    Globe2,
    ShieldCheck,
    Handshake,
    ArrowRight,
  } from "lucide-svelte";
  import type { AboutContent } from "$lib/site-pages";

  let { data }: { data: { content: AboutContent } } = $props();
  let content = $derived(data.content);
  // The wording is edited in the admin; the icons follow the order.
  const valueIcons = [Target, Eye, Globe2];
  const pointIcons = [ShieldCheck, Handshake, Globe2];
</script>

<svelte:head><title>About Us — Bengal Port</title></svelte:head>
<section class="page-hero">
  <div class="wrap">
    <span class="eyebrow">{content.hero.eyebrow}</span>
    <h1>{content.hero.title}</h1>
    <p>{content.hero.description}</p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="section-head">
      <span class="eyebrow">{content.intro.eyebrow}</span>
      <h2>{content.intro.title}</h2>
      <p>{content.intro.description}</p>
    </div>
    <div class="grid-3">
      {#each content.values as value, index}
        {@const Icon = valueIcons[index % valueIcons.length]}
        <article class="content-card">
          <Icon size={32} />
          <h3>{value.title}</h3>
          <p>{value.description}</p>
        </article>
      {/each}
    </div>
  </div>
</section>
<section class="section navy">
  <div class="wrap split">
    <div>
      <span class="eyebrow">{content.work.eyebrow}</span>
      <h2>{content.work.title}</h2>
      <p>{content.work.description}</p>
      <a class="btn" href="/services"
        >{content.work.button} <ArrowRight size={17} /></a
      >
    </div>
    <div class="points">
      {#each content.work.points as point, index}
        {@const Icon = pointIcons[index % pointIcons.length]}
        <p><Icon /> {point}</p>
      {/each}
    </div>
  </div>
</section>

<style>
  .content-card svg {
    color: var(--gold);
    margin-bottom: 18px;
  }
  .navy {
    background: var(--navy);
    color: white;
  }
  .navy h2 {
    font-size: clamp(34px, 4vw, 52px);
    line-height: 1.14;
  }
  .navy p {
    color: #dce5ef;
    line-height: 1.8;
  }
  .split {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    gap: 100px;
    align-items: center;
  }
  .points p {
    display: flex;
    align-items: center;
    gap: 16px;
    border-bottom: 1px solid #ffffff22;
    padding: 19px 0;
    font-weight: 700;
  }
  .points svg {
    color: var(--gold);
  }
  @media (max-width: 760px) {
    .split {
      grid-template-columns: 1fr;
      gap: 35px;
    }
  }
</style>
