<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { day, money, officePermissions } from "$lib/office";
  import { paymentPill, toTaka, type ExchangeRate, type MoneyAccount, type OfficePayment } from "$lib/finance";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import type { PickedCustomer } from "$lib/components/OfficeCustomerPicker.svelte";
  import MoneyAccountsStrip from "$lib/components/finance/MoneyAccountsStrip.svelte";
  import RecordPayment from "$lib/components/finance/RecordPayment.svelte";
  import PaymentDetails from "$lib/components/finance/PaymentDetails.svelte";
  import { Landmark, Plus, Search, X } from "lucide-svelte";

  // Collections: money received from customers at the office, in any
  // currency, and where it went: invoices paid, advances kept, refunds.
  // ?customer=ID shows one customer's payments; ?new=1 (with ?customer= and
  // ?invoice=) opens "Record payment" ready for that customer and invoice.
  const FALLBACK_CURRENCIES = ["BDT", "USD", "EUR", "GBP", "MYR"];

  let rows = $state<OfficePayment[]>([]),
    accounts = $state<MoneyAccount[]>([]),
    currencies = $state<string[]>(FALLBACK_CURRENCIES),
    rates = $state<ExchangeRate[]>([]),
    loading = $state(true),
    problem = $state(""),
    search = $state(""),
    customerName = $state(""),
    selected = $state<OfficePayment | null>(null),
    recording = $state<{ customer: PickedCustomer | null; invoiceId: string | null } | null>(null);

  const may = (permission: string) => $officePermissions.has(permission);
  let customerId = $derived(page.url.searchParams.get("customer") ?? "");
  let timer: ReturnType<typeof setTimeout> | undefined;
  let asked = 0;

  async function load() {
    const ask = ++asked;
    loading = true;
    problem = "";
    const query = new URLSearchParams();
    if (customerId) query.set("customerId", customerId);
    if (search.trim()) query.set("search", search.trim());
    try {
      const list = await api<OfficePayment[]>(`/office/payments?${query}`);
      if (ask !== asked) return;
      rows = list;
      // Keep the open payment up to date after a change.
      if (selected) selected = list.find((row) => row.id === selected!.id) ?? selected;
    } catch (e) {
      if (ask !== asked) return;
      rows = [];
      problem = problemText(e, "The payments could not be loaded");
    } finally {
      if (ask === asked) loading = false;
    }
  }

  function loadAccounts() {
    api<MoneyAccount[]>("/office/money-accounts").then((list) => (accounts = list)).catch(() => (accounts = []));
  }

  onMount(() => {
    loadAccounts();
    api<{ currencies?: string[] }>("/office/settings").then((settings) => (currencies = settings?.currencies?.length ? settings.currencies : FALLBACK_CURRENCIES)).catch(() => {});
    api<ExchangeRate[]>("/office/exchange-rates").then((list) => (rates = list)).catch(() => (rates = []));
  });

  // The list follows the address: a customer's payments, or everyone's.
  // Only the customer in the address counts here; typing in the search box
  // waits for a pause in typing.
  $effect(() => {
    customerId;
    untrack(() => {
      load();
      findCustomerName();
    });
  });

  // The chip shows the customer's name, not their id.
  async function findCustomerName() {
    customerName = "";
    if (!customerId) return;
    try {
      customerName = (await api<{ name: string }>(`/office/customers/${customerId}`)).name;
    } catch {
      // Without access to the customer list, their payments still carry the name.
      customerName = "";
    }
  }
  let chipName = $derived(customerName || rows.find((row) => row.customer?.id === customerId)?.customer?.name || "chosen customer");

  // ?new=1 opens the form once, then the address is tidied so a reload does not open it again.
  $effect(() => {
    const params = page.url.searchParams;
    if (params.get("new") !== "1" || !may("payments.create")) return;
    const id = params.get("customer"), invoiceId = params.get("invoice");
    const next = new URLSearchParams(params);
    next.delete("new");
    next.delete("invoice");
    untrack(() => {
      openRecord(id, invoiceId);
      goto(`/admin/collections${next.toString() ? `?${next}` : ""}`, { replaceState: true, noScroll: true, keepFocus: true });
    });
  });

  async function openRecord(id: string | null = null, invoiceId: string | null = null) {
    let customer: PickedCustomer | null = null;
    if (id) {
      try {
        customer = await api<PickedCustomer>(`/office/customers/${id}`);
      } catch {
        const known = rows.find((row) => row.customer?.id === id)?.customer;
        customer = known ? { id: known.id, name: known.name, customerCode: known.customerCode } : null;
      }
    }
    recording = { customer, invoiceId };
  }

  function typed() {
    clearTimeout(timer);
    timer = setTimeout(load, 300);
  }

  function clearCustomer() {
    goto("/admin/collections", { noScroll: true, keepFocus: true });
  }

  function changed(next?: OfficePayment) {
    if (next) selected = next;
    load();
    loadAccounts();
  }
</script>

