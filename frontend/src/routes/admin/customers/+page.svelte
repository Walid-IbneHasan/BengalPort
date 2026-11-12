<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api, apiPage } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { day, officeMe, officePermissions, today } from "$lib/office";
  import { downloadFile } from "$lib/office-files";
  import { lastPage, pageSummary, type PageMeta } from "$lib/pagination";
  import { CUSTOMER_STATUSES, followUpState, plural, type Customer } from "$lib/crm";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import CustomerForm from "$lib/components/customers/CustomerForm.svelte";
  import { BellRing, ChevronLeft, ChevronRight, Download, Plus, Search, UsersRound } from "lucide-svelte";

  // The customer list (CRM): everyone the office deals with, each with their
  // own number (C-000012). Employees see the customers given to them;
  // managers and the Super Admin see everyone in their branch.
  type Staff = { id: string; name: string; role: string };
  type Branch = { id: string; name: string; active: boolean };
  const PAGE_SIZE = 25;

  let rows = $state<Customer[]>([]),
    meta = $state<PageMeta>({ total: 0, page: 1, pageSize: PAGE_SIZE }),
    loading = $state(true),
    problem = $state(""),
    search = $state(""),
    category = $state(""),
    status = $state(""),
    assignedTo = $state(""),
    branchId = $state(""),
    followUpDue = $state(false),
    categories = $state<string[]>([]),
    staff = $state<Staff[]>([]),
    branches = $state<Branch[]>([]),
    adding = $state(false),
    exporting = $state(false),
    exportProblem = $state("");
  let timer: ReturnType<typeof setTimeout> | undefined;
  // Only the answer to the latest request is shown, however they arrive.
  let ticket = 0;

  const may = (permission: string) => $officePermissions.has(permission);
  // An employee only has their own customers, so "given to" means nothing to them.
  let showPeople = $derived($officeMe?.role !== "EMPLOYEE");
  let filtered = $derived(!!(search.trim() || category || status || assignedTo || branchId || followUpDue));

  function query(target: number) {
    const params = new URLSearchParams({ page: String(target), pageSize: String(PAGE_SIZE) });
    if (search.trim()) params.set("search", search.trim());
    if (category) params.set("category", category);
    if (status) params.set("status", status);
    if (assignedTo) params.set("assignedTo", assignedTo);
    if (branchId) params.set("branchId", branchId);
    if (followUpDue) params.set("followUp", "due");
    return params.toString();
  }

  async function load(target = 1) {
    const mine = ++ticket;
    loading = true;
    problem = "";
    try {
      const result = await apiPage<Customer>(`/office/customers?${query(target)}`);
      if (mine !== ticket) return;
      rows = result.rows;
      meta = result.meta;
    } catch (e) {
      if (mine !== ticket) return;
      rows = [];
      problem = problemText(e, "The customers could not be loaded");
    } finally {
      if (mine === ticket) loading = false;
    }
  }

  // Waits until typing stops before searching.
  function searched() {
    clearTimeout(timer);
    timer = setTimeout(() => load(1), 300);
  }

  function clearFilters() {
    search = category = status = assignedTo = branchId = "";
    followUpDue = false;
    load(1);
  }

  onMount(() => {
    load();
    api<string[]>("/office/lookups/customer-category").then((list) => (categories = list)).catch(() => (categories = []));
    api<Staff[]>("/office/staff").then((list) => (staff = list)).catch(() => (staff = []));
    api<Branch[]>("/office/branches").then((list) => (branches = list)).catch(() => (branches = []));
    // Arriving from "New customer" elsewhere (the dashboard, a quick link).
    if (page.url.searchParams.get("new") === "1" && may("customers.create")) adding = true;
    if (page.url.search) goto("/admin/customers", { replaceState: true, noScroll: true, keepFocus: true });
    return () => clearTimeout(timer);
  });

  // The whole row opens the customer; the link in the first cell does the
  // same for keyboard users, and other links in the row keep their own job.
  function openRow(event: MouseEvent, customer: Customer) {
    if ((event.target as HTMLElement).closest("a, button")) return;
    goto(`/admin/customers/${customer.id}`);
  }

  async function exportCsv() {
    exporting = true;
    exportProblem = "";
    try {
      await downloadFile("/office/customers/export.csv", `bengal-port-customers-${today()}.csv`);
      toasts.show("Customer list downloaded");
    } catch (e) {
      exportProblem = problemText(e, "The customer list could not be downloaded");
    } finally {
      exporting = false;
    }
  }

  const counts = (customer: Customer) => {
    const deals = customer._count?.deals ?? 0;
    const invoices = customer._count?.invoices ?? 0;
    return deals || invoices ? `${plural(deals, "deal")} · ${plural(invoices, "invoice")}` : "—";
  };
