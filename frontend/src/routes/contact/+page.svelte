<script lang="ts">
  import { Phone, Mail, MapPin, Clock } from "lucide-svelte";
  import { cmsContent } from "$lib/cms";
  import type { ContactContent } from "$lib/site-pages";

  let { data }: { data: { content: ContactContent } } = $props();
  let content = $derived(data.content);
</script>

<svelte:head><title>Contact — Bengal Port</title><meta name="description" content={content.hero.description} /></svelte:head>
<section class="page-hero"><div class="wrap"><span class="eyebrow">{content.hero.eyebrow}</span><h1>{content.hero.title}</h1><p>{content.hero.description}</p></div></section>
<section class="section"><div class="wrap contact-grid"><div><article><Phone/><div><h3>Call</h3><a href={`tel:${$cmsContent.utility.phone.replace(/[^+\d]/g, "")}`}>{$cmsContent.utility.phone}</a></div></article><article><Mail/><div><h3>Email</h3><a href={`mailto:${$cmsContent.utility.email}`}>{$cmsContent.utility.email}</a></div></article><article><MapPin/><div><h3>Office</h3><p>{$cmsContent.footer.address}</p></div></article><article><Clock/><div><h3>Hours</h3><p>{content.hours}</p></div></article></div><div class="content-card"><h2>{content.card.title}</h2><p>{content.card.description}</p><a class="btn" href="/apply">{content.card.button}</a></div></div></section>

<style>.contact-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px}.contact-grid article{display:flex;gap:20px;padding:20px 0;border-bottom:1px solid #e1e4e8}.contact-grid article>svg{color:var(--gold)}.contact-grid h3{margin-bottom:7px}.contact-grid a{color:var(--navy);text-decoration:none}@media(max-width:700px){.contact-grid{grid-template-columns:1fr}}</style>
