<script lang="ts">
  import { untrack } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { confirmAction } from "$lib/confirm";
  import { toasts } from "$lib/toast";
  import { day, money, officePermissions, statusText } from "$lib/office";
  import { followUpState, invoiceCounts, paymentCounts, telLink, totalsByCurrency, whatsappLink, type Activity, type Customer } from "$lib/crm";
  import { categoryLabel, daysLeft, expiryText, expiryTone, type Verification } from "$lib/office-documents";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import CustomerForm from "$lib/components/customers/CustomerForm.svelte";
  import CustomerActivity from "$lib/components/customers/CustomerActivity.svelte";
  import CustomerTasks, { type CustomerTask } from "$lib/components/customers/CustomerTasks.svelte";
  import { ArrowLeft, FilePlus2, FileText, FolderLock, Handshake, Mail, MessageCircle, Pencil, Phone, Plus, ReceiptText, Trash2, Wallet } from "lucide-svelte";

  // One customer's page: who they are, every contact with them, what they
  // have to do next, and their deals, invoices, payments, documents and
  // website applications. Each button shows only for roles that may use it.
  type Deal = { id: string; dealNumber: string; title: string; status: string; total: number | null; recognized: number | null; currency: string };
  type Invoice = { id: string; number: string; issuedAt: string | null; dueAt: string | null; currency: string; total?: number; paid?: number; credited?: number; due?: number; status: string };
  type Payment = { id: string; amount: number; currency: string; method: string | null; status: string; paidAt: string; receiptNumber: string | null; allocated: number };
  type Application = { id: string; reference: string; type: string; status: string; amountDue: number | string | null; createdAt: string };
  type CustomerDocument = { id: string; name: string; docType: string; category: string; expiryDate: string | null; verification: Verification };
  type Profile = Customer & {
    activities: Activity[];
    tasks: CustomerTask[];
    deals: Deal[];
    invoices: Invoice[];
    payments: Payment[];
    applications: Application[];
    documents: CustomerDocument[];
    summary: { invoiced: number; paid: number; due: number } | null;
  };

  const TABS = [
    { key: "overview", label: "Overview" },
    { key: "activity", label: "Activity" },
    { key: "tasks", label: "Tasks & follow-ups" },
    { key: "deals", label: "Deals" },
    { key: "money", label: "Invoices & payments" },
    { key: "documents", label: "Documents" },
    { key: "applications", label: "Applications" },
  ] as const;
  type TabKey = (typeof TABS)[number]["key"];

  const readTab = (): TabKey => {
    const wanted = page.url.searchParams.get("tab");
    return TABS.some((item) => item.key === wanted) ? (wanted as TabKey) : "overview";
  };

  let customer = $state<Profile | null>(null),
    loading = $state(true),
    problem = $state(""),
    editing = $state(false),
    actionProblem = $state(""),
    deleting = $state(false),
    tab = $state<TabKey>(readTab());

  const may = (permission: string) => $officePermissions.has(permission);
  let id = $derived(page.params.id ?? "");
  // Documents are listed only for roles that may see them.
  let tabs = $derived(TABS.filter((item) => item.key !== "documents" || may("documents.read")));
  let openTasks = $derived(customer?.tasks.filter((task) => task.status === "OPEN").length ?? 0);
  let counts = $derived<Record<TabKey, number | null>>({
    overview: null,
    activity: null,
    tasks: openTasks || null,
    deals: customer?.deals.length || null,
    money: customer ? customer.invoices.length + customer.payments.length || null : null,
    documents: customer?.documents.length || null,
    applications: customer?.applications.length || null,
  });
  let invoiceTotals = $derived(totalsByCurrency((customer?.invoices ?? []).filter((row) => invoiceCounts(row.status)), ["total", "paid", "due"]));
  let paymentTotals = $derived(totalsByCurrency((customer?.payments ?? []).filter((row) => paymentCounts(row.status)), ["amount", "allocated"]));
  let figures = $derived(!!customer?.invoices.some((row) => row.total !== undefined));
  let chat = $derived(customer ? whatsappLink(customer.whatsapp || customer.phone) : null);
  let call = $derived(customer ? telLink(customer.phone) : null);

  async function load(target: string, quiet = false) {
    if (!quiet) loading = true;
    problem = "";
    try {
      const found = await api<Profile>(`/office/customers/${target}`);
      if (target === id) customer = found;
    } catch (e) {
      if (target !== id) return;
      if (!quiet) customer = null;
      problem = problemText(e, "This customer could not be loaded");
    } finally {
      if (target === id) loading = false;
    }
  }
  const reload = () => load(id, true);

  // A link to another customer (from the "already a customer?" hint) keeps
  // this page open, so the customer is loaded afresh whenever the address changes.
  $effect(() => {
    const current = id;
    untrack(() => {
      editing = false;
      actionProblem = "";
      customer = null;
      tab = readTab();
      load(current);
    });
  });

  // The open tab is kept in the address, so going back or sharing the link
  // lands on the same tab.
  function choose(next: TabKey) {
    tab = next;
    const url = new URL(page.url);
    if (next === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    goto(`${url.pathname}${url.search}`, { replaceState: true, noScroll: true, keepFocus: true });
  }

  async function remove() {
    if (!customer) return;
    const ok = await confirmAction({
      title: `Delete ${customer.name}?`,
      message: "Their contact history is removed. Their tasks and documents stay, without a customer. This cannot be undone.",
      confirmLabel: "Delete customer",
    });
    if (!ok) return;
    deleting = true;
    actionProblem = "";
    try {
      await api(`/office/customers/${customer.id}`, { method: "DELETE" });
      toasts.show(`${customer.name} deleted`);
      goto("/admin/customers");
    } catch (e) {
      actionProblem = problemText(e, "The customer was not deleted");
    } finally {
      deleting = false;
    }
  }

  const passportText = (value: string | null) => (value === "Hidden" ? "Hidden — needs passport permission" : value || "Not recorded");
</script>

<svelte:head><title>{customer ? `${customer.name} (${customer.customerCode})` : "Customer"} — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <a class="o-link back" href="/admin/customers"><ArrowLeft size={16} /> All customers</a>

  {#if loading && !customer}
    <p class="o-loading">Loading the customer…</p>
  {:else if !customer}
    <div class="o-card o-empty">
      <h3>This customer could not be opened</h3>
      <p>{problem || "They may have been deleted, or be given to someone else."}</p>
      <a class="o-btn ghost small" href="/admin/customers">Back to the customer list</a>
    </div>
  {:else}
    {@const follow = followUpState(customer.nextFollowUpAt)}
    <header class="o-head">
      <div>
        <span class="o-kicker">Customer · {customer.customerCode}</span>
        <h1>{customer.name}</h1>
        <p class="facts">
          <StatusPill status={customer.status} />
          {#if customer.category}<span>{customer.category}</span>{/if}
          <span>Given to {customer.assignedTo?.name ?? "nobody yet"}</span>
          {#if customer.branch}<span>{customer.branch.name} branch</span>{/if}
        </p>
        <div class="contact">
          {#if call}<a class="o-btn ghost small" href={call}><Phone size={15} /> Call</a>{/if}
          {#if chat}<a class="o-btn ghost small" href={chat} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp</a>{/if}
          {#if customer.email}<a class="o-btn ghost small" href={`mailto:${customer.email}`}><Mail size={15} /> Email</a>{/if}
        </div>
      </div>
      <div class="o-actions">
        {#if may("deals.create")}<a class="o-btn" href={`/admin/deals?new=1&customer=${customer.id}`}><Handshake size={17} /> New deal</a>{/if}
        {#if may("invoices.create")}<a class="o-btn ghost" href={`/admin/accounts/invoices?new=1&customer=${customer.id}`}><ReceiptText size={17} /> New invoice</a>{/if}
        {#if may("payments.create")}<a class="o-btn ghost" href={`/admin/collections?new=1&customer=${customer.id}`}><Wallet size={17} /> Record payment</a>{/if}
        {#if may("documents.create")}<a class="o-btn ghost" href={`/admin/documents?new=1&customer=${customer.id}`}><FilePlus2 size={17} /> Add document</a>{/if}
        {#if may("customers.update")}<button class="o-btn ghost" onclick={() => (editing = true)}><Pencil size={17} /> Edit</button>{/if}
        {#if may("customers.delete")}<button class="o-btn danger" disabled={deleting} onclick={remove}><Trash2 size={17} /> {deleting ? "Deleting…" : "Delete"}</button>{/if}
        {#if actionProblem}<p class="o-error action-error" role="alert" use:intoView={actionProblem}>{actionProblem}</p>{/if}
      </div>
    </header>

    {#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}

    <nav class="o-tabs" aria-label="About this customer">
      {#each tabs as item (item.key)}
        <button class:active={tab === item.key} aria-pressed={tab === item.key} onclick={() => choose(item.key)}>
          {item.label}{#if counts[item.key]}<span class="count">{counts[item.key]}</span>{/if}
        </button>
      {/each}
    </nav>

    {#if tab === "overview"}
      {#if customer.summary}
        <div class="o-stats">
          <div class="o-stat"><span>Invoiced</span><b>{money(customer.summary.invoiced)}</b><small>Issued invoices, drafts and cancelled left out</small></div>
          <div class="o-stat"><span>Paid</span><b>{money(customer.summary.paid)}</b></div>
          <div class="o-stat dark"><span>Still due</span><b>{money(customer.summary.due)}</b><small>{customer.summary.due > 0 ? "What they still owe" : "Nothing owed"}</small></div>
        </div>
      {/if}
      <div class="o-grid-2">
        <section class="o-card">
          <h2>Contact and details</h2>
          <dl class="o-meta">
            <div><dt>Phone</dt><dd>{#if call}<a class="o-link" href={call}>{customer.phone}</a>{:else}{customer.phone}{/if}</dd></div>
            <div><dt>WhatsApp</dt><dd>{customer.whatsapp || "—"}</dd></div>
            <div><dt>Email</dt><dd>{#if customer.email}<a class="o-link" href={`mailto:${customer.email}`}>{customer.email}</a>{:else}—{/if}</dd></div>
            <div><dt>Address</dt><dd>{customer.address || "—"}</dd></div>
            <div><dt>Category</dt><dd>{customer.category || "—"}</dd></div>
            <div><dt>Lead source</dt><dd>{customer.leadSource || "—"}</dd></div>
            <div>
              <dt>Next follow-up</dt>
              <dd class:late={follow === "late"}>{customer.nextFollowUpAt ? day(customer.nextFollowUpAt) : "Not set"}{follow === "late" ? " · overdue" : follow === "today" ? " · today" : ""}</dd>
            </div>
            <div><dt>Added</dt><dd>{day(customer.createdAt)}</dd></div>
            <div><dt>Website account</dt><dd>{customer.user?.email ?? "None linked"}</dd></div>
          </dl>
        </section>
        <div class="stack">
          <section class="o-card">
            <h2>Passport</h2>
            <dl class="o-meta">
              <div><dt>Number</dt><dd class:quiet={customer.passportNumber === "Hidden"}>{passportText(customer.passportNumber)}</dd></div>
              {#if customer.passportNumber !== "Hidden"}
                <div><dt>Country</dt><dd>{customer.passportCountry || "—"}</dd></div>
                <div><dt>Expiry</dt><dd>{customer.passportExpiry ? day(customer.passportExpiry) : "—"}</dd></div>
              {/if}
            </dl>
          </section>
          <section class="o-card">
            <h2>Notes</h2>
            {#if customer.notes}<p class="notes">{customer.notes}</p>{:else}<p class="o-muted">No notes yet.{may("customers.update") ? " Add them with Edit." : ""}</p>{/if}
          </section>
        </div>
      </div>
    {:else if tab === "activity"}
      <CustomerActivity customerId={customer.id} activities={customer.activities} canLog={may("customers.update")} onlogged={reload} />
    {:else if tab === "tasks"}
      <CustomerTasks customerId={customer.id} tasks={customer.tasks} canTick={may("tasks.update")} canAdd={may("tasks.create")} onchanged={reload} />
    {:else if tab === "deals"}
      {#if !customer.deals.length}
        <div class="o-card o-empty">
          <Handshake size={28} />
          <h3>No deals yet</h3>
          <p>{may("deals.create") ? "A deal sets out the services, price and terms agreed with the customer." : "Deals with this customer will show here."}</p>
          {#if may("deals.create")}<a class="o-btn small" href={`/admin/deals?new=1&customer=${customer.id}`}><Plus size={15} /> New deal</a>{/if}
        </div>
      {:else}
        <div class="o-table-wrap">
          <table class="o-table">
            <thead><tr><th>Deal</th><th>Status</th><th class="num">Total</th><th class="num">Recognised</th></tr></thead>
            <tbody>
              {#each customer.deals as deal (deal.id)}
                <tr>
                  <td class="lead" data-label="Deal"><a class="o-link" href={`/admin/deals/${deal.id}`}>{deal.dealNumber}</a><small>{deal.title}</small></td>
                  <td data-label="Status"><StatusPill status={deal.status} /></td>
                  <td class="num" data-label="Total">{money(deal.total, deal.currency)}</td>
                  <td class="num" data-label="Recognised">{money(deal.recognized, deal.currency)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <p class="o-muted foot">Recognised is the part of the deal counted as earned income so far.</p>
      {/if}
    {:else if tab === "money"}
      <section class="money">
        <div class="part-head">
          <h2 class="o-section-title">Invoices</h2>
          {#if may("invoices.create")}<a class="o-btn ghost small" href={`/admin/accounts/invoices?new=1&customer=${customer.id}`}><Plus size={15} /> New invoice</a>{/if}
        </div>
        {#if !customer.invoices.length}
          <div class="o-card o-empty"><ReceiptText size={26} /><h3>No invoices yet</h3><p>Invoices made for this customer, or from their deals, will show here.</p></div>
        {:else}
          <div class="o-table-wrap">
            <table class="o-table">
              <thead><tr><th>Invoice</th><th>Date</th>{#if figures}<th class="num">Total</th><th class="num">Paid</th><th class="num">Due</th>{/if}<th>Status</th></tr></thead>
              <tbody>
                {#each customer.invoices as invoice (invoice.id)}
                  <tr>
                    <td class="lead" data-label="Invoice"><a class="o-link" href={`/admin/print/invoice/${invoice.id}`}>{invoice.number}</a>{#if invoice.dueAt}<small>Due by {day(invoice.dueAt)}</small>{/if}</td>
                    <td data-label="Date">{invoice.issuedAt ? day(invoice.issuedAt) : "Not issued"}</td>
                    {#if figures}
                      <td class="num" data-label="Total">{money(invoice.total, invoice.currency)}</td>
                      <td class="num" data-label="Paid">{money(invoice.paid, invoice.currency)}</td>
                      <td class="num" data-label="Due">{money(invoice.due, invoice.currency)}</td>
                    {/if}
                    <td data-label="Status"><StatusPill status={invoice.status} /></td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          {#if figures && invoiceTotals.length}
            <ul class="totals" aria-label="Invoice totals">
              {#each invoiceTotals as sum (sum.currency)}
                <li><span>Invoiced <b>{money(sum.total, sum.currency)}</b></span><span>Paid <b>{money(sum.paid, sum.currency)}</b></span><span>Due <b class:late={sum.due > 0}>{money(sum.due, sum.currency)}</b></span></li>
              {/each}
            </ul>
            <p class="o-muted foot">Drafts and cancelled invoices are left out of the totals.</p>
          {/if}
        {/if}

        <div class="part-head">
          <h2 class="o-section-title">Payments</h2>
          {#if may("payments.create")}<a class="o-btn ghost small" href={`/admin/collections?new=1&customer=${customer.id}`}><Plus size={15} /> Record payment</a>{/if}
        </div>
        {#if !customer.payments.length}
          <div class="o-card o-empty">
            <Wallet size={26} />
            <h3>No payments</h3>
            <p>{may("finance.read") ? "Money received from this customer will show here, each with its receipt." : "Payments are shown only to roles that may see money figures."}</p>
          </div>
        {:else}
          <div class="o-table-wrap">
            <table class="o-table">
              <thead><tr><th>Date</th><th>Receipt</th><th>Method</th><th class="num">Amount</th><th class="num">On invoices</th></tr></thead>
              <tbody>
                {#each customer.payments as payment (payment.id)}
                  <tr>
                    <td class="lead" data-label="Date">{day(payment.paidAt)}{#if payment.status !== "PAID"}<small>{statusText(payment.status)}</small>{/if}</td>
                    <td data-label="Receipt">{#if payment.receiptNumber}<a class="o-link" href={`/receipt/${payment.receiptNumber}`}>{payment.receiptNumber}</a>{:else}—{/if}</td>
                    <td data-label="Method">{payment.method || "—"}</td>
                    <td class="num" data-label="Amount">{money(payment.amount, payment.currency)}</td>
                    <td class="num" data-label="On invoices">{money(payment.allocated, payment.currency)}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          {#if paymentTotals.length}
            <ul class="totals" aria-label="Payment totals">
              {#each paymentTotals as sum (sum.currency)}
                <li><span>Received <b>{money(sum.amount, sum.currency)}</b></span><span>Put against invoices <b>{money(sum.allocated, sum.currency)}</b></span></li>
              {/each}
            </ul>
          {/if}
        {/if}
      </section>
    {:else if tab === "documents"}
      <div class="part-head">
        <h2 class="o-section-title">Documents</h2>
        <div class="o-actions">
          <a class="o-btn ghost small" href={`/admin/documents?customer=${customer.id}`}><FolderLock size={15} /> Open in Documents</a>
          {#if may("documents.create")}<a class="o-btn small" href={`/admin/documents?new=1&customer=${customer.id}`}><FilePlus2 size={15} /> Add document</a>{/if}
        </div>
      </div>
      {#if !customer.documents.length}
        <div class="o-card o-empty">
          <FileText size={26} />
          <h3>No documents yet</h3>
          <p>Passports, visas, certificates and other papers for this customer are kept in Documents, with their expiry dates.</p>
        </div>
      {:else}
        <div class="o-table-wrap">
          <table class="o-table">
            <thead><tr><th>Document</th><th>Kind</th><th>Expiry</th><th>Checked</th></tr></thead>
            <tbody>
              {#each customer.documents as document (document.id)}
                {@const left = daysLeft(document.expiryDate)}
                <tr>
                  <td class="lead" data-label="Document"><a class="o-link" href={`/admin/documents?customer=${customer.id}`}>{document.name}</a><small>{document.docType}</small></td>
                  <td data-label="Kind">{categoryLabel(document.category)}</td>
                  <td data-label="Expiry">
                    {#if document.expiryDate}
                      <span class={expiryTone(left)}>{day(document.expiryDate)}</span><small class={expiryTone(left)}>{expiryText(left)}</small>
                    {:else}No expiry{/if}
                  </td>
                  <td data-label="Checked"><StatusPill status={document.verification} label={document.verification === "PENDING" ? "Waiting" : ""} /></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {:else if tab === "applications"}
      {#if !customer.applications.length}
        <div class="o-card o-empty">
          <FileText size={26} />
          <h3>No website applications</h3>
          <p>When this customer applies on the website, or an application is linked to them, it shows here.</p>
        </div>
      {:else}
        <div class="o-table-wrap">
          <table class="o-table">
            <thead><tr><th>Reference</th><th>Division</th><th>Status</th><th class="num">Amount due</th><th>Applied</th></tr></thead>
            <tbody>
              {#each customer.applications as application (application.id)}
                <tr>
                  <td class="lead" data-label="Reference"><a class="o-link" href={`/admin/applications?open=${application.id}`}>{application.reference}</a></td>
                  <td data-label="Division">{statusText(application.type)}</td>
                  <td data-label="Status"><StatusPill status={application.status} /></td>
                  <td class="num" data-label="Amount due">{money(application.amountDue)}</td>
                  <td data-label="Applied">{day(application.createdAt)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {/if}
    {/if}
  {/if}
</div>

{#if editing && customer}
  <CustomerForm customer={customer} onclose={() => (editing = false)} onsaved={async () => { editing = false; await reload(); }} />
{/if}

<style>
  /* Every button stays at least 40px tall, for fingers. */
  .o-btn.small { min-height: 2.5rem; }
  .back { display: inline-flex; align-items: center; gap: 0.35rem; margin-bottom: 1rem; font-size: 0.86rem; }
  .facts { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.8rem; margin: 0.2rem 0 0; color: #607083; font-size: 0.9rem; }
  .contact { display: flex; flex-wrap: wrap; gap: 0.45rem; margin-top: 0.9rem; }
  .contact .o-btn { min-height: 2.5rem; }
  .o-head .o-actions { max-width: 40rem; justify-content: flex-end; }
  .action-error { flex: 1 1 100%; }
  .count { display: inline-grid; place-items: center; min-width: 1.35rem; height: 1.35rem; margin-left: 0.4rem; padding: 0 0.35rem; border-radius: 1rem; background: #d6dde3; color: #33475d; font-size: 0.72rem; font-weight: 800; }
  .o-tabs .active .count { background: #fbf1da; color: #7c5a12; }
  .o-tabs button { min-height: 2.5rem; }
  .stack { display: grid; gap: 1rem; align-content: start; }
  .stack .o-card + .o-card { margin-top: 0; }
  .notes { margin: 0; line-height: 1.55; white-space: pre-line; overflow-wrap: anywhere; }
  .quiet { color: #6a7686; font-weight: 600; }
  .late { color: #a3302a; }
  .warn { color: #7c5a12; font-weight: 750; }
  .bad { color: #a3302a; font-weight: 750; }
  .money { display: grid; gap: 0.8rem; }
  .part-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem; margin: 0.4rem 0 0.2rem; }
  .part-head h2 { margin: 0; }
  .part-head .o-actions { width: auto; }
  .money .part-head:not(:first-child) { margin-top: 1.2rem; }
  .totals { display: grid; gap: 0.4rem; margin: 0; padding: 0; list-style: none; }
  .totals li { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 0.4rem 1.4rem; padding: 0.7rem 0.9rem; border-radius: 0.7rem; background: #fff; border: 1px solid #e1e6e9; color: #607083; font-size: 0.86rem; }
  .totals b { margin-left: 0.3rem; color: #07182f; font-variant-numeric: tabular-nums; }
  .totals b.late { color: #a3302a; }
  .foot { margin: 0.6rem 0 0; font-size: 0.82rem; }
  @media (max-width: 48rem) {
    .o-head .o-actions { max-width: none; justify-content: stretch; }
    .totals li { justify-content: flex-start; }
    .part-head .o-actions { width: 100%; }
  }
</style>
