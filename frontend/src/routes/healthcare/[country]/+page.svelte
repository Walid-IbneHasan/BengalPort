<script lang="ts">
  import { ArrowLeft, ArrowRight, MapPin, Stethoscope } from "lucide-svelte";
  import { applyHref } from "$lib/apply-route";
  import { reveal } from "$lib/reveal";
  import Slideshow from "$lib/components/Slideshow.svelte";

  // The hospitals and services Bengal Port arranges in one country, reached
  // from that country's flag on the Healthcare page.
  let { data } = $props();
  let land = $derived(data.land);
  let hospitals = $derived(data.hospitals);
  let cities = $derived([...new Set([...hospitals.map((hospital: any) => hospital.city), ...(land.place.includes(",") ? [land.place.split(",")[0].trim()] : [])].filter(Boolean))]);
  // Every treatment offered in the country, once each.
  let treatments = $derived([...new Set(hospitals.flatMap((hospital: any) => (hospital.services ?? []).map((service: any) => service.title)))] as string[]);
  let others = $derived(data.places.filter((place) => place.slug !== land.slug));
  const flagUrl = (code: string | undefined, width = 320) => (code ? `https://flagcdn.com/w${width}/${code}.png` : "");
</script>

<svelte:head>
  <title>Treatment in {land.country} — Global Healthcare — Bengal Port</title>
  <meta name="description" content={`Hospitals and treatments Bengal Port arranges in ${land.country}${cities.length ? ` (${cities.join(", ")})` : ""}, with travel and a coordinator throughout.`} />
</svelte:head>

