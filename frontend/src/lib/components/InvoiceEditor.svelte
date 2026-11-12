<script lang="ts">
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { officePermissions } from "$lib/office";
  import {
    blankLine,
    dealNumberOf,
    draftFromApplication,
    invoiceBody,
    invoiceMoney,
    invoiceProblem,
    invoiceTotals,
    latestRate,
    lineAmount,
    type Invoice,
    type InvoiceDraft,
  } from "$lib/invoices";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import OfficeCustomerPicker, { type PickedCustomer } from "$lib/components/OfficeCustomerPicker.svelte";
  import { Plus, Search, Trash2 } from "lucide-svelte";

  // The invoice form: a new invoice or a draft (saved, or issued at once),
  // or an issued invoice being revised, which keeps the old version and
  // saves this one as the next.
  type Owing = { amountDue: number | null; paid: number };
  type Rate = { currency: string; rate: number; date: string };
  let { draft: starting, onclose, onsaved }: { draft: InvoiceDraft; onclose: () => void; onsaved: (invoice: Invoice) => void } = $props();

  // The form is created afresh each time it opens, so it starts from the draft
  // it was given and does not follow later changes to it.
  // svelte-ignore state_referenced_locally
  let draft = $state<InvoiceDraft>({ customer: null, dealId: null, currency: "BDT", exchangeRate: "1", startDate: "", endDate: "", companyCommitments: "", clientCommitments: "", terms: "", ...($state.snapshot(starting) as InvoiceDraft) });
  let revising = $derived(draft.state === "ISSUED");
  let currency = $derived(draft.currency || "BDT");
  let totals = $derived(invoiceTotals(draft.items, draft.paid, revising ? draft.credited : 0));
  let error = $state(""),
    saving = $state<"" | "draft" | "issue" | "revise">(""),
    reason = $state("");
  let currencies = $state<string[]>(["BDT", "USD", "EUR", "GBP", "MYR"]),
    rates = $state<Rate[]>([]);

  const may = (permission: string) => $officePermissions.has(permission);
  // Money already received only belongs on an invoice made from Hisab Kitab
  // income or from an application. Office invoices are paid under
  // Collections, which keeps this figure up to date by itself.
  // svelte-ignore state_referenced_locally
  const showPaid = !revising && Boolean(draft.applicationId || draft.transactionId || Number(draft.paid) > 0);
  let mayIssue = $derived(draft.id ? may("invoices.update") : may("invoices.create"));

  // Filling the form from an application.
  let search = $state(""),
    results = $state<any[]>([]),
    looking = $state(false);
  let timer: ReturnType<typeof setTimeout>;
  let canPick = $derived(!draft.id && !draft.applicationId && !draft.transactionId && !draft.dealId && may("applications.read"));
  // What the application it is linked to has received so far.
  let recorded = $state<number | null>(null);

  const owingOf = (id: string) => api<Owing>(`/payments/application/${id}`);

  onMount(() => {
    api<{ invoiceTerms?: string; currencies?: string[] }>("/office/settings")
      .then((settings) => {
        if (settings?.currencies?.length) currencies = settings.currencies;
        // A new invoice starts with the office's standard terms.
        if (!draft.id && !draft.terms?.trim() && settings?.invoiceTerms) draft.terms = settings.invoiceTerms;
      })
      .catch(() => {});
    api<Rate[]>("/office/exchange-rates")
      .then((list) => {
        rates = list;
        if (currency !== "BDT" && !(Number(draft.exchangeRate) > 0)) draft.exchangeRate = String(latestRate(list, currency) ?? "");
      })
      .catch(() => {});
    if (draft.applicationId)
      owingOf(draft.applicationId)
        .then((owing) => (recorded = owing.paid))
        .catch(() => {
          // The invoice can still be edited by hand.
        });
  });

  // Another currency is billed at the latest saved rate, which staff can change.
  function currencyChanged() {
    draft.exchangeRate = currency === "BDT" ? "1" : String(latestRate(rates, currency) ?? "");
  }

  // Choosing a customer fills in their details; they stay editable.
  function picked(customer: PickedCustomer | null) {
    if (!customer) return;
    draft.customerName = customer.name;
    draft.customerPhone = customer.phone ?? "";
    draft.customerEmail = customer.email ?? "";
    draft.customerAddress = customer.address ?? "";
  }

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
      const filled = draftFromApplication(application, owing, draft.issuedAt);
      // The application brings its applicant, its fee and what was paid;
      // the rest of the form stays as it was.
      Object.assign(draft, {
        customerName: filled.customerName,
        customerPhone: filled.customerPhone,
        customerEmail: filled.customerEmail,
        items: filled.items,
        paid: filled.paid,
        applicationId: filled.applicationId,
      });
      recorded = owing.paid;
      results = [];
      search = "";
    } catch (e) {
      error = problemText(e, "That application could not be read.");
    }
  }

  const body = () => JSON.stringify(invoiceBody(draft));

  async function saveDraft() {
    error = invoiceProblem(draft);
    if (error) return;
    saving = "draft";
    try {
      onsaved(await api<Invoice>(draft.id ? `/admin/invoices/${draft.id}` : "/admin/invoices", { method: draft.id ? "PUT" : "POST", body: body() }));
    } catch (e) {
      error = problemText(e, "The invoice could not be saved.");
    } finally {
      saving = "";
    }
  }

  // Issued: numbered for good, posted to the accounts and signed with the
  // authority signature when the person issuing may use it.
  async function issue() {
    error = invoiceProblem(draft);
    if (error) return;
    saving = "issue";
    let stored = false;
    try {
      if (!draft.id) {
        onsaved(await api<Invoice>("/admin/invoices", { method: "POST", body: JSON.stringify({ ...invoiceBody(draft), issue: true }) }));
        return;
      }
      // The draft's changes are saved first, then it is issued as saved.
      await api<Invoice>(`/admin/invoices/${draft.id}`, { method: "PUT", body: body() });
      stored = true;
      onsaved(await api<Invoice>(`/admin/invoices/${draft.id}/issue`, { method: "POST" }));
    } catch (e) {
      error = problemText(e, stored ? "The invoice was not issued. Your changes to the draft are saved." : "The invoice was not issued.");
    } finally {
      saving = "";
    }
  }

  async function revise() {
    error = invoiceProblem(draft);
    if (error) return;
    saving = "revise";
    try {
      onsaved(await api<Invoice>(`/admin/invoices/${draft.id}/revise`, { method: "POST", body: JSON.stringify({ ...invoiceBody(draft), reason }) }));
    } catch (e) {
      error = problemText(e, "The new version was not saved.");
    } finally {
      saving = "";
    }
  }

  let heading = $derived(revising ? `Revise ${draft.number ?? "the invoice"}` : draft.id ? `Edit draft ${draft.number ?? ""}`.trim() : "New invoice");
  let subtitle = $derived(
    revising
      ? `Saved as version ${(draft.version ?? 1) + 1}. Version ${draft.version ?? 1} is kept, with your reason.`
      : draft.id
        ? "A draft can be changed freely until it is issued."
        : "Save it as a draft to check later, or issue it now.",
  );
