<script lang="ts">
  import { cmsContent } from "$lib/cms";
  import { shortDate } from "$lib/datetime";
  import { bdt, lineAmount, statusLabel, type Invoice } from "$lib/invoices";

  let { invoice }: { invoice: Invoice } = $props();
</script>

<article class="invoice">
  <header>
    <div class="brand">
      <img src="/images/logo-192.webp" alt="" width="72" height="72" />
      <div><strong>BENGAL PORT</strong><span>Connecting Bengal to the World</span></div>
    </div>
    <div class="heading"><h1>INVOICE</h1><p>{invoice.number}</p></div>
  </header>

  <section class="parties">
    <div class="customer">
      <h2>Billed to</h2>
      <b>{invoice.customerName}</b>
      {#if invoice.customerPhone}<p>{invoice.customerPhone}</p>{/if}
      {#if invoice.customerEmail}<p>{invoice.customerEmail}</p>{/if}
      {#if invoice.customerAddress}<p>{invoice.customerAddress}</p>{/if}
    </div>
    <dl>
      <div><dt>Invoice date</dt><dd>{shortDate(invoice.issuedAt)}</dd></div>
      {#if invoice.dueAt}<div><dt>Due date</dt><dd>{shortDate(invoice.dueAt)}</dd></div>{/if}
      {#if invoice.application}<div><dt>Application</dt><dd>{invoice.application.reference}</dd></div>{/if}
      <div><dt>Status</dt><dd><mark class={invoice.status.toLowerCase()}>{statusLabel(invoice.status)}</mark></dd></div>
    </dl>
  </section>

  <div class="lines">
    <table>
      <thead><tr><th class="count">#</th><th>Description</th><th class="number">Qty</th><th class="number">Unit price</th><th class="number">Amount</th></tr></thead>
      <tbody>
        {#each invoice.items as line, index}
          <tr><td class="count">{index + 1}</td><td class="description">{line.description}</td><td class="number">{line.quantity}</td><td class="number">{bdt(line.unitPrice)}</td><td class="number">{bdt(lineAmount(line))}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>

  <section class="sums">
    <dl>
      <div><dt>Total</dt><dd>{bdt(invoice.total)}</dd></div>
      <div><dt>Paid</dt><dd>{bdt(invoice.paid)}</dd></div>
      <div class="due"><dt>Due</dt><dd>{bdt(invoice.due)}</dd></div>
    </dl>
  </section>

  {#if invoice.notes}<section class="notes"><h2>Notes</h2><p>{invoice.notes}</p></section>{/if}

  <footer>
    <p>Thank you for choosing Bengal Port.</p>
    <p>{$cmsContent.footer.address} · {$cmsContent.utility.phone} · {$cmsContent.utility.email}</p>
  </footer>
</article>

<style>
  .invoice{width:min(100%,52rem);margin:auto;padding:clamp(1.25rem,5vw,3rem);background:#fff;color:#17304f;box-shadow:0 1rem 3rem rgba(23,48,79,.1)}
  header{display:flex;align-items:center;justify-content:space-between;gap:1.5rem;padding-bottom:1.25rem;border-bottom:3px solid #c9952d}
  .brand{display:flex;align-items:center;gap:.9rem;min-width:0}
  .brand img{width:4.5rem;height:4.5rem;border-radius:50%;flex:none}
  .brand strong{display:block;font-size:1.3rem;letter-spacing:.01em;color:#07182f}
  .brand span{display:block;margin-top:.15rem;font-size:.82rem;color:#5d7080}
  .heading{text-align:right}
  h1{margin:0;font-size:clamp(1.6rem,5vw,2.25rem);letter-spacing:.06em;color:#07182f}
  .heading p{margin:.2rem 0 0;font-weight:750;color:#a87618}
  .parties{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,16rem);gap:1.5rem 2.5rem;margin:1.75rem 0}
  h2{margin:0 0 .45rem;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:#8a6417}
  .customer b{display:block;font-size:1.1rem;overflow-wrap:anywhere}
  .customer p{margin:.2rem 0 0;font-size:.9rem;color:#4b6072;overflow-wrap:anywhere}
  dl{margin:0}
  dl>div{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:.42rem 0}
  dt{font-size:.82rem;color:#5d7080}
  dd{margin:0;font-size:.9rem;font-weight:700;text-align:right;overflow-wrap:anywhere}
  .parties dl>div+div{border-top:1px solid #e7ebed}
  mark{display:inline-block;padding:.18rem .6rem;border-radius:1rem;font-size:.75rem;font-weight:800}
  mark.paid{background:#e4f5ed;color:#17704b}
  mark.partially_paid{background:#fbf1da;color:#7c5a12}
  mark.due{background:#fdeaea;color:#a83a32}
  .lines{overflow-x:auto}
  table{width:100%;border-collapse:collapse;font-size:.9rem}
  th{padding:.65rem .75rem;background:#07182f;color:#fff;font-size:.72rem;letter-spacing:.06em;text-align:left;white-space:nowrap}
  td{padding:.75rem;border-bottom:1px solid #e7ebed;vertical-align:top}
  .description{overflow-wrap:anywhere;min-width:9rem}
  .count{width:2.25rem;color:#5d7080}
  th.count{color:#fff}
  .number{text-align:right;white-space:nowrap}
  .sums{display:flex;justify-content:flex-end;margin-top:1.25rem;break-inside:avoid}
  .sums dl{width:min(100%,20rem)}
  .sums dl>div{padding:.5rem .75rem}
  .sums dd{font-size:1rem}
  .sums .due{margin-top:.35rem;border-radius:.5rem;background:#07182f}
  .sums .due dt,.sums .due dd{color:#fff;font-weight:800}
  .sums .due dd{font-size:1.2rem;color:#e1b34a}
  .notes{margin-top:1.75rem;padding:1rem;border-radius:.6rem;background:#f4f6f7;break-inside:avoid}
  .notes p{margin:0;font-size:.9rem;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
  footer{margin-top:2.25rem;padding-top:1rem;border-top:1px solid #e7ebed;text-align:center;font-size:.8rem;color:#5d7080;break-inside:avoid}
  footer p{margin:.15rem 0}
  footer p:first-child{font-weight:700;color:#17304f}
  tr{break-inside:avoid}
  .heading p{white-space:nowrap}
  @media(max-width:36rem){
    header{flex-direction:column;align-items:flex-start;gap:.9rem}
    .heading{text-align:left}
    .parties{grid-template-columns:1fr}
    .brand img{width:3.25rem;height:3.25rem}
    .brand strong{font-size:1.05rem}
    .brand span{font-size:.72rem}
    /* All five columns stay on screen at phone width. */
    table{font-size:.76rem}
    th{padding:.5rem .3rem;font-size:.66rem;letter-spacing:0}
    td{padding:.6rem .3rem}
    .count{width:1.4rem}
    .description{min-width:0}
  }
  @media print{
    .invoice{width:100%;padding:0;box-shadow:none}
  }
</style>
