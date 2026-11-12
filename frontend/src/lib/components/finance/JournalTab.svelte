<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { downloadFile } from "$lib/office-files";
  import { day, money, officePermissions, today } from "$lib/office";
  import { amountOf, dayToSend, groupAccounts, journalCheck, madeByHand, reversible, round2, SOURCE_LABELS, sourceLabel, type JournalEntry, type LedgerAccount } from "$lib/finance";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import { BookOpenCheck, ChevronDown, ChevronRight, CircleCheck, Download, Plus, RotateCcw, Search, Trash2, TriangleAlert } from "lucide-svelte";

  // The journal: every posting in the books, newest first. Entries are
  // never changed or deleted; a mistake is undone with a reversal.
  type Line = { accountId: string; debit: number | null; credit: number | null; memo: string };
  type Draft = { date: string; memo: string; lines: Line[] };

  let rows = $state<JournalEntry[]>([]),
    accounts = $state<LedgerAccount[]>([]),
    loading = $state(true),
    problem = $state(""),
    notice = $state(""),
    filters = $state({ from: "", to: "", accountId: "", search: "", sourceType: "" }),
    open = $state<Record<string, boolean>>({}),
    reversing = $state<JournalEntry | null>(null),
    reason = $state(""),
    busy = $state(false),
    sheetProblem = $state(""),
    draft = $state<Draft | null>(null),
    csvProblem = $state("");

  const may = (permission: string) => $officePermissions.has(permission);
  let groups = $derived(groupAccounts(accounts));
  let activeGroups = $derived(groupAccounts(accounts.filter((account) => account.active)));
  let check = $derived(journalCheck(draft?.lines ?? []));
  let timer: ReturnType<typeof setTimeout> | undefined;
  let asked = 0;

  async function load() {
    const ask = ++asked;
    loading = true;
    problem = "";
    const query = new URLSearchParams(Object.entries(filters).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
    try {
      const list = await api<JournalEntry[]>(`/office/journal?${query}`);
      if (ask === asked) rows = list;
    } catch (e) {
      if (ask === asked) {
        rows = [];
        problem = problemText(e, "The journal could not be loaded");
      }
    } finally {
      if (ask === asked) loading = false;
    }
  }

  onMount(() => {
    load();
    api<LedgerAccount[]>("/office/ledger-accounts").then((list) => (accounts = list)).catch(() => (accounts = []));
  });

  function typed() {
    clearTimeout(timer);
    timer = setTimeout(load, 300);
  }

  const total = (entry: JournalEntry) => round2(entry.lines.reduce((sum, line) => sum + line.debit, 0));

  async function exportCsv() {
    csvProblem = "";
    const query = new URLSearchParams(Object.entries({ from: filters.from, to: filters.to }).filter(([, value]) => value));
    try {
      await downloadFile(`/office/reports/export/journal?${query}`, `journal-${filters.from || "start"}-to-${filters.to || today()}.csv`);
    } catch (e) {
      csvProblem = problemText(e, "The file could not be downloaded");
    }
  }

  function startReverse(entry: JournalEntry) {
    sheetProblem = "";
    reason = "";
    reversing = entry;
  }

  async function reverse(event: SubmitEvent) {
    event.preventDefault();
    if (!reversing) return;
    busy = true;
    sheetProblem = "";
    try {
      const result = await api<{ done: boolean }>(`/office/journal/${reversing.id}/reverse`, { method: "POST", body: JSON.stringify({ reason }) });
      if (result?.done === false) {
        notice = `Your request to reverse ${reversing.reference} was sent for approval. Nothing changes until an approver agrees.`;
        toasts.show("Sent for approval");
      } else toasts.show(`${reversing.reference} reversed`);
      reversing = null;
      await load();
    } catch (e) {
      sheetProblem = problemText(e, "The entry was not reversed");
    } finally {
      busy = false;
    }
  }

  const blankLine = (): Line => ({ accountId: "", debit: null, credit: null, memo: "" });
  function startEntry() {
    sheetProblem = "";
    draft = { date: today(), memo: "", lines: [blankLine(), blankLine()] };
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!draft) return;
    busy = true;
    sheetProblem = "";
    try {
      // Lines left completely empty are dropped; the rest go as they are.
      const lines = draft.lines
        .filter((line) => line.accountId || amountOf(line.debit) || amountOf(line.credit))
        .map((line) => ({ accountId: line.accountId, debit: amountOf(line.debit), credit: amountOf(line.credit), currency: "BDT", exchangeRate: 1, memo: line.memo }));
      const entry = await api<{ reference: string }>("/office/journal", { method: "POST", body: JSON.stringify({ date: dayToSend(draft.date, today()), memo: draft.memo, lines }) });
      toasts.show(`${entry.reference} posted`);
      draft = null;
      await load();
    } catch (e) {
      sheetProblem = problemText(e, "The entry was not posted");
    } finally {
      busy = false;
    }
  }
