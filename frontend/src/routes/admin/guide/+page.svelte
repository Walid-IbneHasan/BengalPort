<script lang="ts">
  import { onMount, tick } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { renderMarkdown, splitGuide, type GuideLanguage } from "$lib/guide-markdown";
  import { ArrowUp, BookOpen } from "lucide-svelte";

  // The admin guide, for the Super Admin: every page of the admin, what it
  // does and how it is connected, in English or in Bangla. The text comes
  // from docs/ADMIN-GUIDE.md through the API, which gives it to the Super
  // Admin only.
  const KEY = "bp_guide_language";
  const fromAddress = page.url.searchParams.get("lang");
  const remembered = () => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  };

  let language = $state<GuideLanguage>("en"),
    halves = $state<Record<GuideLanguage, string> | null>(null),
    loading = $state(true),
    problem = $state("");
  let html = $derived(halves ? renderMarkdown(halves[language]) : "");

  const TEXT = {
    en: { title: "Admin guide", intro: "Every page of the admin: what it is for, each section and button, what changes when you use it, and how the pages are connected.", contents: "Contents", top: "Back to top" },
    bn: { title: "অ্যাডমিন নির্দেশিকা", intro: "অ্যাডমিনের প্রতিটি পেজ: কিসের জন্য, প্রতিটি অংশ ও বাটন, ব্যবহার করলে কী বদলায়, আর পেজগুলো কীভাবে একে অপরের সাথে যুক্ত।", contents: "সূচিপত্র", top: "উপরে যান" },
  } as const;

  onMount(async () => {
    const chosen = fromAddress ?? remembered();
    if (chosen === "bn" || chosen === "en") language = chosen;
    try {
      const guide = await api<{ markdown: string }>("/office/guide");
      halves = splitGuide(guide.markdown);
    } catch (e) {
      problem = problemText(e, "The guide could not be loaded");
    } finally {
      loading = false;
    }
    // Arriving at a heading (a link with #…): show it once the text is in.
    if (location.hash) {
      await tick();
      document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
    }
  });

  async function choose(next: GuideLanguage) {
    if (next === language) return;
    language = next;
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // Remembered for this visit only.
    }
    await goto(`?lang=${next}`, { replaceState: true, noScroll: true, keepFocus: true });
    window.scrollTo({ top: 0 });
  }

  const contentsId = () => (language === "en" ? "contents" : "সূচিপত্র");
</script>

<svelte:head><title>{TEXT[language].title} — Bengal Port Admin</title></svelte:head>

