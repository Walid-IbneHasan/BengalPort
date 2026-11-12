<script lang="ts" module>
  // A customer in the office's customer list (CRM), as pickers need it.
  export type PickedCustomer = {
    id: string;
    customerCode: string;
    name: string;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    address?: string | null;
  };
</script>

<script lang="ts">
  import { apiPage } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { LoaderCircle, Search, UserRound, X } from "lucide-svelte";

  // Finds a customer by name, code (C-000012), phone or email and picks one.
  // Shows the chosen customer with a button to choose another.
  let {
    customer = $bindable(null),
    label = "Customer",
    required = false,
    locked = false,
    onpick,
  }: {
    customer?: PickedCustomer | null;
    label?: string;
    required?: boolean;
    locked?: boolean;
    onpick?: (customer: PickedCustomer | null) => void;
  } = $props();

  const uid = `picker-${Math.random().toString(36).slice(2, 8)}`;
  let query = $state(""),
    results = $state<PickedCustomer[]>([]),
    searchedFor = $state(""),
    looking = $state(false),
    problem = $state("");
  let timer: ReturnType<typeof setTimeout> | undefined;

  function lookUp() {
    clearTimeout(timer);
    const term = query.trim();
    if (term.length < 2) {
      results = [];
      searchedFor = "";
      return;
    }
    timer = setTimeout(async () => {
      looking = true;
      problem = "";
      try {
        const page = await apiPage<PickedCustomer>(`/office/customers?pageSize=8&search=${encodeURIComponent(term)}`);
        results = page.rows;
        searchedFor = term;
      } catch (e) {
        problem = problemText(e, "Customers could not be searched");
      } finally {
        looking = false;
      }
    }, 250);
  }

  function pick(next: PickedCustomer | null) {
    customer = next;
    query = "";
    results = [];
    searchedFor = "";
    onpick?.(next);
  }
</script>

<div class="picker">
  <span class="label" id={`${uid}-label`}>{label}{#if required}{" "}<b aria-hidden="true">*</b>{/if}</span>
  {#if customer}
    <div class="chosen">
      <UserRound size={18} />
      <div><b>{customer.name}</b><small>{customer.customerCode}{customer.phone ? ` · ${customer.phone}` : ""}</small></div>
      {#if !locked}<button type="button" class="o-btn ghost small" onclick={() => pick(null)} aria-label={`Choose another customer instead of ${customer.name}`}><X size={15} /> Change</button>{/if}
    </div>
  {:else}
    <label class="o-search">
      {#if looking}<LoaderCircle size={17} class="spin" />{:else}<Search size={17} />{/if}
      <input
        bind:value={query}
        oninput={lookUp}
        aria-labelledby={`${uid}-label`}
        placeholder="Name, customer number, phone or email"
        autocomplete="off"
      />
    </label>
    {#if problem}<p class="o-error">{problem}</p>{/if}
    {#if results.length}
      <ul class="results" role="listbox" aria-labelledby={`${uid}-label`}>
        {#each results as row (row.id)}
          <li role="option" aria-selected="false">
            <button type="button" onclick={() => pick(row)}>
              <b>{row.name}</b>
              <small>{row.customerCode}{row.phone ? ` · ${row.phone}` : ""}{row.email ? ` · ${row.email}` : ""}</small>
            </button>
          </li>
        {/each}
      </ul>
    {:else if searchedFor && !looking}
      <p class="hint">No customer matches “{searchedFor}”. Add them under Customers first.</p>
    {/if}
  {/if}
</div>

<style>
  .picker { display: grid; gap: 0.4rem; min-width: 0; }
  .label { font-size: 0.76rem; font-weight: 800; color: #405066; }
  .label b { color: #a3302a; }
  .chosen { display: flex; align-items: center; gap: 0.7rem; padding: 0.6rem 0.75rem; border: 1px solid #e2d3ad; border-radius: 0.65rem; background: #fdf9ef; color: #6f5418; }
  .chosen div { flex: 1; min-width: 0; }
  .chosen b, .chosen small { display: block; overflow-wrap: anywhere; }
  .chosen b { color: #07182f; }
  .chosen small { color: #6a7585; font-size: 0.78rem; }
  .results { margin: 0; padding: 0.3rem; list-style: none; border: 1px solid #dfe5ea; border-radius: 0.65rem; background: #fff; box-shadow: 0 0.6rem 1.4rem #07182f14; }
  .results button { display: block; width: 100%; padding: 0.55rem 0.65rem; border: 0; border-radius: 0.5rem; background: none; text-align: left; font: inherit; cursor: pointer; }
  .results button:focus-visible { outline: 3px solid #d19b2d; outline-offset: -3px; }
  .results b, .results small { display: block; overflow-wrap: anywhere; }
  .results small { margin-top: 0.1rem; color: #6a7585; font-size: 0.78rem; }
  .hint { margin: 0; color: #6a7585; font-size: 0.8rem; }
  :global(.spin) { animation: spin 0.9s linear infinite; }
  @media (hover: hover) and (pointer: fine) { .results button:hover { background: #faf8f1; } }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { :global(.spin) { animation: none; } }
</style>
