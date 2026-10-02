<script lang="ts">
  import { onMount } from "svelte";
  import { X } from "lucide-svelte";
  import { api } from "$lib/api";
  import { taka } from "$lib/payment-rules";

  // Admin: the refunds of one payment, and sending money back. A bKash payment
  // is refunded through bKash, to the wallet that paid; for any other payment
  // staff record how they returned the money.
  type Refund = { id: string; amount: string; reason: string; method: string; status: "PENDING" | "COMPLETED" | "FAILED"; gatewayRefundId: string | null; recordedBy: string; createdAt: string };
  type State = {
    payment: { id: string; amount: number; method: string; status: string; payerAccount: string | null; application: { reference: string; fullName: string } | null };
    viaGateway: boolean;
    gatewayReady: boolean;
    refundable: number;
    refunds: Refund[];
  };
  let { paymentId, onchange, onclose }: { paymentId: string; onchange: () => void; onclose: () => void } = $props();
  let info = $state<State | null>(null);
  let amount = $state<number | null>(null), reason = $state(""), method = $state("Cash");
  let loading = $state(true), sending = $state(false), error = $state(""), notice = $state("");
  const methods = ["Cash", "Bank transfer", "bKash (sent by staff)", "Cheque", "Other"];
  const labels = { COMPLETED: "Refunded", PENDING: "Waiting for bKash", FAILED: "Not made" };

  async function load(keepAmount = false) {
    try {
      info = await api<State>(`/payments/${paymentId}/refunds`);
      if (!keepAmount) amount = info.refundable || null;
    } catch (e) {
      error = e instanceof Error ? e.message : "The refunds could not be loaded.";
    } finally {
      loading = false;
    }
  }
  onMount(load);

  async function send() {
    if (!info || amount === null) return;
    const where = info.viaGateway ? `to the customer's bKash wallet${info.payment.payerAccount ? ` (${info.payment.payerAccount})` : ""}. bKash sends the money straight away and it cannot be undone` : `as returned by ${method.toLowerCase()}`;
    if (!confirm(`Record a refund of ${taka(Number(amount))} ${where}?`)) return;
    sending = true;
    error = notice = "";
    try {
      const refund = await api<Refund>(`/payments/${paymentId}/refunds`, {
        method: "POST",
        body: JSON.stringify({ amount: Number(amount), reason, ...(info.viaGateway ? {} : { method }) }),
      });
      notice =
        refund.status === "COMPLETED"
          ? `${taka(Number(refund.amount))} has been refunded.`
          : "bKash did not answer. The refund is waiting: open this payment again in a few minutes to see whether it went through. Its amount is held back until then.";
      reason = "";
      await load();
      onchange();
    } catch (e) {
      error = e instanceof Error ? e.message : "The refund could not be made.";
      await load(true);
    } finally {
      sending = false;
    }
  }
  const when = (value: string) => new Date(value).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && onclose()} />
