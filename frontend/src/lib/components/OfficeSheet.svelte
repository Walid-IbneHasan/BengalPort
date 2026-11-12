<script lang="ts">
  import type { Snippet } from "svelte";
  import { onMount } from "svelte";
  import { X } from "lucide-svelte";

  // A panel that slides in from the right for a form or a record's details.
  // It is a real dialog: Tab stays inside, Escape or the close button or a
  // click beside it closes it. Full width on a phone.
  let {
    title,
    subtitle = "",
    wide = false,
    onclose,
    children,
    footer,
  }: { title: string; subtitle?: string; wide?: boolean; onclose: () => void; children: Snippet; footer?: Snippet } = $props();

  let dialog = $state<HTMLDialogElement>();
  onMount(() => {
    dialog?.showModal();
    return () => dialog?.close();
  });
</script>

<dialog
  bind:this={dialog}
  class="sheet"
  class:wide
  aria-labelledby="sheet-title"
  oncancel={(event) => {
    event.preventDefault();
    onclose();
  }}
  onclick={(event) => {
    if (event.target === dialog) onclose();
  }}
>
  <div class="panel">
    <header>
      <div>
        <h2 id="sheet-title">{title}</h2>
        {#if subtitle}<p>{subtitle}</p>{/if}
      </div>
      <button type="button" aria-label="Close" onclick={onclose}><X size={20} /></button>
    </header>
    <div class="body">{@render children()}</div>
    {#if footer}<footer>{@render footer()}</footer>{/if}
  </div>
</dialog>

<style>
  .sheet{margin:0 0 0 auto;width:min(40rem,100vw);max-width:100vw;height:100dvh;max-height:100dvh;padding:0;border:0;background:transparent;overflow:visible}
  .sheet.wide{width:min(60rem,100vw)}
  .sheet::backdrop{background:rgba(6,19,38,.55)}
  .sheet[open]{animation:slide 220ms cubic-bezier(.16,1,.3,1)}
  .panel{display:flex;flex-direction:column;height:100%;background:#f7f8fa;box-shadow:-1.5rem 0 3.5rem rgba(6,19,38,.24)}
  header{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1.2rem 1.4rem;background:#07182f;color:#fff}
  h2{margin:0;font-size:1.25rem;line-height:1.25;overflow-wrap:anywhere}
  header p{margin:.3rem 0 0;color:#c4ceda;font-size:.86rem}
  header button{flex:none;display:grid;place-items:center;width:2.5rem;height:2.5rem;border:0;border-radius:50%;background:#ffffff14;color:#fff;cursor:pointer}
  header button:focus-visible{outline:3px solid #e1b34a}
  .body{flex:1;overflow:auto;padding:1.25rem 1.4rem}
  footer{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:.6rem;padding:.9rem 1.4rem;border-top:1px solid #dfe3e7;background:#fff}
  @media(max-width:40rem){header,.body,footer{padding-inline:1rem}footer :global(.o-btn){flex:1 1 auto}}
  @keyframes slide{from{transform:translateX(2rem);opacity:0}}
  @media(prefers-reduced-motion:reduce){.sheet[open]{animation:none}}
</style>
