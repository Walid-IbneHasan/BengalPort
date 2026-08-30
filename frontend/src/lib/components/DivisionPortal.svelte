<script lang="ts">
  import {
    ArrowRight,
    Activity,
    Award,
    BookOpen,
    BriefcaseBusiness,
    Building2,
    Compass,
    FileText,
    Globe2,
    GraduationCap,
    Headphones,
    HeartPulse,
    Hospital,
    MapPin,
    Plane,
    Search,
    Settings,
    Stethoscope,
  } from "lucide-svelte";
  import type { DivisionContent } from "$lib/division-content";
  let {
    content,
    records,
    kind,
    loading = false,
  }: {
    content: DivisionContent;
    records: any[];
    kind: "education" | "healthcare";
    loading?: boolean;
  } = $props();
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
    hospital: Hospital,
    heart: HeartPulse,
    activity: Activity,
    plane: Plane,
    headset: Headphones,
  };
  let query = $state(""),
    country = $state("All");
  let countries = $derived(["All", ...new Set(records.map((x) => x.country))]);
  let filtered = $derived.by(() =>
    records.filter((x) => {
      const items = kind === "education" ? x.programs : x.services;
      const haystack =
        `${x.name} ${x.country} ${x.description} ${items?.map((y: any) => y.title).join(" ") || ""}`.toLowerCase();
      return (
        (country === "All" || x.country === country) &&
        haystack.includes(query.toLowerCase())
      );
    }),
  );
  const applyHref = (kind: string) => `/apply?tab=${kind}`;
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

