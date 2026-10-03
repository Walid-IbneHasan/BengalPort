<script lang="ts">
  import { onMount } from "svelte";
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
    Quote,
    Search,
    Settings,
    Star,
    Stethoscope,
  } from "lucide-svelte";
  import type { EducationContent } from "$lib/division-content";
  import { applyHref } from "$lib/apply-route";
  import {
    destinations,
    fieldKeys,
    fieldPrograms,
    institutionFields,
    type FieldKey,
  } from "$lib/education";
  let { content, records }: { content: EducationContent; records: any[] } =
    $props();
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
    })),
    {
      id: "reviews",
      icon: Star,
      title: content.reviews.title,
      tagline: content.reviews.tagline,
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
  // The hero names the study destinations one after another.
  let place = $state(0);
  onMount(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      if (places.length > 1) place = (place + 1) % places.length;
    }, 2400);
    return () => clearInterval(timer);
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
    <img class="hero-bg" src={content.hero.image} alt="" fetchpriority="high" decoding="async" />
    <span class="eyebrow">{content.hero.eyebrow}</span>
    <h1>{content.hero.title}</h1>
    <p class="tagline">{content.hero.tagline}</p>
    {#if places.length}<p class="places">
        <span class="sr">Study in {places.map((x) => x.country).join(", ")}</span>
        <span aria-hidden="true"
          >Study in {#key place}<b>{places[place % places.length].country}</b>{/key}</span
        >
      </p>{/if}
  </section>
  <nav class="options" aria-label="Education options">
    {#each options as option}{@const Icon = option.icon}<a
        class="option"
        data-option={option.id}
        href={`#${option.id}`}
        ><span class="option-art"><i><Icon /></i></span><span class="option-label"
          ><b>{option.title}</b><small>{option.tagline}</small></span
        ></a
      >{/each}
  </nav>
  <div class="lede">
    <p>{content.hero.description}</p>
    <div>
      <a class="primary" href={applyHref("EDUCATION")}
        >{content.hero.primary}<ArrowRight size={18} /></a
      ><a class="ghost" href="#directory">{content.hero.secondary}</a>
    </div>
  </div>

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

  <section class="reviews" class:empty={!content.reviews.items.length} id="reviews" use:reveal>
    <header class="heading">
      <span class="eyebrow">{content.reviews.eyebrow}</span>
      <h2>{content.reviews.heading}</h2>
    </header>
    <div class="reviews-body">
      <div class="reviews-panel">
        <p>{content.reviews.description}</p>
        <p class="invite">{content.reviews.invite}</p>
        <a class="primary" href="/contact"
          >{content.reviews.cta}<ArrowRight size={17} /></a
        >
      </div>
      {#if content.reviews.items.length}<div class="review-list">
          {#each content.reviews.items as item}<figure class="review">
              <Quote size={22} />
              <blockquote>{item.quote}</blockquote>
              <figcaption><b>{item.name}</b><span>{item.detail}</span></figcaption>
            </figure>{/each}
        </div>{/if}
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
    --accent: #5d477c;
    --accent-soft: #f3eff7;
    --accent-deep: #44305f;
    background: #fbfcfd;
    color: #415367;
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
    color: #8f6410;
  }

  /* Hero: a centred title, then the four options straight below it. */
  .hero {
    position: relative;
    isolation: isolate;
    overflow: hidden;
    border-radius: 1.25rem;
    background: #0b2442;
    color: #fff;
    text-align: center;
    padding: 1.35rem 1rem 4.2rem;
  }
  .hero-bg {
    position: absolute;
    inset: 0;
    z-index: -2;
    width: 100%;
    height: 100%;
    object-fit: cover;
    opacity: 0.26;
  }
  .hero::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background:
      radial-gradient(90% 70% at 50% 0%, #1d477533, transparent 70%),
      linear-gradient(180deg, #0b244266, #0b2442 96%);
  }
  .hero .eyebrow {
    color: #e2b758;
  }
  .hero h1 {
    font-size: clamp(1.9rem, 8.2vw, 4.4rem);
    line-height: 1.04;
    letter-spacing: -0.045em;
    margin: 0.45rem 0 0.5rem;
    text-wrap: balance;
  }
  .tagline {
    margin: 0;
    font-size: clamp(0.95rem, 3.7vw, 1.3rem);
    font-weight: 600;
    color: #d8e1e9;
  }
  .places {
    margin: 0.35rem 0 0;
    font-size: clamp(0.95rem, 3.7vw, 1.25rem);
    font-weight: 600;
    color: #b9c7d5;
  }
  .places b {
    display: inline-block;
    color: #e4bc60;
    font-weight: 800;
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
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.65rem;
    max-width: 68rem;
    margin: -3.2rem auto 0;
    padding-inline: 0.6rem;
  }
  .option {
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #dfe5ea;
    border-radius: 1rem;
    background: #fff;
    box-shadow: 0 0.9rem 2rem #0b244226;
    color: inherit;
    text-decoration: none;
    transition:
      transform 200ms var(--ease-out),
      box-shadow 200ms ease;
  }
  .option-art {
    display: grid;
    place-items: center;
    height: clamp(3.7rem, 12.5svh, 6rem);
    background: var(--tint, var(--accent-soft));
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
  .option-art i {
    width: clamp(2.5rem, 8svh, 3.7rem);
    height: clamp(2.5rem, 8svh, 3.7rem);
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #102947;
    color: #e4bc60;
    box-shadow: 0 0 0 0.35rem #ffffffb8;
    transition: transform 240ms var(--ease-out);
  }
  .option-art i :global(svg) {
    width: 48%;
    height: 48%;
  }
  .option-label {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.15rem;
    padding: 0.6rem 0.5rem 0.65rem;
    background: #102947;
    color: #fff;
    text-align: center;
  }
  .option-label b {
    font-size: 0.98rem;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .option-label small {
    font-size: 0.69rem;
    line-height: 1.35;
    color: #c4d0dc;
  }
  .lede {
    max-width: 46rem;
    text-align: center;
    padding: 1.6rem 0.25rem 0.5rem;
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
    margin-top: 1.2rem;
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
    background: #ddb04a;
    color: #102945;
    box-shadow: 0 0.6rem 1.4rem #040d1b26;
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
    font-size: clamp(1.8rem, 6.4vw, 3rem);
    line-height: 1.1;
    letter-spacing: -0.04em;
    color: #17304f;
    margin: 0.5rem 0 0;
    text-wrap: balance;
  }
  .heading h2::after {
    content: "";
    display: block;
    width: 4rem;
    height: 3px;
    margin: 0.9rem auto 0;
    border-radius: 2px;
    background: #ddb04a;
  }
  .heading p {
    margin: 1rem 0 0;
    line-height: 1.7;
    color: #6a7989;
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
    background: #102947;
    color: #fff;
    padding: 1.4rem;
  }
  .field-card::after {
    content: "";
    position: absolute;
    right: -4rem;
    top: -4rem;
    width: 13rem;
    height: 13rem;
    border-radius: 50%;
    background: #ffffff0a;
    pointer-events: none;
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
    background: #e4bc60;
    color: #102947;
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
    color: #ffffff24;
  }
  .field-card small {
    display: block;
    font-size: 0.68rem;
    letter-spacing: 0.13em;
    font-weight: 800;
    color: #e2b758;
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
    border: 1px solid #ffffff2e;
    border-radius: 99rem;
    background: #ffffff0f;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .listed {
    margin-top: 1.3rem;
    padding-top: 1.2rem;
    border-top: 1px solid #ffffff22;
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
    color: #c4d0dc;
  }
  .listed a {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.75rem;
    color: #e4bc60;
    font-size: 0.8rem;
    font-weight: 800;
    text-decoration: none;
  }
  .field-copy p {
    margin: 0.9rem 0 0;
    line-height: 1.75;
    color: #5d6e80;
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
  .review-list {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: min(86%, 21rem);
    gap: 0.9rem;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    overscroll-behavior-inline: contain;
    padding: 0.2rem 0.2rem 0.8rem;
  }
  .review {
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 1.3rem;
    border: 1px solid #dfe5e8;
    border-top: 3px solid #ddb04a;
    border-radius: 1rem;
    background: #fff;
    color: #b48528;
    box-shadow: 0 0.5rem 1.4rem #10264008;
  }
  .review blockquote {
    margin: 0.8rem 0 1.2rem;
    line-height: 1.7;
    color: #33465a;
    font-size: 0.93rem;
  }
  .review figcaption {
    margin-top: auto;
  }
  .review b,
  .review figcaption span {
    display: block;
  }
  .review b {
    color: #17304f;
  }
  .review figcaption span {
    margin-top: 0.15rem;
    font-size: 0.78rem;
    color: #6a7989;
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
    background: #102947;
    color: #fff;
    border-radius: 1rem;
    padding: 0.8rem;
  }
  .stats article {
    text-align: center;
    padding: 1rem 0.4rem;
  }
  .stats :global(svg) {
    color: #dfb24d;
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
    color: #17304f;
    margin: 0 0 0.35rem;
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
    border-color: #102947;
    background: #102947;
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
    border-color: #ddb04a;
    box-shadow: 0 0 0 3px #c9952d24;
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
    border-top: 2px solid var(--accent);
    background: #fff;
    padding: 1.4rem;
    box-shadow: 0 0.5rem 1.4rem #10264008;
  }
  .steps i {
    font-size: 0.72rem;
    color: var(--accent);
    font-style: normal;
  }
  .steps h3 {
    color: #17304f;
    margin: 0.8rem 0 0.4rem;
  }
  .steps p {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.6;
    color: #6a7989;
  }
  .closing {
    margin-top: 2rem;
    background: #102947;
    color: #fff;
    border-radius: 1rem;
    padding: 1.5rem;
  }
  .closing h2 {
    color: #fff;
  }
  .closing p {
    color: #c5d1dc;
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
      padding: 3.2rem 2rem 7.2rem;
    }
    .options {
      gap: 1rem;
      margin-top: -5.2rem;
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
    .review-list {
      grid-auto-flow: row;
      grid-auto-columns: auto;
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
      overflow: visible;
      padding: 0;
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
