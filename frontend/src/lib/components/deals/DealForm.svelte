<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { money, officeMe } from "$lib/office";
  import { blankDealItem, dealBody, dealItemsTotal, dealLineAmount, type DealDraft } from "$lib/deals";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import OfficeCustomerPicker from "$lib/components/OfficeCustomerPicker.svelte";
  import ServiceLineSelect from "./ServiceLineSelect.svelte";
  import { Plus, Trash2 } from "lucide-svelte";

  // The deal form, new or changed: the customer, the services and their
  // prices, the timeline, what each side commits to and the terms.
  let { draft: starting, onclose, onsaved }: { draft: DealDraft; onclose: () => void; onsaved: (deal: { id: string }) => void } = $props();

  type Staff = { id: string; name: string; role: string };
  type Branch = { id: string; name: string; active: boolean };

  // The form starts from the draft it was given and does not follow later
  // changes to it: it is created afresh each time it opens.
  // svelte-ignore state_referenced_locally
  let draft = $state<DealDraft>($state.snapshot(starting) as DealDraft);
  let currencies = $state<string[]>(["BDT", "USD", "EUR", "GBP", "MYR"]),
    lines = $state<string[]>([]),
    staff = $state<Staff[]>([]),
    branches = $state<Branch[]>([]),
    saving = $state(false),
    formProblem = $state("");
  let total = $derived(dealItemsTotal(draft.items));
  let editing = $derived(Boolean(draft.id));

  onMount(() => {
    api<{ invoiceTerms?: string; currencies?: string[] }>("/office/settings")
      .then((settings) => {
        if (settings?.currencies?.length) currencies = settings.currencies;
        // A new deal starts with the office's standard terms.
        if (!draft.id && !draft.terms.trim() && settings?.invoiceTerms) draft.terms = settings.invoiceTerms;
      })
      .catch(() => {});
    api<string[]>("/office/lookups/service-line").then((list) => (lines = list)).catch(() => (lines = []));
    api<Staff[]>("/office/staff").then((list) => (staff = list)).catch(() => (staff = []));
    api<Branch[]>("/office/branches").then((list) => (branches = list)).catch(() => (branches = []));
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    formProblem = "";
    try {
      const body = JSON.stringify(dealBody(draft));
      const saved = draft.id ? await api<{ id: string }>(`/office/deals/${draft.id}`, { method: "PUT", body }) : await api<{ id: string }>("/office/deals", { method: "POST", body });
      onsaved(saved);
    } catch (e) {
      formProblem = problemText(e, draft.id ? "The deal was not saved" : "The deal was not added");
    } finally {
      saving = false;
    }
  }
</script>

<OfficeSheet
  wide
  title={editing ? "Change the deal" : "New deal"}
  subtitle={editing ? "The customer stays the same. Invoices already made keep their own copy." : "What the customer has agreed to: the services, the price and who does what by when."}
  {onclose}
>
  <form id="deal-form" class="o-form" onsubmit={save}>
    <div class="o-fields">
      <div class="wide"><OfficeCustomerPicker bind:customer={draft.customer} label="Customer" required locked={editing} /></div>
      <label class="o-field wide"><span>Deal title</span><input bind:value={draft.title} required maxlength="200" placeholder="Garments sourcing from Gazipur" /></label>
      <div class="o-field">
        <span><label for="deal-service-line">Service line <small>(optional)</small></label></span>
        <ServiceLineSelect id="deal-service-line" bind:value={draft.serviceLine} bind:lines />
      </div>
      <label class="o-field">
        <span>Currency</span>
        <select bind:value={draft.currency}>
          {#each currencies as code (code)}<option value={code}>{code}</option>{/each}
          {#if !currencies.includes(draft.currency)}<option value={draft.currency}>{draft.currency}</option>{/if}
        </select>
        {#if draft.currency !== "BDT"}<small class="hint">Prices are in {draft.currency}. The exchange rate is asked for when an invoice is made.</small>{/if}
      </label>
      <label class="o-field wide"><span>Description <small>(optional)</small></span><textarea bind:value={draft.description} maxlength="4000" placeholder="What the work is, in a sentence or two"></textarea></label>
    </div>

    <section class="items" aria-labelledby="deal-items-title">
      <div class="items-head"><h3 id="deal-items-title">Services</h3><span>Quantity × unit price ({draft.currency})</span></div>
      {#each draft.items as item, index (index)}
        <div class="item">
          <label class="o-field description"><span>Service</span><input bind:value={item.description} required maxlength="300" placeholder="Factory visits and quality checks" /></label>
          <div class="o-field line">
            <span><label for={`deal-item-line-${index}`}>Service line</label></span>
            <ServiceLineSelect id={`deal-item-line-${index}`} bind:value={item.serviceLine} bind:lines />
          </div>
          <label class="o-field qty"><span>Qty</span><input type="number" min="0.01" step="any" bind:value={item.quantity} required /></label>
          <label class="o-field price"><span>Unit price</span><input type="number" min="0" step="any" bind:value={item.unitPrice} required /></label>
          <div class="amount"><span>Amount</span><b>{money(dealLineAmount(item), draft.currency)}</b></div>
          <button type="button" class="remove" aria-label={`Remove service ${index + 1}`} disabled={draft.items.length === 1} onclick={() => draft.items.splice(index, 1)}><Trash2 size={16} /></button>
        </div>
      {/each}
      <div class="items-foot">
        <button type="button" class="o-btn ghost small" onclick={() => draft.items.push(blankDealItem(draft.serviceLine))}><Plus size={16} /> Add a service</button>
        <p class="total">Total <b>{money(total, draft.currency)}</b></p>
      </div>
    </section>

    <div class="o-fields">
      <label class="o-field"><span>Start date <small>(optional)</small></span><input type="date" bind:value={draft.startDate} /></label>
      <label class="o-field"><span>End date <small>(optional)</small></span><input type="date" bind:value={draft.endDate} min={draft.startDate || undefined} /></label>
      <label class="o-field wide"><span>What Bengal Port commits to <small>(optional)</small></span><textarea bind:value={draft.companyCommitments} maxlength="4000" placeholder="One per line, e.g. Shortlist three factories within two weeks"></textarea></label>
      <label class="o-field wide"><span>What the client commits to <small>(optional)</small></span><textarea bind:value={draft.clientCommitments} maxlength="4000" placeholder="One per line, e.g. Send product samples by 20 November"></textarea></label>
      <label class="o-field wide">
        <span>Terms</span>
        <textarea class="terms" bind:value={draft.terms} maxlength="6000"></textarea>
        <small class="hint">Cancellation, refunds and additional charges. Printed on the agreement and on invoices made from this deal.</small>
      </label>
      {#if $officeMe?.role !== "EMPLOYEE"}
        <label class="o-field">
          <span>Given to</span>
          <select bind:value={draft.assignedToId}>
            <option value="">{editing ? "Nobody" : "Whoever looks after the customer"}</option>
            {#each staff as person (person.id)}<option value={person.id}>{person.name}</option>{/each}
          </select>
        </label>
      {/if}
      {#if branches.length > 1}
        <label class="o-field">
          <span>Branch</span>
          <select bind:value={draft.branchId}>
            <option value="">{editing ? "No branch" : "The customer's branch"}</option>
            {#each branches as branch (branch.id)}<option value={branch.id}>{branch.name}</option>{/each}
          </select>
        </label>
      {/if}
    </div>
  </form>
  {#snippet footer()}
    {#if formProblem}<p class="o-error wide-error" role="alert" use:intoView={formProblem}>{formProblem}</p>{/if}
    <button type="button" class="o-btn ghost" onclick={onclose}>Cancel</button>
    <button type="submit" form="deal-form" class="o-btn navy" disabled={saving}>{saving ? "Saving…" : editing ? "Save deal" : "Add deal"}</button>
  {/snippet}
</OfficeSheet>

<style>
  .items { display: grid; gap: 0.75rem; padding: 0.9rem; border-radius: 0.75rem; background: #edf0f3; }
  .items-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0.3rem 1rem; }
  .items-head h3 { margin: 0; font-size: 0.95rem; color: #07182f; }
  .items-head span { font-size: 0.76rem; color: #6a7686; }
  .item { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(0, 1fr) 4.5rem 7rem 7rem 2.5rem; gap: 0.5rem; align-items: end; padding-bottom: 0.75rem; border-bottom: 1px solid #d9dfe5; }
  .amount { min-width: 0; padding-bottom: 0.7rem; text-align: right; }
  .amount span { display: block; font-size: 0.76rem; font-weight: 800; color: #405066; }
  .amount b { font-size: 0.86rem; white-space: nowrap; }
  .remove { display: grid; place-items: center; width: 2.5rem; height: 2.75rem; border: 1px solid #eadada; border-radius: 0.6rem; background: #fff; color: #a3302a; cursor: pointer; }
  .remove:disabled { opacity: 0.4; cursor: not-allowed; }
  .remove:focus-visible { outline: 3px solid #d19b2d; outline-offset: 2px; }
  .items-foot { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem; }
  .total { margin: 0; color: #405066; font-size: 0.9rem; }
  .total b { margin-left: 0.4rem; font-size: 1.1rem; color: #07182f; white-space: nowrap; }
  .terms { min-height: 7rem; }
  .wide-error { flex: 1 1 100%; }
  @media (max-width: 52rem) {
    .item { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 2.5rem; }
    .item .description, .item .line { grid-column: 1 / -1; }
    .item .qty { grid-column: 1; }
    .item .price { grid-column: 2 / -1; }
    .item .amount { grid-column: 1 / 3; padding: 0; display: flex; align-items: baseline; justify-content: space-between; }
    .item .remove { grid-column: 3; }
  }
</style>
