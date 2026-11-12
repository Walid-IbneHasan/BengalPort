<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { confirmAction } from "$lib/confirm";
  import { toasts } from "$lib/toast";
  import { customerNumber, dateInput, day, dealNumberText, fromDateInput, officeMe, officePermissions, today } from "$lib/office";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import OfficeCustomerPicker, { type PickedCustomer } from "$lib/components/OfficeCustomerPicker.svelte";
  import { Check, CheckSquare, Pencil, Plus, RotateCcw, Trash2 } from "lucide-svelte";

  // Tasks, follow-ups and deadlines: what each member of staff has to do and
  // by when. Employees see their own; managers and the Super Admin see all.
  type Task = {
    id: string;
    title: string;
    notes: string | null;
    kind: "TASK" | "FOLLOW_UP" | "DEADLINE";
    status: "OPEN" | "DONE" | "CANCELLED";
    dueAt: string | null;
    assignee: { id: string; name: string } | null;
    customer: { id: string; name: string; code: number } | null;
    deal: { id: string; number: number; title: string } | null;
    createdByName: string | null;
    completedAt: string | null;
  };
  type Staff = { id: string; name: string; role: string };
  type Draft = { id?: string; title: string; kind: Task["kind"]; status: Task["status"]; dueAt: string; assigneeId: string; customer: PickedCustomer | null; dealId: string | null; notes: string };

  const KINDS: Record<Task["kind"], string> = { TASK: "Task", FOLLOW_UP: "Follow-up", DEADLINE: "Deadline" };
  const VIEWS = [
    { key: "mine", label: "Mine", query: "scope=mine&status=OPEN" },
    { key: "open", label: "Everyone's open", query: "status=OPEN" },
    { key: "overdue", label: "Overdue", query: "due=overdue" },
    { key: "done", label: "Done", query: "status=DONE" },
  ] as const;

  let view = $state<(typeof VIEWS)[number]["key"]>("mine"),
    rows = $state<Task[]>([]),
    staff = $state<Staff[]>([]),
    loading = $state(true),
    problem = $state(""),
    draft = $state<Draft | null>(null),
    saving = $state(false),
    formProblem = $state(""),
    busyId = $state("");

  const may = (permission: string) => $officePermissions.has(permission);
  // An employee only ever has their own tasks, so "everyone's" means nothing to them.
  let views = $derived(VIEWS.filter((item) => item.key !== "open" || $officeMe?.role !== "EMPLOYEE"));
  const overdue = (task: Task) => task.status === "OPEN" && !!task.dueAt && dateInput(task.dueAt) < today();

  async function load() {
    loading = true;
    problem = "";
    try {
      rows = await api<Task[]>(`/office/tasks?${VIEWS.find((item) => item.key === view)!.query}`);
    } catch (e) {
      rows = [];
      problem = problemText(e, "The tasks could not be loaded");
    } finally {
      loading = false;
    }
  }

  onMount(() => {
    // Those who look after everyone's work start with everyone's open tasks.
    if ($officeMe && $officeMe.role !== "EMPLOYEE") view = "open";
    load();
    api<Staff[]>("/office/staff").then((list) => (staff = list)).catch(() => (staff = []));
  });

  function choose(next: typeof view) {
    view = next;
    load();
  }

  const blank = (): Draft => ({ title: "", kind: "TASK", status: "OPEN", dueAt: "", assigneeId: "", customer: null, dealId: null, notes: "" });

  function edit(task: Task) {
    formProblem = "";
    draft = {
      id: task.id,
      title: task.title,
      kind: task.kind,
      status: task.status,
      dueAt: dateInput(task.dueAt),
      assigneeId: task.assignee?.id ?? "",
      customer: task.customer ? { id: task.customer.id, name: task.customer.name, customerCode: customerNumber(task.customer.code) } : null,
      dealId: task.deal?.id ?? null,
      notes: task.notes ?? "",
    };
  }

  const body = (form: Draft) =>
    JSON.stringify({
      title: form.title,
      kind: form.kind,
      status: form.status,
      dueAt: fromDateInput(form.dueAt),
      assigneeId: form.assigneeId || null,
      customerId: form.customer?.id ?? null,
      dealId: form.dealId,
      notes: form.notes,
    });

  async function save(event: SubmitEvent) {
    event.preventDefault();
    if (!draft) return;
    saving = true;
    formProblem = "";
    try {
      if (draft.id) await api(`/office/tasks/${draft.id}`, { method: "PUT", body: body(draft) });
      else await api("/office/tasks", { method: "POST", body: body(draft) });
      toasts.show(draft.id ? "Task saved" : "Task added");
      draft = null;
      await load();
    } catch (e) {
      formProblem = problemText(e, "The task was not saved");
    } finally {
      saving = false;
    }
  }

  // Ticks a task off, or opens it again.
  async function toggle(task: Task) {
    busyId = task.id;
    problem = "";
    try {
      const next = { ...task, status: task.status === "DONE" ? "OPEN" : "DONE" } as Task;
      await api(`/office/tasks/${task.id}`, {
        method: "PUT",
        body: body({ title: next.title, kind: next.kind, status: next.status, dueAt: dateInput(next.dueAt), assigneeId: next.assignee?.id ?? "", customer: next.customer ? { id: next.customer.id, name: next.customer.name, customerCode: "" } : null, dealId: next.deal?.id ?? null, notes: next.notes ?? "" }),
      });
      toasts.show(next.status === "DONE" ? `Done: ${task.title}` : `Opened again: ${task.title}`);
      await load();
    } catch (e) {
      problem = problemText(e, "The task was not changed");
    } finally {
      busyId = "";
    }
  }

  async function remove(task: Task) {
    if (!(await confirmAction({ title: `Delete “${task.title}”?`, message: "The task is removed for everyone. This cannot be undone." }))) return;
    try {
      await api(`/office/tasks/${task.id}`, { method: "DELETE" });
      toasts.show("Task deleted");
      draft = null;
      await load();
    } catch (e) {
      formProblem = problem = problemText(e, "The task was not deleted");
    }
  }
