<script lang="ts">
  import { onMount } from "svelte";
  import { Trash2 } from "lucide-svelte";
  import { api } from "$lib/api";

  // Notes staff leave for each other on an application or an enquiry. The
  // customer never sees them.
  type Note = { id: string; body: string; authorName: string; createdAt: string };
  let { resource, id, onchange }: { resource: "applications" | "enquiries"; id: string; onchange?: (count: number) => void } = $props();
  let notes = $state<Note[]>([]);
  let draft = $state(""), loading = $state(true), saving = $state(false), error = $state("");

  onMount(async () => {
    try {
      notes = await api<Note[]>(`/admin/resources/${resource}/${id}/notes`);
    } catch (e) {
      error = e instanceof Error ? e.message : "The notes could not be loaded.";
    } finally {
      loading = false;
    }
  });

  async function add() {
    if (!draft.trim()) return;
    saving = true;
    error = "";
    try {
      const note = await api<Note>(`/admin/resources/${resource}/${id}/notes`, { method: "POST", body: JSON.stringify({ body: draft }) });
      notes = [note, ...notes];
      draft = "";
      onchange?.(notes.length);
    } catch (e) {
      error = e instanceof Error ? e.message : "The note could not be saved.";
    } finally {
      saving = false;
    }
  }

  async function remove(note: Note) {
    if (!confirm("Delete this note?")) return;
    error = "";
    try {
      await api(`/admin/notes/${note.id}`, { method: "DELETE" });
      notes = notes.filter((item) => item.id !== note.id);
      onchange?.(notes.length);
    } catch (e) {
      error = e instanceof Error ? e.message : "The note could not be deleted.";
    }
  }

  const when = (value: string) => new Date(value).toLocaleString("en-BD", { dateStyle: "medium", timeStyle: "short" });
</script>

<div class="notes">
  <form onsubmit={(e) => { e.preventDefault(); add(); }}>
    <label for="staff-note">Add a note</label>
    <textarea id="staff-note" rows="3" maxlength="2000" bind:value={draft} placeholder="A call you made, what is still missing, who is following up…"></textarea>
    <div class="row">
      <span>Only staff can see notes.</span>
      <button disabled={saving || !draft.trim()}>{saving ? "Saving…" : "Save note"}</button>
    </div>
  </form>
  {#if error}<p class="problem" role="alert">{error}</p>{/if}
  {#if loading}
    <p class="empty">Loading notes…</p>
  {:else if !notes.length}
    <p class="empty">No notes yet.</p>
  {:else}
    <ul>
      {#each notes as note (note.id)}
        <li>
          <p>{note.body}</p>
          <footer>
            <span>{note.authorName} · {when(note.createdAt)}</span>
            <button type="button" aria-label="Delete note" onclick={() => remove(note)}><Trash2 size={14} /></button>
          </footer>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .notes{display:grid;gap:.8rem}
  form{display:grid;gap:.45rem}
  label{font-size:.72rem;font-weight:750;color:#405267}
  textarea{width:100%;border:1px solid #d6dde2;border-radius:.6rem;padding:.65rem .75rem;background:#fff;outline:none;resize:vertical;line-height:1.5;font-size:.82rem}
  textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px #c7983620}
  .row{display:flex;justify-content:space-between;align-items:center;gap:.8rem}
  .row span,.empty{font-size:.74rem;color:#6d7b89;margin:0}
  .row button{min-height:2.2rem;padding:0 .9rem;border:0;border-radius:.55rem;background:var(--gold);color:var(--heading);font-size:.74rem;font-weight:750;cursor:pointer}
  .row button:disabled{opacity:.5;cursor:default}
  ul{list-style:none;margin:0;padding:0;display:grid;gap:.5rem}
  li{background:#f7f8f9;border:1px solid #e6eaed;border-radius:.65rem;padding:.7rem .8rem}
  li p{margin:0;font-size:.82rem;line-height:1.55;color:#23384f;white-space:pre-wrap;overflow-wrap:anywhere}
  li footer{display:flex;justify-content:space-between;align-items:center;gap:.6rem;margin-top:.45rem}
  li footer span{font-size:.7rem;color:#6d7b89}
  li footer button{display:inline-grid;place-items:center;width:2.25rem;height:2.25rem;border:0;border-radius:.45rem;background:none;color:#a84747;cursor:pointer}
  .problem{margin:0;padding:.55rem .75rem;border-radius:.55rem;background:#fff0f0;color:#922f2f;font-size:.78rem}
  /* On phones and tablets fields use 16px text: iPhones zoom the page when a smaller field is focused. */
  @media(max-width:58rem){textarea{font-size:1rem}}
  @media(hover:hover) and (pointer:fine){li footer button:hover{background:#fdeaea}}
</style>
