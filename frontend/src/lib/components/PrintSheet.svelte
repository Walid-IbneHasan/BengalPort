<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { defaultDocumentsContent, documentsContentFrom, type DocumentsContent } from "$lib/documents-content";
  import { get } from "svelte/store";
  import { cmsContent } from "$lib/cms";
  import { dataUrl, letterheadSvg } from "$lib/letterhead";

  // One printed document on the Bengal Port letterhead. On screen it is an A4
  // sheet; printed or saved as PDF, the letterhead fills every page and the
  // text starts below its heading on each page. With `signed`, the customer
  // signs at the bottom left and the owner at the bottom right; with
  // `signed="owner"` only the owner signs.
  let {
    children,
    signed = false,
    customerName = "",
  }: { children: Snippet; signed?: boolean | "owner"; customerName?: string } = $props();

  let settings = $state<DocumentsContent>(defaultDocumentsContent);
  // Bengal Port's own letterhead as a picture, unless another was uploaded.
  let drawn = $state("");
  onMount(() => {
    let url = "";
    (async () => {
      try {
        // Always the latest: a change saved a moment ago shows on the next print.
        settings = documentsContentFrom(await api<{ content: unknown }>("/content/documents", { cache: "no-store" }).then((page) => page?.content));
      } catch {
        // The built-in letterhead and labels do.
      }
      if (settings.letterhead.backgroundImage) return;
      const site = get(cmsContent);
      const [logo, font] = await Promise.all([dataUrl(site.brand.logo), dataUrl("/fonts/manrope-latin.woff2")]);
      const svg = letterheadSvg({
        logo,
        font,
        name: site.brand.name,
        subtitle: settings.letterhead.subtitle,
        tagline: settings.letterhead.tagline,
        address: site.footer.address,
        phone: site.utility.phone,
        email: site.utility.email,
        website: settings.letterhead.website,
      });
      url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
      drawn = url;
    })();
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  });
</script>

<div class="paper">
  {#if settings.letterhead.backgroundImage || drawn}
    <img class="letterhead" src={settings.letterhead.backgroundImage || drawn} alt="" aria-hidden="true" />
    <!-- On screen a sheet longer than one page keeps the letterhead's foot at its bottom. -->
    <img class="letterhead foot" src={settings.letterhead.backgroundImage || drawn} alt="" aria-hidden="true" />
  {/if}
  <table class="frame" role="presentation">
    <thead><tr><td><div class="top-space"></div></td></tr></thead>
    <tbody>
      <tr>
        <td>
          <div class="content">
            {@render children()}
            {#if signed}
              <div class="signatures">
                {#if signed !== "owner"}<div class="sign">
                  <span class="space"></span>
                  <span class="line"></span>
                  <b>{settings.signatures.customerLabel}</b>
                  {#if customerName}<span>{customerName}</span>{/if}
                </div>{:else}<span></span>{/if}
                <div class="sign owner">
                  <span class="space">{#if settings.signatures.signatureImage}<img src={settings.signatures.signatureImage} alt="" />{/if}</span>
                  <span class="line"></span>
                  <b>{settings.signatures.ownerLabel}</b>
                  {#if settings.signatures.ownerName}<span>{settings.signatures.ownerName}</span>{/if}
                  {#if settings.signatures.ownerTitle}<small>{settings.signatures.ownerTitle}</small>{/if}
                </div>
              </div>
            {/if}
          </div>
        </td>
      </tr>
    </tbody>
    <tfoot><tr><td><div class="bottom-space"></div></td></tr></tfoot>
  </table>
</div>

<style>
  /* The letterhead is the shape of A4. Its heading ends 56 mm down (about
     27% of the page's width); the text starts just below it. */
  .paper{position:relative;width:min(100%,52rem);margin:auto;container-type:inline-size;aspect-ratio:210/297;background:#fff;color:#17304f;box-shadow:0 1rem 3rem rgba(23,48,79,.12);overflow:clip}
  .letterhead{position:absolute;inset:0 0 auto;z-index:0;width:100%;height:auto;aspect-ratio:210/297;pointer-events:none;user-select:none;clip-path:inset(0 0 6% 0)}
  /* The same picture, showing only its last 6% (the footer band), at the
     bottom of the sheet: on a one-page sheet the two meet exactly. */
  .letterhead.foot{inset:auto 0 0;clip-path:inset(94% 0 0 0)}
  .frame{position:relative;z-index:1;width:100%;border-collapse:collapse}
  .frame td{padding:0}
  .top-space{height:29cqw}
  .bottom-space{height:9cqw}
  .content{padding:0 7cqw}
  .signatures{display:flex;justify-content:space-between;align-items:flex-end;gap:2rem;margin-top:3rem;break-inside:avoid}
  .sign{display:flex;flex-direction:column;width:min(14rem,42%);font-size:.82rem;color:#4b6072}
  .sign.owner{text-align:right;align-items:flex-end}
  .space{display:flex;align-items:flex-end;height:3.4rem}
  .owner .space{justify-content:flex-end}
  .space img{max-height:3.4rem;max-width:100%;object-fit:contain}
  .line{display:block;width:100%;border-top:1px solid #17304f;margin:.25rem 0 .45rem}
  .sign b{font-size:.84rem;color:#07182f}
  .sign span:not(.space):not(.line),.sign small{margin-top:.15rem;overflow-wrap:anywhere}
  @media(max-width:36rem){
    .signatures{gap:1rem;margin-top:2rem}
    .sign{width:46%;font-size:.74rem}
    .sign b{font-size:.76rem}
  }
  @media print{
    @page{size:A4;margin:0}
    .paper{width:auto;aspect-ratio:auto;box-shadow:none;overflow:visible;container-type:normal}
    /* Fixed, so it is printed whole on every page. */
    .letterhead{position:fixed;inset:0;width:210mm;height:297mm;clip-path:none}
    .letterhead.foot{display:none}
    .top-space{height:62mm}
    .bottom-space{height:14mm}
    .content{padding:0 16mm}
  }
</style>
