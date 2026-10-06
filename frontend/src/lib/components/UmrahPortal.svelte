<script lang="ts">
  import { ArrowRight, Bus, Check, Globe2, Headphones, Hotel, ShieldCheck } from "lucide-svelte";
  import type { UmrahContent } from "$lib/division-content";
  import type { PublicReview } from "$lib/reviews";
  import { applyHref } from "$lib/apply-route";
  import { reveal } from "$lib/reveal";
  import { isHighlighted, upcomingDepartures } from "$lib/umrah";
  import RotatingWord from "./RotatingWord.svelte";
  import Testimonials from "./Testimonials.svelte";

  // The Global Umrah page: a night-sky hero with the two holy mosques and the
  // route between them, the next group departures, the packages, the four
  // stages of the journey, the panel for families and groups, pilgrim
  // reviews, how to begin, and the closing panel.
  let { content, reviews = [] }: { content: UmrahContent; reviews?: PublicReview[] } = $props();

  const icons: Record<string, any> = { shield: ShieldCheck, headset: Headphones, building: Hotel, hotel: Hotel, bus: Bus, globe: Globe2 };
  let departures = $derived(upcomingDepartures(content.hero.departures));
</script>

{#snippet haram(cls: string)}
  <!-- Masjid al-Haram: the Kaaba with its band, two minarets and the clock tower. -->
  <svg class={cls} viewBox="0 0 200 120" aria-hidden="true" focusable="false">
    <path d="M14 110V46l5-12 5 12v64M176 110V46l5-12 5 12v64" />
    <path d="M136 110V28h22v82M147 14v8M143 20a4 4 0 1 0 8 0" />
    <rect x="82" y="60" width="40" height="40" />
    <path d="M82 72h40M106 100V82h6v18" />
    <path d="M60 110V70h-8v40M140 110V70h-8" />
    <path d="M0 110h200" />
  </svg>
{/snippet}
{#snippet nabawi(cls: string)}
  <!-- Masjid an-Nabawi: the dome and crescent, two minarets and the arcade. -->
  <svg class={cls} viewBox="0 0 200 120" aria-hidden="true" focusable="false">
    <path d="M70 70a30 30 0 0 1 60 0M70 70v20h60V70" />
    <path d="M100 40V30M96 26a5 5 0 1 0 8 0" />
    <path d="M28 110V38l5-10 5 10v72M162 110V38l5-10 5 10v72" />
    <path d="M10 110V95h180v15M50 95a8 8 0 0 1 16 0M92 95a8 8 0 0 1 16 0M134 95a8 8 0 0 1 16 0" />
    <path d="M0 110h200" />
  </svg>
{/snippet}

<main class="umrah">
  <section class="hero">
    <div class="sky" aria-hidden="true"><span class="stars"></span><span class="stars twinkle"></span></div>
    <div class="skyline" aria-hidden="true">
      {@render haram("mosque left")}
      <svg class="route" viewBox="0 0 1000 220" preserveAspectRatio="xMidYMax meet" aria-hidden="true" focusable="false">
        <path class="trail" d="M70 190Q500 -60 930 190" />
        <circle class="light" r="4" />
      </svg>
      {@render nabawi("mosque right")}
    </div>
    <span class="eyebrow">{content.hero.eyebrow}</span>
    <h1>{content.hero.title}</h1>
    <p class="journey"><RotatingWord words={content.hero.journeys} prefix="Your Umrah " interval={2600} /></p>
    <p class="tagline">{content.hero.tagline}</p>
    {#if departures.length}
      <div class="departures">
        <span class="departures-label">Next group departures</span>
        <ul>
          {#each departures as departure (departure.date + departure.label)}
            <li><b>{departure.day}</b><small>{departure.month}</small><span>{departure.label}</span></li>
          {/each}
        </ul>
      </div>
    {/if}
    <div class="lede">
      <p>{content.hero.description}</p>
      <div>
        <a class="primary" href={applyHref("UMRAH")}>{content.hero.primary}<ArrowRight size={18} /></a>
        <a class="ghost on-dark" href="#packages">{content.hero.secondary}</a>
      </div>
    </div>
  </section>

  <section class="section tiers-wrap" id="packages" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.packagesHeading.eyebrow}</span>
      <h2>{content.packagesHeading.title}</h2>
      <p>{content.packagesHeading.description}</p>
    </header>
    <div class="tiers">
      {#each content.packages as pkg}
        <article class="tier" class:highlighted={isHighlighted(pkg)}>
          {#if isHighlighted(pkg)}<span class="tag">{pkg.tag}</span>{/if}
          <h3>{pkg.name}</h3>
          <p class="nights">{pkg.nights}</p>
          <ul class="hotels">
            <li><Hotel size={15} /><span><b>Makkah</b> {pkg.makkahHotel}</span></li>
            <li><Hotel size={15} /><span><b>Madinah</b> {pkg.madinahHotel}</span></li>
          </ul>
          <p class="distance">{pkg.distance}</p>
          <p class="price">{pkg.price}</p>
          <ul class="inclusions">
            {#each pkg.inclusions as item}<li><i><Check size={13} /></i>{item}</li>{/each}
          </ul>
          <a class="pill" href={applyHref("UMRAH", "enquiry", `${pkg.name} package`)}>{pkg.cta}<ArrowRight size={17} /></a>
        </article>
      {/each}
    </div>
  </section>

  <section class="band" id="journey" use:reveal>
    <div class="section band-inner">
      <header class="heading">
        <span class="eyebrow">{content.stagesHeading.eyebrow}</span>
        <h2>{content.stagesHeading.title}</h2>
        <p>{content.stagesHeading.description}</p>
      </header>
      <ol class="stages">
        {#each content.stages as stage, i}
          <li>
            <div class="stage-photo">
              <img src={stage.image} alt="" width="1600" height="1067" loading="lazy" decoding="async" />
              <i>0{i + 1}</i>
            </div>
            <h3>{stage.title}</h3>
            <small>{stage.subtitle}</small>
            <ul>
              {#each stage.points as point}<li>{point}</li>{/each}
            </ul>
          </li>
        {/each}
      </ol>
    </div>
  </section>

  <section class="section proof-wrap" use:reveal>
    <div class="proof">
      <div class="proof-copy">
        <span class="eyebrow">{content.feature.eyebrow}</span>
        <h2>{content.feature.title}</h2>
        <p>{content.feature.description}</p>
      </div>
      <ol class="proof-points">
        {#each content.feature.points as point, i}
          <li>
            <i>0{i + 1}</i>
            <div>
              <h3>{point.title}</h3>
              <p>{point.description}</p>
            </div>
          </li>
        {/each}
      </ol>
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

  <section class="section begin" id="process" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.process.eyebrow}</span>
      <h2>{content.process.title}</h2>
      <p>{content.process.description}</p>
    </header>
    <ol class="numerals">
      {#each content.process.steps as step}
        <li>
          <i>{step.number}</i>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
        </li>
      {/each}
    </ol>
  </section>

  <section class="closing" use:reveal>
    {@render haram("watermark")}
    <div>
      <h2>{content.closing.title}</h2>
      <p>{content.closing.description}</p>
    </div>
    <div>
      <a class="primary" href={applyHref("UMRAH")}>{content.closing.primary}<ArrowRight size={17} /></a>
      <a class="outline" href="/contact">{content.closing.secondary}</a>
    </div>
  </section>
</main>

<style>
  /* The site's palette: navy for headings and dark surfaces, gold for actions
     and accents. The hero is a night sky over the two holy mosques. */
  .umrah {
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
  .umrah :global(::selection) {
    background: var(--ink);
    color: #fff;
  }
  .umrah a:focus-visible {
    outline: 3px solid rgba(199, 152, 54, 0.55);
    outline-offset: 3px;
  }
  .umrah :is(.hero, .closing, .reviews-panel) a:focus-visible {
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

  /* Hero: stars, the silhouettes at the two lower corners, the route between. */
  .hero {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: center;
    overflow: hidden;
    border-radius: 1.25rem;
    background: radial-gradient(ellipse at 50% 115%, #1d3a60 0%, #102640 52%, #0b1b31 100%);
    color: #fff;
    text-align: center;
    padding: 2.4rem 1rem 9rem;
    box-shadow: 0 1rem 2.6rem #17304f30;
  }
  .hero > :not(.sky, .skyline) {
    position: relative;
    z-index: 1;
  }
  .sky,
  .skyline {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }
  .stars {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(rgba(255, 255, 255, 0.55) 0.6px, transparent 1.1px);
    background-size: 90px 90px;
    opacity: 0.7;
  }
  .stars.twinkle {
    background-image: radial-gradient(rgba(239, 196, 94, 0.7) 0.7px, transparent 1.2px);
    background-size: 140px 140px;
    background-position: 45px 60px;
    animation: twinkle 7s ease-in-out infinite;
  }
  @keyframes twinkle {
    0%, 100% { opacity: 0.35; }
    50% { opacity: 0.85; }
  }
  .mosque {
    position: absolute;
    bottom: 0;
    width: clamp(9rem, 30vw, 18rem);
    height: auto;
    fill: none;
    stroke: var(--on-ink-gold);
    stroke-width: 1.2;
    stroke-linejoin: round;
    stroke-linecap: round;
    opacity: 0.35;
  }
  .mosque.left {
    left: -0.5rem;
  }
  .mosque.right {
    right: -0.5rem;
  }
  .route {
    position: absolute;
    left: 50%;
    bottom: 2.2rem;
    width: min(92%, 70rem);
    height: 11rem;
    transform: translateX(-50%);
    overflow: visible;
  }
  .trail {
    fill: none;
    stroke: var(--on-ink-gold);
    stroke-width: 1.2;
    stroke-dasharray: 2 7;
    stroke-linecap: round;
    opacity: 0.45;
  }
  .light {
    fill: #fff;
    offset-path: path("M70 190Q500 -60 930 190");
    offset-rotate: 0deg;
    animation: travel 9s cubic-bezier(0.45, 0, 0.55, 1) infinite;
    filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.9)) drop-shadow(0 0 10px rgba(239, 196, 94, 0.7));
  }
  @keyframes travel {
    0% { offset-distance: 0%; opacity: 0; }
    6% { opacity: 1; }
    94% { opacity: 1; }
    100% { offset-distance: 100%; opacity: 0; }
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
  .journey {
    margin: 0;
    font-size: clamp(2rem, 8.5vw, 5rem);
    line-height: 1.12;
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

  /* The next group departures: a label and date pills. */
  .departures {
    display: grid;
    justify-items: center;
    gap: 0.6rem;
    margin-top: 1.5rem;
  }
  .departures-label {
    font-size: 0.68rem;
    letter-spacing: 0.14em;
    font-weight: 800;
    color: var(--on-ink);
  }
  .departures ul {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .departures li {
    display: grid;
    grid-template-columns: auto auto;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 0.6rem;
    padding: 0.45rem 0.9rem 0.45rem 0.7rem;
    border: 1px solid rgba(239, 196, 94, 0.5);
    border-radius: 0.8rem;
    background: rgba(255, 255, 255, 0.06);
    text-align: left;
  }
  .departures b {
    grid-row: 1 / 3;
    font-size: 1.5rem;
    line-height: 1;
    color: var(--on-ink-gold);
    font-variant-numeric: tabular-nums;
  }
  .departures small {
    font-size: 0.66rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--on-ink-gold);
  }
  .departures span {
    font-size: 0.78rem;
    color: #fff;
  }
  .lede {
    width: 100%;
    max-width: 40rem;
    margin: 0 auto;
    padding-top: 1.4rem;
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

  /* Packages: three tiers, the tagged one set apart. */
  .tiers {
    display: grid;
    gap: 1rem;
  }
  .tier {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    padding: 1.5rem 1.4rem;
    border: 1px solid var(--line);
    border-radius: 1.25rem;
    background: #fff;
    box-shadow: 0 0.8rem 2rem #17304f12;
  }
  .tier.highlighted {
    order: -1;
    border: 2px solid var(--accent);
    box-shadow: 0 1rem 2.6rem #17304f24;
  }
  .tag {
    position: absolute;
    top: -0.8rem;
    left: 1.4rem;
    padding: 0.3rem 0.8rem;
    border-radius: 99rem;
    background: var(--accent);
    color: var(--ink);
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .tier h3 {
    margin: 0;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
    color: var(--ink);
    font-weight: 800;
  }
  .tier p {
    margin: 0;
  }
  .nights {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--accent-text);
  }
  .hotels {
    display: grid;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .hotels li {
    display: grid;
    grid-template-columns: 1.2rem 1fr;
    gap: 0.5rem;
    align-items: start;
    font-size: 0.86rem;
    line-height: 1.5;
    color: var(--text);
  }
  .hotels :global(svg) {
    margin-top: 0.2rem;
    color: var(--accent-deep);
  }
  .hotels b {
    color: var(--ink);
  }
  .distance {
    font-size: 0.82rem;
    color: var(--muted);
  }
  .price {
    padding-top: 0.6rem;
    border-top: 1px solid var(--line);
    font-size: 1.6rem;
    letter-spacing: -0.02em;
    color: var(--ink);
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }
  .inclusions {
    display: grid;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .inclusions li {
    display: grid;
    grid-template-columns: 1.4rem 1fr;
    gap: 0.55rem;
    align-items: start;
    font-size: 0.88rem;
    line-height: 1.5;
    color: #26384b;
  }
  .inclusions i {
    width: 1.4rem;
    height: 1.4rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--ink-soft);
    color: var(--ink);
  }
  .tier .pill {
    margin-top: auto;
    align-self: flex-start;
  }

  /* The journey, stage by stage: photos on a gold ribbon. */
  .band {
    background: var(--accent-soft);
    margin-inline: -1rem;
    padding-inline: 1rem;
  }
  .band-inner {
    max-width: 88rem;
    margin-inline: auto;
  }
  .stages {
    position: relative;
    display: grid;
    gap: 1.4rem;
    margin: 0;
    padding: 0 0 0 2.2rem;
    list-style: none;
  }
  .stages::before {
    content: "";
    position: absolute;
    top: 1rem;
    bottom: 1rem;
    left: 0.6rem;
    width: 3px;
    border-radius: 3px;
    background: var(--accent);
    opacity: 0.6;
  }
  .stages li {
    display: grid;
    gap: 0.35rem;
  }
  .stage-photo {
    position: relative;
    overflow: hidden;
    border-radius: 1rem;
    aspect-ratio: 4 / 3;
    background: var(--ink-soft);
    box-shadow: 0 0.6rem 1.6rem #17304f1a;
  }
  .stage-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .stage-photo i {
    position: absolute;
    top: 0.8rem;
    left: 0.8rem;
    width: 2.4rem;
    height: 2.4rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--ink);
    color: var(--on-ink-gold);
    font-style: normal;
    font-size: 0.76rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 0.3rem 0.8rem #17304f40;
  }
  .stages h3 {
    margin: 0.6rem 0 0;
    font-size: 1.15rem;
    color: var(--ink);
    font-weight: 800;
  }
  .stages small {
    font-size: 0.78rem;
    font-weight: 700;
    color: var(--accent-text);
  }
  .stages ul {
    display: grid;
    gap: 0.35rem;
    margin: 0.5rem 0 0;
    padding: 0 0 0 1.1rem;
    font-size: 0.88rem;
    line-height: 1.55;
  }
  .stages ul li::marker {
    color: var(--accent);
  }

  /* For individuals, families and groups: the points and stats in one navy panel. */
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
    grid-template-columns: 2.4rem 1fr;
    gap: 0.6rem;
    align-items: start;
    padding-top: 0.9rem;
    border-top: 1px solid rgba(255, 255, 255, 0.14);
  }
  .proof-points i {
    font-style: normal;
    font-size: 0.74rem;
    font-weight: 800;
    color: var(--on-ink-gold);
    font-variant-numeric: tabular-nums;
    padding-top: 0.2rem;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
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

  /* Pilgrim reviews: a navy panel under a photo, with the slideshow beside it. */
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

  /* How to begin: large gold numerals joined by a dotted line. */
  .numerals {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.6rem 1rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .numerals li {
    position: relative;
    padding-top: 0.6rem;
  }
  .numerals i {
    display: block;
    font-style: normal;
    font-size: 2.6rem;
    line-height: 1;
    letter-spacing: -0.04em;
    font-weight: 900;
    color: var(--accent-deep);
    font-variant-numeric: tabular-nums;
  }
  .numerals h3 {
    margin: 0.7rem 0 0.3rem;
    font-size: 1.05rem;
    color: var(--ink);
    font-weight: 800;
  }
  .numerals p {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.6;
  }

  .closing {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    margin-top: 2rem;
    background: var(--ink-panel);
    color: #fff;
    border-radius: 1.25rem;
    padding: 1.75rem 1.5rem;
    box-shadow: 0 10px 30px #17304f26;
  }
  .closing > div {
    position: relative;
    z-index: 1;
  }
  .watermark {
    position: absolute;
    right: -1rem;
    bottom: -0.4rem;
    z-index: 0;
    width: clamp(10rem, 28vw, 18rem);
    height: auto;
    fill: none;
    stroke: var(--on-ink-gold);
    stroke-width: 1.2;
    stroke-linejoin: round;
    opacity: 0.14;
    pointer-events: none;
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
  .pill:active {
    transform: scale(0.97);
  }
  @media (hover: hover) and (pointer: fine) {
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
  }

  @media (min-width: 37.51rem) {
    .section,
    .band,
    .reviews {
      scroll-margin-top: 10.7rem;
    }
  }
  @media (min-width: 40rem) {
    .stats {
      grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    }
    .stages {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding-left: 0;
      gap: 1.6rem 1.2rem;
    }
    .stages::before {
      display: none;
    }
  }
  @media (min-width: 48rem) {
    .umrah {
      padding-inline: 2rem;
    }
    .hero {
      justify-content: center;
      min-height: 86svh;
      padding: 3rem 2rem 12rem;
    }
    .hero h1 {
      margin-top: 0.8rem;
    }
    .tagline {
      margin-top: 1rem;
    }
    .departures {
      margin-top: 2rem;
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
    .proof {
      padding: 2.4rem 2.2rem;
      grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    }
    .proof-points {
      align-content: center;
    }
    .stats {
      grid-column: 1 / -1;
    }
    .numerals {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 1rem;
    }
    .numerals li {
      padding-top: 1.4rem;
    }
    .numerals li::before {
      content: "";
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      border-top: 2px dotted rgba(199, 152, 54, 0.6);
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
    .tiers {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      align-items: start;
      padding-top: 0.6rem;
    }
    .tier.highlighted {
      order: 0;
      transform: translateY(-0.6rem);
    }
    .stages {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      padding-top: 1.4rem;
    }
    .stages::before {
      display: block;
      top: 0;
      bottom: auto;
      left: 4%;
      right: 4%;
      width: auto;
      height: 3px;
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
    .umrah {
      padding-inline: clamp(2rem, 5vw, 5rem);
    }
    .band {
      margin-inline: calc(clamp(2rem, 5vw, 5rem) * -1);
      padding-inline: clamp(2rem, 5vw, 5rem);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .stars.twinkle {
      animation: none;
      opacity: 0.6;
    }
    .light {
      animation: none;
      offset-distance: 50%;
      opacity: 1;
    }
    .primary,
    .ghost,
    .outline,
    .pill {
      transition: none;
    }
  }
</style>
