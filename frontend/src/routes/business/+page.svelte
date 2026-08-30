<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import {
    defaultBusinessContent,
    type BusinessContent,
  } from "$lib/business-content";
  import {
    ArrowRight,
    BriefcaseBusiness,
    Calculator,
    CheckCircle2,
    FileText,
    Globe2,
    Handshake,
    Headphones,
    Network,
    Package,
    Search,
    ShieldCheck,
    Smile,
    UsersRound,
  } from "lucide-svelte";
  const icons: Record<string, any> = {
    globe: Globe2,
    users: UsersRound,
    briefcase: BriefcaseBusiness,
    handshake: Handshake,
    calculator: Calculator,
    search: Search,
    file: FileText,
    package: Package,
    smile: Smile,
    network: Network,
    headset: Headphones,
    shield: ShieldCheck,
  };
  let content: BusinessContent = structuredClone(defaultBusinessContent),
    partners: any[] = [],
    loading = true,
    error = "";
  let productCost = 100000,
    shipping = 18000,
    duty = 15;
  $: landed =
    Number(productCost || 0) +
    Number(shipping || 0) +
    (Number(productCost || 0) * Number(duty || 0)) / 100;
  function reveal(node: HTMLElement) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return {};
    node.style.opacity = "0";
    node.style.transform = "translateY(24px)";
    node.style.transition =
      "opacity 650ms cubic-bezier(.23,1,.32,1), transform 650ms cubic-bezier(.23,1,.32,1)";
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => {
            node.style.opacity = "1";
            node.style.transform = "translateY(0)";
          });
          observer.disconnect();
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -6%" },
    );
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
  }
  onMount(async () => {
    try {
      const [page, suppliers, factories] = await Promise.all([
        api<{ content: BusinessContent }>("/content/business"),
        api<any[]>("/suppliers"),
        api<any[]>("/factories"),
      ]);
      content = page.content;
      partners = [
        ...suppliers.map((item) => ({ ...item, kind: "Supplier" })),
        ...factories.map((item) => ({ ...item, kind: "Factory" })),
      ]
        .sort((a, b) => Number(b.featured) - Number(a.featured))
        .slice(0, 6);
    } catch {
      error = "Live partner data is temporarily unavailable.";
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head
  ><title>Global Business — Bengal Port</title><meta
    name="description"
    content={content.hero.description}
  /></svelte:head
>
<main class="business-page">
  <section class="business-hero" style={`--hero:url('${content.hero.image}')`}>
    <div class="hero-shade"></div>
    <div class="hero-glow"></div>
    <div class="business-wrap hero-copy">
      <p class="breadcrumb">{content.hero.eyebrow}</p>
      <h1>{content.hero.title}</h1>
      <i class="gold-rule"></i>
      <h2>{content.hero.tagline}</h2>
      <p class="hero-description">{content.hero.description}</p>
      <div class="hero-actions">
        <a class="gold-button" href="/apply?type=business"
          >START AN ENQUIRY <ArrowRight size={18} /></a
        ><a class="ghost-button" href="/business/apply">PLAN A BUSINESS VISIT</a
        >
      </div>
    </div>
  </section>
  <nav class="shortcut-bar business-wrap" aria-label="Business services">
    {#each content.shortcuts as item}{@const Icon =
        icons[item.icon] || Globe2}<a href={item.href}
        ><span class="shortcut-icon"><Icon size={22} /></span><span
          ><b>{item.title}</b><small>{item.subtitle}</small></span
        ><ArrowRight class="shortcut-arrow" size={16} /></a
      >{/each}
  </nav>
  <section class="offer section-space" id="services" use:reveal>
    <div class="business-wrap">
      <header class="section-heading">
        <span>{content.services.eyebrow}</span>
        <h2>{content.services.title}</h2>
        <p>{content.services.description}</p>
      </header>
      <div class="service-grid">
        {#each content.services.items as item, i}{@const Icon =
            icons[item.icon] || Globe2}<a
            class="service-card"
            href={item.href}
            style={`--delay:${i * 45}ms`}
            ><span class="service-icon"><Icon size={28} /></span>
            <h3>{item.title}</h3>
            <p>{item.description}</p>
            <strong>{item.cta}<ArrowRight size={16} /></strong></a
          >{/each}
      </div>
    </div>
  </section>
  <section
    class="proof business-wrap"
    use:reveal
    aria-label="Bengal Port achievements"
  >
    {#each content.stats as stat}{@const Icon = icons[stat.icon] || Globe2}
      <article>
        <Icon size={31} />
        <div><b>{stat.value}</b><span>{stat.label}</span></div>
      </article>{/each}
  </section>
  <section class="trust section-space" use:reveal>
    <div class="business-wrap trust-layout">
      <div class="trust-intro">
        <span class="eyebrow">{content.trust.eyebrow}</span>
        <h2>{content.trust.title}</h2>
        <p>{content.trust.description}</p>
        <a href="/about">How we work <ArrowRight size={16} /></a>
      </div>
      <div class="trust-points">
        {#each content.trust.items as item}{@const Icon =
            icons[item.icon] || CheckCircle2}
          <article>
            <Icon size={25} />
            <h3>{item.title}</h3>
            <p>{item.description}</p>
          </article>{/each}
      </div>
    </div>
  </section>
  <section class="partners section-space" id="partners" use:reveal>
    <div class="business-wrap">
      <header class="section-heading left">
        <span>{content.partners.eyebrow}</span>
        <h2>{content.partners.title}</h2>
        <p>{content.partners.description}</p>
      </header>
      {#if error}<p class="data-note">{error}</p>{/if}
      <div class="partner-grid" aria-busy={loading}>
        {#if loading}{#each Array(3) as _}<article
              class="partner-card skeleton"
            ></article>{/each}{:else}{#each partners as partner}<a
              class="partner-card"
              href="/apply?type=business"
              ><div class="partner-image">
                <img
                  src={partner.image}
                  alt={partner.name}
                  loading="lazy"
                  decoding="async"
                /><span>{partner.kind}</span>
              </div>
              <div class="partner-copy">
                <small>{partner.country} · {partner.industry}</small>
                <h3>{partner.name}</h3>
                <b>{partner.product}</b>
                <p>{partner.description}</p>
                <strong>Request connection <ArrowRight size={16} /></strong>
              </div></a
            >{/each}{/if}
      </div>
    </div>
  </section>
  <section class="calculator-section section-space" id="calculator" use:reveal>
    <div class="business-wrap calculator-layout">
      <div>
        <span class="eyebrow">TRADE PLANNING</span>
        <h2>Understand your estimated landed cost.</h2>
        <p>
          Use this quick planning tool for an early estimate. Our team can
          prepare a detailed quotation for your actual shipment.
        </p>
        <ul>
          <li><CheckCircle2 />Flexible product value</li>
          <li><CheckCircle2 />Shipping estimate</li>
          <li><CheckCircle2 />Duty percentage</li>
        </ul>
      </div>
      <form class="calculator-card" onsubmit={(e) => e.preventDefault()}>
        <label
          ><span>Product value (৳)</span><input
            type="number"
            min="0"
            step="1000"
            bind:value={productCost}
          /></label
        >
        <div class="calc-grid">
          <label
            ><span>Shipping (৳)</span><input
              type="number"
              min="0"
              step="500"
              bind:value={shipping}
            /></label
          ><label
            ><span>Estimated duty (%)</span><input
              type="number"
              min="0"
              max="100"
              step=".5"
              bind:value={duty}
            /></label
          >
        </div>
        <div class="total">
          <span>Estimated landed cost</span><b
            >৳{landed.toLocaleString("en-BD", { maximumFractionDigits: 0 })}</b
          ><small>Planning estimate only; taxes and fees may vary.</small>
        </div>
        <a class="gold-button" href="/apply?type=business"
          >REQUEST A DETAILED QUOTE <ArrowRight size={17} /></a
        >
      </form>
    </div>
  </section>
  <section class="closing business-wrap" use:reveal>
    <div>
      <span>BUSINESS SUPPORT</span>
      <h2>{content.closing.title}</h2>
      <p>{content.closing.description}</p>
    </div>
    <div>
      <a class="gold-button" href={content.closing.primaryHref}
        >{content.closing.primary}<ArrowRight size={18} /></a
      ><a class="outline-button" href={content.closing.secondaryHref}
        >{content.closing.secondary}<ArrowRight size={18} /></a
      >
    </div>
  </section>
</main>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }
  .business-page {
    background: #fbfcfd;
    color: #34465a;
    padding: 1rem 0 5rem;
  }
  .business-wrap {
    width: min(88rem, calc(100% - clamp(2rem, 6vw, 6rem)));
    margin-inline: auto;
  }
  .business-hero {
    width: min(90rem, calc(100% - clamp(1.5rem, 5vw, 5rem)));
    min-height: clamp(25rem, 38vw, 34rem);
    margin: auto;
    border-radius: 1.8rem;
    overflow: hidden;
    position: relative;
    display: flex;
    align-items: center;
    background-image: var(--hero);
    background-size: cover;
    background-position: center;
    isolation: isolate;
    box-shadow: 0 1.8rem 5rem #081b341c;
  }
  .hero-shade {
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      #061a35 0%,
      #071b35ed 35%,
      #071b3585 60%,
      #071b3514 100%
    );
    z-index: -1;
  }
  .hero-glow {
    position: absolute;
    width: 35rem;
    height: 35rem;
    left: -12rem;
    top: -18rem;
    background: #c9952d16;
    border-radius: 50%;
    filter: blur(2rem);
    z-index: -1;
  }
  .hero-copy {
    color: #fff;
    padding-block: 4.2rem;
  }
  .breadcrumb {
    font-size: 0.78rem;
    color: #e3bc61;
    margin: 0 0 1.2rem;
  }
  .hero-copy h1 {
    font-size: clamp(2.8rem, 5.2vw, 5.3rem);
    line-height: 0.95;
    letter-spacing: -0.045em;
    margin: 0;
    max-width: 42rem;
  }
  .gold-rule {
    display: block;
    width: 3.3rem;
    height: 0.18rem;
    border-radius: 1rem;
    background: var(--gold);
    margin: 1.25rem 0;
  }
  .hero-copy h2 {
    font-size: clamp(1.15rem, 2vw, 1.6rem);
    color: #efc45d;
    margin: 0 0 0.7rem;
  }
  .hero-description {
    max-width: 39rem;
    color: #e5ecf3;
    font-size: clamp(0.92rem, 1.3vw, 1.08rem);
    line-height: 1.72;
    margin: 0;
  }
  .hero-actions {
    display: flex;
    gap: 0.7rem;
    flex-wrap: wrap;
    margin-top: 1.6rem;
  }
  .gold-button,
  .ghost-button,
  .outline-button {
    min-height: 3rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
    border-radius: 0.75rem;
    padding: 0.7rem 1.1rem;
    text-decoration: none;
    font-size: 0.76rem;
    font-weight: 800;
    letter-spacing: 0.035em;
    transition:
      transform 150ms var(--ease-out),
      box-shadow 200ms ease,
      background-color 200ms ease;
  }
  .gold-button {
    background: linear-gradient(135deg, #e7b84d, #c99227);
    color: #09213f;
    box-shadow: 0 0.7rem 1.6rem #030d1d35;
  }
  .ghost-button {
    border: 1px solid #ffffff5c;
    color: #fff;
    background: #ffffff0c;
    backdrop-filter: blur(0.3rem);
  }
  .shortcut-bar {
    position: relative;
    z-index: 3;
    margin-top: -2.15rem;
    background: #fff;
    border: 1px solid #e6e9ec;
    border-radius: 1.35rem;
    padding: 0.6rem;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    box-shadow: 0 1.2rem 3rem #0c213714;
  }
  .shortcut-bar a {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    color: #17304f;
    text-decoration: none;
    border-right: 1px solid #e6e9ec;
    transition:
      background-color 180ms ease,
      transform 150ms var(--ease-out);
  }
  .shortcut-bar a:last-child {
    border: 0;
  }
  .shortcut-icon {
    width: 2.6rem;
    height: 2.6rem;
    flex: 0 0 auto;
    border-radius: 50%;
    display: grid;
    place-items: center;
    color: #fff;
    background: #102947;
  }
  .shortcut-bar b,
  .shortcut-bar small {
    display: block;
  }
  .shortcut-bar b {
    font-size: 0.82rem;
  }
  .shortcut-bar small {
    font-size: 0.69rem;
    color: #6d7d8c;
    margin-top: 0.15rem;
  }
  .shortcut-arrow {
    margin-left: auto;
    opacity: 0;
    transform: translateX(-0.3rem);
    transition:
      opacity 160ms ease,
      transform 180ms var(--ease-out);
  }
  .section-space {
    padding-block: clamp(4.5rem, 8vw, 8rem);
  }
  .section-heading {
    text-align: center;
    max-width: 44rem;
    margin: 0 auto 2.5rem;
  }
  .section-heading.left {
    text-align: left;
    margin-inline: 0;
  }
  .section-heading > span,
  .eyebrow,
  .closing > div > span {
    font-size: 0.72rem;
    font-weight: 850;
    letter-spacing: 0.13em;
    color: #ad7c1e;
  }
  .section-heading h2,
  .trust h2,
  .calculator-section h2 {
    font-size: clamp(2rem, 3.4vw, 3.4rem);
    line-height: 1.08;
    letter-spacing: -0.04em;
    color: #17304f;
    margin: 0.45rem 0 0.7rem;
  }
  .section-heading p,
  .trust p,
  .calculator-section p {
    color: #687888;
    line-height: 1.7;
    margin: 0;
  }
  .service-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.8rem;
  }
  .service-card {
    background: #fff;
    border: 1px solid #e3e8eb;
    border-radius: 1.1rem;
    padding: 1.45rem 1.15rem;
    min-height: 19rem;
    display: flex;
    flex-direction: column;
    text-align: center;
    align-items: center;
    color: inherit;
    text-decoration: none;
    box-shadow: 0 0.7rem 2rem #0d243709;
    transition:
      transform 220ms var(--ease-out),
      border-color 200ms ease,
      box-shadow 220ms ease;
  }
  .service-icon {
    width: 4.1rem;
    height: 4.1rem;
    border-radius: 50%;
    display: grid;
    place-items: center;
    background: #f2f4f5;
    color: #102947;
    transition:
      background-color 220ms ease,
      color 220ms ease,
      transform 220ms var(--ease-out);
  }
  .service-card h3 {
    text-transform: uppercase;
    font-size: 0.84rem;
    color: #17304f;
    margin: 1rem 0 0.55rem;
  }
  .service-card p {
    font-size: 0.76rem;
    line-height: 1.65;
    color: #667787;
    margin: 0;
  }
  .service-card strong {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: #b98624;
    font-size: 0.73rem;
    margin-top: auto;
    padding-top: 1rem;
  }
  .service-card strong svg {
    transition: transform 180ms var(--ease-out);
  }
  .proof {
    background: #0a2343;
    color: #fff;
    border-radius: 1.2rem;
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    padding: 1.25rem 1rem;
    box-shadow: 0 1rem 2.5rem #071a3030;
  }
  .proof article {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.9rem;
    padding: 0.35rem 1rem;
    border-right: 1px solid #ffffff2a;
  }
  .proof article:last-child {
    border: 0;
  }
  .proof svg {
    color: #d5a33d;
  }
  .proof b,
  .proof span {
    display: block;
  }
  .proof b {
    font-size: 1.5rem;
  }
  .proof span {
    color: #c7d3df;
    font-size: 0.72rem;
    margin-top: 0.1rem;
  }
  .trust-layout {
    display: grid;
    grid-template-columns: 0.85fr 1.5fr;
    gap: clamp(3rem, 7vw, 7rem);
    align-items: center;
  }
  .trust-intro > a {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: #17304f;
    font-weight: 800;
    margin-top: 1.4rem;
  }
  .trust-points {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
  }
  .trust-points article {
    padding: 1.6rem;
    border-left: 1px solid #dfe5e9;
    border-bottom: 1px solid #dfe5e9;
  }
  .trust-points article:nth-child(3),
  .trust-points article:nth-child(4) {
    border-bottom: 0;
  }
  .trust-points svg {
    color: #b88629;
  }
  .trust-points h3 {
    color: #17304f;
    font-size: 0.94rem;
    margin: 0.8rem 0 0.35rem;
  }
  .trust-points p {
    font-size: 0.78rem;
    line-height: 1.58;
  }
  .partners {
    background: #f1f4f6;
  }
  .partner-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  .partner-card {
    background: #fff;
    border-radius: 1rem;
    overflow: hidden;
    border: 1px solid #e0e6e9;
    color: inherit;
    text-decoration: none;
    min-height: 28rem;
    transition:
      transform 220ms var(--ease-out),
      box-shadow 220ms ease;
  }
  .partner-image {
    height: 13rem;
    position: relative;
    overflow: hidden;
    background: #dbe2e7;
  }
  .partner-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 500ms var(--ease-out);
  }
  .partner-image span {
    position: absolute;
    left: 0.8rem;
    top: 0.8rem;
    background: #0c2947e8;
    color: #fff;
    border-radius: 0.45rem;
    padding: 0.35rem 0.55rem;
    font-size: 0.62rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .partner-copy {
    padding: 1.25rem;
  }
  .partner-copy small {
    color: #a87920;
    font-size: 0.65rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .partner-copy h3 {
    font-size: 1.15rem;
    color: #17304f;
    margin: 0.35rem 0;
  }
  .partner-copy > b {
    font-size: 0.74rem;
    color: #526679;
  }
  .partner-copy p {
    font-size: 0.77rem;
    line-height: 1.6;
    color: #697988;
  }
  .partner-copy strong {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: #ad7c1e;
    font-size: 0.74rem;
    margin-top: 1rem;
  }
  .skeleton {
    background: linear-gradient(100deg, #e8ecef 20%, #f6f7f8 40%, #e8ecef 60%);
    background-size: 200% 100%;
    animation: shimmer 1.1s linear infinite;
  }
  .data-note {
    color: #8a5d22;
  }
  .calculator-section {
    background: #0b2442;
    color: #fff;
  }
  .calculator-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    gap: clamp(3rem, 8vw, 8rem);
  }
  .calculator-section h2 {
    color: #fff;
  }
  .calculator-section p {
    color: #c4d0dc;
  }
  .calculator-section ul {
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    list-style: none;
    margin-top: 1.5rem;
  }
  .calculator-section li {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.76rem;
    color: #dce5ed;
  }
  .calculator-section li svg {
    color: #dfad42;
  }
  .calculator-card {
    background: #fff;
    color: #35495d;
    border-radius: 1.2rem;
    padding: clamp(1.3rem, 3vw, 2rem);
    box-shadow: 0 1.8rem 4rem #020b1838;
  }
  .calculator-card label {
    display: grid;
    gap: 0.4rem;
  }
  .calculator-card label span {
    font-size: 0.72rem;
    font-weight: 750;
  }
  .calculator-card input {
    width: 100%;
    border: 1px solid #d8dfe4;
    border-radius: 0.65rem;
    padding: 0.78rem 0.85rem;
    color: #17304f;
    font-weight: 700;
    outline: 0;
  }
  .calculator-card input:focus {
    border-color: #d0a03d;
    box-shadow: 0 0 0 3px #d0a03d20;
  }
  .calc-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.8rem;
    margin-top: 0.8rem;
  }
  .total {
    border-block: 1px solid #e3e7ea;
    margin: 1.2rem 0;
    padding: 1rem 0;
  }
  .total span,
  .total small {
    display: block;
  }
  .total b {
    display: block;
    color: #17304f;
    font-size: 2rem;
    letter-spacing: -0.03em;
    margin: 0.25rem 0;
  }
  .total small {
    color: #7d8995;
    font-size: 0.68rem;
  }
  .calculator-card .gold-button {
    width: 100%;
  }
  .closing {
    margin-top: clamp(4rem, 8vw, 7rem);
    padding: clamp(1.5rem, 4vw, 2.5rem);
    border-radius: 1.25rem;
    background: #0a2343;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
  }
  .closing h2 {
    font-size: clamp(1.5rem, 2.7vw, 2.5rem);
    margin: 0.3rem 0;
  }
  .closing p {
    color: #c9d5df;
    margin: 0;
  }
  .closing > div:last-child {
    display: flex;
    gap: 0.7rem;
    flex-wrap: wrap;
  }
  .outline-button {
    color: #fff;
    border: 1px solid #d2a23e;
    background: transparent;
  }
  .reveal {
    opacity: 0;
    transform: translateY(1.5rem);
    transition:
      opacity 650ms var(--ease-out),
      transform 650ms var(--ease-out);
  }
  .reveal.visible {
    opacity: 1;
    transform: none;
  }
  @media (hover: hover) and (pointer: fine) {
    .gold-button:hover {
      transform: translateY(-2px);
      box-shadow: 0 1rem 2rem #030d1d45;
    }
    .ghost-button:hover,
    .outline-button:hover {
      background: #ffffff10;
      transform: translateY(-2px);
    }
    .shortcut-bar a:hover {
      background: #f7f3e9;
      transform: translateY(-2px);
    }
    .shortcut-bar a:hover .shortcut-arrow {
      opacity: 1;
      transform: none;
    }
    .service-card:hover {
      transform: translateY(-0.45rem);
      border-color: #d9bd7c;
      box-shadow: 0 1.3rem 2.7rem #0d243714;
    }
    .service-card:hover .service-icon {
      background: #102947;
      color: #efc461;
      transform: scale(1.04);
    }
    .service-card:hover strong svg {
      transform: translateX(0.2rem);
    }
    .partner-card:hover {
      transform: translateY(-0.4rem);
      box-shadow: 0 1.3rem 2.8rem #0b213618;
    }
    .partner-card:hover img {
      transform: scale(1.045);
    }
  }
  .gold-button:active,
  .ghost-button:active,
  .outline-button:active,
  .shortcut-bar a:active,
  .service-card:active,
  .partner-card:active {
    transform: scale(0.97);
  }
  @keyframes shimmer {
    to {
      background-position: -200% 0;
    }
  }
  @media (max-width: 75rem) {
    .service-grid {
      grid-template-columns: repeat(3, 1fr);
    }
    .shortcut-bar {
      grid-template-columns: repeat(5, minmax(9.5rem, 1fr));
      overflow-x: auto;
      scroll-snap-type: x proximity;
    }
    .shortcut-bar a {
      scroll-snap-align: start;
    }
    .business-hero {
      background-position: 58% center;
    }
  }
  @media (max-width: 62rem) {
    .proof {
      grid-template-columns: repeat(5, minmax(9rem, 1fr));
      overflow-x: auto;
    }
    .proof article {
      justify-content: flex-start;
    }
    .trust-layout,
    .calculator-layout {
      grid-template-columns: 1fr;
    }
    .partner-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .closing {
      align-items: flex-start;
      flex-direction: column;
    }
  }
  @media (max-width: 47rem) {
    .business-page {
      padding-top: 0.65rem;
    }
    .business-wrap {
      width: min(100% - 1.25rem, 88rem);
    }
    .business-hero {
      width: calc(100% - 1rem);
      min-height: 35rem;
      border-radius: 1.15rem;
      background-position: 68% center;
      align-items: flex-end;
    }
    .hero-shade {
      background: linear-gradient(
        0deg,
        #061a35 10%,
        #071b35e6 58%,
        #071b3560 100%
      );
    }
    .hero-copy {
      padding: 3rem 1.1rem;
    }
    .hero-copy h1 {
      font-size: clamp(2.45rem, 13vw, 3.7rem);
    }
    .hero-description {
      font-size: 0.9rem;
    }
    .hero-actions > * {
      width: 100%;
    }
    .shortcut-bar {
      width: calc(100% - 1.4rem);
      margin-top: -1rem;
      grid-template-columns: repeat(5, 15rem);
      border-radius: 1rem;
    }
    .service-grid {
      grid-template-columns: 1fr;
    }
    .service-card {
      min-height: auto;
      text-align: left;
      align-items: flex-start;
    }
    .proof {
      width: calc(100% - 1.25rem);
      grid-template-columns: repeat(5, 11rem);
      border-radius: 1rem;
    }
    .partner-grid {
      grid-template-columns: 1fr;
    }
    .trust-points {
      grid-template-columns: 1fr;
    }
    .trust-points article,
    .trust-points article:nth-child(3) {
      border-bottom: 1px solid #dfe5e9;
    }
    .trust-points article:last-child {
      border-bottom: 0;
    }
    .calc-grid {
      grid-template-columns: 1fr;
    }
    .closing {
      width: calc(100% - 1.25rem);
    }
    .closing > div:last-child,
    .closing a {
      width: 100%;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    :global(html) {
      scroll-behavior: auto;
    }
    .reveal {
      opacity: 1;
      transform: none;
      transition: none;
    }
    .service-card,
    .service-icon,
    .partner-card,
    .partner-image img,
    .shortcut-arrow,
    .gold-button,
    .ghost-button,
    .outline-button {
      transition: none;
    }
    .skeleton {
      animation: none;
    }
  }
</style>
