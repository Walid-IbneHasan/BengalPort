<script lang="ts" module>
  // A task about the customer, as their page receives it.
  export type CustomerTask = {
    id: string;
    title: string;
    notes: string | null;
    kind: "TASK" | "FOLLOW_UP" | "DEADLINE";
    status: "OPEN" | "DONE" | "CANCELLED";
    dueAt: string | null;
    assigneeId: string | null;
    customerId: string | null;
    dealId: string | null;
    assignee: { id: string; name: string } | null;
    createdByName: string | null;
  };
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { dateInput, day, daysFromToday, fromDateInput, officeMe, today } from "$lib/office";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import { Check, CheckSquare } from "lucide-svelte";

  // A customer's tasks and follow-ups, ticked off from here, and a short
  // form to plan the next follow-up. The person it is given to is told.
  let {
    customerId,
    tasks,
    canTick,
    canAdd,
    onchanged,
  }: { customerId: string; tasks: CustomerTask[]; canTick: boolean; canAdd: boolean; onchanged: () => Promise<void> | void } = $props();

  type Staff = { id: string; name: string };
  const KINDS: Record<CustomerTask["kind"], string> = { TASK: "Task", FOLLOW_UP: "Follow-up", DEADLINE: "Deadline" };

  let staff = $state<Staff[]>([]),
    title = $state(""),
    due = $state(daysFromToday(1)),
    assigneeId = $state(""),
    saving = $state(false),
    formProblem = $state(""),
    listProblem = $state(""),
    busyId = $state("");

  let choosesPerson = $derived($officeMe?.role !== "EMPLOYEE");
  const late = (task: CustomerTask) => task.status === "OPEN" && !!task.dueAt && dateInput(task.dueAt) < today();

  onMount(() => {
    if (canAdd && choosesPerson) api<Staff[]>("/office/staff").then((list) => (staff = list)).catch(() => (staff = []));
  });

  // Ticks a task off, or opens it again. The server wants the whole task back.
  async function toggle(task: CustomerTask) {
    busyId = task.id;
    listProblem = "";
    const status = task.status === "DONE" ? "OPEN" : "DONE";
    try {
      await api(`/office/tasks/${task.id}`, {
        method: "PUT",
        body: JSON.stringify({
          title: task.title,
          kind: task.kind,
          status,
          dueAt: task.dueAt,
          assigneeId: task.assigneeId ?? task.assignee?.id ?? null,
          customerId: task.customerId ?? customerId,
          dealId: task.dealId,
          notes: task.notes ?? "",
        }),
      });
      toasts.show(status === "DONE" ? `Done: ${task.title}` : `Opened again: ${task.title}`);
      await onchanged();
    } catch (e) {
      listProblem = problemText(e, "The task was not changed");
    } finally {
      busyId = "";
    }
  }

  async function add(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    formProblem = "";
    try {
      await api("/office/tasks", {
        method: "POST",
        body: JSON.stringify({ title, kind: "FOLLOW_UP", status: "OPEN", dueAt: fromDateInput(due), assigneeId: assigneeId || null, customerId }),
      });
      toasts.show("Follow-up added");
      title = "";
      due = daysFromToday(1);
      assigneeId = "";
      await onchanged();
    } catch (e) {
      formProblem = problemText(e, "The follow-up was not added");
    } finally {
      saving = false;
    }
  }
</script>

<div class="tasks">
  {#if canAdd}
    <form class="o-card o-form" onsubmit={add}>
      <h2 class="o-section-title">Add a follow-up</h2>
      <div class="o-fields">
        <label class="o-field wide"><span>What to follow up</span><input bind:value={title} required maxlength="200" placeholder="Ask for the bank statement" /></label>
        <label class="o-field"><span>Due date <small>(optional)</small></span><input type="date" bind:value={due} /></label>
        {#if choosesPerson}
          <label class="o-field">
            <span>Given to</span>
            <select bind:value={assigneeId}>
              <option value="">Me</option>
              {#each staff as person (person.id)}<option value={person.id}>{person.name}</option>{/each}
            </select>
          </label>
        {/if}
      </div>
      {#if formProblem}<p class="o-error" role="alert" use:intoView={formProblem}>{formProblem}</p>{/if}
      <div class="o-form-actions">
        <p class="o-muted note">They are reminded the day before it is due.</p>
        <button type="submit" class="o-btn navy" disabled={saving}>{saving ? "Adding…" : "Add follow-up"}</button>
      </div>
    </form>
  {/if}

  {#if listProblem}<p class="o-error" role="alert" use:intoView={listProblem}>{listProblem}</p>{/if}

  {#if !tasks.length}
    <div class="o-card o-empty">
      <CheckSquare size={28} />
      <h3>No tasks or follow-ups</h3>
      <p>{canAdd ? "Plan the next step with “Add a follow-up”." : "Tasks about this customer will show here."}</p>
    </div>
  {:else}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead><tr><th><span class="o-sr">Done</span></th><th>Task</th><th>Due</th><th>Given to</th><th>Status</th></tr></thead>
        <tbody>
          {#each tasks as task (task.id)}
            <tr class:done={task.status === "DONE"}>
              <td data-label="" class="tick">
                {#if canTick && task.status !== "CANCELLED"}
                  <button class="check" class:on={task.status === "DONE"} disabled={busyId === task.id} aria-label={task.status === "DONE" ? `Open “${task.title}” again` : `Mark “${task.title}” done`} onclick={() => toggle(task)}>
                    {#if task.status === "DONE"}<Check size={16} />{/if}
                  </button>
                {/if}
              </td>
              <td class="lead" data-label="Task">
                <b>{task.title}</b>
                <small>{KINDS[task.kind] ?? "Task"}{task.createdByName ? ` · added by ${task.createdByName}` : ""}</small>
                {#if task.notes}<small class="notes">{task.notes}</small>{/if}
              </td>
              <td data-label="Due"><span class:late={late(task)}>{task.dueAt ? day(task.dueAt) : "No date"}</span>{#if late(task)}<small class="late">Overdue</small>{/if}</td>
              <td data-label="Given to">{task.assignee?.name ?? "—"}</td>
              <td data-label="Status"><StatusPill status={task.status} /></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class="o-muted more">To change a task's details, open it on the <a class="o-link" href="/admin/tasks">Tasks</a> page.</p>
  {/if}
</div>

<style>
  .tasks { display: grid; gap: 1rem; }
  .tasks form h2 { margin-bottom: 0; }
  .note { flex: 1 1 14rem; margin: 0; align-self: center; font-size: 0.82rem; }
  .tick { width: 3rem; }
  .check { display: grid; place-items: center; width: 1.6rem; height: 1.6rem; padding: 0; border: 2px solid #b9c3cc; border-radius: 0.45rem; background: #fff; color: #fff; cursor: pointer; }
  .check::after { content: ""; position: absolute; inset: -0.6rem; }
  .check { position: relative; }
  .check.on { border-color: #17704b; background: #17704b; }
  .check:focus-visible { outline: 3px solid #d19b2d; outline-offset: 2px; }
  tr.done .lead b { color: #6a7686; text-decoration: line-through; text-decoration-color: #b9c3cc; }
  .notes { white-space: pre-line; }
  .late { color: #a3302a; font-weight: 750; }
  .more { margin: 0; font-size: 0.84rem; }
  @media (max-width: 48rem) {
    .tick { width: auto; }
    td.tick { justify-content: flex-start; }
  }
</style>
