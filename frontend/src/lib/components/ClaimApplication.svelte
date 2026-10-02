<script lang="ts">
  import { api } from "$lib/api";

  // Member dashboard: add an application made without signing in, using its
  // reference number and the phone number or email it was made with.
  let { onclaimed }: { onclaimed: (reference: string) => void | Promise<void> } = $props();
  let open = $state(false), reference = $state(""), contact = $state("");
  let sending = $state(false), error = $state(""), added = $state("");

  async function claim() {
    sending = true;
    error = "";
    added = "";
    try {
      const linked = await api<{ reference: string }>("/applications/claim", { method: "POST", body: JSON.stringify({ reference, contact }) });
      await onclaimed(linked.reference);
      added = linked.reference;
      reference = contact = "";
    } catch (e) {
      error = e instanceof Error ? e.message : "The application could not be added. Please try again.";
    } finally {
      sending = false;
    }
  }
</script>

<div class="claim">
  {#if !open}
    <button type="button" class="opener" onclick={() => (open = true)}>Applied before you signed in? Add that application</button>
  {:else}
    <form onsubmit={(e) => { e.preventDefault(); claim(); }}>
      <p>Enter the reference number from your confirmation and the phone number or email you applied with.</p>
      <div class="fields">
        <label><span>Reference number</span><input bind:value={reference} required minlength="3" maxlength="40" placeholder="BP-XXXXXXXX" autocomplete="off" /></label>
        <label><span>Phone number or email used</span><input bind:value={contact} required minlength="5" maxlength="160" autocomplete="off" /></label>
        <button disabled={sending}>{sending ? "Adding…" : "Add application"}</button>
      </div>
      {#if error}<p class="problem" role="alert">{error}</p>{/if}
      {#if added}<p class="done" role="status">{added} is now on your dashboard.</p>{/if}
    </form>
  {/if}
</div>

<style>
  .claim{margin-top:.9rem;padding-top:1rem;border-top:1px solid #e7ebed}
  .opener{border:0;background:none;padding:0;color:#9b6b16;font-size:.86rem;font-weight:750;text-decoration:underline;cursor:pointer}
  form{display:grid;gap:.8rem}
  p{margin:0;font-size:.86rem;line-height:1.55;color:#687986}
  .fields{display:grid;grid-template-columns:1fr 1fr auto;gap:.7rem;align-items:end}
  label{display:grid;gap:.35rem}
  label span{font-size:.75rem;font-weight:750;color:#29465f}
  input{width:100%;min-height:2.85rem;border:1px solid #d6dfe2;border-radius:.7rem;background:#fbfcfc;padding:.6rem .8rem;color:#263c50;outline:none}
  input:focus{border-color:#bf8e2d;box-shadow:0 0 0 .2rem rgba(199,152,54,.14)}
  .fields button{min-height:2.85rem;border:0;border-radius:1.6rem;background:#d0a03d;color:#17304f;padding:.6rem 1.2rem;font-weight:800;cursor:pointer;white-space:nowrap}
  .fields button:disabled{opacity:.6}
  .problem{padding:.7rem .9rem;border-radius:.7rem;background:#fff0f0;color:#943d45}
  .done{padding:.7rem .9rem;border-radius:.7rem;background:#eaf6ef;color:#2f7650}
  @media(max-width:42rem){.fields{grid-template-columns:1fr}}
</style>
