<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import {
    Activity,
    ArrowRight,
    Check,
    FileText,
    Globe2,
    Headphones,
    HeartPulse,
    Hospital,
    MapPin,
    Plane,
    Search,
    ShieldCheck,
    Stethoscope,
  } from "lucide-svelte";
  import type { HealthcareContent } from "$lib/division-content";
  import type { PublicReview } from "$lib/reviews";
  import { applyHref } from "$lib/apply-route";
  import { reveal } from "$lib/reveal";
  import { countryOf, flagCode } from "$lib/flags";
  import RotatingWord from "./RotatingWord.svelte";
  import Testimonials from "./Testimonials.svelte";

  // The Global Healthcare page: a calm hero that names the specialty and the
  // three-step pathway, the treatments index, the live hospital directory,
  // the pathway timeline, the clarity panel, patient stories and the closing
  // panel. `records` are the live partner hospitals with their services.
  let {
    content,
    records,
    reviews = [],
  }: { content: HealthcareContent; records: any[]; reviews?: PublicReview[] } = $props();

  const icons: Record<string, any> = {
    file: FileText,
    hospital: Hospital,
    plane: Plane,
    heart: HeartPulse,
    stethoscope: Stethoscope,
    activity: Activity,
    headset: Headphones,
    map: MapPin,
    shield: ShieldCheck,
    globe: Globe2,
  };

  // The pathway lights one step at a time; everything is lit for people who
  // asked for less motion.
  let lit = $state(0);
  let reduced = $state(false);
  onMount(() => {
    reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const timer = setInterval(() => (lit = (lit + 1) % 3), 2000);
    return () => clearInterval(timer);
  });

  // Destination chips: the cities of the live hospitals, topped up from the
  // page's own list so there are always four.
  let places = $derived.by(() => {
    const live = records.map((record) => `${record.city}, ${record.country}`);
    return [...new Set([...live, ...content.hero.cities])].slice(0, 4);
  });
  const flagSrc = (place: string) => {
    const code = flagCode(countryOf(place));
    return code ? `https://flagcdn.com/w40/${code}.png` : "";
  };

  // The treatments index: the hospitals offering a treatment are the ones
  // whose services mention its first word.
  let selected = $state(0);
  let treatment = $derived(content.treatments[Math.min(selected, content.treatments.length - 1)]);
  const keyword = (title: string) => title.toLowerCase().split(/[\s-]+/)[0];
  let offering = $derived(
    records.filter((record) =>
      (record.services ?? []).some((service: any) => String(service.title).toLowerCase().includes(keyword(treatment.title))),
    ),
  );
  function onTabKey(event: KeyboardEvent) {
    const last = content.treatments.length - 1;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") selected = selected === last ? 0 : selected + 1;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") selected = selected === 0 ? last : selected - 1;
    else return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>("button")[selected]?.focus();
  }

  // The directory's filters.
  let query = $state("");
  let country = $state("All");
  let countries = $derived(["All", ...new Set(records.map((record) => record.country))]);
  let filtered = $derived(
    records.filter((record) => {
      const haystack = `${record.name} ${record.city} ${record.country} ${record.description} ${(record.services ?? []).map((s: any) => s.title).join(" ")}`.toLowerCase();
      return (country === "All" || record.country === country) && haystack.includes(query.trim().toLowerCase());
    }),
  );
</script>

