<script lang="ts">
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { confirmAction } from "$lib/confirm";
  import { toasts } from "$lib/toast";
  import { day, money, officeMe, officePermissions } from "$lib/office";
  import { customerCodeText, invoiceActions, paymentLink, statusLabel, type Invoice, type InvoiceRevision } from "$lib/invoices";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import { Ban, Copy, FileMinus2, FilePen, History, MessageCircle, Pencil, Printer, Send, Trash2, Wallet } from "lucide-svelte";

  // Everything that can be done with one invoice, by its state and the
  // permissions of whoever is looking: issue or change a draft; revise,
  // credit, cancel, share or take payment on an issued invoice.
  let {
    invoice: starting,
    onclose,
    onchanged,
    onedit,
    onrevise,
  }: {
    invoice: Invoice;
    onclose: () => void;
    onchanged: () => void;
    onedit: (invoice: Invoice) => void;
    onrevise: (invoice: Invoice) => void;
  } = $props();

  // svelte-ignore state_referenced_locally
  let invoice = $state<Invoice>(starting);
  let panel = $state<"" | "credit" | "cancel" | "share" | "history">(""),
    busy = $state(""),
    problem = $state(""),
    panelProblem = $state(""),
    notice = $state(""),
    reason = $state(""),
    amount = $state<number | null>(null),
    shared = $state<{ url: string; message: string; whatsapp: string } | null>(null),
    revisions = $state<InvoiceRevision[] | null>(null);

  const may = (permission: string) => $officePermissions.has(permission);
  let actions = $derived(invoiceActions(invoice, may, $officeMe?.role));
  let currency = $derived(invoice.currency || "BDT");

  function open(next: typeof panel) {
    panel = panel === next ? "" : next;
    panelProblem = "";
    reason = "";
    amount = null;
    if (next === "history" && !revisions) loadHistory();
  }

  // Saved straight away, or waiting for an approver.
  function settled(result: any, done: string) {
    if (result && result.done === false) {
      notice = result.message || "Your request is waiting for an approver.";
      toasts.show("Sent for approval");
    } else {
      if (result?.id) invoice = result as Invoice;
      toasts.show(done);
    }
    panel = "";
    onchanged();
  }

  async function issue() {
    const yes = await confirmAction({
      title: `Issue ${invoice.number}?`,
      message: "After issuing, the invoice can't be edited; changes become a new version. It is entered in the accounts as money the customer owes.",
      confirmLabel: "Issue invoice",
      tone: "default",
    });
    if (!yes) return;
    busy = "issue";
    problem = "";
    try {
      invoice = await api<Invoice>(`/admin/invoices/${invoice.id}/issue`, { method: "POST" });
      toasts.show(`${invoice.number} issued`);
      onchanged();
    } catch (e) {
      problem = problemText(e, "The invoice was not issued");
    } finally {
      busy = "";
    }
  }

  async function remove() {
    const yes = await confirmAction({ title: `Delete draft ${invoice.number}?`, message: `The draft for ${invoice.customerName} is removed. This cannot be undone, and its number will not be used again.` });
    if (!yes) return;
    busy = "delete";
    problem = "";
    try {
      await api(`/admin/invoices/${invoice.id}`, { method: "DELETE" });
      toasts.show("Draft deleted");
      onchanged();
      onclose();
    } catch (e) {
      problem = problemText(e, "The draft was not deleted");
    } finally {
      busy = "";
    }
  }

  async function credit(event: SubmitEvent) {
    event.preventDefault();
    busy = "credit";
    panelProblem = "";
    try {
      settled(await api(`/admin/invoices/${invoice.id}/credit-notes`, { method: "POST", body: JSON.stringify({ amount, reason }) }), "Credit note added");
    } catch (e) {
      panelProblem = problemText(e, "The credit note was not added");
    } finally {
      busy = "";
    }
  }

  async function cancel(event: SubmitEvent) {
    event.preventDefault();
    busy = "cancel";
    panelProblem = "";
    try {
      settled(await api(`/admin/invoices/${invoice.id}/cancel`, { method: "POST", body: JSON.stringify({ reason }) }), `${invoice.number} cancelled`);
    } catch (e) {
      panelProblem = problemText(e, "The invoice was not cancelled");
    } finally {
      busy = "";
    }
  }

  // The tab is opened while the click still counts, so the browser does not
  // block it, and pointed at WhatsApp once the link is made.
  async function share() {
    const tab = window.open("", "_blank");
    busy = "share";
    problem = "";
    panel = "share";
    try {
      shared = await api<{ url: string; message: string; whatsapp: string }>(`/admin/invoices/${invoice.id}/share`, { method: "POST" });
      if (tab) {
        tab.opener = null;
        tab.location.href = shared.whatsapp;
      }
      onchanged();
    } catch (e) {
      tab?.close();
      panel = "";
      problem = problemText(e, "The link was not made");
    } finally {
      busy = "";
    }
  }

  async function copy() {
    if (!shared) return;
    try {
      await navigator.clipboard.writeText(shared.url);
      toasts.show("Link copied");
    } catch {
      panelProblem = "The link could not be copied here. Select it in the box and copy it.";
    }
  }

  async function loadHistory() {
    panelProblem = "";
    try {
      revisions = await api<InvoiceRevision[]>(`/admin/invoices/${invoice.id}/revisions`);
    } catch (e) {
      revisions = [];
      panelProblem = problemText(e, "The earlier versions could not be loaded");
    }
  }
