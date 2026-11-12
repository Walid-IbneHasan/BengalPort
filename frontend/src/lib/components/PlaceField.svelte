<script lang="ts">
  import { tick } from "svelte";
  import { ChevronDown, Search, Trash2 } from "lucide-svelte";
  import { COUNTRIES, flagImage, joinPlace, searchCountries, splitPlace } from "$lib/flags";

  // One destination on the Healthcare page: the country chosen from a list
  // (its flag shows on the website) and the city typed by hand. Saved as
  // "City, Country", or the country alone, as the website reads it.
  let {
    label,
    value,
    onchange,
    onremove,
    explain = false,
  }: { label: string; value: string; onchange: (value: string) => void; onremove?: () => void; explain?: boolean } = $props();

  const uid = `place-${Math.random().toString(36).slice(2, 8)}`;
  let parts = $derived(splitPlace(value));
  let chosen = $derived(COUNTRIES.find((country) => country.name === parts.country) ?? null);
  // A country typed earlier that is not in the list is kept as it is.
  let unlisted = $derived(parts.country && !chosen ? parts.country : "");

  let open = $state(false),
    search = $state(""),
    active = $state(0);
  let shown = $derived(searchCountries(search));
  let searchBox = $state<HTMLInputElement>();
  let listBox = $state<HTMLUListElement>();
  let button = $state<HTMLButtonElement>();

  async function show() {
    open = true;
    search = "";
    active = Math.max(0, shown.findIndex((country) => country.name === chosen?.name));
    await tick();
    searchBox?.focus();
    listBox?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }
  function close(focusButton = true) {
    open = false;
    if (focusButton) button?.focus();
  }
  function pick(name: string) {
    onchange(joinPlace(parts.city, name));
    close();
  }
  async function keys(event: KeyboardEvent) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      active = Math.min(shown.length - 1, Math.max(0, active + (event.key === "ArrowDown" ? 1 : -1)));
      await tick();
      listBox?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (shown[active]) pick(shown[active].name);
    } else if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  }
  // A click anywhere else closes the list.
  function outside(node: HTMLElement) {
    const handle = (event: PointerEvent) => {
      if (open && !node.contains(event.target as Node)) close(false);
    };
    document.addEventListener("pointerdown", handle);
    return { destroy: () => document.removeEventListener("pointerdown", handle) };
  }
</script>

