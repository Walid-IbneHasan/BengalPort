<script lang="ts">
  import { Star } from "lucide-svelte";

  // A rating from 1 to 5, chosen by tapping a star. Underneath it is a group
  // of radio buttons, so it works from the keyboard and with a screen reader.
  let { value = $bindable(0), name = "rating", label = "Your rating" }: { value?: number; name?: string; label?: string } = $props();
</script>

<fieldset>
  <legend>{label}</legend>
  <div class="stars">
    {#each [1, 2, 3, 4, 5] as n}
      <label class:filled={n <= value}>
        <input type="radio" {name} value={n} checked={value === n} onchange={() => (value = n)} />
        <Star size={28} /><span class="sr">{n} {n === 1 ? "star" : "stars"}</span>
      </label>
    {/each}
  </div>
</fieldset>

<style>
  fieldset{border:0;margin:0;padding:0;min-width:0}
  legend{padding:0;margin-bottom:.3rem;font-size:.75rem;font-weight:750;color:#29465f}
  .stars{display:flex;gap:.1rem}
  label{position:relative;display:grid;place-items:center;width:2.75rem;height:2.75rem;border-radius:.6rem;color:#c5ced6;cursor:pointer;transition:color 140ms ease,transform 140ms cubic-bezier(.23,1,.32,1)}
  label.filled{color:#d9a93f}
  label.filled :global(svg){fill:currentColor}
  label:active{transform:scale(.9)}
  label:has(input:focus-visible){outline:3px solid rgba(199,152,54,.45);outline-offset:1px}
  input{position:absolute;inset:0;opacity:0;margin:0;cursor:pointer}
  .sr{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
  @media(hover:hover) and (pointer:fine){label:hover{color:#d9a93f}}
  @media(prefers-reduced-motion:reduce){label{transition:none}}
</style>
