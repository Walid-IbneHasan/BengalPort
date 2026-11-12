<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { day, officePermissions } from "$lib/office";
  import {
    categoryLabel,
    DOC_CATEGORIES,
    daysLeft,
    expiryText,
    expiryTone,
    latestFile,
    VERIFICATIONS,
    type DocCategory,
    type OfficeDocument,
  } from "$lib/office-documents";
  import type { PickedCustomer } from "$lib/components/OfficeCustomerPicker.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import DocumentForm from "$lib/components/documents/DocumentForm.svelte";
  import DocumentDetail from "$lib/components/documents/DocumentDetail.svelte";
  import { CalendarClock, FilePlus2, FolderLock, Search, X } from "lucide-svelte";

  // The document library: client, visa, employee and company papers, each
  // with its details, file versions, check and expiry date. Files are
  // private and every opening is recorded. Alerts go out 15 and 7 days
  // before a document expires.
  type Form = { document: OfficeDocument | null; customer: PickedCustomer | null; category: DocCategory };
  const TABS: { key: DocCategory | ""; label: string }[] = [{ key: "", label: "All" }, ...DOC_CATEGORIES.map((item) => ({ key: item.value, label: item.label }))];

  let rows = $state<OfficeDocument[]>([]),
    loading = $state(true),
    problem = $state(""),
    category = $state<DocCategory | "">(""),
    search = $state(""),
    verification = $state(""),
    expiring = $state(false),
    customerId = $state(""),
    // The customer the list is narrowed to, from ?customer=ID.
    filterCustomer = $state<PickedCustomer | null>(null),
    opened = $state<OfficeDocument | null>(null),
    openNotice = $state(""),
    form = $state<Form | null>(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let ticket = 0;

  const may = (permission: string) => $officePermissions.has(permission);
  let filtered = $derived(!!(category || search.trim() || verification || expiring || customerId));
  let customerName = $derived(filterCustomer?.name ?? "");

  function query() {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (search.trim()) params.set("search", search.trim());
    if (verification) params.set("verification", verification);
    if (expiring) params.set("expiringWithin", "30");
    if (customerId) params.set("customerId", customerId);
    return params.toString();
  }

  async function load() {
    const mine = ++ticket;
    loading = true;
    problem = "";
    try {
      const list = await api<OfficeDocument[]>(`/office/documents?${query()}`);
      if (mine !== ticket) return;
      rows = list;
      // Without access to the customer list the name still comes from their documents.
      const theirs = customerId && !filterCustomer ? list.find((row) => row.customer?.id === customerId)?.customer : null;
      if (theirs) filterCustomer = { id: theirs.id, customerCode: theirs.customerCode, name: theirs.name };
    } catch (e) {
      if (mine !== ticket) return;
      rows = [];
      problem = problemText(e, "The documents could not be loaded");
    } finally {
      if (mine === ticket) loading = false;
    }
  }

  function searched() {
    clearTimeout(timer);
    timer = setTimeout(load, 300);
  }

  function choose(next: DocCategory | "") {
    category = next;
    load();
  }

  function clearCustomer() {
    customerId = "";
    filterCustomer = null;
    goto("/admin/documents", { replaceState: true, noScroll: true, keepFocus: true });
    load();
  }

  function clearFilters() {
    category = "";
    search = "";
    verification = "";
    expiring = false;
    if (customerId) clearCustomer();
    else load();
  }

  onMount(() => {
    const params = page.url.searchParams;
    customerId = params.get("customer") ?? "";
    load();
    // The customer's name for the filter, and for the form when arriving
    // from "Add document" on their page.
    const wantsNew = params.get("new") === "1" && may("documents.create");
    if (customerId)
      api<PickedCustomer>(`/office/customers/${customerId}`)
        .then((found) => {
          filterCustomer = { id: found.id, customerCode: found.customerCode, name: found.name, phone: found.phone };
          if (wantsNew) form = { document: null, customer: { ...filterCustomer }, category: "CLIENT" };
        })
        .catch(() => {
          if (wantsNew) form = { document: null, customer: null, category: "CLIENT" };
        });
    else if (wantsNew) form = { document: null, customer: null, category: "CLIENT" };
    // "new" is used once; the customer filter stays in the address.
    if (params.has("new")) goto(customerId ? `/admin/documents?customer=${customerId}` : "/admin/documents", { replaceState: true, noScroll: true, keepFocus: true });
    return () => clearTimeout(timer);
  });

  function openRow(event: MouseEvent, document: OfficeDocument) {
    if ((event.target as HTMLElement).closest("a, button")) return;
    open(document);
  }
  function open(document: OfficeDocument, notice = "") {
    openNotice = notice;
    opened = document;
  }

  function addNew() {
    form = {
      document: null,
      customer: customerId && filterCustomer ? { ...filterCustomer } : null,
      category: category || "CLIENT",
    };
  }

  // After a change in the panel: show the new state there and in the list.
  function changed(document: OfficeDocument) {
    openNotice = "";
    opened = document;
    load();
  }

  async function saved(document: OfficeDocument, uploadProblem: string) {
    const editing = !!form?.document;
    form = null;
    load();
    if (editing) {
      open(document);
      return;
    }
    // A new document opens straight away, with the file just uploaded (or
    // why it did not upload).
    const fresh = await api<OfficeDocument>(`/office/documents/${document.id}`).catch(() => document);
    open(fresh, uploadProblem);
  }

  const owner = (document: OfficeDocument) => (document.customer ? document.customer.name : document.employee ? document.employee.name : "The company");
</script>

<svelte:head><title>Documents — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office</span>
      <h1>Documents</h1>
      <p>Client, visa, employee and company papers, with their versions and expiry dates. Reminders go out 15 and 7 days before something expires. Files are private: every opening is recorded.</p>
    </div>
    {#if may("documents.create")}
      <div class="o-actions"><button class="o-btn" onclick={addNew}><FilePlus2 size={18} /> Add document</button></div>
    {/if}
  </header>

  <nav class="o-tabs" aria-label="Kind of document">
    {#each TABS as item (item.key)}
      <button class:active={category === item.key} aria-pressed={category === item.key} onclick={() => choose(item.key)}>{item.label}</button>
    {/each}
  </nav>

  <div class="o-toolbar">
    <label class="o-search">
      <Search size={17} />
      <span class="o-sr">Search documents</span>
      <input type="search" bind:value={search} oninput={searched} placeholder="Name, number, type or customer" autocomplete="off" />
    </label>
    <label>
      <span class="o-sr">Checked</span>
      <select class="o-select" bind:value={verification} onchange={load}>
        <option value="">Checked or not</option>
        {#each VERIFICATIONS as item (item.value)}<option value={item.value}>{item.label}</option>{/each}
      </select>
    </label>
    <button class="o-btn ghost toggle" class:on={expiring} aria-pressed={expiring} onclick={() => { expiring = !expiring; load(); }}>
      <CalendarClock size={16} /> Expiring in 30 days
    </button>
    {#if customerId}
      <span class="chip">
        Customer: {customerName || "this customer"}
        <button type="button" onclick={clearCustomer} aria-label={`Show documents of every customer, not only ${customerName || "this customer"}`}><X size={15} /></button>
      </span>
    {/if}
  </div>

  {#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}

  {#if loading && !rows.length}
    <p class="o-loading">Loading documents…</p>
  {:else if !rows.length && !problem}
    <div class="o-card o-empty">
      <FolderLock size={28} />
      {#if filtered}
        <h3>{expiring ? "Nothing expires in the next 30 days" : "No document matches"}</h3>
        <p>Try another tab or fewer words.</p>
        <button class="o-btn ghost small" onclick={clearFilters}>Show all documents</button>
      {:else}
        <h3>No documents yet</h3>
        <p>{may("documents.create") ? "Add passports, visas, certificates and company papers with “Add document”." : "Documents you may see will show here."}</p>
      {/if}
    </div>
  {:else if rows.length}
    <div class="o-table-wrap" class:busy={loading} aria-busy={loading}>
      <table class="o-table">
        <thead><tr><th>Document</th><th>Number</th><th>Belongs to</th><th>Expiry</th><th>Checked</th><th>Latest file</th><th>Added by</th></tr></thead>
        <tbody>
          {#each rows as document (document.id)}
            {@const left = daysLeft(document.expiryDate)}
            {@const file = latestFile(document)}
            <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
            <tr class="clickable" onclick={(event) => openRow(event, document)}>
              <td class="lead" data-label="Document">
                <button type="button" class="name" onclick={() => open(document)}>{document.name}</button>
                <small>{document.docType}{category ? "" : ` · ${categoryLabel(document.category)}`}{document.restrictedTo.length ? " · restricted" : ""}</small>
              </td>
              <td data-label="Number">{document.number || "—"}</td>
              <td data-label="Belongs to">
                {#if document.customer}
                  <a class="o-link" href={`/admin/customers/${document.customer.id}`}>{document.customer.name}</a><small>{document.customer.customerCode}</small>
                {:else}
                  {owner(document)}{#if document.employee}<small>Staff</small>{/if}
                {/if}
              </td>
              <td data-label="Expiry">
                {#if document.expiryDate}
                  <span class={expiryTone(left)}>{day(document.expiryDate)}</span><small class={expiryTone(left)}>{expiryText(left)}</small>
                {:else}<span class="o-muted">No expiry</span>{/if}
              </td>
              <td data-label="Checked"><StatusPill status={document.verification} label={document.verification === "PENDING" ? "Waiting" : ""} /></td>
              <td data-label="Latest file">{#if file}<span class="file">v{file.version} · {file.fileName}</span>{:else}<span class="o-muted">No file yet</span>{/if}</td>
              <td data-label="Added by">{document.uploadedByName || "—"}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if rows.length >= 300}<p class="o-muted more">Showing the first 300. Search or choose a tab to find others.</p>{/if}
  {/if}
</div>

{#if opened && !form}
  {#key opened.id}
    <DocumentDetail
      document={opened}
      notice={openNotice}
      onclose={() => (opened = null)}
      onedit={() => opened && (form = { document: opened, customer: null, category: opened.category })}
      onchanged={changed}
      ondeleted={() => { opened = null; load(); }}
    />
  {/key}
{/if}

{#if form}
  <DocumentForm document={form.document} customer={form.customer} category={form.category} onclose={() => (form = null)} onsaved={saved} />
{/if}

<style>
  /* Every button stays at least 40px tall, for fingers. */
  .o-btn.small { min-height: 2.5rem; }
  .toggle { min-height: 2.6rem; }
  .toggle.on { background: #07182f; color: #fff; box-shadow: none; }
  .chip { display: inline-flex; align-items: center; gap: 0.35rem; min-height: 2.6rem; padding: 0 0.3rem 0 0.85rem; border-radius: 2rem; background: #fdf3dc; color: #6f5418; font-size: 0.84rem; font-weight: 750; max-width: 100%; }
  .chip button { display: grid; place-items: center; width: 2.5rem; height: 2.5rem; border: 0; border-radius: 50%; background: #ffffff99; color: #6f5418; cursor: pointer; }
  .chip button:focus-visible { outline: 3px solid #d19b2d; outline-offset: 1px; }
  .name { padding: 0; border: 0; background: none; color: #9b6b16; font: inherit; font-size: 0.95rem; font-weight: 750; text-align: left; cursor: pointer; overflow-wrap: anywhere; }
  .name:focus-visible { outline: 3px solid #d19b2d; outline-offset: 2px; }
  .file { overflow-wrap: anywhere; }
  .warn { color: #7c5a12; font-weight: 750; }
  .bad { color: #a3302a; font-weight: 750; }
  .busy { opacity: 0.6; transition: opacity 150ms ease; }
  .more { margin: 0.8rem 0 0; font-size: 0.84rem; }
  @media (hover: hover) and (pointer: fine) {
    .name:hover { text-decoration: underline; }
    .toggle.on:hover { background: #17304f; }
    .chip button:hover { background: #fff; }
  }
  @media (max-width: 48rem) {
    .o-toolbar > label:not(.o-search) { flex: 1 1 100%; }
    .o-toolbar .o-select { width: 100%; }
    .toggle { flex: 1 1 100%; }
  }
  @media (prefers-reduced-motion: reduce) { .busy { transition: none; } }
</style>
