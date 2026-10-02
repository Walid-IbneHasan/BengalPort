<script lang="ts">
  import { ArrowLeft, ArrowRight, Calendar, MapPin } from "lucide-svelte";
  import { applyHref, opportunityTab } from "$lib/apply-route";

  let { data } = $props();
  let opportunity = $derived(data.opportunity);
  let tab = $derived(opportunityTab(opportunity.category));
  let summary = $derived(opportunity.description.replace(/\s+/g, " ").slice(0, 155));
</script>

<svelte:head>
  <title>{opportunity.title} — Bengal Port</title>
  <meta name="description" content={summary} />
  <meta property="og:title" content={opportunity.title} />
  <meta property="og:description" content={summary} />
  <meta property="og:image" content={opportunity.image} />
</svelte:head>

<section class="page-hero detail-hero">
  <div class="wrap">
    <a class="back" href="/opportunities"><ArrowLeft size={16} /> All opportunities</a>
    <span class="eyebrow">{opportunity.category.replaceAll("_", " ")}</span>
    <h1>{opportunity.title}</h1>
    <div class="facts">
      <span><MapPin size={16} />{opportunity.location}, {opportunity.country}</span>
      {#if opportunity.deadline}<span><Calendar size={16} />Apply by {new Date(opportunity.deadline).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</span>{/if}
    </div>
  </div>
</section>

<section class="section detail">
  <div class="wrap layout">
    <img src={opportunity.image} alt={opportunity.title} />
    <div class="copy">
      <h2>About this opportunity</h2>
      <p>{opportunity.description}</p>
      <div class="actions">
        <a class="btn" href={applyHref(tab, tab === "GENERAL" ? undefined : "enquiry", opportunity.title)}>ENQUIRE ABOUT THIS <ArrowRight size={17} /></a>
        {#if tab !== "GENERAL"}<a class="secondary" href={applyHref(tab, "application")}>Start a full application</a>{/if}
      </div>
      <small>Enquiries are free and need no account. Our team replies with requirements, costs and next steps.</small>
    </div>
  </div>
</section>

<style>
  .detail-hero{padding-bottom:3.5rem}.detail-hero h1{font-size:clamp(2.1rem,5vw,3.6rem);max-width:56rem}
  .back{display:flex;width:fit-content;align-items:center;gap:.4rem;margin-bottom:1.4rem;color:var(--muted);font-size:.86rem;font-weight:700;text-decoration:none}
  .facts{display:flex;flex-wrap:wrap;gap:.6rem 1.6rem;color:var(--muted)}.facts span{display:inline-flex;align-items:center;gap:.45rem}
  .detail{padding-top:3.5rem}.layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);gap:clamp(1.5rem,4vw,3.5rem);align-items:start}
  .layout img{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:1.25rem;box-shadow:var(--shadow)}
  .copy h2{font-size:1.5rem;color:var(--heading);margin-bottom:.9rem}.copy p{line-height:1.8;white-space:pre-line;color:var(--text)}
  .actions{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem 1.4rem;margin:1.8rem 0 1rem}.secondary{color:var(--navy);font-weight:750}
  small{display:block;color:var(--muted);line-height:1.6}
  @media(hover:hover) and (pointer:fine){.back:hover{color:var(--navy)}}
  @media(max-width:52rem){.layout{grid-template-columns:1fr}}
</style>
