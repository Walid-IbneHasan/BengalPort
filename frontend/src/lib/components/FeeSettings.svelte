<script lang="ts">
  import { onMount } from "svelte";
  import { Check } from "lucide-svelte";
  import { api } from "$lib/api";

  // Admin settings: what each division charges when an application is
  // submitted, and the smallest part payment accepted online.
  type Fee = { division: string; label: string; amount: number; minimumPayment: number };
  let fees = $state<Fee[]>([]);
  let onlinePayment = $state(false), loading = $state(true), saving = $state(false), error = $state(""), saved = $state(false);
  const names: Record<string, string> = { BUSINESS: "Global Business", EDUCATION: "Global Education", HEALTHCARE: "Global Healthcare", UMRAH: "Global Umrah" };

  onMount(async () => {
    try {
      const data = await api<{ onlinePayment: boolean; fees: Fee[] }>("/admin/payment-settings");
      fees = data.fees;
      onlinePayment = data.onlinePayment;
    } catch (e) {
      error = e instanceof Error ? e.message : "The fees could not be loaded.";
    } finally {
      loading = false;
    }
  });

  async function save() {
    saving = true;
    error = "";
    saved = false;
    try {
      const data = await api<{ fees: Fee[] }>("/admin/payment-settings", {
        method: "PUT",
        body: JSON.stringify({ fees: fees.map((fee) => ({ ...fee, amount: Number(fee.amount) || 0, minimumPayment: Number(fee.minimumPayment) || 0 })) }),
      });
      fees = data.fees;
      saved = true;
    } catch (e) {
      error = e instanceof Error ? e.message : "The fees could not be saved.";
    } finally {
      saving = false;
    }
  }
</script>

<form class="fees" onsubmit={(e) => { e.preventDefault(); save(); }}>
  <header>
    <div>
      <b>Service fees and online payment</b>
      <span>A new application owes its division's fee. Leave a fee at 0 if staff will quote each application instead.</span>
    </div>
    <strong class:off={!onlinePayment}>{onlinePayment ? "bKash is connected" : "bKash is not connected"}</strong>
  </header>
  {#if !onlinePayment}<p class="hint">Customers cannot pay online until the bKash settings are added to the server. Fees set here still show on each application.</p>{/if}
  {#if error}<p class="problem" role="alert">{error}</p>{/if}
  {#if loading}
    <p class="hint">Loading fees…</p>
  {:else}
    <div class="table">
      <div class="head"><span>Division</span><span>Shown to customers as</span><span>Fee (৳)</span><span>Smallest part payment (৳)</span></div>
      {#each fees as fee}
        <div class="line">
          <b>{names[fee.division] ?? fee.division}</b>
          <label><span>Shown to customers as</span><input bind:value={fee.label} aria-label={`${names[fee.division]} fee name`} maxlength="80" required /></label>
          <label><span>Fee (৳)</span><input type="number" min="0" step="0.01" bind:value={fee.amount} aria-label={`${names[fee.division]} fee`} required /></label>
          <label><span>Smallest part payment (৳)</span><input type="number" min="0" step="0.01" bind:value={fee.minimumPayment} aria-label={`${names[fee.division]} smallest part payment`} required /></label>
        </div>
      {/each}
    </div>
    <footer>
      {#if saved}<span class="ok"><Check size={15} /> Saved</span>{/if}
      <button disabled={saving}>{saving ? "Saving…" : "Save fees"}</button>
    </footer>
  {/if}
</form>

<style>
  .fees{background:#fff;border:1px solid #e0e5e8;border-radius:.9rem;padding:1.2rem;display:grid;gap:.9rem}
  header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}
  header b,header span{display:block}
  header span,.hint{font-size:.78rem;color:var(--muted);margin:.3rem 0 0;line-height:1.5}
  header strong{flex:none;font-size:.72rem;color:#347854;background:#e8f5ef;padding:.35rem .6rem;border-radius:.45rem}
  header strong.off{color:#7a5a12;background:#faf1da}
  .table{display:grid;gap:.5rem}
  .head,.line{display:grid;grid-template-columns:1.1fr 1.6fr 1fr 1fr;gap:.6rem;align-items:center}
  .head{font-size:.66rem;text-transform:uppercase;letter-spacing:.07em;color:#738191}
  .line b{font-size:.84rem;color:var(--heading)}
  .line label{display:grid;gap:.25rem;min-width:0}
  .line label span{display:none;font-size:.68rem;color:#738191}
  input{width:100%;min-height:2.6rem;border:1px solid #d6dde2;border-radius:.6rem;padding:.55rem .7rem;outline:none}
  input:focus{border-color:var(--gold);box-shadow:0 0 0 3px #c7983620}
  footer{display:flex;justify-content:flex-end;align-items:center;gap:.9rem}
  button{min-height:2.6rem;border:0;border-radius:.7rem;padding:.6rem 1.1rem;background:var(--gold);color:var(--heading);font-weight:750;cursor:pointer}
  button:disabled{opacity:.6}
  .ok{display:inline-flex;align-items:center;gap:.3rem;color:#276541;font-size:.8rem}
  .problem{margin:0;padding:.6rem .8rem;border-radius:.6rem;background:#fff0f0;color:#922f2f;font-size:.8rem}
  @media(max-width:46rem){.head{display:none}.line{grid-template-columns:1fr 1fr;align-items:end;padding-bottom:.6rem;border-bottom:1px solid #edf0f2}.line b{grid-column:1/-1}.line label:first-of-type{grid-column:1/-1}.line label span{display:block}header{flex-direction:column}}
</style>
