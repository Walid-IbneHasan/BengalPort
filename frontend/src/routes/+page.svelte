<script lang="ts">
  import {
    ArrowRight,
    BookOpenCheck,
    BriefcaseBusiness,
    Check,
    Factory,
    Globe2,
    GraduationCap,
    Handshake,
    HeartPulse,
    MapPinned,
    Package,
    Route,
    ShieldCheck,
    Smile,
    Stethoscope,
    TriangleAlert,
    Users,
  } from "lucide-svelte";
  import { cmsContent } from "$lib/cms";

  const divisionIcons = {
    business: BriefcaseBusiness,
    education: GraduationCap,
    health: HeartPulse,
  };
  const statIcons = {
    globe: Globe2,
    users: Users,
    package: Package,
    briefcase: BriefcaseBusiness,
    smile: Smile,
  };
  const promiseIcons = {
    shield: ShieldCheck,
    handshake: Handshake,
    map: MapPinned,
  };
  const pathwayIcons = {
    factory: Factory,
    education: BookOpenCheck,
    healthcare: Stethoscope,
  };
  $: content = $cmsContent;
  $: divisions = content.divisions.map((item) => ({
    ...item,
    sub: item.subtitle,
    class: item.key,
    icon: divisionIcons[item.key],
  }));
  $: stats = content.stats.map(
    (item) => [item.value, item.label, statIcons[item.icon]] as const,
  );
  $: promises = content.promises.map((item) => ({
    ...item,
    text: item.description,
    icon: promiseIcons[item.icon],
  }));
  $: pathways = content.pathways.items.map((item) => ({
    ...item,
    text: item.description,
    icon: pathwayIcons[item.icon],
  }));
  $: steps = content.process.steps.map((item) => ({
    ...item,
    text: item.description,
  }));

  type RevealPreset = "up" | "left" | "right" | "mask" | "scale";
  type RevealOptions = {
    from?: RevealPreset;
    delay?: number;
    distance?: string;
  };

  function reveal(node: HTMLElement, value: number | RevealOptions = {}) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches)
      return {};
    const options = typeof value === "number" ? { delay: value } : value;
    const preset = options.from ?? "up";
    const distance = options.distance ?? "3.25rem";
    const directions: Record<RevealPreset, [string, string, string, string]> = {
      up: ["0", "2rem", ".985", "inset(0 0 0 0)"],
      left: [`-${distance}`, "0", ".99", "inset(0 0 0 0)"],
      right: [distance, "0", ".99", "inset(0 0 0 0)"],
      // Do not fully clip the observed node: a zero-area clip prevents
      // IntersectionObserver from ever reporting it as visible in Chromium.
      mask: ["0", "1.15rem", "1", "inset(0 0 0 0)"],
      scale: ["0", "1rem", ".955", "inset(0 0 0 0)"],
    };
    const [x, y, scale, clip] = directions[preset];
    node.classList.add("reveal-ready");
    node.dataset.motion = preset;
    node.style.setProperty(
      "--reveal-delay",
      `${Math.min(options.delay ?? 0, 240)}ms`,
    );
    node.style.setProperty("--reveal-x", x);
    node.style.setProperty("--reveal-y", y);
    node.style.setProperty("--reveal-scale", scale);
    node.style.setProperty("--reveal-clip", clip);
    node.style.willChange = "transform, opacity, clip-path";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          node.classList.add("revealed");
          observer.unobserve(node);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -8% 0px" },
    );
    const settle = () => {
      node.style.willChange = "auto";
      node.removeEventListener("transitionend", settle);
    };
    node.addEventListener("transitionend", settle);
    observer.observe(node);
    return {
      destroy: () => {
        observer.disconnect();
        node.removeEventListener("transitionend", settle);
      },
    };
  }
</script>

<svelte:head>
  <title>Bengal Port — Connecting Bengal to the World</title>
  <meta
    name="description"
    content="Trusted international business, education and healthcare connections from Bengal to the world."
  />
</svelte:head>

