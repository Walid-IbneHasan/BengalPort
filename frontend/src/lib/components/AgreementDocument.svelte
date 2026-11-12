<script lang="ts">
  import { shortDate } from "$lib/datetime";
  import { cmsContent } from "$lib/cms";
  import { dealItemsTotal, dealLineAmount, type Deal } from "$lib/deals";
  import { invoiceMoney, statusLabel } from "$lib/invoices";

  // A deal's service agreement as printed on the letterhead: the two
  // parties, the services and price, the timeline, what each side commits
  // to, how it is paid, the terms, and a signature for each side.
  let { deal, dueDates = {} }: { deal: Deal; dueDates?: Record<string, string | null> } = $props();

  const amount = (value: number | null | undefined, currency = deal.currency) => invoiceMoney(value, currency);
  const filled = (text: string | null | undefined) => Boolean(text && text.trim());
  let total = $derived(dealItemsTotal(deal.items));
  // Drafts are payments still to be invoiced; cancelled invoices ask for nothing.
  let schedule = $derived(deal.invoices.filter((invoice) => invoice.state !== "CANCELLED"));
  let figures = $derived(schedule.every((invoice) => invoice.total !== undefined));
  let received = $derived(schedule.reduce((sum, invoice) => sum + Math.round(Number(invoice.paid ?? 0) * 100), 0) / 100);
  const printed = new Date().toISOString();
</script>

