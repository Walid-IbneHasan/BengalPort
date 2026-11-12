<script lang="ts" module>
  export type CustomerApplication = { id: string; reference: string; type: string; amountDue: number | null; paid: number; remaining: number | null };
  export type Customer = { id: string; name: string; email: string; phone?: string | null; applications: CustomerApplication[] };
</script>

<script lang="ts">
  import { api } from "$lib/api";
  import { bdt } from "$lib/invoices";
  import { problemText } from "$lib/problem";
  import { LoaderCircle, Search, UserRound, X } from "lucide-svelte";

  // Chooses an existing customer account for a Hisab Kitab entry, and
  // optionally one of their applications. Both are optional.
  let {
    customer = $bindable(null),
    applicationId = $bindable(""),
    locked = false,
  }: { customer?: Customer | null; applicationId?: string; locked?: boolean } = $props();

  let query = $state(""),
    results = $state<Customer[]>([]),
    searchedFor = $state(""),
    looking = $state(false),
    problem = $state("");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const auth = () => ({ authorization: `Bearer ${localStorage.getItem("bp_token")}` });
  const division = (type: string) => type.charAt(0) + type.slice(1).toLowerCase();

  function lookUp() {
    clearTimeout(timer);
    problem = "";
    const term = query.trim();
    if (term.length < 2) {
      results = [];
      searchedFor = "";
      return;
    }
    timer = setTimeout(async () => {
      looking = true;
      try {
        results = await api<Customer[]>(`/admin/accounts/customers?search=${encodeURIComponent(term)}`, { headers: auth() });
        searchedFor = term;
      } catch (e) {
        problem = problemText(e, "Customers could not be searched.");
      } finally {
        looking = false;
      }
    }, 250);
  }
  function choose(found: Customer) {
    customer = found;
    applicationId = "";
    results = [];
    query = "";
    searchedFor = "";
  }
  function clear() {
    customer = null;
    applicationId = "";
  }
</script>

<div class="picker">
  {#if customer}
    <div class="chosen">
      <i><UserRound size={18} /></i>
      <div><b>{customer.name}</b><small>{customer.email}{customer.phone ? ` · ${customer.phone}` : ""}</small></div>
      {#if !locked}<button type="button" aria-label="Remove the customer" onclick={clear}><X size={16} /></button>{/if}
    </div>
    {#if customer.applications.length}
      <label class="application">
        <span>Application</span>
        <select bind:value={applicationId} disabled={locked}>
          <option value="">Not for one application</option>
          {#each customer.applications as item}
            <option value={item.id}>{item.reference} · {division(item.type)}{item.remaining !== null ? ` · ${bdt(item.remaining)} due` : ""}</option>
          {/each}
        </select>
      </label>
    {:else}
      <p class="hint">This account has no applications.</p>
    {/if}
  {:else}
    <label class="search">
      <Search size={17} />
      <input bind:value={query} oninput={lookUp} placeholder="Search by name, email or phone" autocomplete="off" disabled={locked} aria-label="Search for a customer" />
      {#if looking}<LoaderCircle size={16} class="spin" />{/if}
    </label>
    {#if results.length}
      <ul class="results">
        {#each results as found}
          <li><button type="button" onclick={() => choose(found)}><b>{found.name}</b><small>{found.email}{found.phone ? ` · ${found.phone}` : ""} · {found.applications.length} {found.applications.length === 1 ? "application" : "applications"}</small></button></li>
        {/each}
      </ul>
    {:else if searchedFor && !looking}
      <p class="hint">No account matches “{searchedFor}”. You can still type the name below.</p>
    {/if}
    {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
  {/if}
</div>

<style>
  .picker{display:grid;gap:.55rem}
  .search{display:flex;align-items:center;gap:.5rem;border:1px solid #d5dbe1;background:#fff;border-radius:8px;padding:0 .75rem;color:#687485}
  .search:focus-within{border-color:#c9952d;box-shadow:0 0 0 3px #c9952d1c}
  .search input{flex:1;min-width:0;border:0;outline:0;padding:.7rem 0;background:none}
  .results{list-style:none;margin:0;padding:.3rem;border:1px solid #dfe4e9;border-radius:10px;background:#fff;box-shadow:0 .6rem 1.5rem #07182f14;max-height:15rem;overflow:auto}
  .results button{display:block;width:100%;padding:.6rem .7rem;border:0;border-radius:7px;background:none;text-align:left;cursor:pointer}
  .results button:focus-visible{outline:2px solid #c9952d}
  @media(hover:hover) and (pointer:fine){.results button:hover{background:#f4f6f8}}
  .results b,.chosen b{display:block;font-size:.88rem;color:#07182f}
  .results small,.chosen small{display:block;margin-top:.15rem;font-size:.76rem;color:#687485;overflow-wrap:anywhere}
  .chosen{display:flex;align-items:center;gap:.7rem;padding:.65rem .75rem;border:1px solid #c9952d66;border-radius:10px;background:#fffaf0}
  .chosen>div{flex:1;min-width:0}
  .chosen i{display:grid;place-items:center;width:2.1rem;height:2.1rem;border-radius:50%;background:#07182f;color:#e1b34a;font-style:normal;flex:none}
  .chosen button{display:grid;place-items:center;width:2.25rem;height:2.25rem;border:0;border-radius:8px;background:none;color:#5d7080;cursor:pointer}
  .application{display:grid;gap:.35rem}
  .application span{font-size:11px;font-weight:800;color:#405066}
  .application select{width:100%;border:1px solid #d5dbe1;background:#fff;border-radius:8px;padding:.7rem .75rem}
  .hint{margin:0;font-size:.78rem;color:#687485}
  .problem{margin:0;font-size:.8rem;font-weight:650;color:#b42318}
  :global(.spin){animation:spin 900ms linear infinite}
  @keyframes spin{to{transform:rotate(360deg)}}
  @media(max-width:58rem){.search input,.application select{font-size:16px}}
</style>