<section class="hero" style={`--hero-background:url('${content.hero.backgroundImage}')`}>
  <div class="wrap hero-wrap">
    <div class="title hero-arrival">
      <h1>{content.hero.title}</h1>
      <div class="tag">
        <i></i>
        <h2>{content.hero.tagline}</h2>
        <i></i>
      </div>
      <p>{content.hero.description1}<br />{content.hero.description2}</p>
    </div>
    <div class="division-grid">
      {#each divisions as division, index}<a
          class="division {division.class}"
          href={division.href}
          style={`--arrival-delay:${160 + index * 90}ms`}
          ><div class="photo">
            <img src={division.image} alt={division.title} decoding="async" />
          </div>
          <div class="panel">
            <div class="division-icon">
              <svelte:component this={division.icon} size={34} />
            </div>
            <h3>{division.title}</h3>
            <span class="dash"></span>
            <p>{division.sub}</p>
            <strong>{division.cta}<ArrowRight size={18} /></strong>
          </div></a
        >{/each}
    </div>
    <div class="maintenance-alert" role="status" aria-live="polite">
      <span class="maintenance-beacon" aria-hidden="true"><TriangleAlert size={19} /></span>
      <p><strong>Site under maintenance</strong> — We’re sorry for the temporary inconvenience.</p>
    </div>
    <div class="stats" aria-label="Bengal Port at a glance">
      {#each stats as stat, index}<div class="stat">
          <div class="stat-icon">
            <svelte:component this={stat[2]} size={27} />
          </div>
          <div><b>{stat[0]}</b><span>{stat[1]}</span></div>
        </div>
        {#if index < stats.length - 1}<em></em>{/if}{/each}
    </div>
  </div>
</section>

<section class="section intro">
  <div class="wrap intro-grid">
    <div use:reveal={{ from: "left" }}>
      <span class="eyebrow">{content.intro.eyebrow}</span>
      <h2>{content.intro.title}</h2>
    </div>
    <div class="intro-copy" use:reveal={{ from: "right", delay: 90 }}>
      <p>{content.intro.description}</p>
      <a class="btn" href={content.intro.href}
        >{content.intro.cta} <ArrowRight size={17} /></a
      >
    </div>
  </div>
  <div class="wrap promise-row">
    {#each promises as promise, index}<article
        class="promise"
        use:reveal={{ from: "up", delay: index * 75 }}
      >
        <span><svelte:component this={promise.icon} size={23} /></span>
        <div>
          <h3>{promise.title}</h3>
          <p>{promise.text}</p>
        </div>
      </article>{/each}
  </div>
</section>

<section class="section pathways">
  <div class="wrap">
    <div class="section-head" use:reveal={{ from: "mask" }}>
      <span class="eyebrow">{content.pathways.eyebrow}</span>
      <h2>{content.pathways.title}</h2>
      <p>{content.pathways.description}</p>
    </div>
    <div class="pathway-list">
      {#each pathways as pathway, index}<a
          class="pathway"
          href={pathway.href}
          use:reveal={{
            from: index % 2 === 0 ? "left" : "right",
            delay: index * 80,
          }}
          ><div class="pathway-index">0{index + 1}</div>
          <div class="pathway-icon">
            <svelte:component this={pathway.icon} size={29} />
          </div>
          <div class="pathway-copy">
            <span>{pathway.label}</span>
            <h3>{pathway.title}</h3>
            <p>{pathway.text}</p>
          </div>
          <div class="pathway-action">
            {pathway.cta}<i><ArrowRight size={18} /></i>
          </div></a
        >{/each}
    </div>
  </div>
</section>

<section class="section process">
  <div class="wrap process-layout">
    <div class="process-heading" use:reveal={{ from: "left" }}>
      <span class="eyebrow">{content.process.eyebrow}</span>
      <h2>{content.process.title}</h2>
      <p>{content.process.description}</p>
      <a class="text-link" href={content.process.href}
        >{content.process.cta} <ArrowRight size={18} /></a
      >
    </div>
    <div class="steps">
      {#each steps as step, index}<article
          class="step"
          use:reveal={{ from: "right", delay: index * 85 }}
        >
          <span>{step.number}</span>
          <div>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </div>
          <Check size={20} />
        </article>{/each}
    </div>
  </div>
</section>

<section class="section featured">
  <div class="wrap">
    <div class="section-head" use:reveal>
      <span class="eyebrow">FEATURED OPPORTUNITIES</span>
      <h2>Your next global move starts here</h2>
      <p>
        Explore curated connections, visits, programs and services across our
        three divisions.
      </p>
    </div>
    <div class="featured-grid">
      <a class="feature feature-business" href="/opportunities" use:reveal
        ><span>Business tour</span>
        <h3>Bangladesh–China Sourcing Delegation</h3>
        <p>
          Meet verified manufacturers and visit production facilities with
          end-to-end coordination.
        </p>
        <strong>View opportunity <ArrowRight size={18} /></strong></a
      ><a class="feature feature-education" href="/education" use:reveal={90}
        ><span>Education</span>
        <h3>International MBBS Admissions</h3>
        <p>
          Compare recognized institutions, entry criteria and application
          timelines.
        </p>
        <strong>Explore programs <ArrowRight size={18} /></strong></a
      ><a class="feature feature-health" href="/healthcare" use:reveal={180}
        ><span>Healthcare</span>
        <h3>Executive Health Checkups</h3>
        <p>
          Access coordinated international checkups with trusted hospital
          partners.
        </p>
        <strong>View services <ArrowRight size={18} /></strong></a
      >
    </div>
  </div>
</section>

<section class="section featured cms-featured">
  <div class="wrap">
    <div class="section-head" use:reveal={{ from: "mask" }}>
      <span class="eyebrow">{content.featured.eyebrow}</span>
      <h2>{content.featured.title}</h2>
      <p>{content.featured.description}</p>
    </div>
    <div class="featured-grid">
      {#each content.featured.items as item, index}<a
          class="feature feature-{item.theme}"
          href={item.href}
          style={`background-image:url('${item.image}')`}
          use:reveal={{
            from:
              index === 0
                ? "left"
                : index === content.featured.items.length - 1
                  ? "right"
                  : "up",
            delay: index * 80,
          }}
          ><span>{item.label}</span>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <strong>{item.cta} <ArrowRight size={18} /></strong></a
        >{/each}
    </div>
  </div>
</section>

<section class="section closing">
  <div class="wrap closing-panel" use:reveal={{ from: "scale" }}>
    <div class="closing-mark"><Route size={31} /></div>
    <div>
      <span class="eyebrow">{content.closing.eyebrow}</span>
      <h2>{content.closing.title}</h2>
      <p>{content.closing.description}</p>
    </div>
    <a class="btn btn-light" href={content.closing.href}
      >{content.closing.cta} <ArrowRight size={18} /></a
    >
  </div>
</section>

<style>
  .hero {
    background: #fbfcfb var(--hero-background) center
      top/cover no-repeat;
    padding: 2rem 0 0;
    overflow: hidden;
  }
  .hero-wrap {
    display: flex;
    flex-direction: column;
  }
  .title {
    text-align: center;
  }
  .title h1 {
    font-size: clamp(2.75rem, 5vw, 4.65rem);
    letter-spacing: 0.025em;
    color: var(--heading);
    margin: 0 0 0.125rem;
    font-weight: 780;
    line-height: 1;
  }
  .tag {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.125rem;
  }
  .tag h2 {
    font-size: clamp(1.45rem, 2.4vw, 2.15rem);
    color: var(--heading);
    margin: 0;
    font-weight: 680;
    letter-spacing: -0.025em;
  }
  .tag i {
    width: 6.5rem;
    height: 2px;
    background: var(--gold);
    border-radius: 2px;
    position: relative;
  }
  .tag i:after {
    content: "";
    position: absolute;
    right: -0.65rem;
    top: -0.22rem;
    width: 0.55rem;
    height: 0.55rem;
    background: var(--gold);
    border-radius: 50%;
  }
  .tag i:last-child:after {
    right: auto;
    left: -0.65rem;
  }
  .title p {
    font-size: 1rem;
    line-height: 1.65;
    margin: 0.75rem 0 0.375rem;
    color: var(--text);
  }
  .hero-arrival {
    animation: hero-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .division-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 2.35rem;
    max-width: 76.875rem;
    margin: 0.125rem auto 0;
    width: 100%;
  }
  .maintenance-alert {
    position: relative;
    isolation: isolate;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.65rem;
    width: min(48rem, calc(100% - 2rem));
    margin: 1.25rem auto 0;
    padding: 0.72rem 1.15rem;
    overflow: visible;
    border: 1px solid #d82f3d;
    border-radius: 999px;
    background: #b91525;
    color: #fff;
    text-align: center;
    box-shadow: 0 0.65rem 1.6rem rgba(155, 18, 33, 0.2);
    animation: maintenance-pulse 1.15s cubic-bezier(0.77, 0, 0.175, 1) infinite alternate;
  }
  .maintenance-alert::before {
    content: "";
    position: absolute;
    z-index: -1;
    inset: -0.35rem;
    border: 2px solid rgba(220, 33, 50, 0.42);
    border-radius: inherit;
    opacity: 0.2;
    animation: maintenance-ring 1.15s cubic-bezier(0.77, 0, 0.175, 1) infinite;
  }
  .maintenance-alert p {
    margin: 0;
    color: inherit;
    font-size: clamp(0.76rem, 1.25vw, 0.9rem);
    line-height: 1.35;
    letter-spacing: 0.005em;
  }
  .maintenance-alert strong {
    color: #fff;
    font-weight: 850;
    text-transform: uppercase;
    letter-spacing: 0.055em;
  }
  .maintenance-beacon {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: #fff;
    color: #b91525;
  }
  .division {
    display: block;
    text-align: center;
    text-decoration: none;
    position: relative;
    padding-top: 0.5rem;
    transition:
      transform 0.32s cubic-bezier(0.16, 1, 0.3, 1),
      filter 0.32s;
    color: #fff;
    animation: card-in 0.7s var(--arrival-delay) cubic-bezier(0.16, 1, 0.3, 1)
      both;
  }
  .division:hover {
    transform: translateY(-0.5rem);
    filter: drop-shadow(0 1.15rem 1.35rem rgba(23, 48, 79, 0.16));
  }
  .photo {
    width: 83%;
    aspect-ratio: 1;
    margin: 0 auto -3.55rem;
    border: 0.5rem solid #fff;
    border-radius: 50%;
    position: relative;
    z-index: 1;
    box-shadow: 0 0 0 0.3rem var(--accent);
    overflow: hidden;
    background: #e8edf1;
  }
  .photo img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition:
      transform 0.55s cubic-bezier(0.16, 1, 0.3, 1),
      filter 0.35s;
  }
  .division:hover .photo img {
    transform: scale(1.045);
    filter: saturate(1.04);
  }
  .panel {
    height: 12.125rem;
    border-radius: 2.5rem;
    padding: 3.45rem 1.5rem 1.125rem;
    position: relative;
    background: var(--accent);
    box-shadow: 0 0.75rem 2rem rgba(23, 48, 79, 0.08);
  }
  .business {
    --accent: #173c6c;
  }
  .education {
    --accent: #59417a;
  }
  .health {
    --accent: #247d7c;
  }
  .division-icon {
    z-index: 2;
    position: absolute;
    top: -2.3rem;
    left: 50%;
    transform: translateX(-50%);
    width: 4.85rem;
    height: 4.85rem;
    border: 0.3rem solid white;
    border-radius: 50%;
    background: var(--accent);
    display: grid;
    place-items: center;
    box-shadow: 0 0.16rem 0 var(--gold);
  }
  .panel h3 {
    font-size: 1.55rem;
    margin: 0 0 0.25rem;
    font-weight: 720;
  }
  .dash {
    display: block;
    width: 2.1rem;
    height: 2px;
    background: var(--light-gold);
    margin: 0 auto 0.45rem;
  }
  .panel p {
    margin: 0 0 0.75rem;
    font-size: 0.875rem;
    white-space: nowrap;
    color: rgba(255, 255, 255, 0.9);
  }
  .panel strong {
    border: 1.5px solid var(--light-gold);
    color: #f6d477;
    border-radius: 1.2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.1rem;
    max-width: 17.2rem;
    margin: auto;
    height: 2.5rem;
    font-size: 0.875rem;
    font-weight: 720;
    transition:
      background 0.25s,
      color 0.25s;
  }
  .division:hover .panel strong {
    background: var(--light-gold);
    color: var(--heading);
  }
  .panel strong svg {
    transition: transform 0.25s;
  }
  .division:hover .panel strong svg {
    transform: translateX(0.3rem);
  }
  .stats {
    max-width: 83.75rem;
    margin: 5.8rem auto 0;
    background: rgba(255, 255, 255, 0.97);
    min-height: 7.25rem;
    border-radius: 3.625rem 3.625rem 0 0;
    box-shadow: 0 -0.5rem 2rem rgba(23, 48, 79, 0.07);
    display: flex;
    align-items: center;
    justify-content: space-evenly;
    padding: 1.25rem 1.875rem;
    width: 100%;
    animation: stats-in 0.8s 0.42s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .stat {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  .stat-icon {
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    border: 1px solid #e1e6eb;
    color: var(--heading);
    box-shadow: 0 0.35rem 0.8rem rgba(23, 48, 79, 0.09);
    background: #fff;
  }
  .stat:nth-of-type(5) .stat-icon,
  .stat:nth-of-type(9) .stat-icon {
    color: var(--gold);
  }
  .stat b {
    display: block;
    font-size: 1.8rem;
    color: var(--heading);
    font-weight: 740;
    letter-spacing: -0.035em;
  }
  .stat span {
    font-size: 0.875rem;
    color: var(--muted);
  }
  .stats em {
    height: 3.4rem;
    width: 1px;
    background: #e0e4e8;
  }
  .intro {
    background: #fff;
  }
  .intro-grid {
    display: grid;
    grid-template-columns: 1.12fr 1fr;
    gap: clamp(3rem, 7vw, 6.25rem);
    align-items: center;
  }
  .intro h2,
  .section-head h2,
  .process h2,
  .closing h2 {
    color: var(--heading);
    font-weight: 680;
    letter-spacing: -0.035em;
  }
  .intro h2 {
    font-size: clamp(2.25rem, 4.3vw, 3.65rem);
    line-height: 1.08;
    margin: 0.75rem 0;
  }
  .intro-copy p {
    font-size: 1.1rem;
    line-height: 1.8;
    color: var(--muted);
    max-width: 38rem;
  }
  .promise-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    margin-top: 4.5rem;
    border-top: 1px solid var(--line);
    border-bottom: 1px solid var(--line);
  }
  .promise {
    display: flex;
    gap: 1rem;
    padding: 2rem 2.1rem;
  }
  .promise + .promise {
    border-left: 1px solid var(--line);
  }
  .promise > span {
    width: 3rem;
    height: 3rem;
    display: grid;
    place-items: center;
    flex: none;
    border-radius: 50%;
    background: var(--gold-wash);
    color: var(--gold-deep);
  }
  .promise h3 {
    font-size: 1.05rem;
    color: var(--heading);
    margin: 0.15rem 0 0.45rem;
  }
  .promise p {
    font-size: 0.9rem;
    line-height: 1.65;
    color: var(--muted);
    margin: 0;
  }
  .pathways {
    background: var(--surface);
  }
  .section-head p {
    color: var(--muted);
    line-height: 1.75;
  }
  .pathway-list {
    border-top: 1px solid var(--line);
  }
  .pathway {
    display: grid;
    grid-template-columns: 4rem 4.25rem minmax(0, 1fr) auto;
    align-items: center;
    gap: 1.5rem;
    padding: 2rem 1rem;
    border-bottom: 1px solid var(--line);
    text-decoration: none;
    color: inherit;
    transition: background 0.3s;
  }
  .pathway:hover {
    background: #fff;
  }
  .pathway-index {
    font-size: 0.78rem;
    letter-spacing: 0.14em;
    color: #8995a4;
  }
  .pathway-icon {
    width: 4rem;
    height: 4rem;
    display: grid;
    place-items: center;
    color: var(--gold-deep);
    border: 1px solid #e5d5ae;
    border-radius: 50%;
    background: #fffaf0;
  }
  .pathway-copy > span,
  .feature > span {
    font-size: 0.76rem;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-weight: 750;
    color: var(--gold-deep);
  }
  .pathway-copy h3 {
    font-size: clamp(1.25rem, 2vw, 1.65rem);
    color: var(--heading);
    margin: 0.3rem 0 0.35rem;
    font-weight: 650;
  }
  .pathway-copy p {
    color: var(--muted);
    line-height: 1.65;
    max-width: 52rem;
    margin: 0;
  }
  .pathway-action {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    color: var(--heading);
    font-weight: 700;
    white-space: nowrap;
  }
  .pathway-action i {
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: var(--heading);
    color: #fff;
    transition:
      transform 0.3s,
      background 0.3s;
  }
  .pathway:hover .pathway-action i {
    transform: translateX(0.3rem);
    background: var(--gold-deep);
  }
  .process {
    background: #fff;
  }
  .process-layout {
    display: grid;
    grid-template-columns: 0.9fr 1.1fr;
    gap: clamp(3rem, 8vw, 7rem);
    align-items: center;
  }
  .process-heading h2 {
    font-size: clamp(2.25rem, 4vw, 3.45rem);
    line-height: 1.1;
    margin: 0.7rem 0 1.2rem;
  }
  .process-heading > p {
    color: var(--muted);
    font-size: 1.05rem;
    line-height: 1.8;
    max-width: 36rem;
  }
  .text-link {
    display: inline-flex;
    align-items: center;
    gap: 0.6rem;
    color: var(--gold-deep);
    font-weight: 750;
    text-decoration: none;
    margin-top: 0.6rem;
  }
  .text-link svg {
    transition: transform 0.25s;
  }
  .text-link:hover svg {
    transform: translateX(0.3rem);
  }
  .steps {
    position: relative;
  }
  .steps:before {
    content: "";
    position: absolute;
    left: 2rem;
    top: 2.2rem;
    bottom: 2.2rem;
    width: 1px;
    background: #dce2e7;
  }
  .step {
    display: grid;
    grid-template-columns: 4rem 1fr 2.5rem;
    gap: 1.25rem;
    align-items: center;
    padding: 1.55rem 0;
    position: relative;
  }
  .step > span {
    width: 4rem;
    height: 4rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: #fff;
    border: 1px solid #d9e0e5;
    color: var(--gold-deep);
    font-size: 0.8rem;
    font-weight: 800;
    z-index: 1;
  }
  .step h3 {
    color: var(--heading);
    font-size: 1.15rem;
    margin: 0 0 0.35rem;
  }
  .step p {
    color: var(--muted);
    line-height: 1.65;
    margin: 0;
  }
  .step > svg {
    color: #5f8a72;
    background: #edf6f0;
    border-radius: 50%;
    padding: 0.65rem;
    width: 2.5rem;
    height: 2.5rem;
  }
  .featured {
    background: #f3f5f5;
  }
  .featured-grid {
    display: grid;
    grid-template-columns: 1.2fr 0.9fr 0.9fr;
    gap: 1.25rem;
  }
  .feature {
    min-height: 22rem;
    padding: 2rem;
    border-radius: 1rem;
    text-decoration: none;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    position: relative;
    overflow: hidden;
    color: #fff;
    isolation: isolate;
    box-shadow: 0 0.8rem 2.4rem rgba(23, 48, 79, 0.1);
    transition:
      transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.35s;
  }
  .feature:before {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(
      180deg,
      transparent 5%,
      rgba(10, 27, 48, 0.92) 100%
    );
    z-index: -1;
  }
  .feature-business {
    background: url("/images/global-business.webp") center/cover;
  }
  .feature-education {
    background: url("/images/global-education.webp") center/cover;
  }
  .feature-health {
    background: url("/images/global-healthcare.webp") center/cover;
  }
  .feature:hover {
    transform: translateY(-0.45rem);
    box-shadow: 0 1.3rem 3rem rgba(23, 48, 79, 0.18);
  }
  .feature > span {
    color: #f2c65c;
  }
  .feature h3 {
    font-size: clamp(1.35rem, 2vw, 1.8rem);
    line-height: 1.18;
    margin: 0.55rem 0;
    font-weight: 680;
  }
  .feature p {
    line-height: 1.65;
    color: rgba(255, 255, 255, 0.84);
  }
  .feature strong {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    color: #f4ce73;
  }
  .feature strong svg {
    transition: transform 0.25s;
  }
  .feature:hover strong svg {
    transform: translateX(0.3rem);
  }
  .closing {
    padding-top: 1.5rem;
    background: #f3f5f5;
  }
  .closing-panel {
    min-height: 18rem;
    border-radius: 1rem;
    background: var(--heading);
    color: #fff;
    padding: clamp(2rem, 5vw, 4.5rem);
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 2rem;
    position: relative;
    overflow: hidden;
  }
  .closing-panel:after {
    content: "";
    position: absolute;
    width: 22rem;
    height: 22rem;
    border: 1px solid rgba(255, 255, 255, 0.09);
    border-radius: 50%;
    right: -8rem;
    top: -9rem;
    box-shadow:
      0 0 0 3.5rem rgba(255, 255, 255, 0.025),
      0 0 0 7rem rgba(255, 255, 255, 0.018);
  }
  .closing-mark {
    width: 4.5rem;
    height: 4.5rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #efc45e;
  }
  .closing h2 {
    color: #fff;
    font-size: clamp(2rem, 3.4vw, 3rem);
    margin: 0.5rem 0;
  }
  .closing p {
    color: rgba(255, 255, 255, 0.72);
    max-width: 43rem;
    line-height: 1.7;
    margin: 0;
  }
  .closing .btn {
    position: relative;
    z-index: 1;
  }
  :global(.reveal-ready) {
    opacity: 0;
    transform: translateY(1.5rem);
    filter: blur(0.25rem);
    transition:
      opacity 0.7s var(--reveal-delay) cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.7s var(--reveal-delay) cubic-bezier(0.16, 1, 0.3, 1),
      filter 0.7s var(--reveal-delay);
  }
  :global(.reveal-ready.revealed) {
    opacity: 1;
    transform: none;
    filter: none;
  }
  @keyframes hero-in {
    from {
      opacity: 0;
      transform: translateY(-0.7rem);
      filter: blur(0.2rem);
    }
    to {
      opacity: 1;
      transform: none;
      filter: none;
    }
  }
  @keyframes card-in {
    from {
      opacity: 0;
      transform: translateY(1.5rem);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes stats-in {
    from {
      opacity: 0;
      transform: translateY(1rem);
    }
    to {
      opacity: 1;
      transform: none;
    }
  }
  @keyframes maintenance-pulse {
    from {
      opacity: 0.88;
      transform: scale(0.985);
    }
    to {
      opacity: 1;
      transform: scale(1.025);
    }
  }
  @keyframes maintenance-ring {
    from {
      opacity: 0.45;
      transform: scale(0.99);
    }
    to {
      opacity: 0;
      transform: scale(1.055);
    }
  }
  @media (min-width: 46.3125rem) {
    .hero {
      height: calc(100svh - 9.0625rem);
      min-height: 0;
      display: flex;
    }
    .hero-wrap {
      min-height: 0;
    }
    .stats {
      margin-top: auto;
      flex: none;
    }
  }
  @media (min-width: 46.3125rem) and (max-width: 68.75rem) {
    .hero {
      height: calc(100svh - 8.3125rem);
    }
  }
  @media (min-width: 46.3125rem) and (max-height: 59.375rem) {
    .hero {
      padding-top: 0.85rem;
    }
    .title h1 {
      font-size: clamp(2.4rem, 4.4vw, 3.5rem);
    }
    .tag h2 {
      font-size: clamp(1.2rem, 2.1vw, 1.7rem);
    }
    .tag i {
      width: 4.5rem;
    }
    .title p {
      font-size: 0.82rem;
      line-height: 1.45;
      margin: 0.4rem 0 0.2rem;
    }
    .division-grid {
      max-width: 67.5rem;
      gap: 1.5rem;
      margin-top: 0;
    }
    .photo {
      width: min(68%, 15rem);
      border-width: 0.375rem;
      margin-bottom: -2.65rem;
    }
    .panel {
      height: 9.5rem;
      border-radius: 1.9rem;
      padding: 2.65rem 1rem 0.7rem;
    }
    .division-icon {
      width: 3.65rem;
      height: 3.65rem;
      top: -1.7rem;
      border-width: 0.25rem;
    }
    .division-icon :global(svg) {
      width: 1.7rem;
    }
    .panel h3 {
      font-size: 1.18rem;
    }
    .panel p {
      font-size: 0.7rem;
      margin-bottom: 0.45rem;
    }
    .panel strong {
      height: 1.95rem;
      max-width: 14.4rem;
      font-size: 0.7rem;
    }
    .stats {
      min-height: 5.15rem;
      border-radius: 2.6rem 2.6rem 0 0;
      padding: 0.55rem 1.35rem;
    }
    .stat {
      gap: 0.65rem;
    }
    .stat-icon {
      width: 2.9rem;
      height: 2.9rem;
    }
    .stat-icon :global(svg) {
      width: 1.35rem;
    }
    .stat b {
      font-size: 1.35rem;
    }
    .stat span {
      font-size: 0.7rem;
    }
    .stats em {
      height: 2.5rem;
    }
  }
  @media (min-width: 46.3125rem) and (max-height: 43.75rem) {
    .hero {
      padding-top: 0.4rem;
    }
    .title h1 {
      font-size: 2.25rem;
    }
    .tag h2 {
      font-size: 1.18rem;
    }
    .title p {
      font-size: 0.7rem;
      margin: 0.25rem 0;
    }
    .photo {
      width: min(58%, 11.9rem);
      margin-bottom: -2rem;
    }
    .panel {
      height: 7.9rem;
      padding-top: 2.15rem;
      border-radius: 1.55rem;
    }
    .division-icon {
      width: 3rem;
      height: 3rem;
      top: -1.4rem;
    }
    .panel h3 {
      font-size: 1rem;
    }
    .panel p {
      font-size: 0.58rem;
      margin-bottom: 0.3rem;
    }
    .panel strong {
      height: 1.7rem;
      font-size: 0.58rem;
    }
    .stats {
      min-height: 4.1rem;
      padding: 0.4rem 1rem;
    }
    .stat-icon {
      width: 2.4rem;
      height: 2.4rem;
    }
    .stat b {
      font-size: 1.1rem;
    }
    .stat span {
      font-size: 0.58rem;
    }
  }
  @media (max-width: 65.625rem) {
    .division-grid {
      gap: 1.1rem;
    }
    .photo {
      width: 88%;
    }
    .panel h3 {
      font-size: 1.25rem;
    }
    .panel p {
      font-size: 0.75rem;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(5, minmax(0, 1fr));
      overflow: visible;
      gap: 0.5rem;
    }
    .stat {
      min-width: 0;
      justify-content: center;
    }
    .stats em {
      display: none;
    }
    .featured-grid {
      grid-template-columns: 1fr 1fr;
    }
    .feature-business {
      grid-column: 1/-1;
      min-height: 25rem;
    }
    .pathway {
      grid-template-columns: 3rem 3.75rem minmax(0, 1fr);
    }
    .pathway-action {
      grid-column: 3;
      padding-top: 0.3rem;
    }
    .pathway-icon {
      width: 3.5rem;
      height: 3.5rem;
    }
  }
  @media (max-width: 48rem) {
    .intro-grid,
    .process-layout {
      grid-template-columns: 1fr;
      gap: 1.5rem;
    }
    .promise-row {
      grid-template-columns: 1fr;
      margin-top: 3rem;
    }
    .promise {
      padding: 1.5rem 0;
    }
    .promise + .promise {
      border-left: 0;
      border-top: 1px solid var(--line);
    }
    .featured-grid {
      grid-template-columns: 1fr;
    }
    .feature-business {
      grid-column: auto;
      min-height: 22rem;
    }
    .closing-panel {
      grid-template-columns: 1fr;
    }
    .closing-mark {
      width: 3.75rem;
      height: 3.75rem;
    }
    .closing-panel .btn {
      justify-self: start;
    }
    .pathway {
      grid-template-columns: 3.5rem 1fr;
      gap: 1rem;
    }
    .pathway-index {
      display: none;
    }
    .pathway-copy,
    .pathway-action {
      grid-column: 2;
    }
    .pathway:hover {
      padding-inline: 1rem;
    }
  }
  @media (max-width: 46.25rem) {
    .hero {
      padding-top: 2.25rem;
    }
    .tag {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      justify-items: center;
      gap: 0.65rem;
      padding-inline: 0.75rem;
    }
    .tag h2 {
      grid-row: 1;
      max-width: 100%;
      line-height: 1.25;
      text-wrap: balance;
    }
    .tag i {
      grid-row: 2;
      width: 5rem;
      height: 2px;
      justify-self: center;
    }
    .tag i:first-child:before {
      content: "";
      position: absolute;
      left: -0.55rem;
      top: 50%;
      width: 0.42rem;
      height: 0.42rem;
      border-radius: 50%;
      background: var(--gold);
      transform: translateY(-50%);
    }
    .tag i:first-child:after {
      right: -0.55rem;
      top: 50%;
      width: 0.42rem;
      height: 0.42rem;
      transform: translateY(-50%);
    }
    .tag i:last-child {
      display: none;
    }
    .title p {
      font-size: 0.875rem;
      padding-inline: 0.5rem;
    }
    .title p br {
      display: none;
    }
    .division-grid {
      grid-template-columns: 1fr;
      max-width: 24.5rem;
      gap: 2rem;
      margin-top: 1.5rem;
    }
    .maintenance-alert {
      width: calc(100% - 1rem);
      margin-top: 1.35rem;
      padding: 0.8rem 0.9rem;
      border-radius: 1rem;
      text-align: left;
    }
    .photo {
      width: 82%;
    }
    .panel {
      height: 11.75rem;
    }
    .stats {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      border-radius: 2rem 2rem 0 0;
      margin-top: 2.75rem;
      padding: 1rem;
      gap: 0.65rem;
    }
    .stat {
      min-width: 0;
      justify-content: flex-start;
      padding: 0.65rem;
      border-radius: 0.9rem;
      background: rgba(247, 249, 250, 0.9);
    }
    .stat:last-of-type {
      grid-column: 1 / -1;
      width: min(100%, 11rem);
      justify-self: center;
    }
    .stat-icon {
      width: 3.3rem;
      height: 3.3rem;
    }
    .stat b {
      font-size: 1.4rem;
    }
    .stat span {
      display: block;
      line-height: 1.25;
    }
    .panel p {
      font-size: 0.8rem;
    }
    .closing {
      padding-top: 1rem;
    }
  }
  @media (max-width: 30rem) {
    .title h1 {
      font-size: 2.45rem;
    }
    .tag h2 {
      font-size: 1.15rem;
    }
    .tag i { width: 4.5rem; }
    .photo {
      width: 78%;
    }
    .pathway {
      grid-template-columns: 1fr;
    }
    .pathway-icon,
    .pathway-copy,
    .pathway-action {
      grid-column: 1;
    }
    .feature {
      min-height: 20rem;
      padding: 1.5rem;
    }
    .step {
      grid-template-columns: 3.4rem 1fr;
    }
    .step > span {
      width: 3.4rem;
      height: 3.4rem;
    }
    .step > svg {
      display: none;
    }
    .steps:before {
      left: 1.7rem;
    }
    .closing-panel {
      padding: 2rem 1.4rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .hero-arrival,
    .division,
    .stats {
      animation: none;
    }
    .maintenance-alert,
    .maintenance-alert::before {
      animation: none;
    }
    :global(.reveal-ready) {
      opacity: 1;
      transform: none;
      filter: none;
      transition: none;
    }
    .division,
    .photo img,
    .feature,
    .pathway,
    .pathway-action i {
      transition: none;
    }
  }
  @media (max-width: 46.25rem) {
    .hero-arrival,
    .division,
    .stats {
      animation: none;
    }
  }
  /* The circular division portal is the hero's primary interaction cue. */
  .division-grid {
    margin-top: 1.35rem;
  }
  .photo {
    isolation: isolate;
    transition:
      box-shadow 0.55s cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.55s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .photo img {
    position: relative;
    z-index: 0;
  }
  .photo:after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 0.24rem solid transparent;
    background: color-mix(in srgb, var(--accent) 0%, transparent);
    box-shadow: inset 0 0 0 0 transparent;
    transition:
      background 0.6s cubic-bezier(0.16, 1, 0.3, 1),
      border-color 0.6s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }
  .division:is(:hover, :focus-visible) {
    transform: translateY(-0.55rem);
    filter: drop-shadow(0 1.2rem 1.45rem rgba(23, 48, 79, 0.17));
  }
  .division:is(:hover, :focus-visible) .photo {
    transform: translateY(-0.18rem);
    box-shadow:
      0 0 0 0.34rem var(--light-gold),
      0 0.9rem 2.4rem color-mix(in srgb, var(--accent) 24%, transparent);
  }
  .division:is(:hover, :focus-visible) .photo:after {
    background: color-mix(in srgb, var(--accent) 13%, transparent);
    border-color: color-mix(in srgb, var(--light-gold) 78%, white);
    box-shadow: inset 0 0 2rem
      color-mix(in srgb, var(--accent) 18%, transparent);
  }
  .division:is(:hover, :focus-visible) .photo img {
    transform: scale(1.055);
    filter: saturate(1.08) contrast(1.02);
  }
  .division:is(:hover, :focus-visible) .division-icon {
    transform: translateX(-50%) scale(1.06);
    box-shadow:
      0 0.18rem 0 var(--light-gold),
      0 0.55rem 1.2rem color-mix(in srgb, var(--accent) 25%, transparent);
  }
  .division-icon {
    transition:
      transform 0.35s cubic-bezier(0.16, 1, 0.3, 1),
      box-shadow 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .division:is(:hover, :focus-visible) .panel strong {
    background: var(--light-gold);
    color: var(--heading);
  }
  .division:is(:hover, :focus-visible) .panel strong :global(svg) {
    transform: translateX(0.3rem);
  }
  .panel strong :global(svg) {
    transition: transform 0.25s;
  }
  @media (min-width: 46.3125rem) and (max-height: 59.375rem) {
    .division-grid {
      margin-top: 0.75rem;
    }
  }
  @media (min-width: 46.3125rem) and (max-height: 43.75rem) {
    .division-grid {
      margin-top: 0.3rem;
    }
  }
  @media (max-width: 46.25rem) {
    .division-grid {
      margin-top: 1.75rem;
    }
    .division:is(:hover, :focus-visible) {
      transform: translateY(-0.3rem);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .division,
    .photo,
    .photo:after,
    .photo img,
    .division-icon,
    .panel strong :global(svg) {
      transition: none;
    }
    .division:is(:hover, :focus-visible) {
      transform: none;
    }
    .division:is(:hover, :focus-visible) .photo {
      transform: none;
    }
  }
  .photo:after {
    z-index: 1;
  }
  /* Lightweight, one-shot GSAP-style scroll choreography. */
  :global(.reveal-ready) {
    opacity: 0;
    transform: translate3d(var(--reveal-x, 0), var(--reveal-y, 2rem), 0)
      scale(var(--reveal-scale, 0.985));
    clip-path: var(--reveal-clip, inset(0 0 0 0));
    filter: none;
    transition:
      opacity 0.7s var(--reveal-delay, 0ms) cubic-bezier(0.16, 1, 0.3, 1),
      transform 0.7s var(--reveal-delay, 0ms) cubic-bezier(0.16, 1, 0.3, 1),
      clip-path 0.78s var(--reveal-delay, 0ms) cubic-bezier(0.16, 1, 0.3, 1);
    backface-visibility: hidden;
  }
  :global(.reveal-ready.revealed) {
    opacity: 1;
    transform: translate3d(0, 0, 0) scale(1);
    clip-path: inset(0 0 0 0);
  }
  :global(.reveal-ready[data-motion="mask"]) {
    transform-origin: 50% 0;
  }
  :global(.reveal-ready[data-motion="scale"]) {
    transform-origin: 50% 50%;
  }
  @media (max-width: 46.25rem) {
    :global(.reveal-ready) {
      --reveal-x: 0 !important;
      --reveal-y: 1.4rem !important;
      transition-duration: 0.58s;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(.reveal-ready),
    :global(.reveal-ready.revealed) {
      opacity: 1;
      transform: none;
      clip-path: none;
      transition: none;
    }
  }
  .featured:not(.cms-featured) {
    display: none;
  }

  /* Final craft pass: restrained color, tactile links, and cohesive motion. */
  .title h1 {
    color: #1c3857;
    font-weight: 720;
    letter-spacing: 0.018em;
    text-wrap: balance;
  }
  .tag h2 {
    color: #29445f;
    font-weight: 620;
  }
  .title p {
    color: #526579;
    line-height: 1.72;
  }
  .division {
    transition:
      transform 220ms var(--ease-out),
      filter 220ms ease;
  }
  .panel {
    box-shadow:
      inset 0 1px rgba(255, 255, 255, 0.1),
      0 0.75rem 2rem rgba(23, 48, 79, 0.08);
  }
  .panel h3 {
    font-weight: 680;
    letter-spacing: -0.01em;
  }
  .panel strong {
    font-weight: 680;
    transition:
      background-color 180ms ease,
      color 180ms ease,
      border-color 180ms ease,
      transform 160ms var(--ease-out);
  }
  .division:active {
    transform: scale(0.985);
  }
  .division:active .panel strong {
    transform: scale(0.97);
  }
  .stats {
    border: 1px solid rgba(23, 48, 79, 0.055);
    border-bottom: 0;
    box-shadow: 0 -0.45rem 2.2rem rgba(23, 48, 79, 0.065);
  }
  .stat {
    border-radius: 1rem;
    padding: 0.5rem 0.65rem;
    transition:
      transform 180ms var(--ease-out),
      background-color 180ms ease;
  }
  .stat-icon {
    transition:
      transform 200ms var(--ease-out),
      border-color 180ms ease,
      box-shadow 180ms ease;
  }
  .pathway {
    transition:
      background-color 180ms ease,
      transform 200ms var(--ease-out),
      box-shadow 200ms ease;
  }
  .pathway-action i {
    transition:
      transform 180ms var(--ease-out),
      background-color 180ms ease;
  }
  .feature {
    transition:
      transform 220ms var(--ease-out),
      box-shadow 220ms ease;
  }
  .feature:active,
  .pathway:active {
    transform: scale(0.985);
  }
  .promise > span,
  .pathway-icon,
  .step > span {
    transition:
      transform 200ms var(--ease-out),
      border-color 180ms ease,
      box-shadow 180ms ease;
  }
  .text-link {
    border-radius: 0.35rem;
  }
  .text-link svg,
  .feature strong svg {
    transition: transform 180ms var(--ease-out);
  }
  @media (hover: hover) and (pointer: fine) {
    .division:hover {
      transform: translateY(-0.4rem);
      filter: drop-shadow(0 1.05rem 1.3rem rgba(23, 48, 79, 0.15));
    }
    .division:hover .photo {
      transform: translateY(-0.14rem);
    }
    .division:hover .division-icon {
      transform: translateX(-50%) scale(1.04);
    }
    .division:hover .panel strong {
      border-color: #efd17f;
    }
    .stat:hover {
      transform: translateY(-0.14rem);
      background: #fbf7ec;
    }
    .stat:hover .stat-icon {
      transform: scale(1.04);
      border-color: #dcc27e;
      box-shadow: 0 0.5rem 1rem rgba(23, 48, 79, 0.11);
    }
    .promise:hover > span {
      transform: translateY(-0.15rem);
      box-shadow: 0 0.5rem 1rem rgba(168, 118, 24, 0.12);
    }
    .pathway:hover {
      transform: translateX(0.3rem);
      box-shadow: -0.3rem 0 0 var(--gold);
    }
    .feature:hover {
      transform: translateY(-0.35rem);
      box-shadow: 0 1.2rem 2.8rem rgba(23, 48, 79, 0.16);
    }
  }
  @media (hover: none) {
    .division:hover,
    .feature:hover,
    .pathway:hover {
      transform: none;
      filter: none;
    }
    .division:hover .photo,
    .division:hover .photo img,
    .division:hover .division-icon {
      transform: none;
    }
  }
</style>
