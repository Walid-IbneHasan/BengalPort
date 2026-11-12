<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { dateInput, day, fromDateInput, money, officePermissions, today } from "$lib/office";
  import { amountOf, budgetLineState, endOfDay, groupAccounts, wholeMonth, type Branch, type Budget, type LedgerAccount } from "$lib/finance";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import { Pencil, PiggyBank, Plus, Trash2 } from "lucide-svelte";

  // Budgets: how much is planned for each kind of income and expense over a
  // period, against what has really been booked so far.
  type Line = { accountId: string; amount: number | null };
  type Draft = { id?: string; name: string; periodStart: string; periodEnd: string; branchId: string; lines: Line[] };

  let budgets = $state<Budget[]>([]),
    accounts = $state<LedgerAccount[]>([]),
    branches = $state<Branch[]>([]),
    loading = $state(true),
    problem = $state(""),
    draft = $state<Draft | null>(null),
    saving = $state(false),
    formProblem = $state("");

  const may = (permission: string) => $officePermissions.has(permission);
  // Budgets are set for income and expense accounts only.
  let choices = $derived(groupAccounts(accounts.filter((account) => account.active || draft?.lines.some((line) => line.accountId === account.id)), ["INCOME", "EXPENSE"]));
  const branchName = (id: string | null) => (id ? branches.find((branch) => branch.id === id)?.name ?? "One branch" : "All branches");

  async function load() {
    loading = true;
    problem = "";
    try {
      budgets = await api<Budget[]>("/office/budgets");
    } catch (e) {
      budgets = [];
      problem = problemText(e, "The budgets could not be loaded");
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    load();
    api<LedgerAccount[]>("/office/ledger-accounts").then((list) => (accounts = list)).catch(() => (accounts = []));
    api<Branch[]>("/office/branches").then((list) => (branches = list)).catch(() => (branches = []));
  });

  function add() {
    formProblem = "";
    const month = wholeMonth(today());
    draft = { name: "", periodStart: month.from, periodEnd: month.to, branchId: "", lines: [{ accountId: "", amount: null }] };
  }

  function edit(budget: Budget) {
    formProblem = "";
    draft = {
      id: budget.id,
      name: budget.name,
      periodStart: dateInput(budget.periodStart),
      periodEnd: dateInput(budget.periodEnd),
      branchId: budget.branchId ?? "",
      lines: budget.lines.map((line) => ({ accountId: line.accountId, amount: line.budget })),
    };
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!draft) return;
    saving = true;
    formProblem = "";
    const body = JSON.stringify({
      name: draft.name,
      periodStart: fromDateInput(draft.periodStart),
      // The last day counts in full.
      periodEnd: endOfDay(draft.periodEnd),
      branchId: draft.branchId || null,
      lines: draft.lines.filter((line) => line.accountId).map((line) => ({ accountId: line.accountId, amount: amountOf(line.amount) })),
    });
    try {
      if (draft.id) await api(`/office/budgets/${draft.id}`, { method: "PUT", body });
      else await api("/office/budgets", { method: "POST", body });
      toasts.show(draft.id ? "Budget saved" : "Budget added");
      draft = null;
      await load();
    } catch (e) {
      formProblem = problemText(e, "The budget was not saved");
    } finally {
      saving = false;
    }
  }
</script>

