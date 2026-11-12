<script lang="ts">
  import { problemText } from "$lib/problem";
  // A category dropdown that ends with "+ Create new category". Choosing that
  // turns the dropdown into a name box in place, so the rest of the form the
  // administrator is filling in is left exactly as it was.
  type Option = { value: string; label: string };
  let {
    value = $bindable(""),
    options,
    create,
    id,
    required = false,
  }: {
    value?: string;
    options: Option[];
    // Saves the new category and resolves to the value to select.
    create: (name: string) => Promise<string>;
    id?: string;
    required?: boolean;
  } = $props();

  const CREATE = "__create_new_category__";
  let adding = $state(false),
    name = $state(""),
    busy = $state(false),
    problem = $state("");
  let box = $state<HTMLInputElement>();
  $effect(() => {
    if (adding) box?.focus();
  });

  const pick = (next: string) => {
    if (next !== CREATE) {
      value = next;
      return;
    }
    name = "";
    problem = "";
    adding = true;
  };
  const cancel = () => (adding = false);

  async function add() {
    const wanted = name.trim();
    if (wanted.length < 2) {
      problem = "Enter a name of at least 2 characters.";
      return;
    }
    // Already in the list under any capitals: just select it.
    const existing = options.find((option) => option.label.toLocaleLowerCase() === wanted.toLocaleLowerCase());
    if (existing) {
      value = existing.value;
      adding = false;
      return;
    }
    busy = true;
    problem = "";
    try {
      value = await create(wanted);
      adding = false;
    } catch (e) {
      problem = problemText(e, "The category could not be created.");
    } finally {
      busy = false;
    }
  }
  function onkeydown(event: KeyboardEvent) {
    // Enter adds the category rather than sending the form around it, and
    // Escape closes only this box, not the drawer it sits in.
    if (event.key === "Enter") {
      event.preventDefault();
      if (!busy) add();
    } else if (event.key === "Escape") {
      event.stopPropagation();
      cancel();
    }
  }
</script>

{#if adding}
  <div class="new">
    <input bind:this={box} bind:value={name} {id} {onkeydown} maxlength="60" placeholder="New category name" aria-label="New category name" autocomplete="off" />
    <div class="actions">
      <button type="button" class="add" disabled={busy} onclick={add}>{busy ? "Adding…" : "Add"}</button>
      <button type="button" class="cancel" disabled={busy} onclick={cancel}>Cancel</button>
    </div>
    {#if problem}<p role="alert">{problem}</p>{/if}
  </div>
{:else}
  <select {id} {required} bind:value={() => value, pick}>
    {#if !options.some((option) => option.value === value)}<option value="" disabled>Choose a category</option>{/if}
    {#each options as option (option.value)}<option value={option.value}>{option.label}</option>{/each}
    <option value={CREATE}>+ Create new category</option>
  </select>
{/if}

<style>
  select,
  input {
    width: 100%;
    min-height: 2.75rem;
    border: 1px solid #d5dbe1;
    border-radius: 8px;
    background: #fff;
    padding: 0.6rem 0.75rem;
    font: inherit;
    color: #12213a;
    outline: none;
  }
  select:focus,
  input:focus {
    border-color: #c9952d;
    box-shadow: 0 0 0 3px #c9952d1c;
  }
  .new {
    display: grid;
    gap: 0.5rem;
  }
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
  button {
    min-height: 2.75rem;
    border-radius: 8px;
    font: inherit;
    font-weight: 800;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.6;
    cursor: wait;
  }
  .add {
    border: 0;
    background: #d19b2d;
    color: #07182f;
  }
  .cancel {
    border: 1px solid #d8dde2;
    background: #fff;
    color: #26354a;
  }
  p {
    margin: 0;
    padding: 0.55rem 0.7rem;
    border-radius: 8px;
    background: #fff0f0;
    color: #922f2f;
    font-size: 0.8rem;
    font-weight: 600;
  }
</style>
