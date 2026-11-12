<script lang="ts">
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import ReportsTab from "$lib/components/finance/ReportsTab.svelte";
  import JournalTab from "$lib/components/finance/JournalTab.svelte";
  import AccountsTab from "$lib/components/finance/AccountsTab.svelte";
  import TransfersTab from "$lib/components/finance/TransfersTab.svelte";
  import BudgetsTab from "$lib/components/finance/BudgetsTab.svelte";
  import RatesTab from "$lib/components/finance/RatesTab.svelte";

  // Finance: the company's double-entry books, in taka. Invoices, payments
  // and Hisab Kitab post here by themselves. The open tab (and report) is
  // kept in the address, ?tab=journal&report=…, so a link or reload keeps it.
  const TABS = [
    { key: "reports", label: "Reports" },
    { key: "journal", label: "Journal" },
    { key: "accounts", label: "Chart of accounts" },
    { key: "transfers", label: "Transfers" },
    { key: "budgets", label: "Budgets" },
    { key: "rates", label: "Exchange rates" },
  ] as const;

  let tab = $derived(TABS.find((item) => item.key === page.url.searchParams.get("tab"))?.key ?? "reports");
  let report = $derived(page.url.searchParams.get("report") ?? "profit-and-loss");

  function show(next: Record<string, string>) {
    const params = new URLSearchParams();
    if (next.tab && next.tab !== "reports") params.set("tab", next.tab);
    if (next.report) params.set("report", next.report);
    goto(`/admin/finance${params.toString() ? `?${params}` : ""}`, { noScroll: true, keepFocus: true });
  }
</script>

<svelte:head><title>Finance — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office</span>
      <h1>Finance</h1>
      <p>The company's books, kept in taka. Invoices, payments and Hisab Kitab entries post here by themselves. Nothing posted is ever deleted; a mistake is undone with a reversal.</p>
    </div>
  </header>

  <nav class="o-tabs" aria-label="Finance">
    {#each TABS as item (item.key)}
      <button class:active={tab === item.key} aria-pressed={tab === item.key} onclick={() => show({ tab: item.key })}>{item.label}</button>
    {/each}
  </nav>

  {#if tab === "reports"}
    <ReportsTab {report} onreport={(key) => show({ tab: "reports", report: key })} />
  {:else if tab === "journal"}
    <JournalTab />
  {:else if tab === "accounts"}
    <AccountsTab />
  {:else if tab === "transfers"}
    <TransfersTab />
  {:else if tab === "budgets"}
    <BudgetsTab />
  {:else}
    <RatesTab />
  {/if}
</div>