<div class="land-page">
  <section class="intro">
    <div class="wrap">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="/healthcare"><ArrowLeft size={16} /> Global Healthcare</a></nav>
      <div class="intro-row">
        {#if land.flag}<img class="flag" src={flagUrl(land.flag)} alt={`Flag of ${land.country}`} width="320" height="213" decoding="async" referrerpolicy="no-referrer" />{/if}
        <div>
          <h1>Treatment in {land.country}</h1>
          {#if cities.length}<p class="cities"><MapPin size={17} /> {cities.join(" · ")}</p>{/if}
          <p class="count">{hospitals.length ? `${hospitals.length} partner ${hospitals.length === 1 ? "hospital" : "hospitals"}${treatments.length ? ` · ${treatments.length} ${treatments.length === 1 ? "treatment" : "treatments"}` : ""}` : "Partner hospitals are being added here."}</p>
          <a class="btn" href={applyHref("HEALTHCARE", "enquiry", `Treatment in ${land.country}`)}>{data.content.labels.requestConnection}<ArrowRight size={18} /></a>
        </div>
      </div>
      {#if treatments.length}
        <ul class="treatments" aria-label={`Treatments in ${land.country}`}>
          {#each treatments as treatment}<li><Stethoscope size={15} />{treatment}</li>{/each}
        </ul>
      {/if}
    </div>
  </section>

  <section class="section hospitals">
    <div class="wrap">
      {#if hospitals.length}
        <h2>Hospitals in {land.country}</h2>
        <div class="list">
          {#each hospitals as hospital (hospital.id ?? hospital.name)}
            <article class="hospital" use:reveal>
              <Slideshow photos={[hospital.image, ...(hospital.gallery ?? [])]} label={hospital.name} />
              <div class="body">
                <h3>{hospital.name}</h3>
                <p class="where"><MapPin size={15} /> {hospital.city}, {hospital.country}</p>
                <p class="about">{hospital.description}</p>
                {#if hospital.services?.length}
                  <h4>Services</h4>
                  <dl class="services">
                    {#each hospital.services as service}
                      <div><dt>{service.title}<small>{service.category}</small></dt><dd>{service.description}</dd></div>
                    {/each}
                  </dl>
                {/if}
                <a class="ask" href={applyHref("HEALTHCARE", "enquiry", hospital.name)}>{data.content.labels.requestConnection}<ArrowRight size={16} /></a>
              </div>
            </article>
          {/each}
        </div>
      {:else}
        <div class="empty">
          <h2>Ask us about {land.country}</h2>
          <p>Our list of partner hospitals in {land.country} is being updated. Send us your reports and we will suggest suitable hospitals and specialists, with costs.</p>
          <a class="btn" href={applyHref("HEALTHCARE", "enquiry", `Treatment in ${land.country}`)}>{data.content.labels.askAboutHospitals}<ArrowRight size={18} /></a>
        </div>
      {/if}
    </div>
  </section>

  {#if others.length}
    <section class="section others" use:reveal>
      <div class="wrap">
        <h2>Other destinations</h2>
        <ul>
          {#each others as other (other.slug)}
            <li><a href={`/healthcare/${other.slug}`}>{#if other.flag}<img src={flagUrl(other.flag, 80)} alt="" width="80" height="53" loading="lazy" referrerpolicy="no-referrer" />{/if}<span>{other.country}</span></a></li>
          {/each}
        </ul>
      </div>
    </section>
  {/if}
</div>

<style>
  .land-page{background:#fafaf7}
  .intro{padding:clamp(6.5rem,12vw,8.5rem) 0 clamp(2rem,5vw,3.25rem);background:linear-gradient(180deg,#eef3f6 0%,#fafaf7 100%)}
  .crumbs a{display:inline-flex;align-items:center;gap:.35rem;color:#1f6e6c;font-size:.88rem;font-weight:750;text-decoration:none}
  .crumbs a:hover{text-decoration:underline}
  .intro-row{display:flex;align-items:center;gap:clamp(1.25rem,4vw,2.75rem);margin-top:1.25rem}
  .flag{width:clamp(7.5rem,18vw,12rem);height:auto;aspect-ratio:3/2;object-fit:cover;border-radius:.75rem;box-shadow:0 1rem 2.4rem #17304f2e,0 0 0 1px #17304f14;flex:none}
  h1{margin:0;font-size:clamp(2rem,5vw,3.25rem);line-height:1.08;letter-spacing:-.03em;color:var(--heading);text-wrap:balance}
  .cities{display:flex;align-items:center;gap:.4rem;margin:.7rem 0 0;font-weight:750;color:#1f6e6c}
  .count{margin:.35rem 0 1.3rem;color:var(--muted)}
  .btn{display:inline-flex;align-items:center;gap:.5rem}
  .treatments{list-style:none;margin:1.8rem 0 0;padding:0;display:flex;flex-wrap:wrap;gap:.5rem}
  .treatments li{display:inline-flex;align-items:center;gap:.4rem;padding:.45rem .8rem;border-radius:2rem;background:#fff;box-shadow:0 0 0 1px #17304f14;color:var(--heading);font-size:.88rem;font-weight:700}
  .treatments :global(svg){color:#1f6e6c}
  h2{margin:0 0 1.25rem;font-size:clamp(1.45rem,3vw,2rem);letter-spacing:-.02em;color:var(--heading)}
  .list{display:grid;gap:clamp(1.25rem,3vw,2rem)}
  .hospital{display:grid;grid-template-columns:minmax(0,.95fr) minmax(0,1.05fr);border-radius:1.25rem;overflow:hidden;background:#fff;box-shadow:var(--shadow-sm)}
  .hospital :global(.slides){height:100%;min-height:16rem}
  .body{padding:clamp(1.25rem,3vw,2rem)}
  h3{margin:0;font-size:clamp(1.2rem,2.4vw,1.5rem);color:var(--heading)}
  .where{display:flex;align-items:center;gap:.35rem;margin:.4rem 0 0;color:var(--muted);font-weight:700;font-size:.92rem}
  .about{margin:.9rem 0 0;line-height:1.65;color:var(--text);white-space:pre-line}
  h4{margin:1.2rem 0 .5rem;font-size:.78rem;letter-spacing:.12em;text-transform:uppercase;color:#1f6e6c}
  .services{margin:0;display:grid;gap:.1rem}
  .services div{padding:.6rem 0;border-bottom:1px solid var(--line)}
  .services dt{font-weight:800;color:var(--heading)}
  .services dt small{margin-left:.5rem;font-weight:650;color:var(--muted);font-size:.8rem}
  .services dd{margin:.25rem 0 0;line-height:1.55;color:var(--text)}
  .ask{display:inline-flex;align-items:center;gap:.4rem;margin-top:1.2rem;color:#1f6e6c;font-weight:800;text-decoration:none}
  .ask:hover{text-decoration:underline}
  .empty{max-width:40rem;padding:clamp(1.5rem,4vw,2.25rem);border-radius:1.25rem;background:#fff;box-shadow:var(--shadow-sm)}
  .empty p{margin:0 0 1.3rem;line-height:1.65;color:var(--text)}
  .others ul{list-style:none;margin:0;padding:0;display:flex;flex-wrap:wrap;gap:.75rem}
  .others a{display:flex;align-items:center;gap:.65rem;padding:.55rem .9rem .55rem .55rem;border-radius:.9rem;background:#fff;box-shadow:var(--shadow-sm);color:var(--heading);font-weight:750;text-decoration:none;transition:transform 180ms var(--ease-out)}
  .others img{width:2.6rem;height:auto;aspect-ratio:3/2;object-fit:cover;border-radius:.3rem;box-shadow:0 0 0 1px #17304f14}
  @media(hover:hover) and (pointer:fine){.others a:hover{transform:translateY(-2px)}}
  @media(max-width:60rem){
    .hospital{grid-template-columns:1fr}
    .hospital :global(.slides){height:auto;min-height:0}
  }
  @media(max-width:36rem){
    .intro-row{flex-direction:column;align-items:flex-start}
  }
  @media(prefers-reduced-motion:reduce){.others a{transition:none}}
</style>