</script>

{#snippet accountOptions(list: typeof groups)}
  {#each list as group (group.type)}
    <optgroup label={group.label}>
      {#each group.rows as account (account.id)}<option value={account.id}>{account.code} {account.name}</option>{/each}
    </optgroup>
  {/each}
{/snippet}

<div class="o-toolbar">
  <label class="o-search">
    <Search size={17} />
    <input bind:value={filters.search} oninput={typed} placeholder="Words in the memo, or JE-000123" aria-label="Search the journal" />
  </label>
  <label class="filter"><span>From</span><input type="date" class="o-select" bind:value={filters.from} onchange={load} /></label>
  <label class="filter"><span>To</span><input type="date" class="o-select" bind:value={filters.to} onchange={load} /></label>
  <select class="o-select" bind:value={filters.accountId} onchange={load} aria-label="Account">
    <option value="">Every account</option>
    {@render accountOptions(groups)}
  </select>
  <select class="o-select" bind:value={filters.sourceType} onchange={load} aria-label="Kind of entry">
    <option value="">Every kind of entry</option>
    {#each Object.entries(SOURCE_LABELS) as [value, label] (value)}<option {value}>{label}</option>{/each}
  </select>
  {#if may("accounts.export")}<button type="button" class="o-btn ghost small" onclick={exportCsv}><Download size={15} /> Download CSV</button>{/if}
  {#if may("accounts.create")}<button type="button" class="o-btn small" onclick={startEntry}><Plus size={16} /> New journal entry</button>{/if}
</div>

{#if csvProblem}<p class="o-error" role="alert" use:intoView={csvProblem}>{csvProblem}</p>{/if}
{#if notice}<p class="o-notice" role="status">{notice} <a class="o-link" href="/admin/approvals">See approvals</a></p>{/if}
{#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}

{#if loading && !rows.length}
  <p class="o-loading">Loading the journal…</p>
{:else if !rows.length && !problem}
  <div class="o-card o-empty">
    <BookOpenCheck size={28} />
    <h3>No entries found</h3>
    <p>Invoices, payments and Hisab Kitab entries post here by themselves. Clear the filters to see everything.</p>
  </div>
{:else if rows.length}
  <div class="o-table-wrap">
    <table class="o-table">
      <thead><tr><th>Entry</th><th>Date</th><th>What it was</th><th>Made by</th><th class="num">Amount</th><th>Status</th></tr></thead>
      <tbody>
        {#each rows as entry (entry.id)}
          <tr>
            <td class="lead" data-label="Entry">
              <button type="button" class="toggle" aria-expanded={!!open[entry.id]} aria-controls={`lines-${entry.id}`} onclick={() => (open[entry.id] = !open[entry.id])}>
                {#if open[entry.id]}<ChevronDown size={16} />{:else}<ChevronRight size={16} />{/if}
                <b>{entry.reference}</b>
              </button>
            </td>
            <td data-label="Date">{day(entry.date)}</td>
            <td data-label="What it was">
              {entry.memo}
              <small>{sourceLabel(entry.sourceType)}{entry.reversalOf ? ` · undoes ${entry.reversalOf}` : ""}{entry.reversedBy ? ` · undone by ${entry.reversedBy}` : ""}</small>
            </td>
            <td data-label="Made by">{entry.createdByName}</td>
            <td class="num" data-label="Amount">{money(total(entry))}</td>
            <td data-label="Status"><StatusPill status={entry.status === "POSTED" ? "ACTIVE" : "INACTIVE"} label={entry.status === "POSTED" ? "Posted" : "Reversed"} /></td>
          </tr>
          {#if open[entry.id]}
            <tr class="detail-row">
              <td colspan="6" class="detail" data-label="" id={`lines-${entry.id}`}>
                <div class="lines" role="table" aria-label={`Lines of ${entry.reference}`}>
                  <div class="line head" role="row"><span role="columnheader">Account</span><span role="columnheader">Debit</span><span role="columnheader">Credit</span></div>
                  {#each entry.lines as line, index (index)}
                    <div class="line" role="row">
                      <span role="cell" class="acct">
                        <span class="code">{line.account.code}</span> {line.account.name}
                        {#if line.currency !== "BDT"}<small>{money(line.amount, line.currency)} at ৳{line.exchangeRate} per {line.currency}</small>{/if}
                        {#if line.memo}<small>{line.memo}</small>{/if}
                      </span>
                      <span role="cell" class="amt">{line.debit ? money(line.debit) : ""}</span>
                      <span role="cell" class="amt">{line.credit ? money(line.credit) : ""}</span>
                    </div>
                  {/each}
                </div>
                <div class="after">
                  {#if reversible(entry)}
                    {#if may("accounts.create")}<button type="button" class="o-btn danger small" onclick={() => startReverse(entry)}><RotateCcw size={15} /> Reverse</button>{/if}
                  {:else if !madeByHand(entry)}
                    <p class="o-muted">Made automatically. Correct it where it came from (the invoice, payment, deal or Hisab Kitab entry), not here.</p>
                  {:else if entry.reversalOf}
                    <p class="o-muted">This entry undoes {entry.reversalOf}. To change things again, post a new entry.</p>
                  {:else if entry.reversedBy}
                    <p class="o-muted">Undone by {entry.reversedBy}.</p>
                  {/if}
                </div>
              </td>
            </tr>
          {/if}
        {/each}
      </tbody>
    </table>
  </div>
  {#if rows.length >= 300}<p class="o-muted more">Showing the latest 300 entries. Choose dates to see older ones.</p>{/if}
{/if}

{#if reversing}
  <OfficeSheet title={`Reverse ${reversing.reference}`} subtitle={reversing.memo} onclose={() => (reversing = null)}>
    <form id="reverse-form" class="o-form" onsubmit={reverse}>
      <p class="hint">A reversal is a new entry, dated today, with every debit and credit swapped. The original stays in the books, marked Reversed, so nothing is lost.
        {#if !may("accounts.approve")}<br />Reversing needs an approver, so this sends them a request.{/if}</p>
      <label class="o-field">
        <span>Why is it being reversed?</span>
        <textarea bind:value={reason} required maxlength="300" placeholder="Posted to the wrong account"></textarea>
      </label>
    </form>
    {#snippet footer()}
      {#if sheetProblem}<p class="o-error wide-error" role="alert" use:intoView={sheetProblem}>{sheetProblem}</p>{/if}
      <button type="button" class="o-btn ghost" onclick={() => (reversing = null)}>Cancel</button>
      <button type="submit" form="reverse-form" class="o-btn danger" disabled={busy}>{busy ? "Sending…" : may("accounts.approve") ? "Reverse entry" : "Ask for approval"}</button>
    {/snippet}
  </OfficeSheet>
{/if}

{#if draft}
  <OfficeSheet title="New journal entry" subtitle="For things nothing else records: opening balances, owner's money, corrections." wide onclose={() => (draft = null)}>
    <form id="journal-form" class="o-form" onsubmit={save}>
      <div class="o-fields">
        <label class="o-field"><span>Date</span><input type="date" bind:value={draft.date} required /></label>
        <label class="o-field"><span>What this entry is for</span><input bind:value={draft.memo} required maxlength="300" placeholder="Owner put money into the bank" /></label>
      </div>
      <p class="hint">Each line is a <b>debit</b> or a <b>credit</b>. A debit adds to money, assets and expenses; a credit adds to income, what is owed and the owner's equity. The debits and credits must come to the same total. Amounts are in taka.</p>
      <div class="jlines">
        {#each draft.lines as line, index (index)}
          <div class="jline">
            <label class="o-field acct-field">
              <span>Account</span>
              <select bind:value={line.accountId} required>
                <option value="" disabled>Choose an account</option>
                {@render accountOptions(activeGroups)}
              </select>
            </label>
            <label class="o-field"><span>Debit</span><input type="number" inputmode="decimal" min="0" step="0.01" bind:value={line.debit} placeholder="0" /></label>
            <label class="o-field"><span>Credit</span><input type="number" inputmode="decimal" min="0" step="0.01" bind:value={line.credit} placeholder="0" /></label>
            <label class="o-field note-field"><span>Note <small>(optional)</small></span><input bind:value={line.memo} maxlength="200" /></label>
            <button type="button" class="o-btn ghost small remove" disabled={draft.lines.length <= 2} onclick={() => draft && (draft.lines = draft.lines.filter((_, at) => at !== index))} aria-label={`Remove line ${index + 1}`}><Trash2 size={15} /></button>
          </div>
        {/each}
      </div>
      <div class="add-row">
        <button type="button" class="o-btn ghost small" onclick={() => draft && (draft.lines = [...draft.lines, blankLine()])} disabled={draft.lines.length >= 40}><Plus size={15} /> Add a line</button>
      </div>
      <p class="balance" class:ok={check.ready} aria-live="polite">
        {#if check.ready}<CircleCheck size={18} aria-hidden="true" />{:else}<TriangleAlert size={18} aria-hidden="true" />{/if}
        <span>
          Debits <b>{money(check.debits)}</b> {check.balanced ? "=" : "≠"} Credits <b>{money(check.credits)}</b>
          {#if !check.balanced}<small>They differ by {money(check.difference)}.</small>
          {:else if check.bothSides}<small>A line cannot have both a debit and a credit.</small>
          {:else if !check.ready}<small>Enter amounts on at least two lines.</small>{/if}
        </span>
      </p>
    </form>
    {#snippet footer()}
      {#if sheetProblem}<p class="o-error wide-error" role="alert" use:intoView={sheetProblem}>{sheetProblem}</p>{/if}
      <button type="button" class="o-btn ghost" onclick={() => (draft = null)}>Cancel</button>
      <button type="submit" form="journal-form" class="o-btn navy" disabled={busy || !check.ready}>{busy ? "Posting…" : "Post entry"}</button>
    {/snippet}
  </OfficeSheet>
{/if}

<style>
  .o-toolbar select { max-width: 100%; }
  .filter { display: inline-flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 750; color: #405066; }
  .toggle { display: inline-flex; align-items: center; gap: 0.35rem; min-height: 2.5rem; padding: 0 0.4rem 0 0.1rem; border: 0; border-radius: 0.5rem; background: none; color: #07182f; font: inherit; cursor: pointer; }
  .toggle:focus-visible { outline: 3px solid #d19b2d; outline-offset: 2px; }
  .detail-row td { background: #fbfaf6; }
  .detail { padding-top: 0.2rem; }
  .lines { display: grid; gap: 0; max-width: 52rem; border: 1px solid #e6e9ec; border-radius: 0.6rem; background: #fff; }
  .line { display: grid; grid-template-columns: minmax(0, 1fr) 8.5rem 8.5rem; gap: 0.8rem; padding: 0.5rem 0.75rem; border-top: 1px solid #f0f2f4; }
  .line:first-child { border-top: 0; }
  .line.head { color: #6a7686; font-size: 0.68rem; font-weight: 800; letter-spacing: 0.07em; text-transform: uppercase; }
  .line.head span:not(:first-child), .amt { text-align: right; font-variant-numeric: tabular-nums; }
  .acct small { display: block; color: #7a8593; font-size: 0.76rem; }
  .code { color: #8a94a1; font-size: 0.76rem; font-variant-numeric: tabular-nums; }
  .after { margin-top: 0.6rem; }
  .after p { margin: 0; font-size: 0.82rem; }
  .more { margin: 0.8rem 0 0; font-size: 0.84rem; }
  .hint { margin: 0; color: #607083; font-size: 0.84rem; line-height: 1.5; }
  .jlines { display: grid; gap: 0.6rem; }
  .jline { display: grid; grid-template-columns: minmax(0, 2.2fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr) auto; align-items: end; gap: 0.6rem; padding: 0.7rem; border: 1px solid #e1e6e9; border-radius: 0.7rem; background: #fff; }
  .remove { min-height: 2.75rem; min-width: 2.75rem; }
  .add-row { display: flex; }
  .balance { display: flex; align-items: flex-start; gap: 0.5rem; margin: 0; padding: 0.7rem 0.85rem; border-radius: 0.65rem; background: #fff0f0; color: #943d45; font-size: 0.9rem; }
  .balance.ok { background: #eef6f1; color: #245c43; }
  .balance b { font-variant-numeric: tabular-nums; }
  .balance small { display: block; margin-top: 0.15rem; font-size: 0.8rem; }
  .wide-error { flex: 1 1 100%; }
  @media (max-width: 48rem) {
    .detail { display: block; text-align: left; }
    .line { grid-template-columns: minmax(0, 1fr) 6.5rem 6.5rem; gap: 0.5rem; font-size: 0.82rem; }
  }
  @media (max-width: 40rem) {
    .jline { grid-template-columns: 1fr 1fr; }
    .acct-field, .note-field { grid-column: 1 / -1; }
    .remove { grid-column: 1 / -1; justify-self: end; }
    .line { grid-template-columns: minmax(0, 1fr) 5.6rem 5.6rem; padding: 0.5rem; }
  }
</style>
