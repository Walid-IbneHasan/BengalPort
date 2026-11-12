<script lang="ts">
  import { shortDate } from "$lib/datetime";
  import { imageUrl } from "$lib/office-files";
  import { toneOf } from "$lib/office";
  import { api } from "$lib/api";
  import { documentsContentFrom } from "$lib/documents-content";
  import { customerCodeText, dealNumberOf, invoiceMoney, lineAmount, rateText, statusLabel, type Invoice } from "$lib/invoices";

  // The invoice as printed on the letterhead (the print page and the link
  // shared with the customer): who it is for, the services and amounts, the
  // timeline, what each side commits to, the terms, and the signature it was
  // issued with.
  let { invoice }: { invoice: Invoice } = $props();

  let currency = $derived(invoice.currency || "BDT");
  let version = $derived(invoice.version ?? 1);
  let credited = $derived(Number(invoice.credited ?? 0));
  let customerCode = $derived(customerCodeText(invoice.customer?.code));
  let dealNumber = $derived(dealNumberOf(invoice.deal?.number));
  const amount = (value: number | null | undefined) => invoiceMoney(value, currency);
  const filled = (text: string | null | undefined) => Boolean(text && text.trim());

  // The authority signature recorded when it was issued. The shared link
  // brings the picture with it; staff fetch it with their own session.
  let fetched = $state("");
  $effect(() => {
    const id = invoice.signature?.id;
    if (invoice.signature?.image || !id) return;
    let url = "",
      gone = false;
    imageUrl(`/office/signatures/${id}/image`)
      .then((made) => {
        if (gone) URL.revokeObjectURL(made);
        else fetched = url = made;
      })
      .catch(() => {
        // Printed without the picture; the name and title still show.
      });
    return () => {
      gone = true;
      if (url) URL.revokeObjectURL(url);
    };
  });
  // Invoices issued before signatures were recorded (no signature and no
  // "issued by") keep printing the owner's signature from the Documents
  // and PDFs settings, as they always did.
  let earlier = $state<{ image: string; ownerName: string; ownerTitle: string } | null>(null);
  $effect(() => {
    if (invoice.signature || invoice.issuedByName || invoice.state === "DRAFT") return;
    api<{ content: unknown }>("/content/documents", { cache: "no-store" })
      .then((page) => {
        const saved = documentsContentFrom(page?.content).signatures;
        if (saved.signatureImage || saved.ownerName) earlier = { image: saved.signatureImage, ownerName: saved.ownerName, ownerTitle: saved.ownerTitle };
      })
      .catch(() => {
        // Printed with the blank line to sign by hand.
      });
  });
  let signatureImage = $derived(invoice.signature?.image || fetched || earlier?.image || "");
  let signer = $derived(invoice.signature ?? (earlier?.ownerName ? earlier : null));

  // A stamp across the top for an invoice that is not simply waiting for payment.
  let stamp = $derived(
    invoice.state === "DRAFT"
      ? { text: "Draft – not issued", tone: "quiet" }
      : invoice.status === "CANCELLED"
        ? { text: "Cancelled", tone: "bad" }
        : invoice.status === "REFUNDED"
          ? { text: "Refunded", tone: "bad" }
          : invoice.status === "PAID"
            ? { text: "Paid", tone: "good" }
            : null,
  );
  let owing = $derived(Number(invoice.due) > 0 && (invoice.state === "ISSUED" || invoice.state === "DRAFT"));
</script>

