<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api, apiPage } from "$lib/api";
  import { shortDate } from "$lib/datetime";
  import InvoiceEditor from "$lib/components/InvoiceEditor.svelte";
  import {
    bdt,
    blankDraft,
    draftFromApplication,
    draftFromInvoice,
    statusLabel,
    type Invoice,
    type InvoiceDraft,
  } from "$lib/invoices";
  import { lastPage, pageSummary, type PageMeta } from "$lib/pagination";
  import { ArrowLeft, FileText, Pencil, Plus, Search, Trash2 } from "lucide-svelte";

  const PAGE_SIZE = 25;
  let rows = $state<Invoice[]>([]),
    meta = $state<PageMeta>({ total: 0, page: 1, pageSize: PAGE_SIZE }),
    loading = $state(true),
    notice = $state(""),
    search = $state(""),
    draft = $state<InvoiceDraft | null>(null);
  let timer: ReturnType<typeof setTimeout>;

  async function load(target = 1) {
    loading = true;
    try {
      const term = search.trim();
      const result = await apiPage<Invoice>(`/admin/invoices?page=${target}&pageSize=${PAGE_SIZE}${term ? `&search=${encodeURIComponent(term)}` : ""}`);
      rows = result.rows;
      meta = result.meta;
    } catch (e) {
      rows = [];
      notice = `The invoices could not be loaded: ${e instanceof Error ? e.message : "unknown error"}.`;
    } finally {
      loading = false;
    }
  }

  function searched() {
    clearTimeout(timer);
    timer = setTimeout(() => load(1), 250);
  }

  async function openEditor(id: string) {
    try {
      draft = draftFromInvoice(await api<Invoice>(`/admin/invoices/${id}`));
    } catch (e) {
      notice = `That invoice could not be opened: ${e instanceof Error ? e.message : "unknown error"}.`;
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
      notice = `That application could not be read: ${e instanceof Error ? e.message : "unknown error"}.`;
    }
  }

  onMount(() => {
    load();
    const from = page.url.searchParams.get("application");
    const edit = page.url.searchParams.get("edit");
    if (from) startFromApplication(from);
    else if (edit) openEditor(edit);
  });

  function closeEditor() {
    draft = null;
    if (page.url.search) goto("/admin/accounts/invoices", { replaceState: true, noScroll: true, keepFocus: true });
  }

  async function remove(row: Invoice) {
    if (!confirm(`Delete invoice ${row.number} for ${row.customerName}? This cannot be undone, and its number will not be used again.`)) return;
    try {
      await api(`/admin/invoices/${row.id}`, { method: "DELETE" });
      await load(meta.page);
    } catch (e) {
      notice = `Not deleted: ${e instanceof Error ? e.message : "please retry"}.`;
    }
  }
</script>

<svelte:head><title>Invoices — Bengal Port Admin</title></svelte:head>

