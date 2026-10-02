<script lang="ts">
  import { Check, Pencil, Plus, Trash2, X } from "lucide-svelte";
  import { api } from "$lib/api";

  // Admin: the categories ledger entries are filed under.
  type Category = { id: string; name: string; type: "INCOME" | "EXPENSE"; entries: number };
  let { categories, onchange, onclose }: { categories: Category[]; onchange: () => void | Promise<void>; onclose: () => void } = $props();
  let name = $state(""), type = $state<"INCOME" | "EXPENSE">("EXPENSE");
  let renaming = $state(""), renamed = $state("");
  let busy = $state(false), error = $state("");

  async function run(action: () => Promise<unknown>, fallback: string) {
    busy = true;
    error = "";
    try {
      await action();
      await onchange();
      return true;
    } catch (e) {
      error = e instanceof Error ? e.message : fallback;
      return false;
    } finally {
      busy = false;
    }
  }
  async function add() {
    if (await run(() => api("/admin/accounts/categories", { method: "POST", body: JSON.stringify({ name, type }) }), "The category could not be added.")) name = "";
  }
  async function rename(category: Category) {
    if (renamed.trim() === category.name) return (renaming = "");
    if (await run(() => api(`/admin/accounts/categories/${category.id}`, { method: "PUT", body: JSON.stringify({ name: renamed }) }), "The category could not be renamed.")) renaming = "";
  }
  async function remove(category: Category) {
    if (!confirm(`Delete the category “${category.name}”?`)) return;
    await run(() => api(`/admin/accounts/categories/${category.id}`, { method: "DELETE" }), "The category could not be deleted.");
  }
  const groups = [
    ["INCOME", "Income"],
    ["EXPENSE", "Expense"],
  ] as const;
</script>

<svelte:window onkeydown={(e) => e.key === "Escape" && onclose()} />
<div class="backdrop" role="presentation" onclick={(e) => e.target === e.currentTarget && onclose()}>
  <div class="panel" role="dialog" aria-modal="true" aria-labelledby="categories-title">
    <header>
      <div><span>HISAB KITAB</span><h2 id="categories-title">Categories</h2></div>
      <button aria-label="Close" onclick={onclose}><X /></button>
    </header>
    <div class="body">
      <form onsubmit={(e) => { e.preventDefault(); add(); }}>
        <label><span>New category</span><input bind:value={name} required minlength="2" maxlength="60" placeholder="e.g. Visa fees" /></label>
        <label><span>Kind</span><select bind:value={type}><option value="EXPENSE">Expense</option><option value="INCOME">Income</option></select></label>
        <button class="add" disabled={busy || name.trim().length < 2}><Plus size={16} /> Add</button>
      </form>
      {#if error}<p class="problem" role="alert">{error}</p>{/if}
      {#each groups as [kind, title]}
        <section>
          <h3>{title}</h3>
          <ul>
            {#each categories.filter((category) => category.type === kind) as category (category.id)}
              <li>
                {#if renaming === category.id}
                  <form class="rename" onsubmit={(e) => { e.preventDefault(); rename(category); }}>
                    <!-- svelte-ignore a11y_autofocus -->
                    <input bind:value={renamed} required minlength="2" maxlength="60" aria-label="Category name" autofocus />
                    <button aria-label="Save name" disabled={busy}><Check size={15} /></button>
                    <button type="button" aria-label="Cancel" onclick={() => (renaming = "")}><X size={15} /></button>
                  </form>
                {:else}
                  <div><b>{category.name}</b><span>{category.entries === 0 ? "No entries" : category.entries === 1 ? "1 entry" : `${category.entries} entries`}</span></div>
                  <button aria-label={`Rename ${category.name}`} onclick={() => { renaming = category.id; renamed = category.name; }}><Pencil size={15} /></button>
                  <button class="danger" aria-label={`Delete ${category.name}`} disabled={busy || category.entries > 0} title={category.entries > 0 ? "A category with entries cannot be deleted" : ""} onclick={() => remove(category)}><Trash2 size={15} /></button>
                {/if}
              </li>
            {:else}
              <li class="none">No {title.toLowerCase()} categories yet.</li>
            {/each}
          </ul>
        </section>
      {/each}
      <p class="hint">A category that has entries can be renamed but not deleted.</p>
    </div>
  </div>
</div>

<style>
  .backdrop{position:fixed;inset:0;background:#061326a8;z-index:100;display:flex;justify-content:flex-end;backdrop-filter:blur(3px)}
  .panel{width:min(480px,100vw);height:100%;overflow:auto;background:#f7f8fa;box-shadow:-24px 0 60px #0613263d}
  header{display:flex;justify-content:space-between;align-items:center;background:#07182f;color:#fff;padding:25px 28px}
  header span{font-size:11px;letter-spacing:.14em;color:#d8ae4a;font-weight:800}
  header h2{margin:5px 0 0;font-size:24px}
  header button{border:0;background:#ffffff12;color:#fff;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;cursor:pointer}
  .body{padding:22px 28px 40px;display:grid;gap:18px}
  .body>form{display:grid;grid-template-columns:1fr 120px auto;gap:10px;align-items:end}
  label{display:grid;gap:6px}
  label span{font-size:11px;font-weight:800;color:#405066}
  input,select{width:100%;border:1px solid #d5dbe1;background:#fff;border-radius:8px;padding:10px 12px;outline:none}
  input:focus,select:focus{border-color:#c9952d;box-shadow:0 0 0 3px #c9952d1c}
  .add{display:flex;align-items:center;gap:6px;border:0;background:#d19b2d;color:#07182f;border-radius:8px;padding:11px 14px;font-weight:800;cursor:pointer}
  .add:disabled{opacity:.5;cursor:default}
  h3{margin:0 0 8px;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:#7b8592}
  ul{list-style:none;margin:0;padding:0;background:#fff;border:1px solid #e3e7eb;border-radius:12px;overflow:hidden}
  li{display:flex;align-items:center;gap:8px;padding:11px 14px;border-top:1px solid #eaedf0}
  li:first-child{border-top:0}
  li>div{flex:1;min-width:0}
  li b{display:block;font-size:13px;color:#12213a}
  li span,li.none,.hint{font-size:11px;color:#7a8593}
  li button{width:36px;height:36px;border:1px solid #dfe5ea;border-radius:8px;background:#fff;color:#35495d;display:inline-grid;place-items:center;cursor:pointer;flex:none}
  li button.danger{color:#a84747;border-color:#eadada}
  li button:disabled{opacity:.4;cursor:default}
  .rename{flex:1;display:flex;gap:8px}
  .rename input{flex:1}
  .hint{margin:0}
  .problem{margin:0;padding:10px 12px;border-radius:8px;background:#fff0f0;color:#922f2f;font-size:13px}
  @media(max-width:480px){.body{padding:18px 18px 32px}.body>form{grid-template-columns:1fr 1fr}.body>form label:first-child{grid-column:1/-1}}
</style>
