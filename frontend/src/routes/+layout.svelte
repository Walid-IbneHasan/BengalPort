<script lang="ts">
  // Self-hosted, so the site's typeface is the same on every device.
  import '@fontsource-variable/manrope';
  import '../styles.css';
  import { page } from '$app/state';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import WhatsApp from '$lib/components/WhatsApp.svelte';
  import Toasts from '$lib/components/Toasts.svelte';
  import ConfirmDialog from '$lib/components/ConfirmDialog.svelte';
  let { children } = $props();
  // One address for each page, whichever link or query led to it.
  const canonical = $derived(`${page.url.origin}${page.url.pathname}`);
</script>

<svelte:head>
  {#if !page.url.pathname.startsWith('/admin')}
    <link rel="canonical" href={canonical} />
    <meta property="og:site_name" content="Bengal Port" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content={canonical} />
    {#if !page.url.pathname.startsWith('/opportunities/')}<meta property="og:image" content={`${page.url.origin}/images/og-default.jpg`} />{/if}
    <meta name="twitter:card" content="summary_large_image" />
  {/if}
</svelte:head>

{#if page.url.pathname.startsWith('/admin')}
  <main>{@render children()}</main>
{:else}
  <a class="skip-link" href="#main">Skip to content</a>
  <Header/>
  <main id="main" tabindex="-1">{@render children()}</main>
  <Footer/>
  <WhatsApp/>
{/if}
<Toasts/>
<ConfirmDialog/>
