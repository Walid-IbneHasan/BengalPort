<script lang="ts">
  import { onMount } from "svelte";
  import { Check, EyeOff, LoaderCircle, Plus, Star, Trash2, X } from "lucide-svelte";
  import { api } from "$lib/api";
  import { REVIEW_LENGTH, reviewProblem, serviceName, stars, type ReviewStatus } from "$lib/reviews";
  import StarInput from "$lib/components/StarInput.svelte";

  // Customer reviews: the team approves a review before the website shows
  // it, can hide or delete one, and can add one received outside the website.
  type Row = {
    id: string;
    division: string;
    name: string;
    detail: string | null;
    rating: number;
    body: string;
    status: ReviewStatus;
    createdAt: string;
    application: { reference: string } | null;
    user: { name: string; email: string } | null;
  };
  type Filter = ReviewStatus | "ALL";
  const filters: { key: Filter; label: string }[] = [
    { key: "PENDING", label: "Waiting" },
    { key: "APPROVED", label: "Published" },
    { key: "HIDDEN", label: "Hidden" },
    { key: "ALL", label: "All" },
  ];
  const statusLabel: Record<ReviewStatus, string> = { PENDING: "Waiting for approval", APPROVED: "Published", HIDDEN: "Hidden" };
  const services = ["BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH"];

  let rows = $state<Row[]>([]),
    loading = $state(true),
    error = $state(""),
    notice = $state(""),
    filter = $state<Filter>("PENDING"),
    busy = $state("");
  let adding = $state(false), saving = $state(false), formError = $state("");
  let division = $state("EDUCATION"), rating = $state(0), name = $state(""), detail = $state(""), body = $state("");

  const count = (key: Filter) => (key === "ALL" ? rows.length : rows.filter((row) => row.status === key).length);
  let shown = $derived(filter === "ALL" ? rows : rows.filter((row) => row.status === filter));
  const day = (value: string) => new Date(value).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });

  onMount(async () => {
    try {
      rows = await api<Row[]>("/admin/reviews");
      if (!count("PENDING")) filter = "ALL";
    } catch (e) {
      error = e instanceof Error ? e.message : "The reviews could not be loaded.";
    } finally {
      loading = false;
    }
  });

  async function decide(row: Row, status: ReviewStatus) {
    busy = row.id;
    error = notice = "";
    try {
      const saved = await api<Row>(`/admin/reviews/${row.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
      rows = rows.map((item) => (item.id === row.id ? saved : item));
      notice = status === "APPROVED" ? `The review by ${row.name} is now on the website.` : `The review by ${row.name} is no longer shown.`;
    } catch (e) {
      error = e instanceof Error ? e.message : "The review could not be changed.";
    } finally {
      busy = "";
    }
  }

  async function remove(row: Row) {
    if (!confirm(`Delete the review by ${row.name}? This cannot be undone.`)) return;
    busy = row.id;
    error = notice = "";
    try {
      await api(`/admin/reviews/${row.id}`, { method: "DELETE" });
      rows = rows.filter((item) => item.id !== row.id);
      notice = "Review deleted.";
    } catch (e) {
      error = e instanceof Error ? e.message : "The review could not be deleted.";
    } finally {
      busy = "";
    }
  }

  async function add() {
    formError = reviewProblem({ rating, name, body });
    if (formError) return;
    saving = true;
    try {
      const saved = await api<Row>("/admin/reviews", { method: "POST", body: JSON.stringify({ division, rating, name, detail, body }) });
      rows = [saved, ...rows];
      rating = 0;
      name = detail = body = "";
      adding = false;
      filter = "APPROVED";
      notice = `The review by ${saved.name} was added and is on the website.`;
    } catch (e) {
      formError = e instanceof Error ? e.message : "The review could not be added.";
    } finally {
      saving = false;
    }
  }
</script>

<svelte:head><title>Reviews — Bengal Port Admin</title></svelte:head>

<div class="page">
  <header>
    <div>
      <span>CUSTOMERS</span>
      <h1>Reviews</h1>
      <p>Customers who have paid for a service can review it from their dashboard. A review is shown on that service's page once you approve it.</p>
    </div>
    <button type="button" class="add" onclick={() => { adding = !adding; formError = ""; }}>
      {#if adding}<X size={17} /> Close{:else}<Plus size={17} /> Add a review{/if}
    </button>
  </header>

  {#if adding}
    <form class="card form" onsubmit={(e) => { e.preventDefault(); add(); }}>
      <h2>Add a review you received outside the website</h2>
      <p class="hint">Use the customer's own words, with their permission. It is published at once.</p>
      <div class="fields">
        <label><span>Service</span><select bind:value={division}>{#each services as key}<option value={key}>{serviceName(key)}</option>{/each}</select></label>
        <label><span>Name to show</span><input bind:value={name} required minlength="2" maxlength="80" /></label>
        <label><span>About <em>(optional)</em></span><input bind:value={detail} maxlength="80" placeholder="e.g. MBBS admission, Malaysia" /></label>
      </div>
      <StarInput bind:value={rating} name="new-rating" label="Rating" />
      <label><span>Review</span><textarea bind:value={body} required minlength="10" maxlength={REVIEW_LENGTH} rows="4"></textarea></label>
      {#if formError}<p class="notice bad" role="alert">{formError}</p>{/if}
      <div><button class="primary" disabled={saving}>{saving ? "Adding…" : "Add review"}</button></div>
    </form>
  {/if}

  {#if error}<p class="notice bad" role="alert">{error}</p>{/if}
  {#if notice}<p class="notice good" role="status"><Check size={16} /> {notice}</p>{/if}

  {#if loading}
    <div class="state"><LoaderCircle class="spin" /> Loading reviews…</div>
  {:else}
    <div class="tabs" role="group" aria-label="Filter reviews">
      {#each filters as item}
        <button type="button" class:on={filter === item.key} aria-pressed={filter === item.key} onclick={() => (filter = item.key)}>{item.label} <b>{count(item.key)}</b></button>
      {/each}
    </div>

    {#each shown as row (row.id)}
      <article class="card review">
        <div class="top">
          <i class={row.status.toLowerCase()}>{statusLabel[row.status]}</i>
          <span class="service">{serviceName(row.division)}</span>
          <time>{day(row.createdAt)}</time>
        </div>
        <div class="rating" role="img" aria-label={`${row.rating} out of 5 stars`}>
          {#each stars(row.rating) as filled}<span class:filled><Star size={17} /></span>{/each}
        </div>
        <p class="words">{row.body}</p>
        <p class="by"><b>{row.name}</b>{row.detail ? ` · ${row.detail}` : ""}</p>
        <p class="from">
          {#if row.application}Application {row.application.reference}{row.user ? ` · ${row.user.name} (${row.user.email})` : ""}{:else if row.user}{row.user.name} ({row.user.email}){:else}Added by the team{/if}
        </p>
        <div class="actions">
          {#if row.status !== "APPROVED"}<button type="button" class="primary" disabled={busy === row.id} onclick={() => decide(row, "APPROVED")}><Check size={16} /> Approve</button>{/if}
          {#if row.status !== "HIDDEN"}<button type="button" disabled={busy === row.id} onclick={() => decide(row, "HIDDEN")}><EyeOff size={16} /> {row.status === "APPROVED" ? "Hide" : "Do not publish"}</button>{/if}
          <button type="button" class="danger" disabled={busy === row.id} onclick={() => remove(row)}><Trash2 size={16} /> Delete</button>
        </div>
      </article>
    {:else}
      <div class="state">{rows.length ? "No reviews here." : "No reviews yet. They appear here as customers write them."}</div>
    {/each}
  {/if}
</div>

<style>
  .page {
    padding: clamp(1rem, 4vw, 3rem);
    max-width: 70rem;
    margin: auto;
    display: grid;
    gap: 1rem;
  }
  .page > header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
  }
  .page > header span {
    font-size: 0.7rem;
    letter-spacing: 0.13em;
    font-weight: 800;
    color: var(--gold-deep);
  }
  h1 {
    font-size: clamp(2rem, 7vw, 3rem);
    letter-spacing: -0.04em;
    color: var(--heading);
    margin: 0.35rem 0;
  }
  header p {
    max-width: 44rem;
    margin: 0;
    color: var(--muted);
    line-height: 1.6;
  }
  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 2.75rem;
    padding: 0.55rem 0.95rem;
    border: 1px solid #dbe1e5;
    border-radius: 0.65rem;
    background: #fff;
    color: var(--heading);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 750;
    cursor: pointer;
    transition: transform 150ms var(--ease-out), background-color 160ms ease;
  }
  button:active {
    transform: scale(0.97);
  }
  button:disabled {
    opacity: 0.55;
  }
  button.primary,
  button.add {
    border-color: var(--gold);
    background: var(--gold);
  }
  button.danger {
    color: #a84747;
  }
  .card {
    background: #fff;
    border: 1px solid #dfe5e8;
    border-radius: 0.9rem;
    padding: clamp(1rem, 3vw, 1.5rem);
  }
  .form {
    display: grid;
    gap: 0.9rem;
  }
  .form h2 {
    margin: 0;
    font-size: 1.05rem;
    color: var(--heading);
  }
  .hint {
    margin: -0.5rem 0 0;
    font-size: 0.82rem;
    color: var(--muted);
  }
  .fields {
    display: grid;
    gap: 0.8rem;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
  label {
    display: grid;
    gap: 0.35rem;
    min-width: 0;
  }
  label span {
    font-size: 0.7rem;
    font-weight: 750;
    color: #40546a;
  }
  label em {
    font-style: normal;
    font-weight: 600;
    color: #7b8995;
  }
  input,
  select,
  textarea {
    width: 100%;
    min-height: 2.85rem;
    border: 1px solid #d5dde2;
    border-radius: 0.6rem;
    background: #fbfcfc;
    padding: 0.6rem 0.75rem;
    font: inherit;
    font-size: 1rem;
    color: #263c50;
    outline: 0;
  }
  textarea {
    resize: vertical;
    line-height: 1.55;
  }
  input:focus,
  select:focus,
  textarea:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px #c9952d1c;
  }
  .notice {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin: 0;
    padding: 0.8rem 1rem;
    border-radius: 0.65rem;
    font-size: 0.86rem;
  }
  .notice.bad {
    background: #fff0f0;
    color: #8d2929;
  }
  .notice.good {
    background: #eaf7ef;
    color: #286642;
  }
  .state {
    display: grid;
    place-items: center;
    gap: 0.6rem;
    padding: 3.5rem 1rem;
    color: var(--muted);
    text-align: center;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
  }
  .tabs button {
    border-radius: 99rem;
  }
  .tabs button b {
    min-width: 1.4rem;
    padding: 0.05rem 0.4rem;
    border-radius: 99rem;
    background: #edf0f1;
    font-size: 0.72rem;
    text-align: center;
  }
  .tabs button.on {
    border-color: var(--heading);
    background: var(--heading);
    color: #fff;
  }
  .tabs button.on b {
    background: #ffffff26;
  }
  .review {
    display: grid;
    gap: 0.6rem;
  }
  .top {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.7rem;
  }
  i {
    font-style: normal;
    font-size: 0.68rem;
    font-weight: 800;
    letter-spacing: 0.04em;
    padding: 0.32rem 0.55rem;
    border-radius: 0.45rem;
    background: #edf0f1;
    color: #5d6b77;
  }
  i.pending {
    background: #faf1da;
    color: #7a5a12;
  }
  i.approved {
    background: #e9f7ee;
    color: #267145;
  }
  .service {
    font-size: 0.78rem;
    font-weight: 750;
    color: var(--heading);
  }
  time {
    margin-left: auto;
    font-size: 0.76rem;
    color: var(--muted);
  }
  .rating {
    display: flex;
    gap: 0.12rem;
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
  .review p {
    margin: 0;
  }
  .words {
    line-height: 1.7;
    color: #33465a;
    white-space: pre-line;
    overflow-wrap: anywhere;
  }
  .by {
    font-size: 0.86rem;
    color: #23384f;
  }
  .from {
    font-size: 0.78rem;
    color: var(--muted);
    overflow-wrap: anywhere;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.3rem;
  }
  :global(.spin) {
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (max-width: 47.99rem) {
    .fields {
      grid-template-columns: 1fr;
    }
    .add {
      width: 100%;
    }
    .actions button {
      flex: 1 1 8rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
    :global(.spin) {
      animation: none;
    }
  }
</style>