<div class="invoices-shell">
  <header class="invoices-head">
    <div class="wrap head-row">
      <div class="title-row">
        <a href="/admin/accounts" aria-label="Back to Hisab Kitab"><ArrowLeft size={20} /></a>
        <div><span>ADMIN · HISAB KITAB</span><h1>Invoices</h1><p>What each customer was billed, has paid and still owes.</p></div>
      </div>
      <button class="generate" onclick={() => (draft = blankDraft())}><Plus size={19} /> Generate invoice</button>
    </div>
  </header>

  <main class="wrap workspace">
    <label class="search"><Search size={17} /><input bind:value={search} oninput={searched} placeholder="Search number, customer, phone or email" aria-label="Search invoices" /></label>
    {#if notice}<p class="notice" role="alert">{notice}</p>{/if}

    <section class="card">
      <table>
        <thead><tr><th>Invoice</th><th>Date</th><th>Customer</th><th class="money">Total</th><th class="money">Paid</th><th class="money">Due</th><th>Status</th><th><span class="sr">Actions</span></th></tr></thead>
        <tbody>
          {#each rows as row (row.id)}
            <tr>
              <td data-label="Invoice"><a class="number" href={`/admin/print/invoice/${row.id}`}>{row.number}</a>{#if row.application}<small>{row.application.reference}</small>{/if}</td>
              <td data-label="Date">{shortDate(row.issuedAt)}</td>
              <td data-label="Customer"><b>{row.customerName}</b>{#if row.customerPhone}<small>{row.customerPhone}</small>{/if}</td>
              <td data-label="Total" class="money">{bdt(row.total)}</td>
              <td data-label="Paid" class="money">{bdt(row.paid)}</td>
              <td data-label="Due" class="money"><b>{bdt(row.due)}</b></td>
              <td data-label="Status"><mark class={row.status.toLowerCase()}>{statusLabel(row.status)}</mark></td>
              <td class="actions">
                <a class="open" href={`/admin/print/invoice/${row.id}`}>Open / Print</a>
                <button aria-label={`Edit invoice ${row.number}`} onclick={() => openEditor(row.id)}><Pencil size={15} /></button>
                <button class="danger" aria-label={`Delete invoice ${row.number}`} onclick={() => remove(row)}><Trash2 size={15} /></button>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
      {#if loading}<div class="empty"><h2>Loading invoices…</h2></div>
      {:else if !rows.length}<div class="empty"><FileText size={28} /><h2>No invoices found</h2><p>Generate one here, from an income entry in Hisab Kitab, or from an application.</p></div>{/if}
      {#if meta.total > meta.pageSize}
        <nav class="pager" aria-label="Pages">
          <span>{pageSummary(meta)}</span>
          <button disabled={meta.page <= 1 || loading} onclick={() => load(meta.page - 1)}>Previous</button>
          <span>Page {meta.page} of {lastPage(meta)}</span>
          <button disabled={meta.page >= lastPage(meta) || loading} onclick={() => load(meta.page + 1)}>Next</button>
        </nav>
      {/if}
    </section>
  </main>
</div>

{#if draft}<InvoiceEditor {draft} onclose={closeEditor} onsaved={(invoice) => goto(`/admin/print/invoice/${invoice.id}`)} />{/if}

<style>
  .invoices-shell{min-height:100vh;background:#eef1f4;color:#12213a}
  .invoices-head{padding:34px 0 32px;background:#07182f;color:#fff;box-shadow:inset 0 -3px #c9952d}
  .head-row,.title-row{display:flex;align-items:center}
  .head-row{justify-content:space-between;gap:1rem}
  .title-row{gap:20px;min-width:0}
  .title-row>a{flex:none;display:grid;place-items:center;width:42px;height:42px;border-radius:50%;background:#ffffff12;color:#fff}
  .title-row span{font-size:11px;font-weight:800;letter-spacing:.14em;color:#d8ae4a}
  h1{margin:5px 0 4px;font-size:34px;letter-spacing:-.025em}
  .title-row p{margin:0;color:#c4ceda;font-size:14px}
  .generate{display:flex;align-items:center;gap:9px;padding:13px 18px;border:0;border-radius:10px;background:#d19b2d;color:#07182f;font-weight:800;cursor:pointer;white-space:nowrap}
  .workspace{padding:24px 0 90px}
  .search{display:flex;align-items:center;gap:8px;max-width:26rem;padding:0 12px;margin-bottom:14px;border:1px solid #d8dde2;border-radius:9px;background:#fff}
  .search input{flex:1;min-width:0;border:0;outline:0;padding:10px 0;background:none}
  .notice{padding:11px 14px;margin:0 0 14px;border:1px solid #ead39d;border-radius:9px;background:#fff8e8;color:#6c5522;font-size:13px}
  .card{background:#fff;border-radius:14px;overflow:hidden;container-type:inline-size}
  table{width:100%;border-collapse:collapse}
  th{padding:12px 16px;background:#f6f7f8;font-size:11px;letter-spacing:.08em;text-align:left;color:#6c7684;white-space:nowrap}
  td{padding:14px 16px;border-bottom:1px solid #eaedf0;font-size:13px;vertical-align:middle}
  td small{display:block;margin-top:3px;color:#6f7a88}
  .number{font-weight:800;color:#0a2344}
  .money{text-align:right;white-space:nowrap}
  mark{display:inline-block;padding:4px 9px;border-radius:999px;font-size:11px;font-weight:800;white-space:nowrap}
  mark.paid{background:#e4f5ed;color:#17704b}
  mark.partially_paid{background:#fbf1da;color:#7c5a12}
  mark.due{background:#fdeaea;color:#a83a32}
  .actions{white-space:nowrap;text-align:right}
  .actions .open{display:inline-block;text-decoration:none;padding:8px 11px;border:1px solid #dfe5ea;border-radius:8px;color:#17304f;font-size:12px;font-weight:750}
  .actions button{display:inline-grid;place-items:center;width:2.25rem;height:2.25rem;margin-left:.3rem;border:1px solid #dfe5ea;border-radius:8px;background:#fff;color:#35495d;vertical-align:middle;cursor:pointer}
  .actions button.danger{border-color:#eadada;color:#a84747}
  .empty{padding:50px 20px;text-align:center;color:#74808f}
  .empty h2{margin:10px 0 5px;font-size:17px;color:#24344a}
  .empty p{margin:0}
  .pager{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:10px;padding:12px 16px;font-size:12px;color:#6a7585}
  .pager span:first-child{margin-right:auto}
  .pager button{padding:7px 12px;border:1px solid #d8dde2;border-radius:7px;background:#fff;font-weight:700;cursor:pointer}
  .pager button:disabled{opacity:.5;cursor:not-allowed}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
  @media(hover:hover) and (pointer:fine){.actions button:hover,.actions .open:hover{background:#f4f6f8}}
  @media(max-width:58rem){.search input{font-size:16px}}
  @media(max-width:700px){
    .head-row{flex-direction:column;align-items:flex-start;gap:18px}
    .generate{width:100%;justify-content:center}
    h1{font-size:28px}
    .workspace{width:min(94vw,1380px)}
  }
  @container (max-width:50rem){
    table,tbody,tr,td{display:block}
    thead{display:none}
    tr{padding:12px 16px;border-bottom:1px solid #eaedf0}
    td{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:5px 0;border:0;text-align:right}
    td::before{content:attr(data-label);flex:none;font-size:11px;font-weight:700;letter-spacing:.04em;color:#6c7684}
    td small{display:inline;margin:0 0 0 .4rem}
    td.actions{justify-content:flex-end;align-items:center;padding-top:8px}
    td.actions::before{content:none}
    .actions .open{margin-right:auto}
  }
</style>