<main class:health={kind === "healthcare"} class="portal">
  <section class="portal-hero">
    <div class="hero-copy">
      <span>{content.hero.eyebrow}</span>
      <h1>{content.hero.title}</h1>
      <h2>{content.hero.tagline}</h2>
      <p>{content.hero.description}</p>
      <div>
        <a class="primary" href={applyHref(kind)}
          >{content.hero.primary}<ArrowRight size={18} /></a
        ><a class="secondary" href="#directory">{content.hero.secondary}</a>
      </div>
    </div>
    <div class="hero-visual">
      <img src={content.hero.image} alt="" fetchpriority="high" decoding="async" />
      <div class="visual-label">
        <i></i><span
          >{kind === "education"
            ? "International study pathways"
            : "International patient coordination"}</span
        >
      </div>
    </div>
  </section>
  <nav class="shortcuts" aria-label={`${kind} services`}>
    {#each content.shortcuts as item}{@const Icon =
        icons[item.icon] || Globe2}<a href={item.href}
        ><i><Icon size={22} /></i><span
          ><b>{item.title}</b><small>{item.subtitle}</small></span
        ><ArrowRight size={15} /></a
      >{/each}
  </nav>
  <section class="section services" use:reveal>
    <header>
      <span>{content.services.eyebrow}</span>
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
      <span>{content.feature.eyebrow}</span>
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
      <header>
        <span>{content.directory.eyebrow}</span>
        <h2>{content.directory.title}</h2>
        <p>{content.directory.description}</p>
      </header>
      <div class="filters">
        <label
          ><Search size={18} /><input
            bind:value={query}
            placeholder={`Search ${kind === "education" ? "institutions or programs" : "hospitals or services"}`}
          /></label
        ><select bind:value={country} aria-label="Filter by country"
          >{#each countries as item}<option>{item}</option>{/each}</select
        >
      </div>
      <div class="record-grid" aria-busy={loading}>
        {#if loading}{#each Array(3) as _}<article
              class="record skeleton"
            ></article>{/each}{:else}{#each filtered as record}<a
              class="record"
              href={applyHref(kind)}
              ><div class="record-image">
                <img src={record.image} alt={record.name} loading="lazy" decoding="async" /><span
                  ><MapPin size={13} />{record.city
                    ? `${record.city}, `
                    : ""}{record.country}</span
                >
              </div>
              <div class="record-copy">
                <small
                  >{kind === "education"
                    ? "INSTITUTION"
                    : "PARTNER HOSPITAL"}</small
                >
                <h3>{record.name}</h3>
                <p>{record.description}</p>
                <div class="tags">
                  {#each (kind === "education" ? record.programs : record.services).slice(0, 3) as item}<span
                      >{item.title}</span
                    >{/each}
                </div>
                <strong
                  >{kind === "education"
                    ? "View programs & enquire"
                    : "Request hospital connection"}
                  <ArrowRight size={15} /></strong
                >
              </div></a
            >{/each}{/if}
      </div>
      {#if !loading && !filtered.length}<div class="empty">
          No matching records. Try a different country or search.
        </div>{/if}
    </div>
  </section>
  <section class="section process" id="process" use:reveal>
    <header>
      <span>{content.process.eyebrow}</span>
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
      <a class="primary" href={applyHref(kind)}
        >{content.closing.primary}<ArrowRight size={17} /></a
      ><a class="outline" href="/contact">{content.closing.secondary}</a>
    </div>
  </section>
</main>

<style>
  .portal {
    --accent: #5d477c;
    --accent-soft: #f3eff7;
    --accent-deep: #44305f;
    background: #fbfcfd;
    color: #415367;
    padding: 0.75rem 1rem 5rem;
    overflow: clip;
  }
  .portal.health {
    --accent: #237b79;
    --accent-soft: #edf7f6;
    --accent-deep: #145e60;
  }
  .portal-hero,
  .shortcuts,
  .section,
  .stats,
  .closing {
    width: 100%;
    max-width: 88rem;
    margin-inline: auto;
  }
  .portal-hero {
    display: grid;
    gap: 1rem;
    background: #0b2442;
    border-radius: 1.25rem;
    padding: 1.5rem;
    color: #fff;
    overflow: hidden;
    position: relative;
  }
  .hero-copy {
    padding: 1.25rem 0.25rem;
    position: relative;
    z-index: 2;
  }
  .hero-copy > span,
  .section header > span,
  .feature-copy > span {
    font-size: 0.73rem;
    letter-spacing: 0.13em;
    font-weight: 800;
    color: #e2b758;
  }
  .hero-copy h1 {
    font-size: clamp(2.65rem, 12vw, 4rem);
    line-height: 1;
    letter-spacing: -0.05em;
    margin: 0.75rem 0;
  }
  .hero-copy h2 {
    font-size: 1.15rem;
    color: #e4bc60;
    margin: 0 0 0.7rem;
  }
  .hero-copy p {
    font-size: 1rem;
    line-height: 1.7;
    color: #d8e1e9;
    max-width: 38rem;
  }
  .hero-copy > div,
  .closing > div:last-child {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    margin-top: 1.4rem;
  }
  .primary,
  .secondary,
  .outline {
    min-height: 3rem;
    border-radius: 0.7rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.7rem 1rem;
    text-decoration: none;
    font-size: 0.78rem;
    font-weight: 800;
    transition:
      transform 150ms var(--ease-out),
      background-color 180ms ease,
      box-shadow 180ms ease;
  }
  .primary {
    background: #ddb04a;
    color: #102945;
    box-shadow: 0 0.6rem 1.4rem #040d1b38;
  }
  .secondary,
  .outline {
    border: 1px solid #ffffff55;
    color: #fff;
  }
  .hero-visual {
    height: 22rem;
    border-radius: 1rem;
    overflow: hidden;
    position: relative;
  }
  .hero-visual:after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(0deg, #081e3b99, transparent 55%);
  }
  .hero-visual img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .visual-label {
    position: absolute;
    z-index: 2;
    left: 1rem;
    bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.55rem;
    background: #0c2447d9;
    border: 1px solid #ffffff2d;
    padding: 0.65rem 0.8rem;
    border-radius: 0.65rem;
    font-size: 0.72rem;
    backdrop-filter: blur(0.5rem);
  }
  .visual-label i {
    width: 0.55rem;
    height: 0.55rem;
    border-radius: 50%;
    background: #dfb24d;
    box-shadow: 0 0 0 0.25rem #dfb24d20;
  }
  .shortcuts {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: 15rem;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    background: #fff;
    border: 1px solid #e2e7ea;
    border-radius: 1rem;
    margin-top: -0.25rem;
    position: relative;
    z-index: 3;
    box-shadow: 0 1rem 2.4rem #10264012;
  }
  .shortcuts a {
    scroll-snap-align: start;
    min-height: 4.7rem;
    padding: 0.7rem 0.85rem;
    display: flex;
    align-items: center;
    gap: 0.7rem;
    text-decoration: none;
    color: #213a56;
    border-right: 1px solid #e5e9ec;
  }
  .shortcuts a > i {
    width: 2.65rem;
    height: 2.65rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    background: var(--accent-deep);
    flex: none;
  }
  .shortcuts b,
  .shortcuts small {
    display: block;
  }
  .shortcuts b {
    font-size: 0.82rem;
  }
  .shortcuts small {
    font-size: 0.7rem;
    color: #738292;
    margin-top: 0.13rem;
  }
  .shortcuts a > svg {
    margin-left: auto;
  }
  .section {
    padding-block: 5rem;
  }
  .section header {
    text-align: center;
    max-width: 46rem;
    margin: 0 auto 2.4rem;
  }
  .section h2,
  .feature h2,
  .closing h2 {
    font-size: clamp(2rem, 7vw, 3.4rem);
    line-height: 1.08;
    letter-spacing: -0.04em;
    color: #17304f;
    margin: 0.5rem 0 0.8rem;
  }
  .section header p,
  .feature p,
  .closing p {
    color: #6a7989;
    line-height: 1.7;
    margin: 0;
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
    min-height: 15rem;
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
  .stats svg {
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
    font-size: 0.88rem;
  }
  .directory {
    background: var(--accent-soft);
  }
  .directory-inner {
    padding-inline: 0;
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
  .filters select,
  .filters + select {
    min-height: 3rem;
    border: 0;
    background: transparent;
    outline: 0;
    width: 100%;
  }
  .filters select,
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
    min-height: 28rem;
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
  .skeleton {
    background: #e1e6e9;
    animation: pulse 1s ease infinite;
  }
  .empty {
    text-align: center;
    padding: 2rem;
    color: #687989;
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
  .secondary:active,
  .outline:active,
  .shortcuts a:active,
  .service-grid > a:active,
  .record:active {
    transform: scale(0.97);
  }
  @keyframes pulse {
    50% {
      opacity: 0.55;
    }
  }
  @media (hover: hover) and (pointer: fine) {
    .primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 0.9rem 1.7rem #050e1c48;
    }
    .secondary:hover,
    .outline:hover {
      background: #ffffff10;
      transform: translateY(-2px);
    }
    .shortcuts a:hover {
      background: var(--accent-soft);
    }
    .service-grid > a:hover,
    .record:hover {
      transform: translateY(-0.4rem);
      box-shadow: 0 1.2rem 2.5rem #10264015;
      border-color: #cfbadb;
    }
    .record:hover img {
      transform: scale(1.04);
    }
  }
  @media (min-width: 48rem) {
    .portal {
      padding-inline: 2rem;
    }
    .portal-hero {
      grid-template-columns: 1fr 0.9fr;
      padding: 2rem;
    }
    .hero-copy {
      padding: 3rem 2rem;
    }
    .hero-copy > div,
    .closing > div:last-child {
      flex-direction: row;
    }
    .shortcuts {
      grid-auto-flow: unset;
      grid-auto-columns: unset;
      grid-template-columns: repeat(5, 1fr);
      margin-top: -2rem;
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
  }
  @media (min-width: 64rem) {
    .portal {
      padding-inline: clamp(2rem, 5vw, 5rem);
    }
    .portal-hero {
      min-height: 34rem;
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
  @media (prefers-reduced-motion: reduce) {
    .record-image img,
    .record,
    .service-grid > a,
    .primary,
    .secondary,
    .outline {
      transition: none;
    }
    .skeleton {
      animation: none;
    }
  }
</style>
