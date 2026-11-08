<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { api, ApiError } from "$lib/api";
  import { cmsContent } from "$lib/cms";
  import DivisionApplicationForm from "$lib/components/DivisionApplicationForm.svelte";
  import FilledEnquiry from "$lib/components/FilledEnquiry.svelte";
  import InvoiceDocument from "$lib/components/InvoiceDocument.svelte";
  import type { ApplicationDivision } from "$lib/application-forms";
  import { filledApplication, filledEnquiry, printTitle } from "$lib/printable";
  import { ArrowLeft, Pencil, Printer } from "lucide-svelte";

  // One record on its own page, with nothing around it, ready to print.
  const places = {
    application: { source: "/admin/resources/applications", back: "/admin/applications", label: "Applications" },
    enquiry: { source: "/admin/resources/enquiries", back: "/admin/enquiries", label: "Enquiries" },
    invoice: { source: "/admin/invoices", back: "/admin/accounts/invoices", label: "Invoices" },
  } as const;
  const kind = page.params.kind as keyof typeof places;
  const id = page.params.id;
  const place = places[kind];

  let record = $state<any>(null),
    error = $state("");

  onMount(async () => {
    if (!place) {
      error = "This page does not exist.";
      return;
    }
    try {
      record = await api<any>(`${place.source}/${id}`);
    } catch (e) {
      error =
        e instanceof ApiError && e.status === 404
          ? "This record no longer exists."
          : "This record could not be opened. Check your connection, or sign in again.";
    }
  });

  // Browsers offer the page title as the name of the saved PDF.
  let title = $derived(record ? printTitle(kind, record) : "Print — Bengal Port Admin");
</script>

<svelte:head><title>{title}</title></svelte:head>

<div class="print-page">
  <div class="print-bar">
    <a class="back" href={place?.back ?? "/admin"}><ArrowLeft size={17} /> {place?.label ?? "Admin"}</a>
    {#if record}
      <small>For a PDF, choose “Save as PDF” in the print window.</small>
      {#if kind === "invoice"}<a class="edit" href={`/admin/accounts/invoices?edit=${record.id}`}><Pencil size={15} /> Edit</a>{/if}
      <button onclick={() => window.print()}><Printer size={17} /> Print / Save as PDF</button>
    {/if}
  </div>

  {#if error}
    <p class="state problem" role="alert">{error}</p>
  {:else if !record}
    <p class="state">Loading…</p>
  {:else if kind === "invoice"}
    <div class="sheet"><InvoiceDocument invoice={record} /></div>
  {:else}
    <div class="sheet">
      <header class="letterhead">
        <img src="/images/logo-192.webp" alt="" width="60" height="60" />
        <div><strong>BENGAL PORT</strong><span>Connecting Bengal to the World</span></div>
        <p>{$cmsContent.footer.address}<br />{$cmsContent.utility.phone} · {$cmsContent.utility.email}</p>
      </header>
      {#if kind === "application"}
        <DivisionApplicationForm division={record.type as ApplicationDivision} filled={filledApplication(record)} />
      {:else}
        <FilledEnquiry enquiry={filledEnquiry(record)} />
      {/if}
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
  .sheet{max-width:70rem;margin:1.5rem auto 0;padding:0 clamp(.5rem,3vw,1rem)}
  .letterhead{display:flex;align-items:center;gap:.8rem;padding:0 .25rem 1rem}
  .letterhead img{width:3.75rem;height:3.75rem;border-radius:50%;flex:none}
  .letterhead strong{display:block;font-size:1.15rem;color:#07182f}
  .letterhead span{display:block;font-size:.78rem;color:#5d7080}
  .letterhead p{margin:0 0 0 auto;font-size:.78rem;line-height:1.5;color:#5d7080;text-align:right}
  .state{margin:3rem auto;text-align:center;color:#4b6072}
  .problem{color:#943d45}
  @media(max-width:42rem){
    .print-bar small{display:none}
    .print-bar button{flex:1 1 100%;justify-content:center}
    .letterhead p{display:none}
  }
  @media print{
    @page{size:A4;margin:10mm}
    :global(html),:global(body){background:#fff!important}
    :global(*){-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .print-page{min-height:0;padding:0;background:#fff}
    .print-bar{display:none}
    .sheet{max-width:none;margin:0;padding:0}
  }
</style>
