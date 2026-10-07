<script lang="ts">
  import { api } from "$lib/api";
  import { shortDate } from "$lib/datetime";
  import { Search, MapPin, Calendar } from "lucide-svelte";
  // The first list is loaded on the server by +page.ts; searches run here.
  export let data: { items: any[] | null };
  let items: any[] = data.items ?? [];
  let loading = false,
    error = data.items ? "" : "Opportunities could not be loaded.",
    search = "",
    category = "";
  async function load() {
    loading = true;
    error = "";
    try {
      items = await api(
        `/opportunities?search=${encodeURIComponent(search)}&category=${category}`,
      );
    } catch (e) {
      error = e instanceof Error ? e.message : "Unable to load";
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head><title>Opportunities — Bengal Port</title></svelte:head>
<section class="page-hero">
  <div class="wrap">
    <span class="eyebrow">OPPORTUNITIES</span>
    <h1>Find your next opening.</h1>
    <p>
      Current business, education, healthcare, visit, scholarship and event
      opportunities.
    </p>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <form
      class="filter"
      onsubmit={(e) => {
        e.preventDefault();
        load();
      }}
    >
      <label
        ><Search size={18} /><input
          bind:value={search}
          placeholder="Search opportunities"
          aria-label="Search opportunities"
        /></label
      ><select bind:value={category} aria-label="Category"
        ><option value="">All categories</option><option>BUSINESS</option
        ><option>EDUCATION</option><option>HEALTHCARE</option><option>UMRAH</option><option
          >FACTORY_VISIT</option
        ><option>BUSINESS_TOUR</option><option>SCHOLARSHIP</option><option
          >EVENT</option
        ></select
      ><button class="btn">SEARCH</button>
    </form>
    {#if loading}<div class="state">
        Loading opportunities…
      </div>{:else if error}<div class="state error">
        {error}<button onclick={load}>Try again</button>
      </div>{:else if !items.length}<div class="state">
        No opportunities match your filters.
      </div>{:else}<div class="grid-3">
        {#each items as o}<article class="opp">
            <img src={o.image} alt={o.title} loading="lazy" decoding="async" />
            <div>
              <small>{o.category.replaceAll("_", " ")}</small>
              <h3><a class="title" href={`/opportunities/${o.slug}`}>{o.title}</a></h3>
              <p>{o.description}</p>
              <span><MapPin size={15} />{o.location}, {o.country}</span
              >{#if o.deadline}<span
                  ><Calendar size={15} />Apply by {shortDate(o.deadline)}</span
                >{/if}<a href={`/opportunities/${o.slug}`}>VIEW DETAILS →</a>
            </div>
          </article>{/each}
      </div>{/if}
  </div>
</section>

<style>
  .filter {
    display: flex;
    gap: 12px;
    margin-bottom: 35px;
  }
  .filter label {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    border: 1px solid #d9dee5;
    border-radius: 9px;
    padding: 0 14px;
    background: white;
  }
  .filter input {
    width: 100%;
    border: 0;
    padding: 14px;
    outline: none;
  }
  .filter select {
    border: 1px solid #d9dee5;
    border-radius: 9px;
    padding: 0 14px;
    background: white;
  }
  /* Loading, empty and failed states: a centred message, and on failure a
     button under it. The padding shrinks with the screen. */
  .state {
    display: grid;
    justify-items: center;
    gap: 0.9rem;
    text-align: center;
    padding: clamp(1.75rem, 10vw, 70px) 1.25rem;
    background: white;
    border-radius: 15px;
    line-height: 1.5;
  }
  .state button {
    min-height: 2.75rem;
    padding: 0.55rem 1.25rem;
    border: 1px solid var(--line, #e2e6e8);
    border-radius: 999px;
    background: #fff;
    color: var(--ink, #17304f);
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  .opp {
    background: #fff;
    border-radius: 18px;
    overflow: hidden;
    box-shadow: var(--shadow);
  }
  .opp img {
    width: 100%;
    height: 210px;
    object-fit: cover;
  }
  .opp > div {
    padding: 24px;
  }
  .opp small {
    color: var(--gold);
    font-weight: 800;
  }
  .opp p {
    line-height: 1.65;
    color: #5b6676;
  }
  .opp span {
    display: flex;
    align-items: center;
    gap: 7px;
    margin: 8px 0;
    color: #5b6676;
    font-size: 13px;
  }
  .opp h3 .title {
    margin: 0;
    color: inherit;
    font-weight: inherit;
  }
  .opp a {
    display: inline-block;
    color: var(--navy);
    font-weight: 800;
    text-decoration: none;
    margin-top: 13px;
  }
  @media (max-width: 650px) {
    .filter {
      flex-direction: column;
    }
    .filter select,
    .filter button {
      height: 48px;
    }
  }
</style>
