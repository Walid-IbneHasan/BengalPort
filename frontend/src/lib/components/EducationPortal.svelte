<script lang="ts">
  import { onMount } from "svelte";
  import { fade } from "svelte/transition";
  import {
    ArrowRight,
    Award,
    BookOpen,
    BriefcaseBusiness,
    Building2,
    Check,
    Cog,
    Compass,
    FileText,
    Globe2,
    MapPin,
    Search,
    Settings,
    Star,
    Stethoscope,
  } from "lucide-svelte";
  import type { EducationContent } from "$lib/division-content";
  import type { PublicReview } from "$lib/reviews";
  import ReviewCards from "./ReviewCards.svelte";
  import { applyHref } from "$lib/apply-route";
  import {
    destinations,
    fieldKeys,
    fieldPrograms,
    institutionFields,
    type FieldKey,
  } from "$lib/education";
  // `reviews` are the approved reviews of education customers.
  let {
    content,
    records,
    reviews = [],
  }: { content: EducationContent; records: any[]; reviews?: PublicReview[] } = $props();
  const icons: Record<string, any> = {
    map: MapPin,
    building: Building2,
    book: BookOpen,
    stethoscope: Stethoscope,
    award: Award,
    compass: Compass,
    search: Search,
    file: FileText,
    briefcase: BriefcaseBusiness,
    settings: Settings,
  };
  const fieldIcons = { medical: Stethoscope, engineering: Cog, general: BookOpen };
  // The four options at the top of the page, in the order of the sections
  // they lead to.
  let options = $derived([
    ...fieldKeys.map((key) => ({
      id: key as string,
      icon: fieldIcons[key],
      title: content.fields[key].title,
      tagline: content.fields[key].tagline,
      image: content.fields[key].image,
    })),
    {
      id: "reviews",
      icon: Star,
      title: content.reviews.title,
      tagline: content.reviews.tagline,
      image: content.reviews.image,
    },
  ]);
  let fields = $derived(
    fieldKeys.map((key) => ({
      key,
      icon: fieldIcons[key],
      ...content.fields[key],
      programs: fieldPrograms(records, key),
    })),
  );
  let places = $derived(destinations(records));
  let query = $state(""),
    country = $state("All"),
    field = $state<"all" | FieldKey>("all");
  let countries = $derived(["All", ...places.map((x) => x.country)]);
  let filtered = $derived.by(() =>
    records.filter((x) => {
      const haystack =
        `${x.name} ${x.country} ${x.description} ${x.programs?.map((y: any) => `${y.title} ${y.discipline}`).join(" ") || ""}`.toLowerCase();
      return (
        (country === "All" || x.country === country) &&
        (field === "all" || institutionFields(x).includes(field)) &&
        haystack.includes(query.trim().toLowerCase())
      );
    }),
  );
  // Links into the directory open it already narrowed down.
  function showField(key: FieldKey) {
    field = key;
    country = "All";
    query = "";
  }
  function showCountry(name: string) {
    country = name;
    field = "all";
    query = "";
  }
  const count = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;
  const flagCodes = ["no", "uz", "ru", "us", "gb", "ca", "fr", "fi", "se", "ch", "jp", "au", "my"];
  let flagStates = $state(["gb", "fi", "ca", "fr"]);
  let place = $state(0);
  let heroCountries = $derived(places.length ? places.map(x => x.country) : ["UK", "USA", "Canada", "Australia", "Malaysia"]);

  onMount(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (heroCountries.length > 1) place = (place + 1) % heroCountries.length;
    }, 2400);

    const flagTimer = setInterval(() => {
      flagStates = flagStates.map(() => flagCodes[Math.floor(Math.random() * flagCodes.length)]);
    }, 3500);

    return () => {
      clearInterval(timer);
      clearInterval(flagTimer);
    };
  });
  function reveal(node: HTMLElement) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return {};
    node.style.opacity = "0";
    node.style.transform = "translateY(24px)";
    node.style.transition =
      "opacity 620ms cubic-bezier(.23,1,.32,1),transform 620ms cubic-bezier(.23,1,.32,1)";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => {
            node.style.opacity = "1";
            node.style.transform = "none";
          });
          observer.disconnect();
        }
      },
      { threshold: 0.12 },
    );
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
  }
</script>

