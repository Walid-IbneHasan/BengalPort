<script lang="ts">
  import { onMount } from "svelte";
  import { ArrowRight, LoaderCircle, ReceiptText, ShieldCheck } from "lucide-svelte";
  import { api } from "$lib/api";
  import { paymentProblem, taka, type PaymentSummary } from "$lib/payment-rules";

  // What an application owes and, when something is left, the choice to pay
  // it all or a part of it through bKash. Paying is always optional.
  // `token` is the payment link of a guest; without it the signed-in
  // session is used. `quiet` shows nothing while no amount has been set.
  let {
    applicationId,
    token,
    summary,
    quiet = false,
    title = "Payment",
  }: {
    applicationId: string;
    token?: string;
    summary?: PaymentSummary;
    quiet?: boolean;
    title?: string;
  } = $props();

  // svelte-ignore state_referenced_locally
  let info = $state<PaymentSummary | null>(summary ?? null);
  // svelte-ignore state_referenced_locally
  let loading = $state(!summary), error = $state(""), starting = $state(false);
  let choice = $state<"full" | "part">("full"), part = $state<number | null>(null);

  const headers = () => (token ? { authorization: `Bearer ${token}` } : undefined);
  let remaining = $derived(info?.remaining ?? 0);
  let amount = $derived(choice === "full" ? remaining : Number(part ?? 0));
  // A part payment is on offer only while the minimum leaves room for one.
  let canSplit = $derived(Boolean(info) && remaining > Math.max(info!.minimumPayment, 0) && remaining > 1);

  onMount(async () => {
    if (info) return;
    try {
      info = await api<PaymentSummary>(`/payments/application/${applicationId}`, { headers: headers() });
    } catch {
      error = "The payment details could not be loaded.";
    } finally {
      loading = false;
    }
  });

  async function pay() {
    if (!info) return;
    error = paymentProblem(amount, { remaining: info.remaining, minimum: info.minimumPayment });
    if (error) return;
    starting = true;
    try {
      const { bkashURL } = await api<{ bkashURL: string }>("/payments/bkash/create", {
        method: "POST",
        headers: headers(),
        body: JSON.stringify({ applicationId, amount }),
      });
      // Read again on the page bKash sends the customer back to.
      try { sessionStorage.setItem("bp_payment", JSON.stringify({ applicationId, token: token ?? null })); } catch { /* storage blocked */ }
      window.location.href = bkashURL;
    } catch (e) {
      error = e instanceof Error ? e.message : "The payment could not be started.";
      starting = false;
    }
  }
</script>

