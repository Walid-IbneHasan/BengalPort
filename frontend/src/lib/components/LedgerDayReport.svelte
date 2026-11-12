<script lang="ts">
  import { bdt } from "$lib/invoices";
  import { ledgerNumber } from "$lib/printable";

  // One day of Hisab Kitab, as printed or saved as PDF: every entry of the
  // day and the day's totals.
  let { day, rows, summary }: { day: string; rows: any[]; summary: { income: number; expense: number; profitLoss: number; transactionCount: number } } = $props();

  const longDate = (value: string) =>
    new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Dhaka" }).format(new Date(`${value}T12:00:00+06:00`));
  const time = (value: string) =>
    new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Dhaka" }).format(new Date(value));
  // Entries typed in by hand carry only a date; those made by a payment carry the time too.
  const timed = (value: string) => !/T0?0:00:00(\.000)?Z$/.test(value);
</script>

<article class="day">
  <header>
    <h1>HISAB KITAB</h1>
    <p>{longDate(day)}</p>
  </header>

  <dl class="totals">
    <div><dt>Income</dt><dd>{bdt(summary.income)}</dd></div>
    <div><dt>Expenses</dt><dd>{bdt(summary.expense)}</dd></div>
    <div class="result" class:loss={summary.profitLoss < 0}><dt>{summary.profitLoss < 0 ? "Loss" : "Profit"}</dt><dd>{bdt(Math.abs(summary.profitLoss))}</dd></div>
    <div><dt>Entries</dt><dd>{summary.transactionCount}</dd></div>
  </dl>

  {#if rows.length}
    <table>
      <thead><tr><th>No.</th><th>Description</th><th>Category</th><th class="number">Income</th><th class="number">Expense</th></tr></thead>
      <tbody>
        {#each rows as row}
          <tr>
            <td class="ref">{ledgerNumber(row.id)}{#if timed(row.date)}<small>{time(row.date)}</small>{/if}</td>
            <td class="description">{row.description}{#if row.user?.name || row.customer}<small>{row.user?.name || row.customer}{row.application ? ` · ${row.application.reference}` : ""}</small>{/if}</td>
            <td>{row.category?.name ?? ""}</td>
            <td class="number">{row.type === "INCOME" ? bdt(Number(row.total)) : ""}</td>
            <td class="number">{row.type === "EXPENSE" ? bdt(Number(row.total)) : ""}</td>
          </tr>
        {/each}
      </tbody>
      <tfoot><tr><th colspan="3">Total for the day</th><th class="number">{bdt(summary.income)}</th><th class="number">{bdt(summary.expense)}</th></tr></tfoot>
    </table>
  {:else}
    <p class="empty">Nothing was recorded on this day.</p>
  {/if}
</article>

<style>
  .day{color:#17304f}
  header{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:.3rem 1rem;padding-bottom:.8rem;border-bottom:2px solid #c9952d}
  h1{margin:0;font-size:clamp(1.2rem,3.6vw,1.7rem);letter-spacing:.08em;color:#07182f}
  header p{margin:0;font-weight:800;color:#a87618}
  .totals{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:.6rem;margin:1.3rem 0}
  .totals div{padding:.65rem .75rem;border-radius:.55rem;background:rgba(244,246,247,.9)}
  dt{font-size:.72rem;letter-spacing:.06em;text-transform:uppercase;color:#5d7080}
  dd{margin:.2rem 0 0;font-size:1.05rem;font-weight:800;font-variant-numeric:tabular-nums}
  .result{background:#07182f!important}
  .result dt{color:#c4ceda}
  .result dd{color:#e1b34a}
  .result.loss dd{color:#ffb4ab}
  table{width:100%;border-collapse:collapse;font-size:.84rem}
  thead th{padding:.55rem .6rem;background:#07182f;color:#fff;font-size:.68rem;letter-spacing:.06em;text-align:left;white-space:nowrap}
  td{padding:.6rem;border-bottom:1px solid rgba(23,48,79,.12);vertical-align:top}
  tr{break-inside:avoid}
  td small{display:block;margin-top:.15rem;font-size:.74rem;color:#5d7080}
  .ref{white-space:nowrap;font-weight:700;color:#5d7080}
  .description{overflow-wrap:anywhere}
  .number{text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums}
  tfoot th{padding:.6rem;border-top:2px solid #07182f;text-align:left;font-size:.84rem}
  tfoot th.number{text-align:right}
  .empty{margin:2rem 0;text-align:center;color:#5d7080}
  @media(max-width:40rem){
    .totals{grid-template-columns:repeat(2,minmax(0,1fr))}
    table{font-size:.72rem}
    thead th,td,tfoot th{padding:.45rem .3rem}
    thead th:nth-child(3),td:nth-child(3){display:none}
    tfoot th[colspan]{font-size:.72rem}
  }
  @media print{
    thead th:nth-child(3),td:nth-child(3){display:table-cell}
  }
</style>
