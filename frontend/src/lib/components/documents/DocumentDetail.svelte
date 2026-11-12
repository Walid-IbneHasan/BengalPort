<script lang="ts">
  import { untrack } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { confirmAction } from "$lib/confirm";
  import { toasts } from "$lib/toast";
  import { day, officePermissions } from "$lib/office";
  import { downloadFile, openFile, safeFileName, uploadForm } from "$lib/office-files";
  import { dayTime } from "$lib/crm";
  import {
    accessText,
    categoryLabel,
    daysLeft,
    DOCUMENT_ACCEPT,
    expiryText,
    expiryTone,
    fileProblem,
    fileSize,
    type DocFile,
    type OfficeDocument,
    type Verification,
  } from "$lib/office-documents";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import { BadgeCheck, CircleX, Download, Eye, Lock, Pencil, RotateCcw, Trash2, Upload } from "lucide-svelte";

  // One document in the library: its details, every version of its file,
  // a new version, the check (verified or rejected), and deleting it.
  let {
    document,
    notice = "",
    onclose,
    onedit,
    onchanged,
    ondeleted,
  }: {
    document: OfficeDocument;
    // Shown at the upload box when opened straight after a failed upload.
    notice?: string;
    onclose: () => void;
    onedit: () => void;
    onchanged: (document: OfficeDocument) => void;
    ondeleted: () => void;
  } = $props();

  let file = $state<File | null>(null),
    picker = $state<HTMLInputElement>(),
    uploading = $state(false),
    uploadProblem = $state(untrack(() => notice)),
    fileProblemText = $state(""),
    busyFile = $state(""),
    note = $state(untrack(() => document.notes ?? "")),
    deciding = $state<Verification | "">(""),
    verifyProblem = $state(""),
    footerProblem = $state("");

  const may = (permission: string) => $officePermissions.has(permission);
  let left = $derived(daysLeft(document.expiryDate));
  // Passports, ID cards and visas open only for roles with the passport permission.
  let lockedForMe = $derived(document.sensitive && !may("passport.read"));
  let latest = $derived(document.files[0]?.version ?? 0);

  const path = (version: number) => `/office/documents/${document.id}/files/${version}`;

  async function view(item: DocFile) {
    busyFile = `view-${item.version}`;
    fileProblemText = "";
    try {
      await openFile(path(item.version));
    } catch (e) {
      fileProblemText = problemText(e, "The file could not be opened");
    } finally {
      busyFile = "";
    }
  }

  async function download(item: DocFile) {
    busyFile = `download-${item.version}`;
    fileProblemText = "";
    try {
      await downloadFile(`${path(item.version)}?download=1`, safeFileName(item.fileName));
    } catch (e) {
      fileProblemText = problemText(e, "The file could not be downloaded");
    } finally {
      busyFile = "";
    }
  }

  function chooseFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const chosen = input.files?.[0] ?? null;
    uploadProblem = chosen ? fileProblem(chosen) : "";
    file = uploadProblem ? null : chosen;
    if (uploadProblem) input.value = "";
  }

  async function upload() {
    if (!file) return;
    uploading = true;
    uploadProblem = "";
    try {
      const saved = await uploadForm<DocFile>(`/office/documents/${document.id}/files`, {}, file);
      toasts.show(`Version ${saved.version} uploaded`);
      file = null;
      if (picker) picker.value = "";
      onchanged(await api<OfficeDocument>(`/office/documents/${document.id}`));
    } catch (e) {
      uploadProblem = problemText(e, "The file did not upload");
    } finally {
      uploading = false;
    }
  }

  // The note given with the check becomes the document's note.
  async function decide(verification: Verification) {
    deciding = verification;
    verifyProblem = "";
    try {
      const saved = await api<OfficeDocument>(`/office/documents/${document.id}/verify`, { method: "POST", body: JSON.stringify({ verification, notes: note }) });
      toasts.show(verification === "VERIFIED" ? "Marked verified" : verification === "REJECTED" ? "Marked rejected" : "Back to waiting");
      onchanged(saved);
    } catch (e) {
      verifyProblem = problemText(e, "The check was not saved");
    } finally {
      deciding = "";
    }
  }

  async function remove() {
    const ok = await confirmAction({
      title: `Delete ${document.name}?`,
      message: `The document and all ${document.files.length === 1 ? "its file" : `its ${document.files.length} files`} are removed for everyone. This cannot be undone.`,
      confirmLabel: "Delete document",
    });
    if (!ok) return;
    footerProblem = "";
    try {
      await api(`/office/documents/${document.id}`, { method: "DELETE" });
      toasts.show("Document deleted");
      ondeleted();
    } catch (e) {
      footerProblem = problemText(e, "The document was not deleted");
    }
  }
