<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api, apiPage } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { day, money, officePermissions } from "$lib/office";
  import {
    blankDraft,
    customerCodeText,
    dealNumberOf,
    draftForCustomer,
    draftFromApplication,
    draftFromInvoice,
    INVOICE_TABS,
    invoiceListQuery,
    invoicesForTab,
    statusLabel,
    type Invoice,
    type InvoiceCustomer,
    type InvoiceDraft,
    type InvoiceTab,
  } from "$lib/invoices";
  import { lastPage, type PageMeta } from "$lib/pagination";
  import InvoiceEditor from "$lib/components/InvoiceEditor.svelte";
  import InvoiceActions from "$lib/components/deals/InvoiceActions.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import { FileText, MoreHorizontal, Plus, Printer, Search, X } from "lucide-svelte";

  // Every invoice: drafts still being prepared, issued ones waiting for
  // payment, paid, overdue and cancelled ones. Issued invoices are never
  // changed in place: a change is a new version, a credit note or a cancellation.
  const PAGE_SIZE = 25;
  const params = page.url.searchParams;
  const startTab = params.get("tab");
  let tab = $state<InvoiceTab>(INVOICE_TABS.some((item) => item.key === startTab) ? (startTab as InvoiceTab) : "all"),
    search = $state(""),
    customerId = $state(params.get("customer") ?? ""),
    customerName = $state(""),
    fetched = $state<Invoice[]>([]),
    meta = $state<PageMeta>({ total: 0, page: 1, pageSize: PAGE_SIZE }),
    loading = $state(true),
    problem = $state(""),
    draft = $state<InvoiceDraft | null>(null),
    chosen = $state<Invoice | null>(null);
  let timer: ReturnType<typeof setTimeout>;

  const may = (permission: string) => $officePermissions.has(permission);
  let picking = $derived(Boolean(INVOICE_TABS.find((item) => item.key === tab)?.status));
  let rows = $derived(invoicesForTab(tab, fetched));

  // Only the latest request counts, so a slow earlier search cannot replace a newer one.
  let latest = 0;
  async function load(target = 1) {
    const ticket = ++latest;
    loading = true;
    problem = "";
    try {
      const result = await apiPage<Invoice>(invoiceListQuery(tab, { search, customerId, page: target, pageSize: PAGE_SIZE }));
      if (ticket !== latest) return;
      fetched = result.rows;
      meta = result.meta;
      if (customerId && !customerName) customerName = result.rows.find((row) => row.customer?.id === customerId)?.customer?.name ?? "";
    } catch (e) {
      if (ticket !== latest) return;
      fetched = [];
      problem = problemText(e, "The invoices could not be loaded");
    } finally {
      if (ticket === latest) loading = false;
    }
  }

  function choose(next: InvoiceTab) {
    tab = next;
    load(1);
  }

  function searched() {
    clearTimeout(timer);
    timer = setTimeout(() => load(1), 250);
  }

  async function customerOf(id: string): Promise<InvoiceCustomer | null> {
    try {
      return await api<InvoiceCustomer>(`/office/customers/${id}`);
    } catch {
      return null;
    }
  }

  async function openEditor(id: string) {
    problem = "";
    try {
      const invoice = await api<Invoice>(`/admin/invoices/${id}`);
      if (invoice.state === "CANCELLED" || invoice.state === "REFUNDED") {
        problem = `${invoice.number} is ${statusLabel(invoice.status).toLowerCase()}, so it cannot be changed. It is kept as it was for the accounts.`;
        return;
      }
      draft = draftFromInvoice(invoice);
    } catch (e) {
      problem = problemText(e, "That invoice could not be opened");
    }
  }

  // Arriving from an application's details.
  async function startFromApplication(id: string) {
    try {
      const [application, owing] = await Promise.all([
        api<any>(`/admin/resources/applications/${id}`),
        api<{ amountDue: number | null; paid: number }>(`/payments/application/${id}`),
      ]);
      draft = draftFromApplication(application, owing);
    } catch (e) {
      problem = problemText(e, "That application could not be read");
    }
  }

  // Arriving from a customer's page with "New invoice".
  async function startForCustomer(id: string) {
    const customer = await customerOf(id);
    if (customer) customerName = customer.name;
    draft = customer ? draftForCustomer(customer) : blankDraft();
  }

  onMount(() => {
    load();
    if (customerId) customerOf(customerId).then((found) => found && (customerName = found.name));
    const from = params.get("application");
    const edit = params.get("edit");
    if (from) startFromApplication(from);
    else if (edit) openEditor(edit);
    else if (params.get("new") === "1" && may("invoices.create")) {
      if (customerId) startForCustomer(customerId);
      else draft = blankDraft();
    }
  });

  // Once a form is done with, the address keeps only the customer filter.
  function tidyAddress() {
    if (!["application", "edit", "new"].some((key) => page.url.searchParams.has(key))) return;
    goto(customerId ? `/admin/accounts/invoices?customer=${encodeURIComponent(customerId)}` : "/admin/accounts/invoices", { replaceState: true, noScroll: true, keepFocus: true });
  }

  function closeEditor() {
    draft = null;
    tidyAddress();
  }

  // A saved draft goes back to the list; an issued or revised invoice opens
  // on the letterhead, ready to print or share.
  function saved(invoice: Invoice) {
    const wasRevision = draft?.state === "ISSUED";
    draft = null;
    if (invoice.state === "DRAFT") {
      toasts.show(`Draft ${invoice.number} saved`);
      tidyAddress();
      load(meta.page);
      return;
    }
    toasts.show(wasRevision ? `${invoice.number} saved as version ${invoice.version}` : `${invoice.number} issued`);
    goto(`/admin/print/invoice/${invoice.id}`);
  }

  function clearCustomer() {
    customerId = "";
    customerName = "";
    goto("/admin/accounts/invoices", { replaceState: true, noScroll: true, keepFocus: true });
    load(1);
  }

  function edit(invoice: Invoice) {
    chosen = null;
    openEditor(invoice.id);
  }

  let pageText = $derived(
    picking
      ? `${rows.length} found among issued invoices ${(meta.page - 1) * meta.pageSize + 1}–${Math.min(meta.page * meta.pageSize, meta.total)} of ${meta.total}`
      : `${(meta.page - 1) * meta.pageSize + 1}–${Math.min(meta.page * meta.pageSize, meta.total)} of ${meta.total}`,
  );
