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
    Stethoscope,
  } from "lucide-svelte";
  import type { EducationContent } from "$lib/division-content";
  import type { PublicReview } from "$lib/reviews";
  import Testimonials from "./Testimonials.svelte";
  import { applyHref } from "$lib/apply-route";
  import { reveal } from "$lib/reveal";
  import { distinct, liveStats } from "$lib/live-stats";
  import {
    destinations,
    fieldKeys,
    fieldPrograms,
    flagCodes,
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
      title: content.fields[key].title,
      tagline: content.fields[key].tagline,
      image: content.fields[key].image,
    })),
    {
      id: "reviews",
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
  // The figures, with institutions, programs and countries counted from the
  // directory so they never contradict it.
  let stats = $derived(
    liveStats(content.stats, {
      institutions: records.length,
      programs: records.reduce((total: number, record: any) => total + (record.programs?.length ?? 0), 0),
      countries: distinct(records, "country"),
    }),
  );
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

  // The hero names the destinations one after another: the countries in the
  // directory, or the usual ones while it is empty.
  const usualCountries = ["UK", "USA", "Canada", "Australia", "Malaysia"];
  let heroCountries = $derived(places.length ? places.map((x) => x.country) : usualCountries);
  let place = $state(0);
  // Four flags float around the title. They are the flags of those same
  // destinations, topped up from the usual ones so that four differ.
  let flagPool = $derived(flagCodes([...heroCountries, ...usualCountries]));
  let changedFlags = $state<string[] | null>(null);
  let flagsShown = $derived(changedFlags ?? flagPool.slice(0, 4));

  onMount(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (heroCountries.length > 1) place = (place + 1) % heroCountries.length;
    }, 2400);
    // One flag at a time gives way to the next destination not on show.
    let turn = 0;
    let next = 4;
    const flagTimer = setInterval(() => {
      if (flagPool.length <= flagsShown.length) return;
      const shown = [...flagsShown];
      let code = flagPool[next++ % flagPool.length];
      while (shown.includes(code)) code = flagPool[next++ % flagPool.length];
      shown[turn++ % shown.length] = code;
      changedFlags = shown;
    }, 3200);
    return () => {
      clearInterval(timer);
      clearInterval(flagTimer);
    };
  });
</script>

