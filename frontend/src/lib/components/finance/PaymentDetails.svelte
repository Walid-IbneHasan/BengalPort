<script lang="ts">
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { confirmAction } from "$lib/confirm";
  import { toasts } from "$lib/toast";
  import { day, money, officePermissions } from "$lib/office";
  import { allocationList, METHODS, paymentPill, round2, toTaka, type OfficePayment, type OpenInvoice } from "$lib/finance";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import AllocationBoxes from "./AllocationBoxes.svelte";
  import { ExternalLink, HandCoins, Undo2 } from "lucide-svelte";

  // One payment: what it paid, what is still an advance, and the two things
  // that can happen next: the advance applied to invoices, or money refunded.
  let { payment, onclose, onchanged }: { payment: OfficePayment; onclose: () => void; onchanged: (next?: OfficePayment) => void } = $props();

  type Mode = "view" | "apply" | "refund";
  let mode = $state<Mode>("view"),
    invoices = $state<OpenInvoice[]>([]),
    amounts = $state<Record<string, number | null | undefined>>({}),
    loading = $state(false),
    loadProblem = $state(""),
    refund = $state({ amount: null as number | null, method: "Cash", reason: "" }),
    busy = $state(false),
    problem = $state(""),
    notice = $state("");

  const may = (permission: string) => $officePermissions.has(permission);
  let foreign = $derived(payment.currency !== "BDT");
  let refundable = $derived(round2(payment.amount - payment.refunded));
  let pill = $derived(paymentPill(payment));
  let canApply = $derived(may("payments.create") && !!payment.customer && payment.unallocated > 0);
  let canRefund = $derived(may("payments.create") && payment.provider === "office" && payment.status !== "REFUNDED" && refundable > 0);
  // An approver refunds at once; anyone else asks one.
  let approver = $derived(may("payments.approve"));

  async function openApply() {
    mode = "apply";
    problem = notice = loadProblem = "";
    amounts = {};
    loading = true;
    try {
      invoices = await api<OpenInvoice[]>(`/office/customers/${payment.customer!.id}/open-invoices`);
    } catch (e) {
      loadProblem = problemText(e, "The customer's invoices could not be loaded");
    } finally {
      loading = false;
    }
  }

  function openRefund() {
    mode = "refund";
    problem = notice = "";
    refund = { amount: null, method: METHODS.includes(payment.method ?? "") ? payment.method! : "Cash", reason: "" };
  }

  async function apply(event: SubmitEvent) {
    event.preventDefault();
    const allocations = allocationList(Object.fromEntries(invoices.filter((invoice) => invoice.currency === payment.currency).map((invoice) => [invoice.id, amounts[invoice.id]])));
    if (!allocations.length) {
      problem = "Type an amount for at least one invoice, or use “Fill oldest first”.";
      return;
    }
    busy = true;
    problem = "";
    try {
      const next = await api<OfficePayment>(`/office/payments/${payment.id}/allocate`, { method: "POST", body: JSON.stringify({ allocations }) });
      toasts.show("Advance applied to the invoices");
      mode = "view";
      onchanged(next);
    } catch (e) {
      problem = problemText(e, "The advance was not applied");
    } finally {
      busy = false;
    }
  }

  async function sendRefund(event: SubmitEvent) {
    event.preventDefault();
    if (approver) {
      const yes = await confirmAction({
        title: `Refund ${money(refund.amount, payment.currency)}?`,
        message: `The money goes back to ${payment.customer?.name ?? "the customer"} and leaves the account it came into. The books keep a record of it.`,
        confirmLabel: "Refund",
        tone: "danger",
      });
      if (!yes) return;
    }
    busy = true;
    problem = "";
    try {
      const result = await api<{ done: boolean; message?: string }>(`/office/payments/${payment.id}/refund`, { method: "POST", body: JSON.stringify(refund) });
      mode = "view";
      if (result?.done === false) {
        notice = "Your refund request was sent for approval. Nothing is refunded until an approver agrees; you will get a notification.";
        toasts.show("Refund sent for approval");
        onchanged();
      } else {
        toasts.show(`Refunded ${money(refund.amount, payment.currency)}`);
        onchanged();
      }
    } catch (e) {
      problem = problemText(e, "The refund was not made");
    } finally {
      busy = false;
    }
  }
</script>

<OfficeSheet
  title={mode === "apply" ? "Apply advance to invoices" : mode === "refund" ? "Refund" : `Payment ${money(payment.amount, payment.currency)}`}
  subtitle={payment.customer ? `${payment.customer.name} · ${payment.customer.customerCode}` : "No customer linked"}
  wide={mode === "apply"}
  {onclose}
