<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { money, officePermissions } from "$lib/office";
  import { ACCOUNT_TYPES, groupAccounts, MONEY_SUBTYPES, round2, SUBTYPE_LABELS, type AccountType, type LedgerAccount } from "$lib/finance";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import { Lock, Pencil, Plus } from "lucide-svelte";

  // The chart of accounts: every account the books use, under its kind,
  // with its balance. Built-in accounts are used by invoices, payments and
  // Hisab Kitab, so their code and kind stay as they are.
  type Draft = { id?: string; code: string; name: string; type: AccountType; subtype: string; currency: string; description: string; active: boolean; system: boolean };
  const FALLBACK_CURRENCIES = ["BDT", "USD", "EUR", "GBP", "MYR"];
  const FIRST_DIGIT: Record<AccountType, string> = { ASSET: "1", LIABILITY: "2", EQUITY: "3", INCOME: "4", EXPENSE: "5" };

  let accounts = $state<LedgerAccount[]>([]),
    currencies = $state<string[]>(FALLBACK_CURRENCIES),
    loading = $state(true),
    problem = $state(""),
    draft = $state<Draft | null>(null),
    saving = $state(false),
    formProblem = $state("");

  const may = (permission: string) => $officePermissions.has(permission);
  let groups = $derived(groupAccounts(accounts));
  // A built-in account with a special job (receivable, advances…) keeps it.
  let specialKind = $derived(!!draft && !!draft.subtype && !MONEY_SUBTYPES.includes(draft.subtype));

  async function load() {
    loading = true;
    problem = "";
    try {
      accounts = await api<LedgerAccount[]>("/office/ledger-accounts");
    } catch (e) {
      accounts = [];
      problem = problemText(e, "The accounts could not be loaded");
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    load();
    api<{ currencies?: string[] }>("/office/settings").then((settings) => (currencies = settings?.currencies?.length ? settings.currencies : FALLBACK_CURRENCIES)).catch(() => {});
  });

  function add() {
    formProblem = "";
    draft = { code: "", name: "", type: "EXPENSE", subtype: "", currency: "BDT", description: "", active: true, system: false };
  }

  function edit(account: LedgerAccount) {
    formProblem = "";
    draft = { id: account.id, code: account.code, name: account.name, type: account.type, subtype: account.subtype ?? "", currency: account.currency, description: account.description ?? "", active: account.active, system: account.system };
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!draft) return;
    saving = true;
    formProblem = "";
    // Cash, bank and mobile wallet are kinds of asset only.
    const subtype = MONEY_SUBTYPES.includes(draft.subtype) && draft.type !== "ASSET" ? null : draft.subtype || null;
    const body = JSON.stringify({ code: draft.code, name: draft.name, type: draft.type, subtype, currency: draft.currency, description: draft.description, active: draft.active });
    try {
      if (draft.id) await api(`/office/ledger-accounts/${draft.id}`, { method: "PUT", body });
      else await api("/office/ledger-accounts", { method: "POST", body });
      toasts.show(draft.id ? "Account saved" : "Account added");
      draft = null;
      await load();
    } catch (e) {
      formProblem = problemText(e, "The account was not saved");
    } finally {
      saving = false;
    }
  }
</script>

