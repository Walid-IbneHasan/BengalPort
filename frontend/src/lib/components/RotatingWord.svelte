<script lang="ts">
  import { onMount } from "svelte";

  // Shows one of `words` at a time, moving on every `interval` milliseconds
  // with the Education hero's entrance. `onchange` tells the page which word
  // is up, so a hero can draw along. Screen readers get the whole list once,
  // after `prefix`; people who asked for less motion keep the first word.
  let {
    words,
    interval = 2400,
    prefix = "",
    onchange,
  }: { words: string[]; interval?: number; prefix?: string; onchange?: (index: number, word: string) => void } = $props();

  let index = $state(0);
  let current = $derived(words[index % Math.max(words.length, 1)] ?? "");

  onMount(() => {
    if (words.length < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = setInterval(() => {
      index = (index + 1) % words.length;
      onchange?.(index, words[index]);
    }, interval);
    return () => clearInterval(timer);
  });
</script>

<span class="rotating">
  <span class="sr">{prefix}{words.join(", ")}</span>
  <span aria-hidden="true" class="shown">{#key current}<b>{current}</b>{/key}</span>
</span>

<style>
  .rotating {
    position: relative;
    display: inline-block;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .shown b {
    display: inline-block;
    font-weight: inherit;
    animation: place-in 420ms cubic-bezier(0.23, 1, 0.32, 1);
  }
  @keyframes place-in {
    from {
      opacity: 0;
      transform: translateY(0.45em);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .shown b {
      animation: none;
    }
  }
</style>