<article class="agreement">
  <!-- The letterhead it is printed on carries the logo and the address. -->
  <header>
    <h1>SERVICE AGREEMENT</h1>
    <p>{deal.dealNumber}</p>
  </header>
  <p class="intro">Date: <b>{shortDate(printed)}</b> · {deal.title}</p>

  <section class="parties">
    <div class="party">
      <h2>Service provider</h2>
      <b>{$cmsContent.brand.name || "Bengal Port"}</b>
      {#if $cmsContent.footer.address}<p>{$cmsContent.footer.address}</p>{/if}
      {#if $cmsContent.utility.phone}<p>{$cmsContent.utility.phone}</p>{/if}
      {#if $cmsContent.utility.email}<p>{$cmsContent.utility.email}</p>{/if}
    </div>
    <div class="party">
      <h2>Client</h2>
      <b>{deal.customer.name}</b>
      <p class="code">Customer {deal.customer.customerCode}</p>
      {#if deal.customer.phone}<p>{deal.customer.phone}</p>{/if}
      {#if deal.customer.email}<p>{deal.customer.email}</p>{/if}
      {#if deal.customer.address}<p>{deal.customer.address}</p>{/if}
    </div>
  </section>

  {#if filled(deal.description)}<section class="block"><h2>The work</h2><p>{deal.description}</p></section>{/if}

  <section class="block services">
    <h2>Services</h2>
    <div class="scroll">
    <table>
      <thead><tr><th class="count">#</th><th>Service</th><th class="number">Qty</th><th class="number">Unit price</th><th class="number">Amount</th></tr></thead>
      <tbody>
        {#each deal.items as item, index (index)}
          <tr><td class="count">{index + 1}</td><td class="description">{item.description}{#if item.serviceLine}<small>{item.serviceLine}</small>{/if}</td><td class="number">{item.quantity}</td><td class="number">{amount(item.unitPrice)}</td><td class="number">{amount(dealLineAmount(item))}</td></tr>
        {/each}
      </tbody>
      <tfoot><tr><th colspan="4">Total {deal.currency !== "BDT" ? `(${deal.currency})` : ""}</th><th class="number">{amount(total)}</th></tr></tfoot>
    </table>
    </div>
  </section>

  <section class="block">
    <h2>Timeline</h2>
    <p>
      {#if deal.startDate && deal.endDate}The work starts on <b>{shortDate(deal.startDate)}</b> and is to be finished by <b>{shortDate(deal.endDate)}</b>.
      {:else if deal.startDate}The work starts on <b>{shortDate(deal.startDate)}</b>.
      {:else if deal.endDate}The work is to be finished by <b>{shortDate(deal.endDate)}</b>.
      {:else}The dates are agreed separately.{/if}
    </p>
  </section>

  <section class="commitments">
    <div class="block"><h2>What Bengal Port commits to</h2><p>{filled(deal.companyCommitments) ? deal.companyCommitments : "—"}</p></div>
    <div class="block"><h2>What the client commits to</h2><p>{filled(deal.clientCommitments) ? deal.clientCommitments : "—"}</p></div>
  </section>

  <section class="block">
    <h2>Payment schedule</h2>
    {#if schedule.length}
      <div class="scroll">
      <table class="schedule">
        <thead><tr><th>Invoice</th><th>Due date</th>{#if figures}<th class="number">Amount</th><th class="number">Paid</th>{/if}<th>Status</th></tr></thead>
        <tbody>
          {#each schedule as invoice (invoice.id)}
            <tr>
              <td>{invoice.number}</td>
              <td>{dueDates[invoice.id] ? shortDate(dueDates[invoice.id] as string) : "On the invoice"}</td>
              {#if figures}<td class="number">{amount(invoice.total, invoice.currency)}</td><td class="number">{amount(invoice.paid, invoice.currency)}</td>{/if}
              <td>{invoice.state === "DRAFT" ? "To be issued" : statusLabel(invoice.status)}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      </div>
      {#if figures}<p class="received">Advance and payments received so far: <b>{amount(received)}</b></p>{/if}
    {:else}
      <p>Each payment is asked for with its own invoice, which shows the amount and the date it is due.</p>
    {/if}
  </section>

  {#if filled(deal.terms)}<section class="block terms"><h2>Terms</h2><p>{deal.terms}</p></section>{/if}

  <div class="signatures">
    <div class="sign">
      <span class="space"></span>
      <span class="line"></span>
      <b>For Bengal Port</b>
      <small>Name, title and date</small>
    </div>
    <div class="sign">
      <span class="space"></span>
      <span class="line"></span>
      <b>For the client</b>
      <span>{deal.customer.name}</span>
      <small>Date</small>
    </div>
  </div>

  <footer>Service agreement · {deal.dealNumber} · Printed {shortDate(printed)}</footer>
</article>

<style>
  .agreement{color:#17304f}
  header{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:.3rem 1rem;padding-bottom:.8rem;border-bottom:2px solid #c9952d}
  h1{margin:0;font-size:clamp(1.25rem,3.8vw,1.8rem);letter-spacing:.08em;color:#07182f}
  header p{margin:0;font-weight:800;color:#a87618;white-space:nowrap}
  .intro{margin:.8rem 0 0;font-size:.92rem;color:#4b6072;overflow-wrap:anywhere}
  .parties{display:flex;flex-wrap:wrap;gap:1.25rem 2.5rem;margin:1.5rem 0 .5rem}
  .party{flex:1 1 14rem;min-width:0}
  h2{margin:0 0 .45rem;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:#8a6417}
  .party b{display:block;font-size:1.05rem;overflow-wrap:anywhere}
  .party p{margin:.2rem 0 0;font-size:.88rem;color:#4b6072;overflow-wrap:anywhere}
  .party .code{font-weight:700;color:#17304f}
  .block{margin-top:1.4rem;break-inside:avoid}
  .block>p{margin:0;font-size:.9rem;line-height:1.55;white-space:pre-line;overflow-wrap:anywhere}
  .services{break-inside:auto}
  /* A wide table scrolls on its own on a phone instead of being cut off. */
  .scroll{overflow-x:auto}
  table{width:100%;border-collapse:collapse;font-size:.88rem}
  .schedule td{white-space:nowrap}
  th{padding:.6rem .7rem;background:#07182f;color:#fff;font-size:.72rem;letter-spacing:.06em;text-align:left;white-space:nowrap}
  td{padding:.65rem .7rem;border-bottom:1px solid #e7ebed;vertical-align:top}
  tfoot th{background:#f1f3f5;color:#07182f;font-size:.85rem;letter-spacing:0}
  tfoot th.number{font-size:1rem}
  .description{overflow-wrap:anywhere;min-width:8rem}
  .description small{display:block;margin-top:.15rem;color:#6a7686;font-size:.76rem}
  .count{width:2.25rem;color:#5d7080}
  th.count{color:#fff}
  .number{text-align:right;white-space:nowrap}
  .received{margin:.6rem 0 0;text-align:right;font-size:.88rem}
  /* Flex rather than grid, so a long block is not pushed whole onto the next page. */
  .commitments{display:flex;flex-wrap:wrap;gap:0 2rem}
  .commitments .block{flex:1 1 15rem;min-width:0}
  .terms>p{font-size:.82rem;color:#3c5266}
  .signatures{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;margin-top:3rem;break-inside:avoid}
  .sign{display:flex;flex-direction:column;width:min(15rem,44%);font-size:.82rem;color:#4b6072}
  .space{height:3.4rem}
  .line{display:block;width:100%;border-top:1px solid #17304f;margin:.25rem 0 .45rem}
  .sign b{font-size:.86rem;color:#07182f}
  .sign span:not(.space):not(.line),.sign small{margin-top:.15rem;overflow-wrap:anywhere}
  footer{margin-top:1.75rem;padding-top:.5rem;border-top:1px solid #e7ebed;font-size:.68rem;color:#7a8593;text-align:right}
  tr{break-inside:avoid}
  @media(max-width:36rem){
    table{font-size:.74rem}
    th{padding:.5rem .3rem;font-size:.64rem;letter-spacing:0}
    td{padding:.55rem .3rem}
    .count{width:1.4rem}
    .description{min-width:0}
    .signatures{gap:1rem;margin-top:2rem}
    .sign{width:47%;font-size:.74rem}
  }
</style>
