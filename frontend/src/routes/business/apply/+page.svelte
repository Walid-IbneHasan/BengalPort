<script lang="ts">import DivisionApplicationForm from "$lib/components/DivisionApplicationForm.svelte";</script>
<svelte:head><title>Business Application | Bengal Port</title></svelte:head>
<section class="page-hero compact"><div class="wrap"><span class="eyebrow">GLOBAL BUSINESS</span><h1>Business tour application.</h1><p>Complete the official Bengal Port business and travel information form.</p></div></section>
<section class="form-section"><div class="wrap"><DivisionApplicationForm division="BUSINESS"/></div></section>
<style>.compact{padding-bottom:4rem}.form-section{padding:0 0 clamp(4rem,8vw,7rem);background:#f4f6f6}.form-section>.wrap{margin-top:-1.5rem;position:relative;z-index:2}@media(max-width:42rem){.compact{padding-bottom:3.25rem}.form-section>.wrap{width:calc(100% - 1rem);margin-top:-1.1rem}}</style>
