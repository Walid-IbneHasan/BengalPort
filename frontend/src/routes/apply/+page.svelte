<script lang="ts">
  import { api } from "$lib/api";
  import { page } from "$app/state";
  import DivisionApplicationForm from "$lib/components/DivisionApplicationForm.svelte";
  import type { ApplicationDivision } from "$lib/application-forms";
  import { MessageSquareText, BriefcaseBusiness, GraduationCap, HeartPulse } from "lucide-svelte";
  const tabs = [{ key: "GENERAL", label: "General enquiry", icon: MessageSquareText },{ key: "BUSINESS", label: "Business", icon: BriefcaseBusiness },{ key: "EDUCATION", label: "Education", icon: GraduationCap },{ key: "HEALTHCARE", label: "Healthcare", icon: HeartPulse }] as const;
  const requestedTab = (page.url.searchParams.get("tab") || page.url.searchParams.get("type") || "GENERAL").toUpperCase();
  let tab = $state<(typeof tabs)[number]["key"]>(tabs.some((item)=>item.key===requestedTab) ? requestedTab as (typeof tabs)[number]["key"] : "GENERAL");
  let name = $state(""), phone = $state(""), email = $state(""), subject = $state(""), message = $state("");
  let sending = $state(false), success = $state(""), error = $state("");
  async function submitGeneral() {
    sending = true; error = "";
    try { await api("/enquiries", { method: "POST", body: JSON.stringify({ type: "GENERAL", name, phone, email, message, details: { subject } }) }); success = "Thank you. Your enquiry has been received and our team will contact you."; name = phone = email = subject = message = ""; }
    catch (e) { error = e instanceof Error ? e.message : "Could not submit the enquiry."; }
    finally { sending = false; }
  }
</script>

<svelte:head><title>Apply / Enquiry | Bengal Port</title><meta name="description" content="Submit a Bengal Port business, education or healthcare application, or send a general guest enquiry."/></svelte:head>
<section class="page-hero apply-hero"><div class="wrap"><span class="eyebrow">APPLY / ENQUIRY</span><h1>Start with the right application.</h1><p>Guest enquiries remain open to everyone. Choose a division to complete its secure, detailed application form.</p></div></section>
<section class="application-section"><div class="wrap">
  <div class="tabs" role="tablist" aria-label="Application type">{#each tabs as item}<button type="button" role="tab" aria-selected={tab===item.key} class:active={tab===item.key} onclick={()=>{tab=item.key;success="";error=""}}><svelte:component this={item.icon} size={19}/><span>{item.label}</span></button>{/each}</div>
  {#if tab === "GENERAL"}
    <div class="general-box"><div class="general-intro"><span>QUICK ENQUIRY</span><h2>Ask a question without registering.</h2><p>Only the essentials are required. Login is optional.</p></div>
      {#if success}<p class="success" role="status">{success}</p>{/if}{#if error}<p class="error" role="alert">{error}</p>{/if}
      <form onsubmit={(e)=>{e.preventDefault();submitGeneral()}}><div class="form-grid"><div class="field"><label for="name">Full name *</label><input id="name" bind:value={name} autocomplete="name" required minlength="2"/></div><div class="field"><label for="phone">Phone number *</label><input id="phone" bind:value={phone} autocomplete="tel" inputmode="tel" required minlength="7"/></div><div class="field"><label for="email">Email address</label><input id="email" type="email" bind:value={email} autocomplete="email"/></div><div class="field"><label for="subject">Subject *</label><input id="subject" bind:value={subject} required/></div></div><div class="field full"><label for="message">Enquiry information *</label><textarea id="message" bind:value={message} required minlength="5" rows="6"></textarea></div><button class="btn" disabled={sending}>{sending?"SENDING...":"SUBMIT ENQUIRY"}</button></form>
    </div>
  {:else}<DivisionApplicationForm division={tab as ApplicationDivision}/>{/if}
</div></section>

<style>
  .apply-hero{padding-bottom:4rem}.application-section{padding:0 0 clamp(4rem,8vw,7rem);background:#f4f6f6}.application-section>.wrap{margin-top:-1.6rem;position:relative;z-index:2}.tabs{max-width:58rem;margin:0 auto 1.25rem;padding:.45rem;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:.35rem;border:1px solid #e0e6e8;border-radius:1rem;background:rgba(255,255,255,.97);box-shadow:0 .8rem 2.2rem rgba(23,48,79,.08)}.tabs button{display:flex;align-items:center;justify-content:center;gap:.55rem;min-height:3.25rem;border:0;border-radius:.7rem;background:transparent;color:#637484;font-weight:750;cursor:pointer;transition:transform 150ms cubic-bezier(.23,1,.32,1),background-color 180ms ease,color 180ms ease}.tabs button.active{background:#173b5b;color:#fff;box-shadow:0 .45rem 1rem rgba(23,48,79,.16)}.tabs button:active{transform:scale(.97)}.general-box{max-width:58rem;margin:auto;padding:clamp(1.35rem,4vw,2.5rem);border:1px solid #e1e7e9;border-radius:1.25rem;background:#fff;box-shadow:0 1rem 3rem rgba(23,48,79,.08)}.general-intro span{font-size:.7rem;letter-spacing:.14em;font-weight:800;color:#ad7c20}.general-intro h2{margin:.4rem 0;font-size:clamp(1.5rem,4vw,2.15rem);color:#17304f}.general-intro p{margin:0 0 1.6rem;color:#6b7b88}.full{margin-top:1.1rem}.success,.error{padding:.85rem 1rem;border-radius:.7rem}.success{background:#e9f7ee;color:#2c6d48}.error{background:#fff0f0;color:#913b44}.general-box .btn{margin-top:1.25rem}@media(hover:hover) and (pointer:fine){.tabs button:not(.active):hover{background:#f0f3f3;color:#17304f;transform:translateY(-.08rem)}}@media(max-width:42rem){.apply-hero{padding-bottom:3.25rem}.application-section>.wrap{width:min(100% - 1rem,86.25rem);margin-top:-1.2rem}.tabs{grid-template-columns:repeat(2,minmax(0,1fr));gap:.45rem;padding:.45rem;margin-bottom:.85rem}.tabs button{justify-content:flex-start;padding-inline:.8rem;min-height:3rem}.general-box{border-radius:1rem}.form-grid{grid-template-columns:1fr}}@media(max-width:22.5rem){.tabs button{padding-inline:.65rem;font-size:.78rem;gap:.4rem}.tabs button :global(svg){width:1rem}.application-section>.wrap{width:calc(100% - .7rem)}}@media(prefers-reduced-motion:reduce){.tabs button{transition-duration:.01ms}}
</style>
