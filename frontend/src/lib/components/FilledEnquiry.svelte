<script lang="ts">
  import { enquiryCopy } from "$lib/apply-route";
  import { shortDate } from "$lib/datetime";
  import type { FilledEnquiry } from "$lib/printable";

  // The Apply page's quick enquiry form, showing one enquiry that was sent.
  let { enquiry }: { enquiry: FilledEnquiry } = $props();
  let copy = $derived(enquiryCopy[enquiry.type]);
</script>

<div class="general-box filled-enquiry">
  <div class="general-intro"><span>{copy.eyebrow}</span><h2>{copy.title}</h2><p>{copy.text}</p><p class="received">Received {shortDate(enquiry.submittedAt)}</p></div>
  <div class="form-grid">
    <div class="field"><span class="label">Full name *</span><div class="answer">{enquiry.name}</div></div>
    <div class="field"><span class="label">Phone number *</span><div class="answer">{enquiry.phone}</div></div>
    <div class="field"><span class="label">Email address</span><div class="answer">{enquiry.email}</div></div>
    <div class="field"><span class="label">Subject *</span><div class="answer">{enquiry.subject}</div></div>
  </div>
  <div class="field full"><span class="label">Enquiry information *</span><div class="answer long">{enquiry.message}</div></div>
  {#if enquiry.extras.length}
    <div class="form-grid full">
      {#each enquiry.extras as extra}<div class="field"><span class="label">{extra.label}</span><div class="answer">{extra.value}</div></div>{/each}
    </div>
  {/if}
</div>

<style>
  .label{font-size:.82rem;font-weight:720;color:var(--heading)}
  .answer{display:flex;align-items:center;min-height:2.9rem;border:1px solid #d7dce3;border-radius:.65rem;padding:.8rem .9rem;background:#fff;overflow-wrap:anywhere}
  .answer.long{display:block;min-height:10rem;line-height:1.55;white-space:pre-wrap}
  .full{margin-top:1.1rem}
  .general-intro .received{margin-top:-1rem;font-size:.82rem;font-weight:700;color:#17304f}
  @media print{
    .filled-enquiry{max-width:none;box-shadow:none;border-radius:0}
    .field{break-inside:avoid}
  }
</style>
