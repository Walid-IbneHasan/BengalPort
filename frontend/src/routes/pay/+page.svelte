<script lang="ts">
  import { page } from "$app/state";
  import { api } from "$lib/api";
  import PaymentPanel from "$lib/components/PaymentPanel.svelte";
  import type { PaymentSummary } from "$lib/payment-rules";

  // Pay for an application without an account: the reference number plus the
  // phone number or email it was submitted with.
  let reference = $state(page.url.searchParams.get("ref") ?? "");
  let contact = $state("");
  let finding = $state(false), error = $state("");
  let found = $state<{ application: PaymentSummary; token: string } | null>(null);

  async function find() {
    finding = true;
    error = "";
    try {
      found = await api("/payments/lookup", { method: "POST", body: JSON.stringify({ reference, contact }) });
    } catch (e) {
      error = e instanceof Error ? e.message : "We could not look up that application.";
    } finally {
      finding = false;
    }
  }
  const division = (type: string) => type.charAt(0) + type.slice(1).toLowerCase();
</script>

<svelte:head>
  <title>Pay for your application — Bengal Port</title>
  <meta name="description" content="Pay a Bengal Port application online with bKash, in full or in part, using your reference number." />
</svelte:head>

<section class="page-hero pay-hero">
  <div class="wrap">
    <span class="eyebrow">PAY ONLINE</span>
    <h1>Pay for your application.</h1>
    <p>Pay in full or in part with bKash. Members can also pay from their <a href="/dashboard">dashboard</a>.</p>
  </div>
</section>

<section class="section pay">
  <div class="wrap">
    {#if found}
      <div class="card">
        <p class="which">{division(found.application.type)} application <b>{found.application.reference}</b> <button type="button" onclick={() => (found = null)}>Not this one?</button></p>
        <PaymentPanel applicationId={found.application.id} token={found.token} summary={found.application} title="What is due" />
      </div>
    {:else}
      <form class="card" onsubmit={(e) => { e.preventDefault(); find(); }}>
        <h2>Find your application</h2>
        <p>Your reference number was shown when you applied and sent to your email. It starts with BP-.</p>
        {#if error}<p class="problem" role="alert">{error}</p>{/if}
        <label><span>Reference number</span><input bind:value={reference} placeholder="BP-XXXXXXXX" autocapitalize="characters" required minlength="3" maxlength="40" /></label>
        <label><span>Phone number or email you applied with</span><input bind:value={contact} required minlength="5" maxlength="160" autocomplete="tel" /></label>
        <button class="btn" disabled={finding}>{finding ? "LOOKING…" : "CONTINUE"}</button>
      </form>
    {/if}
  </div>
</section>

<style>
  .pay-hero{padding-bottom:3.5rem}.pay-hero h1{font-size:clamp(2.2rem,5vw,3.6rem)}.pay-hero a{color:var(--gold-deep);font-weight:700}
  .pay{padding-top:3rem;background:#f4f6f6}
  .pay .wrap{max-width:36rem}
  .card{display:grid;gap:1rem;padding:clamp(1.2rem,4vw,2rem);border:1px solid #e1e7e9;border-radius:1.25rem;background:#fff;box-shadow:0 1rem 3rem rgba(23,48,79,.08)}
  h2{margin:0;font-size:1.4rem;color:var(--heading)}
  .card>p{margin:0;color:var(--muted);line-height:1.6;font-size:.9rem}
  label{display:grid;gap:.4rem;font-size:.84rem;font-weight:750;color:#29465f}
  input{min-height:3rem;border:1px solid #d6dfe2;border-radius:.7rem;padding:.7rem .85rem;outline:none;font-size:1rem}
  input:focus{border-color:#bf8e2d;box-shadow:0 0 0 .2rem rgba(199,152,54,.14)}
  .problem{padding:.7rem .9rem;border-radius:.65rem;background:#fff0f0;color:#943d45;font-size:.86rem}
  .which b{color:var(--heading)}
  .which button{margin-left:.5rem;border:0;background:none;padding:0;color:var(--gold-deep);font-weight:700;text-decoration:underline;cursor:pointer}
  .btn{justify-self:start}
</style>
