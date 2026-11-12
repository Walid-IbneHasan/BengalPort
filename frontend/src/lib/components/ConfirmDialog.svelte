<script lang="ts">
  import { tick } from "svelte";
  import { CircleHelp, TriangleAlert } from "lucide-svelte";
  import { confirms } from "$lib/confirm";

  // The site's own "Are you sure?" box, asked through confirmAction(). It is
  // a real modal dialog: the page behind waits, Tab stays inside, Escape or a
  // click outside answers no. For something that removes or cannot be undone
  // the safe answer, Cancel, has the focus.
  let dialog = $state<HTMLDialogElement>();
  let cancelButton = $state<HTMLButtonElement>();
  let goButton = $state<HTMLButtonElement>();

  $effect(() => {
    const question = $confirms;
    if (!dialog) return;
    if (question && !dialog.open) {
      dialog.showModal();
      tick().then(() => (question.tone === "danger" ? cancelButton : goButton)?.focus());
    } else if (!question && dialog.open) dialog.close();
  });

  const answer = (yes: boolean) => confirms.answer(yes);
</script>

<dialog
  bind:this={dialog}
  class="confirm"
  class:danger={$confirms?.tone === "danger"}
  aria-labelledby="confirm-title"
  aria-describedby={$confirms?.message ? "confirm-message" : undefined}
  oncancel={(event) => {
    event.preventDefault();
    answer(false);
  }}
  onclick={(event) => {
    if (event.target === dialog) answer(false);
  }}
>
  {#if $confirms}
    <div class="body">
      <i class="mark">{#if $confirms.tone === "danger"}<TriangleAlert size={22} />{:else}<CircleHelp size={22} />{/if}</i>
      <div>
        <h2 id="confirm-title">{$confirms.title}</h2>
        {#if $confirms.message}<p id="confirm-message">{$confirms.message}</p>{/if}
      </div>
    </div>
    <div class="actions">
      <button type="button" class="cancel" bind:this={cancelButton} onclick={() => answer(false)}>{$confirms.cancelLabel}</button>
      <button type="button" class="go" bind:this={goButton} onclick={() => answer(true)}>{$confirms.confirmLabel}</button>
    </div>
  {/if}
</dialog>

<style>
  .confirm{width:min(28rem,calc(100vw - 2rem));max-height:calc(100dvh - 2rem);margin:auto;padding:0;border:0;border-radius:1.1rem;background:#fff;color:#17304f;box-shadow:0 1.5rem 4rem rgba(7,24,47,.32),0 .25rem .75rem rgba(7,24,47,.12);overflow:auto}
  .confirm[open]{animation:arrive 180ms cubic-bezier(.16,1,.3,1)}
  .confirm::backdrop{background:rgba(7,24,47,.55)}
  .confirm[open]::backdrop{animation:dim 180ms ease-out}
  .body{display:flex;gap:1rem;padding:1.5rem 1.5rem 1.1rem}
  .mark{flex:none;display:grid;place-items:center;width:2.75rem;height:2.75rem;border-radius:50%;background:#fbf1da;color:#8a6417;font-style:normal}
  .danger .mark{background:#fdeceb;color:#b42318}
  h2{margin:.35rem 0 0;font-size:1.08rem;line-height:1.35;font-weight:800;color:#07182f;overflow-wrap:anywhere;text-wrap:balance}
  p{margin:.45rem 0 0;font-size:.92rem;line-height:1.55;color:#4b6072;overflow-wrap:anywhere}
  .actions{display:flex;justify-content:flex-end;gap:.6rem;padding:1rem 1.5rem 1.4rem;border-top:1px solid #edf0f2;background:#fafbfc}
  button{min-height:2.75rem;padding:.6rem 1.15rem;border-radius:.7rem;font:inherit;font-size:.92rem;font-weight:780;cursor:pointer;transition:background-color 150ms ease,transform 120ms ease}
  button:active{transform:scale(.97)}
  button:focus-visible{outline:3px solid #d19b2d;outline-offset:2px}
  .cancel{border:1px solid #d7dfe2;background:#fff;color:#29465f}
  .go{border:0;background:#d19b2d;color:#07182f}
  .danger .go{background:#b42318;color:#fff}
  @media(hover:hover) and (pointer:fine){.cancel:hover{background:#f2f5f6}.go:hover{background:#dfb757}.danger .go:hover{background:#9a1c12}}
  @media(max-width:30rem){
    .body{padding:1.25rem 1.1rem 1rem}
    .actions{flex-direction:column-reverse;padding:1rem 1.1rem 1.2rem}
    button{width:100%}
  }
  @keyframes arrive{from{opacity:0;transform:translateY(.5rem) scale(.97)}}
  @keyframes dim{from{opacity:0}}
  @media(prefers-reduced-motion:reduce){.confirm[open],.confirm[open]::backdrop{animation:none}button{transition:none}}
  @media print{.confirm{display:none}}
</style>
