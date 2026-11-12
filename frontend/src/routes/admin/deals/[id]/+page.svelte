<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api, ApiError } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { confirmAction } from "$lib/confirm";
  import { toasts } from "$lib/toast";
  import { day, money, officePermissions } from "$lib/office";
  import { dealActions, dealDraftFrom, dealFigures, dealLineAmount, timelineText, type Deal, type DealDraft } from "$lib/deals";
  import { statusLabel } from "$lib/invoices";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import DealForm from "$lib/components/deals/DealForm.svelte";
  import { ArrowLeft, Ban, CheckCircle2, FilePlus2, Pencil, Play, Printer, RotateCcw, TrendingUp, Wallet } from "lucide-svelte";

  // One deal: its services, timeline, commitments and terms, the invoices
  // made from it, and the steps from draft to completed.
  const id = page.params.id ?? "";
  let deal = $state<Deal | null>(null),
    loading = $state(true),
    problem = $state(""),
    actionProblem = $state(""),
    busy = $state(""),
    editing = $state<DealDraft | null>(null),
    // The small forms: cancel with a reason, recognise an amount, an exchange rate.
    sheet = $state<"" | "cancel" | "recognize" | "rate">(""),
    reason = $state(""),
    amount = $state<number | null>(null),
    rate = $state<number | null>(null),
    sheetProblem = $state("");

  const may = (permission: string) => $officePermissions.has(permission);
  let actions = $derived(deal ? dealActions(deal.status, may) : []);
  let figures = $derived(deal ? dealFigures(deal.invoices) : null);
  let finance = $derived(deal?.total !== null && deal?.total !== undefined);
  let servicesTotal = $derived(deal ? deal.items.reduce((sum, item) => sum + dealLineAmount(item), 0) : 0);

  async function load() {
    loading = true;
    problem = "";
    try {
      deal = await api<Deal>(`/office/deals/${id}`);
    } catch (e) {
      deal = null;
      problem = e instanceof ApiError && e.status === 404 ? "This deal no longer exists, or it is not one of yours." : problemText(e, "The deal could not be loaded");
    } finally {
      loading = false;
    }
  }

  onMount(load);

  async function step(action: "activate" | "complete" | "cancel" | "reopen", why = "") {
    busy = action;
    actionProblem = "";
    sheetProblem = "";
    try {
      deal = await api<Deal>(`/office/deals/${id}/status`, { method: "POST", body: JSON.stringify({ action, ...(why ? { reason: why } : {}) }) });
      toasts.show(action === "activate" ? "Deal started" : action === "complete" ? "Deal completed" : action === "cancel" ? "Deal cancelled" : "Deal reopened as a draft");
      sheet = "";
    } catch (e) {
      const text = problemText(e, "The deal was not changed");
      if (sheet) sheetProblem = text;
      else actionProblem = text;
    } finally {
      busy = "";
    }
  }

  async function complete() {
    const yes = await confirmAction({
      title: "Mark this deal completed?",
      message: "The work is done: the invoiced amount counts as earned revenue now. A completed deal can no longer be changed.",
      confirmLabel: "Mark completed",
      tone: "default",
    });
    if (yes) step("complete");
  }

  function openSheet(kind: typeof sheet) {
    sheetProblem = "";
    reason = "";
    amount = null;
    rate = null;
    sheet = kind;
  }

  async function recognize(event: SubmitEvent) {
    event.preventDefault();
    busy = "recognize";
    sheetProblem = "";
    try {
      deal = await api<Deal>(`/office/deals/${id}/recognize`, { method: "POST", body: JSON.stringify({ amount }) });
      toasts.show("Revenue recognised");
      sheet = "";
    } catch (e) {
      sheetProblem = problemText(e, "The revenue was not recognised");
    } finally {
      busy = "";
    }
  }

  // A draft invoice with the deal's services, timeline, commitments and
  // terms, opened for checking before it is issued. An invoice in another
  // currency needs the day's rate when none is saved.
  async function makeInvoice(event?: SubmitEvent) {
    event?.preventDefault();
    busy = "invoice";
    actionProblem = "";
    sheetProblem = "";
    try {
      const made = await api<{ id: string; number: string }>(`/office/deals/${id}/invoice`, { method: "POST", body: JSON.stringify(rate ? { exchangeRate: rate } : {}) });
      toasts.show(`Draft invoice ${made.number} made`);
      sheet = "";
      goto(`/admin/accounts/invoices?edit=${made.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.code === "NO_RATE" && sheet !== "rate") openSheet("rate");
      else if (sheet === "rate") sheetProblem = problemText(e, "The invoice was not made");
      else actionProblem = problemText(e, "The invoice was not made");
    } finally {
      busy = "";
    }
  }

  function edited() {
    editing = null;
    toasts.show("Deal saved");
    load();
  }

  const multiline = (text: string | null | undefined) => (text ?? "").trim();
</script>

<svelte:head><title>{deal ? `${deal.dealNumber} ${deal.title}` : "Deal"} — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <a class="o-link back" href="/admin/deals"><ArrowLeft size={16} /> All deals</a>

  {#if loading && !deal}
    <p class="o-loading">Loading the deal…</p>
  {:else if problem}
    <p class="o-error" role="alert" use:intoView={problem}>{problem}</p>
  {:else if deal}
    <header class="o-head">
      <div>
        <span class="o-kicker">Deal {deal.dealNumber}</span>
        <h1>{deal.title}</h1>
        <p class="who">
          <a class="o-link" href={`/admin/customers/${deal.customer.id}`}>{deal.customer.name}</a>
          <span class="o-muted">{deal.customer.customerCode}</span>
          <StatusPill status={deal.status} />
          {#if deal.serviceLine}<span class="o-muted">· {deal.serviceLine}</span>{/if}
        </p>
      </div>
      <div class="o-actions">
        {#if actions.includes("edit")}<button class="o-btn ghost" onclick={() => deal && (editing = dealDraftFrom(deal))}><Pencil size={16} /> Edit</button>{/if}
        {#if actions.includes("activate")}<button class="o-btn navy" disabled={!!busy} onclick={() => step("activate")}><Play size={16} /> {busy === "activate" ? "Starting…" : "Activate"}</button>{/if}
        {#if actions.includes("complete")}<button class="o-btn navy" disabled={!!busy} onclick={complete}><CheckCircle2 size={16} /> {busy === "complete" ? "Completing…" : "Mark completed"}</button>{/if}
        {#if actions.includes("invoice")}<button class="o-btn" disabled={!!busy} onclick={() => makeInvoice()}><FilePlus2 size={16} /> {busy === "invoice" ? "Making…" : "Make invoice"}</button>{/if}
        {#if actions.includes("payment")}<a class="o-btn ghost" href={`/admin/collections?new=1&customer=${deal.customer.id}`}><Wallet size={16} /> Record payment</a>{/if}
        <a class="o-btn ghost" href={`/admin/print/agreement/${deal.id}`}><Printer size={16} /> Print agreement</a>
        {#if actions.includes("recognize")}<button class="o-btn ghost" disabled={!!busy} onclick={() => openSheet("recognize")}><TrendingUp size={16} /> Recognise part of the revenue</button>{/if}
        {#if actions.includes("cancel")}<button class="o-btn danger" disabled={!!busy} onclick={() => openSheet("cancel")}><Ban size={16} /> Cancel deal</button>{/if}
        {#if actions.includes("reopen")}<button class="o-btn ghost" disabled={!!busy} onclick={() => step("reopen")}><RotateCcw size={16} /> {busy === "reopen" ? "Reopening…" : "Reopen"}</button>{/if}
      </div>
    </header>
    {#if actionProblem}<p class="o-error action-error" role="alert" use:intoView={actionProblem}>{actionProblem}</p>{/if}

    {#if finance && figures}
      <div class="o-stats">
        <div class="o-stat dark"><span>Deal total</span><b>{money(deal.total, deal.currency)}</b><small>{deal.items.length} {deal.items.length === 1 ? "service" : "services"}</small></div>
        <div class="o-stat"><span>Invoiced</span><b>{money(figures.invoiced, deal.currency)}</b><small>Issued invoices, less credit notes</small></div>
        <div class="o-stat"><span>Paid</span><b>{money(figures.paid, deal.currency)}</b></div>
        <div class="o-stat"><span>Still due</span><b>{money(figures.due, deal.currency)}</b></div>
        <div class="o-stat"><span>Recognised revenue</span><b>{money(deal.recognized)}</b><small>Counted as earned, in taka</small></div>
      </div>
    {/if}

    <div class="o-grid-2 layout">
      <section class="o-card services">
        <h2>Services</h2>
        <div class="o-table-wrap flat">
          <table class="o-table">
            <thead><tr><th>Service</th><th>Line</th><th class="num">Qty</th><th class="num">Unit price</th><th class="num">Amount</th></tr></thead>
            <tbody>
              {#each deal.items as item, index (index)}
                <tr>
                  <td class="lead" data-label="Service">{item.description}</td>
                  <td data-label="Line">{item.serviceLine || "—"}</td>
                  <td class="num" data-label="Qty">{item.quantity}</td>
                  <td class="num" data-label="Unit price">{money(item.unitPrice, deal.currency)}</td>
                  <td class="num" data-label="Amount">{money(dealLineAmount(item), deal.currency)}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <p class="sum">Total <b>{money(servicesTotal, deal.currency)}</b></p>
        {#if deal.description}<p class="text">{deal.description}</p>{/if}
      </section>

      <section class="o-card">
        <h2>Timeline</h2>
        <dl class="o-meta">
          <div><dt>Starts</dt><dd>{day(deal.startDate)}</dd></div>
          <div><dt>Ends</dt><dd>{day(deal.endDate)}</dd></div>
          <div><dt>Time left</dt><dd>{timelineText(deal.endDate, deal.status)}</dd></div>
          <div><dt>Given to</dt><dd>{deal.assignedTo?.name ?? "—"}</dd></div>
          {#if deal.branch}<div><dt>Branch</dt><dd>{deal.branch.name}</dd></div>{/if}
          {#if deal.completedAt}<div><dt>Completed</dt><dd>{day(deal.completedAt)}</dd></div>{/if}
          {#if deal.cancelledAt}<div><dt>Cancelled</dt><dd>{day(deal.cancelledAt)}</dd></div>{/if}
        </dl>
      </section>

      <section class="o-card">
        <h2>What Bengal Port commits to</h2>
        {#if multiline(deal.companyCommitments)}<p class="text">{deal.companyCommitments}</p>{:else}<p class="o-muted">Nothing written yet.{actions.includes("edit") ? " Add it with “Edit”." : ""}</p>{/if}
      </section>

      <section class="o-card">
        <h2>What the client commits to</h2>
        {#if multiline(deal.clientCommitments)}<p class="text">{deal.clientCommitments}</p>{:else}<p class="o-muted">Nothing written yet.{actions.includes("edit") ? " Add it with “Edit”." : ""}</p>{/if}
      </section>

      <section class="o-card wide">
        <h2>Terms</h2>
        {#if multiline(deal.terms)}<p class="text">{deal.terms}</p>{:else}<p class="o-muted">No terms on this deal.</p>{/if}
      </section>

      <section class="o-card wide">
        <h2>Invoices</h2>
        {#if !deal.invoices.length}
          <p class="o-muted">No invoices yet.{actions.includes("invoice") ? " “Make invoice” makes a draft from these services to check and issue." : ""}</p>
        {:else}
          <div class="o-table-wrap flat">
            <table class="o-table">
              <thead><tr><th>Invoice</th><th>Date</th><th>Status</th>{#if finance}<th class="num">Total</th><th class="num">Paid</th><th class="num">Due</th>{/if}</tr></thead>
              <tbody>
                {#each deal.invoices as invoice (invoice.id)}
                  <tr>
                    <td class="lead" data-label="Invoice"><a class="o-link" href={`/admin/print/invoice/${invoice.id}`}>{invoice.number}</a></td>
                    <td data-label="Date">{day(invoice.issuedAt)}</td>
                    <td data-label="Status"><StatusPill status={invoice.status} label={statusLabel(invoice.status)} /></td>
                    {#if finance}
                      <td class="num" data-label="Total">{money(invoice.total, invoice.currency)}</td>
                      <td class="num" data-label="Paid">{money(invoice.paid, invoice.currency)}</td>
                      <td class="num" data-label="Due"><b>{money(invoice.due, invoice.currency)}</b></td>
                    {/if}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {/if}
      </section>

      <section class="o-card wide">
        <h2>Tasks</h2>
        {#if !deal.tasks?.length}
          <p class="o-muted">No tasks for this deal. Add them under <a class="o-link" href="/admin/tasks">Tasks</a>.</p>
        {:else}
          <ul class="tasks">
            {#each deal.tasks as task (task.id)}
              <li>
                <div><b>{task.title}</b><small>{task.dueAt ? `Due ${day(task.dueAt)}` : "No date"}{task.assignee ? ` · ${task.assignee.name}` : ""}</small></div>
                <StatusPill status={task.status} />
              </li>
            {/each}
          </ul>
        {/if}
      </section>
    </div>
  {/if}
</div>

{#if editing}
  <DealForm draft={editing} onclose={() => (editing = null)} onsaved={edited} />
{/if}

{#if sheet === "cancel" && deal}
  <OfficeSheet title={`Cancel ${deal.dealNumber}?`} subtitle="A cancelled deal can be reopened later as a draft." onclose={() => (sheet = "")}>
    <form id="cancel-form" class="o-form" onsubmit={(event) => { event.preventDefault(); step("cancel", reason.trim()); }}>
      <label class="o-field"><span>Why is it cancelled?</span><textarea bind:value={reason} maxlength="300" placeholder="The customer chose another supplier"></textarea></label>
      <p class="o-muted note">A deal with issued invoices cannot be cancelled: cancel those invoices, or add credit notes, first.</p>
    </form>
    {#snippet footer()}
      {#if sheetProblem}<p class="o-error wide-error" role="alert" use:intoView={sheetProblem}>{sheetProblem}</p>{/if}
      <button type="button" class="o-btn ghost" onclick={() => (sheet = "")}>Keep the deal</button>
      <button type="submit" form="cancel-form" class="o-btn danger" disabled={busy === "cancel"}>{busy === "cancel" ? "Cancelling…" : "Cancel deal"}</button>
    {/snippet}
  </OfficeSheet>
{/if}

{#if sheet === "recognize" && deal}
  <OfficeSheet title="Recognise part of the revenue" subtitle="When part of the work is done before the deal ends." onclose={() => (sheet = "")}>
    <form id="recognize-form" class="o-form" onsubmit={recognize}>
      <label class="o-field">
        <span>Amount earned so far (৳)</span>
        <input type="number" min="0.01" step="0.01" bind:value={amount} required />
        <small class="hint">In taka. It moves from “revenue not yet earned” to revenue in the accounts. Recognised so far: {money(deal.recognized)}. When the deal is marked completed, the rest of what was invoiced is recognised by itself.</small>
      </label>
    </form>
    {#snippet footer()}
      {#if sheetProblem}<p class="o-error wide-error" role="alert" use:intoView={sheetProblem}>{sheetProblem}</p>{/if}
      <button type="button" class="o-btn ghost" onclick={() => (sheet = "")}>Cancel</button>
      <button type="submit" form="recognize-form" class="o-btn navy" disabled={busy === "recognize"}>{busy === "recognize" ? "Recognising…" : "Recognise"}</button>
    {/snippet}
  </OfficeSheet>
{/if}

{#if sheet === "rate" && deal}
  <OfficeSheet title={`Exchange rate for ${deal.currency}`} subtitle="No rate is saved for this currency yet." onclose={() => (sheet = "")}>
    <form id="rate-form" class="o-form" onsubmit={makeInvoice}>
      <label class="o-field">
        <span>Taka for 1 {deal.currency}</span>
        <input type="number" min="0.000001" step="any" bind:value={rate} required />
        <small class="hint">The invoice is in {deal.currency}; the accounts keep it in taka at this rate.</small>
      </label>
    </form>
    {#snippet footer()}
      {#if sheetProblem}<p class="o-error wide-error" role="alert" use:intoView={sheetProblem}>{sheetProblem}</p>{/if}
      <button type="button" class="o-btn ghost" onclick={() => (sheet = "")}>Cancel</button>
      <button type="submit" form="rate-form" class="o-btn" disabled={busy === "invoice"}>{busy === "invoice" ? "Making…" : "Make invoice"}</button>
    {/snippet}
  </OfficeSheet>
{/if}

<style>
  .back { display: inline-flex; align-items: center; gap: 0.35rem; min-height: 2.5rem; margin-bottom: 0.5rem; }
  .who { display: flex; flex-wrap: wrap; align-items: center; gap: 0.35rem 0.6rem; }
  .action-error { margin: -0.5rem 0 1rem; }
  .layout { align-items: start; }
  .layout .wide { grid-column: 1 / -1; }
  .layout .o-card + .o-card { margin-top: 0; }
  .services { grid-column: 1 / -1; }
  .flat { border: 0; border-radius: 0; }
  .sum { margin: 0.75rem 0 0; text-align: right; color: #405066; }
  .sum b { margin-left: 0.4rem; font-size: 1.1rem; color: #07182f; }
  .text { margin: 0; white-space: pre-line; line-height: 1.6; overflow-wrap: anywhere; }
  .services .text { margin-top: 0.9rem; color: #4b5d70; }
  .tasks { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
  .tasks li { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.6rem 0; border-top: 1px solid #edf0f2; }
  .tasks li:first-child { border-top: 0; }
  .tasks div { min-width: 0; }
  .tasks b, .tasks small { display: block; overflow-wrap: anywhere; }
  .tasks small { margin-top: 0.15rem; color: #7a8593; font-size: 0.8rem; }
  .note { margin: 0; font-size: 0.84rem; }
  .wide-error { flex: 1 1 100%; }
</style>
