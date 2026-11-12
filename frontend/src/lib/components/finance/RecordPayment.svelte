<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { money, today } from "$lib/office";
  import { allocationList, allocationSummary, amountOf, dayToSend, latestRate, METHODS, moneyCodeFor, toTaka, type ExchangeRate, type MoneyAccount, type OfficePayment, type OpenInvoice } from "$lib/finance";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import OfficeCustomerPicker, { type PickedCustomer } from "$lib/components/OfficeCustomerPicker.svelte";
  import AllocationBoxes from "./AllocationBoxes.svelte";
  import { CircleCheck, ExternalLink } from "lucide-svelte";

  // Money a customer pays at the office, in any currency, shared out between
  // their unpaid invoices; whatever is not shared out waits as an advance.
  let {
    startCustomer = null,
    startInvoiceId = null,
    accounts,
    currencies,
    rates,
    onclose,
    onsaved,
  }: {
    startCustomer?: PickedCustomer | null;
    startInvoiceId?: string | null;
    accounts: MoneyAccount[];
    currencies: string[];
    rates: ExchangeRate[];
    onclose: () => void;
    onsaved: (payment: OfficePayment) => void;
  } = $props();

  type Form = { amount: number | null; currency: string; exchangeRate: number | null; method: string; moneyAccount: string; reference: string; date: string; notes: string };
  const blank = (): Form => ({ amount: null, currency: "BDT", exchangeRate: null, method: "Cash", moneyAccount: accountFor("Cash"), reference: "", date: today(), notes: "" });

  let customer = $state<PickedCustomer | null>(null),
    form = $state<Form>({ amount: null, currency: "BDT", exchangeRate: null, method: "Cash", moneyAccount: "", reference: "", date: "", notes: "" }),
    accountChosen = $state(false),
    invoices = $state<OpenInvoice[]>([]),
    amounts = $state<Record<string, number | null | undefined>>({}),
    loadingInvoices = $state(false),
    invoicesProblem = $state(""),
    notice = $state(""),
    saving = $state(false),
    problem = $state(""),
    saved = $state<OfficePayment | null>(null);

  // The account the server would use for this method, so the choice shows.
  function accountFor(method: string) {
    return accounts.find((account) => account.code === moneyCodeFor(method))?.id ?? "";
  }

  let amount = $derived(amountOf(form.amount));
  let foreign = $derived(form.currency !== "BDT");
  let payable = $derived(invoices.filter((invoice) => invoice.currency === form.currency));
  let summary = $derived(allocationSummary(amount, Object.fromEntries(payable.map((invoice) => [invoice.id, amounts[invoice.id]]))));
  let otherCurrencies = $derived([...new Set(invoices.map((invoice) => invoice.currency).filter((code) => code !== form.currency))]);
  let currencyChoices = $derived([...new Set(["BDT", ...currencies, form.currency])]);

  onMount(() => {
    form = blank();
    if (startCustomer) pick(startCustomer, startInvoiceId);
  });

  async function pick(next: PickedCustomer | null, invoiceId: string | null = null) {
    customer = next;
    invoices = [];
    amounts = {};
    invoicesProblem = "";
    notice = "";
    if (!next) return;
    loadingInvoices = true;
    try {
      const list = await api<OpenInvoice[]>(`/office/customers/${next.id}/open-invoices`);
      // Another customer was chosen while these were on their way.
      if (customer?.id !== next.id) return;
      invoices = list;
      // Paying one invoice: its currency, and the whole of what it still owes.
      if (invoiceId) {
        const invoice = invoices.find((row) => row.id === invoiceId);
        if (invoice) {
          setCurrency(invoice.currency, invoice.exchangeRate);
          form.amount = invoice.due;
          amounts = { [invoice.id]: invoice.due };
        } else notice = "That invoice has nothing left to pay. The customer's other unpaid invoices are below.";
      }
    } catch (e) {
      invoicesProblem = problemText(e, "The customer's invoices could not be loaded");
    } finally {
      loadingInvoices = false;
    }
  }

  // A new currency brings the latest saved rate; amounts on invoices in
  // another currency are dropped, as the server would refuse them.
  function setCurrency(code: string, fallbackRate: number | null = null) {
    form.currency = code;
    form.exchangeRate = code === "BDT" ? null : latestRate(rates, code) ?? fallbackRate;
    amounts = Object.fromEntries(Object.entries(amounts).filter(([id]) => invoices.find((invoice) => invoice.id === id)?.currency === code));
  }

  function setMethod(method: string) {
    form.method = method;
    if (!accountChosen) form.moneyAccount = accountFor(method);
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!customer) {
      problem = "Choose the customer who paid.";
      return;
    }
    saving = true;
    problem = "";
    try {
      const payment = await api<OfficePayment>("/office/payments", {
        method: "POST",
        body: JSON.stringify({
          customerId: customer.id,
          amount: form.amount,
          currency: form.currency,
          exchangeRate: foreign ? form.exchangeRate : 1,
          method: form.method,
          moneyAccount: form.moneyAccount || null,
          reference: form.reference,
          date: dayToSend(form.date, today()),
          notes: form.notes,
          allocations: allocationList(Object.fromEntries(payable.map((invoice) => [invoice.id, amounts[invoice.id]]))),
        }),
      });
      saved = payment;
      toasts.show(`Payment of ${money(payment.amount, payment.currency)} recorded`);
      onsaved(payment);
    } catch (e) {
      problem = problemText(e, "The payment was not recorded");
    } finally {
      saving = false;
    }
  }

  function another() {
    saved = null;
    problem = "";
    accountChosen = false;
    form = blank();
    pick(customer);
  }