>
  {#if notice}<p class="o-notice" role="status">{notice} <a class="o-link" href="/admin/approvals">See approvals</a></p>{/if}

  {#if mode === "view"}
    <dl class="o-meta">
      <div><dt>Received on</dt><dd>{day(payment.paidAt)}</dd></div>
      <div><dt>Customer</dt><dd>{#if payment.customer}<a class="o-link" href={`/admin/customers/${payment.customer.id}`}>{payment.customer.name}</a>{:else}—{/if}</dd></div>
      <div><dt>Paid by</dt><dd>{payment.method ?? "—"}{payment.provider && payment.provider !== "office" ? ` (on the website)` : ""}</dd></div>
      <div><dt>Reference</dt><dd>{payment.transactionId}</dd></div>
      <div><dt>Amount</dt><dd>{money(payment.amount, payment.currency)}{#if foreign}<small>≈ {money(toTaka(payment.amount, payment.exchangeRate))} at ৳{payment.exchangeRate} per {payment.currency}</small>{/if}</dd></div>
      <div><dt>Applied to invoices</dt><dd>{money(payment.allocated, payment.currency)}</dd></div>
      <div><dt>Advance left</dt><dd>{money(payment.unallocated, payment.currency)}</dd></div>
      <div><dt>Refunded</dt><dd>{money(payment.refunded, payment.currency)}</dd></div>
      <div><dt>Status</dt><dd><StatusPill status={pill.status} label={pill.label} /></dd></div>
      <div><dt>Receipt</dt><dd>{#if payment.receiptNumber}<a class="o-link" href={`/receipt/${encodeURIComponent(payment.receiptNumber)}`} target="_blank" rel="noopener">{payment.receiptNumber}</a>{:else}—{/if}</dd></div>
    </dl>

    {#if payment.allocations.length}
      <h3>Invoices this payment paid</h3>
      <ul class="paid">
        {#each payment.allocations as item (item.invoiceId)}
          <li><a class="o-link" href={`/admin/print/invoice/${item.invoiceId}`} target="_blank" rel="noopener">{item.number ?? "Invoice"}</a><b>{money(item.amount, payment.currency)}</b></li>
        {/each}
      </ul>
    {/if}
    {#if payment.unallocated > 0}
      <p class="hint"><b>{money(payment.unallocated, payment.currency)}</b> of this payment is still an <b>advance</b>: the books count it as owed back to the customer until it is applied to an invoice or refunded.</p>
    {/if}
  {:else if mode === "apply"}
    <form id="apply-form" class="o-form" onsubmit={apply}>
      <p class="hint">{money(payment.unallocated, payment.currency)} of this payment is free to apply. Applying it moves the money from the customer's advance to the invoices it pays.</p>
      {#if loading}
        <p class="o-loading">Loading the customer's invoices…</p>
      {:else if loadProblem}
        <p class="o-error" role="alert">{loadProblem}</p>
      {:else if !invoices.length}
        <div class="o-empty"><h3>No unpaid invoices</h3><p>{payment.customer?.name} owes nothing on issued invoices, so the advance stays as it is.</p></div>
      {:else}
        <AllocationBoxes {invoices} currency={payment.currency} available={payment.unallocated} restLabel="Still an advance" bind:amounts />
      {/if}
    </form>
  {:else}
    <form id="refund-form" class="o-form" onsubmit={sendRefund}>
      <p class="hint">
        Up to <b>{money(refundable, payment.currency)}</b> can go back. What is still an advance comes off the advance first; the rest is booked as a refund to the customer.
        {#if !approver}<br />An accountant or the Super Admin has to approve a refund, so this sends them a request.{/if}
      </p>
      <div class="o-fields">
        <label class="o-field">
          <span>Amount to refund ({payment.currency})</span>
          <input type="number" inputmode="decimal" min="0.01" step="0.01" max={refundable} bind:value={refund.amount} required placeholder="0" />
        </label>
        <label class="o-field">
          <span>Paid back by</span>
          <select bind:value={refund.method}>
            {#each METHODS as method (method)}<option value={method}>{method}</option>{/each}
          </select>
        </label>
        <label class="o-field wide">
          <span>Reason</span>
          <textarea bind:value={refund.reason} required maxlength="300" placeholder="Visa refused; the fee is returned"></textarea>
        </label>
      </div>
    </form>
  {/if}

  {#snippet footer()}
    {#if problem}<p class="o-error wide-error" role="alert" use:intoView={problem}>{problem}</p>{/if}
    {#if mode === "view"}
      {#if payment.receiptNumber}<a class="o-btn ghost" href={`/receipt/${encodeURIComponent(payment.receiptNumber)}`} target="_blank" rel="noopener"><ExternalLink size={16} /> Open receipt</a>{/if}
      {#if canRefund}<button type="button" class="o-btn danger" onclick={openRefund}><Undo2 size={16} /> Refund</button>{/if}
      {#if canApply}<button type="button" class="o-btn navy" onclick={openApply}><HandCoins size={16} /> Apply advance to invoices</button>{/if}
      {#if !canApply && !canRefund}<button type="button" class="o-btn ghost" onclick={onclose}>Close</button>{/if}
    {:else}
      <button type="button" class="o-btn ghost" onclick={() => { mode = "view"; problem = ""; }}>Back</button>
      {#if mode === "apply"}
        <button type="submit" form="apply-form" class="o-btn navy" disabled={busy || loading || !invoices.length}>{busy ? "Applying…" : "Apply to invoices"}</button>
      {:else}
        <button type="submit" form="refund-form" class="o-btn danger" disabled={busy}>{busy ? "Sending…" : approver ? "Refund now" : "Ask for approval"}</button>
      {/if}
    {/if}
  {/snippet}
</OfficeSheet>

<style>
  h3 { margin: 1.2rem 0 0.5rem; font-size: 0.95rem; color: #07182f; }
  .paid { display: grid; gap: 0.35rem; margin: 0; padding: 0; list-style: none; }
  .paid li { display: flex; justify-content: space-between; gap: 1rem; padding: 0.55rem 0.75rem; border: 1px solid #e1e6e9; border-radius: 0.6rem; background: #fff; }
  .paid b { font-variant-numeric: tabular-nums; }
  dd small { display: block; margin-top: 0.15rem; color: #6a7585; font-size: 0.78rem; font-weight: 600; }
  .hint { margin: 1rem 0 0; color: #607083; font-size: 0.84rem; line-height: 1.5; }
  form .hint { margin: 0; }
  .wide-error { flex: 1 1 100%; }
</style>
