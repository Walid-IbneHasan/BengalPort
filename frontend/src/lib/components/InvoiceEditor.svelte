<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import {
    bdt,
    blankLine,
    draftFromApplication,
    invoiceBody,
    invoiceProblem,
    invoiceTotals,
    lineAmount,
    type Invoice,
    type InvoiceDraft,
  } from "$lib/invoices";
  import { Plus, Search, Trash2, X } from "lucide-svelte";

  type Owing = { amountDue: number | null; paid: number };
  let { draft: starting, onclose, onsaved }: { draft: InvoiceDraft; onclose: () => void; onsaved: (invoice: Invoice) => void } = $props();

  // The form is created afresh each time it opens, so it starts from the draft
  // it was given and does not follow later changes to it.
  // svelte-ignore state_referenced_locally
  let draft = $state<InvoiceDraft>($state.snapshot(starting));
  let totals = $derived(invoiceTotals(draft.items, draft.paid));
  let error = $state(""), saving = $state(false);

  // Filling the form from an application.
  let search = $state(""), results = $state<any[]>([]), looking = $state(false);
  let timer: ReturnType<typeof setTimeout>;
  let canPick = $derived(!draft.id && !draft.applicationId && !draft.transactionId);
  // What the application it is linked to has received so far.
  let recorded = $state<number | null>(null);

  const owingOf = (id: string) => api<Owing>(`/payments/application/${id}`);

  onMount(async () => {
    if (!draft.applicationId) return;
    try {
      recorded = (await owingOf(draft.applicationId)).paid;
    } catch {
      // The invoice can still be edited by hand.
    }
  });

  function findApplications() {
    clearTimeout(timer);
    const term = search.trim();
    if (term.length < 2) {
      results = [];
      looking = false;
      return;
    }
    looking = true;
    timer = setTimeout(async () => {
      try {
        results = await api<any[]>(`/admin/resources/applications?page=1&pageSize=6&search=${encodeURIComponent(term)}`);
      } catch {
        results = [];
      } finally {
        looking = false;
      }
    }, 250);
  }

  async function pick(application: any) {
    error = "";
    try {
      const owing = await owingOf(application.id);
      draft = draftFromApplication(application, owing, draft.issuedAt);
      recorded = owing.paid;
      results = [];
      search = "";
    } catch (e) {
      error = e instanceof Error ? e.message : "That application could not be read.";
    }
  }

  async function save() {
    error = invoiceProblem(draft);
    if (error) return;
    saving = true;
    try {
      onsaved(
        await api<Invoice>(draft.id ? `/admin/invoices/${draft.id}` : "/admin/invoices", {
          method: draft.id ? "PUT" : "POST",
          body: JSON.stringify(invoiceBody(draft)),
        }),
      );
    } catch (e) {
      error = e instanceof Error ? e.message : "The invoice could not be saved.";
    } finally {
      saving = false;
    }
  }
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && onclose()} />

