<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { day, money, officePermissions } from "$lib/office";
  import { blankDeal, DEAL_TABS, dealListQuery, type DealCustomer, type DealDraft, type DealStatus } from "$lib/deals";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import DealForm from "$lib/components/deals/DealForm.svelte";
  import { Handshake, Plus, Search, X } from "lucide-svelte";

  // Deals: what each customer has agreed to, for how much and by when.
  type Row = {
    id: string;
    dealNumber: string;
    title: string;
    status: DealStatus;
    currency: string;
    total: number | null;
    recognized: number | null;
    startDate: string | null;
    endDate: string | null;
    customer: { id: string; customerCode: string; name: string };
    assignedTo: { id: string; name: string } | null;
    _count: { invoices: number };
  };

  let tab = $state<string>(""),
    search = $state(""),
    customerId = $state(page.url.searchParams.get("customer") ?? ""),
    customerName = $state(""),
    rows = $state<Row[]>([]),
    loading = $state(true),
    problem = $state(""),
    draft = $state<DealDraft | null>(null),
    starting = $state(false);
  let timer: ReturnType<typeof setTimeout>;

  const may = (permission: string) => $officePermissions.has(permission);

  // Only the latest request counts, so a slow earlier search cannot replace a newer one.
  let latest = 0;
  async function load() {
    const ticket = ++latest;
    loading = true;
    problem = "";
    try {
      const found = await api<Row[]>(dealListQuery({ status: tab, customerId, search }));
      if (ticket !== latest) return;
      rows = found;
      if (customerId && !customerName) customerName = rows[0]?.customer.name ?? "";
    } catch (e) {
      if (ticket !== latest) return;
      rows = [];
      problem = problemText(e, "The deals could not be loaded");
    } finally {
      if (ticket === latest) loading = false;
    }
  }

  async function customerOf(id: string): Promise<DealCustomer | null> {
    try {
      return await api<DealCustomer>(`/office/customers/${id}`);
    } catch {
      return null;
    }
  }

  onMount(async () => {
    load();
    if (customerId) customerOf(customerId).then((found) => found && (customerName = found.name));
    // Arriving from a customer's page with "New deal".
    if (page.url.searchParams.get("new") === "1" && may("deals.create")) {
      starting = true;
      const found = customerId ? await customerOf(customerId) : null;
      starting = false;
      draft = blankDeal("", found ? { id: found.id, customerCode: found.customerCode, name: found.name, phone: found.phone, email: found.email, address: found.address, whatsapp: found.whatsapp } : null);
    }
  });

  function choose(next: string) {
    tab = next;
    load();
  }

  function searched() {
    clearTimeout(timer);
    timer = setTimeout(load, 250);
  }

  // The address keeps only the customer filter once the form is done with.
  function keepAddress() {
    if (!page.url.searchParams.has("new")) return;
    goto(customerId ? `/admin/deals?customer=${encodeURIComponent(customerId)}` : "/admin/deals", { replaceState: true, noScroll: true, keepFocus: true });
  }

  function closeForm() {
    draft = null;
    keepAddress();
  }

  function clearCustomer() {
    customerId = "";
    customerName = "";
    goto("/admin/deals", { replaceState: true, noScroll: true, keepFocus: true });
    load();
  }

  function saved(deal: { id: string }) {
    draft = null;
    toasts.show("Deal added");
    goto(`/admin/deals/${deal.id}`);
  }

  const period = (row: Row) => (row.startDate || row.endDate ? `${day(row.startDate)} – ${day(row.endDate)}` : "Not set");
</script>

<svelte:head><title>Deals — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office</span>
      <h1>Deals</h1>
      <p>Each deal is what a customer has agreed to: the services, the price, the timeline and what each side commits to. Invoices and the service agreement are made from it.</p>
    </div>
    {#if may("deals.create")}
      <div class="o-actions">
        <button class="o-btn" disabled={starting} onclick={() => (draft = blankDeal())}><Plus size={18} /> New deal</button>
      </div>
    {/if}
  </header>

  <nav class="o-tabs" aria-label="Which deals">
    {#each DEAL_TABS as item (item.key)}
      <button class:active={tab === item.key} aria-pressed={tab === item.key} onclick={() => choose(item.key)}>{item.label}</button>
    {/each}
  </nav>

  <div class="o-toolbar">
    <label class="o-search"><Search size={17} /><input bind:value={search} oninput={searched} placeholder="Deal title, D-number or customer" aria-label="Search deals" /></label>
    {#if customerId}
      <span class="chip">
        Customer: <b>{customerName || "this customer"}</b>
        <button type="button" aria-label="Show every customer's deals" onclick={clearCustomer}><X size={15} /></button>
      </span>
    {/if}
  </div>

  {#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}

  {#if loading}
    <p class="o-loading">Loading deals…</p>
  {:else if !rows.length}
    <div class="o-card o-empty">
      <Handshake size={28} />
      <h3>{search.trim() ? "No deal matches that" : tab ? "No deals here" : "No deals yet"}</h3>
      <p>{may("deals.create") ? "Start one with “New deal”, or from a customer's page." : "Deals you look after will show here."}</p>
    </div>
  {:else}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead>
          <tr>
            <th>Deal</th><th>Customer</th><th>Status</th>
            <th class="num">Total</th><th class="num">Recognised</th>
            <th>Dates</th><th>Given to</th><th class="num">Invoices</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr>
              <td class="lead" data-label="Deal"><a class="o-link" href={`/admin/deals/${row.id}`}><b>{row.title}</b></a><small>{row.dealNumber}</small></td>
              <td data-label="Customer"><a class="o-link" href={`/admin/customers/${row.customer.id}`}>{row.customer.name}</a><small>{row.customer.customerCode}</small></td>
              <td data-label="Status"><StatusPill status={row.status} /></td>
              <!-- Without permission to see money the server sends no figures. -->
              <td class="num" data-label="Total">{row.total === null ? "—" : money(row.total, row.currency)}</td>
              <td class="num" data-label="Recognised">{row.recognized === null ? "—" : money(row.recognized)}</td>
              <td data-label="Dates">{period(row)}</td>
              <td data-label="Given to">{row.assignedTo?.name ?? "—"}</td>
              <td class="num" data-label="Invoices">{row._count.invoices}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if rows.length >= 300}<p class="o-muted more">Showing the 300 most recently changed deals. Search to find older ones.</p>{/if}
  {/if}
</div>

{#if draft}
  <DealForm {draft} onclose={closeForm} onsaved={saved} />
{/if}

<style>
  .chip { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 2.6rem; padding: 0 0.4rem 0 0.8rem; border: 1px solid #e2d3ad; border-radius: 0.65rem; background: #fdf9ef; color: #6f5418; font-size: 0.86rem; }
  .chip b { color: #07182f; overflow-wrap: anywhere; }
  .chip button { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; border: 0; border-radius: 0.5rem; background: none; color: #6f5418; cursor: pointer; }
  .chip button:focus-visible { outline: 3px solid #d19b2d; outline-offset: 1px; }
  .more { margin-top: 0.75rem; font-size: 0.84rem; }
</style>
