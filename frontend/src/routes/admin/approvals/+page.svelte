<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { confirmAction } from "$lib/confirm";
  import { toasts } from "$lib/toast";
  import { day, officePermissions } from "$lib/office";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import { Check, Inbox, X } from "lucide-svelte";

  // Actions that need a second person: cancelling an invoice, a credit
  // note, a refund, reversing a journal entry. Whoever asked can never
  // approve their own request. Staff without the approvals permission see
  // only the requests they made.
  type Approval = {
    id: string;
    kind: string;
    label: string;
    entityType: string;
    entityId: string;
    summary: string;
    payload: Record<string, unknown> | null;
    status: "PENDING" | "APPROVED" | "REJECTED";
    requestedById: string;
    requestedByName: string;
    decidedByName: string | null;
    decisionNote: string | null;
    createdAt: string;
    decidedAt: string | null;
    canDecide: boolean;
  };

  const VIEWS = [
    { key: "PENDING", label: "Waiting" },
    { key: "APPROVED", label: "Approved" },
    { key: "REJECTED", label: "Not approved" },
    { key: "", label: "All" },
  ] as const;

  let view = $state<string>("PENDING"),
    rows = $state<Approval[]>([]),
    loading = $state(true),
    problem = $state(""),
    notes = $state<Record<string, string>>({}),
    busy = $state(""),
    rowProblem = $state<Record<string, string>>({});

  let seesAll = $derived($officePermissions.has("approvals.read"));

  async function load() {
    loading = true;
    problem = "";
    try {
      rows = await api<Approval[]>(`/office/approvals${view ? `?status=${view}` : ""}`);
    } catch (e) {
      rows = [];
      problem = problemText(e, "The requests could not be loaded");
    } finally {
      loading = false;
    }
  }
  onMount(load);

  // Where the thing the request is about can be seen.
  const link = (row: Approval) =>
    row.entityType === "invoice" ? `/admin/print/invoice/${row.entityId}` : row.entityType === "payment" ? "/admin/collections" : row.entityType === "journal" ? "/admin/finance?tab=journal" : "";
  const linkLabel = (row: Approval) => (row.entityType === "invoice" ? "Open the invoice" : row.entityType === "payment" ? "Open collections" : "Open the journal");

  async function decide(row: Approval, approve: boolean) {
    const note = (notes[row.id] ?? "").trim();
    if (
      approve &&
      !(await confirmAction({
        title: `Approve: ${row.label.toLowerCase()}?`,
        message: `${row.summary.replace(/\.$/, "")}. This is done straight away and recorded under your name. It cannot be undone; a mistake has to be corrected with a new entry.`,
        confirmLabel: "Approve",
        tone: "default",
      }))
    )
      return;
    busy = row.id;
    rowProblem = { ...rowProblem, [row.id]: "" };
    try {
      await api(`/office/approvals/${row.id}/decide`, { method: "POST", body: JSON.stringify({ approve, note: note || null }) });
      toasts.show(approve ? "Approved and done" : "Marked as not approved", { detail: `${row.requestedByName} is told.` });
      await load();
    } catch (e) {
      rowProblem = { ...rowProblem, [row.id]: problemText(e, "The decision was not saved") };
    } finally {
      busy = "";
    }
  }
</script>

<svelte:head><title>Approvals — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office</span>
      <h1>Approvals</h1>
      <p>{seesAll ? "Cancellations, credit notes, refunds and journal reversals asked for by staff. A second person decides; nobody approves their own request." : "Requests you made that need a second person's approval."}</p>
    </div>
  </header>

  <nav class="o-tabs" aria-label="Which requests">
    {#each VIEWS as item (item.key)}
      <button class:active={view === item.key} aria-pressed={view === item.key} onclick={() => { view = item.key; load(); }}>{item.label}</button>
    {/each}
  </nav>

  {#if problem}<p class="o-error" role="alert">{problem}</p>{/if}

  {#if loading}
    <p class="o-loading">Loading requests…</p>
  {:else if !rows.length}
    <div class="o-card o-empty">
      <Inbox size={28} />
      <h3>{view === "PENDING" ? "Nothing is waiting" : "No requests here"}</h3>
      <p>When someone asks to cancel an invoice, refund a payment or reverse an entry, it shows here.</p>
    </div>
  {:else}
    <ul class="requests">
      {#each rows as row (row.id)}
        <li class="o-card">
          <div class="top">
            <div>
              <span class="kind">{row.label}</span>
              <h2>{row.summary}</h2>
              <p class="o-muted">Asked by <b>{row.requestedByName}</b> on {day(row.createdAt)}{#if link(row)} · <a class="o-link" href={link(row)}>{linkLabel(row)}</a>{/if}</p>
            </div>
            <StatusPill status={row.status} label={row.status === "PENDING" ? "Waiting" : row.status === "REJECTED" ? "Not approved" : "Approved"} />
          </div>
          {#if row.status !== "PENDING"}
            <p class="decided">{row.status === "APPROVED" ? "Approved" : "Not approved"} by <b>{row.decidedByName}</b>{row.decidedAt ? ` on ${day(row.decidedAt)}` : ""}{row.decisionNote ? `: “${row.decisionNote}”` : "."}</p>
          {:else if row.canDecide}
            <div class="decide">
              <label class="o-field"><span>Note for {row.requestedByName} <small>(optional)</small></span><input bind:value={notes[row.id]} maxlength="500" placeholder="Why, or what to do instead" /></label>
              {#if rowProblem[row.id]}<p class="o-error" role="alert" use:intoView={rowProblem[row.id]}>{rowProblem[row.id]}</p>{/if}
              <div class="o-form-actions">
                <button class="o-btn danger" disabled={busy === row.id} onclick={() => decide(row, false)}><X size={16} /> Don't approve</button>
                <button class="o-btn navy" disabled={busy === row.id} onclick={() => decide(row, true)}><Check size={16} /> {busy === row.id ? "Working…" : "Approve"}</button>
              </div>
            </div>
          {:else if row.status === "PENDING"}
            <p class="o-muted wait">{seesAll ? "Someone else with the approval permission has to decide this one." : "Waiting for someone with the approval permission."}</p>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .requests { display: grid; gap: 0.8rem; margin: 0; padding: 0; list-style: none; }
  .requests .o-card + .o-card { margin-top: 0; }
  .top { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .top > div { min-width: 0; }
  .kind { font-size: 0.72rem; font-weight: 800; letter-spacing: 0.08em; text-transform: uppercase; color: #a87618; }
  h2 { margin: 0.25rem 0 0.35rem; font-size: 1rem; line-height: 1.4; color: #07182f; overflow-wrap: anywhere; }
  .top p { margin: 0; font-size: 0.84rem; }
  .decided { margin: 0.8rem 0 0; padding-top: 0.7rem; border-top: 1px solid #edf0f2; font-size: 0.86rem; color: #405066; }
  .decide { display: grid; gap: 0.7rem; margin-top: 0.9rem; padding-top: 0.9rem; border-top: 1px solid #edf0f2; }
  .wait { margin: 0.8rem 0 0; font-size: 0.84rem; }
  @media (max-width: 40rem) { .top { flex-direction: column-reverse; gap: 0.5rem; } }
</style>