</script>

<OfficeSheet title={document.name} subtitle={`${categoryLabel(document.category)} · ${document.docType}${document.number ? ` · ${document.number}` : ""}`} wide onclose={onclose}>
  <div class="detail">
    <div class="status">
      <StatusPill status={document.verification} label={document.verification === "PENDING" ? "Waiting to be checked" : ""} />
      {#if document.expiryDate}<span class="o-pill {expiryTone(left) || 'quiet'}">{left !== null && left < 0 ? "Expired" : "Expires"} {day(document.expiryDate)} · {expiryText(left)}</span>{/if}
    </div>

    <div class="o-grid-2">
      <section class="o-card">
        <h2>Details</h2>
        <dl class="o-meta">
          <div><dt>Kind</dt><dd>{categoryLabel(document.category)}</dd></div>
          <div><dt>Type</dt><dd>{document.docType}</dd></div>
          <div><dt>Number</dt><dd>{document.number || "—"}</dd></div>
          <div>
            <dt>Belongs to</dt>
            <dd>
              {#if document.customer}<a class="o-link" href={`/admin/customers/${document.customer.id}`}>{document.customer.name}</a> <small>{document.customer.customerCode}</small>
              {:else if document.employee}{document.employee.name} <small>(staff)</small>
              {:else}The company{/if}
            </dd>
          </div>
          <div><dt>Issued</dt><dd>{document.issueDate ? day(document.issueDate) : "—"}</dd></div>
          <div><dt>Expires</dt><dd class={expiryTone(left)}>{document.expiryDate ? `${day(document.expiryDate)} (${expiryText(left)})` : "No expiry"}</dd></div>
          <div>
            <dt>Checked</dt>
            <dd>{document.verification === "PENDING" ? "Not yet" : `${document.verification === "VERIFIED" ? "Verified" : "Rejected"}${document.verifiedByName ? ` by ${document.verifiedByName}` : ""}${document.verifiedAt ? `, ${day(document.verifiedAt)}` : ""}`}</dd>
          </div>
          <div><dt>Added by</dt><dd>{document.uploadedByName || "—"}</dd></div>
          <div><dt>Who may open it</dt><dd>{accessText(document.restrictedTo)}</dd></div>
          {#if document.notes}<div class="notes"><dt>Notes</dt><dd>{document.notes}</dd></div>{/if}
        </dl>
      </section>

      <section class="o-card">
        <h2>Files</h2>
        <p class="private"><Lock size={15} /> This document is private. Opening and downloading it is recorded.</p>
        {#if lockedForMe}<p class="o-muted small">This is a passport, ID card or visa: opening its file needs the passport permission.</p>{/if}
        {#if !document.files.length}
          <p class="o-muted">No file yet.{may("documents.create") ? " Upload one below." : ""}</p>
        {:else}
          <ol class="versions" aria-label="Versions, newest first">
            {#each document.files as item (item.id)}
              <li>
                <div class="file">
                  <b>Version {item.version}{#if item.version === latest} <span class="o-pill info">Latest</span>{/if}</b>
                  <span class="name">{item.fileName}</span>
                  <small>{fileSize(item.byteSize)} · {item.uploadedByName || "—"} · {dayTime(item.createdAt)}</small>
                </div>
                {#if !lockedForMe}
                  <div class="file-actions">
                    <button type="button" class="o-btn ghost small" disabled={!!busyFile} onclick={() => view(item)} aria-label={`View version ${item.version}, ${item.fileName}`}>
                      <Eye size={15} /> {busyFile === `view-${item.version}` ? "Opening…" : "View"}
                    </button>
                    {#if may("documents.export")}
                      <button type="button" class="o-btn ghost small" disabled={!!busyFile} onclick={() => download(item)} aria-label={`Download version ${item.version}, ${item.fileName}`}>
                        <Download size={15} /> {busyFile === `download-${item.version}` ? "Downloading…" : "Download"}
                      </button>
                    {/if}
                  </div>
                {/if}
              </li>
            {/each}
          </ol>
        {/if}
        {#if fileProblemText}<p class="o-error" role="alert" use:intoView={fileProblemText}>{fileProblemText}</p>{/if}

        {#if may("documents.create")}
          <div class="upload">
            <label class="o-field">
              <span>{document.files.length ? "Upload a new version" : "Upload the file"}</span>
              <input bind:this={picker} type="file" accept={DOCUMENT_ACCEPT} onchange={chooseFile} />
              <small class="hint">PDF, JPEG, PNG or WebP, up to 10 MB.{document.files.length ? " Earlier versions are kept." : ""} A new file is checked again: it goes back to “Waiting to be checked”.</small>
            </label>
            {#if uploadProblem}<p class="o-error" role="alert" use:intoView={uploadProblem}>{uploadProblem}</p>{/if}
            <button type="button" class="o-btn navy small" disabled={!file || uploading} onclick={upload}><Upload size={15} /> {uploading ? "Uploading…" : "Upload"}</button>
          </div>
        {/if}
      </section>
    </div>

    {#if may("documents.approve")}
      <section class="o-card check">
        <h2>Check the document</h2>
        <label class="o-field">
          <span>Note <small>(optional)</small></span>
          <textarea bind:value={note} maxlength="1000" placeholder="Why it was rejected, or what was checked"></textarea>
          <small class="hint">The note is saved as the document's note.</small>
        </label>
        {#if verifyProblem}<p class="o-error" role="alert" use:intoView={verifyProblem}>{verifyProblem}</p>{/if}
        <div class="o-form-actions">
          {#if document.verification !== "PENDING"}
            <button type="button" class="o-btn ghost" disabled={!!deciding} onclick={() => decide("PENDING")}><RotateCcw size={16} /> {deciding === "PENDING" ? "Saving…" : "Back to waiting"}</button>
          {/if}
          <button type="button" class="o-btn danger" disabled={!!deciding} onclick={() => decide("REJECTED")}><CircleX size={16} /> {deciding === "REJECTED" ? "Saving…" : "Reject"}</button>
          <button type="button" class="o-btn navy" disabled={!!deciding} onclick={() => decide("VERIFIED")}><BadgeCheck size={16} /> {deciding === "VERIFIED" ? "Saving…" : "Mark verified"}</button>
        </div>
      </section>
    {/if}
  </div>
  {#snippet footer()}
    {#if footerProblem}<p class="o-error wide-error" role="alert" use:intoView={footerProblem}>{footerProblem}</p>{/if}
    {#if may("documents.delete")}<button type="button" class="o-btn danger" onclick={remove}><Trash2 size={16} /> Delete</button>{/if}
    {#if may("documents.update")}<button type="button" class="o-btn ghost" onclick={onedit}><Pencil size={16} /> Edit details</button>{/if}
    <button type="button" class="o-btn navy" onclick={onclose}>Close</button>
  {/snippet}
</OfficeSheet>

<style>
  .detail { display: grid; gap: 1rem; }
  .detail .o-card + .o-card { margin-top: 0; }
  .status { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .o-pill.quiet { background: #eef1f4; color: #48576b; }
  dd small { color: #7a8593; font-weight: 600; }
  dd.warn { color: #7c5a12; }
  dd.bad { color: #a3302a; }
  .notes dd { white-space: pre-line; text-align: left; font-weight: 600; }
  .private { display: flex; align-items: flex-start; gap: 0.45rem; margin: 0 0 0.8rem; padding: 0.6rem 0.75rem; border-radius: 0.6rem; background: #f3f5f8; color: #405066; font-size: 0.82rem; line-height: 1.45; }
  .private :global(svg) { flex: none; margin-top: 0.1rem; }
  .small { margin: 0 0 0.8rem; font-size: 0.82rem; }
  .versions { display: grid; gap: 0; margin: 0; padding: 0; list-style: none; }
  .versions li { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.5rem 1rem; padding: 0.7rem 0; border-top: 1px solid #edf0f2; }
  .versions li:first-child { border-top: 0; padding-top: 0; }
  .file { display: grid; gap: 0.15rem; min-width: 0; flex: 1 1 12rem; }
  .file b { display: flex; align-items: center; gap: 0.4rem; color: #07182f; font-size: 0.88rem; }
  .file .name { overflow-wrap: anywhere; font-size: 0.86rem; }
  .file small { color: #7a8593; font-size: 0.76rem; }
  .file-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .file-actions .o-btn { min-height: 2.5rem; }
  .upload { display: grid; gap: 0.6rem; margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #edf0f2; }
  .upload .o-btn { justify-self: start; min-height: 2.5rem; }
  .check { display: grid; gap: 0.8rem; }
  .check h2 { margin: 0; }
  .wide-error { flex: 1 1 100%; }
</style>
