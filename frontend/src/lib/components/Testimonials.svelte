<script lang="ts">
  import { onMount } from "svelte";
  import { fade, fly } from "svelte/transition";
  import { cubicOut } from "svelte/easing";
  import { ChevronLeft, ChevronRight, Star } from "lucide-svelte";
  import { excerpt, initials, stars, type PublicReview } from "$lib/reviews";

  // Approved reviews as a slideshow: one at a time, with the reviewer's
  // photo (or their initials), their name and a short excerpt. It moves on
  // by itself, waits while the pointer or focus is on it, and stays still for
  // people who asked for less motion. `interval` is the time each is shown.
  let { reviews, interval = 7000 }: { reviews: PublicReview[]; interval?: number } = $props();

  let index = $state(0);
  let paused = $state(false);
  let reduced = $state(false);
  let count = $derived(reviews.length);
  let current = $derived(reviews[Math.min(index, count - 1)]);
  let duration = $derived(reduced ? 0 : 480);

  const show = (next: number) => (index = ((next % count) + count) % count);
  const forward = () => show(index + 1);
  const back = () => show(index - 1);

  onMount(() => {
    const query = matchMedia("(prefers-reduced-motion: reduce)");
    reduced = query.matches;
    const update = () => (reduced = query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  });

  $effect(() => {
    if (paused || reduced || count < 2) return;
    const timer = setInterval(forward, interval);
    return () => clearInterval(timer);
  });

  // A sideways swipe moves to the next or the previous review.
  let touchStart = 0;
  function pointerDown(event: PointerEvent) {
    if (event.pointerType !== "mouse") touchStart = event.clientX;
  }
  function pointerUp(event: PointerEvent) {
    if (event.pointerType === "mouse" || !touchStart) return;
    const moved = event.clientX - touchStart;
    touchStart = 0;
    if (Math.abs(moved) > 40) moved < 0 ? forward() : back();
  }
</script>

{#if count}
  <section
    class="testimonials"
    aria-roledescription="carousel"
    aria-label="Student reviews"
    onmouseenter={() => (paused = true)}
    onmouseleave={() => (paused = false)}
    onfocusin={() => (paused = true)}
    onfocusout={() => (paused = false)}
    onpointerdown={pointerDown}
    onpointerup={pointerUp}
  >
    <div class="stage" aria-live="polite" aria-atomic="true">
      {#key current.id}
        <figure
          class="slide"
          in:fly={{ y: 18, duration, easing: cubicOut, delay: duration ? 120 : 0 }}
          out:fade={{ duration: duration ? 200 : 0 }}
        >
          <span class="mark" aria-hidden="true">“</span>
          <div class="rating" role="img" aria-label={`${current.rating} out of 5 stars`}>
            {#each stars(current.rating) as filled}<span class:filled><Star size={16} /></span>{/each}
          </div>
          <blockquote>{excerpt(current.body)}</blockquote>
          <figcaption>
            <span class="avatar">
              {#if current.photoUrl}<img
                  src={current.photoUrl}
                  alt=""
                  width="56"
                  height="56"
                  loading="lazy"
                  decoding="async"
                  referrerpolicy="no-referrer"
                />{:else}<b>{initials(current.name)}</b>{/if}
            </span>
            <span class="who">
              <b>{current.name}</b>
              {#if current.detail}<small>{current.detail}</small>{/if}
            </span>
          </figcaption>
        </figure>
      {/key}
    </div>
    {#if count > 1}
      <div class="controls">
        <button type="button" class="arrow" aria-label="Previous review" onclick={back}><ChevronLeft size={20} /></button>
        <div class="dots">
          {#each reviews as review, i (review.id)}
            <button
              type="button"
              class:on={i === index}
              aria-label={`Review ${i + 1} of ${count}: ${review.name}`}
              aria-current={i === index ? "true" : undefined}
              onclick={() => show(i)}
            ></button>
          {/each}
        </div>
        <button type="button" class="arrow" aria-label="Next review" onclick={forward}><ChevronRight size={20} /></button>
      </div>
    {/if}
  </section>
{/if}

<style>
  /* Colours come from the page around it, with the site's own as fallback. */
  .testimonials {
    --t-ink: var(--ink, #17304f);
    --t-gold: var(--accent, #c79836);
    --t-gold-text: var(--accent-text, #8a6a2b);
    --t-gold-on-ink: var(--on-ink-gold, #efc45e);
    --t-line: var(--line, #e2e6e8);
    --t-wash: var(--ink-soft, #e9eef4);
    display: grid;
    gap: 1rem;
    touch-action: pan-y;
  }
  .stage {
    display: grid;
    min-height: 16rem;
  }
  .slide {
    grid-area: 1 / 1;
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    margin: 0;
    padding: 1.6rem 1.4rem 1.5rem;
    border: 1px solid var(--t-line);
    border-radius: 1.25rem;
    background: #fff;
    box-shadow: 0 0.8rem 2rem #17304f14;
    overflow: hidden;
  }
  .mark {
    position: absolute;
    top: -0.9rem;
    right: 1rem;
    font-size: 8rem;
    line-height: 1;
    font-weight: 800;
    color: var(--t-gold);
    opacity: 0.16;
    pointer-events: none;
    user-select: none;
  }
  .rating {
    display: flex;
    gap: 0.15rem;
    color: #d5dbe0;
  }
  .rating span {
    display: grid;
  }
  .rating .filled {
    color: #d9a93f;
  }
  .rating .filled :global(svg) {
    fill: currentColor;
  }
  blockquote {
    position: relative;
    margin: 0;
    font-size: clamp(1.02rem, 1.6vw, 1.22rem);
    line-height: 1.6;
    font-weight: 600;
    letter-spacing: -0.005em;
    color: #26384b;
    text-wrap: pretty;
    overflow-wrap: anywhere;
  }
  figcaption {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    margin-top: auto;
    padding-top: 1rem;
    border-top: 1px solid var(--t-line);
  }
  .avatar {
    flex: none;
    width: 3.5rem;
    height: 3.5rem;
    display: grid;
    place-items: center;
    padding: 2px;
    border: 2px solid var(--t-gold);
    border-radius: 50%;
    background: #fff;
  }
  .avatar img,
  .avatar b {
    width: 100%;
    height: 100%;
    border-radius: 50%;
    object-fit: cover;
    background: var(--t-wash);
  }
  .avatar b {
    display: grid;
    place-items: center;
    background: var(--t-ink);
    color: var(--t-gold-on-ink);
    font-size: 1rem;
    font-weight: 800;
    letter-spacing: 0.04em;
  }
  .who {
    display: grid;
    gap: 0.1rem;
    min-width: 0;
  }
  .who b {
    color: var(--t-ink);
    font-size: 0.98rem;
    line-height: 1.25;
  }
  .who small {
    font-size: 0.78rem;
    color: var(--t-gold-text);
    font-weight: 700;
    letter-spacing: 0.01em;
  }
  .controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.9rem;
  }
  .arrow {
    width: 2.75rem;
    height: 2.75rem;
    display: grid;
    place-items: center;
    padding: 0;
    border: 1px solid var(--t-line);
    border-radius: 50%;
    background: #fff;
    color: var(--t-ink);
    cursor: pointer;
    transition:
      background-color 160ms ease,
      color 160ms ease,
      border-color 160ms ease,
      transform 150ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  .arrow:active {
    transform: scale(0.94);
  }
  .dots {
    display: flex;
    align-items: center;
    gap: 0.45rem;
  }
  .dots button {
    width: 0.55rem;
    height: 0.55rem;
    padding: 0;
    border: 0;
    border-radius: 99rem;
    background: #cfd7df;
    cursor: pointer;
    transition:
      width 260ms cubic-bezier(0.23, 1, 0.32, 1),
      background-color 200ms ease;
  }
  .dots button.on {
    width: 1.5rem;
    background: var(--t-gold);
  }
  .testimonials button:focus-visible {
    outline: 3px solid rgba(199, 152, 54, 0.55);
    outline-offset: 3px;
  }
  @media (hover: hover) and (pointer: fine) {
    .arrow:hover {
      border-color: var(--t-ink);
      background: var(--t-ink);
      color: #fff;
    }
    .dots button:not(.on):hover {
      background: var(--t-gold-text);
    }
  }
  @media (min-width: 48rem) {
    .slide {
      padding: 2rem 2rem 1.75rem;
    }
    .stage {
      min-height: 17.5rem;
    }
    .controls {
      justify-content: flex-start;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .arrow,
    .dots button {
      transition: none;
    }
  }
</style>
