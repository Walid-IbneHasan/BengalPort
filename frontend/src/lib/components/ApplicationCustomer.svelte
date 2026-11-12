<script lang="ts">
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { officePermissions } from "$lib/office";
  import { UserRoundPlus, UserRound } from "lucide-svelte";

  // Links a website application to the office's customer list, so its
  // payments, deals and invoices meet on one customer page. An existing
  // customer with the same phone or email is used instead of a new one.
  let { applicationId, customerId = null }: { applicationId: string; customerId?: string | null } = $props();

  let linked = $state<{ id: string; customerCode?: string; name?: string } | null>(null),
    busy = $state(false),
    problem = $state("");
  let current = $derived(linked ?? (customerId ? { id: customerId } : null));

  async function link() {
    busy = true;
    problem = "";
    try {
      linked = await api<{ id: string; customerCode: string; name: string }>(`/office/customers/from-application/${applicationId}`, { method: "POST" });
    } catch (e) {
      problem = problemText(e, "The customer could not be added");
    } finally {
      busy = false;
    }
  }
</script>

{#if current}
  <a class="customer" href={`/admin/customers/${current.id}`}><UserRound size={15} /> {current.name ? `Open ${current.customerCode} ${current.name}` : "Open the customer's page"}</a>
{:else if $officePermissions.has("customers.create")}
  <button type="button" class="customer" disabled={busy} onclick={link}><UserRoundPlus size={15} /> {busy ? "Adding…" : "Add to customers"}</button>
  {#if problem}<p class="problem" role="alert">{problem}</p>{/if}
{/if}

<style>
  .customer { display: inline-flex; align-items: center; gap: 0.4rem; margin-top: 0.6rem; margin-left: 0.4rem; padding: 0.55rem 0.8rem; border: 1px solid #dfe5ea; border-radius: 0.55rem; background: #fff; color: #17304f; font: inherit; font-size: 0.8rem; font-weight: 750; text-decoration: none; cursor: pointer; }
  .customer:disabled { opacity: 0.6; cursor: wait; }
  .customer:focus-visible { outline: 3px solid #d19b2d; outline-offset: 2px; }
  .problem { margin: 0.4rem 0 0; color: #943d45; font-size: 0.8rem; }
  @media (hover: hover) and (pointer: fine) { .customer:hover { background: #f4f6f8; } }
</style>
