<script lang="ts">
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";

  // A service line dropdown (Business, Education…) that ends with
  // "+ Add new…". Choosing that turns it into a name box in place; the new
  // line is saved to the office's list and chosen.
  let {
    value = $bindable(""),
    lines = $bindable([]),
    id,
    label = "Service line",
  }: { value?: string; lines?: string[]; id?: string; label?: string } = $props();

  const ADD = "__add_service_line__";
  let adding = $state(false),
    name = $state(""),
    busy = $state(false),
    problem = $state("");
  let box = $state<HTMLInputElement>();
  $effect(() => {
    if (adding) box?.focus();
  });

  function pick(next: string) {
    if (next !== ADD) {
      value = next;
      return;
    }
    name = "";
    problem = "";
    adding = true;
  }

  async function add() {
    const wanted = name.trim();
    if (!wanted) return;
    // Already in the list under any capitals: just choose it.
    const existing = lines.find((line) => line.toLocaleLowerCase() === wanted.toLocaleLowerCase());
    if (existing) {
      value = existing;
      adding = false;
      return;
    }
    busy = true;
    problem = "";
    try {
      const saved = await api<string>("/office/lookups/service-line", { method: "POST", body: JSON.stringify({ value: wanted }) });
      lines = [...lines, saved].sort((a, b) => a.localeCompare(b));
      value = saved;
      adding = false;
    } catch (e) {
      problem = problemText(e, "The service line was not added");
    } finally {
      busy = false;
    }
  }

  function onkeydown(event: KeyboardEvent) {
    // Enter adds the line rather than sending the form; Escape closes only this box.
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

{#if adding}
  <div class="new">
    <input bind:this={box} bind:value={name} {id} {onkeydown} maxlength="80" placeholder="New service line" aria-label={`New ${label.toLowerCase()}`} autocomplete="off" />
    <div class="buttons">
      <button type="button" class="o-btn small" disabled={busy || !name.trim()} onclick={add}>{busy ? "Adding…" : "Add"}</button>
      <button type="button" class="o-btn ghost small" disabled={busy} onclick={() => (adding = false)}>Cancel</button>
    </div>
    {#if problem}<p class="o-error" role="alert">{problem}</p>{/if}
  </div>
{:else}
  <select {id} bind:value={() => value, pick}>
    <option value="">None</option>
    {#if value && !lines.includes(value)}<option {value}>{value}</option>{/if}
    {#each lines as line (line)}<option value={line}>{line}</option>{/each}
    <option value={ADD}>+ Add new…</option>
  </select>
{/if}

<style>
  .new { display: grid; gap: 0.45rem; }
  .buttons { display: flex; gap: 0.4rem; }
  .buttons :global(.o-btn) { flex: 1; min-height: 2.5rem; }
</style>
