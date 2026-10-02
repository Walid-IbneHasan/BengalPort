<script lang="ts">
  import { Download, FileText, LoaderCircle, Paperclip, Trash2 } from "lucide-svelte";
  import { DOCUMENT_ACCEPT, MAX_DOCUMENTS, documentProblem, formatBytes } from "$lib/document-rules";
  import { downloadDocument, removeDocument, uploadDocument, type DocumentInfo } from "$lib/documents";

  // The documents attached to one application. With `canAttach` the viewer can
  // add and remove files; with `canDownload` (a signed-in member or admin) they
  // can read them back. `uploadToken` is the link given to a guest applicant.
  let {
    applicationId,
    documents = [],
    uploadToken,
    canAttach = false,
    canDownload = false,
    onchange,
  }: {
    applicationId: string;
    documents?: DocumentInfo[];
    uploadToken?: string;
    canAttach?: boolean;
    canDownload?: boolean;
    onchange?: (documents: DocumentInfo[]) => void;
  } = $props();

  // The list starts from what the page already loaded and is then kept here.
  // svelte-ignore state_referenced_locally
  let items = $state<DocumentInfo[]>(documents);
  let busy = $state(""), error = $state("");

  async function attach(files: FileList | null) {
    error = "";
    for (const file of files ?? []) {
      const problem = documentProblem(file, items.length);
      if (problem) { error = problem; continue; }
      busy = `Uploading ${file.name}…`;
      try { items = [...items, await uploadDocument(applicationId, file, uploadToken)]; }
      catch (e) { error = `“${file.name}” was not attached: ${e instanceof Error ? e.message : "upload failed"}.`; }
    }
    busy = "";
    onchange?.(items);
  }
  async function remove(item: DocumentInfo) {
    error = "";
    try { await removeDocument(item.id, uploadToken); items = items.filter((other) => other.id !== item.id); onchange?.(items); }
    catch (e) { error = e instanceof Error ? e.message : "The document could not be removed."; }
  }
  async function download(item: DocumentInfo) {
    error = "";
    try { await downloadDocument(item); }
    catch (e) { error = e instanceof Error ? e.message : "The document could not be downloaded."; }
  }
</script>

<div class="documents">
  {#if items.length}
    <ul>
      {#each items as item}
        <li>
          <FileText size={18} />
          <span><b>{item.name}</b><small>{formatBytes(item.byteSize)}</small></span>
          {#if canDownload}<button type="button" aria-label={`Download ${item.name}`} onclick={() => download(item)}><Download size={16} /></button>{/if}
          {#if canAttach}<button type="button" class="danger" aria-label={`Remove ${item.name}`} onclick={() => remove(item)}><Trash2 size={16} /></button>{/if}
        </li>
      {/each}
    </ul>
  {:else if !canAttach}
    <p class="none">No documents attached.</p>
  {/if}
  {#if error}<p class="problem" role="alert">{error}</p>{/if}
  {#if canAttach}
    {#if busy}
      <p class="busy" role="status"><LoaderCircle size={16} /> {busy}</p>
    {:else if items.length < MAX_DOCUMENTS}
      <label class="choose">
        <Paperclip size={16} /> {items.length ? "Attach another file" : "Choose files"}
        <input type="file" accept={DOCUMENT_ACCEPT} multiple onchange={(e) => { attach(e.currentTarget.files); e.currentTarget.value = ""; }} />
      </label>
      <small class="rules">PDF, JPEG, PNG or WebP · up to 10 MB each · {MAX_DOCUMENTS} files at most</small>
    {/if}
  {/if}
</div>

<style>
  .documents{display:grid;gap:.6rem;text-align:left}
  ul{list-style:none;margin:0;padding:0;display:grid;gap:.4rem}
  li{display:flex;align-items:center;gap:.6rem;padding:.55rem .7rem;border:1px solid #e1e7e9;border-radius:.65rem;background:#fbfcfc;color:#40576b}
  li span{flex:1;min-width:0;display:grid}
  li b{font-size:.84rem;color:#23384f;overflow-wrap:anywhere}
  li small{font-size:.72rem;color:#748391}
  li button{flex:none;width:2.1rem;height:2.1rem;display:grid;place-items:center;border:1px solid #dce3e6;border-radius:.5rem;background:#fff;color:#35495d;cursor:pointer}
  li button.danger{color:#a84747;border-color:#eadada}
  .choose{justify-self:start;display:inline-flex;align-items:center;gap:.45rem;min-height:2.6rem;padding:.5rem .95rem;border:1px dashed #b9c5cc;border-radius:.65rem;background:#fff;color:#17304f;font-weight:750;font-size:.84rem;cursor:pointer}
  .choose input{position:absolute;width:1px;height:1px;opacity:0;overflow:hidden}
  .choose:focus-within{outline:3px solid rgba(199,152,54,.36);outline-offset:3px}
  .rules,.none{font-size:.76rem;color:#748391;margin:0}
  .busy{display:flex;align-items:center;gap:.45rem;margin:0;font-size:.84rem;color:#40576b}
  .problem{margin:0;padding:.6rem .8rem;border-radius:.6rem;background:#fff0f0;color:#943d45;font-size:.82rem}
  @media(hover:hover) and (pointer:fine){li button:hover{background:#f4f6f8}li button.danger:hover{background:#fff1f1}.choose:hover{border-color:#8c9aa3}}
</style>