<div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onclose()}>
  <div class="panel" role="dialog" aria-modal="true" aria-labelledby="refund-title">
    <header>
      <div><span>PAYMENT</span><h2 id="refund-title">Refunds</h2></div>
      <button aria-label="Close" onclick={onclose}><X /></button>
    </header>
    <div class="body">
      {#if loading}
        <p class="hint">Loading…</p>
      {:else if !info}
        <p class="problem" role="alert">{error}</p>
      {:else}
        <section>
          <dl>
            <div><dt>Customer</dt><dd>{info.payment.application ? `${info.payment.application.fullName} · ${info.payment.application.reference}` : "Walk-in customer"}</dd></div>
            <div><dt>Payment</dt><dd>{taka(info.payment.amount)} by {info.payment.method}</dd></div>
            <div><dt>Can still be refunded</dt><dd>{taka(info.refundable)}</dd></div>
          </dl>
        </section>

        {#if notice}<p class="done" role="status">{notice}</p>{/if}
        {#if error}<p class="problem" role="alert">{error}</p>{/if}

        {#if info.refundable > 0}
          {#if info.viaGateway && !info.gatewayReady}
            <p class="hint boxed">bKash is not connected on the server, so this payment cannot be refunded here. Refund it in the bKash merchant portal.</p>
          {:else}
            <form onsubmit={(e) => { e.preventDefault(); send(); }}>
              <h3>Refund this payment</h3>
              <div class="grid">
                <label><span>Amount (৳)</span><input type="number" min="0.01" max={info.refundable} step="0.01" bind:value={amount} required /></label>
                {#if !info.viaGateway}<label><span>How the money was returned</span><select bind:value={method}>{#each methods as item}<option>{item}</option>{/each}</select></label>{/if}
              </div>
              <label><span>Reason</span><textarea rows="2" bind:value={reason} required minlength="3" maxlength="255" placeholder="e.g. The applicant withdrew"></textarea></label>
              <p class="hint">
                {#if info.viaGateway}bKash sends the money to the wallet that paid{info.payment.payerAccount ? ` (${info.payment.payerAccount})` : ""}, straight away. bKash allows refunds for 60 days after a payment.{:else}This records a refund you have already made by hand; no money is moved by the website.{/if}
                The customer is emailed.
              </p>
              <button class="send" disabled={sending}>{sending ? "Refunding…" : info.viaGateway ? "Refund through bKash" : "Record refund"}</button>
            </form>
          {/if}
        {:else if info.payment.status === "REFUNDED"}
          <p class="hint boxed">This payment has been refunded in full.</p>
        {/if}

        <section>
          <h3>Refunds so far</h3>
          {#if info.refunds.length}
            <ul>
              {#each info.refunds as refund (refund.id)}
                <li>
                  <div class="line"><b>{taka(Number(refund.amount))}</b><i class={refund.status.toLowerCase()}>{labels[refund.status]}</i></div>
                  <p>{refund.reason}</p>
                  <small>{refund.method}{refund.gatewayRefundId ? ` · ${refund.gatewayRefundId}` : ""} · {refund.recordedBy} · {when(refund.createdAt)}</small>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="hint">Nothing has been refunded on this payment.</p>
          {/if}
        </section>
      {/if}
    </div>
  </div>
</div>

<style>
  .backdrop{position:fixed;inset:0;z-index:110;background:#07182f80;display:flex;justify-content:flex-end;backdrop-filter:blur(2px)}
  .panel{width:min(32rem,100vw);height:100%;overflow-y:auto;background:#f7f8f9;box-shadow:-2rem 0 5rem #07182f2b}
  header{background:#102640;color:#fff;padding:1.4rem 1.5rem;display:flex;justify-content:space-between;align-items:center}
  header span{font-size:.7rem;letter-spacing:.14em;color:var(--gold);font-weight:800}
  header h2{margin:.3rem 0 0}
  header button{width:2.5rem;height:2.5rem;border:0;border-radius:.65rem;background:#ffffff12;color:#fff;display:grid;place-items:center;cursor:pointer}
  .body{padding:1.5rem;display:grid;gap:1rem}
  section,form{background:#fff;border:1px solid #e0e5e8;border-radius:.8rem;padding:1rem 1.1rem}
  form{display:grid;gap:.8rem}
  h3{margin:0 0 .5rem;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;color:var(--gold-deep)}
  form h3{margin:0}
  dl{margin:0}
  dl>div{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:1rem;padding:.5rem 0;border-top:1px solid #edf0f2}
  dl>div:first-child{border-top:0}
  dt{font-size:.74rem;color:#6d7b89}
  dd{margin:0;font-size:.8rem;font-weight:650;color:#23384f;overflow-wrap:anywhere}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
  label{display:grid;gap:.35rem}
  label span{font-size:.72rem;font-weight:750;color:#405267}
  input,select,textarea{width:100%;border:1px solid #d6dde2;border-radius:.6rem;padding:.6rem .75rem;background:#fff;outline:none;font-size:.84rem}
  textarea{resize:vertical;line-height:1.5}
  input:focus,select:focus,textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px #c7983620}
  .hint{margin:0;font-size:.74rem;line-height:1.5;color:#6d7b89}
  .boxed{background:#fff;border:1px solid #e0e5e8;border-radius:.8rem;padding:.9rem 1.1rem}
  .send{justify-self:end;min-height:2.6rem;border:0;border-radius:.7rem;padding:.6rem 1.1rem;background:var(--gold);color:var(--heading);font-weight:750;cursor:pointer}
  .send:disabled{opacity:.6}
  .problem{margin:0;padding:.7rem .9rem;border-radius:.6rem;background:#fff0f0;color:#922f2f;font-size:.8rem;line-height:1.5}
  .done{margin:0;padding:.7rem .9rem;border-radius:.6rem;background:#eaf7ef;color:#276541;font-size:.8rem;line-height:1.5}
  ul{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
  li{background:#f7f8f9;border:1px solid #e6eaed;border-radius:.65rem;padding:.7rem .8rem}
  .line{display:flex;justify-content:space-between;align-items:center;gap:.6rem}
  .line b{font-size:.9rem;color:#23384f}
  .line i{font-style:normal;font-size:.68rem;font-weight:750;padding:.2rem .5rem;border-radius:.4rem}
  .completed{background:#e8f5ef;color:#347854}
  .pending{background:#faf1da;color:#7a5a12}
  .failed{background:#fdeaea;color:#922f2f}
  li p{margin:.35rem 0 .25rem;font-size:.8rem;line-height:1.5;color:#40546a;overflow-wrap:anywhere}
  li small{font-size:.7rem;color:#6d7b89}
  /* On phones and tablets fields use 16px text: iPhones zoom the page when a smaller field is focused. */
  @media(max-width:58rem){input,select,textarea{font-size:1rem}}
  @media(max-width:30rem){.grid{grid-template-columns:1fr}.body{padding:1.1rem}header{padding:1.1rem}}
</style>
