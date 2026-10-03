<script lang="ts">
  import { Star } from "lucide-svelte";
  import { api } from "$lib/api";
  import { toasts } from "$lib/toast";
  import { REVIEW_LENGTH, reviewProblem, reviewState, stars, type OwnReview } from "$lib/reviews";
  import StarInput from "./StarInput.svelte";

  // Member dashboard: the review of one application that has been paid for.
  // A member writes it, may change it while it waits for approval, and sees
  // whether it has been published.
  let {
    applicationId,
    review,
    name: accountName = "",
    onsaved,
  }: {
    applicationId: string;
    review: OwnReview | null;
    name?: string;
    onsaved: (review: OwnReview) => void;
  } = $props();

  let writing = $state(false), sending = $state(false), error = $state("");
  let rating = $state(0), name = $state(""), detail = $state(""), body = $state("");
  let shown = $derived(review ? reviewState(review.status) : null);

  // A message about what is missing goes away once the member changes something.
  $effect(() => {
    void [rating, name, body];
    error = "";
  });

  function start() {
    rating = review?.rating ?? 0;
    name = review?.name ?? accountName;
    detail = review?.detail ?? "";
    body = review?.body ?? "";
    error = "";
    writing = true;
  }

  async function send() {
    error = reviewProblem({ rating, name, body });
    if (error) return;
    sending = true;
    try {
      const saved = await api<OwnReview>(`/reviews/application/${applicationId}`, {
        method: "PUT",
        body: JSON.stringify({ rating, name, detail, body }),
      });
      toasts.show(review ? "Review updated" : "Review sent", { detail: "It will appear on the website once our team has approved it." });
      onsaved(saved);
      writing = false;
    } catch (e) {
      error = e instanceof Error ? e.message : "Your review could not be sent. Please try again.";
    } finally {
      sending = false;
    }
  }
</script>

<div class="review-box">
  {#if writing}
    <form onsubmit={(e) => { e.preventDefault(); send(); }}>
      <StarInput bind:value={rating} name={`rating-${applicationId}`} />
      <div class="fields">
        <label><span>Name to show</span><input bind:value={name} required minlength="2" maxlength="80" autocomplete="name" /></label>
        <label><span>What we helped you with <em>(optional)</em></span><input bind:value={detail} maxlength="80" placeholder="e.g. MBBS admission, Malaysia" /></label>
      </div>
      <label>
        <span>Your review</span>
        <textarea bind:value={body} required minlength="10" maxlength={REVIEW_LENGTH} rows="5" placeholder="Tell others how it went."></textarea>
        <small>{body.length} / {REVIEW_LENGTH}</small>
      </label>
      {#if error}<p class="problem" role="alert">{error}</p>{/if}
      <div class="actions">
        <button class="send" disabled={sending}>{sending ? "Sending…" : review ? "Save changes" : "Send review"}</button>
        <button type="button" class="plain" onclick={() => (writing = false)} disabled={sending}>Cancel</button>
      </div>
      <p class="note">Your review appears on the website after our team approves it.</p>
    </form>
  {:else if review && shown}
    <div class="written">
      <div class="top">
        <span class="rating" role="img" aria-label={`${review.rating} out of 5 stars`}>
          {#each stars(review.rating) as filled}<span class:filled><Star size={17} /></span>{/each}
        </span>
        <i class={shown.tone}>{shown.label}</i>
      </div>
      <p class="words">{review.body}</p>
      <p class="by">{review.name}{review.detail ? ` · ${review.detail}` : ""}</p>
      {#if shown.editable}
        <button type="button" class="plain" onclick={start}>Edit review</button>
      {:else}
        <p class="note">Our team has checked this review. <a href="/contact">Contact us</a> if you would like to change it.</p>
      {/if}
    </div>
  {:else}
    <div class="invite">
      <p>You have paid for this service. Tell others how it went.</p>
      <button type="button" class="send" onclick={start}>Write a review</button>
    </div>
  {/if}
</div>

<style>
  .review-box{padding:1rem;border:1px solid #e1e7e9;border-radius:.8rem;background:#f8faf9}
  form{display:grid;gap:.85rem}
  .fields{display:grid;grid-template-columns:1fr 1fr;gap:.7rem}
  label{display:grid;gap:.35rem;min-width:0}
  label span{font-size:.75rem;font-weight:750;color:#29465f}
  label em{font-style:normal;font-weight:600;color:#7b8995}
  input,textarea{width:100%;border:1px solid #d6dfe2;border-radius:.7rem;background:#fff;padding:.6rem .8rem;color:#263c50;outline:none;font:inherit;font-size:1rem}
  input{min-height:2.85rem}
  textarea{resize:vertical;line-height:1.55}
  input:focus,textarea:focus{border-color:#bf8e2d;box-shadow:0 0 0 .2rem rgba(199,152,54,.14)}
  label small{justify-self:end;font-size:.7rem;color:#7b8995}
  p{margin:0;font-size:.86rem;line-height:1.55;color:#687986}
  .problem{padding:.7rem .9rem;border-radius:.7rem;background:#fff0f0;color:#943d45}
  .note{font-size:.78rem}
  .note a{color:#9b6b16;font-weight:700}
  .actions{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center}
  .send{min-height:2.85rem;border:0;border-radius:1.6rem;background:#d0a03d;color:#17304f;padding:.6rem 1.3rem;font-weight:800;cursor:pointer;transition:transform 150ms cubic-bezier(.23,1,.32,1),background-color 180ms ease}
  .send:active{transform:scale(.97)}
  .send:disabled{opacity:.6}
  .plain{min-height:2.75rem;border:0;background:none;padding:0 .2rem;color:#9b6b16;font-size:.86rem;font-weight:750;text-decoration:underline;cursor:pointer;justify-self:start}
  .invite{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.8rem}
  .written{display:grid;gap:.55rem}
  .top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:.6rem}
  .rating{display:flex;gap:.12rem;color:#d5dbe0}
  .rating span{display:grid}
  .rating .filled{color:#d9a93f}
  .rating .filled :global(svg){fill:currentColor}
  i{font-style:normal;font-size:.68rem;font-weight:800;letter-spacing:.04em;padding:.32rem .55rem;border-radius:.45rem;background:#edf0f1;color:#5d6b77}
  i.progress{background:#faf1da;color:#7a5a12}
  i.good{background:#e9f7ee;color:#267145}
  .words{font-size:.9rem;line-height:1.65;color:#33465a;white-space:pre-line;overflow-wrap:anywhere}
  .by{font-size:.8rem;font-weight:700;color:#23384f}
  @media(hover:hover) and (pointer:fine){.send:hover:not(:disabled){background:#dfb757}}
  @media(max-width:40rem){.fields{grid-template-columns:1fr}}
  @media(prefers-reduced-motion:reduce){.send{transition:none}}
</style>