<div class="o-page guide-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Super Admin</span>
      <h1 lang={language}>{TEXT[language].title}</h1>
      <p lang={language}>{TEXT[language].intro}</p>
    </div>
  </header>

  <div class="bar">
    <div class="switch" role="group" aria-label="Language / ভাষা">
      <button type="button" class:on={language === "en"} aria-pressed={language === "en"} onclick={() => choose("en")}>EN</button>
      <button type="button" class:on={language === "bn"} aria-pressed={language === "bn"} onclick={() => choose("bn")}>BN</button>
    </div>
    <span class="current" lang={language}>{language === "en" ? "English" : "বাংলা"}</span>
    {#if halves}<a class="o-link jump" href={`#${contentsId()}`} lang={language}><BookOpen size={15} /> {TEXT[language].contents}</a>{/if}
  </div>

  {#if loading}
    <p class="o-loading">Loading the guide…</p>
  {:else if problem}
    <p class="o-error" role="alert">{problem}</p>
  {:else}
    <article class="guide o-card" lang={language}>
      {@html html}
    </article>
    <a class="top" href="#top" onclick={(event) => { event.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label={TEXT[language].top}><ArrowUp size={18} /></a>
  {/if}
</div>

<style>
  .guide-page { max-width: 64rem; }
  [lang="bn"] { font-family: "Manrope Variable", Manrope, "Noto Sans Bengali", "Hind Siliguri", "Nirmala UI", "Vrinda", "Shonar Bangla", system-ui, sans-serif; }

  /* The language switch stays in sight while reading. */
  .bar { position: sticky; top: 0; z-index: 20; display: flex; flex-wrap: wrap; align-items: center; gap: 0.6rem 1rem; margin: 0 0 1rem; padding: 0.6rem 0.75rem; border: 1px solid #e1e6e9; border-radius: 0.8rem; background: #ffffffee; backdrop-filter: blur(6px); }
  .switch { display: inline-flex; padding: 0.2rem; border-radius: 0.65rem; background: #e3e8ec; }
  .switch button { min-width: 3.2rem; min-height: 2.4rem; padding: 0 0.9rem; border: 0; border-radius: 0.5rem; background: none; color: #586577; font: inherit; font-size: 0.9rem; font-weight: 850; letter-spacing: 0.06em; cursor: pointer; }
  .switch button.on { background: #07182f; color: #fff; box-shadow: 0 2px 7px #07182f24; }
  .switch button:focus-visible { outline: 3px solid #d19b2d; outline-offset: 2px; }
  .current { font-size: 0.86rem; font-weight: 700; color: #48576b; }
  .jump { display: inline-flex; align-items: center; gap: 0.35rem; margin-left: auto; font-size: 0.86rem; }

  /* The guide's own text. */
  .guide { padding: clamp(1rem, 3vw, 2.2rem); color: #25384d; line-height: 1.7; font-size: 0.97rem; overflow-wrap: anywhere; }
  .guide :global(h1) { margin: 0 0 1rem; font-size: clamp(1.5rem, 3vw, 2rem); letter-spacing: -0.02em; color: #07182f; }
  .guide :global(h2) { margin: 2.4rem 0 0.8rem; padding-top: 1.2rem; border-top: 1px solid #edf0f2; font-size: clamp(1.25rem, 2.4vw, 1.55rem); color: #07182f; }
  .guide :global(h3) { margin: 2rem 0 0.6rem; font-size: 1.15rem; color: #0a2344; }
  .guide :global(h4) { margin: 1.4rem 0 0.4rem; font-size: 1rem; color: #17304f; }
  .guide :global(h1), .guide :global(h2), .guide :global(h3), .guide :global(h4) { scroll-margin-top: 5.5rem; line-height: 1.3; }
  .guide :global(p) { margin: 0.6rem 0; }
  .guide :global(ul), .guide :global(ol) { margin: 0.5rem 0; padding-left: 1.4rem; }
  .guide :global(li) { margin: 0.3rem 0; }
  .guide :global(li > ul), .guide :global(li > ol) { margin: 0.3rem 0; }
  .guide :global(strong) { color: #07182f; }
  .guide :global(a) { color: #9b6b16; font-weight: 700; text-decoration: none; }
  .guide :global(a:hover) { text-decoration: underline; }
  .guide :global(code) { padding: 0.08rem 0.35rem; border-radius: 0.35rem; background: #f1f3f5; font-size: 0.88em; }
  .guide :global(pre) { margin: 1rem 0; padding: 1rem; overflow-x: auto; border-radius: 0.7rem; background: #0a1c33; color: #e6ebf2; font-size: 0.8rem; line-height: 1.55; }
  .guide :global(pre code) { padding: 0; background: none; font-size: inherit; color: inherit; white-space: pre; }
  .guide :global(hr) { margin: 2rem 0; border: 0; border-top: 1px solid #e1e6e9; }
  /* Tables scroll sideways on a phone instead of squeezing. */
  .guide :global(.table) { margin: 1rem 0; overflow-x: auto; border: 1px solid #e1e6e9; border-radius: 0.7rem; }
  .guide :global(table) { width: 100%; border-collapse: collapse; font-size: 0.88rem; line-height: 1.5; }
  .guide :global(th) { padding: 0.6rem 0.75rem; background: #f6f7f8; color: #48576b; font-size: 0.78rem; text-align: left; vertical-align: bottom; }
  .guide :global(td) { padding: 0.6rem 0.75rem; border-top: 1px solid #edf0f2; vertical-align: top; min-width: 7rem; overflow-wrap: normal; word-break: normal; }
  .guide :global(td:first-child) { min-width: 9rem; }

  .top { position: fixed; right: max(1rem, env(safe-area-inset-right)); bottom: max(1rem, env(safe-area-inset-bottom)); z-index: 20; display: grid; place-items: center; width: 2.75rem; height: 2.75rem; border-radius: 50%; background: #07182f; color: #fff; box-shadow: 0 0.5rem 1.2rem #07182f40; }
  .top:focus-visible { outline: 3px solid #d19b2d; outline-offset: 2px; }

  /* Below the phone's top bar. */
  @media (max-width: 58rem) {
    .bar { top: 3.75rem; }
    .guide :global(h1), .guide :global(h2), .guide :global(h3), .guide :global(h4) { scroll-margin-top: 9rem; }
  }
  @media (max-width: 40rem) {
    .guide { font-size: 0.95rem; }
    .jump { margin-left: 0; }
  }
</style>
