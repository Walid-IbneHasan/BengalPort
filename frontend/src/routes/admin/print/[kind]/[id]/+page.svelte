<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { api, ApiError } from "$lib/api";
  import { officePermissions } from "$lib/office";
  import AgreementDocument from "$lib/components/AgreementDocument.svelte";
  import DivisionApplicationForm from "$lib/components/DivisionApplicationForm.svelte";
  import FilledEnquiry from "$lib/components/FilledEnquiry.svelte";
  import InvoiceDocument from "$lib/components/InvoiceDocument.svelte";
  import LedgerDayReport from "$lib/components/LedgerDayReport.svelte";
  import LedgerVoucher from "$lib/components/LedgerVoucher.svelte";
  import PrintSheet from "$lib/components/PrintSheet.svelte";
  import type { ApplicationDivision } from "$lib/application-forms";
  import { filledApplication, filledEnquiry, printTitle } from "$lib/printable";
  import { ArrowLeft, Pencil, Printer } from "lucide-svelte";

  // One record on its own page, on the letterhead, ready to print or save as PDF.
  const kind = page.params.kind ?? "";
  const id = page.params.id ?? "";
  const places: Record<string, { back: string; label: string }> = {
    application: { back: "/admin/applications", label: "Applications" },
    enquiry: { back: "/admin/enquiries", label: "Enquiries" },
    invoice: { back: "/admin/accounts/invoices", label: "Invoices" },
    agreement: { back: `/admin/deals/${id}`, label: "Deals" },
    "ledger-entry": { back: "/admin/accounts", label: "Hisab Kitab" },
    "ledger-day": { back: "/admin/accounts", label: "Hisab Kitab" },
  };
  const place = places[kind];
  const source = (): string =>
    kind === "application"
      ? `/admin/resources/applications/${id}`
      : kind === "enquiry"
        ? `/admin/resources/enquiries/${id}`
        : kind === "invoice"
          ? `/admin/invoices/${id}`
          : kind === "agreement"
            ? `/office/deals/${id}`
            : kind === "ledger-entry"
              ? `/admin/accounts/${id}`
              : `/admin/accounts?day=${encodeURIComponent(id)}`;

  let record = $state<any>(null),
    error = $state(""),
    // The due date of each of a deal's invoices, for the agreement's payment schedule.
    dueDates = $state<Record<string, string | null>>({});

  onMount(async () => {
    if (!place) {
      error = "This page does not exist.";
      return;
    }
    try {
      const found = await api<any>(source());
      record = kind === "ledger-day" ? { ...found, day: id } : found;
      if (kind === "agreement") loadDueDates(found);
    } catch (e) {
      error =
        e instanceof ApiError && e.status === 404
          ? "This record no longer exists."
          : e instanceof ApiError && e.status === 403
            ? e.message
            : e instanceof ApiError && e.status === 400
              ? e.message
              : "This record could not be opened. Check your connection, or sign in again.";
    }
  });

  // Each of the deal's invoices comes with its due date.
  function loadDueDates(deal: any) {
    dueDates = Object.fromEntries((deal?.invoices ?? []).map((row: { id: string; dueAt: string | null }) => [row.id, row.dueAt ?? null]));
  }

  // Browsers offer the page title as the name of the saved PDF.
  let title = $derived(
    !record ? "Print — Bengal Port Admin" : kind === "agreement" ? `${record.dealNumber} - Service agreement - ${record.customer?.name ?? ""}` : printTitle(kind, record),
  );
  let customer = $derived(
    !record ? "" : kind === "invoice" ? record.customerName : kind === "application" ? record.fullName : kind === "ledger-entry" ? (record.user?.name ?? record.customer ?? "") : "",
  );
  // Invoices and agreements draw their own signatures: the one an invoice
  // was issued with, and a line for each side of an agreement.
  let signed = $derived<boolean | "owner">(kind === "enquiry" || kind === "invoice" || kind === "agreement" ? false : kind === "ledger-day" ? "owner" : true);
  // Only a draft is edited; an issued invoice is revised from the invoice list.
  let editable = $derived(kind === "invoice" && record?.state === "DRAFT" && $officePermissions.has("invoices.update"));
</script>

<svelte:head><title>{title}</title></svelte:head>

<div class="print-page">
  <div class="print-bar">
    <a class="back" href={place?.back ?? "/admin"}><ArrowLeft size={17} /> {place?.label ?? "Admin"}</a>
    {#if record}
      <small>For a PDF, choose “Save as PDF” in the print window.</small>
      {#if editable}<a class="edit" href={`/admin/accounts/invoices?edit=${record.id}`}><Pencil size={15} /> Edit draft</a>{/if}
      <button onclick={() => window.print()}><Printer size={17} /> Print / Save as PDF</button>
    {/if}
  </div>

  {#if error}
    <p class="state problem" role="alert">{error}</p>
  {:else if !record}
    <p class="state">Loading…</p>
  {:else}
    <div class="sheet">
      <PrintSheet {signed} customerName={customer}>
        {#if kind === "invoice"}
          <InvoiceDocument invoice={record} />
        {:else if kind === "agreement"}
          <AgreementDocument deal={record} {dueDates} />
        {:else if kind === "application"}
          <DivisionApplicationForm division={record.type as ApplicationDivision} filled={filledApplication(record)} />
        {:else if kind === "enquiry"}
          <FilledEnquiry enquiry={filledEnquiry(record)} />
        {:else if kind === "ledger-entry"}
          <LedgerVoucher entry={record} />
        {:else}
          <LedgerDayReport day={record.day} rows={record.rows} summary={record.summary} />
        {/if}
      </PrintSheet>
    </div>
  {/if}
</div>

<style>
  .print-page{min-height:100vh;padding-bottom:3rem;background:#eef1f4}
  .print-bar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;align-items:center;gap:.6rem 1rem;padding:.7rem clamp(1rem,3vw,1.75rem);background:#07182f;color:#fff}
  .print-bar a{text-decoration:none}
  .print-bar .back{display:inline-flex;align-items:center;gap:.4rem;margin-right:auto;color:#fff;font-weight:700}
  .print-bar small{color:#c4ceda}
  .print-bar .edit{display:inline-flex;align-items:center;gap:.35rem;padding:.55rem .85rem;border-radius:.55rem;background:#ffffff14;color:#fff;font-size:.85rem;font-weight:750}
  .print-bar button{display:inline-flex;align-items:center;gap:.45rem;padding:.62rem 1rem;border:0;border-radius:.55rem;background:#d19b2d;color:#07182f;font-weight:800;cursor:pointer}
  .sheet{max-width:54rem;margin:1.5rem auto 0;padding:0 clamp(.5rem,3vw,1rem)}
  .state{margin:3rem auto;text-align:center;color:#4b6072}
  .problem{color:#943d45}
  @media(max-width:42rem){
    .print-bar small{display:none}
    .print-bar button{flex:1 1 100%;justify-content:center}
    .sheet{padding:0;margin-top:0}
  }
  @media print{
    :global(html),:global(body){background:#fff!important}
    :global(*){-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .print-page{min-height:0;padding:0;background:transparent}
    .print-bar{display:none}
    .sheet{max-width:none;margin:0;padding:0}
  }
</style>