<main class="edu">
  <section class="hero">
    <div class="flags" aria-hidden="true">
      {#each flagsShown as code, i}
        <div class={`flag-ball flag-ball-${i}`}>
          {#key code}
            <img
              src={`https://flagcdn.com/w160/${code}.png`}
              alt=""
              width="160"
              height="107"
              decoding="async"
              referrerpolicy="no-referrer"
              transition:fade={{ duration: 600 }}
            />
          {/key}
        </div>
      {/each}
    </div>
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
      {#each options as option}<a class="option" data-option={option.id} href={`#${option.id}`}>
          <span class="option-art">
            {#if option.image}<img src={option.image} alt="" width="640" height="320" decoding="async" />{/if}
          </span>
          <span class="option-label">
            <b>{option.title}</b><small>{option.tagline}</small>
          </span>
        </a>{/each}
    </nav>
    <div class="lede">
      <p class="full">{content.hero.description}</p>
      <p class="brief">{content.hero.shortDescription || content.hero.description}</p>
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
      <div class="field-card" class:pictured={Boolean(item.photo)}>
        {#if item.photo}<div class="field-photo">
            <img src={item.photo} alt="" width="1200" height="670" loading="lazy" decoding="async" />
          </div>{/if}
        <div class="field-body">
          <i class="field-mark"><Icon /></i>
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
      </div>
    </section>{/each}

  {#if reviews.length}<section class="reviews" id="reviews" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.reviews.eyebrow}</span>
      <h2>{content.reviews.heading}</h2>
    </header>
    <div class="reviews-body">
      <div class="reviews-panel">
        {#if content.reviews.photo}<img
            class="reviews-photo"
            src={content.reviews.photo}
            alt=""
            width="1200"
            height="670"
            loading="lazy"
            decoding="async"
          />{/if}
        <div class="reviews-copy">
          <p>{content.reviews.description}</p>
          <p class="invite">{content.reviews.invite}</p>
          <a class="primary" href="/dashboard"
            >{content.reviews.cta}<ArrowRight size={17} /></a
          >
        </div>
      </div>
      <Testimonials {reviews} />
    </div>
  </section>{/if}

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
    {#each stats as stat}{@const Icon = icons[stat.icon] || Globe2}
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
  /* The site's palette: navy for headings and dark surfaces, gold for
     actions and accents. Small gold text uses the deeper gold, which stays
     readable on the page's light backgrounds; the lighter gold is for fills
     and for text on navy. */
  .edu {
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
  .edu :global(::selection) {
    background: var(--ink);
    color: #fff;
  }
  .edu :is(a, button, input, select):focus-visible {
    outline: 3px solid rgba(199, 152, 54, 0.55);
    outline-offset: 3px;
  }
  .edu :is(.closing, .reviews-panel) a:focus-visible {
    outline-color: #ffffffc7;
  }
  .hero,
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
    color: var(--accent-text);
  }

  /* Hero: a centred title with the destination below it, then the four
     options. On a phone the options are two by two and fit the first screen,
     and the lede below them is the shorter one. */
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
  .hero > :not(.flags) {
    position: relative;
    z-index: 1;
  }
  /* The flags drift behind the title, never over the text or the options. */
  .flags {
    position: absolute;
    inset: 0;
    z-index: 0;
    pointer-events: none;
  }
  .flag-ball {
    --drift: 5px;
    position: absolute;
    width: 2.2rem;
    height: 2.2rem;
    overflow: hidden;
    border: 2px solid #fff;
    border-radius: 50%;
    background: var(--ink-soft);
    box-shadow: 0 6px 14px #17304f24;
  }
  .flag-ball img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .flag-ball-0 {
    top: 1.3rem;
    left: 5%;
    animation: float-a 8s ease-in-out infinite;
  }
  .flag-ball-1 {
    top: 0.9rem;
    right: 6%;
    animation: float-b 9s ease-in-out infinite;
  }
  .flag-ball-2 {
    top: 5.9rem;
    left: 8%;
    animation: float-b 7s ease-in-out infinite;
  }
  .flag-ball-3 {
    top: 6.3rem;
    right: 7%;
    animation: float-a 8.5s ease-in-out infinite;
  }
  @keyframes float-a {
    50% {
      transform: translate(var(--drift), calc(var(--drift) * -1.3));
    }
  }
  @keyframes float-b {
    50% {
      transform: translate(calc(var(--drift) * -1.3), var(--drift));
    }
  }
  .hero .eyebrow {
    color: var(--accent-text);
  }
  .hero h1 {
    font-size: clamp(2.2rem, 8vw, 4.8rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
    margin: 0.45rem 0 0.15rem;
    text-wrap: balance;
    color: var(--ink);
    font-weight: 800;
  }
  .places {
    margin: 0;
    font-size: clamp(2rem, 8vw, 4.8rem);
    line-height: 1.15;
    font-weight: 900;
    letter-spacing: -0.02em;
    color: var(--accent-deep);
  }
  .places b {
    display: inline-block;
    font-weight: 900;
    animation: place-in 420ms var(--ease-out);
  }
  @keyframes place-in {
    from {
      opacity: 0;
      transform: translateY(0.45em);
    }
  }
  .tagline {
    margin: 0.7rem 0 0;
    font-size: clamp(1rem, 3.7vw, 1.4rem);
    font-weight: 600;
    color: var(--muted);
  }
  .options {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    width: 100%;
    max-width: 76rem;
    margin: 1.5rem auto 0;
  }
  .option {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 1.1rem;
    background: #fff;
    box-shadow:
      0 6px 16px #17304f0f,
      0 2px 4px #17304f0a;
    color: inherit;
    text-decoration: none;
    transition:
      transform 250ms var(--ease-out),
      box-shadow 250ms ease;
  }
  /* The pictures are framed two to one around their object, so the whole
     object shows at every size. */
  .option-art {
    position: relative;
    aspect-ratio: 2 / 1;
    overflow: hidden;
    border-bottom: 3px solid var(--accent);
    background: var(--ink-soft);
  }
  .option-art img {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 500ms var(--ease-out);
  }
  .option-label {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.15rem;
    padding: 0.6rem 0.45rem 0.65rem;
    background: var(--ink);
    color: #fff;
    text-align: center;
  }
  .option-label b {
    font-size: 0.98rem;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .option-label small {
    font-size: 0.7rem;
    line-height: 1.35;
    color: var(--on-ink);
  }
  .lede {
    width: 100%;
    max-width: 40rem;
    margin: 0 auto;
    padding: 1.3rem 0.25rem 0;
  }
  .lede p {
    margin: 0;
    line-height: 1.7;
    color: var(--muted);
  }
  .lede .full {
    display: none;
  }
  .lede > div,
  .closing > div:last-child {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin-top: 1.3rem;
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
  .field-copy h2,
  .feature-copy h2,
  .closing h2 {
    font-size: clamp(1.8rem, 6.4vw, 3.2rem);
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--ink);
    margin: 0.5rem 0 0;
    text-wrap: balance;
    font-weight: 800;
  }
  .field-copy h2,
  .feature-copy h2,
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
    padding-block: 4rem;
  }

  /* A field of study: the explanation beside a card that pairs a photo with
     the field's subjects and its programs in the directory. */
  .field {
    display: grid;
    gap: 1.6rem;
    align-items: center;
    padding-block: 2.4rem;
  }
  .field:first-of-type {
    padding-top: 3.2rem;
  }
  .field-copy p {
    max-width: 38rem;
    margin: 0.9rem 0 0;
    line-height: 1.75;
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
    color: #26384b;
    font-weight: 600;
    font-size: 0.93rem;
  }
  .points i {
    width: 1.5rem;
    height: 1.5rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--ink-soft);
    color: var(--ink);
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
    color: var(--accent-text);
    font-size: 0.85rem;
    font-weight: 800;
    text-underline-offset: 0.25em;
  }
  .field-card {
    overflow: hidden;
    border: 1px solid var(--line);
    border-radius: 1.25rem;
    background: #fff;
    color: var(--ink);
    box-shadow: 0 0.8rem 2rem #17304f14;
  }
  .field-photo {
    aspect-ratio: 16 / 9;
    overflow: hidden;
    background: var(--accent-soft);
  }
  .field-photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .field-body {
    position: relative;
    padding: 1.4rem;
  }
  /* The field's sign sits across the photo's lower edge. */
  .field-mark {
    width: 3.4rem;
    height: 3.4rem;
    display: grid;
    place-items: center;
    margin-bottom: 1rem;
    border: 4px solid #fff;
    border-radius: 50%;
    background: var(--ink);
    color: var(--on-ink-gold);
    box-shadow: 0 0.4rem 1rem #17304f40;
  }
  .pictured .field-mark {
    margin-top: -3.2rem;
  }
  .field-mark :global(svg) {
    width: 46%;
    height: 46%;
  }
  .field-card small {
    display: block;
    font-size: 0.68rem;
    letter-spacing: 0.13em;
    font-weight: 800;
    color: var(--accent-text);
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
    border: 1px solid var(--line);
    border-radius: 99rem;
    background: #f6f7f6;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--text);
  }
  .listed {
    margin-top: 1.3rem;
    padding-top: 1.2rem;
    border-top: 1px solid var(--line);
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
    color: var(--muted);
  }
  .listed a {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.75rem;
    color: var(--accent-text);
    font-size: 0.8rem;
    font-weight: 800;
    text-decoration: none;
  }

  /* Student reviews: a navy panel under a photo of students, with the
     reviews beside it as a slideshow once there are some. */
  .reviews {
    padding-block: 3.2rem 1rem;
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
    background: var(--ink);
    color: #fff;
    text-decoration: none;
    box-shadow: 0 0.6rem 1.5rem #17304f14;
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
    background: #17304fd9;
    text-align: center;
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
    color: var(--on-ink);
  }

  .service-grid {
    display: grid;
    gap: 0.8rem;
  }
  .service-grid > a {
    border: 1px solid var(--line);
    background: #fff;
    border-radius: 1rem;
    padding: 1.35rem;
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
    border: 1px solid #e9d9b0;
    background: var(--accent-soft);
    color: var(--accent-deep);
  }
  .service-grid h3 {
    font-size: 1rem;
    color: var(--ink);
    margin: 1rem 0 0.45rem;
    text-transform: uppercase;
  }
  .service-grid p {
    margin: 0 0 1.1rem;
    font-size: 0.88rem;
    line-height: 1.6;
    color: var(--muted);
  }
  .service-grid strong {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    color: var(--accent-text);
    font-size: 0.78rem;
    margin-top: auto;
  }
  .stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    background: var(--ink);
    color: #fff;
    border-radius: 1.25rem;
    padding: 1.5rem;
    box-shadow: 0 10px 30px #17304f1a;
  }
  .stats article {
    text-align: center;
    padding: 1rem 0.4rem;
  }
  .stats :global(svg) {
    color: var(--on-ink-gold);
  }
  .stats b,
  .stats span {
    display: block;
  }
  .stats b {
    font-size: 1.45rem;
    font-variant-numeric: tabular-nums;
    margin: 0.35rem 0 0.12rem;
  }
  .stats span {
    font-size: 0.72rem;
    color: var(--on-ink);
  }
  .feature {
    display: grid;
    gap: 2.5rem;
    align-items: center;
  }
  .feature-copy p,
  .closing p {
    max-width: 38rem;
    margin: 0.8rem 0 0;
    line-height: 1.7;
  }
  .feature-points {
    border-top: 1px solid var(--line);
  }
  .feature-points article {
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    gap: 1rem;
    padding: 1.3rem 0;
    border-bottom: 1px solid var(--line);
  }
  .feature-points i {
    color: var(--accent-text);
    font-size: 0.72rem;
    font-style: normal;
    font-variant-numeric: tabular-nums;
  }
  .feature-points h3 {
    color: var(--ink);
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
      transform 150ms var(--ease-out);
  }
  .field-filter button.on {
    border-color: var(--ink);
    background: var(--ink);
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
    border: 1px solid #d7dce3;
    border-radius: 0.7rem;
    padding: 0 0.8rem;
    color: var(--muted);
  }
  .filters input,
  .filters select {
    min-height: 3rem;
    border: 0;
    background: transparent;
    outline: 0;
    width: 100%;
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
    border: 1px solid #d7dce3;
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
    border: 1px solid var(--line);
    border-radius: 1rem;
    overflow: hidden;
    text-decoration: none;
    color: inherit;
    transition:
      transform 220ms var(--ease-out),
      box-shadow 220ms ease,
      border-color 180ms ease;
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
    background: #17304fe0;
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
    color: var(--accent-text);
  }
  .record-copy h3 {
    font-size: 1.2rem;
    color: var(--ink);
    margin: 0.35rem 0;
  }
  .record-copy p {
    font-size: 0.85rem;
    line-height: 1.6;
    color: var(--muted);
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
    background: var(--ink-soft);
    color: var(--ink);
  }
  .record-copy strong {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    color: var(--accent-text);
    font-size: 0.76rem;
    margin-top: 1rem;
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
  .steps {
    display: grid;
    gap: 0.8rem;
  }
  .steps article {
    border-top: 3px solid var(--accent);
    background: #fff;
    border-radius: 0 0 0.75rem 0.75rem;
    padding: 1.6rem;
    box-shadow: 0 4px 12px #17304f0a;
  }
  .steps i {
    font-size: 0.72rem;
    font-weight: 800;
    color: var(--accent-text);
    font-style: normal;
    font-variant-numeric: tabular-nums;
  }
  .steps h3 {
    color: var(--ink);
    margin: 0.8rem 0 0.4rem;
    font-weight: 800;
  }
  .steps p {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.6;
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
    color: var(--on-ink);
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
      box-shadow:
        0 1.2rem 2.4rem #17304f26,
        0 4px 8px #17304f0f;
    }
    .option:hover .option-art img {
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
    .outline:hover {
      background: #ffffff14;
      transform: translateY(-2px);
    }
    .field-filter button:not(.on):hover {
      background: var(--ink-soft);
    }
    .service-grid > a:hover,
    .record:hover {
      transform: translateY(-0.4rem);
      box-shadow: 0 1.2rem 2.5rem #17304f1a;
      border-color: rgba(199, 152, 54, 0.38);
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
      justify-content: center;
      min-height: 86svh;
      padding: 3rem 2rem 3.25rem;
    }
    .flag-ball {
      --drift: 15px;
      width: clamp(2.8rem, 5vw, 4rem);
      height: clamp(2.8rem, 5vw, 4rem);
      border-width: 3px;
    }
    .flag-ball-0 {
      top: 12%;
      left: 18%;
    }
    .flag-ball-1 {
      top: 8%;
      right: 15%;
    }
    .flag-ball-2 {
      top: 28%;
      left: 12%;
    }
    .flag-ball-3 {
      top: 32%;
      right: 12%;
    }
    .hero h1 {
      margin: 0.8rem 0 0.2rem;
    }
    .tagline {
      margin-top: 1rem;
    }
    .options {
      gap: 1rem;
      margin-top: 2.5rem;
      padding-inline: 1.5rem;
    }
    .option {
      border-radius: 1.25rem;
    }
    .option-label {
      gap: 0.25rem;
      padding: 0.9rem 0.7rem 1rem;
    }
    .option-label b {
      font-size: 1.1rem;
    }
    .option-label small {
      font-size: 0.78rem;
    }
    .lede {
      padding-top: 2rem;
    }
    .lede .full {
      display: block;
    }
    .lede .brief {
      display: none;
    }
    .lede > div,
    .closing > div:last-child {
      flex-direction: row;
      justify-content: center;
    }
    .field-body {
      padding: 1.8rem;
    }
    .pictured .field-mark {
      margin-top: -3.6rem;
    }
    .reviews-copy {
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
    /* Beside the reviews the panel stays as short as they are. */
    .reviews .reviews-photo {
      display: none;
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
      min-height: 0;
      padding: 0.6rem 1rem 1.2rem;
    }
    .hero h1 {
      font-size: 1.6rem;
      margin: 0.15rem 0 0;
    }
    .places {
      font-size: 1.5rem;
    }
    .tagline,
    .option-label small {
      display: none;
    }
    .flag-ball {
      --drift: 5px;
      width: 2rem;
      height: 2rem;
      border-width: 2px;
    }
    .options {
      gap: 0.65rem;
      margin-top: 0.6rem;
    }
    .option-art {
      aspect-ratio: auto;
      height: 3rem;
    }
    .option-label {
      padding: 0.4rem 0.4rem 0.45rem;
    }
    .option-label b {
      font-size: 0.95rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .places b,
    .flag-ball {
      animation: none;
    }
    .option,
    .option-art img,
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
