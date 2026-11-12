<script lang="ts">
  import { onMount } from "svelte";
  import { page } from "$app/state";
  import { api, ApiError } from "$lib/api";
  import type { Invoice } from "$lib/invoices";
  import InvoiceDocument from "$lib/components/InvoiceDocument.svelte";
  import PrintSheet from "$lib/components/PrintSheet.svelte";
  import { Printer } from "lucide-svelte";

  // An invoice Bengal Port shared with its customer (by WhatsApp or email).
  // No sign-in: the link carries a key that works for 30 days. The customer
  // can read it, print it or save it as a PDF.
  let invoice = $state<Invoice | null>(null),
    error = $state("");

  onMount(async () => {
    const key = page.url.searchParams.get("key") ?? "";
    if (!key) {
      error = "This link has expired or is not valid. Ask Bengal Port for a new one.";
      return;
    }
    try {
      invoice = await api<Invoice>(`/share/invoice/${encodeURIComponent(page.params.id ?? "")}?key=${encodeURIComponent(key)}`);
    } catch (e) {
      error =
        e instanceof ApiError && (e.status === 404 || e.status === 401 || e.status === 403)
          ? "This link has expired or is not valid. Ask Bengal Port for a new one."
          : e instanceof ApiError && e.status === 429
            ? "This invoice has been opened many times in a short while. Please try again in a few minutes."
            : "The invoice could not be loaded. Check your connection and try again.";
    }
  });
</script>

<svelte:head>
  <title>{invoice ? `Invoice ${invoice.number}` : "Invoice"} — Bengal Port</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<section class="section share-page">
  {#if error}
    <div class="message" role="alert">
      <p>{error}</p>
    </div>
  {:else if !invoice}
    <p class="loading">Loading invoice…</p>
  {:else}
    <div class="tools"><button class="btn" onclick={() => window.print()}><Printer size={17} /> Print / Save as PDF</button></div>
    <div class="sheet">
      <PrintSheet>
        <InvoiceDocument {invoice} />
      </PrintSheet>
    </div>
  {/if}
</section>

<style>
  .share-page{background:#eef1f4}
  .tools{display:flex;justify-content:flex-end;width:min(100%,52rem);margin:0 auto 1rem}
  .tools .btn{display:inline-flex;align-items:center;gap:.45rem}
  .loading{text-align:center;color:var(--navy)}
  .message{width:min(100%,34rem);margin:0 auto;padding:1.5rem;border-radius:.9rem;background:#fff;color:#17304f;text-align:center;box-shadow:0 1rem 3rem rgba(23,48,79,.08)}
  .message p{margin:0;font-size:1.02rem;line-height:1.55}
  @media(max-width:36rem){
    .tools .btn{width:100%;justify-content:center}
  }
  @media print{
    /* Only the invoice: not the site's header, footer or chat button. */
    :global(body > div > :not(main)){display:none}
    :global(html),:global(body){background:#fff!important}
    :global(*){-webkit-print-color-adjust:exact;print-color-adjust:exact}
    .share-page{padding:0!important;background:transparent}
    .tools{display:none}
  }
</style>