</script>

<OfficeSheet wide title={heading} {subtitle} {onclose}>
  <form id="invoice-form" class="o-form" novalidate onsubmit={(event) => { event.preventDefault(); if (revising) revise(); else saveDraft(); }}>
    {#if canPick}
      <div class="picker">
        <label class="o-field" for="invoice-source"><span>Fill in from an application <small>(optional)</small></span></label>
        <label class="o-search"><Search size={16} /><input id="invoice-source" bind:value={search} oninput={findApplications} placeholder="Name, phone, email or reference" autocomplete="off" /></label>
        {#if results.length}
          <ul>{#each results as item (item.id)}<li><button type="button" onclick={() => pick(item)}><b>{item.fullName}</b><span>{item.reference} · {item.type}</span></button></li>{/each}</ul>
        {:else if looking}<p class="hint">Searching…</p>
        {:else if search.trim().length >= 2}<p class="hint">No application matches that.</p>
        {/if}
      </div>
    {/if}

    {#if draft.deal || draft.dealId}
      <p class="o-notice from-deal">
        Made from deal
        {#if draft.deal}<a class="o-link" href={`/admin/deals/${draft.deal.id}`}>{dealNumberOf(draft.deal.number)} {draft.deal.title}</a>{:else}<a class="o-link" href={`/admin/deals/${draft.dealId}`}>this deal</a>{/if}.
        It stays with the deal's customer.
      </p>
    {/if}

    <div class="o-fields">
      {#if may("customers.read") || draft.customer}
        <div class="wide">
          <OfficeCustomerPicker bind:customer={draft.customer} label="Customer from the customer list (optional)" locked={Boolean(draft.dealId) || revising || !may("customers.read")} onpick={picked} />
        </div>
      {/if}
      <label class="o-field wide"><span>Name on the invoice *</span><input bind:value={draft.customerName} maxlength="160" /></label>
      <label class="o-field"><span>Phone</span><input type="tel" bind:value={draft.customerPhone} maxlength="40" /></label>
      <label class="o-field"><span>Email</span><input type="email" bind:value={draft.customerEmail} maxlength="160" /></label>
      <label class="o-field wide"><span>Address</span><input bind:value={draft.customerAddress} maxlength="300" /></label>
      <label class="o-field">
        <span>Currency</span>
        <select bind:value={draft.currency} onchange={currencyChanged}>
          {#each currencies as code (code)}<option value={code}>{code}</option>{/each}
          {#if !currencies.includes(currency)}<option value={currency}>{currency}</option>{/if}
        </select>
      </label>
      {#if currency !== "BDT"}
        <label class="o-field">
          <span>Exchange rate (taka for 1 {currency}) *</span>
          <input type="number" min="0.000001" step="any" bind:value={draft.exchangeRate} />
          <small class="hint">The accounts keep the invoice in taka at this rate.</small>
        </label>
      {:else}
        <span class="spacer" aria-hidden="true"></span>
      {/if}
      <label class="o-field"><span>Invoice date *</span><input type="date" bind:value={draft.issuedAt} /></label>
      <label class="o-field"><span>Due date <small>(optional)</small></span><input type="date" bind:value={draft.dueAt} min={draft.issuedAt || undefined} /></label>
      <label class="o-field"><span>Work starts <small>(optional)</small></span><input type="date" bind:value={draft.startDate} /></label>
      <label class="o-field"><span>Work ends <small>(optional)</small></span><input type="date" bind:value={draft.endDate} min={draft.startDate || undefined} /></label>
    </div>

    <section class="lines" aria-labelledby="invoice-lines-title">
      <div class="lines-head"><h3 id="invoice-lines-title">Services</h3><span>Quantity × unit price ({currency})</span></div>
      {#each draft.items as line, index (index)}
        <div class="line">
          <label class="o-field description"><span>Description *</span><input bind:value={line.description} maxlength="300" /></label>
          <label class="o-field"><span>Qty *</span><input type="number" min="0.01" step="any" bind:value={line.quantity} /></label>
          <label class="o-field"><span>Unit price *</span><input type="number" min="0" step="any" bind:value={line.unitPrice} /></label>
          <div class="amount"><span>Amount</span><b>{invoiceMoney(lineAmount(line), currency)}</b></div>
          <button type="button" class="remove" aria-label={`Remove line ${index + 1}`} disabled={draft.items.length === 1} onclick={() => draft.items.splice(index, 1)}><Trash2 size={16} /></button>
        </div>
      {/each}
      <button type="button" class="o-btn ghost small add-line" onclick={() => draft.items.push(blankLine())}><Plus size={16} /> Add a line</button>
    </section>

    <div class="o-fields">
      {#if showPaid}
        <label class="o-field wide">
          <span>Amount already paid ({currency})</span>
          <input type="number" min="0" step="any" bind:value={draft.paid} />
          {#if recorded !== null}
            <small class="hint">Payments recorded on this application: <b>{invoiceMoney(recorded)}</b>.{#if recorded !== totals.paid} <button type="button" class="link" onclick={() => (draft.paid = String(recorded))}>Use this amount</button>{/if}</small>
          {:else}
            <small class="hint">Money already received in Hisab Kitab for this bill.</small>
          {/if}
        </label>
      {/if}
      <label class="o-field wide"><span>What Bengal Port commits to <small>(optional)</small></span><textarea bind:value={draft.companyCommitments} maxlength="4000"></textarea></label>
      <label class="o-field wide"><span>What the client commits to <small>(optional)</small></span><textarea bind:value={draft.clientCommitments} maxlength="4000"></textarea></label>
      <label class="o-field wide"><span>Terms <small>(cancellation, refunds, additional charges)</small></span><textarea class="terms" bind:value={draft.terms} maxlength="6000"></textarea></label>
      <label class="o-field wide"><span>Notes <small>(shown on the invoice)</small></span><textarea bind:value={draft.notes} maxlength="2000"></textarea></label>
      {#if revising}
        <label class="o-field wide reason">
          <span>Reason for the change *</span>
          <textarea bind:value={reason} maxlength="500" placeholder="The customer added a second factory visit"></textarea>
          <small class="hint">Kept with the old version, so anyone can see why it changed.</small>
        </label>
      {/if}
      {#if !revising && mayIssue}<p class="explain-phone wide">After issuing, the invoice can't be edited; changes become a new version.</p>{/if}
    </div>
  </form>

  {#snippet footer()}
    <dl class="totals">
      <div><dt>Total</dt><dd>{invoiceMoney(totals.total, currency)}</dd></div>
      {#if revising && draft.credited}<div><dt>Credited</dt><dd>{invoiceMoney(draft.credited, currency)}</dd></div>{/if}
      <div><dt>Paid</dt><dd>{invoiceMoney(totals.paid, currency)}</dd></div>
      <div class="due"><dt>Due</dt><dd>{invoiceMoney(totals.due, currency)}</dd></div>
    </dl>
    {#if !revising && mayIssue}<p class="explain">After issuing, the invoice can't be edited; changes become a new version.</p>{/if}
    {#if error}<p class="o-error wide-error" role="alert" use:intoView={error}>{error}</p>{/if}
    <button type="button" class="o-btn ghost foot" onclick={onclose}>Cancel</button>
    {#if revising}
      <button type="submit" form="invoice-form" class="o-btn navy foot" disabled={!!saving}>{saving === "revise" ? "Saving…" : `Save as version ${(draft.version ?? 1) + 1}`}</button>
    {:else}
      <button type="submit" form="invoice-form" class="o-btn ghost foot" disabled={!!saving}>{saving === "draft" ? "Saving…" : "Save draft"}</button>
      {#if mayIssue}<button type="button" class="o-btn navy foot" disabled={!!saving} onclick={issue}>{saving === "issue" ? "Issuing…" : "Issue invoice"}</button>{/if}
    {/if}
  {/snippet}
</OfficeSheet>

<style>
  .picker { display: grid; gap: 0.45rem; padding: 0.9rem; border: 1px solid #e6cf9a; border-radius: 0.75rem; background: #fdf8ec; }
  .picker ul { margin: 0; padding: 0; list-style: none; border: 1px solid #e3e7eb; border-radius: 0.6rem; background: #fff; overflow: hidden; }
  .picker li + li { border-top: 1px solid #eaedf0; }
  .picker li button { display: block; width: 100%; min-height: 2.75rem; padding: 0.6rem 0.75rem; border: 0; background: none; color: #17304f; font: inherit; text-align: left; cursor: pointer; }
  .picker li button:focus-visible { outline: 3px solid #d19b2d; outline-offset: -3px; }
  .picker li span { display: block; margin-top: 0.1rem; font-size: 0.78rem; color: #6a7585; }
  .hint { margin: 0; font-size: 0.78rem; color: #5d6b7a; }
  .from-deal { margin: 0; }
  .spacer { display: block; }
  .link { padding: 0; border: 0; background: none; color: #8a6417; font: inherit; font-weight: 800; text-decoration: underline; cursor: pointer; }
  .lines { display: grid; gap: 0.75rem; padding: 0.9rem; border-radius: 0.75rem; background: #edf0f3; }
  .lines-head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 0.3rem 1rem; }
  .lines-head h3 { margin: 0; font-size: 0.95rem; color: #07182f; }
  .lines-head span { font-size: 0.76rem; color: #6a7686; }
  .line { display: grid; grid-template-columns: minmax(0, 1fr) 5rem 8rem 8rem 2.5rem; gap: 0.5rem; align-items: end; }
  .amount { min-width: 0; padding-bottom: 0.7rem; text-align: right; }
  .amount span { display: block; font-size: 0.76rem; font-weight: 800; color: #405066; }
  .amount b { font-size: 0.86rem; white-space: nowrap; }
  .remove { display: grid; place-items: center; width: 2.5rem; height: 2.75rem; border: 1px solid #eadada; border-radius: 0.6rem; background: #fff; color: #a3302a; cursor: pointer; }
  .remove:disabled { opacity: 0.4; cursor: not-allowed; }
  .remove:focus-visible { outline: 3px solid #d19b2d; outline-offset: 2px; }
  .add-line { justify-self: start; }
  .terms { min-height: 7rem; }
  .reason textarea { border-color: #e2c27a; }
  .totals { display: flex; flex-wrap: wrap; gap: 0.4rem 1.25rem; margin: 0 auto 0 0; align-self: center; }
  .totals dt { font-size: 0.7rem; font-weight: 700; color: #77828f; }
  .totals dd { margin: 0.1rem 0 0; font-size: 1rem; font-weight: 800; white-space: nowrap; color: #07182f; }
  .totals .due dd { color: #a87618; }
  .explain { flex: 1 1 100%; margin: 0; font-size: 0.8rem; color: #5d6b7a; text-align: right; }
  .wide-error { flex: 1 1 100%; }
  .explain-phone { display: none; }
  @media (max-width: 40rem) {
    .spacer { display: none; }
    /* The footer stays small on a phone, so the form has room: totals on
       one line, the buttons side by side, the note about issuing in the form. */
    .totals { flex: 1 1 100%; gap: 0.3rem 1rem; }
    .totals dd { font-size: 0.92rem; }
    .explain { display: none; }
    .explain-phone { display: block; margin: 0; font-size: 0.8rem; color: #5d6b7a; }
    .foot { flex: 1 1 0 !important; min-width: 0; padding-inline: 0.45rem; font-size: 0.82rem; }
    .line { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 2.5rem; padding-bottom: 0.75rem; border-bottom: 1px solid #d9dfe5; }
    .line .description { grid-column: 1 / -1; }
    .line .amount { grid-column: 1 / 3; grid-row: 3; padding: 0; display: flex; align-items: baseline; justify-content: space-between; }
    .line .remove { grid-column: 3; grid-row: 2; }
  }
</style>
