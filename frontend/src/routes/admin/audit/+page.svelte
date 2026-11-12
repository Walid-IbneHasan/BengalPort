<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { ROLE_LABELS } from "$lib/office";
  import { History, Search } from "lucide-svelte";

  // Who did what and when: every change to customers, deals, invoices,
  // payments, accounts, documents, roles and settings, and every opening of
  // a private document. Nothing here can be changed or deleted.
  type Entry = {
    id: string;
    actorId: string | null;
    actorName: string | null;
    actorRole: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    summary: string;
    changes: Record<string, { from: unknown; to: unknown }> | null;
    ip: string | null;
    createdAt: string;
  };
  type Staff = { id: string; name: string };

  const TYPES: [string, string][] = [
    ["", "Everything"],
    ["customer", "Customers"],
    ["deal", "Deals"],
    ["invoice", "Invoices"],
    ["payment", "Payments"],
    ["journal", "Journal entries"],
    ["ledger-account", "Chart of accounts"],
    ["cashbook", "Hisab Kitab"],
    ["budget", "Budgets"],
    ["exchange-rate", "Exchange rates"],
    ["report", "Report exports"],
    ["document", "Documents"],
    ["user", "Staff and members"],
    ["role", "Roles and permissions"],
    ["branch", "Branches"],
    ["signature", "Signatures"],
    ["settings", "Settings"],
  ];
  const PAGE = 100;

  let rows = $state<Entry[]>([]),
    staff = $state<Staff[]>([]),
    loading = $state(true),
    problem = $state(""),
    search = $state(""),
    entityType = $state(""),
    actorId = $state(""),
    from = $state(""),
    to = $state(""),
    limit = $state(PAGE),
    open = $state<string | null>(null);
  let timer: ReturnType<typeof setTimeout>;

  async function load() {
    loading = true;
    problem = "";
    const query = new URLSearchParams({ limit: String(limit) });
    if (search.trim()) query.set("search", search.trim());
    if (entityType) query.set("entityType", entityType);
    if (actorId) query.set("actorId", actorId);
    if (from) query.set("from", from);
    if (to) query.set("to", to);
    try {
      rows = await api<Entry[]>(`/office/audit?${query}`);
    } catch (e) {
      rows = [];
      problem = problemText(e, "The audit log could not be loaded");
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    load();
    api<Staff[]>("/office/staff").then((list) => (staff = list)).catch(() => (staff = []));
  });

  function refilter() {
    limit = PAGE;
    load();
  }
  function searched() {
    clearTimeout(timer);
    timer = setTimeout(refilter, 300);
  }

  // "invoice.cancel" → "Cancelled", "document.download" → "Downloaded"…
  const VERBS: Record<string, string> = {
    create: "Added", update: "Changed", delete: "Deleted", issue: "Issued", revise: "Revised", cancel: "Cancelled", credit: "Credit note",
    share: "Shared", refund: "Refunded", allocate: "Applied", reverse: "Reversed", verify: "Checked", view: "Opened", download: "Downloaded",
    upload: "Uploaded", retire: "Retired", role: "Role changed", branch: "Branch changed", change: "Changed", approve: "Approved", reject: "Not approved",
    pay: "Paid", request: "Asked for approval", post: "Posted", transfer: "Transfer", link: "Linked", set: "Set", export: "Exported", recognize: "Revenue recognised", status: "Status changed", complete: "Completed", login: "Signed in",
  };
  const verb = (action: string) => {
    const last = action.split(".").pop() ?? action;
    return VERBS[last] ?? last.charAt(0).toUpperCase() + last.slice(1).replace(/[-_]/g, " ");
  };
  const kind = (type: string) => TYPES.find(([key]) => key === type)?.[1] ?? type;

  const link = (entry: Entry) => {
    if (!entry.entityId) return "";
    if (entry.entityType === "customer") return `/admin/customers/${entry.entityId}`;
    if (entry.entityType === "deal") return `/admin/deals/${entry.entityId}`;
    if (entry.entityType === "invoice") return `/admin/print/invoice/${entry.entityId}`;
    if (entry.entityType === "document") return "/admin/documents";
    if (entry.entityType === "journal") return "/admin/finance?tab=journal";
    return "";
  };

  const show = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "—";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    const text = String(value);
    return /^\d{4}-\d{2}-\d{2}T/.test(text) ? text.slice(0, 10) : text;
  };

  const stamp = (iso: string) =>
    new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
</script>