{#if loading}
  {#if !quiet}<div class="payment"><p class="note">Checking what is due…</p></div>{/if}
{:else if info && info.amountDue !== null}
  <div class="payment">
    <h3>{title}</h3>
    <dl>
      <div><dt>Amount due</dt><dd>{taka(info.amountDue)}</dd></div>
      <div><dt>Paid</dt><dd>{taka(info.paid)}</dd></div>
      <div class="left"><dt>Remaining</dt><dd>{taka(remaining)}</dd></div>
    </dl>

    {#if remaining === 0}
      <p class="done"><ShieldCheck size={17} /> Fully paid. Thank you.</p>
    {:else if !info.onlinePayment}
      <p class="note">Online payment is not available yet. Please contact us to arrange payment.</p>
    {:else}
      <form onsubmit={(e) => { e.preventDefault(); pay(); }}>
        {#if canSplit}
          <label class="option"><input type="radio" bind:group={choice} value="full" /><span>Pay in full <b>{taka(remaining)}</b></span></label>
          <label class="option"><input type="radio" bind:group={choice} value="part" /><span>Pay a part now</span></label>
          {#if choice === "part"}
            <label class="amount">
              <span>Amount (৳)</span>
              <input type="number" inputmode="decimal" min="1" max={remaining} step="0.01" bind:value={part} placeholder={info.minimumPayment > 0 ? `${info.minimumPayment} or more` : "Amount"} required />
              {#if info.minimumPayment > 0}<small>The smallest part payment is {taka(Math.min(info.minimumPayment, remaining))}. You can pay the rest later.</small>{:else}<small>You can pay the rest later.</small>{/if}
            </label>
          {/if}
        {/if}
        {#if error}<p class="problem" role="alert">{error}</p>{/if}
        <button class="pay" disabled={starting}>
          {#if starting}<LoaderCircle size={17} /> Opening bKash…{:else}Pay {amount > 0 ? taka(amount) : ""} with bKash <ArrowRight size={17} />{/if}
        </button>
        <small class="assure">Paying now is optional. You approve the payment on bKash's own page with your wallet PIN; Bengal Port never sees it.</small>
      </form>
    {/if}

    {#if info.payments.length}
      <ul class="history">
        {#each info.payments as payment}
          <li>
            <span><b>{taka(payment.amount)}</b> · {payment.method} · {new Date(payment.paidAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
            {#if payment.receiptNumber}<a href={`/receipt/${payment.receiptNumber}${payment.receiptKey ? `?key=${payment.receiptKey}` : ""}`}><ReceiptText size={15} /> Receipt</a>{/if}
          </li>
        {/each}
      </ul>
    {/if}
  </div>
{:else if info && !quiet}
  <div class="payment">
    <h3>{title}</h3>
    <p class="note">The amount for this application has not been confirmed yet. Our team will let you know, and you can then pay here.</p>
  </div>
{:else if error && !quiet}
  <div class="payment"><p class="problem" role="alert">{error}</p></div>
{/if}

<style>
  .payment{display:grid;gap:.8rem;text-align:left}
  h3{margin:0;font-size:1.05rem;color:#17304f}
  dl{margin:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.5rem}
  dl div{padding:.65rem .75rem;border:1px solid #e1e7e9;border-radius:.65rem;background:#fff}
  dt{font-size:.7rem;color:#748391}
  dd{margin:.15rem 0 0;font-size:1rem;font-weight:800;color:#17304f}
  .left{border-color:#e6cf9a;background:#fdf8ec}
  form{display:grid;gap:.55rem}
  .option{display:flex;align-items:center;gap:.6rem;min-height:2.8rem;padding:.55rem .75rem;border:1px solid #dfe5e8;border-radius:.65rem;background:#fff;color:#33465a;font-size:.9rem;cursor:pointer}
  .option input{width:1.05rem;height:1.05rem;accent-color:#b78320;flex:none}
  .option b{color:#17304f}
  .amount{display:grid;gap:.35rem;font-size:.8rem;font-weight:750;color:#29465f}
  .amount input{min-height:2.9rem;border:1px solid #d6dfe2;border-radius:.65rem;padding:.6rem .8rem;font-size:1rem;outline:none}
  .amount input:focus{border-color:#bf8e2d;box-shadow:0 0 0 .2rem rgba(199,152,54,.14)}
  .amount small,.assure,.note{font-size:.76rem;font-weight:400;line-height:1.5;color:#6b7b88;margin:0}
  .pay{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;min-height:3rem;border:0;border-radius:1.6rem;padding:.7rem 1.3rem;background:#e2136e;color:#fff;font-weight:800;font-size:.95rem;cursor:pointer;transition:transform 150ms cubic-bezier(.23,1,.32,1),background-color 180ms ease}
  .pay:active{transform:scale(.98)}
  .pay:disabled{opacity:.7;cursor:default}
  .problem{margin:0;padding:.6rem .8rem;border-radius:.6rem;background:#fff0f0;color:#943d45;font-size:.84rem}
  .done{display:flex;align-items:center;gap:.45rem;margin:0;padding:.6rem .8rem;border-radius:.6rem;background:#e9f7ee;color:#267145;font-size:.88rem;font-weight:700}
  .history{list-style:none;margin:0;padding:0;display:grid;gap:.35rem}
  .history li{display:flex;flex-wrap:wrap;justify-content:space-between;gap:.4rem 1rem;padding:.5rem .1rem;border-top:1px solid #edf0f2;font-size:.82rem;color:#526477}
  .history b{color:#17304f}
  .history a{display:inline-flex;align-items:center;gap:.3rem;color:#a87618;font-weight:750;text-decoration:none}
  @media(hover:hover) and (pointer:fine){.pay:not(:disabled):hover{background:#c90f61}.option:hover{border-color:#c9d2d7}}
  @media(max-width:30rem){dl{grid-template-columns:1fr}dl div{display:flex;justify-content:space-between;align-items:center}dd{margin:0}}
  @media(prefers-reduced-motion:reduce){.pay{transition-duration:.01ms}}
</style>