</script>

<svelte:head><title>Tasks — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office</span>
      <h1>Tasks and follow-ups</h1>
      <p>What needs doing, by whom and by when. Reminders go out the day before something is due.</p>
    </div>
    {#if may("tasks.create")}
      <div class="o-actions"><button class="o-btn" onclick={() => { formProblem = ""; draft = blank(); }}><Plus size={18} /> New task</button></div>
    {/if}
  </header>

  <nav class="o-tabs" aria-label="Which tasks">
    {#each views as item (item.key)}
      <button class:active={view === item.key} aria-pressed={view === item.key} onclick={() => choose(item.key)}>{item.label}</button>
    {/each}
  </nav>

  {#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}

  {#if loading}
    <p class="o-loading">Loading tasks…</p>
  {:else if !rows.length}
    <div class="o-card o-empty">
      <CheckSquare size={28} />
      <h3>{view === "overdue" ? "Nothing is overdue" : view === "done" ? "Nothing ticked off yet" : "No open tasks"}</h3>
      <p>{may("tasks.create") ? "Add one with “New task”, or from a customer's page." : "Tasks given to you will show here."}</p>
    </div>
  {:else}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead><tr><th><span class="o-sr">Done</span></th><th>Task</th><th>Due</th><th>Given to</th><th>About</th><th>Status</th><th><span class="o-sr">Actions</span></th></tr></thead>
        <tbody>
          {#each rows as task (task.id)}
            <tr class:done={task.status === "DONE"}>
              <td data-label="" class="tick">
                {#if may("tasks.update")}
                  <button class="check" class:on={task.status === "DONE"} disabled={busyId === task.id} aria-label={task.status === "DONE" ? `Open “${task.title}” again` : `Mark “${task.title}” done`} onclick={() => toggle(task)}>
                    {#if task.status === "DONE"}<Check size={16} />{/if}
                  </button>
                {/if}
              </td>
              <td class="lead" data-label="Task">
                <b>{task.title}</b>
                <small>{KINDS[task.kind]}{task.createdByName ? ` · added by ${task.createdByName}` : ""}</small>
                {#if task.notes}<small class="notes">{task.notes}</small>{/if}
              </td>
              <td data-label="Due"><span class:late={overdue(task)}>{task.dueAt ? day(task.dueAt) : "No date"}</span>{#if overdue(task)}<small class="late">Overdue</small>{/if}</td>
              <td data-label="Given to">{task.assignee?.name ?? "—"}</td>
              <td data-label="About">
                {#if task.customer}<a class="o-link" href={`/admin/customers/${task.customer.id}`}>{task.customer.name}</a>{/if}
                {#if task.deal}<small><a class="o-link" href={`/admin/deals/${task.deal.id}`}>{dealNumberText(task.deal.number)} {task.deal.title}</a></small>{/if}
                {#if !task.customer && !task.deal}—{/if}
              </td>
              <td data-label="Status"><StatusPill status={task.status} /></td>
              <td data-label="" class="row-actions">
                {#if may("tasks.update")}<button class="o-btn ghost small" onclick={() => edit(task)} aria-label={`Edit “${task.title}”`}><Pencil size={15} /> Edit</button>{/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>

{#if draft}
  <OfficeSheet title={draft.id ? "Edit task" : "New task"} subtitle={draft.id ? "" : "The person it is given to is told straight away."} onclose={() => (draft = null)}>
    <form id="task-form" class="o-form" onsubmit={save}>
      <div class="o-fields">
        <label class="o-field wide"><span>What needs doing</span><input bind:value={draft.title} required maxlength="200" placeholder="Call back about the visa documents" /></label>
        <label class="o-field">
          <span>Kind</span>
          <select bind:value={draft.kind}>
            {#each Object.entries(KINDS) as [value, label] (value)}<option {value}>{label}</option>{/each}
          </select>
        </label>
        <label class="o-field"><span>Due date <small>(optional)</small></span><input type="date" bind:value={draft.dueAt} /></label>
        {#if $officeMe?.role !== "EMPLOYEE"}
          <label class="o-field">
            <span>Given to</span>
            <select bind:value={draft.assigneeId}>
              <option value="">Me</option>
              {#each staff as person (person.id)}<option value={person.id}>{person.name}</option>{/each}
            </select>
          </label>
        {/if}
        {#if draft.id}
          <label class="o-field">
            <span>Status</span>
            <select bind:value={draft.status}><option value="OPEN">Open</option><option value="DONE">Done</option><option value="CANCELLED">Cancelled</option></select>
          </label>
        {/if}
        <div class="wide"><OfficeCustomerPicker bind:customer={draft.customer} label="Customer (optional)" /></div>
        <label class="o-field wide"><span>Notes <small>(optional)</small></span><textarea bind:value={draft.notes} maxlength="2000"></textarea></label>
      </div>
    </form>
    {#snippet footer()}
      {#if formProblem}<p class="o-error wide-error" role="alert" use:intoView={formProblem}>{formProblem}</p>{/if}
      {#if draft?.id && may("tasks.delete")}
        <button type="button" class="o-btn danger" onclick={() => draft && remove(rows.find((row) => row.id === draft?.id)!)}><Trash2 size={16} /> Delete</button>
      {/if}
      <button type="button" class="o-btn ghost" onclick={() => (draft = null)}>Cancel</button>
      <button type="submit" form="task-form" class="o-btn navy" disabled={saving}>{saving ? "Saving…" : draft?.id ? "Save task" : "Add task"}</button>
    {/snippet}
  </OfficeSheet>
{/if}

<style>
  .tick { width: 3rem; }
  .check { display: grid; place-items: center; width: 1.6rem; height: 1.6rem; padding: 0; border: 2px solid #b9c3cc; border-radius: 0.45rem; background: #fff; color: #fff; cursor: pointer; }
  .check.on { border-color: #17704b; background: #17704b; }
  .check:focus-visible { outline: 3px solid #d19b2d; outline-offset: 2px; }
  tr.done .lead b { color: #6a7686; text-decoration: line-through; text-decoration-color: #b9c3cc; }
  .notes { white-space: pre-line; }
  .late { color: #a3302a; font-weight: 750; }
  .row-actions { text-align: right; white-space: nowrap; }
  .wide-error { flex: 1 1 100%; }
  @media (max-width: 48rem) {
    .tick { width: auto; }
    td.tick { justify-content: flex-start; }
    .row-actions { justify-content: flex-end; }
  }
</style>