</script>

<OfficeSheet title={invoice.number} subtitle={`${invoice.customerName}${invoice.version > 1 ? ` · version ${invoice.version}` : ""}`} {onclose}>
  <div class="summary">
    <StatusPill status={invoice.status} label={statusLabel(invoice.status)} />
    <dl class="o-meta">
      <div><dt>Date</dt><dd>{day(invoice.issuedAt)}</dd></div>
      {#if invoice.dueAt}<div><dt>Due date</dt><dd>{day(invoice.dueAt)}</dd></div>{/if}
      {#if invoice.customer}<div><dt>Customer</dt><dd><a class="o-link" href={`/admin/customers/${invoice.customer.id}`}>{invoice.customer.name}</a> <small class="o-muted">{customerCodeText(invoice.customer.code)}</small></dd></div>{/if}
      {#if invoice.deal}<div><dt>Deal</dt><dd><a class="o-link" href={`/admin/deals/${invoice.deal.id}`}>{invoice.deal.title}</a></dd></div>{/if}
      <div><dt>Total</dt><dd>{money(invoice.total, currency)}</dd></div>
      {#if invoice.credited > 0}<div><dt>Credit notes</dt><dd>{money(-invoice.credited, currency)}</dd></div>{/if}
      <div><dt>Paid</dt><dd>{money(invoice.paid, currency)}</dd></div>
      <div><dt>Still due</dt><dd><b>{money(invoice.due, currency)}</b></dd></div>
      {#if invoice.signature}<div><dt>Signed by</dt><dd>{invoice.signature.ownerName}</dd></div>{/if}
      {#if invoice.issuedByName}<div><dt>Issued by</dt><dd>{invoice.issuedByName}</dd></div>{/if}
      {#if invoice.sentAt}<div><dt>Link last sent</dt><dd>{day(invoice.sentAt)}</dd></div>{/if}
      {#if invoice.cancelReason}<div><dt>Why cancelled</dt><dd>{invoice.cancelReason}</dd></div>{/if}
    </dl>
  </div>

  {#if notice}<p class="o-notice" role="status">{notice}</p>{/if}

  <div class="buttons">
    <a class="o-btn ghost" href={`/admin/print/invoice/${invoice.id}`}><Printer size={16} /> Open / Print</a>
    {#if actions.includes("edit")}<button class="o-btn ghost" onclick={() => onedit(invoice)}><Pencil size={16} /> Edit draft</button>{/if}
    {#if actions.includes("issue")}<button class="o-btn navy" disabled={!!busy} onclick={issue}><Send size={16} /> {busy === "issue" ? "Issuing…" : "Issue"}</button>{/if}
    {#if actions.includes("revise")}<button class="o-btn ghost" onclick={() => onrevise(invoice)}><FilePen size={16} /> Revise</button>{/if}
    {#if actions.includes("payment")}<a class="o-btn" href={paymentLink(invoice)}><Wallet size={16} /> Record payment</a>{/if}
    {#if actions.includes("share")}<button class="o-btn ghost" disabled={!!busy} onclick={share}><MessageCircle size={16} /> {busy === "share" ? "Making the link…" : "Share by WhatsApp"}</button>{/if}
    {#if actions.includes("credit")}<button class="o-btn ghost" aria-expanded={panel === "credit"} onclick={() => open("credit")}><FileMinus2 size={16} /> Credit note</button>{/if}
    {#if actions.includes("history")}<button class="o-btn ghost" aria-expanded={panel === "history"} onclick={() => open("history")}><History size={16} /> Version history</button>{/if}
    {#if actions.includes("cancel")}<button class="o-btn danger" aria-expanded={panel === "cancel"} onclick={() => open("cancel")}><Ban size={16} /> {invoice.state === "DRAFT" ? "Withdraw draft" : "Cancel invoice"}</button>{/if}
    {#if actions.includes("delete")}<button class="o-btn danger" disabled={!!busy} onclick={remove}><Trash2 size={16} /> Delete draft</button>{/if}
  </div>
  {#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}
  {#if invoice.state === "ISSUED" && !actions.includes("payment") && invoice.due > 0 && !invoice.customer && may("payments.create")}
    <p class="o-muted small">To record a payment, the invoice needs a customer from the customer list. Revise it and choose the customer.</p>
  {/if}

  {#if panel === "credit"}
    <form class="o-card panel o-form" onsubmit={credit}>
      <h3>Credit note</h3>
      <p class="o-muted small">Lowers what the customer owes on this invoice, for example a discount agreed later. The invoice itself stays as issued.</p>
      <label class="o-field"><span>Amount ({currency})</span><input type="number" min="0.01" max={invoice.due} step="0.01" bind:value={amount} required /><small class="hint">At most what is still due: {money(invoice.due, currency)}.</small></label>
      <label class="o-field"><span>Reason</span><textarea bind:value={reason} maxlength="300" required placeholder="Discount agreed for a late start"></textarea></label>
      {#if panelProblem}<p class="o-error" role="alert" use:intoView={panelProblem}>{panelProblem}</p>{/if}
      <div class="o-form-actions">
        <button type="button" class="o-btn ghost" onclick={() => (panel = "")}>Close</button>
        <button type="submit" class="o-btn navy" disabled={busy === "credit"}>{busy === "credit" ? "Adding…" : "Add credit note"}</button>
      </div>
      <p class="o-muted small">Without the approve permission it waits for an approver first.</p>
    </form>
  {/if}

  {#if panel === "cancel"}
    <form class="o-card panel o-form" onsubmit={cancel}>
      <h3>{invoice.state === "DRAFT" ? "Withdraw this draft" : "Cancel this invoice"}</h3>
      <p class="o-muted small">
        {invoice.state === "DRAFT"
          ? "The draft is kept, marked cancelled, and never issued."
          : "What the customer owes on it is taken out of the accounts. An invoice with money paid on it cannot be cancelled: refund the payment or add a credit note instead."}
      </p>
      <label class="o-field"><span>Reason</span><textarea bind:value={reason} maxlength="300" required placeholder="The customer cancelled the order"></textarea></label>
      {#if panelProblem}<p class="o-error" role="alert" use:intoView={panelProblem}>{panelProblem}</p>{/if}
      <div class="o-form-actions">
        <button type="button" class="o-btn ghost" onclick={() => (panel = "")}>Keep it</button>
        <button type="submit" class="o-btn danger" disabled={busy === "cancel"}>{busy === "cancel" ? "Cancelling…" : invoice.state === "DRAFT" ? "Withdraw draft" : "Cancel invoice"}</button>
      </div>
      {#if invoice.state !== "DRAFT"}<p class="o-muted small">Without the approve permission it waits for an approver first.</p>{/if}
    </form>
  {/if}

  {#if panel === "share"}
    <div class="o-card panel">
      <h3>Shared by WhatsApp</h3>
      {#if busy === "share"}
        <p class="o-loading">Making the link…</p>
      {:else if shared}
        <p class="o-muted small">WhatsApp opened in a new tab with the message ready to send. The link works for 30 days; the customer can view, print or save the invoice without signing in.</p>
        <label class="o-field"><span>Link for the customer</span><input readonly value={shared.url} onfocus={(event) => event.currentTarget.select()} /></label>
        {#if panelProblem}<p class="o-error" role="alert" use:intoView={panelProblem}>{panelProblem}</p>{/if}
        <div class="o-form-actions">
          <button type="button" class="o-btn ghost" onclick={copy}><Copy size={16} /> Copy link</button>
          <a class="o-btn" href={shared.whatsapp} target="_blank" rel="noopener noreferrer"><MessageCircle size={16} /> Open WhatsApp again</a>
        </div>
      {/if}
    </div>
  {/if}

  {#if panel === "history"}
    <div class="o-card panel">
      <h3>Earlier versions</h3>
      {#if panelProblem}<p class="o-error" role="alert" use:intoView={panelProblem}>{panelProblem}</p>{/if}
      {#if revisions === null}
        <p class="o-loading">Loading versions…</p>
      {:else if !revisions.length}
        <p class="o-muted">No earlier versions.</p>
      {:else}
        <ol class="history">
          {#each revisions as revision (revision.id)}
            <li>
              <div class="row"><b>Version {revision.version}</b><span>{money(Number(revision.snapshot?.total), revision.snapshot?.currency || currency)}</span></div>
              <small>Replaced {day(revision.createdAt)} by {revision.byName}</small>
              <p>{revision.reason}</p>
            </li>
          {/each}
        </ol>
        <p class="o-muted small">Now on version {invoice.version}: {money(invoice.total, currency)}.</p>
      {/if}
    </div>
  {/if}

  {#snippet footer()}
    <button type="button" class="o-btn ghost" onclick={onclose}>Close</button>
  {/snippet}
</OfficeSheet>

<style>
  .summary { display: grid; gap: 0.6rem; margin-bottom: 1rem; }
  .summary :global(.o-pill) { justify-self: start; }
  .buttons { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
  .buttons :global(.o-btn) { flex: 1 1 11rem; }
  .panel { display: grid; gap: 0.75rem; margin-top: 0.75rem; }
  .panel h3 { margin: 0; font-size: 1rem; color: #07182f; }
  .small { margin: 0; font-size: 0.82rem; line-height: 1.5; }
  .history { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
  .history li { padding: 0.65rem 0; border-top: 1px solid #edf0f2; }
  .history li:first-child { border-top: 0; }
  .history .row { display: flex; justify-content: space-between; gap: 1rem; }
  .history .row span { font-variant-numeric: tabular-nums; white-space: nowrap; }
  .history small { display: block; margin-top: 0.15rem; color: #7a8593; }
  .history p { margin: 0.3rem 0 0; white-space: pre-line; overflow-wrap: anywhere; }
</style>
