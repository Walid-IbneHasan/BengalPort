<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { ArrowRight, CircleAlert, CircleCheck, CircleX, LoaderCircle } from "lucide-svelte";
  import { api, ApiError } from "$lib/api";
  import { paymentProviders, taka, type PaymentSummary } from "$lib/payment-rules";

  // Where the provider's return leads. Anyone can type this address, so it
  // never proves a payment by itself: "received" is shown only once the server
  // has produced the receipt, and a "pending" payment is checked again.
  const params = page.url.searchParams;
  const named = params.get("method") ?? "";
  const provider = (Object.values(paymentProviders) as string[]).includes(named) ? named : "your payment provider";
  const reference = params.get("ref") ?? "";
  const receiptNumber = params.get("receipt") ?? "";
  const receiptKey = params.get("key") ?? "";
  const paymentId = params.get("payment");
  let status = $state(params.get("status") ?? "error");
  // Whether the receipt behind a "success" address is still being fetched.
  let verifying = $state(params.get("status") === "success");
  let receipt = $state<any>(null);
  let signedIn = $state(false);
  let tries = $state(0);

  const receiptLink = $derived(`/receipt/${receiptNumber}${receiptKey ? `?key=${receiptKey}` : ""}`);
  const payAgain = $derived(signedIn ? "/dashboard" : `/pay${reference ? `?ref=${reference}` : ""}`);

  // A payment whose confirmation the provider had not answered: looking at
  // the application makes the server ask again.
  async function checkPending() {
    let context: { applicationId?: string; token?: string | null } = {};
    try { context = JSON.parse(sessionStorage.getItem("bp_payment") || "{}"); } catch { /* nothing stored */ }
    const applicationId = context.applicationId || params.get("application");
    if (!applicationId) return;
    for (tries = 1; tries <= 6 && status === "pending"; tries++) {
      try {
        const summary = await api<PaymentSummary>(`/payments/application/${applicationId}`, context.token ? { headers: { authorization: `Bearer ${context.token}` } } : undefined);
        // This payment, not merely the latest one on the application.
        const latest = summary.payments.find((item) => item.id === paymentId);
        if (latest) {
          receipt = { payment: { amount: latest.amount }, remainingDue: summary.remaining, receiptNumber: latest.receiptNumber, key: latest.receiptKey };
          status = "confirmed";
          return;
        }
      } catch { /* try again */ }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  onMount(async () => {
    signedIn = Boolean(localStorage.getItem("bp_token"));
    if (status === "success") {
      try {
        if (!receiptNumber) throw new ApiError("No receipt");
        receipt = await api(`/payments/receipt/${receiptNumber}${receiptKey ? `?key=${encodeURIComponent(receiptKey)}` : ""}`);
      } catch (e) {
        // Refused or unknown means no such payment; anything else is the connection.
        status = e instanceof ApiError ? "error" : "unverified";
      } finally {
        verifying = false;
      }
    }
    if (status === "pending") await checkPending();
    if (status !== "pending") try { sessionStorage.removeItem("bp_payment"); } catch { /* nothing stored */ }
  });
</script>

<svelte:head><title>Payment — Bengal Port</title><meta name="robots" content="noindex" /></svelte:head>

<section class="section result">
  <div class="card">
    {#if verifying}
      <i class="wait"><LoaderCircle size={34} /></i>
      <span class="eyebrow">CONFIRMING YOUR PAYMENT</span>
      <h1>One moment.</h1>
      <p>We are fetching your receipt.</p>
    {:else if status === "unverified"}
      <i class="wait"><CircleAlert size={34} /></i>
      <span class="eyebrow">COULD NOT CHECK YET</span>
      <h1>We could not reach our server.</h1>
      <p><b>Please do not pay again.</b> Check your connection and reload this page to see your receipt.</p>
      <div class="actions"><a class="btn" href={page.url.pathname + page.url.search} data-sveltekit-reload>TRY AGAIN <ArrowRight size={17} /></a><a href="/contact">Contact us</a></div>
    {:else if status === "success" || status === "confirmed"}
      <i class="good"><CircleCheck size={34} /></i>
      <span class="eyebrow">PAYMENT RECEIVED</span>
      <h1>Thank you. Your payment is confirmed.</h1>
      {#if receipt}
        <p>
          We received <b>{taka(Number(receipt.payment.amount))}</b>{reference ? ` for application ${reference}` : ""}.
          {#if Number(receipt.remainingDue) > 0}<b>{taka(Number(receipt.remainingDue))}</b> is still due, and you can pay it whenever you are ready.{:else}Your application is now fully paid.{/if}
        </p>
      {:else}
        <p>Your payment{reference ? ` for application ${reference}` : ""} has been recorded.</p>
      {/if}
      <div class="actions">
        {#if status === "success" && receiptNumber}<a class="btn" href={receiptLink}>VIEW RECEIPT <ArrowRight size={17} /></a>
        {:else if receipt?.receiptNumber}<a class="btn" href={`/receipt/${receipt.receiptNumber}${receipt.key ? `?key=${receipt.key}` : ""}`}>VIEW RECEIPT <ArrowRight size={17} /></a>{/if}
        {#if receipt && Number(receipt.remainingDue) > 0}<a href={payAgain}>Pay the rest</a>{/if}
        <a href={signedIn ? "/dashboard" : "/"}>{signedIn ? "Go to my dashboard" : "Back to home"}</a>
      </div>
    {:else if status === "pending"}
      <i class="wait"><LoaderCircle size={34} /></i>
      <span class="eyebrow">CONFIRMING YOUR PAYMENT</span>
      <h1>We are checking with {provider}.</h1>
      {#if tries <= 6}
        <p>This usually takes a few seconds. Please keep this page open.</p>
      {:else}
        <p>
          {provider} has not confirmed the payment yet. <b>Please do not pay again.</b> If the money has left your {provider}
          account, it will be added to your application automatically; you can also <a href="/contact">contact us</a>{reference ? ` with your reference ${reference}` : ""}.
        </p>
        <div class="actions"><a href={payAgain}>Check my balance</a><a href="/">Back to home</a></div>
      {/if}
    {:else if status === "cancelled"}
      <i class="neutral"><CircleX size={34} /></i>
      <span class="eyebrow">PAYMENT CANCELLED</span>
      <h1>No payment was made.</h1>
      <p>You cancelled the payment on {provider}, so nothing was charged. Your application{reference ? ` ${reference}` : ""} is still with us, and you can pay whenever you are ready.</p>
      <div class="actions"><a class="btn" href={payAgain}>TRY AGAIN <ArrowRight size={17} /></a><a href="/">Back to home</a></div>
    {:else if status === "failed"}
      <i class="bad"><CircleAlert size={34} /></i>
      <span class="eyebrow">PAYMENT NOT COMPLETED</span>
      <h1>The payment did not go through.</h1>
      <p>{provider} did not complete the payment, so nothing was added to your application. Please check your {provider} balance and try again.</p>
      <div class="actions"><a class="btn" href={payAgain}>TRY AGAIN <ArrowRight size={17} /></a><a href="/contact">Contact us</a></div>
    {:else}
      <i class="bad"><CircleAlert size={34} /></i>
      <span class="eyebrow">PAYMENT NOT FOUND</span>
      <h1>We could not match this payment.</h1>
      <p>If money has left your {provider} account, please <a href="/contact">contact us</a> with your application reference and the {provider} transaction ID.</p>
      <div class="actions"><a href={payAgain}>Check my balance</a><a href="/">Back to home</a></div>
    {/if}
  </div>
</section>

<style>
  .result{background:#f4f6f6;min-height:70svh;display:grid;align-items:center}
  .card{width:min(38rem,calc(100% - 2rem));margin:auto;padding:clamp(1.6rem,6vw,3rem);border:1px solid #e1e7e9;border-radius:1.25rem;background:#fff;box-shadow:0 1rem 3rem rgba(23,48,79,.08);text-align:center}
  i{display:grid;place-items:center;width:4.2rem;height:4.2rem;margin:0 auto 1.1rem;border-radius:50%}
  i.good{background:#eaf6ef;color:#2f7650}i.bad{background:#fff0f0;color:#943d45}i.neutral{background:#eef1f3;color:#5d6b77}i.wait{background:#fdf8ec;color:#a87618}
  h1{margin:.5rem 0 .8rem;font-size:clamp(1.5rem,5vw,2.1rem);color:var(--heading);line-height:1.2}
  p{margin:0 auto;max-width:30rem;color:var(--muted);line-height:1.7}
  p b{color:var(--heading)}p a{color:var(--gold-deep);font-weight:700}
  .actions{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:.9rem 1.5rem;margin-top:1.8rem}
  .actions a:not(.btn){color:var(--navy);font-weight:750}
  @media(prefers-reduced-motion:no-preference){i.wait :global(svg){animation:turn 1.2s linear infinite}}
  @keyframes turn{to{transform:rotate(360deg)}}
</style>
