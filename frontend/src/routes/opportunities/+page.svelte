<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { Search, MapPin, Calendar } from "lucide-svelte";
  let items: any[] = [];
  let loading = true,
    error = "",
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
  onMount(load);
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
        ><option>EDUCATION</option><option>HEALTHCARE</option><option
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
              <h3>{o.title}</h3>
              <p>{o.description}</p>
              <span><MapPin size={15} />{o.location}, {o.country}</span
              >{#if o.deadline}<span
                  ><Calendar size={15} />Deadline {new Date(
                    o.deadline,
                  ).toLocaleDateString()}</span
                >{/if}<a href="/apply">VIEW & APPLY →</a>
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
  .state {
    text-align: center;
    padding: 70px;
    background: white;
    border-radius: 15px;
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
