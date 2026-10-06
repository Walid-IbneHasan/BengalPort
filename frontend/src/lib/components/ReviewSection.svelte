<script lang="ts">
  import ReviewCards from "./ReviewCards.svelte";
  import type { PublicReview } from "$lib/reviews";

  // The approved reviews of one service, for that service's page. It shows
  // nothing until there is at least one.
  let {
    reviews,
    eyebrow = "CLIENT REVIEWS",
    title = "What our clients say",
  }: { reviews: PublicReview[]; eyebrow?: string; title?: string } = $props();
</script>

{#if reviews.length}<section class="client-reviews" id="reviews">
    <header>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
    </header>
    <ReviewCards {reviews} centered />
  </section>{/if}

<style>
  .client-reviews {
    width: 100%;
    max-width: 88rem;
    margin-inline: auto;
    padding-block: 4rem 1rem;
    scroll-margin-top: 10.7rem;
  }
  header {
    max-width: 46rem;
    margin: 0 auto 2rem;
    text-align: center;
  }
  header span {
    font-size: 0.72rem;
    letter-spacing: 0.14em;
    font-weight: 800;
    color: #8f6410;
  }
  h2 {
    font-size: clamp(1.8rem, 6.4vw, 3rem);
    line-height: 1.1;
    letter-spacing: -0.04em;
    color: #17304f;
    margin: 0.5rem 0 0;
    text-wrap: balance;
  }
  @media (max-width: 37.5rem) {
    .client-reviews {
      scroll-margin-top: 6.2rem;
    }
  }
</style>