<svelte:head><title>Collections — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office</span>
      <h1>Collections</h1>
      <p>Money received from customers: cash, bank, bKash, Nagad, card or cheque, in any currency. Each payment pays invoices or waits as the customer's advance.</p>
    </div>
    {#if may("payments.create")}
      <div class="o-actions"><button class="o-btn" onclick={() => openRecord(customerId || null)}><Plus size={18} /> Record payment</button></div>
    {/if}
  </header>

  <MoneyAccountsStrip {accounts} />

  <div class="o-toolbar">
    <label class="o-search">
      <Search size={17} />
      <input bind:value={search} oninput={typed} placeholder="Customer name, transaction ID or what it was for" aria-label="Search payments" />
    </label>
    {#if customerId}
      <span class="chip">
        Customer: <b>{chipName}</b>
        <button type="button" onclick={clearCustomer} aria-label="Show every customer's payments"><X size={15} /></button>
      </span>
    {/if}
  </div>

  {#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}

  {#if loading && !rows.length}
    <p class="o-loading">Loading payments…</p>
  {:else if !rows.length && !problem}
    <div class="o-card o-empty">
      <Landmark size={28} />
      <h3>{search || customerId ? "No payments match" : "No payments yet"}</h3>
      <p>{may("payments.create") ? "When a customer pays at the office, add it with “Record payment”. It goes into the books and the customer gets a receipt." : "Payments received will show here."}</p>
    </div>
  {:else if rows.length}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead>
          <tr><th>Date</th><th>Receipt</th><th>Customer</th><th>Paid by</th><th class="num">Amount</th><th>Applied to</th><th class="num">Advance left</th><th class="num">Refunded</th><th>Status</th><th><span class="o-sr">Actions</span></th></tr>
        </thead>
        <tbody>
          {#each rows as row (row.id)}
            {@const pill = paymentPill(row)}
            <!-- The whole row opens the payment for a mouse or a finger; the Details button does it from the keyboard. -->
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
            <tr class="clickable" onclick={(event) => { if (!(event.target as HTMLElement).closest("a, button")) selected = row; }}>
              <td class="lead" data-label="Date"><b>{day(row.paidAt)}</b><small>{row.transactionId}</small></td>
              <td data-label="Receipt">{#if row.receiptNumber}<a class="o-link" href={`/receipt/${encodeURIComponent(row.receiptNumber)}`} target="_blank" rel="noopener">{row.receiptNumber}</a>{:else}—{/if}</td>
              <td data-label="Customer">{#if row.customer}<a class="o-link" href={`/admin/customers/${row.customer.id}`}>{row.customer.name}</a><small>{row.customer.customerCode}</small>{:else}<span class="o-muted">Not linked</span>{/if}</td>
              <td data-label="Paid by">{row.method ?? "—"}</td>
              <td class="num" data-label="Amount"><b>{money(row.amount, row.currency)}</b>{#if row.currency !== "BDT"}<small>≈ {money(toTaka(row.amount, row.exchangeRate))}</small>{/if}</td>
              <td data-label="Applied to">{row.allocations.length ? row.allocations.map((item) => item.number ?? "Invoice").join(", ") : "—"}</td>
              <td class="num" data-label="Advance left">{row.unallocated > 0 ? money(row.unallocated, row.currency) : "—"}</td>
              <td class="num" data-label="Refunded">{row.refunded > 0 ? money(row.refunded, row.currency) : "—"}</td>
              <td data-label="Status"><StatusPill status={pill.status} label={pill.label} /></td>
              <td data-label="" class="row-actions"><button class="o-btn ghost small" onclick={() => (selected = row)} aria-label={`Details of the payment of ${money(row.amount, row.currency)} on ${day(row.paidAt)}`}>Details</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if rows.length >= 200}<p class="o-muted more">Showing the latest 200. Search to find older payments.</p>{/if}
  {/if}
</div>

{#if selected}
  <PaymentDetails payment={selected} onclose={() => (selected = null)} onchanged={changed} />
{/if}

{#if recording}
  <RecordPayment
    startCustomer={recording.customer}
    startInvoiceId={recording.invoiceId}
    {accounts}
    {currencies}
    {rates}
    onclose={() => (recording = null)}
    onsaved={() => { load(); loadAccounts(); }}
  />
{/if}

<style>
  .chip { display: inline-flex; align-items: center; gap: 0.4rem; min-height: 2.6rem; padding: 0.3rem 0.4rem 0.3rem 0.85rem; border: 1px solid #e2d3ad; border-radius: 2rem; background: #fdf9ef; color: #6f5418; font-size: 0.85rem; }
  .chip b { color: #07182f; }
  .chip button { display: grid; place-items: center; width: 2.1rem; height: 2.1rem; border: 0; border-radius: 50%; background: #fff; color: #6f5418; cursor: pointer; }
  .chip button:focus-visible { outline: 3px solid #d19b2d; outline-offset: 2px; }
  .row-actions { text-align: right; white-space: nowrap; }
  .more { margin: 0.8rem 0 0; font-size: 0.84rem; }
  @media (max-width: 48rem) {
    .row-actions { justify-content: flex-end; }
  }
</style>
