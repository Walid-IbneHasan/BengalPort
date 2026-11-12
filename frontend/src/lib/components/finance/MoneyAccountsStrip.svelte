<script lang="ts">
  import { money } from "$lib/office";
  import { SUBTYPE_LABELS, type MoneyAccount } from "$lib/finance";
  import { Banknote, Landmark, Smartphone } from "lucide-svelte";

  // The cash box, the bank and the mobile wallets, with what is in each.
  // Staff without permission to see money figures get the names only.
  let { accounts, label = "Money accounts" }: { accounts: MoneyAccount[]; label?: string } = $props();
  const icons: Record<string, typeof Banknote> = { CASH: Banknote, BANK: Landmark, MOBILE: Smartphone };
</script>

{#if accounts.length}
  <section class="strip" aria-label={label}>
    {#each accounts as account (account.id)}
      {@const Icon = icons[account.subtype ?? ""] ?? Banknote}
      <div class="o-stat">
        <span class="name"><Icon size={16} aria-hidden="true" /> {account.name}</span>
        {#if account.balance !== null}<b class:negative={account.balance < 0}>{money(account.balance)}</b>{/if}
        <small>{SUBTYPE_LABELS[account.subtype ?? ""] ?? "Money"} · account {account.code}</small>
      </div>
    {/each}
  </section>
{/if}

<style>
  .strip { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr)); gap: 0.7rem; margin-bottom: 1rem; }
  /* Scoped classes outweigh the shared .o-stat span / b rules. */
  .name { display: flex; align-items: center; gap: 0.4rem; font-weight: 750; color: #405066; }
  .negative { color: #a3302a; }
  /* Two to a row on phones, so the list below is in sight sooner. */
  @media (max-width: 40rem) { .strip { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; } }
</style>
