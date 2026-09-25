<script lang="ts">
  import { MessageCircle } from "lucide-svelte";
  import { page } from "$app/state";
  import { afterNavigate } from "$app/navigation";
  import { onDestroy } from "svelte";

  const number = import.meta.env.PUBLIC_WHATSAPP_NUMBER || "8801711991035";
  let heroVisible = false;
  let observer: IntersectionObserver | undefined;

  afterNavigate(() => {
    observer?.disconnect();
    observer = undefined;
    heroVisible = false;
    if (page.url.pathname !== "/") return;
    const hero = document.querySelector<HTMLElement>(".hero");
    if (!hero) return;
    observer = new IntersectionObserver(
      ([entry]) => (heroVisible = entry.isIntersecting),
      { threshold: 0.02 },
    );
    observer.observe(hero);
  });

  onDestroy(() => observer?.disconnect());
</script>

<a
  class:hero-hidden={page.url.pathname === "/" && heroVisible}
  class:home-page={page.url.pathname === "/"}
  class="wa"
  href={`https://wa.me/${number}`}
  target="_blank"
  rel="noreferrer"
  aria-label="Chat with us on WhatsApp"
  aria-hidden={page.url.pathname === "/" && heroVisible}
  tabindex={page.url.pathname === "/" && heroVisible ? -1 : undefined}
><span>Chat with us</span><MessageCircle size={27} /></a>

<style>
  .wa { position: fixed; right: 24px; bottom: 24px; z-index: 50; width: 58px; height: 58px; border-radius: 50%; background: #259f58; color: white; display: grid; place-items: center; box-shadow: 0 10px 28px #14763d40, inset 0 1px #ffffff4d; transition: transform 160ms var(--ease-out), background-color 180ms ease, box-shadow 180ms ease, opacity 160ms ease, visibility 160ms ease; }
  .wa:active { transform: scale(.96); }
  .wa.hero-hidden { opacity: 0; visibility: hidden; pointer-events: none; transform: translateY(.6rem) scale(.92); }
  .wa span { position: absolute; right: 70px; background: #17304f; color: white; padding: 8px 12px; border-radius: 7px; white-space: nowrap; font-size: 12px; opacity: 0; transform: translateX(5px) scale(.97); transform-origin: right center; transition: opacity 160ms var(--ease-out), transform 160ms var(--ease-out); pointer-events: none; }
  @media (hover: hover) and (pointer: fine) { .wa:hover { transform: translateY(-3px); background: #22aa5c; box-shadow: 0 14px 32px #14763d4d, inset 0 1px #ffffff59; } .wa:hover span { opacity: 1; transform: none; } }
  @media (max-width: 37.5rem) { .wa.home-page { display: none; } }
  @media (prefers-reduced-motion: reduce) { .wa, .wa span { transition-duration: .01ms; } }
</style>
