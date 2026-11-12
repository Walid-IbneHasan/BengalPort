<script lang="ts">
  import { bdt } from "$lib/invoices";
  import { ledgerNumber } from "$lib/printable";

  // One Hisab Kitab entry on its own, as printed or saved as PDF: money
  // received (income) or money paid out (expense).
  let { entry }: { entry: any } = $props();

  const when = (value: string) =>
    new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(value));
  const statusWords: Record<string, string> = { PAID: "Paid", PARTIALLY_PAID: "Part paid", DUE: "Due", PENDING: "Pending", FAILED: "Failed", REFUNDED: "Refunded" };
  let income = $derived(entry.type === "INCOME");
  let counted = $derived(entry.quantity !== null && entry.unitPrice !== null && entry.quantity !== undefined);
  let customer = $derived(entry.user?.name || entry.customer || "");
</script>

<article class="voucher">
  <header>
    <h1>{income ? "MONEY RECEIVED" : "MONEY PAID OUT"}</h1>
    <p>{ledgerNumber(entry.id)}</p>
  </header>

  <dl class="facts">
    <div><dt>Date</dt><dd>{when(entry.date)}</dd></div>
    <div><dt>Category</dt><dd>{entry.category?.name ?? ""}</dd></div>
    {#if customer}<div><dt>{income ? "Received from" : "Paid to / for"}</dt><dd>{customer}{#if entry.user?.email}<small>{entry.user.email}{entry.user.phone ? ` · ${entry.user.phone}` : ""}</small>{/if}</dd></div>{/if}
    {#if entry.application}<div><dt>Application</dt><dd>{entry.application.reference}</dd></div>{/if}
    {#if entry.payment}<div><dt>Paid by</dt><dd>{entry.payment.method}<small>Transaction {entry.payment.transactionId}{entry.payment.receipt ? ` · Receipt ${entry.payment.receipt.receiptNumber}` : ""}</small></dd></div>{/if}
    {#if entry.paymentStatus}<div><dt>Status</dt><dd>{statusWords[entry.paymentStatus] ?? entry.paymentStatus}</dd></div>{/if}
  </dl>

  <table>
    <thead><tr><th>Description</th>{#if counted}<th class="number">Qty</th><th class="number">Unit price</th>{/if}<th class="number">Amount</th></tr></thead>
    <tbody>
      <tr>
        <td class="description">{entry.description}</td>
        {#if counted}<td class="number">{Number(entry.quantity)}</td><td class="number">{bdt(Number(entry.unitPrice))}</td>{/if}
        <td class="number">{bdt(Number(entry.total))}</td>
      </tr>
    </tbody>
  </table>

  <div class="total"><span>{income ? "Total received" : "Total paid out"}</span><b>{bdt(Number(entry.total))}</b></div>

  {#if entry.notes}<section class="notes"><h2>Notes</h2><p>{entry.notes}</p></section>{/if}
</article>

<style>
  .voucher{color:#17304f}
  header{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding-bottom:.8rem;border-bottom:2px solid #c9952d}
  h1{margin:0;font-size:clamp(1.2rem,3.6vw,1.7rem);letter-spacing:.08em;color:#07182f}
  header p{margin:0;font-weight:800;color:#a87618;white-space:nowrap}
  .facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.2rem 2rem;margin:1.4rem 0}
  .facts div{display:flex;justify-content:space-between;align-items:baseline;gap:1rem;padding:.45rem 0;border-bottom:1px solid rgba(23,48,79,.1)}
  dt{font-size:.8rem;color:#5d7080}
  dd{margin:0;font-size:.9rem;font-weight:700;text-align:right;overflow-wrap:anywhere}
  dd small{display:block;margin-top:.15rem;font-size:.75rem;font-weight:500;color:#5d7080}
  table{width:100%;border-collapse:collapse;font-size:.9rem}
  th{padding:.6rem .7rem;background:#07182f;color:#fff;font-size:.72rem;letter-spacing:.06em;text-align:left}
  td{padding:.75rem .7rem;border-bottom:1px solid rgba(23,48,79,.12);vertical-align:top}
  .description{overflow-wrap:anywhere}
  .number{text-align:right;white-space:nowrap}
  .total{display:flex;justify-content:space-between;align-items:center;gap:1rem;width:min(100%,20rem);margin:1rem 0 0 auto;padding:.65rem .8rem;border-radius:.5rem;background:#07182f;color:#fff}
  .total b{font-size:1.2rem;color:#e1b34a}
  .notes{margin-top:1.4rem;padding:.9rem 1rem;border-radius:.6rem;background:rgba(244,246,247,.85);break-inside:avoid}
  h2{margin:0 0 .4rem;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:#8a6417}
  .notes p{margin:0;font-size:.9rem;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}
  @media(max-width:36rem){
    .facts{grid-template-columns:1fr}
    table{font-size:.78rem}
    th,td{padding:.5rem .35rem}
  }
</style>