<div class="place" use:outside>
  <div class="head">
    <span id={`${uid}-label`}>{label}</span>
    {#if onremove}<button type="button" class="remove" aria-label={`Remove ${label}`} onclick={onremove}><Trash2 size={13} /> Remove</button>{/if}
  </div>
  <div class="row">
    <div class="country">
      <span class="small-label" id={`${uid}-country`}>Country</span>
      <button
        bind:this={button}
        type="button"
        class="picker"
        class:empty={!chosen && !unlisted}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${uid}-label ${uid}-country`}
        onclick={() => (open ? close() : show())}
      >
        {#if chosen}<img src={flagImage(chosen.code)} alt="" width="22" height="16" referrerpolicy="no-referrer" /><span>{chosen.name}</span>
        {:else if unlisted}<span class="no-flag" aria-hidden="true"></span><span>{unlisted} <small>(no flag)</small></span>
        {:else}<span>Choose a country</span>{/if}
        <ChevronDown size={16} />
      </button>
      {#if open}
        <div class="panel">
          <label class="search">
            <Search size={15} />
            <input bind:this={searchBox} bind:value={search} oninput={() => (active = 0)} onkeydown={keys} placeholder="Search countries" aria-label="Search countries" aria-controls={`${uid}-list`} />
          </label>
          <ul bind:this={listBox} id={`${uid}-list`} role="listbox" aria-labelledby={`${uid}-country`}>
            {#each shown as country, index (country.code)}
              <li
                role="option"
                data-index={index}
                aria-selected={chosen?.name === country.name}
                class:active={index === active}
                onpointerenter={() => (active = index)}
                onclick={() => pick(country.name)}
                onkeydown={(event) => event.key === "Enter" && pick(country.name)}
              >
                <img src={flagImage(country.code)} alt="" width="22" height="16" referrerpolicy="no-referrer" />
                <span>{country.name}</span>
              </li>
            {:else}
              <li class="none" role="option" aria-selected="false" aria-disabled="true">No country matches “{search.trim()}”. Try another spelling.</li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
    <label class="city">
      <span class="small-label">City <small>(type it yourself)</small></span>
      <input value={parts.city} oninput={(event) => onchange(joinPlace(event.currentTarget.value, parts.country))} placeholder="e.g. Bangkok" aria-describedby={explain || (!chosen && !unlisted) ? `${uid}-hint` : undefined} />
    </label>
  </div>
  {#if explain || (!chosen && !unlisted)}<small class="hint" id={`${uid}-hint`}>Pick the country from the list; its flag shows on the Healthcare page. Write the city yourself, or leave it empty to show the country alone.</small>{/if}
</div>

<style>
  .place { grid-column: 1 / -1; display: grid; gap: 0.45rem; padding: 0.85rem; border: 1px solid #e3e8eb; border-radius: 0.75rem; background: #fff; }
  .head { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; font-size: 0.7rem; font-weight: 750; color: #40546a; }
  .remove { display: inline-flex; align-items: center; gap: 0.25rem; padding: 0.4rem 0 0.4rem 0.5rem; border: 0; background: none; color: #a84747; font: inherit; font-size: 0.7rem; font-weight: 700; cursor: pointer; }
  .row { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 0.75rem; align-items: start; }
  .small-label { display: block; margin-bottom: 0.3rem; font-size: 0.7rem; font-weight: 700; color: #5d6b7a; }
  .small-label small { font-weight: 600; color: #8a6414; }
  .country { position: relative; min-width: 0; }
  .city { display: block; min-width: 0; }
  .picker, .city input { width: 100%; min-height: 2.9rem; border: 1px solid #d5dde2; border-radius: 0.6rem; background: #fbfcfc; font: inherit; color: #17304f; }
  .picker { display: flex; align-items: center; gap: 0.55rem; padding: 0 0.75rem; text-align: left; cursor: pointer; }
  .picker > span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .picker.empty { color: #7a8593; }
  .picker small { color: #8a6414; }
  .picker img, li img { flex: none; border-radius: 3px; box-shadow: 0 0 0 1px #00000014; object-fit: cover; }
  .no-flag { flex: none; width: 22px; height: 16px; border-radius: 3px; background: repeating-linear-gradient(45deg, #e8ecef 0 4px, #f6f8f9 4px 8px); }
  .city input { padding: 0.75rem; outline: 0; }
  .picker:focus-visible, .city input:focus { border-color: var(--gold, #c9952d); box-shadow: 0 0 0 3px #c9952d1c; outline: 0; }
  .panel { position: absolute; z-index: 30; top: calc(100% + 0.35rem); left: 0; width: max(100%, 16rem); padding: 0.4rem; border: 1px solid #dfe5ea; border-radius: 0.7rem; background: #fff; box-shadow: 0 0.8rem 2rem #07182f26; }
  .search { display: flex; align-items: center; gap: 0.45rem; padding: 0 0.6rem; margin-bottom: 0.3rem; border: 1px solid #e3e8eb; border-radius: 0.5rem; color: #6a7686; }
  .search input { flex: 1; min-width: 0; padding: 0.6rem 0; border: 0; outline: 0; background: none; font: inherit; }
  ul { max-height: 15rem; margin: 0; padding: 0; overflow-y: auto; list-style: none; }
  li { display: flex; align-items: center; gap: 0.6rem; min-height: 2.4rem; padding: 0.35rem 0.55rem; border-radius: 0.45rem; font-size: 0.88rem; color: #17304f; cursor: pointer; }
  li.active { background: #faf3e2; }
  li[aria-selected="true"] { font-weight: 800; }
  li.none { color: #6a7686; cursor: default; font-size: 0.8rem; }
  .hint { font-size: 0.74rem; line-height: 1.45; color: #6a7686; }
  @media (max-width: 40rem) {
    .row { grid-template-columns: 1fr; }
    .search input, .city input { font-size: 16px; }
  }
</style>
