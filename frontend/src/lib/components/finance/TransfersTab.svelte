<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { day, money, officePermissions, today } from "$lib/office";
  import { amountOf, dayToSend, round2, type JournalEntry, type MoneyAccount } from "$lib/finance";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import MoneyAccountsStrip from "./MoneyAccountsStrip.svelte";
  import { ArrowRightLeft } from "lucide-svelte";

  // Money moved between the company's own accounts: cash taken to the bank,
  // bKash cashed out and the like. Nothing is earned or spent, so profit
  // does not change; only where the money sits.
  let accounts = $state<MoneyAccount[]>([]),
    transfers = $state<JournalEntry[]>([]),
    loading = $state(true),
    problem = $state(""),
    form = $state({ fromAccountId: "", toAccountId: "", amount: null as number | null, date: "", memo: "" }),
    saving = $state(false),
    formProblem = $state("");

  const may = (permission: string) => $officePermissions.has(permission);
  let fromAccount = $derived(accounts.find((account) => account.id === form.fromAccountId));
  let short = $derived(!!fromAccount && fromAccount.balance !== null && amountOf(form.amount) > fromAccount.balance);

  async function load() {
    loading = true;
    problem = "";
    try {
      const [moneyList, transferList] = await Promise.all([api<MoneyAccount[]>("/office/money-accounts"), api<JournalEntry[]>("/office/journal?sourceType=transfer")]);
      accounts = moneyList;
      transfers = transferList;
    } catch (e) {
      problem = problemText(e, "The transfers could not be loaded");
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    form.date = today();
    load().then(() => {
      // The usual move: cash in hand to the bank.
      form.fromAccountId ||= accounts.find((account) => account.code === "1000")?.id ?? accounts[0]?.id ?? "";
      form.toAccountId ||= accounts.find((account) => account.code === "1010")?.id ?? accounts[1]?.id ?? "";
    });
  });

  // The account money went into is the line with the debit.
  const into = (entry: JournalEntry) => entry.lines.find((line) => line.debit > 0)?.account.name ?? "—";
  const outOf = (entry: JournalEntry) => entry.lines.find((line) => line.credit > 0)?.account.name ?? "—";
  const amount = (entry: JournalEntry) => round2(entry.lines.reduce((sum, line) => sum + line.debit, 0));

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    formProblem = "";
    try {
      await api("/office/transfers", { method: "POST", body: JSON.stringify({ ...form, date: dayToSend(form.date, today()) }) });
      const to = accounts.find((account) => account.id === form.toAccountId);
      toasts.show(`${money(form.amount)} moved from ${fromAccount?.name ?? "one account"} to ${to?.name ?? "another"}`);
      form = { ...form, amount: null, memo: "", date: today() };
      await load();
    } catch (e) {
      formProblem = problemText(e, "The money was not moved");
    } finally {
      saving = false;
    }
  }
</script>

<MoneyAccountsStrip {accounts} />

{#if may("accounts.create")}
  <section class="o-card">
    <h2>Move money between accounts</h2>
    <form class="o-form" onsubmit={save}>
      <div class="o-fields">
        <label class="o-field">
          <span>From</span>
          <select bind:value={form.fromAccountId} required>
            {#each accounts as account (account.id)}<option value={account.id}>{account.name}{account.balance !== null ? ` (${money(account.balance)})` : ""}</option>{/each}
          </select>
        </label>
        <label class="o-field">
          <span>To</span>
          <select bind:value={form.toAccountId} required>
            {#each accounts as account (account.id)}<option value={account.id} disabled={account.id === form.fromAccountId}>{account.name}</option>{/each}
          </select>
        </label>
        <label class="o-field">
          <span>Amount (৳)</span>
          <input type="number" inputmode="decimal" min="0.01" step="0.01" bind:value={form.amount} required placeholder="0" />
          {#if short}<span class="hint warn">That is more than the {money(fromAccount?.balance)} in {fromAccount?.name}.</span>{/if}
        </label>
        <label class="o-field"><span>Date</span><input type="date" bind:value={form.date} required /></label>
        <label class="o-field wide"><span>Note <small>(optional)</small></span><input bind:value={form.memo} maxlength="200" placeholder="Cash deposited at the bank" /></label>
      </div>
      {#if formProblem}<p class="o-error" role="alert" use:intoView={formProblem}>{formProblem}</p>{/if}
      <div class="o-form-actions">
        <button type="submit" class="o-btn navy" disabled={saving || !accounts.length}><ArrowRightLeft size={16} /> {saving ? "Moving…" : "Move money"}</button>
      </div>
    </form>
  </section>
{/if}

<section class="recent" aria-labelledby="recent-title">
  <h2 id="recent-title" class="o-section-title">Recent transfers</h2>
  {#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}
  {#if loading && !transfers.length}
    <p class="o-loading">Loading transfers…</p>
  {:else if !transfers.length && !problem}
    <div class="o-card o-empty"><ArrowRightLeft size={28} /><h3>No transfers yet</h3><p>When cash goes to the bank or a wallet is cashed out, record it above so every account shows what is really in it.</p></div>
  {:else if transfers.length}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead><tr><th>Date</th><th>From</th><th>To</th><th class="num">Amount</th><th>Note</th><th>Status</th></tr></thead>
        <tbody>
          {#each transfers as entry (entry.id)}
            <tr>
              <td class="lead" data-label="Date"><b>{day(entry.date)}</b><small>{entry.reference} · {entry.createdByName}</small></td>
              <td data-label="From">{outOf(entry)}</td>
              <td data-label="To">{into(entry)}</td>
              <td class="num" data-label="Amount">{money(amount(entry))}</td>
              <td data-label="Note">{entry.memo}</td>
              <td data-label="Status"><StatusPill status={entry.status === "POSTED" ? "ACTIVE" : "INACTIVE"} label={entry.reversalOf ? "Undo" : entry.status === "POSTED" ? "Posted" : "Reversed"} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="o-muted note">To undo a transfer, open it in the Journal and reverse it.</p>
  {/if}
</section>

<style>
  .recent { margin-top: 1.4rem; }
  .hint.warn { color: #7c5a12; }
  .note { margin: 0.7rem 0 0; font-size: 0.84rem; }
</style>
