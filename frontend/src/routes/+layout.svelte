<script lang="ts">
  import '../styles.css';
  import { page } from '$app/state';
  import Header from '$lib/components/Header.svelte';
  import Footer from '$lib/components/Footer.svelte';
  import WhatsApp from '$lib/components/WhatsApp.svelte';
  import { onMount } from 'svelte';
  import { loadCmsContent } from '$lib/cms';
  let { children } = $props();
  onMount(()=>{ loadCmsContent(); });
</script>

{#if page.url.pathname.startsWith('/admin')}
  <main>{@render children()}</main>
{:else}
  <Header/>
  <main>{@render children()}</main>
  <Footer/>
  <WhatsApp/>
{/if}
