<script lang="ts">
  // A password box with a button to show what was typed. Every password field
  // on the site uses this one, so they all look and behave the same.
  import { Eye, EyeOff } from "lucide-svelte";
  import type { HTMLInputAttributes } from "svelte/elements";

  type Props = Omit<HTMLInputAttributes, "type" | "value"> & { value?: string };
  let { value = $bindable(""), ...attributes }: Props = $props();
  let shown = $state(false);

  // When the page empties the box after saving, the next password starts hidden.
  $effect(() => {
    if (!value) shown = false;
  });
</script>

<div class="password-field">
  <!-- Spell checking is off because some browsers send checked text to a server. -->
  <input
    {...attributes}
    bind:value
    type={shown ? "text" : "password"}
    spellcheck="false"
    autocapitalize="off"
  />
  <button
    type="button"
    aria-label={shown ? "Hide password" : "Show password"}
    onclick={() => (shown = !shown)}
  >
    {#if shown}<EyeOff aria-hidden="true" />{:else}<Eye aria-hidden="true" />{/if}
  </button>
</div>

<style>
  .password-field {
    position: relative;
    min-width: 0;
  }
  input {
    width: 100%;
    min-height: 3rem;
    border: 1px solid #d6dfe2;
    border-radius: 0.7rem;
    padding: 0.75rem 3.2rem 0.75rem 0.9rem;
    font: inherit;
    color: #17334e;
    outline: none;
    transition:
      border-color 160ms ease,
      box-shadow 160ms ease;
  }
  input:focus {
    border-color: #bd8b29;
    box-shadow: 0 0 0 0.22rem rgba(198, 150, 54, 0.14);
  }
  /* Edge adds its own eye to password boxes; one is enough. */
  input::-ms-reveal,
  input::-ms-clear {
    display: none;
  }
  button {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 3rem;
    display: grid;
    place-items: center;
    border: 0;
    border-radius: 0.7rem;
    background: transparent;
    color: #6d7c89;
    cursor: pointer;
  }
  button :global(svg) {
    width: 1.2rem;
    height: 1.2rem;
  }
  button:focus-visible {
    outline: 2px solid #bd8b29;
    outline-offset: -4px;
  }
  @media (hover: hover) and (pointer: fine) {
    button:hover {
      color: #173652;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    input {
      transition-duration: 0.01ms;
    }
  }
</style>
