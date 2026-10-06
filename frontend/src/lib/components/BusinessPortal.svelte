<script lang="ts">
  import {
    ArrowRight,
    BriefcaseBusiness,
    Calculator,
    Factory,
    Globe2,
    Headphones,
    Network,
    Package,
    ShieldCheck,
    Smile,
    Store,
    UsersRound,
  } from "lucide-svelte";
  import type { BusinessContent } from "$lib/business-content";
  import type { PublicReview } from "$lib/reviews";
  import { applyHref } from "$lib/apply-route";
  import { reveal } from "$lib/reveal";
  import { flagCode } from "$lib/flags";
  import { groupPartners, industries, type Partner, type PartnerKind } from "$lib/partners";
  import RotatingWord from "./RotatingWord.svelte";
  import TradeRoutesMap from "./TradeRoutesMap.svelte";
  import Testimonials from "./Testimonials.svelte";

  // The Global Business page: a hero that draws trade routes to the markets
  // it sources from, six photo tiles, the engagement steps, the landed-cost
  // calculator, the partner list by country, the trust panel, reviews and
  // the closing panel. `partners` are the live suppliers and factories.
  let {
    content,
    partners,
    partnersUnavailable = false,
    reviews = [],
  }: { content: BusinessContent; partners: Partner[]; partnersUnavailable?: boolean; reviews?: PublicReview[] } = $props();

  const icons: Record<string, any> = {
    globe: Globe2,
    users: UsersRound,
    briefcase: BriefcaseBusiness,
    package: Package,
    smile: Smile,
    network: Network,
    headset: Headphones,
    shield: ShieldCheck,
    calculator: Calculator,
  };

  // The market the title names right now; the map draws its route.
  let market = $state(0);

  // A planning estimate: product cost plus shipping plus duty on the cost.
  let productCost = $state(100000);
  let shipping = $state(18000);
  let duty = $state(15);
  let landed = $derived(Number(productCost || 0) + Number(shipping || 0) + (Number(productCost || 0) * Number(duty || 0)) / 100);
  const taka = (amount: number) => `৳${Math.round(amount).toLocaleString("en-IN")}`;

  let kind = $state<PartnerKind>("all");
  let industry = $state("All");
  let groups = $derived(groupPartners(partners, kind, industry));
  let industryChoices = $derived(industries(partners));
  const kinds: { key: PartnerKind; label: string }[] = [
    { key: "all", label: "All partners" },
    { key: "Supplier", label: "Suppliers" },
    { key: "Factory", label: "Factories" },
  ];
  const flagSrc = (country: string) => {
    const code = flagCode(country);
    return code ? `https://flagcdn.com/w40/${code}.png` : "";
  };
</script>

