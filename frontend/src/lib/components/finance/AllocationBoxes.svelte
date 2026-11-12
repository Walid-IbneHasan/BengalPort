<script lang="ts">
  import { day, money } from "$lib/office";
  import { allocationSummary, fillOldestFirst, type OpenInvoice } from "$lib/finance";
  import StatusPill from "$lib/components/StatusPill.svelte";

  // A customer's unpaid invoices with a box each for how much of the money
  // goes to it. The server only lets a payment pay invoices in its own
  // currency, so invoices in another currency are shown without a box.
  let {
    invoices,
    currency,
    available,
    amounts = $bindable({}),
    restLabel = "Kept as advance",
    disabled = false,
  }: {
    invoices: OpenInvoice[];
    currency: string;
    available: number;
    amounts?: Record<string, number | null | undefined>;
    restLabel?: string;
    disabled?: boolean;
  } = $props();

  let payable = $derived(invoices.filter((invoice) => invoice.currency === currency));
  let summary = $derived(allocationSummary(available, Object.fromEntries(payable.map((invoice) => [invoice.id, amounts[invoice.id]]))));

  function fill() {
    const filled = fillOldestFirst(available, payable);
    amounts = Object.fromEntries(Object.entries(filled).map(([id, amount]) => [id, amount || null]));
  }
</script>

<div class="alloc">
  <div class="head">
    <p>Unpaid invoices, oldest first. Type how much of this money goes to each.</p>
    <button type="button" class="o-btn ghost small" onclick={fill} disabled={disabled || !payable.length || available <= 0}>Fill oldest first</button>
  </div>
  <ul>
    {#each invoices as invoice (invoice.id)}
      <li class:other={invoice.currency !== currency}>
        <div class="what">
          <span class="line">
            <a class="o-link" href={`/admin/print/invoice/${invoice.id}`} target="_blank" rel="noopener">{invoice.number}</a>
            <StatusPill status={invoice.status} />
          </span>
          <small>Owes {money(invoice.due, invoice.currency)} of {money(invoice.total, invoice.currency)}{invoice.dueAt ? ` · due ${day(invoice.dueAt)}` : ""}</small>
        </div>
        {#if invoice.currency === currency}
          <label class="box">
            <span>Pay now <small>({invoice.currency})</small></span>
            <input type="number" inputmode="decimal" min="0" step="0.01" max={invoice.due} placeholder="0" bind:value={amounts[invoice.id]} {disabled} aria-label={`Amount for ${invoice.number}`} />
          </label>
        {:else}
          <small class="note">In {invoice.currency}. Record a {invoice.currency} payment to pay this one.</small>
        {/if}
      </li>
    {/each}
  </ul>
  <p class="sum" aria-live="polite">Applied <b>{money(summary.applied, currency)}</b> · {restLabel} <b>{money(summary.rest, currency)}</b></p>
  {#if summary.over}<p class="o-error" role="alert">That is more than the {money(available, currency)} there is to share out. Lower an amount.</p>{/if}
</div>

<style>
  .alloc { display: grid; gap: 0.7rem; }
  .head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem; }
  .head p { margin: 0; flex: 1 1 14rem; color: #607083; font-size: 0.84rem; line-height: 1.45; }
  ul { display: grid; gap: 0.5rem; margin: 0; padding: 0; list-style: none; }
  li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem 1rem; padding: 0.7rem 0.8rem; border: 1px solid #e1e6e9; border-radius: 0.7rem; background: #fff; }
  li.other { background: #f6f7f8; }
  .what { display: grid; gap: 0.2rem; min-width: 0; flex: 1 1 12rem; }
  .line { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; }
  .what small, .note { color: #6a7585; font-size: 0.78rem; overflow-wrap: anywhere; }
  .note { flex: 1 1 10rem; text-align: right; }
  .box { display: grid; gap: 0.25rem; width: 9.5rem; max-width: 100%; }
  .box span { font-size: 0.72rem; font-weight: 800; color: #405066; }
  .box span small { font-weight: 600; color: #7a8593; }
  .box input { width: 100%; min-height: 2.6rem; padding: 0.5rem 0.65rem; border: 1px solid #d5dbe1; border-radius: 0.6rem; background: #fff; font: inherit; text-align: right; font-variant-numeric: tabular-nums; }
  .box input:focus { outline: none; border-color: #c9952d; box-shadow: 0 0 0 3px #c9952d1f; }
  .sum { margin: 0; padding: 0.65rem 0.8rem; border-radius: 0.65rem; background: #fdf9ef; color: #6f5418; font-size: 0.88rem; }
  .sum b { color: #07182f; font-variant-numeric: tabular-nums; }
  @media (max-width: 40rem) {
    .box { width: 100%; }
    .note { text-align: left; }
  }
  @media (max-width: 58rem) { .box input { font-size: 16px; } }
</style>