<article class="invoice">
  <!-- The letterhead it is printed on carries the logo and the address. -->
  <header>
    <div class="title">
      <h1>INVOICE</h1>
      {#if version > 1}<span class="version">Version {version}</span>{/if}
    </div>
    {#if stamp}<span class="stamp {stamp.tone}">{stamp.text}</span>{/if}
    <p>{invoice.number}</p>
  </header>

  {#if invoice.state === "CANCELLED" && invoice.cancelReason}<p class="cancelled">Cancelled: {invoice.cancelReason}</p>{/if}

  <section class="parties">
    <div class="customer">
      <h2>Billed to</h2>
      <b>{invoice.customerName}</b>
      {#if customerCode}<p class="code">Customer {customerCode}</p>{/if}
      {#if invoice.customerPhone}<p>{invoice.customerPhone}</p>{/if}
      {#if invoice.customerEmail}<p>{invoice.customerEmail}</p>{/if}
      {#if invoice.customerAddress}<p>{invoice.customerAddress}</p>{/if}
    </div>
    <dl>
      <div><dt>Invoice date</dt><dd>{shortDate(invoice.issuedAt)}</dd></div>
      {#if invoice.dueAt}<div><dt>Due date</dt><dd>{shortDate(invoice.dueAt)}</dd></div>{/if}
      {#if dealNumber}<div><dt>Deal</dt><dd>{dealNumber}</dd></div>{/if}
      {#if invoice.application}<div><dt>Application</dt><dd>{invoice.application.reference}</dd></div>{/if}
      {#if currency !== "BDT"}<div><dt>Currency</dt><dd>{currency}</dd></div>{/if}
      {#if currency !== "BDT" && invoice.exchangeRate}<div><dt>Exchange rate</dt><dd>{rateText(currency, invoice.exchangeRate)}</dd></div>{/if}
      <div><dt>Status</dt><dd><mark class={toneOf(invoice.status)}>{statusLabel(invoice.status)}</mark></dd></div>
    </dl>
  </section>

  {#if invoice.startDate || invoice.endDate}
    <section class="timeline">
      <h2>Timeline</h2>
      <p>
        {#if invoice.startDate && invoice.endDate}Work from <b>{shortDate(invoice.startDate)}</b> to <b>{shortDate(invoice.endDate)}</b>
        {:else if invoice.startDate}Work starts <b>{shortDate(invoice.startDate)}</b>
        {:else if invoice.endDate}Work to be finished by <b>{shortDate(invoice.endDate)}</b>{/if}
      </p>
    </section>
  {/if}

  <div class="lines">
    <table>
      <thead><tr><th class="count">#</th><th>Service</th><th class="number">Qty</th><th class="number">Unit price</th><th class="number">Amount</th></tr></thead>
      <tbody>
        {#each invoice.items as line, index (index)}
          <tr><td class="count">{index + 1}</td><td class="description">{line.description}</td><td class="number">{line.quantity}</td><td class="number">{amount(line.unitPrice)}</td><td class="number">{amount(lineAmount(line))}</td></tr>
        {/each}
      </tbody>
    </table>
  </div>

  <section class="sums">
    <dl>
      <div><dt>Total</dt><dd>{amount(invoice.total)}</dd></div>
      {#if credited > 0}<div><dt>Credit notes</dt><dd>{amount(-credited)}</dd></div>{/if}
      <div><dt>Paid</dt><dd>{amount(invoice.paid)}</dd></div>
      <div class="due"><dt>Balance due</dt><dd>{amount(invoice.due)}</dd></div>
    </dl>
  </section>

  {#if invoice.allocations?.length}
    <ul class="credit-notes" aria-label="Payments received">
      {#each invoice.allocations as part, index (index)}<li><span>Paid{part.payment?.paidAt ? ` ${shortDate(part.payment.paidAt)}` : ""}{part.payment?.method ? ` · ${part.payment.method}` : ""}</span><b>{amount(part.amount)}</b></li>{/each}
    </ul>
  {/if}
  {#if invoice.creditNotes?.length}
    <ul class="credit-notes" aria-label="Credit notes">
      {#each invoice.creditNotes as note (note.reference)}<li><span>{note.reference} · {shortDate(note.createdAt)} · {note.reason}</span><b>{amount(-note.amount)}</b></li>{/each}
    </ul>
  {/if}

  {#if invoice.state !== "CANCELLED" && invoice.state !== "REFUNDED"}
    <section class="block">
      <h2>Payment terms</h2>
      {#if owing}
        <p>Please pay <b>{amount(invoice.due)}</b>{#if invoice.dueAt}{" by "}<b>{shortDate(invoice.dueAt)}</b>{/if}. Every payment is acknowledged with a receipt.</p>
      {:else}
        <p>Paid in full. Thank you.</p>
      {/if}
    </section>
  {/if}

  {#if filled(invoice.companyCommitments) || filled(invoice.clientCommitments)}
    <section class="commitments">
      {#if filled(invoice.companyCommitments)}<div class="block"><h2>What Bengal Port commits to</h2><p>{invoice.companyCommitments}</p></div>{/if}
      {#if filled(invoice.clientCommitments)}<div class="block"><h2>What the client commits to</h2><p>{invoice.clientCommitments}</p></div>{/if}
    </section>
  {/if}

  {#if filled(invoice.terms)}<section class="block terms"><h2>Terms</h2><p>{invoice.terms}</p></section>{/if}
  {#if filled(invoice.notes)}<section class="block notes"><h2>Notes</h2><p>{invoice.notes}</p></section>{/if}

  <div class="signatures">
    <div class="sign">
      <span class="space"></span>
      <span class="line"></span>
      <b>Customer's signature</b>
      <span>{invoice.customerName}</span>
    </div>
    <div class="sign owner">
      <span class="space">{#if signatureImage}<img src={signatureImage} alt={`Signature of ${signer?.ownerName ?? "Bengal Port"}`} />{/if}</span>
      <span class="line"></span>
      <b>Authorised signature</b>
      {#if signer}
        <span>{signer.ownerName}</span>
        <small>{signer.ownerTitle || "For Bengal Port"}</small>
      {:else}
        <small>For Bengal Port</small>
      {/if}
    </div>
  </div>

  <footer>Template {invoice.templateVersion || "2026-11"} · Version {version}{invoice.issuedByName ? ` · Issued by ${invoice.issuedByName}` : ""}</footer>
</article>

<style>
  .invoice{position:relative;color:#17304f}
  header{display:flex;align-items:baseline;justify-content:space-between;flex-wrap:wrap;gap:.3rem 1rem;padding-bottom:.8rem;border-bottom:2px solid #c9952d}
  .title{display:flex;align-items:baseline;flex-wrap:wrap;gap:.25rem .75rem}
  h1{margin:0;font-size:clamp(1.35rem,4vw,1.9rem);letter-spacing:.08em;color:#07182f}
  .version{font-size:.78rem;font-weight:800;letter-spacing:.06em;color:#8a6417}
  header p{margin:0;font-weight:800;color:#a87618;white-space:nowrap}
  .stamp{display:inline-block;margin-left:auto;padding:.2rem .7rem;border:3px solid currentColor;border-radius:.4rem;font-size:clamp(.8rem,2.4vw,1rem);font-weight:900;letter-spacing:.14em;text-transform:uppercase;transform:rotate(-6deg);opacity:.9}
  .stamp.good{color:#17704b}
  .stamp.bad{color:#a83a32}
  .stamp.quiet{color:#6a7686}
  .cancelled{margin:1rem 0 0;padding:.6rem .8rem;border-radius:.5rem;background:#fdeaea;color:#a83a32;font-size:.86rem;font-weight:700;overflow-wrap:anywhere}
  .parties{display:flex;flex-wrap:wrap;gap:1.5rem 2.5rem;margin:1.75rem 0}
  .customer{flex:1 1 14rem;min-width:0}
  .parties dl{flex:0 1 17rem;min-width:0}
  h2{margin:0 0 .45rem;font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:#8a6417}
  .customer b{display:block;font-size:1.1rem;overflow-wrap:anywhere}
  .customer p{margin:.2rem 0 0;font-size:.9rem;color:#4b6072;overflow-wrap:anywhere}
  .customer .code{font-weight:700;color:#17304f}
  dl{margin:0}
  dl>div{display:flex;align-items:baseline;justify-content:space-between;gap:1rem;padding:.42rem 0}
  dt{font-size:.82rem;color:#5d7080}
  dd{margin:0;font-size:.9rem;font-weight:700;text-align:right;overflow-wrap:anywhere}
  .parties dl>div+div{border-top:1px solid #e7ebed}
  mark{display:inline-block;padding:.18rem .6rem;border-radius:1rem;font-size:.75rem;font-weight:800;background:#eef1f4;color:#48576b}
  mark.good{background:#e4f5ed;color:#17704b}
  mark.warn{background:#fbf1da;color:#7c5a12}
  mark.bad{background:#fdeaea;color:#a83a32}
  mark.info{background:#e6eef9;color:#1f4f8c}
  .timeline{margin:0 0 1.25rem;break-inside:avoid}
  .timeline p{margin:0;font-size:.92rem}
  .lines{overflow-x:auto}
  table{width:100%;border-collapse:collapse;font-size:.9rem}
  th{padding:.65rem .75rem;background:#07182f;color:#fff;font-size:.72rem;letter-spacing:.06em;text-align:left;white-space:nowrap}
  td{padding:.75rem;border-bottom:1px solid #e7ebed;vertical-align:top}
  .description{overflow-wrap:anywhere;min-width:9rem}
  .count{width:2.25rem;color:#5d7080}
  th.count{color:#fff}
  .number{text-align:right;white-space:nowrap}
  .sums{display:flex;justify-content:flex-end;margin-top:1.25rem;break-inside:avoid}
  .sums dl{width:min(100%,21rem)}
  .sums dl>div{padding:.5rem .75rem}
  .sums dd{font-size:1rem}
  .sums .due{margin-top:.35rem;border-radius:.5rem;background:#07182f}
  .sums .due dt,.sums .due dd{color:#fff;font-weight:800}
  .sums .due dd{font-size:1.2rem;color:#e1b34a}
  .credit-notes{display:flex;flex-direction:column;align-items:flex-end;gap:.2rem;margin:.6rem 0 0;padding:0;list-style:none;font-size:.78rem;color:#5d7080}
  .credit-notes li{display:flex;justify-content:space-between;gap:1rem;width:min(100%,21rem);padding:0 .75rem}
  .credit-notes span{overflow-wrap:anywhere}
  .credit-notes b{white-space:nowrap;color:#17304f}
  .block{margin-top:1.4rem;break-inside:avoid}
  .block p{margin:0;font-size:.88rem;line-height:1.55;white-space:pre-line;overflow-wrap:anywhere}
  /* Two columns that fall one under the other when there is no room;
     flex rather than grid, so a long block is not pushed whole onto the next page. */
  .commitments{display:flex;flex-wrap:wrap;gap:0 2rem}
  .commitments .block{flex:1 1 15rem;min-width:0}
  .terms p{font-size:.82rem;color:#3c5266}
  .notes{padding:1rem;border-radius:.6rem;background:rgba(244,246,247,.85)}
  .signatures{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;margin-top:2.75rem;break-inside:avoid}
  .sign{display:flex;flex-direction:column;width:min(14rem,42%);font-size:.82rem;color:#4b6072}
  .sign.owner{text-align:right;align-items:flex-end}
  .space{display:flex;align-items:flex-end;height:3.4rem}
  .owner .space{justify-content:flex-end}
  .space img{max-height:3.4rem;max-width:100%;object-fit:contain}
  .line{display:block;width:100%;border-top:1px solid #17304f;margin:.25rem 0 .45rem}
  .sign b{font-size:.84rem;color:#07182f}
  .sign span:not(.space):not(.line),.sign small{margin-top:.15rem;overflow-wrap:anywhere}
  footer{margin-top:1.75rem;padding-top:.5rem;border-top:1px solid #e7ebed;font-size:.68rem;color:#7a8593;text-align:right}
  tr{break-inside:avoid}
  @media(max-width:36rem){
    /* All five columns stay on screen at phone width. */
    table{font-size:.76rem}
    th{padding:.5rem .3rem;font-size:.66rem;letter-spacing:0}
    td{padding:.6rem .3rem}
    .count{width:1.4rem}
    .description{min-width:0}
    .signatures{gap:1rem;margin-top:2rem}
    .sign{width:46%;font-size:.74rem}
    .sign b{font-size:.76rem}
  }
</style>