<main class="edu">
  <section class="hero">
    {#each flagStates as code, i}
      <div class={`flag-ball flag-ball-${i}`}>
        {#key code}
          <img src={`https://flagcdn.com/w160/${code}.png`} alt="" aria-hidden="true" transition:fade={{ duration: 600 }} />
        {/key}
      </div>
    {/each}
    <span class="eyebrow">{content.hero.eyebrow}</span>
    <h1>Study Abroad</h1>
    <p class="places">
      <span class="sr">Study in {heroCountries.join(", ")}</span>
      <span aria-hidden="true" class="places-inner">
        {#key place}<b>{heroCountries[place % heroCountries.length]}</b>{/key}
      </span>
    </p>
    <p class="tagline">{content.hero.tagline}</p>
    <nav class="options" aria-label="Education options">
      {#each options as option}{@const Icon = option.icon}<a
          class="option"
          data-option={option.id}
          href={`#${option.id}`}
        >
          <span class="option-art">
            {#if option.image}<img src={option.image} alt="" role="presentation" />{/if}
          </span>
          <span class="option-label">
            <b>{option.title}</b><small>{option.tagline}</small>
          </span>
        </a>{/each}
    </nav>
    <div class="lede">
      <p>{content.hero.description}</p>
      <div>
        <a class="primary" href={applyHref("EDUCATION")}
          >{content.hero.primary}<ArrowRight size={18} /></a
        ><a class="ghost" href="#directory">{content.hero.secondary}</a>
      </div>
    </div>
  </section>

  {#each fields as item, i}{@const Icon = item.icon}
    <section class="field" class:flip={i % 2 === 1} id={item.key} use:reveal>
      <div class="field-copy">
        <span class="eyebrow">{item.title.toUpperCase()}</span>
        <h2>{item.heading}</h2>
        <p>{item.description}</p>
        <ul class="points">
          {#each item.points as point}<li><i><Check size={14} /></i>{point}</li>{/each}
        </ul>
        <div class="actions">
          <a class="pill" href={applyHref("EDUCATION")}
            >{item.cta}<ArrowRight size={17} /></a
          ><a class="text-link" href={applyHref("EDUCATION", "enquiry", item.heading)}
            >Ask a question</a
          >
        </div>
      </div>
      <div class="field-card">
        <div class="field-mark">
          <i><Icon /></i><span>0{i + 1}</span>
        </div>
        <small>POPULAR SUBJECTS</small>
        <ul class="subjects">
          {#each item.subjects as subject}<li>{subject}</li>{/each}
        </ul>
        {#if item.programs.length}<div class="listed">
            <small>IN OUR DIRECTORY</small>
            <ul>
              {#each item.programs.slice(0, 3) as program}<li>
                  <b>{program.title}</b><span
                    >{program.institution}, {program.country}</span
                  >
                </li>{/each}
            </ul>
            <a href="#directory" onclick={() => showField(item.key)}
              >See {item.title.toLowerCase()} institutions <ArrowRight size={15} /></a
            >
          </div>{/if}
      </div>
    </section>{/each}

  <section class="reviews" class:empty={!reviews.length} id="reviews" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.reviews.eyebrow}</span>
      <h2>{content.reviews.heading}</h2>
    </header>
    <div class="reviews-body">
      <div class="reviews-panel">
        <p>{content.reviews.description}</p>
        <p class="invite">{content.reviews.invite}</p>
        <a class="primary" href="/dashboard"
          >{content.reviews.cta}<ArrowRight size={17} /></a
        >
      </div>
      {#if reviews.length}<ReviewCards {reviews} />{/if}
    </div>
  </section>

  {#if places.length}<section class="section destinations" id="destinations" use:reveal>
      <header class="heading">
        <span class="eyebrow">{content.destinations.eyebrow}</span>
        <h2>{content.destinations.title}</h2>
        <p>{content.destinations.description}</p>
      </header>
      <div class="place-grid">
        {#each places as item}<a
            class="place-card"
            href="#directory"
            onclick={() => showCountry(item.country)}
            >{#if item.image}<img src={item.image} alt="" loading="lazy" decoding="async" />{/if}<span
              ><b>{item.country}</b><small
                >{count(item.institutions, "institution")} · {count(item.programs, "program")}</small
              ></span
            ></a
          >{/each}
      </div>
    </section>{/if}

  <section class="section services" id="services" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.services.eyebrow}</span>
      <h2>{content.services.title}</h2>
      <p>{content.services.description}</p>
    </header>
    <div class="service-grid">
      {#each content.services.items as item}{@const Icon =
          icons[item.icon] || Compass}<a href={item.href}
          ><i><Icon size={26} /></i>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <strong>Explore <ArrowRight size={15} /></strong></a
        >{/each}
    </div>
  </section>

  <section class="stats" use:reveal>
    {#each content.stats as stat}{@const Icon = icons[stat.icon] || Globe2}
      <article>
        <Icon size={27} /><b>{stat.value}</b><span>{stat.label}</span>
      </article>{/each}
  </section>

  <section class="section feature" use:reveal>
    <div class="feature-copy">
      <span class="eyebrow">{content.feature.eyebrow}</span>
      <h2>{content.feature.title}</h2>
      <p>{content.feature.description}</p>
    </div>
    <div class="feature-points">
      {#each content.feature.points as point, i}<article>
          <i>0{i + 1}</i>
          <div>
            <h3>{point.title}</h3>
            <p>{point.description}</p>
          </div>
        </article>{/each}
    </div>
  </section>

  <section class="directory" id="directory" use:reveal>
    <div class="section directory-inner">
      <header class="heading">
        <span class="eyebrow">{content.directory.eyebrow}</span>
        <h2>{content.directory.title}</h2>
        <p>{content.directory.description}</p>
      </header>
      {#if records.length}<div class="field-filter" role="group" aria-label="Filter by field of study">
        <button type="button" class:on={field === "all"} aria-pressed={field === "all"} onclick={() => (field = "all")}
          >All fields</button
        >{#each fieldKeys as key}<button
            type="button"
            class:on={field === key}
            aria-pressed={field === key}
            onclick={() => (field = key)}>{content.fields[key].title}</button
          >{/each}
      </div>
      <div class="filters">
        <label
          ><Search size={18} /><input
            bind:value={query}
            placeholder="Search institutions or programs"
            aria-label="Search institutions or programs"
          /></label
        ><select bind:value={country} aria-label="Filter by country"
          >{#each countries as item}<option>{item}</option>{/each}</select
        >
      </div>
      <div class="record-grid">
        {#each filtered as record}<a
            class="record"
            href={applyHref("EDUCATION", "enquiry", record.name)}
            ><div class="record-image">
              <img src={record.image} alt={record.name} loading="lazy" decoding="async" /><span
                ><MapPin size={13} />{record.country}</span
              >
            </div>
            <div class="record-copy">
              <small>INSTITUTION</small>
              <h3>{record.name}</h3>
              <p>{record.description}</p>
              <div class="tags">
                {#each (record.programs ?? []).slice(0, 3) as item}<span>{item.title}</span>{/each}
              </div>
              <strong>View programs & enquire <ArrowRight size={15} /></strong>
            </div></a
          >{/each}
      </div>
      {#if !filtered.length}<div class="none">
          No matching institutions. Try a different field, country or search.
        </div>{/if}{:else}<div class="none">
          <p>Our list of institutions is being updated. Tell us what you want to study and we will suggest suitable options.</p>
          <a class="pill" href={applyHref("EDUCATION", "enquiry", content.directory.title)}
            >Ask about institutions<ArrowRight size={17} /></a
          >
        </div>{/if}
    </div>
  </section>

  <section class="section process" id="process" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.process.eyebrow}</span>
      <h2>{content.process.title}</h2>
      <p>{content.process.description}</p>
    </header>
    <div class="steps">
      {#each content.process.steps as step}<article>
          <i>{step.number}</i>
          <h3>{step.title}</h3>
          <p>{step.description}</p>
        </article>{/each}
    </div>
  </section>

  <section class="closing" use:reveal>
    <div>
      <h2>{content.closing.title}</h2>
      <p>{content.closing.description}</p>
    </div>
    <div>
      <a class="primary" href={applyHref("EDUCATION")}
        >{content.closing.primary}<ArrowRight size={17} /></a
      ><a class="outline" href="/contact">{content.closing.secondary}</a>
    </div>
  </section>
</main>

<style>
  .edu {
    --accent: #e61a24;
    --accent-soft: #f1f5f9;
    --accent-deep: #0f0a59;
    background: #f8f9fa;
    color: #475569;
    padding: 0.75rem 1rem 5rem;
    overflow: clip;
  }
  .hero,
  .lede,
  .field,
  .reviews,
  .section,
  .stats,
  .closing {
    width: 100%;
    max-width: 88rem;
    margin-inline: auto;
  }
  /* Sections are reached from the options and from links elsewhere; they
     stop below the fixed site header. A section still waiting to fade in
     sits 24px low, which the margin allows for. */
  .field,
  .reviews,
  .section,
  .directory {
    scroll-margin-top: 6.2rem;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .eyebrow {
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    font-weight: 800;
    color: #e61a24;
  }

  /* Hero: a centred title, then the four options straight below it. */
  .hero {
    position: relative;
    isolation: isolate;
    border-radius: 1.25rem;
    background: #fdfdfd;
    background-image: radial-gradient(#d8e1e9 2px, transparent 2px);
    background-size: 32px 32px;
    background-position: center;
    color: #0e1133;
    text-align: center;
    padding: 3rem 1rem 4rem;
    min-height: 90vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    box-shadow: inset 0 0 100px 80px #fdfdfd;
  }
  .hero-bg {
    display: none;
  }
  .hero::after {
    display: none;
  }
  @keyframes float-1 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(15px, -20px); }
  }
  @keyframes float-2 {
    0%, 100% { transform: translate(0, 0); }
    50% { transform: translate(-20px, 15px); }
  }
  .flag-ball {
    position: absolute;
    width: clamp(2.5rem, 6vw, 4rem);
    height: clamp(2.5rem, 6vw, 4rem);
    border-radius: 50%;
    overflow: hidden;
    box-shadow: 0 8px 16px rgba(0,0,0,0.12);
    z-index: 10;
    border: 3px solid #fff;
    pointer-events: none;
  }
  .flag-ball img {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .flag-ball-0 { top: 12%; left: 18%; animation: float-1 8s ease-in-out infinite; }
  .flag-ball-1 { top: 8%; right: 15%; animation: float-2 9s ease-in-out infinite; }
  .flag-ball-2 { top: 28%; left: 12%; animation: float-2 7s ease-in-out infinite; }
  .flag-ball-3 { top: 32%; right: 12%; animation: float-1 8.5s ease-in-out infinite; }
  
  .hero .eyebrow {
    color: #415367;
  }
  .hero h1 {
    font-size: clamp(2.2rem, 8vw, 4.8rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    margin: 0.8rem 0 0.5rem;
    text-wrap: balance;
    color: #0e1133;
    font-weight: 800;
  }
  .tagline {
    margin: 1.5rem 0 0;
    font-size: clamp(1rem, 3.7vw, 1.4rem);
    font-weight: 600;
    color: #5d6e80;
  }
  .places {
    margin: 0.2rem 0 0;
    font-size: clamp(2rem, 8vw, 4.8rem);
    font-weight: 900;
    color: #e61a24;
    position: relative;
    z-index: 2;
  }
  .places b {
    display: inline-block;
    color: #e61a24;
    font-weight: 900;
    animation: place-in 420ms var(--ease-out);
  }
  @keyframes place-in {
    from {
      opacity: 0;
      transform: translateY(0.45em);
    }
  }

  /* The four options. On a phone they are two by two and sit in the first
     screen; their height follows the screen's so a short screen still shows
     all four. */
  .options {
    position: relative;
    z-index: 2;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
    width: 100%;
    max-width: 76rem;
    margin: 3rem auto 0;
    padding-inline: 1rem;
  }
  .option {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #e2e8f0;
    border-bottom: 5px solid #0f0a59;
    border-radius: 1.25rem;
    background: #fff;
    box-shadow: 0 6px 16px rgba(0,0,0,0.06), 0 2px 4px rgba(0,0,0,0.04);
    color: inherit;
    text-decoration: none;
    transition: all 250ms cubic-bezier(0.2, 0.8, 0.2, 1);
  }
  .option:hover {
    transform: translateY(-6px);
    box-shadow: 0 14px 28px rgba(0,0,0,0.1), 0 4px 8px rgba(0,0,0,0.06);
    border-bottom-color: #e61a24;
  }
  .option-art {
    display: grid;
    place-items: center;
    height: clamp(5rem, 15svh, 8rem);
    background: var(--tint, var(--accent-soft));
    position: relative;
    border-bottom: 3px solid #e61a24;
  }
  .option-art img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: 0;
    opacity: 1;
    transition: transform 500ms ease;
  }
  .option:hover .option-art img {
    transform: scale(1.05);
  }
  .option[data-option="engineering"] {
    --tint: #eaf1f8;
  }
  .option[data-option="general"] {
    --tint: #fbf5e8;
  }
  .option[data-option="reviews"] {
    --tint: #edf7f6;
  }
  .option-label {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.25rem;
    padding: 1.2rem 1rem;
    background: #0f0a59;
    color: #fff;
    text-align: center;
  }
  .option-label b {
    font-size: 1.1rem;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .option-label small {
    font-size: 0.85rem;
    line-height: 1.35;
    color: #cbd5e1;
  }
  .lede {
    width: 100%;
    max-width: 46rem;
    text-align: center;
    margin: 0 auto;
    padding: 2.5rem 0.25rem 0.5rem;
  }
  .lede p {
    margin: 0;
    line-height: 1.7;
    color: #5d6e80;
  }
  .lede > div,
  .closing > div:last-child {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin-top: 1.5rem;
  }
  @media (min-width: 48rem) {
    .lede > div,
    .closing > div:last-child {
      flex-direction: row;
      justify-content: center;
    }
  }
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
      transform 150ms var(--ease-out),
      background-color 180ms ease,
      box-shadow 180ms ease;
  }
  .primary {
    background: #e61a24;
    color: #fff;
    box-shadow: 0 0.6rem 1.4rem #e61a2440;
  }
  .ghost {
    border: 1px solid #cfd8df;
    color: #17304f;
    background: #fff;
  }
  .outline {
    border: 1px solid #ffffff55;
    color: #fff;
  }
  .pill {
    border-radius: 99rem;
    padding-inline: 1.4rem;
    background: #102947;
    color: #fff;
  }

  /* Section headings: centred, with a short gold rule beneath the title. */
  .heading {
    max-width: 46rem;
    margin: 0 auto 2.2rem;
    text-align: center;
  }
  .heading h2,
  .field-copy h2,
  .feature-copy h2,
  .closing h2 {
    font-size: clamp(1.8rem, 6.4vw, 3.2rem);
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: #0f0a59;
    margin: 0.5rem 0 0;
    text-wrap: balance;
    font-weight: 800;
  }
  .heading h2::after {
    content: "";
    display: block;
    width: 4.5rem;
    height: 4px;
    margin: 1.2rem auto 0;
    border-radius: 4px;
    background: #e61a24;
  }
  .heading p {
    margin: 1.2rem 0 0;
    line-height: 1.7;
    color: #4a5568;
  }
  .section {
    padding-block: 4rem;
  }

  /* A field of study: a navy card of subjects beside the explanation. */
  .field {
    display: grid;
    gap: 1.4rem;
    align-items: center;
    padding-block: 2.2rem;
  }
  .field:first-of-type {
    padding-top: 3rem;
  }
  .field-card {
    position: relative;
    overflow: hidden;
    border-radius: 1.25rem;
    background: #fff;
    color: #0e1133;
    padding: 1.8rem;
    box-shadow: 0 4px 16px rgba(0,0,0,0.06);
    border: 1px solid #e2e8f0;
  }
  .field-card::after {
    display: none;
  }
  .field-mark {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1.3rem;
  }
  .field-mark i {
    width: 3.6rem;
    height: 3.6rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #fdfdfd;
    color: #e61a24;
    border: 1px solid #e2e8f0;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
  }
  .field-mark i :global(svg) {
    width: 48%;
    height: 48%;
  }
  .field-mark span {
    font-size: 2.6rem;
    font-weight: 800;
    letter-spacing: -0.04em;
    line-height: 1;
    color: #f1f5f9;
  }
  .field-card small {
    display: block;
    font-size: 0.68rem;
    letter-spacing: 0.13em;
    font-weight: 800;
    color: #e61a24;
  }
  .subjects {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin: 0.7rem 0 0;
    padding: 0;
    list-style: none;
  }
  .subjects li {
    padding: 0.45rem 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 99rem;
    background: #f8f9fa;
    font-size: 0.8rem;
    font-weight: 600;
    color: #334155;
  }
  .listed {
    margin-top: 1.3rem;
    padding-top: 1.2rem;
    border-top: 1px solid #e2e8f0;
  }
  .listed ul {
    display: grid;
    gap: 0.7rem;
    margin: 0.7rem 0 1rem;
    padding: 0;
    list-style: none;
  }
  .listed b,
  .listed li span {
    display: block;
  }
  .listed b {
    font-size: 0.9rem;
  }
  .listed li span {
    margin-top: 0.1rem;
    font-size: 0.76rem;
    color: #64748b;
  }
  .listed a {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.75rem;
    color: #e61a24;
    font-size: 0.8rem;
    font-weight: 800;
    text-decoration: none;
  }
  .field-copy p {
    margin: 0.9rem 0 0;
    line-height: 1.75;
    color: #4a5568;
  }
  .points {
    display: grid;
    gap: 0.65rem;
    margin: 1.2rem 0 0;
    padding: 0;
    list-style: none;
  }
  .points li {
    display: grid;
    grid-template-columns: 1.5rem 1fr;
    gap: 0.6rem;
    align-items: start;
    line-height: 1.5;
    color: #33465a;
    font-weight: 600;
    font-size: 0.93rem;
  }
  .points i {
    width: 1.5rem;
    height: 1.5rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #fbf1d9;
    color: #8f6410;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 1.2rem;
    margin-top: 1.5rem;
  }
  .text-link {
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    color: var(--accent);
    font-size: 0.85rem;
    font-weight: 800;
    text-underline-offset: 0.25em;
  }

  /* Student reviews: a navy panel, with the reviews beside it once there
     are some. */
  .reviews {
    padding-block: 3.2rem 1rem;
  }
  .reviews-body {
    display: grid;
    gap: 1rem;
  }
  .reviews-panel {
    border-radius: 1.25rem;
    padding: 1.5rem;
    background: linear-gradient(145deg, #0b2442, #1b3d68);
    color: #fff;
  }
  .reviews-panel p {
    margin: 0;
    line-height: 1.75;
    color: #e3eaf1;
  }
  .reviews-panel .invite {
    margin-top: 0.9rem;
    color: #b9c7d5;
    font-size: 0.9rem;
  }
  .reviews-panel a {
    margin-top: 1.3rem;
  }
  .reviews.empty .reviews-panel {
    max-width: 44rem;
    margin-inline: auto;
    text-align: center;
  }

  /* Destinations: photo cards with the country on a strip along the bottom. */
  .place-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
  }
  .place-card {
    position: relative;
    overflow: hidden;
    aspect-ratio: 3 / 2.3;
    border-radius: 0.8rem;
    background: #102947;
    color: #fff;
    text-decoration: none;
    box-shadow: 0 0.6rem 1.5rem #10264014;
  }
  .place-card img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 450ms var(--ease-out);
  }
  .place-card > span {
    position: absolute;
    inset: auto 0 0;
    padding: 0.6rem 0.5rem 0.65rem;
    background: #0b2442d1;
    text-align: center;
    backdrop-filter: blur(0.25rem);
  }
  .place-card b,
  .place-card small {
    display: block;
  }
  .place-card b {
    font-size: 1rem;
  }
  .place-card small {
    margin-top: 0.1rem;
    font-size: 0.68rem;
    color: #c4d0dc;
  }

  .service-grid {
    display: grid;
    gap: 0.8rem;
  }
  .service-grid > a {
    border: 1px solid #e1e7ea;
    background: #fff;
    border-radius: 1rem;
    padding: 1.35rem;
    min-height: 14rem;
    color: inherit;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    transition:
      transform 200ms var(--ease-out),
      box-shadow 200ms ease,
      border-color 180ms ease;
  }
  .service-grid i {
    width: 3.5rem;
    height: 3.5rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--accent-soft);
    color: var(--accent);
  }
  .service-grid h3 {
    font-size: 1rem;
    color: #17304f;
    margin: 1rem 0 0.45rem;
    text-transform: uppercase;
  }
  .service-grid p {
    font-size: 0.88rem;
    line-height: 1.6;
    color: #687989;
  }
  .service-grid strong {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--accent);
    font-size: 0.78rem;
    margin-top: auto;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    background: #0f0a59;
    color: #fff;
    border-radius: 1.25rem;
    padding: 1.5rem;
    box-shadow: 0 10px 30px rgba(15,10,89,0.1);
  }
  .stats article {
    text-align: center;
    padding: 1rem 0.4rem;
  }
  .stats :global(svg) {
    color: #e61a24;
  }
  .stats b,
  .stats span {
    display: block;
  }
  .stats b {
    font-size: 1.45rem;
    margin: 0.35rem 0 0.12rem;
  }
  .stats span {
    font-size: 0.72rem;
    color: #c4d0dc;
  }
  .feature {
    display: grid;
    gap: 2.5rem;
    align-items: center;
  }
  .feature-copy p,
  .closing p {
    margin: 0.8rem 0 0;
    line-height: 1.7;
    color: #6a7989;
  }
  .feature-points {
    border-top: 1px solid #dfe5e8;
  }
  .feature-points article {
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    gap: 1rem;
    padding: 1.3rem 0;
    border-bottom: 1px solid #dfe5e8;
  }
  .feature-points i {
    color: var(--accent);
    font-size: 0.72rem;
    font-style: normal;
  }
  .feature-points h3 {
    color: #0f0a59;
    margin: 0 0 0.35rem;
    font-weight: 800;
  }
  .feature-points p {
    margin: 0;
    font-size: 0.88rem;
    line-height: 1.6;
  }
  .directory {
    background: var(--accent-soft);
    margin-inline: -1rem;
    padding-inline: 1rem;
  }
  .field-filter {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.45rem;
    margin-bottom: 1rem;
  }
  .field-filter button {
    min-height: 2.75rem;
    padding: 0.5rem 1.05rem;
    border: 1px solid #cfc4dc;
    border-radius: 99rem;
    background: #fff;
    color: #44305f;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 750;
    cursor: pointer;
    transition:
      background-color 160ms ease,
      color 160ms ease,
      transform 150ms var(--ease-out);
  }
  .field-filter button.on {
    border-color: #0f0a59;
    background: #0f0a59;
    color: #fff;
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
    background: #fff;
    border: 1px solid #d9e0e4;
    border-radius: 0.7rem;
    padding: 0 0.8rem;
  }
  .filters input,
  .filters select {
    min-height: 3rem;
    border: 0;
    background: transparent;
    outline: 0;
    width: 100%;
    font-size: 1rem;
  }
  .filters label:focus-within,
  .filters select:focus-visible {
    border-color: #e61a24;
    box-shadow: 0 0 0 3px #e61a2424;
  }
  .filters > select {
    border: 1px solid #d9e0e4;
    background: #fff;
    border-radius: 0.7rem;
    padding: 0 0.8rem;
  }
  .record-grid {
    display: grid;
    gap: 1rem;
  }
  .record {
    background: #fff;
    border: 1px solid #dfe5e8;
    border-radius: 1rem;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition:
      transform 220ms var(--ease-out),
      box-shadow 220ms ease;
  }
  .record-image {
    height: 13rem;
    position: relative;
    overflow: hidden;
  }
  .record-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 450ms var(--ease-out);
  }
  .record-image > span {
    position: absolute;
    left: 0.8rem;
    bottom: 0.8rem;
    display: flex;
    align-items: center;
    gap: 0.3rem;
    background: #0b2442df;
    color: #fff;
    border-radius: 0.45rem;
    padding: 0.4rem 0.55rem;
    font-size: 0.7rem;
  }
  .record-copy {
    padding: 1.2rem;
  }
  .record-copy > small {
    font-size: 0.67rem;
    letter-spacing: 0.1em;
    font-weight: 800;
    color: var(--accent);
  }
  .record-copy h3 {
    font-size: 1.2rem;
    color: #17304f;
    margin: 0.35rem 0;
  }
  .record-copy p {
    font-size: 0.85rem;
    line-height: 1.6;
    color: #687989;
  }
  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .tags span {
    font-size: 0.68rem;
    padding: 0.35rem 0.5rem;
    border-radius: 0.4rem;
    background: var(--accent-soft);
    color: var(--accent-deep);
  }
  .record-copy strong {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    color: var(--accent);
    font-size: 0.76rem;
    margin-top: 1rem;
  }
  .none {
    text-align: center;
    padding: 2rem;
    color: #687989;
  }
  .none p {
    max-width: 34rem;
    margin: 0 auto 1.2rem;
    line-height: 1.7;
  }
  .steps {
    display: grid;
    gap: 0.8rem;
  }
  .steps article {
    border-top: 3px solid var(--accent);
    background: #fff;
    border-radius: 0.75rem;
    padding: 1.6rem;
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  }
  .steps i {
    font-size: 0.72rem;
    color: var(--accent);
    font-style: normal;
  }
  .steps h3 {
    color: #0f0a59;
    margin: 0.8rem 0 0.4rem;
    font-weight: 800;
  }
  .steps p {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.6;
    color: #475569;
  }
  .closing {
    margin-top: 2rem;
    background: #0f0a59;
    color: #fff;
    border-radius: 1.25rem;
    padding: 2.5rem;
    box-shadow: 0 10px 30px rgba(15,10,89,0.15);
  }
  .closing h2 {
    color: #fff;
  }
  .closing p {
    color: #cbd5e1;
  }
  .primary:active,
  .ghost:active,
  .outline:active,
  .pill:active,
  .option:active,
  .field-filter button:active,
  .place-card:active,
  .service-grid > a:active,
  .record:active {
    transform: scale(0.97);
  }
  @media (hover: hover) and (pointer: fine) {
    .option:hover {
      transform: translateY(-0.35rem);
      box-shadow: 0 1.4rem 2.6rem #0b244233;
    }
    .option:hover .option-art i {
      transform: scale(1.08);
    }
    .primary:hover,
    .pill:hover {
      transform: translateY(-2px);
      box-shadow: 0 0.9rem 1.7rem #050e1c33;
    }
    .ghost:hover {
      background: #f3f6f8;
      transform: translateY(-2px);
    }
    .outline:hover {
      background: #ffffff10;
      transform: translateY(-2px);
    }
    .field-filter button:not(.on):hover {
      background: #f3eff7;
    }
    .service-grid > a:hover,
    .record:hover {
      transform: translateY(-0.4rem);
      box-shadow: 0 1.2rem 2.5rem #10264015;
      border-color: #cfbadb;
    }
    .record:hover img,
    .place-card:hover img {
      transform: scale(1.05);
    }
  }
  /* A short phone screen: the options drop their second line so all four
     still fit. */
  @media (max-width: 47.99rem) and (max-height: 36rem) {
    .option-label small {
      display: none;
    }
    .hero {
      padding-top: 1rem;
    }
  }
  @media (min-width: 37.51rem) {
    .field,
    .reviews,
    .section,
    .directory {
      scroll-margin-top: 10.7rem;
    }
  }
  @media (min-width: 40rem) {
    .options {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }
  @media (min-width: 48rem) {
    .edu {
      padding-inline: 2rem;
    }
    .hero {
      padding: 4rem 2rem 5rem;
    }
    .options {
      gap: 1rem;
      margin-top: 3.5rem;
      padding-inline: 1.5rem;
    }
    .option-art {
      height: clamp(5.5rem, 13svh, 7.5rem);
    }
    .option-art i {
      width: 4rem;
      height: 4rem;
    }
    .option-label {
      padding: 0.85rem 0.7rem 0.95rem;
    }
    .option-label b {
      font-size: 1.08rem;
    }
    .option-label small {
      font-size: 0.74rem;
    }
    .lede {
      padding-top: 2.2rem;
    }
    .lede > div,
    .closing > div:last-child {
      flex-direction: row;
      justify-content: center;
    }
    .field-card {
      padding: 2rem;
    }
    .reviews-panel {
      padding: 2rem;
    }
    .place-grid {
      grid-template-columns: repeat(auto-fit, minmax(14rem, 24rem));
      justify-content: center;
      gap: 1.25rem;
    }
    .place-card {
      aspect-ratio: 3 / 2;
    }
    .place-card b {
      font-size: 1.15rem;
    }
    .service-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .stats {
      grid-template-columns: repeat(4, 1fr);
    }
    .stats article + article {
      border-left: 1px solid #ffffff22;
    }
    .feature {
      grid-template-columns: 0.9fr 1.1fr;
    }
    .directory {
      margin-inline: -2rem;
      padding-inline: 2rem;
    }
    .filters {
      grid-template-columns: 1fr 14rem;
    }
    .record-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .steps {
      grid-template-columns: repeat(2, 1fr);
    }
    .closing {
      padding: 2rem;
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
    .field {
      grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.15fr);
      gap: clamp(2rem, 5vw, 5rem);
      padding-block: 3rem;
    }
    .field:first-of-type {
      padding-top: 4.5rem;
    }
    /* The card is the narrower column, on alternating sides. */
    .field:not(.flip) .field-card {
      order: -1;
    }
    .field.flip {
      grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.85fr);
    }
    .reviews:not(.empty) .reviews-body {
      grid-template-columns: minmax(0, 0.8fr) minmax(0, 2fr);
      align-items: start;
    }
  }
  @media (min-width: 64rem) {
    .edu {
      padding-inline: clamp(2rem, 5vw, 5rem);
    }
    .directory {
      margin-inline: calc(clamp(2rem, 5vw, 5rem) * -1);
      padding-inline: clamp(2rem, 5vw, 5rem);
    }
    .service-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .record-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .steps {
      grid-template-columns: repeat(4, 1fr);
    }
  }
  /* A phone held sideways: the header takes a third of the screen, so the
     title and the options shrink to share what is left. */
  @media (min-width: 40rem) and (max-height: 30rem) {
    .hero {
      padding: 0.7rem 1rem 2.9rem;
    }
    .hero h1 {
      font-size: 1.7rem;
      margin: 0.2rem 0 0.25rem;
    }
    .tagline,
    .option-label small {
      display: none;
    }
    .options {
      gap: 0.65rem;
      margin-top: -2.3rem;
    }
    .option-art {
      height: 3rem;
    }
    .option-art i {
      width: 2.1rem;
      height: 2.1rem;
      box-shadow: 0 0 0 0.2rem #ffffffb8;
    }
    .option-label {
      padding: 0.4rem 0.4rem 0.45rem;
    }
    .option-label b {
      font-size: 0.95rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .places b {
      animation: none;
    }
    .option,
    .option-art i,
    .record,
    .record-image img,
    .place-card img,
    .service-grid > a,
    .primary,
    .ghost,
    .outline,
    .pill {
      transition: none;
    }
  }
</style>
