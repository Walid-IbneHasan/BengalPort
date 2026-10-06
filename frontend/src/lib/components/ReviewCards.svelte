<script lang="ts">
  import { Star } from "lucide-svelte";
  import { stars, type PublicReview } from "$lib/reviews";

  // Approved customer reviews as cards: a row to swipe through on a phone, a
  // grid on wider screens. `centered` keeps a few cards in the middle, for a
  // section whose heading is centred.
  let { reviews, centered = false }: { reviews: PublicReview[]; centered?: boolean } = $props();
</script>

<div class="review-list" class:centered>
  {#each reviews as item (item.id)}
    <figure class="review">
      <div class="rating" role="img" aria-label={`${item.rating} out of 5 stars`}>
        {#each stars(item.rating) as filled}<span class:filled><Star size={16} /></span>{/each}
      </div>
      <blockquote>{item.body}</blockquote>
      <figcaption><b>{item.name}</b>{#if item.detail}<span>{item.detail}</span>{/if}</figcaption>
    </figure>
  {/each}
</div>

<style>
  .review-list {
    display: grid;
    grid-auto-flow: column;
    grid-auto-columns: min(86%, 21rem);
    gap: 0.9rem;
    overflow-x: auto;
    scroll-snap-type: x proximity;
    overscroll-behavior-inline: contain;
    padding: 0.2rem 0.2rem 0.8rem;
  }
  .review {
    scroll-snap-align: start;
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 1.3rem;
    border: 1px solid #dfe5e8;
    border-radius: 1rem;
    background: #fff;
    box-shadow: 0 0.5rem 1.4rem #10264008;
    text-align: left;
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
    margin: 0.8rem 0 1.2rem;
    line-height: 1.7;
    color: #33465a;
    font-size: 0.93rem;
    white-space: pre-line;
    overflow-wrap: anywhere;
  }
  figcaption {
    margin-top: auto;
  }
  b,
  figcaption span {
    display: block;
  }
  b {
    color: #17304f;
  }
  figcaption span {
    margin-top: 0.15rem;
    font-size: 0.78rem;
    color: #6a7989;
  }
  @media (min-width: 56rem) {
    .review-list {
      grid-auto-flow: row;
      grid-auto-columns: auto;
      grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
      overflow: visible;
      padding: 0;
    }
    .review-list.centered {
      grid-template-columns: repeat(auto-fit, minmax(15rem, 22rem));
      justify-content: center;
    }
  }
</style>
