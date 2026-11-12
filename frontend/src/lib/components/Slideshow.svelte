<script lang="ts">
  import { onMount } from "svelte";
  import { ChevronLeft, ChevronRight } from "lucide-svelte";

  // Photos of one place shown one at a time. With one photo it is just that
  // photo; with more, they cross-fade on their own (not for people who asked
  // for less motion), and can be stepped through with the arrows, the dots,
  // the arrow keys or a swipe. Hovering or focusing pauses it.
  let {
    photos,
    label,
    interval = 5000,
    ratio = "4 / 3",
    controls = true,
  }: { photos: string[]; label: string; interval?: number; ratio?: string; controls?: boolean } = $props();

  let shown = $state(0);
  let paused = $state(false);
  let calm = $state(false);
  let list = $derived(photos.filter(Boolean));
  let many = $derived(list.length > 1);
  const go = (to: number) => (shown = (to + list.length) % list.length);

  onMount(() => {
    calm = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timer = setInterval(() => {
      if (many && !paused && !calm && document.visibilityState === "visible") go(shown + 1);
    }, interval);
    return () => clearInterval(timer);
  });

  let startX: number | null = null;
  function swipeStart(event: PointerEvent) {
    if (event.pointerType !== "mouse") startX = event.clientX;
  }
  function swipeEnd(event: PointerEvent) {
    if (startX === null) return;
    const moved = event.clientX - startX;
    startX = null;
    if (Math.abs(moved) > 40) go(shown + (moved < 0 ? 1 : -1));
  }
  function keys(event: KeyboardEvent) {
    if (event.key === "ArrowRight") go(shown + 1);
    else if (event.key === "ArrowLeft") go(shown - 1);
    else return;
    event.preventDefault();
  }
</script>

{#if list.length}
  <div
    class="slides"
    style:aspect-ratio={ratio}
    role="region"
    aria-roledescription={many ? "carousel" : undefined}
    aria-label={label}
    onpointerenter={() => (paused = true)}
    onpointerleave={() => (paused = false)}
    onfocusin={() => (paused = true)}
    onfocusout={() => (paused = false)}
    onpointerdown={swipeStart}
    onpointerup={swipeEnd}
    onpointercancel={() => (startX = null)}
  >
    {#each list as photo, i (photo + i)}
      <img
        src={photo}
        alt={many ? `${label}, photo ${i + 1} of ${list.length}` : label}
        class:on={i === shown}
        aria-hidden={i === shown ? undefined : "true"}
        loading={i === 0 ? "eager" : "lazy"}
        decoding="async"
        draggable="false"
      />
    {/each}
    {#if many && controls}
      <button type="button" class="arrow prev" aria-label="Previous photo" onclick={() => go(shown - 1)} onkeydown={keys}><ChevronLeft size={20} /></button>
      <button type="button" class="arrow next" aria-label="Next photo" onclick={() => go(shown + 1)} onkeydown={keys}><ChevronRight size={20} /></button>
      <div class="dots">
        {#each list as _, i}
          <button type="button" class:on={i === shown} aria-label={`Show photo ${i + 1} of ${list.length}`} aria-current={i === shown ? "true" : undefined} onclick={() => go(i)}></button>
        {/each}
      </div>
    {/if}
  </div>
{/if}

<style>
  .slides{position:relative;overflow:hidden;background:#dfe5ea;touch-action:pan-y;user-select:none}
  img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity 700ms var(--ease-out,ease-out)}
  img.on{opacity:1}
  .arrow{position:absolute;top:50%;z-index:1;display:grid;place-items:center;width:2.6rem;height:2.6rem;margin-top:-1.3rem;border:0;border-radius:50%;background:rgba(7,24,47,.55);color:#fff;cursor:pointer;opacity:0;transition:opacity 180ms ease,background-color 160ms ease}
  .prev{left:.6rem}
  .next{right:.6rem}
  .slides:hover .arrow,.arrow:focus-visible{opacity:1}
  .arrow:focus-visible{outline:3px solid #e1b34a;outline-offset:2px}
  .dots{position:absolute;left:50%;bottom:.55rem;z-index:1;display:flex;gap:.1rem;transform:translateX(-50%);padding:.1rem .3rem;border-radius:1rem;background:rgba(7,24,47,.35)}
  .dots button{position:relative;width:1.5rem;height:1.5rem;border:0;background:none;cursor:pointer}
  .dots button::after{content:"";position:absolute;inset:50% auto auto 50%;width:.45rem;height:.45rem;margin:-.225rem 0 0 -.225rem;border-radius:50%;background:rgba(255,255,255,.55);transition:transform 160ms ease,background-color 160ms ease}
  .dots button.on::after{background:#e1b34a;transform:scale(1.25)}
  .dots button:focus-visible{outline:2px solid #e1b34a;border-radius:50%}
  /* Touch screens have no hover: the arrows stay in sight. */
  @media(hover:none){.arrow{opacity:.9;width:2.3rem;height:2.3rem;margin-top:-1.15rem}}
  @media(prefers-reduced-motion:reduce){img,.arrow{transition:none}}
</style>
