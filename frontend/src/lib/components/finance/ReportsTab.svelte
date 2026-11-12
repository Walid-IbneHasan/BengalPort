<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { downloadFile } from "$lib/office-files";
  import { day, money, officePermissions, today } from "$lib/office";
  import { AGING, PERIODS, periodRange, REPORTS, round2, type Branch, type MoneyAccount, type PeriodKey } from "$lib/finance";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import { CircleCheck, Download, TriangleAlert } from "lucide-svelte";

  // The reports: profit and loss, balance sheet, cash flow, trial balance,
  // what customers owe and the bills still to pay. All figures are in taka.
  let { report, onreport }: { report: string; onreport: (key: string) => void } = $props();

  type Row = { id?: string; code: string; name: string; amount: number };
  type ProfitLoss = { income: Row[]; expense: Row[]; totalIncome: number; totalExpense: number; net: number };
  type BalanceSheet = { assets: Row[]; liabilities: Row[]; equity: Row[]; totalAssets: number; totalLiabilities: number; totalEquity: number; balanced: boolean };
  type CashFlow = { opening: number; inflows: { name: string; amount: number }[]; outflows: { name: string; amount: number }[]; totalIn: number; totalOut: number; net: number; closing: number };
  type TrialBalance = { rows: { id?: string; code: string; name: string; type: string; debit: number; credit: number }[]; totalDebit: number; totalCredit: number };
  type Receivable = { id: string; number: string; customer: { id?: string; customerCode?: string; name: string | null }; dueAt: string | null; currency: string; due: number; dueBase: number; status: string };
  type Receivables = { rows: Receivable[]; buckets: Record<(typeof AGING)[number]["key"] | "total", number> };
  type Bill = { id: string; date: string; description: string; customer: string | null; total: number; paymentStatus: string; category: { name: string } | null };
  type Payables = { rows: Bill[]; total: number };

  let current = $derived(REPORTS.some((item) => item.key === report) ? report : "profit-and-loss");
  let periodKey = $state<PeriodKey>("this-month"),
    from = $state(""),
    to = $state(""),
    branchId = $state(""),
    branches = $state<Branch[]>([]),
    loading = $state(true),
    problem = $state(""),
    csvProblem = $state(""),
    pl = $state<ProfitLoss | null>(null),
    bs = $state<BalanceSheet | null>(null),
    cf = $state<CashFlow | null>(null),
    tb = $state<TrialBalance | null>(null),
    ar = $state<Receivables | null>(null),
    ap = $state<Payables | null>(null),
    moneyAccounts = $state<MoneyAccount[]>([]),
    paying = $state<Bill | null>(null),
    payAccount = $state(""),
    payBusy = $state(false),
    payProblem = $state("");

  const may = (permission: string) => $officePermissions.has(permission);
  let usesPeriod = $derived(["profit-and-loss", "balance-sheet", "cash-flow", "trial-balance"].includes(current));
  let asOf = $derived(current === "balance-sheet" || current === "trial-balance");
  let usesBranch = $derived(branches.length > 1 && (current === "profit-and-loss" || current === "balance-sheet"));
  let exportable = $derived(may("accounts.export") && (current === "profit-and-loss" || current === "trial-balance"));
  let asked = 0;

  function choosePeriod(key: PeriodKey) {
    periodKey = key;
    if (key === "custom") return;
    const range = periodRange(key, today());
    from = range.from;
    to = range.to;
  }

  onMount(() => {
    choosePeriod("this-month");
    api<Branch[]>("/office/branches").then((list) => (branches = list.filter((branch) => branch.active))).catch(() => (branches = []));
  });

  // A report is fetched again whenever it, its dates or its branch change.
  $effect(() => {
    current;
    from;
    to;
    branchId;
    if (!to) return;
    untrack(load);
  });

  async function load() {
    const ask = ++asked;
    loading = true;
    problem = "";
    const query = (fields: Record<string, string>) => new URLSearchParams(Object.entries(fields).filter(([, value]) => value)).toString();
    const branch = usesBranch ? branchId : "";
    // A slower answer to an older question is thrown away.
    const fetchKept = async <T>(path: string, keep: (data: T) => void) => {
      const data = await api<T>(path);
      if (ask === asked) keep(data);
    };
    try {
      if (current === "profit-and-loss") await fetchKept<ProfitLoss>(`/office/reports/profit-and-loss?${query({ from, to, branchId: branch })}`, (data) => (pl = data));
      else if (current === "balance-sheet") await fetchKept<BalanceSheet>(`/office/reports/balance-sheet?${query({ to, branchId: branch })}`, (data) => (bs = data));
      else if (current === "cash-flow") await fetchKept<CashFlow>(`/office/reports/cash-flow?${query({ from, to })}`, (data) => (cf = data));
      else if (current === "trial-balance") await fetchKept<TrialBalance>(`/office/reports/trial-balance?${query({ to })}`, (data) => (tb = data));
      else if (current === "receivables") await fetchKept<Receivables>("/office/reports/receivables", (data) => (ar = data));
      else {
        await fetchKept<Payables>("/office/reports/payables", (data) => (ap = data));
        if (!moneyAccounts.length) api<MoneyAccount[]>("/office/money-accounts").then((list) => (moneyAccounts = list)).catch(() => {});
      }
    } catch (e) {
      if (ask === asked) problem = problemText(e, "The report could not be loaded");
    } finally {
      if (ask === asked) loading = false;
    }
  }

  let periodText = $derived(asOf ? `As of ${day(`${to}T12:00:00+06:00`)}` : `${day(`${from}T12:00:00+06:00`)} to ${day(`${to}T12:00:00+06:00`)}`);
  let receivables = $derived(ar ? [...ar.rows].sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999")) : []);

  async function exportCsv() {
    csvProblem = "";
    try {
      if (current === "trial-balance") await downloadFile(`/office/reports/export/trial-balance?to=${to}`, `trial-balance-${to}.csv`);
      else await downloadFile(`/office/reports/export/profit-and-loss?from=${from}&to=${to}`, `profit-and-loss-${from}-to-${to}.csv`);
    } catch (e) {
      csvProblem = problemText(e, "The file could not be downloaded");
    }
  }

  function startPay(bill: Bill) {
    payProblem = "";
    payAccount = "";
    paying = bill;
  }

  async function pay(event: SubmitEvent) {
    event.preventDefault();
    if (!paying) return;
    payBusy = true;
    payProblem = "";
    try {
      await api(`/admin/accounts/${paying.id}/pay`, { method: "POST", body: JSON.stringify({ moneyAccount: payAccount || undefined }) });
      toasts.show(`Paid: ${paying.description}`);
      paying = null;
      await load();
    } catch (e) {
      payProblem = problemText(e, "The bill was not marked paid");
    } finally {
      payBusy = false;
    }
  }
</script>

{#snippet lines(rows: Row[], empty: string, totalLabel: string, total: number)}
  {#if rows.length}
    <dl class="o-meta">
      {#each rows as row (row.code)}<div><dt><span class="code">{row.code}</span> {row.name}</dt><dd class:negative={row.amount < 0}>{money(row.amount)}</dd></div>{/each}
      <div class="total"><dt>{totalLabel}</dt><dd>{money(total)}</dd></div>
    </dl>
  {:else}
    <p class="o-muted">{empty}</p>
  {/if}
{/snippet}

<nav class="o-tabs sub wide-only" aria-label="Which report">
  {#each REPORTS as item (item.key)}
    <button class:active={current === item.key} aria-pressed={current === item.key} onclick={() => onreport(item.key)}>{item.label}</button>
  {/each}
</nav>
<label class="o-field phone-only">
  <span>Report</span>
  <select value={current} onchange={(event) => onreport(event.currentTarget.value)}>
    {#each REPORTS as item (item.key)}<option value={item.key}>{item.label}</option>{/each}
  </select>
</label>

{#if usesPeriod}
  <div class="o-toolbar period">
    <div class="presets" role="group" aria-label="Period">
      {#each PERIODS as item (item.key)}
        <button type="button" class="o-btn ghost small" class:on={periodKey === item.key} aria-pressed={periodKey === item.key} onclick={() => choosePeriod(item.key)}>{item.label}</button>
      {/each}
    </div>
    {#if periodKey === "custom"}
      {#if !asOf}<label class="date"><span>From</span><input type="date" class="o-select" bind:value={from} max={to || undefined} /></label>{/if}
      <label class="date"><span>{asOf ? "As of" : "To"}</span><input type="date" class="o-select" bind:value={to} min={asOf ? undefined : from || undefined} /></label>
    {/if}
    {#if usesBranch}
      <select class="o-select" bind:value={branchId} aria-label="Branch">
        <option value="">All branches</option>
        {#each branches as branch (branch.id)}<option value={branch.id}>{branch.name}</option>{/each}
      </select>
    {/if}
    {#if exportable}
      <button type="button" class="o-btn ghost small csv" onclick={exportCsv}><Download size={15} /> Download CSV</button>
    {/if}
  </div>
  {#if csvProblem}<p class="o-error" role="alert" use:intoView={csvProblem}>{csvProblem}</p>{/if}
  <p class="o-muted when">{periodText}</p>
{/if}

{#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}

{#if loading}
  <p class="o-loading">Loading the report…</p>
{:else if current === "profit-and-loss" && pl}
  <div class="o-stats">
    <div class="o-stat"><span>Income</span><b>{money(pl.totalIncome)}</b></div>
    <div class="o-stat"><span>Expenses</span><b>{money(pl.totalExpense)}</b></div>
    <div class="o-stat dark"><span>{pl.net >= 0 ? "Net profit" : "Net loss"}</span><b>{money(Math.abs(pl.net))}</b><small>Income less expenses</small></div>
  </div>
  <div class="o-grid-2">
    <section class="o-card"><h2>Income</h2>{@render lines(pl.income, "No income in this period.", "Total income", pl.totalIncome)}</section>
    <section class="o-card"><h2>Expenses</h2>{@render lines(pl.expense, "No expenses in this period.", "Total expenses", pl.totalExpense)}</section>
  </div>
  <p class="hint">Income counts when it is earned: when a deal is completed. Money received before then is not yet income; it waits as deferred revenue or as the customer's advance.</p>
{:else if current === "balance-sheet" && bs}
  <div class="o-grid-3">
    <section class="o-card"><h2>Assets</h2><p class="what">What the company has and is owed</p>{@render lines(bs.assets, "No assets yet.", "Total assets", bs.totalAssets)}</section>
    <section class="o-card"><h2>Liabilities</h2><p class="what">What it owes</p>{@render lines(bs.liabilities, "Nothing owed.", "Total liabilities", bs.totalLiabilities)}</section>
    <section class="o-card"><h2>Equity</h2><p class="what">What belongs to the owners</p>{@render lines(bs.equity, "No equity yet.", "Total equity", bs.totalEquity)}</section>
  </div>
  {#if bs.balanced}
    <p class="o-notice check"><CircleCheck size={18} aria-hidden="true" /> Balanced: assets {money(bs.totalAssets)} = liabilities {money(bs.totalLiabilities)} + equity {money(bs.totalEquity)}.</p>
  {:else}
    <p class="o-error check" role="alert"><TriangleAlert size={18} aria-hidden="true" /> Not balanced: assets are {money(bs.totalAssets)} but liabilities and equity come to {money(round2(bs.totalLiabilities + bs.totalEquity))}. Please tell the accountant.</p>
  {/if}
  <p class="hint">“Current earnings” is the profit or loss so far. Customer advances and deferred revenue are liabilities: money received for work not yet done, owed back if it is never done.</p>
{:else if current === "cash-flow" && cf}
  <div class="o-stats">
    <div class="o-stat"><span>At the start</span><b>{money(cf.opening)}</b></div>
    <div class="o-stat"><span>Money in</span><b>{money(cf.totalIn)}</b></div>
    <div class="o-stat"><span>Money out</span><b>{money(cf.totalOut)}</b></div>
    <div class="o-stat dark"><span>At the end</span><b>{money(cf.closing)}</b><small>{cf.net >= 0 ? "Up" : "Down"} {money(Math.abs(cf.net))}</small></div>
  </div>
  <div class="o-grid-2">
    <section class="o-card">
      <h2>Money in, by where it came from</h2>
      {#if cf.inflows.length}<dl class="o-meta">{#each cf.inflows as row (row.name)}<div><dt>{row.name}</dt><dd>{money(row.amount)}</dd></div>{/each}</dl>{:else}<p class="o-muted">No money came in.</p>{/if}
    </section>
    <section class="o-card">
      <h2>Money out, by what it was for</h2>
      {#if cf.outflows.length}<dl class="o-meta">{#each cf.outflows as row (row.name)}<div><dt>{row.name}</dt><dd>{money(row.amount)}</dd></div>{/each}</dl>{:else}<p class="o-muted">No money went out.</p>{/if}
    </section>
  </div>
  <p class="hint">Cash in hand, the bank, bKash and Nagad together. Moving money between them is not counted as in or out.</p>
{:else if current === "trial-balance" && tb}
  <p class="hint top">Every account's balance on one list. <b>Debit</b> balances are what the company has and spends (assets, expenses); <b>credit</b> balances are where the money came from (liabilities, equity, income). When the two totals are equal, the books add up.</p>
  {#if tb.rows.length}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead><tr><th>Code</th><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>
        <tbody>
          {#each tb.rows as row (row.code)}
            <tr>
              <td data-label="Code">{row.code}</td>
              <td class="lead" data-label="Account">{row.name}</td>
              <td class="num" data-label="Debit">{row.debit ? money(row.debit) : "—"}</td>
              <td class="num" data-label="Credit">{row.credit ? money(row.credit) : "—"}</td>
            </tr>
          {/each}
          <tr class="total">
            <td data-label=""></td>
            <td class="lead" data-label="">Total</td>
            <td class="num" data-label="Debit">{money(tb.totalDebit)}</td>
            <td class="num" data-label="Credit">{money(tb.totalCredit)}</td>
          </tr>
        </tbody>
      </table>
    </div>
    {#if Math.round(tb.totalDebit * 100) === Math.round(tb.totalCredit * 100)}
      <p class="o-notice check"><CircleCheck size={18} aria-hidden="true" /> Debits equal credits.</p>
    {:else}
      <p class="o-error check" role="alert"><TriangleAlert size={18} aria-hidden="true" /> Debits and credits differ by {money(Math.abs(round2(tb.totalDebit - tb.totalCredit)))}. Please tell the accountant.</p>
    {/if}
  {:else}
    <div class="o-card o-empty"><h3>Nothing posted yet</h3><p>Invoices, payments and Hisab Kitab entries post here by themselves.</p></div>
  {/if}
{:else if current === "receivables" && ar}
  <div class="o-stats">
    {#each AGING as bucket (bucket.key)}
      <div class="o-stat"><span>{bucket.label}</span><b>{money(ar.buckets[bucket.key])}</b><small>{bucket.hint}</small></div>
    {/each}
    <div class="o-stat dark"><span>Customers owe</span><b>{money(ar.buckets.total)}</b><small>{ar.rows.length} invoice{ar.rows.length === 1 ? "" : "s"}</small></div>
  </div>
  <p class="hint top">What customers still owe on issued invoices, by how far past the due date it is. Totals are in taka at each invoice's rate.</p>
  {#if receivables.length}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead><tr><th>Invoice</th><th>Customer</th><th>Due date</th><th class="num">Still owed</th><th>Status</th></tr></thead>
        <tbody>
          {#each receivables as row (row.id)}
            <tr>
              <td class="lead" data-label="Invoice"><a class="o-link" href={`/admin/print/invoice/${row.id}`}>{row.number}</a></td>
              <td data-label="Customer">{#if row.customer.id}<a class="o-link" href={`/admin/customers/${row.customer.id}`}>{row.customer.name}</a>{:else}{row.customer.name ?? "—"}{/if}{#if row.customer.customerCode}<small>{row.customer.customerCode}</small>{/if}</td>
              <td data-label="Due date">{day(row.dueAt)}</td>
              <td class="num" data-label="Still owed"><b>{money(row.due, row.currency)}</b>{#if row.currency !== "BDT"}<small>≈ {money(row.dueBase)}</small>{/if}</td>
              <td data-label="Status"><StatusPill status={row.status} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="o-card o-empty"><CircleCheck size={28} /><h3>Nobody owes anything</h3><p>Every issued invoice is paid.</p></div>
  {/if}
{:else if current === "payables" && ap}
  <div class="o-stats">
    <div class="o-stat dark"><span>Bills still to pay</span><b>{money(ap.total)}</b><small>{ap.rows.length} bill{ap.rows.length === 1 ? "" : "s"}</small></div>
  </div>
  <p class="hint top">Expenses entered in Hisab Kitab as due or pending. “Mark paid” takes the money out of the account you choose.</p>
  {#if ap.rows.length}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead><tr><th>Date</th><th>What for</th><th>Paid to</th><th class="num">Amount</th><th>Status</th><th><span class="o-sr">Actions</span></th></tr></thead>
        <tbody>
          {#each ap.rows as bill (bill.id)}
            <tr>
              <td data-label="Date">{day(bill.date)}</td>
              <td class="lead" data-label="What for"><b>{bill.description}</b>{#if bill.category}<small>{bill.category.name}</small>{/if}</td>
              <td data-label="Paid to">{bill.customer || "—"}</td>
              <td class="num" data-label="Amount"><b>{money(bill.total)}</b></td>
              <td data-label="Status"><StatusPill status={bill.paymentStatus === "DUE" ? "OVERDUE" : "PENDING"} label={bill.paymentStatus === "DUE" ? "Due" : "Pending"} /></td>
              <td data-label="" class="row-actions">{#if may("hisab.create")}<button class="o-btn ghost small" onclick={() => startPay(bill)}>Mark paid</button>{/if}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="o-card o-empty"><CircleCheck size={28} /><h3>No unpaid bills</h3><p>Expenses entered in Hisab Kitab as “Not paid yet” show here until they are paid.</p></div>
  {/if}
{/if}

{#if paying}
  <OfficeSheet title="Mark the bill paid" subtitle={`${paying.description} · ${money(paying.total)}`} onclose={() => (paying = null)}>
    <form id="pay-form" class="o-form" onsubmit={pay}>
      <label class="o-field">
        <span>Paid from</span>
        <select bind:value={payAccount}>
          <option value="">Cash in hand</option>
          {#each moneyAccounts.filter((account) => account.code !== "1000") as account (account.id)}<option value={account.id}>{account.name} ({account.code})</option>{/each}
        </select>
        <span class="hint">The money leaves this account today and the bill is no longer owed.</span>
      </label>
    </form>
    {#snippet footer()}
      {#if payProblem}<p class="o-error wide-error" role="alert" use:intoView={payProblem}>{payProblem}</p>{/if}
      <button type="button" class="o-btn ghost" onclick={() => (paying = null)}>Cancel</button>
      <button type="submit" form="pay-form" class="o-btn navy" disabled={payBusy}>{payBusy ? "Saving…" : "Mark paid"}</button>
    {/snippet}
  </OfficeSheet>
{/if}

<style>
  .sub { background: #edf0f3; }
  .phone-only { display: none; margin-bottom: 1rem; }
  .period { margin-bottom: 0.4rem; }
  .presets { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  .presets .on { background: #07182f; color: #fff; box-shadow: none; }
  .date { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 750; color: #405066; }
  .csv { margin-left: auto; }
  .when { margin: 0 0 1rem; font-size: 0.84rem; }
  .what { margin: -0.6rem 0 0.7rem; color: #6a7686; font-size: 0.8rem; }
  .code { display: inline-block; min-width: 2.6rem; color: #8a94a1; font-size: 0.76rem; font-variant-numeric: tabular-nums; }
  .total { border-top: 2px solid #d5dbe1; }
  .total dt, .total dd { font-weight: 800; color: #07182f; }
  tr.total td { background: #f6f7f8; font-weight: 800; }
  .negative { color: #a3302a; }
  .check { display: flex; align-items: flex-start; gap: 0.5rem; margin: 1rem 0 0; }
  .hint { margin: 1rem 0 0; color: #607083; font-size: 0.84rem; line-height: 1.5; max-width: 52rem; }
  .hint.top { margin: 0 0 1rem; }
  .row-actions { text-align: right; white-space: nowrap; }
  .o-toolbar select { max-width: 100%; }
  .wide-error { flex: 1 1 100%; }
  @media (max-width: 40rem) {
    .wide-only { display: none; }
    .phone-only { display: grid; }
    .csv { margin-left: 0; }
  }
  @media (max-width: 48rem) {
    .row-actions { justify-content: flex-end; }
  }
</style>
