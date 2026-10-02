<script lang="ts">
  import { BriefcaseBusiness, GraduationCap, HeartPulse, MoonStar, ArrowRight } from "lucide-svelte";
  import type { ServicesContent } from "$lib/site-pages";

  let { data }: { data: { content: ServicesContent } } = $props();
  let content = $derived(data.content);
  // Each division keeps its icon and link; its title, image and list are edited in the admin.
  const divisions = [
    { key: "business", icon: BriefcaseBusiness, href: "/business" },
    { key: "education", icon: GraduationCap, href: "/education" },
    { key: "healthcare", icon: HeartPulse, href: "/healthcare" },
    { key: "umrah", icon: MoonStar, href: "/umrah" },
  ] as const;
</script>

<svelte:head><title>Services | Bengal Port</title><meta name="description" content={content.hero.description} /></svelte:head>
<section class="page-hero"><div class="wrap"><span class="eyebrow">{content.hero.eyebrow}</span><h1>{content.hero.title}</h1><p>{content.hero.description}</p></div></section>
<section class="section"><div class="wrap service-grid">{#each divisions as division}{@const group = content.groups[division.key]}<a class="service" href={division.href}><div class="visual"><img src={group.image} alt={group.title}/><span><division.icon size={24}/></span></div><div class="copy"><h2>{group.title}</h2><ul>{#each group.items as item}<li>{item}<ArrowRight size={14}/></li>{/each}</ul><strong>EXPLORE SERVICE <ArrowRight size={18}/></strong></div></a>{/each}</div></section>

<style>
  .service-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.25rem}.service{display:grid;grid-template-columns:minmax(10rem,.8fr) 1.2fr;overflow:hidden;border:1px solid #dfe6e9;border-radius:1.25rem;background:#fff;color:var(--navy);text-decoration:none;box-shadow:0 .8rem 2rem rgba(18,52,80,.08);transition:transform 180ms cubic-bezier(.23,1,.32,1),box-shadow 200ms ease}.visual{position:relative;min-height:22rem;overflow:hidden}.visual img{width:100%;height:100%;object-fit:cover;transition:transform 260ms cubic-bezier(.23,1,.32,1)}.visual:after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(7,31,54,.28),transparent 55%)}.visual span{position:absolute;z-index:1;right:1rem;bottom:1rem;display:grid;place-items:center;width:3rem;height:3rem;border-radius:50%;background:#fff;color:#173c5c;box-shadow:0 .5rem 1rem rgba(7,31,54,.18)}.copy{padding:clamp(1.25rem,3vw,2rem)}h2{margin:0;font-size:clamp(1.35rem,3vw,1.85rem)}ul{list-style:none;padding:0;margin:1.2rem 0}li{display:flex;justify-content:space-between;gap:1rem;padding:.7rem 0;border-bottom:1px solid #e7ebed;color:#596d7d;font-size:.88rem}strong{display:flex;align-items:center;gap:.55rem;color:#9b6b16;font-size:.76rem;letter-spacing:.06em}.service:active{transform:scale(.985)}@media(hover:hover) and (pointer:fine){.service:hover{transform:translateY(-.25rem);box-shadow:0 1.25rem 2.8rem rgba(18,52,80,.13)}.service:hover .visual img{transform:scale(1.035)}}@media(max-width:64rem){.service-grid{grid-template-columns:1fr}}@media(max-width:38rem){.service{grid-template-columns:1fr}.visual{min-height:12rem;max-height:12rem}.copy{padding:1.15rem}.service-grid{gap:.85rem}}@media(prefers-reduced-motion:reduce){.service,.visual img{transition-duration:.01ms}}
</style>
