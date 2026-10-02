<script lang="ts">
  import { Check, CircleAlert, X } from "lucide-svelte";
  import { fly } from "svelte/transition";
  import { toasts } from "$lib/toast";

  // The notifications raised with `toasts.show(...)`, stacked at the top of
  // the screen above everything else.
  const calm = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
</script>

<div class="toasts">
  {#each $toasts as toast (toast.id)}
    <div class="toast {toast.kind}" role={toast.kind === "error" ? "alert" : "status"} transition:fly={{ y: -14, duration: calm() ? 0 : 220 }}>
      <i>{#if toast.kind === "error"}<CircleAlert size={18} />{:else}<Check size={18} />{/if}</i>
      <div><b>{toast.message}</b>{#if toast.detail}<span>{toast.detail}</span>{/if}</div>
      <button type="button" aria-label="Dismiss" onclick={() => toasts.dismiss(toast.id)}><X size={16} /></button>
    </div>
  {/each}
</div>

<style>
  .toasts{position:fixed;z-index:300;top:max(1rem,env(safe-area-inset-top));left:50%;transform:translateX(-50%);width:min(27rem,100vw - 1.5rem);display:grid;gap:.5rem;pointer-events:none}
  .toast{pointer-events:auto;display:flex;align-items:flex-start;gap:.75rem;padding:.85rem .8rem .85rem .9rem;border-radius:.9rem;background:#102640;color:#fff;box-shadow:0 1rem 2.5rem #07182f47;border:1px solid #ffffff1f}
  .toast>i{flex:none;display:grid;place-items:center;width:2rem;height:2rem;border-radius:50%;background:#2f9a63;color:#fff}
  .toast.error>i{background:#c0504d}
  .toast>div{flex:1;min-width:0;padding-top:.1rem}
  b,span{display:block}
  b{font-size:.92rem;line-height:1.35}
  span{margin-top:.2rem;font-size:.8rem;line-height:1.45;color:#c9d5e2;overflow-wrap:anywhere}
  button{flex:none;display:grid;place-items:center;width:2.25rem;height:2.25rem;min-height:0;margin:-.2rem -.15rem 0 0;border:0;border-radius:.6rem;background:none;color:#c9d5e2;cursor:pointer}
  @media(hover:hover) and (pointer:fine){button:hover{background:#ffffff14;color:#fff}}
  @media print{.toasts{display:none}}
</style>