<svelte:head><title>Audit log — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office</span>
      <h1>Audit log</h1>
      <p>Who did what and when. Every change and every opening of a private document is kept here, and cannot be changed or deleted.</p>
    </div>
  </header>

  <section class="o-card filters" aria-label="Filters">
    <label class="o-search wide"><Search size={17} /><input bind:value={search} oninput={searched} placeholder="Search what happened or who did it" aria-label="Search the audit log" /></label>
    <label class="o-field"><span>About</span><select bind:value={entityType} onchange={refilter}>{#each TYPES as [value, label] (value)}<option {value}>{label}</option>{/each}</select></label>
    <label class="o-field"><span>Done by</span><select bind:value={actorId} onchange={refilter}><option value="">Anyone</option>{#each staff as person (person.id)}<option value={person.id}>{person.name}</option>{/each}</select></label>
    <label class="o-field"><span>From</span><input type="date" bind:value={from} max={to || undefined} onchange={refilter} /></label>
    <label class="o-field"><span>To</span><input type="date" bind:value={to} min={from || undefined} onchange={refilter} /></label>
  </section>

  {#if problem}<p class="o-error" role="alert">{problem}</p>{/if}

  {#if loading && !rows.length}
    <p class="o-loading">Loading the audit log…</p>
  {:else if !rows.length}
    <div class="o-card o-empty"><History size={28} /><h3>Nothing recorded for these filters</h3><p>Try a wider date range or “Everything”.</p></div>
  {:else}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead><tr><th>When</th><th>Who</th><th>What happened</th><th>Details</th></tr></thead>
        <tbody>
          {#each rows as entry (entry.id)}
            <tr>
              <td data-label="When" class="when">{stamp(entry.createdAt)}</td>
              <td data-label="Who"><b>{entry.actorName ?? "The system"}</b>{#if entry.actorRole}<small>{ROLE_LABELS[entry.actorRole] ?? entry.actorRole}</small>{/if}</td>
              <td class="lead" data-label="What happened">
                <span class="tag">{kind(entry.entityType)} · {verb(entry.action)}</span>
                {#if link(entry)}<a class="o-link summary" href={link(entry)}>{entry.summary}</a>{:else}<span class="summary">{entry.summary}</span>{/if}
              </td>
              <td data-label="Details">
                {#if entry.changes && Object.keys(entry.changes).length}
                  <button class="o-btn ghost small" aria-expanded={open === entry.id} onclick={() => (open = open === entry.id ? null : entry.id)}>{open === entry.id ? "Hide changes" : `${Object.keys(entry.changes).length} change${Object.keys(entry.changes).length === 1 ? "" : "s"}`}</button>
                  {#if open === entry.id}
                    <dl class="changes">
                      {#each Object.entries(entry.changes) as [field, change] (field)}
                        <div><dt>{field}</dt><dd><s>{show(change?.from)}</s> → <b>{show(change?.to)}</b></dd></div>
                      {/each}
                    </dl>
                  {/if}
                {:else}<span class="o-muted">—</span>{/if}
                {#if entry.ip}<small class="ip">From {entry.ip}</small>{/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if rows.length >= limit}
      <div class="more"><button class="o-btn ghost" disabled={loading} onclick={() => { limit += PAGE; load(); }}>{loading ? "Loading…" : "Show older entries"}</button></div>
    {/if}
  {/if}
</div>

<style>
  .filters { display: grid; grid-template-columns: minmax(14rem, 2fr) repeat(4, minmax(8rem, 1fr)); align-items: end; gap: 0.7rem; margin-bottom: 1rem; }
  .filters .o-search { min-height: 2.75rem; }
  .when { white-space: nowrap; color: #48576b; }
  .tag { display: block; font-size: 0.7rem; font-weight: 800; letter-spacing: 0.06em; text-transform: uppercase; color: #a87618; }
  .summary { display: block; margin-top: 0.15rem; overflow-wrap: anywhere; }
  .changes { display: grid; gap: 0.3rem; margin: 0.5rem 0 0; font-size: 0.8rem; }
  .changes div { display: grid; gap: 0.1rem; }
  .changes dt { color: #6a7686; font-weight: 700; }
  .changes dd { margin: 0; overflow-wrap: anywhere; }
  .changes s { color: #8a95a3; }
  .ip { display: block; margin-top: 0.35rem; color: #8a95a3; font-size: 0.74rem; }
  .more { display: flex; justify-content: center; margin-top: 1rem; }
  @media (max-width: 64rem) { .filters { grid-template-columns: repeat(2, minmax(0, 1fr)); } .filters .wide { grid-column: 1 / -1; } }
  @media (max-width: 48rem) {
    .changes { text-align: left; }
    td[data-label="Details"] { flex-wrap: wrap; }
  }
</style>