<main class="care">
  <section class="hero">
    <div class="chips" aria-hidden="true">
      {#each places as place, i}
        <span class={`place place-${i}`}>
          <MapPin size={13} />{place}{#if flagSrc(place)}<img src={flagSrc(place)} alt="" width="40" height="30" loading="lazy" referrerpolicy="no-referrer" />{/if}
        </span>
      {/each}
    </div>
    <span class="eyebrow">{content.hero.eyebrow}</span>
    <h1>{content.hero.title}</h1>
    <p class="specialty"><RotatingWord words={content.hero.specialties} prefix={`${content.hero.title} `} interval={2600} /></p>
    <p class="tagline">{content.hero.tagline}</p>
    <ol class="pathway" aria-label="How treatment abroad is arranged">
      {#each content.hero.pathway as node, i}{@const Icon = icons[node.icon] || Check}
        <li class:lit={reduced || i <= lit}>
          <i><Icon size={18} /></i>
          <b>{node.title}</b>
          <small>{node.description}</small>
        </li>
      {/each}
    </ol>
    <div class="lede">
      <p>{content.hero.description}</p>
      <div>
        <a class="primary" href={applyHref("HEALTHCARE")}>{content.hero.primary}<ArrowRight size={18} /></a>
        <a class="ghost" href="#hospitals">{content.hero.secondary}</a>
      </div>
    </div>
  </section>

  <section class="section index" id="treatments" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.treatmentsHeading.eyebrow}</span>
      <h2>{content.treatmentsHeading.title}</h2>
      <p>{content.treatmentsHeading.description}</p>
    </header>
    <div class="index-body">
      <div class="tabs" role="tablist" aria-label="Specialties" tabindex="-1" onkeydown={onTabKey}>
        {#each content.treatments as item, i}
          <button
            type="button"
            role="tab"
            id={`treatment-tab-${i}`}
            aria-selected={i === selected}
            aria-controls="treatment-panel"
            tabindex={i === selected ? 0 : -1}
            class:on={i === selected}
            onclick={() => (selected = i)}
          >
            <i>0{i + 1}</i><span>{item.title}</span>
          </button>
        {/each}
      </div>
      <div class="panel" id="treatment-panel" role="tabpanel" aria-labelledby={`treatment-tab-${selected}`}>
        {#key treatment.title}
          <article in:fade={{ duration: reduced ? 0 : 260 }}>
            <img src={treatment.image} alt="" width="1600" height="1067" loading="lazy" decoding="async" />
            <div class="panel-copy">
              <h3>{treatment.title}</h3>
              <p>{treatment.description}</p>
              <small>USUAL PROCEDURES</small>
              <ul class="procedures">
                {#each treatment.procedures as procedure}<li>{procedure}</li>{/each}
              </ul>
              {#if offering.length}
                <small>AVAILABLE AT</small>
                <ul class="offering">
                  {#each offering as hospital}<li><a href="#hospitals"><Hospital size={14} />{hospital.name}<span>{hospital.city}</span></a></li>{/each}
                </ul>
              {/if}
              <a class="pill" href={applyHref("HEALTHCARE", "enquiry", treatment.title)}>{treatment.cta}<ArrowRight size={17} /></a>
            </div>
          </article>
        {/key}
      </div>
    </div>
  </section>

  <section class="band" id="hospitals" use:reveal>
    <div class="section band-inner">
      <header class="heading">
        <span class="eyebrow">{content.directory.eyebrow}</span>
        <h2>{content.directory.title}</h2>
        <p>{content.directory.description}</p>
      </header>
      {#if records.length}
        <div class="filters">
          <label><Search size={18} /><input bind:value={query} placeholder="Search hospitals or services" aria-label="Search hospitals or services" /></label>
          <select bind:value={country} aria-label="Filter by country">{#each countries as item}<option>{item}</option>{/each}</select>
        </div>
        <div class="hospital-grid">
          {#each filtered as record (record.id ?? record.name)}
            <article class="hospital">
              <header>
                <b>{record.name}</b>
                <span>{#if flagSrc(`${record.city}, ${record.country}`)}<img src={flagSrc(`${record.city}, ${record.country}`)} alt="" width="40" height="30" loading="lazy" referrerpolicy="no-referrer" />{/if}{record.city}, {record.country}</span>
              </header>
              {#if record.image}<img class="hospital-photo" src={record.image} alt={record.name} loading="lazy" decoding="async" />{/if}
              <div class="hospital-copy">
                <p>{record.description}</p>
                {#if record.services?.length}<ul class="tags">{#each record.services.slice(0, 3) as service}<li>{service.title}</li>{/each}</ul>{/if}
                <a href={applyHref("HEALTHCARE", "enquiry", record.name)}>Request hospital connection <ArrowRight size={15} /></a>
              </div>
            </article>
          {/each}
        </div>
        {#if !filtered.length}<div class="none"><p>No hospitals match that search. Try another country or a different word.</p></div>{/if}
      {:else}
        <div class="none">
          <p>Our hospital list is being updated. Tell us what treatment you need and we will suggest suitable hospitals.</p>
          <a class="pill" href={applyHref("HEALTHCARE", "enquiry", content.directory.title)}>Ask about hospitals<ArrowRight size={17} /></a>
        </div>
      {/if}
    </div>
  </section>

  <section class="section journey" id="process" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.process.eyebrow}</span>
      <h2>{content.process.title}</h2>
      <p>{content.process.description}</p>
    </header>
    <ol class="timeline">
      {#each content.process.steps as step, i}
        <li class:right={i % 2 === 1}>
          <i>{step.number}</i>
          <div>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </li>
      {/each}
    </ol>
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

  <section class="closing" use:reveal>
    <div>
      <h2>{content.closing.title}</h2>
      <p>{content.closing.description}</p>
    </div>
    <div>
      <a class="primary" href={applyHref("HEALTHCARE")}>{content.closing.primary}<ArrowRight size={17} /></a>
      <a class="outline" href="/contact">{content.closing.secondary}</a>
    </div>
  </section>
</main>

<style>
  /* The site's palette: navy for headings and dark surfaces, gold for actions
     and accents. The hero is light and calm, the counterpart of Business's. */
  .care {
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
  .care :global(::selection) {
    background: var(--ink);
    color: #fff;
  }
  .care :is(a, button, input, select):focus-visible {
    outline: 3px solid rgba(199, 152, 54, 0.55);
    outline-offset: 3px;
  }
  .care :is(.closing, .reviews-panel) a:focus-visible {
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

  /* Hero: a light panel with the specialty in gold and the pathway under it. */
  .hero {
    position: relative;
    isolation: isolate;
    display: flex;
    flex-direction: column;
    align-items: center;
    border-radius: 1.25rem;
    background: #fdfdfb;
    background-image: radial-gradient(#d8dfe6 2px, transparent 2px);
    background-size: 32px 32px;
    background-position: center;
    box-shadow: inset 0 0 100px 80px #fdfdfb;
    color: var(--ink);
    text-align: center;
    padding: 1.65rem 0.75rem 1.75rem;
  }
  .hero > :not(.chips) {
    position: relative;
    z-index: 1;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.5rem;
    width: 100%;
    margin-bottom: 1.1rem;
    pointer-events: none;
  }
  .place {
    --drift: 5px;
    position: relative;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.4rem 0.7rem;
    border: 1px solid #d7dce3;
    border-radius: 99rem;
    background: #fff;
    color: var(--ink);
    font-size: 0.72rem;
    font-weight: 750;
    white-space: nowrap;
    box-shadow: 0 0.4rem 1rem #17304f1a;
  }
  .place :global(svg) {
    color: var(--accent-deep);
  }
  .place img {
    width: 1.1rem;
    height: 0.8rem;
    border-radius: 0.15rem;
    object-fit: cover;
  }
  .place-0 { animation: float-a 8s ease-in-out infinite; }
  .place-1 { animation: float-b 9s ease-in-out infinite; }
  .place-2,
  .place-3 { display: none; }
  @keyframes float-a {
    50% { transform: translate(var(--drift), calc(var(--drift) * -1.3)); }
  }
  @keyframes float-b {
    50% { transform: translate(calc(var(--drift) * -1.3), var(--drift)); }
  }
  .hero h1 {
    font-size: clamp(1.9rem, 7vw, 4rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    margin: 0.5rem 0 0;
    font-weight: 800;
    text-wrap: balance;
  }
  .specialty {
    margin: 0;
    font-size: clamp(2rem, 8.5vw, 4.8rem);
    line-height: 1.12;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: var(--accent-deep);
  }
  .tagline {
    margin: 0.7rem 0 0;
    font-size: clamp(1rem, 3.7vw, 1.4rem);
    font-weight: 600;
    color: var(--muted);
  }

  /* The pathway: three steps on a line that fills from left to right. */
  .pathway {
    position: relative;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
    width: 100%;
    max-width: 52rem;
    margin: 1.6rem auto 0;
    padding: 0;
    list-style: none;
    counter-reset: none;
  }
  .pathway::before,
  .pathway::after {
    content: "";
    position: absolute;
    top: 1.35rem;
    left: 16.6%;
    right: 16.6%;
    height: 2px;
    border-radius: 2px;
    background: var(--line);
  }
  .pathway::after {
    right: auto;
    width: 0;
    background: var(--accent);
    animation: fill 6s linear infinite;
  }
  @keyframes fill {
    0% { width: 0; }
    30% { width: 0; }
    63% { width: 33.4%; }
    96% { width: 66.8%; }
    100% { width: 66.8%; }
  }
  .pathway li {
    position: relative;
    z-index: 1;
    display: grid;
    justify-items: center;
    gap: 0.35rem;
    text-align: center;
  }
  .pathway i {
    width: 2.75rem;
    height: 2.75rem;
    display: grid;
    place-items: center;
    border: 2px solid var(--line);
    border-radius: 50%;
    background: #fff;
    color: var(--muted);
    transition:
      background-color 400ms ease,
      color 400ms ease,
      border-color 400ms ease,
      box-shadow 400ms ease;
  }
  .pathway li.lit i {
    border-color: var(--ink);
    background: var(--ink);
    color: var(--on-ink-gold);
    box-shadow: 0 0.4rem 1rem #17304f33;
  }
  .pathway b {
    font-size: 0.86rem;
    color: var(--ink);
    line-height: 1.2;
  }
  .pathway small {
    display: none;
    font-size: 0.74rem;
    line-height: 1.45;
    color: var(--muted);
    max-width: 14rem;
  }
  .lede {
    width: 100%;
    max-width: 40rem;
    margin: 0 auto;
    padding: 1.4rem 0.25rem 0;
  }
  .lede p {
    margin: 0;
    line-height: 1.7;
    color: var(--muted);
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

  /* Treatments index: specialty tabs beside the chosen one's panel. */
  .index-body {
    display: grid;
    gap: 1rem;
  }
  .tabs {
    display: flex;
    gap: 0.5rem;
    overflow-x: auto;
    padding: 0.2rem 0.2rem 0.6rem;
    scroll-snap-type: x proximity;
    overscroll-behavior-inline: contain;
  }
  .tabs button {
    flex: none;
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    min-height: 2.9rem;
    padding: 0.55rem 1rem 0.55rem 0.8rem;
    border: 1px solid #d7dce3;
    border-radius: 99rem;
    background: #fff;
    color: var(--ink);
    font: inherit;
    font-size: 0.86rem;
    font-weight: 750;
    cursor: pointer;
    scroll-snap-align: start;
    transition:
      background-color 160ms ease,
      color 160ms ease,
      border-color 160ms ease,
      transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .tabs i {
    font-style: normal;
    font-size: 0.7rem;
    font-weight: 800;
    color: var(--accent-text);
    font-variant-numeric: tabular-nums;
  }
  .tabs button.on {
    border-color: var(--ink);
    background: var(--ink);
    color: #fff;
  }
  .tabs button.on i {
    color: var(--on-ink-gold);
  }
  .panel {
    display: grid;
  }
  .panel article {
    grid-area: 1 / 1;
    display: grid;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 1.25rem;
    background: #fff;
    box-shadow: 0 0.8rem 2rem #17304f14;
  }
  .panel article > img {
    width: 100%;
    aspect-ratio: 16 / 9;
    object-fit: cover;
  }
  .panel-copy {
    display: grid;
    gap: 0.6rem;
    padding: 1.4rem;
    align-content: start;
  }
  .panel-copy h3 {
    margin: 0;
    font-size: 1.5rem;
    letter-spacing: -0.02em;
    color: var(--ink);
    font-weight: 800;
  }
  .panel-copy p {
    margin: 0;
    line-height: 1.7;
    overflow-wrap: anywhere;
  }
  .panel-copy small {
    margin-top: 0.4rem;
    font-size: 0.68rem;
    letter-spacing: 0.13em;
    font-weight: 800;
    color: var(--accent-text);
  }
  .procedures,
  .offering,
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .procedures li,
  .tags li {
    padding: 0.45rem 0.75rem;
    border: 1px solid var(--line);
    border-radius: 99rem;
    background: #f6f7f6;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text);
  }
  .offering a {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    min-height: 2.5rem;
    padding: 0.3rem 0.8rem 0.3rem 0.65rem;
    border-radius: 99rem;
    background: var(--ink-soft);
    color: var(--ink);
    font-size: 0.8rem;
    font-weight: 750;
    text-decoration: none;
  }
  .offering a span {
    color: var(--muted);
    font-weight: 600;
  }
  .panel-copy .pill {
    justify-self: start;
    margin-top: 0.6rem;
  }

  /* Partner hospitals: a cream band with the live directory. */
  .band {
    background: var(--accent-soft);
    margin-inline: -1rem;
    padding-inline: 1rem;
  }
  .band-inner {
    max-width: 88rem;
    margin-inline: auto;
  }
  .filters {
    display: grid;
    gap: 0.6rem;
    margin-bottom: 1rem;
  }
  .filters label {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    padding: 0 0.8rem;
    border: 1px solid #d7dce3;
    border-radius: 0.7rem;
    background: #fff;
    color: var(--muted);
  }
  .filters input,
  .filters select {
    min-height: 3rem;
    width: 100%;
    border: 0;
    background: transparent;
    outline: 0;
    font: inherit;
    font-size: 1rem;
    color: var(--ink);
    caret-color: var(--accent);
  }
  .filters label:focus-within,
  .filters select:focus-visible {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px rgba(199, 152, 54, 0.2);
  }
  .filters > select {
    padding: 0 0.8rem;
    border: 1px solid #d7dce3;
    border-radius: 0.7rem;
    background: #fff;
  }
  .hospital-grid {
    display: grid;
    gap: 1rem;
  }
  .hospital {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 1rem;
    background: #fff;
    box-shadow: 0 0.6rem 1.6rem #17304f12;
    transition:
      transform 220ms cubic-bezier(0.23, 1, 0.32, 1),
      box-shadow 220ms ease;
  }
  .hospital > header {
    display: grid;
    gap: 0.25rem;
    padding: 1rem 1.2rem;
    background: var(--ink-panel);
    color: #fff;
  }
  .hospital > header b {
    font-size: 1.05rem;
    line-height: 1.25;
  }
  .hospital > header span {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.76rem;
    color: var(--on-ink);
  }
  .hospital > header img {
    width: 1.1rem;
    height: 0.8rem;
    border-radius: 0.15rem;
    object-fit: cover;
  }
  .hospital-photo {
    width: 100%;
    height: 11rem;
    object-fit: cover;
  }
  .hospital-copy {
    display: grid;
    gap: 0.7rem;
    padding: 1.1rem 1.2rem 1.2rem;
  }
  .hospital-copy p {
    margin: 0;
    overflow-wrap: anywhere;
    font-size: 0.86rem;
    line-height: 1.6;
    color: var(--muted);
  }
  .hospital-copy a {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.5rem;
    margin-top: auto;
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

  /* Your pathway, step by step: a timeline that zigzags on wide screens. */
  .timeline {
    position: relative;
    display: grid;
    gap: 1.2rem;
    margin: 0;
    padding: 0 0 0 3.4rem;
    list-style: none;
  }
  .timeline::before {
    content: "";
    position: absolute;
    top: 0.6rem;
    bottom: 0.6rem;
    left: 1.2rem;
    width: 2px;
    border-radius: 2px;
    background: var(--accent);
    opacity: 0.55;
  }
  .timeline li {
    position: relative;
  }
  .timeline i {
    position: absolute;
    top: 0.9rem;
    left: -3.4rem;
    width: 2.5rem;
    height: 2.5rem;
    display: grid;
    place-items: center;
    border: 3px solid #fafaf7;
    border-radius: 50%;
    background: var(--ink);
    color: var(--on-ink-gold);
    font-style: normal;
    font-size: 0.78rem;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    box-shadow: 0 0.3rem 0.8rem #17304f2e;
  }
  .timeline li > div {
    padding: 1.1rem 1.2rem;
    border: 1px solid var(--line);
    border-radius: 1rem;
    background: #fff;
    box-shadow: 0 0.5rem 1.4rem #17304f0f;
  }
  .timeline h3 {
    margin: 0 0 0.3rem;
    font-size: 1.05rem;
    color: var(--ink);
    font-weight: 800;
  }
  .timeline p {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.6;
  }

  /* Care with clarity: the points and the stats in one navy panel. */
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

  /* Patient stories: a navy panel under a photo, with the slideshow beside it. */
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
  .tabs button:active {
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
    .outline:hover {
      background: #ffffff14;
      transform: translateY(-2px);
    }
    .tabs button:not(.on):hover {
      background: var(--ink-soft);
    }
    .hospital:hover {
      transform: translateY(-0.35rem);
      box-shadow: 0 1.2rem 2.5rem #17304f1f;
    }
    .hospital-copy a:hover,
    .offering a:hover {
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
    .pathway small {
      display: block;
    }
    .filters {
      grid-template-columns: 1fr 14rem;
    }
    .hospital-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .stats {
      grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
    }
  }
  @media (min-width: 48rem) {
    .care {
      padding-inline: 2rem;
    }
    /* The hero fills what is left of the first screen below the fixed header, never more. */
    .hero {
      justify-content: center;
      min-height: min(calc(100svh - 11rem), 46rem);
      padding: 2.6rem 2rem 2.8rem;
    }
    .chips {
      position: absolute;
      inset: 0;
      z-index: 0;
      display: block;
      margin: 0;
    }
    .place {
      --drift: 14px;
      position: absolute;
      font-size: 0.8rem;
      padding: 0.5rem 0.9rem;
    }
    .place-0 { top: 14%; left: 8%; }
    .place-1 { top: 11%; right: 8%; }
    .place-2 { display: inline-flex; top: 36%; left: 5%; animation: float-b 7s ease-in-out infinite; }
    .place-3 { display: inline-flex; top: 38%; right: 5%; animation: float-a 8.5s ease-in-out infinite; }
    .hero h1 {
      margin-top: 0.8rem;
    }
    .tagline {
      margin-top: 1rem;
    }
    .pathway {
      margin-top: 2.2rem;
    }
    .lede {
      padding-top: 2rem;
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
    .panel article {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
    }
    .panel article > img {
      height: 100%;
      aspect-ratio: auto;
      min-height: 22rem;
    }
    .panel-copy {
      padding: 1.8rem;
    }
    .timeline {
      padding-left: 0;
      gap: 0;
    }
    .timeline::before {
      left: 50%;
      transform: translateX(-50%);
    }
    .timeline li {
      width: 50%;
      padding: 0 2.6rem 1.4rem 0;
    }
    .timeline li.right {
      margin-left: 50%;
      padding: 0 0 1.4rem 2.6rem;
    }
    .timeline i {
      left: auto;
      right: -1.25rem;
    }
    .timeline li.right i {
      right: auto;
      left: -1.25rem;
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
    .index-body {
      grid-template-columns: minmax(0, 0.78fr) minmax(0, 1.22fr);
      align-items: start;
    }
    .tabs {
      flex-direction: column;
      overflow: visible;
      padding: 0;
    }
    .tabs button {
      width: 100%;
      justify-content: flex-start;
      min-height: 3.4rem;
      padding: 0.8rem 1.1rem;
      border-radius: 0.9rem;
      font-size: 1rem;
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
    .care {
      padding-inline: clamp(2rem, 5vw, 5rem);
    }
    .band {
      margin-inline: calc(clamp(2rem, 5vw, 5rem) * -1);
      padding-inline: clamp(2rem, 5vw, 5rem);
    }
    .hospital-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .place {
      animation: none;
    }
    .pathway::after {
      animation: none;
      width: 66.8%;
    }
    .pathway i,
    .hospital,
    .primary,
    .ghost,
    .outline,
    .pill,
    .tabs button {
      transition: none;
    }
  }
</style>