<div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onclose()}>
  <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="invoice-title">
    <header>
      <div><span>{draft.id ? "EDIT INVOICE" : "NEW INVOICE"}</span><h2 id="invoice-title">{draft.id ? "Correct this invoice" : "Generate an invoice"}</h2></div>
      <button type="button" aria-label="Close" onclick={onclose}><X /></button>
    </header>

    <form novalidate onsubmit={(e) => { e.preventDefault(); save(); }}>
      {#if canPick}
        <div class="picker">
          <label for="invoice-source">Fill in from an application <small>(optional)</small></label>
          <div class="search"><Search size={16} /><input id="invoice-source" bind:value={search} oninput={findApplications} placeholder="Name, phone, email or reference" autocomplete="off" /></div>
          {#if results.length}
            <ul>{#each results as item}<li><button type="button" onclick={() => pick(item)}><b>{item.fullName}</b><span>{item.reference} · {item.type}</span></button></li>{/each}</ul>
          {:else if looking}<p class="hint">Searching…</p>
          {:else if search.trim().length >= 2}<p class="hint">No application matches that.</p>
          {/if}
        </div>
      {/if}

      <div class="grid">
        <div class="field wide"><label for="invoice-customer">Customer name *</label><input id="invoice-customer" bind:value={draft.customerName} maxlength="160" /></div>
        <div class="field"><label for="invoice-phone">Phone</label><input id="invoice-phone" type="tel" bind:value={draft.customerPhone} maxlength="40" /></div>
        <div class="field"><label for="invoice-email">Email</label><input id="invoice-email" type="email" bind:value={draft.customerEmail} maxlength="160" /></div>
        <div class="field wide"><label for="invoice-address">Address</label><input id="invoice-address" bind:value={draft.customerAddress} maxlength="300" /></div>
        <div class="field"><label for="invoice-date">Invoice date *</label><input id="invoice-date" type="date" bind:value={draft.issuedAt} /></div>
        <div class="field"><label for="invoice-due-date">Due date</label><input id="invoice-due-date" type="date" bind:value={draft.dueAt} /></div>
      </div>

      <section class="lines" aria-label="Invoice lines">
        <div class="lines-head"><b>Items</b><span>Quantity × unit price</span></div>
        {#each draft.items as line, index}
          <div class="line">
            <div class="field description"><label for={`invoice-line-${index}`}>Description *</label><input id={`invoice-line-${index}`} bind:value={line.description} maxlength="300" /></div>
            <div class="field"><label for={`invoice-quantity-${index}`}>Qty *</label><input id={`invoice-quantity-${index}`} type="number" min="0.01" step="any" bind:value={line.quantity} /></div>
            <div class="field"><label for={`invoice-price-${index}`}>Unit price (৳) *</label><input id={`invoice-price-${index}`} type="number" min="0" step="any" bind:value={line.unitPrice} /></div>
            <div class="amount"><span>Amount</span><b>{bdt(lineAmount(line))}</b></div>
            <button type="button" class="remove" aria-label={`Remove line ${index + 1}`} disabled={draft.items.length === 1} onclick={() => draft.items.splice(index, 1)}><Trash2 size={15} /></button>
          </div>
        {/each}
        <button type="button" class="add-line" onclick={() => draft.items.push(blankLine())}><Plus size={16} /> Add a line</button>
      </section>

      <div class="field">
        <label for="invoice-paid">Amount paid (৳)</label>
        <input id="invoice-paid" type="number" min="0" step="any" bind:value={draft.paid} />
        {#if recorded !== null}
          <p class="hint">Payments recorded on this application: <b>{bdt(recorded)}</b>.{#if recorded !== totals.paid} <button type="button" class="link" onclick={() => (draft.paid = String(recorded))}>Use this amount</button>{/if}</p>
        {/if}
      </div>

      <div class="field"><label for="invoice-notes">Notes</label><textarea id="invoice-notes" rows="3" bind:value={draft.notes} maxlength="2000" placeholder="Shown on the invoice"></textarea></div>

      {#if error}<p class="problem" role="alert">{error}</p>{/if}

      <footer>
        <dl>
          <div><dt>Total</dt><dd>{bdt(totals.total)}</dd></div>
          <div><dt>Paid</dt><dd>{bdt(totals.paid)}</dd></div>
          <div class="due"><dt>Due</dt><dd>{bdt(totals.due)}</dd></div>
        </dl>
        <div class="buttons">
          <button type="button" class="cancel" onclick={onclose}>Cancel</button>
          <button class="save" disabled={saving}>{saving ? "Saving…" : draft.id ? "Save changes" : "Generate invoice"}</button>
        </div>
      </footer>
    </form>
  </div>
</div>

<style>
  .backdrop{position:fixed;inset:0;z-index:100;display:flex;justify-content:flex-end;background:#061326a8;backdrop-filter:blur(3px)}
  .sheet{width:min(42rem,100vw);height:100%;overflow:auto;background:#f7f8fa;box-shadow:-24px 0 60px #0613263d}
  header{display:flex;align-items:center;justify-content:space-between;padding:1.5rem 1.75rem;background:#07182f;color:#fff}
  header span{font-size:.7rem;font-weight:800;letter-spacing:.14em;color:#d8ae4a}
  header h2{margin:.3rem 0 0;font-size:1.5rem}
  header button{display:grid;place-items:center;width:2.4rem;height:2.4rem;border:0;border-radius:50%;background:#ffffff12;color:#fff;cursor:pointer}
  form{display:grid;gap:1.1rem;padding:1.5rem 1.75rem 0}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:1rem}
  .field{display:grid;gap:.4rem;align-content:start;min-width:0}
  .wide{grid-column:1/-1}
  label{font-size:.72rem;font-weight:800;color:#405066}
  label small{font-weight:500;color:#6f7a87}
  input,textarea{width:100%;min-width:0;border:1px solid #d5dbe1;border-radius:.5rem;background:#fff;padding:.68rem .75rem;outline:none}
  input:focus,textarea:focus{border-color:#c9952d;box-shadow:0 0 0 3px #c9952d1c}
  .picker{display:grid;gap:.4rem;padding:.9rem;border:1px solid #e6cf9a;border-radius:.75rem;background:#fdf8ec}
  .search{display:flex;align-items:center;gap:.5rem;padding-left:.75rem;border:1px solid #d5dbe1;border-radius:.5rem;background:#fff;color:#687485}
  .search input{border:0;padding-left:0;box-shadow:none}
  .picker ul{margin:0;padding:0;list-style:none;border:1px solid #e3e7eb;border-radius:.5rem;background:#fff;overflow:hidden}
  .picker li+li{border-top:1px solid #eaedf0}
  .picker li button{display:block;width:100%;padding:.6rem .75rem;border:0;background:none;color:#17304f;text-align:left;cursor:pointer}
  .picker li span{display:block;margin-top:.1rem;font-size:.75rem;color:#6a7585}
  .hint{margin:0;font-size:.78rem;color:#5d6b7a}
  .link{padding:0;border:0;background:none;color:#8a6417;font-weight:800;text-decoration:underline;cursor:pointer}
  .lines{display:grid;gap:.75rem;padding:.9rem;border-radius:.75rem;background:#edf0f3}
  .lines-head{display:flex;justify-content:space-between;align-items:baseline}
  .lines-head span{font-size:.72rem;color:#6f7a87}
  .line{display:grid;grid-template-columns:minmax(0,1fr) 4.5rem 7rem 6.75rem 2.1rem;gap:.5rem;align-items:end}
  .amount{min-width:0;padding-bottom:.65rem;text-align:right}
  .amount span{display:block;font-size:.72rem;font-weight:800;color:#405066}
  .amount b{font-size:.84rem;white-space:nowrap}
  .remove{display:grid;place-items:center;width:2.1rem;height:2.6rem;border:1px solid #eadada;border-radius:.5rem;background:#fff;color:#a84747;cursor:pointer}
  .remove:disabled{opacity:.4;cursor:not-allowed}
  .add-line{justify-self:start;display:flex;align-items:center;gap:.35rem;padding:.5rem .75rem;border:1px dashed #b7c0c9;border-radius:.5rem;background:#fff;color:#26354a;font-size:.8rem;font-weight:750;cursor:pointer}
  .problem{margin:0;padding:.7rem .85rem;border-radius:.5rem;background:#fff0f0;color:#943d45;font-size:.86rem}
  footer{position:sticky;bottom:0;margin:0 -1.75rem;padding:.9rem 1.75rem;background:#fff;border-top:1px solid #dfe3e7;display:flex;align-items:center;justify-content:space-between;gap:1rem;flex-wrap:wrap}
  dl{display:flex;gap:1.25rem;margin:0}
  dt{font-size:.68rem;font-weight:700;color:#77828f}
  dd{margin:.1rem 0 0;font-size:1rem;font-weight:800;white-space:nowrap}
  .due dd{color:#a87618}
  .buttons{display:flex;gap:.5rem}
  .cancel,.save{padding:.72rem 1rem;border-radius:.55rem;font-weight:800;cursor:pointer}
  .cancel{border:1px solid #d8dde2;background:#fff}
  .save{border:0;background:#d19b2d;color:#07182f}
  .save:disabled{opacity:.55;cursor:not-allowed}
  @media(max-width:58rem){input,textarea{font-size:16px}}
  @media(max-width:36rem){
    header{padding:1.1rem 1.25rem}header h2{font-size:1.25rem}
    form{padding:1.1rem 1.25rem 0}
    footer{margin:0 -1.25rem;padding:.8rem 1.25rem}
    .buttons{width:100%}.cancel,.save{flex:1}
    .grid{grid-template-columns:1fr}
    .line{grid-template-columns:minmax(0,1fr) minmax(0,1fr) 2.1rem;padding-bottom:.75rem;border-bottom:1px solid #d9dfe5}
    .line .description{grid-column:1/-1}
    .line .amount{grid-column:1/3;grid-row:3;padding:0;display:flex;align-items:baseline;justify-content:space-between}
    .line .remove{grid-column:3;grid-row:2}
  }
</style>
