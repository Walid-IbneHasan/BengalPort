<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { uploadForm } from "$lib/office-files";
  import {
    ACCESS_ROLES,
    blankDocument,
    DOC_CATEGORIES,
    DOCUMENT_ACCEPT,
    documentBody,
    draftFromDocument,
    fileProblem,
    needsCustomer,
    needsEmployee,
    type DocCategory,
    type DocumentDraft,
    type OfficeDocument,
  } from "$lib/office-documents";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import OfficeCustomerPicker, { type PickedCustomer } from "$lib/components/OfficeCustomerPicker.svelte";
  import LookupSelect from "$lib/components/customers/LookupSelect.svelte";

  // Adding a document to the library, or changing its details. A new one can
  // have its file chosen here; it is uploaded straight after the record is made.
  let {
    document = null,
    customer = null,
    category = "CLIENT",
    onclose,
    onsaved,
  }: {
    document?: OfficeDocument | null;
    customer?: PickedCustomer | null;
    category?: DocCategory;
    onclose: () => void;
    // The saved document, and why its file did not upload (empty when it did, or there was none).
    onsaved: (document: OfficeDocument, uploadProblem: string) => void;
  } = $props();

  type Staff = { id: string; name: string; role: string };

  let draft = $state<DocumentDraft>(untrack(() => (document ? draftFromDocument(document) : blankDocument(customer, category))));
  let staff = $state<Staff[]>([]),
    file = $state<File | null>(null),
    fileNote = $state(""),
    saving = $state(false),
    problem = $state("");

  onMount(() => {
    api<Staff[]>("/office/staff").then((list) => (staff = list)).catch(() => (staff = []));
  });

  function chooseFile(event: Event) {
    const input = event.currentTarget as HTMLInputElement;
    const chosen = input.files?.[0] ?? null;
    fileNote = chosen ? fileProblem(chosen) : "";
    file = fileNote ? null : chosen;
    if (fileNote) input.value = "";
  }

  function toggleRole(role: string, on: boolean) {
    draft.restrictedTo = on ? [...draft.restrictedTo.filter((item) => item !== role), role] : draft.restrictedTo.filter((item) => item !== role);
  }

  async function save(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    problem = "";
    try {
      const body = JSON.stringify(documentBody(draft));
      const saved = draft.id
        ? await api<OfficeDocument>(`/office/documents/${draft.id}`, { method: "PUT", body })
        : await api<OfficeDocument>("/office/documents", { method: "POST", body });
      // The record exists now, so a failed upload is reported on the
      // document itself rather than here, where saving again would add it twice.
      let uploadProblem = "";
      if (!draft.id && file) {
        try {
          await uploadForm(`/office/documents/${saved.id}/files`, {}, file);
        } catch (e) {
          uploadProblem = problemText(e, "The file did not upload");
        }
      }
      toasts.show(draft.id ? "Document saved" : uploadProblem ? "Document added, without its file" : "Document added");
      onsaved(saved, uploadProblem);
    } catch (e) {
      problem = problemText(e, "The document was not saved");
    } finally {
      saving = false;
    }
  }
</script>

<OfficeSheet title={draft.id ? `Edit ${document?.name ?? "document"}` : "Add a document"} subtitle={draft.id ? "" : "Expiry alerts go out 15 and 7 days before the expiry date."} onclose={onclose}>
  <form id="document-form" class="o-form" onsubmit={save}>
    <div class="o-fields">
      <label class="o-field">
        <span>Kind of document</span>
        <select bind:value={draft.category}>
          {#each DOC_CATEGORIES as item (item.value)}<option value={item.value}>{item.label}</option>{/each}
        </select>
        <small class="hint">
          {draft.category === "CLIENT" ? "A customer's own papers: certificates, bank statements, letters." : draft.category === "VISA" ? "A customer's visa, passport or travel papers." : draft.category === "EMPLOYEE" ? "Papers of a member of staff: contract, NID, certificates." : "The company's own papers: trade licence, tax, agreements."}
        </small>
      </label>
      <LookupSelect kind="document-type" label="Type" bind:value={draft.docType} required hint="Such as Passport, NID, Visa, Trade licence." />
      <label class="o-field wide"><span>Name</span><input bind:value={draft.name} required maxlength="200" placeholder="Passport of Rahima Begum" /></label>
      <label class="o-field"><span>Number <small>(optional)</small></span><input bind:value={draft.number} maxlength="80" autocomplete="off" placeholder="A01234567" /></label>

      {#if needsCustomer(draft.category)}
        <div class="o-field wide"><OfficeCustomerPicker bind:customer={draft.customer} label="Customer" required /></div>
      {:else if needsEmployee(draft.category)}
        <label class="o-field">
          <span>Member of staff</span>
          <select bind:value={draft.employeeId} required>
            <option value="" disabled>Choose a person</option>
            {#each staff as person (person.id)}<option value={person.id}>{person.name}</option>{/each}
          </select>
        </label>
      {/if}

      <label class="o-field"><span>Issue date <small>(optional)</small></span><input type="date" bind:value={draft.issueDate} /></label>
      <label class="o-field"><span>Expiry date <small>(optional)</small></span><input type="date" bind:value={draft.expiryDate} /></label>
      <label class="o-field wide"><span>Notes <small>(optional)</small></span><textarea bind:value={draft.notes} maxlength="1000"></textarea></label>

      <fieldset class="o-field wide access">
        <legend>Only these roles may open it <small>(optional)</small></legend>
        <div class="roles">
          {#each ACCESS_ROLES as role (role.value)}
            <label class="o-check"><input type="checkbox" checked={draft.restrictedTo.includes(role.value)} onchange={(event) => toggleRole(role.value, event.currentTarget.checked)} /> {role.label}</label>
          {/each}
        </div>
        <small class="hint">None ticked: everyone whose role may see documents. The Super Admin can always open it, and so can the person who added it.</small>
      </fieldset>

      {#if !draft.id}
        <label class="o-field wide">
          <span>File <small>(optional — you can add it later)</small></span>
          <input type="file" accept={DOCUMENT_ACCEPT} onchange={chooseFile} />
          {#if fileNote}<span class="o-error" role="alert">{fileNote}</span>{:else}<small class="hint">PDF, JPEG, PNG or WebP, up to 10 MB. Photos are made smaller before they upload.</small>{/if}
        </label>
      {/if}
    </div>
  </form>
  {#snippet footer()}
    {#if problem}<p class="o-error wide-error" role="alert" use:intoView={problem}>{problem}</p>{/if}
    <button type="button" class="o-btn ghost" onclick={onclose}>Cancel</button>
    <button type="submit" form="document-form" class="o-btn navy" disabled={saving}>{saving ? (file && !draft.id ? "Saving and uploading…" : "Saving…") : draft.id ? "Save document" : "Add document"}</button>
  {/snippet}
</OfficeSheet>

<style>
  .access { margin: 0; padding: 0; border: 0; min-width: 0; }
  .access legend { padding: 0; margin-bottom: 0.35rem; font-size: 0.76rem; font-weight: 800; color: #405066; }
  .access legend small { font-weight: 600; color: #7a8593; }
  .roles { display: flex; flex-wrap: wrap; gap: 0.4rem 1.2rem; }
  .roles .o-check { min-height: 2.5rem; }
  .o-field > .o-error { font-size: 0.8rem; padding: 0.5rem 0.7rem; }
  .wide-error { flex: 1 1 100%; }
</style>