</script>

<svelte:head><title>Customers — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office</span>
      <h1>Customers</h1>
      <p>Everyone the office works with, from the first enquiry onwards. Open a customer to see their calls, deals, invoices, payments and documents.</p>
    </div>
    <div class="o-actions">
      {#if may("customers.export")}
        <button class="o-btn ghost" disabled={exporting} onclick={exportCsv}><Download size={18} /> {exporting ? "Preparing…" : "Export CSV"}</button>
      {/if}
      {#if may("customers.create")}
        <button class="o-btn" onclick={() => (adding = true)}><Plus size={18} /> New customer</button>
      {/if}
      {#if exportProblem}<p class="o-error head-error" role="alert" use:intoView={exportProblem}>{exportProblem}</p>{/if}
    </div>
  </header>

  <div class="o-toolbar">
    <label class="o-search">
      <Search size={17} />
      <span class="o-sr">Search customers</span>
      <input type="search" bind:value={search} oninput={searched} placeholder="Name, C-number, phone or email" autocomplete="off" />
    </label>
    <label>
      <span class="o-sr">Category</span>
      <select class="o-select" bind:value={category} onchange={() => load(1)}>
        <option value="">All categories</option>
        {#each categories as item (item)}<option value={item}>{item}</option>{/each}
      </select>
    </label>
    <label>
      <span class="o-sr">Status</span>
      <select class="o-select" bind:value={status} onchange={() => load(1)}>
        <option value="">Any status</option>
        {#each CUSTOMER_STATUSES as item (item.value)}<option value={item.value}>{item.label}</option>{/each}
      </select>
    </label>
    {#if showPeople}
      <label>
        <span class="o-sr">Given to</span>
        <select class="o-select" bind:value={assignedTo} onchange={() => load(1)}>
          <option value="">Given to anyone</option>
          <option value="none">Not given to anyone</option>
          {#each staff as person (person.id)}<option value={person.id}>{person.name}</option>{/each}
        </select>
      </label>
    {/if}
    {#if branches.length > 1}
      <label>
        <span class="o-sr">Branch</span>
        <select class="o-select" bind:value={branchId} onchange={() => load(1)}>
          <option value="">All branches</option>
          {#each branches as branch (branch.id)}<option value={branch.id}>{branch.name}</option>{/each}
        </select>
      </label>
    {/if}
    <button class="o-btn ghost toggle" class:on={followUpDue} aria-pressed={followUpDue} onclick={() => { followUpDue = !followUpDue; load(1); }}>
      <BellRing size={16} /> Follow-up due
    </button>
  </div>

  {#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}

  {#if loading && !rows.length}
    <p class="o-loading">Loading customers…</p>
  {:else if !rows.length && !problem}
    <div class="o-card o-empty">
      <UsersRound size={28} />
      {#if filtered}
        <h3>No customer matches</h3>
        <p>Try fewer words or another filter.</p>
        <button class="o-btn ghost small" onclick={clearFilters}>Clear the filters</button>
      {:else}
        <h3>No customers yet</h3>
        <p>{may("customers.create") ? "Add the first with “New customer”. Website applications can also be turned into customers." : "Customers given to you will show here."}</p>
      {/if}
    </div>
  {:else if rows.length}
    <div class="o-table-wrap" class:busy={loading} aria-busy={loading}>
      <table class="o-table">
        <thead>
          <tr><th>Customer</th><th>Phone</th><th>Category</th><th>Lead source</th><th>Status</th>{#if showPeople}<th>Given to</th>{/if}<th>Next follow-up</th><th>Deals and invoices</th></tr>
        </thead>
        <tbody>
          {#each rows as customer (customer.id)}
            {@const follow = followUpState(customer.nextFollowUpAt)}
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
            <tr class="clickable" onclick={(event) => openRow(event, customer)}>
              <td class="lead" data-label="Customer">
                <a class="o-link name" href={`/admin/customers/${customer.id}`}>{customer.name}</a>
                <small>{customer.customerCode}{customer.branch && branches.length > 1 ? ` · ${customer.branch.name}` : ""}</small>
              </td>
              <td data-label="Phone">
                {customer.phone}
                {#if customer.whatsapp && customer.whatsapp !== customer.phone}<small>WhatsApp {customer.whatsapp}</small>{/if}
              </td>
              <td data-label="Category">{customer.category ?? "—"}</td>
              <td data-label="Lead source">{customer.leadSource ?? "—"}</td>
              <td data-label="Status"><StatusPill status={customer.status} /></td>
              {#if showPeople}<td data-label="Given to">{customer.assignedTo?.name ?? "—"}</td>{/if}
              <td data-label="Next follow-up">
                <span class:late={follow === "late"} class:due-today={follow === "today"}>{customer.nextFollowUpAt ? day(customer.nextFollowUpAt) : "—"}</span>
                {#if follow === "late"}<small class="late">Overdue</small>{:else if follow === "today"}<small class="due-today">Today</small>{/if}
              </td>
              <td data-label="Deals and invoices">{counts(customer)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>

    <nav class="pager" aria-label="Pages of customers">
      <button class="o-btn ghost small" disabled={loading || meta.page <= 1} onclick={() => load(meta.page - 1)}><ChevronLeft size={16} /> Previous</button>
      <span aria-live="polite">{pageSummary(meta).replace(/^Showing /, "")}</span>
      <button class="o-btn ghost small" disabled={loading || meta.page >= lastPage(meta)} onclick={() => load(meta.page + 1)}>Next <ChevronRight size={16} /></button>
    </nav>
  {/if}
</div>

{#if adding}
  <CustomerForm onclose={() => (adding = false)} onsaved={(saved) => goto(`/admin/customers/${saved.id}`)} />
{/if}

<style>
  .head-error { flex: 1 1 100%; }
  /* Every button stays at least 40px tall, for fingers. */
  .o-btn.small { min-height: 2.5rem; }
  .toggle { min-height: 2.6rem; }
  .toggle.on { background: #07182f; color: #fff; box-shadow: none; }
  .name { font-size: 0.95rem; }
  .late { color: #a3302a; font-weight: 750; }
  .due-today { color: #7c5a12; font-weight: 750; }
  .busy { opacity: 0.6; transition: opacity 150ms ease; }
  .pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem; margin-top: 1rem; color: #607083; font-size: 0.86rem; }
  .pager .o-btn { min-height: 2.6rem; }
  @media (hover: hover) and (pointer: fine) { .toggle.on:hover { background: #17304f; } }
  @media (max-width: 48rem) {
    .o-toolbar > label:not(.o-search) { flex: 1 1 calc(50% - 0.3rem); }
    .o-toolbar .o-select { width: 100%; }
    .toggle { flex: 1 1 100%; }
  }
  @media (prefers-reduced-motion: reduce) { .busy { transition: none; } }
</style>