<main class="biz">
  <section class="hero">
    <div class="map-wrap" aria-hidden="true"><TradeRoutesMap markets={content.hero.markets} active={market} /></div>
    <div class="chips" aria-hidden="true">
      {#each content.hero.categories.slice(0, 5) as chip, i}<span class={`chip chip-${i}`}>{chip}</span>{/each}
    </div>
    <span class="eyebrow">{content.hero.eyebrow}</span>
    <h1>{content.hero.title}</h1>
    <p class="market">
      <RotatingWord words={content.hero.markets} prefix="Sourcing from " onchange={(index) => (market = index)} />
    </p>
    <p class="tagline">{content.hero.tagline}</p>
    <div class="lede">
      <p>{content.hero.description}</p>
      <div>
        <a class="primary" href={applyHref("BUSINESS")}>{content.hero.primary}<ArrowRight size={18} /></a>
        <a class="ghost on-dark" href={applyHref("BUSINESS", "enquiry", "Business tour")}>{content.hero.secondary}</a>
      </div>
    </div>
  </section>

  <section class="section offer" id="services" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.services.eyebrow}</span>
      <h2>{content.services.title}</h2>
      <p>{content.services.description}</p>
    </header>
    <div class="bento">
      {#each content.services.items as item, i}
        <a class={`tile tile-${i + 1}`} href={item.href}>
          <img src={item.image} alt="" loading={i ? "lazy" : "eager"} decoding="async" />
          <span class="tile-copy">
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <strong>{item.cta} <ArrowRight size={15} /></strong>
          </span>
        </a>
      {/each}
    </div>
  </section>

  <section class="band" id="process" use:reveal>
    <div class="section band-inner">
      <header class="heading">
        <span class="eyebrow">{content.process.eyebrow}</span>
        <h2>{content.process.title}</h2>
        <p>{content.process.description}</p>
      </header>
      <ol class="rail">
        {#each content.process.steps as step}
          <li>
            <i>{step.number}</i>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </li>
        {/each}
      </ol>
    </div>
  </section>

  <section class="section desk" id="calculator" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.calculator.eyebrow}</span>
      <h2>{content.calculator.title}</h2>
      <p>{content.calculator.description}</p>
    </header>
    <div class="calc">
      <form class="calc-inputs" onsubmit={(event) => event.preventDefault()}>
        <label class="field"><span>Product value (৳)</span><input type="number" min="0" step="1000" bind:value={productCost} /></label>
        <div class="two">
          <label class="field"><span>Shipping (৳)</span><input type="number" min="0" step="500" bind:value={shipping} /></label>
          <label class="field"><span>Estimated duty (%)</span><input type="number" min="0" max="100" step="1" bind:value={duty} /></label>
        </div>
      </form>
      <div class="calc-result">
        <small>Estimated landed cost</small>
        <b>{taka(landed)}</b>
        <p>{content.calculator.note}</p>
        <a class="primary" href={applyHref("BUSINESS", "enquiry", `Landed cost estimate ${taka(landed)}`)}>{content.calculator.cta}<ArrowRight size={17} /></a>
      </div>
    </div>
  </section>

  <section class="section network" id="partners" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.partners.eyebrow}</span>
      <h2>{content.partners.title}</h2>
      <p>{content.partners.description}</p>
    </header>
    {#if partnersUnavailable}<p class="notice">Live partner records are temporarily unavailable.</p>{/if}
    {#if partners.length}
      <div class="filters">
        <div class="kinds" role="group" aria-label="Show">
          {#each kinds as item}
            <button type="button" class:on={kind === item.key} aria-pressed={kind === item.key} onclick={() => (kind = item.key)}>{item.label}</button>
          {/each}
        </div>
        <select bind:value={industry} aria-label="Filter by industry">
          {#each industryChoices as item}<option>{item}</option>{/each}
        </select>
      </div>
      <div class="groups">
        {#each groups as group (group.country)}
          <section class="country">
            <h3>
              {#if flagSrc(group.country)}<img src={flagSrc(group.country)} alt="" width="40" height="30" loading="lazy" referrerpolicy="no-referrer" />{/if}
              {group.country}<small>{group.items.length}</small>
            </h3>
            <ul>
              {#each group.items as partner (partner.name + partner.kind)}
                <li>
                  <span class="thumb">
                    {#if partner.image}<img src={partner.image} alt="" loading="lazy" decoding="async" />{:else if partner.kind === "Factory"}<Factory size={20} />{:else}<Store size={20} />{/if}
                  </span>
                  <span class="who">
                    <b>{partner.name}{#if partner.featured}<em>Featured</em>{/if}</b>
                    <small>{partner.kind} · {partner.industry} · {partner.product}</small>
                  </span>
                  <a href={applyHref("BUSINESS", "enquiry", partner.name)}>Request connection <ArrowRight size={15} /></a>
                </li>
              {/each}
            </ul>
          </section>
        {:else}
          <div class="none"><p>No partners match these filters.</p></div>
        {/each}
      </div>
    {:else}
      <div class="none">
        <p>{content.partners.empty}</p>
        <a class="pill" href={applyHref("BUSINESS", "enquiry", content.partners.title)}>Ask about sourcing<ArrowRight size={17} /></a>
      </div>
    {/if}
  </section>

  <section class="section proof-wrap" use:reveal>
    <div class="proof">
      <div class="proof-copy">
        <span class="eyebrow">{content.trust.eyebrow}</span>
        <h2>{content.trust.title}</h2>
        <p>{content.trust.description}</p>
      </div>
      <ul class="proof-points">
        {#each content.trust.items as item, i}{@const Icon = icons[item.icon] || ShieldCheck}
          <li>
            <i><Icon size={20} /></i>
            <div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </div>
          </li>
        {/each}
      </ul>
      <ul class="stats">
        {#each content.stats as stat}{@const Icon = icons[stat.icon] || Globe2}
          <li><Icon size={22} /><b>{stat.value}</b><span>{stat.label}</span></li>
        {/each}
      </ul>
    </div>
  </section>

  <section class="reviews" class:empty={!reviews.length} id="reviews" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.reviews.eyebrow}</span>
      <h2>{content.reviews.heading}</h2>
    </header>
    <div class="reviews-body">
      <div class="reviews-panel">
        {#if content.reviews.photo}<img class="reviews-photo" src={content.reviews.photo} alt="" width="1600" height="900" loading="lazy" decoding="async" />{/if}
        <div class="reviews-copy">
          <p>{content.reviews.description}</p>
          <p class="invite">{content.reviews.invite}</p>
          <a class="primary" href="/dashboard">{content.reviews.cta}<ArrowRight size={17} /></a>
        </div>
      </div>
      {#if reviews.length}<Testimonials {reviews} />{/if}
    </div>
  </section>

  <section class="closing" use:reveal>
    <div>
      <h2>{content.closing.title}</h2>
      <p>{content.closing.description}</p>
    </div>
    <div>
      <a class="primary" href={content.closing.primaryHref}>{content.closing.primary}<ArrowRight size={17} /></a>
      <a class="outline" href={content.closing.secondaryHref}>{content.closing.secondary}</a>
    </div>
  </section>
</main>

<style>
  /* The site's palette: navy for headings and dark surfaces, gold for actions
     and accents. The hero is dark here, the counterpart of Education's light one. */
  .biz {
    --ink: #17304f;
    --ink-deep: #102640;
    --ink-soft: #e9eef4;
    --ink-panel: linear-gradient(145deg, #1d3a60, #102640);
    --accent: #c79836;
    --accent-hover: #ddb85d;
    --accent-text: #8a6a2b;
    --accent-deep: #a87618;
    --accent-soft: #fbf5e8;
    --on-ink: #c9d5e2;
    --on-ink-gold: #efc45e;
    --text: #33465a;
    --muted: #607083;
    --line: #e2e6e8;
    background: #fafaf7;
    color: var(--text);
    padding: 0.75rem 1rem 5rem;
    overflow: clip;
  }
  .biz :global(::selection) {
    background: var(--ink);
    color: #fff;
  }
  .biz :is(a, button, input, select):focus-visible {
    outline: 3px solid rgba(199, 152, 54, 0.55);
    outline-offset: 3px;
  }
  .biz :is(.hero, .closing, .reviews-panel, .calc-result) a:focus-visible {
    outline-color: #ffffffc7;
  }
  .hero,
  .section,
  .reviews,
  .closing {
    width: 100%;
    max-width: 88rem;
    margin-inline: auto;
  }
  .section,
  .band,
  .reviews {
    scroll-margin-top: 6.2rem;
  }
  .eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    font-weight: 800;
    color: var(--accent-text);
  }

  /* Hero: the world behind the title, a route drawn to the market it names. */
  .hero {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    border-radius: 1.25rem;
    background: var(--ink-panel);
    color: #fff;
    text-align: center;
    padding: 2.4rem 1rem 2rem;
    box-shadow: 0 1rem 2.6rem #17304f30;
  }
  .hero > :not(.map-wrap, .chips) {
    position: relative;
    z-index: 1;
  }
  .map-wrap {
    position: absolute;
    inset: 0;
    z-index: 0;
    display: grid;
    align-items: center;
    opacity: 0.9;
    pointer-events: none;
  }
  .map-wrap :global(svg) {
    width: 190%;
    margin-left: -75%;
  }
  .hero::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 0;
    background: radial-gradient(ellipse at 50% 40%, rgba(16, 38, 64, 0.55) 0%, rgba(16, 38, 64, 0.2) 45%, transparent 70%);
    pointer-events: none;
  }
  .chips {
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
  }
  .chip {
    --drift: 5px;
    position: absolute;
    padding: 0.45rem 0.8rem;
    border: 1px solid rgba(239, 196, 94, 0.55);
    border-radius: 99rem;
    background: rgba(16, 38, 64, 0.72);
    color: var(--on-ink-gold);
    font-size: 0.74rem;
    font-weight: 750;
    letter-spacing: 0.02em;
    white-space: nowrap;
    backdrop-filter: blur(2px);
  }
  .chip-0 { top: 1.2rem; left: 4%; animation: float-a 8s ease-in-out infinite; }
  .chip-1 { top: 1.2rem; right: 4%; animation: float-b 9s ease-in-out infinite; }
  .chip-2 { bottom: 7.5rem; left: 5%; animation: float-b 7s ease-in-out infinite; }
  .chip-3,
  .chip-4 { display: none; }
  @keyframes float-a {
    50% { transform: translate(var(--drift), calc(var(--drift) * -1.3)); }
  }
  @keyframes float-b {
    50% { transform: translate(calc(var(--drift) * -1.3), var(--drift)); }
  }
  .hero .eyebrow {
    color: var(--on-ink-gold);
  }
  .hero h1 {
    font-size: clamp(2rem, 7vw, 4.2rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    margin: 0.5rem 0 0;
    font-weight: 800;
    text-wrap: balance;
  }
  .market {
    margin: 0;
    font-size: clamp(2.2rem, 9vw, 5.2rem);
    line-height: 1.1;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: var(--on-ink-gold);
    text-shadow: 0 0.2rem 1.5rem rgba(0, 0, 0, 0.35);
  }
  .tagline {
    margin: 0.7rem 0 0;
    font-size: clamp(1rem, 3.7vw, 1.4rem);
    font-weight: 600;
    color: var(--on-ink);
  }
  .lede {
    width: 100%;
    max-width: 40rem;
    margin: 0 auto;
    padding-top: 1.3rem;
  }
  .lede p {
    margin: 0;
    line-height: 1.7;
    color: var(--on-ink);
  }
  .lede > div,
  .closing > div:last-child {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin-top: 1.3rem;
  }

  /* Buttons, as on the Education page. */
  .primary,
  .ghost,
  .outline,
  .pill {
    min-height: 3rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.7rem 1.1rem;
    border-radius: 0.7rem;
    font-size: 0.8rem;
    font-weight: 800;
    text-decoration: none;
    transition:
      transform 150ms cubic-bezier(0.23, 1, 0.32, 1),
      background-color 180ms ease,
      box-shadow 180ms ease;
  }
  .primary {
    background: var(--accent);
    color: var(--ink);
    box-shadow: 0 0.6rem 1.4rem rgba(167, 117, 23, 0.22);
  }
  .ghost {
    border: 1px solid #d7dce3;
    color: var(--ink);
    background: #fff;
  }
  .ghost.on-dark {
    border-color: rgba(255, 255, 255, 0.35);
    background: rgba(255, 255, 255, 0.08);
    color: #fff;
  }
  .outline {
    border: 1px solid #ffffff55;
    color: #fff;
  }
  .pill {
    border-radius: 99rem;
    padding-inline: 1.4rem;
    background: var(--ink);
    color: #fff;
  }

  /* Section headings: centred, with a short gold rule beneath the title. */
  .heading {
    max-width: 46rem;
    margin: 0 auto 2.2rem;
    text-align: center;
  }
  .heading h2,
  .proof h2,
  .closing h2 {
    font-size: clamp(1.8rem, 6.4vw, 3.2rem);
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 0.5rem 0 0;
    text-wrap: balance;
    font-weight: 800;
  }
  .proof h2,
  .closing h2 {
    font-size: clamp(1.7rem, 5.6vw, 2.75rem);
  }
  .heading h2::after {
    content: "";
    display: block;
    width: 4.5rem;
    height: 4px;
    margin: 1.2rem auto 0;
    border-radius: 4px;
    background: var(--accent);
  }
  .heading p {
    max-width: 40rem;
    margin: 1.2rem auto 0;
    line-height: 1.7;
  }
  .section {
    padding-block: 2.6rem;
  }

  /* What we do: six photo tiles. */
  .bento {
    display: grid;
    gap: 0.9rem;
    grid-template-columns: 1fr;
    grid-auto-rows: 14rem;
  }
  .tile {
    position: relative;
    display: flex;
    overflow: hidden;
    border-radius: 1.1rem;
    background: var(--ink);
    color: #fff;
    text-decoration: none;
    box-shadow: 0 0.6rem 1.6rem #17304f1a;
    transition:
      transform 250ms cubic-bezier(0.23, 1, 0.32, 1),
      box-shadow 250ms ease;
  }
  .tile img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 600ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .tile-copy {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    gap: 0.35rem;
    width: 100%;
    padding: 1.2rem;
    background: linear-gradient(0deg, rgba(16, 38, 64, 0.94) 0%, rgba(16, 38, 64, 0.45) 55%, transparent 100%);
  }
  .tile h3 {
    margin: 0;
    font-size: 1.1rem;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .tile p {
    margin: 0;
    font-size: 0.84rem;
    line-height: 1.5;
    color: var(--on-ink);
    display: -webkit-box;
    -webkit-line-clamp: 2;
    line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  .tile strong {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin-top: 0.2rem;
    color: var(--on-ink-gold);
    font-size: 0.78rem;
  }

  /* How an engagement runs: numbered nodes on a gold line, on a cream band. */
  .band {
    background: var(--accent-soft);
    margin-inline: -1rem;
    padding-inline: 1rem;
  }
  .band-inner {
    max-width: 88rem;
    margin-inline: auto;
  }
  .rail {
    position: relative;
    display: grid;
    gap: 1.4rem;
    margin: 0;
    padding: 0 0 0 3.4rem;
    list-style: none;
  }
  .rail::before {
    content: "";
    position: absolute;
    top: 0.6rem;
    bottom: 0.6rem;
    left: 1.2rem;
    width: 2px;
    border-radius: 2px;
    background: var(--accent);
    opacity: 0.6;
  }
  .rail li {
    position: relative;
  }
  .rail i {
    position: absolute;
    top: 0;
    left: -3.4rem;
    width: 2.5rem;
    height: 2.5rem;
    display: grid;
    place-items: center;
    border: 3px solid var(--accent-soft);
    border-radius: 50%;
    background: var(--ink);
    color: var(--on-ink-gold);
    font-style: normal;
    font-size: 0.78rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 0.3rem 0.8rem #17304f2e;
  }
  .rail h3 {
    margin: 0.4rem 0 0.3rem;
    font-size: 1.05rem;
    color: var(--ink);
    font-weight: 800;
  }
  .rail p {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.6;
  }

  /* The landed-cost calculator as a trade desk: inputs beside a navy result. */
  .calc {
    display: grid;
    gap: 1rem;
    max-width: 62rem;
    margin-inline: auto;
  }
  .calc-inputs {
    display: grid;
    gap: 0.9rem;
    padding: 1.4rem;
    border: 1px solid var(--line);
    border-radius: 1.25rem;
    background: #fff;
    box-shadow: 0 0.8rem 2rem #17304f12;
  }
  .two {
    display: grid;
    gap: 0.9rem;
    grid-template-columns: 1fr 1fr;
  }
  .field {
    display: grid;
    gap: 0.4rem;
  }
  .field span {
    font-size: 0.78rem;
    font-weight: 750;
    color: var(--ink);
  }
  .field input {
    min-height: 3rem;
    width: 100%;
    border: 1px solid #d7dce3;
    border-radius: 0.7rem;
    padding: 0.7rem 0.9rem;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 1rem;
    font-variant-numeric: tabular-nums;
    outline: 0;
    caret-color: var(--accent);
  }
  .field input:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(199, 152, 54, 0.2);
  }
  .calc-result {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    padding: 1.6rem 1.4rem;
    border-radius: 1.25rem;
    background: var(--ink-panel);
    color: #fff;
    box-shadow: 0 1rem 2.4rem #17304f30;
  }
  .calc-result small {
    font-size: 0.72rem;
    letter-spacing: 0.13em;
    font-weight: 800;
    color: var(--on-ink-gold);
  }
  .calc-result b {
    font-size: clamp(2.2rem, 7vw, 3.4rem);
    line-height: 1.1;
    letter-spacing: -0.03em;
    font-variant-numeric: tabular-nums;
    color: var(--on-ink-gold);
  }
  .calc-result p {
    margin: 0 0 0.8rem;
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--on-ink);
  }
  .calc-result .primary {
    align-self: flex-start;
    margin-top: auto;
  }

  /* Partner network: filters, then the partners grouped by country. */
  .notice {
    max-width: 46rem;
    margin: -1rem auto 1.4rem;
    text-align: center;
    font-size: 0.86rem;
    color: var(--accent-text);
  }
  .filters {
    display: grid;
    gap: 0.7rem;
    margin-bottom: 1.4rem;
  }
  .kinds {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.45rem;
  }
  .kinds button {
    min-height: 2.75rem;
    padding: 0.5rem 1.05rem;
    border: 1px solid #d7dce3;
    border-radius: 99rem;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 750;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      color 160ms ease,
      transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .kinds button.on {
    border-color: var(--ink);
    background: var(--ink);
    color: #fff;
  }
  .filters select {
    min-height: 3rem;
    border: 1px solid #d7dce3;
    border-radius: 0.7rem;
    padding: 0 0.8rem;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 1rem;
    outline: 0;
  }
  .filters select:focus-visible {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(199, 152, 54, 0.2);
  }
  .groups {
    display: grid;
    gap: 1.4rem;
  }
  .country h3 {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin: 0 0 0.6rem;
    font-size: 1rem;
    color: var(--ink);
    font-weight: 800;
  }
  .country h3 img {
    width: 1.6rem;
    height: 1.2rem;
    border-radius: 0.2rem;
    object-fit: cover;
    box-shadow: 0 0 0 1px rgba(23, 48, 79, 0.15);
  }
  .country h3 small {
    min-width: 1.6rem;
    padding: 0.1rem 0.5rem;
    border-radius: 99rem;
    background: var(--ink-soft);
    color: var(--ink);
    font-size: 0.72rem;
    text-align: center;
  }
  .country ul {
    display: grid;
    margin: 0;
    padding: 0;
    list-style: none;
    border: 1px solid var(--line);
    border-radius: 1rem;
    background: #fff;
    overflow: hidden;
  }
  .country li {
    display: grid;
    grid-template-columns: 3rem 1fr;
    gap: 0.6rem 0.9rem;
    align-items: center;
    padding: 0.9rem 1rem;
  }
  .country li + li {
    border-top: 1px solid var(--line);
  }
  .thumb {
    width: 3rem;
    height: 3rem;
    display: grid;
    place-items: center;
    overflow: hidden;
    border-radius: 0.75rem;
    background: var(--ink-soft);
    color: var(--ink);
  }
  .thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .who {
    min-width: 0;
  }
  .who b {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.45rem;
    color: var(--ink);
    font-size: 0.95rem;
  }
  .who em {
    padding: 0.15rem 0.5rem;
    border-radius: 99rem;
    background: var(--accent-soft);
    color: var(--accent-text);
    font-style: normal;
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .who small {
    display: block;
    margin-top: 0.15rem;
    font-size: 0.78rem;
    color: var(--muted);
    overflow-wrap: anywhere;
  }
  .country li a {
    grid-column: 2;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.75rem;
    color: var(--accent-text);
    font-size: 0.8rem;
    font-weight: 800;
    text-decoration: none;
  }
  .none {
    text-align: center;
    padding: 2rem;
  }
  .none p {
    max-width: 34rem;
    margin: 0 auto 1.2rem;
    line-height: 1.7;
  }

  /* Why Bengal Port: the trust points and the stats in one navy panel. */
  .proof {
    display: grid;
    gap: 1.6rem;
    padding: 1.75rem 1.4rem;
    border-radius: 1.25rem;
    background: var(--ink-panel);
    color: #fff;
    box-shadow: 0 1rem 2.6rem #17304f30;
  }
  .proof .eyebrow {
    color: var(--on-ink-gold);
  }
  .proof h2 {
    color: #fff;
  }
  .proof-copy p {
    max-width: 34rem;
    margin: 0.8rem 0 0;
    line-height: 1.7;
    color: var(--on-ink);
  }
  .proof-points {
    display: grid;
    gap: 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .proof-points li {
    display: grid;
    grid-template-columns: 2.6rem 1fr;
    gap: 0.8rem;
    align-items: start;
  }
  .proof-points i {
    width: 2.6rem;
    height: 2.6rem;
    display: grid;
    place-items: center;
    border-radius: 0.75rem;
    background: rgba(255, 255, 255, 0.08);
    color: var(--on-ink-gold);
  }
  .proof-points h3 {
    margin: 0 0 0.25rem;
    font-size: 1rem;
    font-weight: 800;
  }
  .proof-points p {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.55;
    color: var(--on-ink);
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.8rem;
    margin: 0;
    padding: 1.2rem 0 0;
    list-style: none;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
  }
  .stats li {
    display: grid;
    justify-items: center;
    text-align: center;
    gap: 0.15rem;
    color: var(--on-ink-gold);
  }
  .stats b {
    font-size: 1.45rem;
    color: #fff;
    font-variant-numeric: tabular-nums;
  }
  .stats span {
    font-size: 0.72rem;
    color: var(--on-ink);
  }

  /* Client reviews: a navy panel under a photo, with the slideshow beside it. */
  .reviews {
    padding-block: 2.6rem 1rem;
  }
  .reviews-body {
    display: grid;
    gap: 1rem;
  }
  .reviews-panel {
    display: grid;
    overflow: hidden;
    border-radius: 1.25rem;
    background: var(--ink-panel);
    color: #fff;
    box-shadow: 0 1rem 2.4rem #17304f30;
  }
  .reviews-photo {
    width: 100%;
    height: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }
  .reviews-copy {
    padding: 1.5rem;
  }
  .reviews-copy p {
    margin: 0;
    line-height: 1.75;
    color: #e6edf5;
  }
  .reviews-copy .invite {
    margin-top: 0.9rem;
    color: var(--on-ink);
    font-size: 0.9rem;
  }
  .reviews-copy a {
    margin-top: 1.3rem;
  }
  .reviews.empty .reviews-panel {
    max-width: 34rem;
    margin-inline: auto;
  }

  .closing {
    margin-top: 2rem;
    background: var(--ink-panel);
    color: #fff;
    border-radius: 1.25rem;
    padding: 1.75rem 1.5rem;
    box-shadow: 0 10px 30px #17304f26;
  }
  .closing h2 {
    color: #fff;
  }
  .closing p {
    max-width: 38rem;
    margin: 0.8rem 0 0;
    line-height: 1.7;
    color: var(--on-ink);
  }

  .primary:active,
  .ghost:active,
  .outline:active,
  .pill:active,
  .tile:active,
  .kinds button:active {
    transform: scale(0.97);
  }
  @media (hover: hover) and (pointer: fine) {
    .tile:hover {
      transform: translateY(-0.35rem);
      box-shadow: 0 1.2rem 2.6rem #17304f33;
    }
    .tile:hover img {
      transform: scale(1.05);
    }
    .primary:hover {
      transform: translateY(-2px);
      background: var(--accent-hover);
      box-shadow: 0 0.9rem 1.7rem rgba(167, 117, 23, 0.3);
    }
    .pill:hover {
      transform: translateY(-2px);
      background: #203d5d;
      box-shadow: 0 0.9rem 1.7rem #17304f33;
    }
    .ghost:hover {
      background: var(--accent-soft);
      transform: translateY(-2px);
    }
    .ghost.on-dark:hover {
      background: rgba(255, 255, 255, 0.16);
    }
    .outline:hover {
      background: #ffffff14;
      transform: translateY(-2px);
    }
    .kinds button:not(.on):hover {
      background: var(--ink-soft);
    }
    .country li a:hover {
      text-decoration: underline;
      text-underline-offset: 0.25em;
    }
  }

  @media (min-width: 37.51rem) {
    .section,
    .band,
    .reviews {
      scroll-margin-top: 10.7rem;
    }
  }
  @media (min-width: 40rem) {
    .bento {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .tile-1 {
      grid-column: span 2;
    }
    .filters {
      grid-template-columns: 1fr 14rem;
      align-items: center;
    }
    .kinds {
      justify-content: flex-start;
    }
    .country li {
      grid-template-columns: 3rem 1fr auto;
    }
    .country li a {
      grid-column: auto;
    }
    .stats {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  @media (min-width: 48rem) {
    .biz {
      padding-inline: 2rem;
    }
    .hero {
      justify-content: center;
      min-height: 86svh;
      padding: 3rem 2rem 3.25rem;
    }
    .map-wrap :global(svg) {
      width: 100%;
      margin-left: 0;
    }
    .chip {
      --drift: 14px;
      font-size: 0.82rem;
      padding: 0.55rem 1rem;
    }
    .chip-0 { top: 14%; left: 9%; }
    .chip-1 { top: 10%; right: 10%; }
    .chip-2 { top: 34%; left: 6%; }
    .chip-3 { display: inline-block; top: 36%; right: 7%; animation: float-a 8.5s ease-in-out infinite; }
    .chip-4 { display: inline-block; bottom: 14%; left: 14%; animation: float-b 9.5s ease-in-out infinite; }
    .hero h1 {
      margin-top: 0.8rem;
    }
    .tagline {
      margin-top: 1rem;
    }
    .lede {
      padding-top: 1.8rem;
    }
    .lede > div,
    .closing > div:last-child {
      flex-direction: row;
      justify-content: center;
    }
    .section {
      padding-block: 4rem;
    }
    .band {
      margin-inline: -2rem;
      padding-inline: 2rem;
    }
    .bento {
      gap: 1rem;
      grid-auto-rows: 15rem;
    }
    .tile-copy {
      padding: 1.5rem;
    }
    .calc {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
    }
    .calc-inputs {
      padding: 1.8rem;
    }
    .calc-result {
      padding: 2rem 1.8rem;
    }
    .proof {
      padding: 2.4rem 2.2rem;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    }
    .proof-points {
      grid-template-columns: 1fr 1fr;
      align-content: center;
    }
    .stats {
      grid-column: 1 / -1;
    }
    .reviews-copy {
      padding: 2rem;
    }
    .reviews.empty .reviews-panel {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      align-items: center;
      max-width: 62rem;
    }
    .reviews.empty .reviews-photo {
      aspect-ratio: auto;
      min-height: 19rem;
    }
    .closing {
      padding: 2.25rem 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
    }
    .closing > div:first-child {
      max-width: 44rem;
    }
    .closing > div:last-child {
      margin-top: 0;
      flex: none;
    }
  }
  @media (min-width: 56rem) {
    .rail {
      grid-template-columns: repeat(5, minmax(0, 1fr));
      gap: 1rem;
      padding: 3.6rem 0 0;
      text-align: center;
    }
    .rail::before {
      top: 1.25rem;
      bottom: auto;
      left: 10%;
      right: 10%;
      width: auto;
      height: 2px;
    }
    .rail i {
      top: -3.6rem;
      left: 50%;
      transform: translateX(-50%);
    }
    .rail h3 {
      margin-top: 0;
    }
    .reviews:not(.empty) .reviews-body {
      grid-template-columns: minmax(0, 0.8fr) minmax(0, 2fr);
      align-items: start;
    }
    .reviews:not(.empty) .reviews-photo {
      display: none;
    }
  }
  @media (min-width: 64rem) {
    .biz {
      padding-inline: clamp(2rem, 5vw, 5rem);
    }
    .band {
      margin-inline: calc(clamp(2rem, 5vw, 5rem) * -1);
      padding-inline: clamp(2rem, 5vw, 5rem);
    }
    .bento {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      grid-auto-rows: 15.5rem;
    }
    .tile-1 {
      grid-column: span 2;
      grid-row: span 2;
    }
    .tile-1 h3 {
      font-size: 1.5rem;
    }
    .tile-1 p {
      font-size: 0.95rem;
      max-width: 34rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .chip {
      animation: none;
    }
    .tile,
    .tile img,
    .primary,
    .ghost,
    .outline,
    .pill,
    .kinds button {
      transition: none;
    }
  }
</style>