</script>

<OfficeSheet title={saved ? "Payment recorded" : "Record a payment"} subtitle={saved ? "" : "Money received at the office: cash, bank, bKash, Nagad, card or cheque."} wide {onclose}>
  {#if saved}
    <div class="done">
      <CircleCheck size={34} aria-hidden="true" />
      <h3>{money(saved.amount, saved.currency)} from {saved.customer?.name ?? "the customer"}</h3>
      {#if saved.receiptNumber}<p>Receipt number <b>{saved.receiptNumber}</b></p>{/if}
      <dl class="o-meta">
        <div><dt>Applied to invoices</dt><dd>{money(saved.allocated, saved.currency)}{saved.allocations.length ? ` (${saved.allocations.map((item) => item.number).filter(Boolean).join(", ")})` : ""}</dd></div>
        <div><dt>Kept as advance</dt><dd>{money(saved.unallocated, saved.currency)}</dd></div>
        {#if saved.currency !== "BDT"}<div><dt>In the books</dt><dd>{money(toTaka(saved.amount, saved.exchangeRate))} at ৳{saved.exchangeRate} per {saved.currency}</dd></div>{/if}
      </dl>
      {#if saved.receiptNumber}
        <a class="o-btn navy" href={`/receipt/${encodeURIComponent(saved.receiptNumber)}`} target="_blank" rel="noopener"><ExternalLink size={16} /> Open receipt</a>
      {/if}
    </div>
  {:else}
    <form id="payment-form" class="o-form" onsubmit={save}>
      <OfficeCustomerPicker bind:customer label="Customer who paid" required onpick={(next) => pick(next)} />
      <div class="o-fields">
        <label class="o-field">
          <span>Amount received</span>
          <input type="number" inputmode="decimal" min="0.01" step="0.01" bind:value={form.amount} required placeholder="0" />
        </label>
        <label class="o-field">
          <span>Currency</span>
          <select value={form.currency} onchange={(event) => setCurrency(event.currentTarget.value)}>
            {#each currencyChoices as code (code)}<option value={code}>{code === "BDT" ? "BDT (taka)" : code}</option>{/each}
          </select>
        </label>
        {#if foreign}
          <label class="o-field wide">
            <span>Exchange rate</span>
            <input type="number" inputmode="decimal" min="0.000001" step="any" bind:value={form.exchangeRate} required placeholder="e.g. 122.50" />
            <span class="hint">
              Taka for 1 {form.currency}{latestRate(rates, form.currency) ? `; the latest saved rate is filled in` : ""}. The books are kept in taka.
              {#if amount && amountOf(form.exchangeRate)} This payment is <b>{money(toTaka(amount, amountOf(form.exchangeRate)))}</b>.{/if}
            </span>
          </label>
        {/if}
        <label class="o-field">
          <span>Paid by</span>
          <select value={form.method} onchange={(event) => setMethod(event.currentTarget.value)}>
            {#each METHODS as method (method)}<option value={method}>{method}</option>{/each}
          </select>
        </label>
        <label class="o-field">
          <span>Money went into</span>
          <select bind:value={form.moneyAccount} onchange={() => (accountChosen = true)}>
            <option value="">The usual account for this method</option>
            {#each accounts as account (account.id)}<option value={account.id}>{account.name} ({account.code})</option>{/each}
          </select>
        </label>
        <label class="o-field">
          <span>Reference <small>(optional)</small></span>
          <input bind:value={form.reference} maxlength="100" placeholder="Transaction ID or cheque number" />
        </label>
        <label class="o-field">
          <span>Date received</span>
          <input type="date" bind:value={form.date} required />
        </label>
        <label class="o-field wide">
          <span>Notes <small>(optional)</small></span>
          <input bind:value={form.notes} maxlength="500" placeholder="What the money is for, e.g. visa processing fee" />
        </label>
      </div>

      {#if customer}
        <section class="invoices" aria-label="Apply to invoices">
          <h3>Apply to invoices</h3>
          {#if notice}<p class="o-notice">{notice}</p>{/if}
          {#if loadingInvoices}
            <p class="o-loading">Loading the customer's invoices…</p>
          {:else if invoicesProblem}
            <p class="o-error" role="alert">{invoicesProblem}</p>
          {:else if !invoices.length}
            <p class="o-muted">{customer.name} has no unpaid invoices, so the whole amount is kept as an advance.</p>
          {:else}
            <AllocationBoxes {invoices} currency={form.currency} available={amount} bind:amounts />
            {#if otherCurrencies.length && !payable.length}
              <p class="o-muted small">These invoices are in {otherCurrencies.join(", ")}. Change the currency above to pay them.</p>
            {/if}
          {/if}
          <p class="hint">Money not applied to an invoice is kept as the customer's <b>advance</b>. Until it is applied or refunded, the books count it as money owed back to the customer.</p>
        </section>
      {/if}
    </form>
  {/if}
  {#snippet footer()}
    {#if saved}
      <button type="button" class="o-btn ghost" onclick={another}>Record another</button>
      <button type="button" class="o-btn navy" onclick={onclose}>Done</button>
    {:else}
      {#if problem}<p class="o-error wide-error" role="alert" use:intoView={problem}>{problem}</p>{/if}
      <button type="button" class="o-btn ghost" onclick={onclose}>Cancel</button>
      <button type="submit" form="payment-form" class="o-btn navy" disabled={saving || summary.over}>{saving ? "Saving…" : "Record payment"}</button>
    {/if}
  {/snippet}
</OfficeSheet>

<style>
  .invoices { display: grid; gap: 0.7rem; padding-top: 0.4rem; border-top: 1px solid #e1e6e9; }
  h3 { margin: 0.6rem 0 0; font-size: 1rem; color: #07182f; }
  .hint { margin: 0; color: #6a7585; font-size: 0.8rem; line-height: 1.45; }
  .small { margin: 0; font-size: 0.82rem; }
  .done { display: grid; justify-items: center; gap: 0.6rem; padding: 1rem 0; text-align: center; color: #17704b; }
  .done h3 { margin: 0; font-size: 1.15rem; }
  .done p { margin: 0; color: #405066; }
  .done .o-meta { width: 100%; max-width: 30rem; margin: 0.6rem 0; color: #25384d; text-align: left; }
  .wide-error { flex: 1 1 100%; }
</style>
