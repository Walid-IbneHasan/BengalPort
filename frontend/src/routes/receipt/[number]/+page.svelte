<script lang="ts">
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import { api, ApiError } from "$lib/api";
  import { bdt } from "$lib/invoices";
  import PrintSheet from "$lib/components/PrintSheet.svelte";
  import { Printer } from "lucide-svelte";

  // A payment receipt on the letterhead, for the customer to keep, print or
  // save as PDF. It shows the whole service fee as well as what was paid.
  let receipt = $state<any>(null),
    error = $state(""),
    signInRequired = $state(false);
  onMount(async () => {
    try {
      const key = page.url.searchParams.get("key");
      receipt = await api(`/payments/receipt/${page.params.number}${key ? `?key=${encodeURIComponent(key)}` : ""}`);
    } catch (e) {
      signInRequired = e instanceof ApiError && e.status === 401;
      error = signInRequired
        ? "Sign in to view this receipt."
        : e instanceof ApiError
          ? "Receipt not found"
          : "The receipt could not be loaded. Check your connection and try again.";
    }
  });
  const day = (value: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(value));
  let customer = $derived(receipt ? receipt.payment.application?.fullName || receipt.payment.user?.name || "Customer" : "");
  let fee = $derived(receipt?.payment.application?.amountDue == null ? null : Number(receipt.payment.application.amountDue));
</script>

<svelte:head><title>Payment Receipt {receipt?.receiptNumber ?? ""} — Bengal Port</title></svelte:head>
<section class="section receipt-page">
  {#if error}
    <p class="error" role="alert">
      {error}
      {#if signInRequired}<a href={`/login?next=${page.url.pathname}`}>Sign in</a>{/if}
    </p>
  {:else if !receipt}
    <p class="loading">Loading receipt…</p>
  {:else}
    <div class="tools"><button class="btn" onclick={() => window.print()}><Printer size={17} /> Print / Save as PDF</button></div>
    <PrintSheet signed customerName={customer}>
      <article class="receipt">
        <header>
          <h1>PAYMENT RECEIPT</h1>
          <p>{receipt.receiptNumber}</p>
        </header>
        <dl class="meta">
          <div><dt>Payment date</dt><dd>{day(receipt.createdAt)}</dd></div>
          <div><dt>Customer</dt><dd>{customer}</dd></div>
          <div><dt>Service</dt><dd>{receipt.payment.service}</dd></div>
          {#if receipt.payment.application}<div><dt>Application</dt><dd>{receipt.payment.application.reference}</dd></div>{/if}
          <div><dt>Payment method</dt><dd>{receipt.payment.method}</dd></div>
          <div><dt>Transaction ID</dt><dd>{receipt.payment.gatewayTransactionId || receipt.payment.transactionId}</dd></div>
        </dl>
        <table>
          <tbody>
            {#if fee !== null}<tr><td>Total service fee</td><td>{bdt(fee)}</td></tr>{/if}
            <tr><td>Due before this payment</td><td>{bdt(Number(receipt.previousDue))}</td></tr>
            <tr class="paid"><td>Amount paid</td><td>{bdt(Number(receipt.payment.amount))}</td></tr>
            <tr class="due"><th>Remaining due</th><th>{bdt(Number(receipt.remainingDue))}</th></tr>
          </tbody>
        </table>
        {#if receipt.payment.refunds?.length}
          <div class="refunds">
            <h2>Refunded since this payment</h2>
            <table>
              <tbody>
                {#each receipt.payment.refunds as refund}<tr><td>{day(refund.createdAt)} · {refund.method}</td><td>{bdt(Number(refund.amount))}</td></tr>{/each}
              </tbody>
            </table>
          </div>
        {/if}
      </article>
    </PrintSheet>
  {/if}
</section>

<style>
  .receipt-page{background:#eef1f4}
  .tools{display:flex;justify-content:flex-end;width:min(100%,52rem);margin:0 auto 1rem}
  .tools .btn{display:inline-flex;align-items:center;gap:.45rem}
  .loading,.error{text-align:center;color:var(--navy)}
  .error a{margin-left:.4rem;font-weight:750}
  .receipt{color:#17304f}
  header{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:.3rem 1rem;padding-bottom:.8rem;border-bottom:2px solid #c9952d}
  h1{margin:0;font-size:clamp(1.2rem,3.6vw,1.7rem);letter-spacing:.08em;color:#07182f}
  header p{margin:0;font-weight:800;color:#a87618}
  .meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.2rem 2rem;margin:1.4rem 0}
  .meta div{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;padding:.5rem 0;border-bottom:1px solid rgba(23,48,79,.1)}
  dt{font-size:.8rem;color:#5d7080}
  dd{margin:0;font-weight:700;text-align:right;overflow-wrap:anywhere}
  table{width:100%;border-collapse:collapse;margin-bottom:1rem;font-size:.95rem}
  td,th{padding:.7rem .8rem;border-bottom:1px solid rgba(23,48,79,.12);text-align:left}
  td:last-child,th:last-child{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  .paid td{font-weight:800}
  .due th{background:#07182f;color:#fff}
  .due th:last-child{color:#e1b34a;font-size:1.1rem}
  .refunds h2{margin:1rem 0 .4rem;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;color:#8a6417}
  @media(max-width:36rem){
    .meta{grid-template-columns:1fr}
    table{font-size:.85rem}
  }
  @media print{
    /* Only the receipt: not the site's header, footer or chat button. */
    :global(body > div > :not(main)){display:none}
    :global(html),:global(body){background:#fff!important}
    :global(*){-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .receipt-page{padding:0!important;background:transparent}
    .tools{display:none}
  }
</style>
