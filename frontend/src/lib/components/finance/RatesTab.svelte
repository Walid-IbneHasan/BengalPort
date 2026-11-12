<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { day, officePermissions, today } from "$lib/office";
  import type { ExchangeRate } from "$lib/finance";
  import { Coins } from "lucide-svelte";

  // Exchange rates: taka for one unit of each currency, by day. A payment
  // or invoice in another currency starts from the latest rate here.
  const FALLBACK_CURRENCIES = ["BDT", "USD", "EUR", "GBP", "MYR"];

  let rates = $state<ExchangeRate[]>([]),
    currencies = $state<string[]>(FALLBACK_CURRENCIES),
    loading = $state(true),
    problem = $state(""),
    form = $state({ currency: "USD", rate: null as number | null, date: "" }),
    saving = $state(false),
    formProblem = $state("");

  const may = (permission: string) => $officePermissions.has(permission);
  // Rates keep up to six decimals (a yen is less than a taka), so not money().
  const rateText = (rate: number) => `৳${Number(rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`;
  let foreign = $derived(currencies.filter((code) => code !== "BDT"));
  // The newest row of each currency is the one new payments use.
  let latestIds = $derived(new Set(foreign.map((code) => rates.filter((row) => row.currency === code).sort((a, b) => b.date.localeCompare(a.date))[0]?.id).filter(Boolean)));

  async function load() {
    loading = true;
    problem = "";
    try {
      rates = await api<ExchangeRate[]>("/office/exchange-rates");
    } catch (e) {
      rates = [];
      problem = problemText(e, "The exchange rates could not be loaded");
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    form.date = today();
    load();
    api<{ currencies?: string[] }>("/office/settings")
      .then((settings) => {
        if (settings?.currencies?.length) currencies = settings.currencies;
        if (!foreign.includes(form.currency)) form.currency = foreign[0] ?? "USD";
      })
      .catch(() => {});
  });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    formProblem = "";
    try {
      // The plain day: the server keeps one rate per currency per day.
      await api("/office/exchange-rates", { method: "POST", body: JSON.stringify(form) });
      toasts.show(`1 ${form.currency} = ৳${form.rate} saved`);
      form = { ...form, rate: null };
      await load();
    } catch (e) {
      formProblem = problemText(e, "The rate was not saved");
    } finally {
      saving = false;
    }
  }
</script>

{#if may("accounts.update")}
  <section class="o-card">
    <h2>Add today's rate</h2>
    <form class="o-form" onsubmit={save}>
      <div class="o-fields three">
        <label class="o-field">
          <span>Currency</span>
          <select bind:value={form.currency}>
            {#each foreign as code (code)}<option value={code}>{code}</option>{/each}
          </select>
        </label>
        <label class="o-field">
          <span>Taka for 1 {form.currency}</span>
          <input type="number" inputmode="decimal" min="0.000001" step="any" bind:value={form.rate} required placeholder="e.g. 122.50" />
        </label>
        <label class="o-field"><span>Date</span><input type="date" bind:value={form.date} required /></label>
      </div>
      <p class="hint">Saving a rate for a day that already has one replaces it. Payments already recorded keep the rate they were made at.</p>
      {#if formProblem}<p class="o-error" role="alert" use:intoView={formProblem}>{formProblem}</p>{/if}
      <div class="o-form-actions"><button type="submit" class="o-btn navy" disabled={saving}>{saving ? "Saving…" : "Save rate"}</button></div>
    </form>
  </section>
{/if}

<section class="list" aria-labelledby="rates-title">
  <h2 id="rates-title" class="o-section-title">Saved rates</h2>
  {#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}
  {#if loading}
    <p class="o-loading">Loading rates…</p>
  {:else if !rates.length && !problem}
    <div class="o-card o-empty"><Coins size={28} /><h3>No rates saved yet</h3><p>Add the day's rate for each currency customers pay in. Payments in that currency then start from it.</p></div>
  {:else if rates.length}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead><tr><th>Currency</th><th class="num">Taka for 1 unit</th><th>Date</th><th><span class="o-sr">In use</span></th></tr></thead>
        <tbody>
          {#each rates as row (row.id)}
            <tr>
              <td class="lead" data-label="Currency"><b>{row.currency}</b></td>
              <td class="num" data-label="Taka for 1 unit">{rateText(row.rate)}</td>
              <td data-label="Date">{day(row.date)}</td>
              <td data-label="">{#if latestIds.has(row.id)}<span class="o-pill good">Latest</span>{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</section>

<style>
  .three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .hint { margin: 0; color: #607083; font-size: 0.82rem; line-height: 1.45; }
  .list { margin-top: 1.4rem; }
  @media (max-width: 40rem) { .three { grid-template-columns: 1fr; } }
</style>
