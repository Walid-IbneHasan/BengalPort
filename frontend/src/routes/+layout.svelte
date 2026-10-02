<script lang="ts">
  // Self-hosted, so the site's typeface is the same on every device.
  import '@fontsource-variable/manrope';
  import '../styles.css';
  import { page } from '$app/state';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import WhatsApp from '$lib/components/WhatsApp.svelte';
  import Toasts from '$lib/components/Toasts.svelte';
  let { children } = $props();
</script>

{#if page.url.pathname.startsWith('/admin')}
  <main>{@render children()}</main>
{:else}
  <Header/>
  <main>{@render children()}</main>
  <Footer/>
  <WhatsApp/>
{/if}
<Toasts/>