<div class="o-toolbar">
  <p class="o-muted intro">Plan what each kind of expense may cost and what income should come in, then watch the bars fill as the books do. An expense bar turns amber at 90 % and red once over.</p>
  {#if may("accounts.create")}<button type="button" class="o-btn small" onclick={add}><Plus size={16} /> New budget</button>{/if}
</div>

{#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}

{#if loading}
  <p class="o-loading">Loading budgets…</p>
{:else if !budgets.length && !problem}
  <div class="o-card o-empty">
    <PiggyBank size={28} />
    <h3>No budgets yet</h3>
    <p>{may("accounts.create") ? "Add one with “New budget”: a month or a year, and an amount for each kind of income or expense." : "Budgets the accountant sets will show here."}</p>
  </div>
{:else}
  {#each budgets as budget (budget.id)}
    <section class="o-card budget">
      <div class="head">
        <div>
          <h2>{budget.name}</h2>
          <p class="o-muted">{day(budget.periodStart)} to {day(budget.periodEnd)} · {branchName(budget.branchId)}</p>
        </div>
        {#if may("accounts.update")}<button type="button" class="o-btn ghost small" onclick={() => edit(budget)} aria-label={`Edit the budget ${budget.name}`}><Pencil size={15} /> Edit</button>{/if}
      </div>
      <ul class="lines">
        {#each budget.lines as line (line.accountId)}
          {@const state = budgetLineState(line.type, line.budget, line.actual)}
          <li>
            <div class="top"><b>{line.name}</b><span class="figures">{money(line.actual)} <small>of {money(line.budget)}</small></span></div>
            <div class="bar" role="img" aria-label={`${state.used}% ${line.type === "INCOME" ? "of the target" : "of the budget"}`}><i class={state.tone} style:width={`${state.width}%`}></i></div>
            <div class="bottom">
              <small>{line.type === "INCOME" ? "Income" : "Expense"} · {state.used}% {line.type === "INCOME" ? "of target" : "used"}</small>
              <small class={`gap ${state.tone}`}>{state.text.lead} {money(state.text.amount)}</small>
            </div>
          </li>
        {/each}
      </ul>
    </section>
  {/each}
{/if}

{#if draft}
  <OfficeSheet title={draft.id ? "Edit budget" : "New budget"} subtitle="What is planned for each income and expense account over the period." wide onclose={() => (draft = null)}>
    <form id="budget-form" class="o-form" onsubmit={save}>
      <div class="o-fields">
        <label class="o-field wide"><span>Name</span><input bind:value={draft.name} required maxlength="120" placeholder="December 2026" /></label>
        <label class="o-field"><span>From</span><input type="date" bind:value={draft.periodStart} required /></label>
        <label class="o-field"><span>To</span><input type="date" bind:value={draft.periodEnd} required min={draft.periodStart || undefined} /></label>
        {#if branches.length > 1}
          <label class="o-field">
            <span>Branch</span>
            <select bind:value={draft.branchId}>
              <option value="">All branches</option>
              {#each branches as branch (branch.id)}<option value={branch.id}>{branch.name}</option>{/each}
            </select>
          </label>
        {/if}
      </div>
      <div class="blines">
        {#each draft.lines as line, index (index)}
          <div class="bline">
            <label class="o-field">
              <span>Account</span>
              <select bind:value={line.accountId} required>
                <option value="" disabled>Choose an income or expense account</option>
                {#each choices as group (group.type)}
                  <optgroup label={group.label}>
                    {#each group.rows as account (account.id)}<option value={account.id}>{account.code} {account.name}</option>{/each}
                  </optgroup>
                {/each}
              </select>
            </label>
            <label class="o-field"><span>Amount (৳)</span><input type="number" inputmode="decimal" min="0" step="0.01" bind:value={line.amount} required placeholder="0" /></label>
            <button type="button" class="o-btn ghost small remove" disabled={draft.lines.length <= 1} onclick={() => draft && (draft.lines = draft.lines.filter((_, at) => at !== index))} aria-label={`Remove line ${index + 1}`}><Trash2 size={15} /></button>
          </div>
        {/each}
        <div><button type="button" class="o-btn ghost small" onclick={() => draft && (draft.lines = [...draft.lines, { accountId: "", amount: null }])} disabled={draft.lines.length >= 100}><Plus size={15} /> Add a line</button></div>
      </div>
    </form>
    {#snippet footer()}
      {#if formProblem}<p class="o-error wide-error" role="alert" use:intoView={formProblem}>{formProblem}</p>{/if}
      <button type="button" class="o-btn ghost" onclick={() => (draft = null)}>Cancel</button>
      <button type="submit" form="budget-form" class="o-btn navy" disabled={saving}>{saving ? "Saving…" : draft?.id ? "Save budget" : "Add budget"}</button>
    {/snippet}
  </OfficeSheet>
{/if}

<style>
  .intro { flex: 1 1 20rem; margin: 0; font-size: 0.86rem; line-height: 1.5; }
  .head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 0.6rem 1rem; margin-bottom: 0.9rem; }
  .head h2 { margin: 0; font-size: 1.05rem; color: #07182f; }
  .head p { margin: 0.2rem 0 0; font-size: 0.84rem; }
  .lines { display: grid; gap: 0.9rem; margin: 0; padding: 0; list-style: none; }
  .top, .bottom { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 0.3rem 1rem; }
  .top b { overflow-wrap: anywhere; }
  .figures { font-weight: 800; font-variant-numeric: tabular-nums; }
  .figures small { font-weight: 600; color: #7a8593; }
  .bar { height: 0.6rem; margin: 0.4rem 0 0.3rem; border-radius: 1rem; background: #edf0f2; overflow: hidden; }
  .bar i { display: block; height: 100%; border-radius: inherit; background: #9aa6b2; }
  .bar i.good { background: #2f8f62; }
  .bar i.warn { background: #d19b2d; }
  .bar i.bad { background: #c0453c; }
  .bottom small { color: #6a7686; font-size: 0.78rem; }
  .gap.warn { color: #7c5a12; font-weight: 750; }
  .gap.bad { color: #a3302a; font-weight: 750; }
  .gap.good { color: #17704b; }
  .blines { display: grid; gap: 0.6rem; }
  .bline { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr) auto; align-items: end; gap: 0.6rem; padding: 0.7rem; border: 1px solid #e1e6e9; border-radius: 0.7rem; background: #fff; }
  .remove { min-height: 2.75rem; min-width: 2.75rem; }
  .wide-error { flex: 1 1 100%; }
  @media (max-width: 40rem) {
    .bline { grid-template-columns: 1fr auto; }
    .bline > label:first-child { grid-column: 1 / -1; }
  }
</style>
