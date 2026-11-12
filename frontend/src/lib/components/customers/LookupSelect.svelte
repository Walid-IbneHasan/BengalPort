<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";

  // A dropdown from one of the office's own lists (customer categories, lead
  // sources, document types) ending with "+ Add new…". Choosing that turns
  // the dropdown into a box for the new name in place, so the rest of the
  // form stays as it was; the new name is added to the list for everyone.
  let {
    kind,
    value = $bindable(""),
    label,
    required = false,
    emptyLabel = "Not chosen",
    hint = "",
  }: {
    kind: "customer-category" | "lead-source" | "service-line" | "document-type";
    value?: string;
    label: string;
    required?: boolean;
    emptyLabel?: string;
    hint?: string;
  } = $props();

  const NEW = "__add_new__";
  const uid = `lookup-${Math.random().toString(36).slice(2, 8)}`;
  let options = $state<string[]>([]),
    adding = $state(false),
    name = $state(""),
    busy = $state(false),
    problem = $state("");
  let box = $state<HTMLInputElement>();

  onMount(async () => {
    try {
      options = await api<string[]>(`/office/lookups/${kind}`);
    } catch (e) {
      problem = problemText(e, "The list could not be loaded");
    }
  });
  $effect(() => {
    if (adding) box?.focus();
  });

  // A value saved before it was on the list (or renamed since) still shows.
  let shown = $derived(value && !options.includes(value) ? [value, ...options] : options);

  function pick(next: string) {
    if (next !== NEW) {
      value = next;
      return;
    }
    name = "";
    problem = "";
    adding = true;
  }

  async function add() {
    const wanted = name.trim();
    if (!wanted) {
      adding = false;
      return;
    }
    // Already on the list under other capitals: just choose it.
    const existing = options.find((option) => option.toLocaleLowerCase() === wanted.toLocaleLowerCase());
    if (existing) {
      value = existing;
      adding = false;
      return;
    }
    busy = true;
    problem = "";
    try {
      const saved = await api<string>(`/office/lookups/${kind}`, { method: "POST", body: JSON.stringify({ value: wanted }) });
      options = [...options.filter((option) => option !== saved), saved].sort((a, b) => a.localeCompare(b));
      value = saved;
      adding = false;
    } catch (e) {
      problem = problemText(e, "It could not be added to the list");
    } finally {
      busy = false;
    }
  }

  function onkeydown(event: KeyboardEvent) {
    // Enter adds the name rather than sending the form around it, and Escape
    // closes only this box, not the panel it sits in.
    if (event.key === "Enter") {
      event.preventDefault();
      if (!busy) add();
    } else if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      adding = false;
    }
  }
</script>

<div class="o-field">
  <span id={`${uid}-label`}>{label}{#if !required}{" "}<small>(optional)</small>{/if}</span>
  {#if adding}
    <div class="new">
      <input bind:this={box} bind:value={name} {onkeydown} maxlength="80" aria-labelledby={`${uid}-label`} placeholder="Type the new name" autocomplete="off" />
      <button type="button" class="o-btn small" disabled={busy} onclick={add}>{busy ? "Adding…" : "Add"}</button>
      <button type="button" class="o-btn ghost small" disabled={busy} onclick={() => (adding = false)}>Cancel</button>
    </div>
  {:else}
    <select id={uid} aria-labelledby={`${uid}-label`} {required} bind:value={() => value, pick}>
      <option value="" disabled={required}>{required ? "Choose one" : emptyLabel}</option>
      {#each shown as option (option)}<option value={option}>{option}</option>{/each}
      <option value={NEW}>+ Add new…</option>
    </select>
  {/if}
  {#if problem}<p class="o-error" role="alert">{problem}</p>{:else if hint}<small class="hint">{hint}</small>{/if}
</div>

<style>
  .new { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .new input { flex: 1 1 10rem; }
  .new .o-btn { min-height: 2.75rem; }
</style>