<div class="o-toolbar">
  <p class="o-muted intro">Every account the books use. Invoices, payments and Hisab Kitab post to them by themselves; add your own for new kinds of income or expense.</p>
  {#if may("accounts.create")}<button type="button" class="o-btn small" onclick={add}><Plus size={16} /> Add account</button>{/if}
</div>

{#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}

{#if loading}
  <p class="o-loading">Loading accounts…</p>
{:else}
  {#each groups as group (group.type)}
    <section class="group" aria-labelledby={`group-${group.type}`}>
      <div class="group-head">
        <h2 id={`group-${group.type}`}>{group.label}</h2>
        <span>{money(round2(group.rows.reduce((sum, row) => sum + row.balance, 0)))}</span>
      </div>
      <div class="o-table-wrap">
        <table class="o-table">
          <thead><tr><th>Code</th><th>Account</th><th>Kind</th><th>Currency</th><th class="num">Balance</th><th><span class="o-sr">Actions</span></th></tr></thead>
          <tbody>
            {#each group.rows as account (account.id)}
              <tr class:inactive={!account.active}>
                <td data-label="Code" class="code">{account.code}</td>
                <td class="lead" data-label="Account">
                  <b>{account.name}</b>
                  {#if account.system}<span class="o-pill info built"><Lock size={11} aria-hidden="true" /> Built in</span>{/if}
                  {#if !account.active}<span class="o-pill">Not in use</span>{/if}
                  {#if account.description}<small>{account.description}</small>{/if}
                </td>
                <td data-label="Kind">{account.subtype ? SUBTYPE_LABELS[account.subtype] ?? account.subtype : "—"}</td>
                <td data-label="Currency">{account.currency}</td>
                <td class="num" data-label="Balance"><span class:negative={account.balance < 0}>{money(account.balance)}</span></td>
                <td data-label="" class="row-actions">
                  {#if may("accounts.update")}<button class="o-btn ghost small" onclick={() => edit(account)} aria-label={`Edit ${account.code} ${account.name}`}><Pencil size={15} /> Edit</button>{/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {:else}
    <div class="o-card o-empty"><h3>No accounts yet</h3><p>The built-in accounts appear the first time the books are used.</p></div>
  {/each}
{/if}

{#if draft}
  <OfficeSheet title={draft.id ? `Edit ${draft.code} ${draft.name}` : "Add account"} subtitle={draft.system ? "A built-in account: its name and description can change." : ""} onclose={() => (draft = null)}>
    <form id="account-form" class="o-form" onsubmit={save}>
      <div class="o-fields">
        <label class="o-field">
          <span>Kind</span>
          <select bind:value={draft.type} disabled={draft.system}>
            {#each ACCOUNT_TYPES as item (item.type)}<option value={item.type}>{item.one}</option>{/each}
          </select>
        </label>
        <label class="o-field">
          <span>Code</span>
          <input bind:value={draft.code} required inputmode="numeric" maxlength="4" pattern={"\\d{4}"} placeholder={`${FIRST_DIGIT[draft.type]}200`} disabled={draft.system} />
          <span class="hint">Four digits. Assets start with 1, liabilities 2, equity 3, income 4, expenses 5.</span>
        </label>
        <label class="o-field wide"><span>Name</span><input bind:value={draft.name} required maxlength="120" placeholder="Office rent" /></label>
        {#if draft.type === "ASSET" && !specialKind}
          <label class="o-field">
            <span>Money account?</span>
            <select bind:value={draft.subtype} disabled={draft.system}>
              <option value="">No, another kind of asset</option>
              <option value="CASH">Cash</option>
              <option value="BANK">Bank</option>
              <option value="MOBILE">Mobile wallet</option>
            </select>
            <span class="hint">Money accounts can receive payments and take transfers.</span>
          </label>
        {:else if specialKind}
          <div class="o-field"><span>Special use</span><p class="fixed">{SUBTYPE_LABELS[draft.subtype] ?? draft.subtype}</p></div>
        {/if}
        <label class="o-field">
          <span>Currency</span>
          <select bind:value={draft.currency}>
            {#each [...new Set(["BDT", ...currencies, draft.currency])] as code (code)}<option value={code}>{code}</option>{/each}
          </select>
        </label>
        <label class="o-field wide"><span>Description <small>(optional)</small></span><input bind:value={draft.description} maxlength="300" /></label>
        <label class="o-check wide"><input type="checkbox" bind:checked={draft.active} disabled={draft.system} /> In use (shown when choosing an account)</label>
      </div>
      {#if draft.id && !draft.system}<p class="hint">Once an account has postings, its code and kind stay as they are; its name can still change.</p>{/if}
    </form>
    {#snippet footer()}
      {#if formProblem}<p class="o-error wide-error" role="alert" use:intoView={formProblem}>{formProblem}</p>{/if}
      <button type="button" class="o-btn ghost" onclick={() => (draft = null)}>Cancel</button>
      <button type="submit" form="account-form" class="o-btn navy" disabled={saving}>{saving ? "Saving…" : draft?.id ? "Save account" : "Add account"}</button>
    {/snippet}
  </OfficeSheet>
{/if}

<style>
  .intro { flex: 1 1 20rem; margin: 0; font-size: 0.86rem; line-height: 1.5; }
  .group + .group { margin-top: 1.4rem; }
  .group-head { display: flex; align-items: baseline; justify-content: space-between; gap: 1rem; margin: 0 0 0.6rem; }
  .group-head h2 { margin: 0; font-size: 1.02rem; color: #07182f; }
  .group-head span { font-weight: 800; color: #405066; font-variant-numeric: tabular-nums; }
  .code { font-variant-numeric: tabular-nums; color: #6a7686; width: 5rem; }
  .built { margin-left: 0.4rem; vertical-align: 0.1em; }
  tr.inactive .lead b { color: #6a7686; }
  .negative { color: #a3302a; }
  .row-actions { text-align: right; white-space: nowrap; }
  .hint { margin: 0; color: #607083; font-size: 0.82rem; line-height: 1.45; }
  .fixed { margin: 0; padding: 0.6rem 0.75rem; border-radius: 0.6rem; background: #f1f3f5; color: #405066; }
  .wide-error { flex: 1 1 100%; }
  @media (max-width: 48rem) {
    .row-actions { justify-content: flex-end; }
    .code { width: auto; }
  }
</style>