</script>

<svelte:head><title>Invoices — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office · Accounts</span>
      <h1>Invoices</h1>
      <p>What each customer was billed, has paid and still owes. An issued invoice is never changed in place: a change becomes a new version, a credit note or a cancellation. Payments are recorded under Collections.</p>
    </div>
    {#if may("invoices.create")}
      <div class="o-actions">
        <button class="o-btn" onclick={() => (customerId ? startForCustomer(customerId) : (draft = blankDraft()))}><Plus size={18} /> New invoice</button>
      </div>
    {/if}
  </header>

  <nav class="o-tabs" aria-label="Which invoices">
    {#each INVOICE_TABS as item (item.key)}
      <button class:active={tab === item.key} aria-pressed={tab === item.key} onclick={() => choose(item.key)}>{item.label}</button>
    {/each}
  </nav>

  <div class="o-toolbar">
    <label class="o-search"><Search size={17} /><input bind:value={search} oninput={searched} placeholder="Invoice number, customer, phone or email" aria-label="Search invoices" /></label>
    {#if customerId}
      <span class="chip">
        Customer: <b>{customerName || "this customer"}</b>
        <button type="button" aria-label="Show every customer's invoices" onclick={clearCustomer}><X size={15} /></button>
      </span>
    {/if}
  </div>

  {#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}

  {#if loading}
    <p class="o-loading">Loading invoices…</p>
  {:else if !rows.length}
    <div class="o-card o-empty">
      <FileText size={28} />
      <h3>{search.trim() ? "No invoice matches that" : tab === "all" ? "No invoices yet" : `No ${INVOICE_TABS.find((item) => item.key === tab)?.label.toLowerCase()} invoices${picking && meta.page < lastPage(meta) ? " on this page" : ""}`}</h3>
      <p>{may("invoices.create") ? "Make one with “New invoice”, from a deal, from an income entry in Hisab Kitab, or from an application." : "Invoices will show here once they are made."}</p>
    </div>
  {:else}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th class="num">Total</th><th class="num">Paid</th><th class="num">Due</th><th>Status</th><th><span class="o-sr">Actions</span></th></tr></thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr>
              <td class="lead" data-label="Invoice">
                <a class="o-link" href={`/admin/print/invoice/${row.id}`}><b>{row.number}</b></a>{#if row.version > 1}<span class="version">v{row.version}</span>{/if}
                {#if row.deal}<small>{dealNumberOf(row.deal.number)} · {row.deal.title}</small>{:else if row.application}<small>{row.application.reference}</small>{/if}
              </td>
              <td data-label="Date">{day(row.issuedAt)}{#if row.dueAt}<small>Due {day(row.dueAt)}</small>{/if}</td>
              <td data-label="Customer">
                {#if row.customer}<a class="o-link" href={`/admin/customers/${row.customer.id}`}>{row.customerName}</a><small>{customerCodeText(row.customer.code)}</small>
                {:else}<b class="name">{row.customerName}</b>{#if row.customerPhone}<small>{row.customerPhone}</small>{/if}{/if}
              </td>
              <td class="num" data-label="Total">{money(row.total, row.currency)}</td>
              <td class="num" data-label="Paid">{money(row.paid, row.currency)}</td>
              <td class="num" data-label="Due"><b>{money(row.due, row.currency)}</b></td>
              <td data-label="Status"><StatusPill status={row.status} label={statusLabel(row.status)} /></td>
              <td data-label="" class="row-actions">
                <a class="o-btn ghost small" href={`/admin/print/invoice/${row.id}`} aria-label={`Open or print ${row.number}`}><Printer size={15} /> Open</a>
                <button class="o-btn ghost small" onclick={() => (chosen = row)} aria-label={`What to do with ${row.number}`}><MoreHorizontal size={15} /> Actions</button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}

  {#if !loading && meta.total > meta.pageSize}
    <nav class="pager" aria-label="Pages">
      <span>{pageText}</span>
      <button class="o-btn ghost small" disabled={meta.page <= 1 || loading} onclick={() => load(meta.page - 1)}>Previous</button>
      <span>Page {meta.page} of {lastPage(meta)}</span>
      <button class="o-btn ghost small" disabled={meta.page >= lastPage(meta) || loading} onclick={() => load(meta.page + 1)}>Next</button>
    </nav>
  {/if}
</div>

{#if chosen}
  <InvoiceActions invoice={chosen} onclose={() => (chosen = null)} onchanged={() => load(meta.page)} onedit={edit} onrevise={edit} />
{/if}

{#if draft}<InvoiceEditor {draft} onclose={closeEditor} onsaved={saved} />{/if}

<style>
  .chip { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 2.6rem; padding: 0 0.4rem 0 0.8rem; border: 1px solid #e2d3ad; border-radius: 0.65rem; background: #fdf9ef; color: #6f5418; font-size: 0.86rem; }
  .chip b { color: #07182f; overflow-wrap: anywhere; }
  .chip button { display: grid; place-items: center; width: 2.2rem; height: 2.2rem; border: 0; border-radius: 0.5rem; background: none; color: #6f5418; cursor: pointer; }
  .chip button:focus-visible { outline: 3px solid #d19b2d; outline-offset: 1px; }
  .version { margin-left: 0.4rem; padding: 0.05rem 0.4rem; border-radius: 0.4rem; background: #fbf1da; color: #7c5a12; font-size: 0.72rem; font-weight: 800; }
  .name { font-weight: 700; }
  .row-actions { text-align: right; white-space: nowrap; }
  .row-actions .o-btn + .o-btn { margin-left: 0.35rem; }
  .pager { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 0.6rem; margin-top: 0.9rem; font-size: 0.84rem; color: #6a7585; }
  .pager span:first-child { margin-right: auto; }
  @media (max-width: 48rem) {
    .row-actions { justify-content: flex-end; gap: 0.4rem; padding-top: 0.5rem !important; }
    .row-actions .o-btn { min-height: 2.6rem; flex: 1 1 auto; }
    .row-actions .o-btn + .o-btn { margin-left: 0; }
  }
</style>
