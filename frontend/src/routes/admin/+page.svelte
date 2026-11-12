<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { dateInput, day, money, officeMe, officePermissions, ROLE_LABELS, today } from "$lib/office";
  import { defaultGroup, greeting, presetRange, rangeLabel, type Preset, type Range } from "$lib/dashboard-range";
  import IncomeChart from "$lib/components/IncomeChart.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import { ArrowRight, CalendarClock, CheckSquare, Handshake, Inbox, Medal, RefreshCw, UsersRound } from "lucide-svelte";

  // The CEO dashboard: the company at a glance for a period and a branch.
  // Money figures come from the accounts, so an invoice counts as revenue
  // only once the work is done, and nothing is counted twice. Staff without
  // the money permission see the work figures only.
  type Point = { period: string; income: number; expense: number; net: number };
  type Person = { id: string; name: string; role: string; customers: number; activeDeals: number; dealsCompleted: number; tasksDone: number; tasksOpen: number; overdue: number; contacts: number; score: number };
  type Dashboard = {
    range: { from: string; to: string; branchId: string | null; group: "day" | "week" | "month" };
    totalClients: number;
    newClients: number;
    activeDeals: number;
    pendingApprovals: number;
    openTasks: number;
    overdueTasks: number;
    money: null | {
      revenue: number;
      otherIncome: number;
      expense: number;
      netProfit: number;
      pendingDue: number;
      invoiceDue: number;
      applicationDue: number;
      advanceReceived: number;
      deferredRevenue: number;
      activeDealValue: number;
      series: Point[];
      branches: { id: string; name: string; income: number; expense: number; net: number; customers: number; activeDeals: number }[];
      recent: { id: string; reference: string; date: string; memo: string; amount: number; status: string }[];
    };
    performance: Person[];
    topPerformers: Person[];
    pendingTasks: { id: string; title: string; kind: string; dueAt: string | null; assignee: { name: string } | null; customer: { id: string; customerCode: string; name: string } | null }[];
    deadlines: { id: string; dealNumber: string; title: string; endDate: string; customer: { name: string } | null }[];
  };
  type Branch = { id: string; name: string };
  type Website = { newEnquiries: number; activeApplications: number };

  const PRESETS: { key: Preset; label: string }[] = [
    { key: "today", label: "Today" },
    { key: "week", label: "This week" },
    { key: "month", label: "This month" },
    { key: "last-month", label: "Last month" },
    { key: "year", label: "This year" },
    { key: "custom", label: "Choose dates" },
  ];

  let preset = $state<Preset>("month"),
    range = $state<Range>(presetRange("month")),
    group = $state<"day" | "week" | "month">("day"),
    branchId = $state(""),
    branches = $state<Branch[]>([]),
    data = $state<Dashboard | null>(null),
    website = $state<Website | null>(null),
    loading = $state(true),
    problem = $state("");
  let asked = 0;

  const may = (permission: string) => $officePermissions.has(permission);
  // Staff tied to one branch always see their own branch.
  let branchBound = $derived(!!$officeMe && $officeMe.role !== "ADMIN" && !!$officeMe.branchId && !$officeMe.allBranches);
  let firstName = $derived(($officeMe?.name ?? "").trim().split(/\s+/)[0] || "");
  let range7 = $derived(dateInput(new Date(Date.now() + 7 * 86_400_000)));

  async function load() {
    const ask = ++asked;
    loading = true;
    problem = "";
    const query = new URLSearchParams({ from: range.from, to: range.to, group });
    if (branchId) query.set("branchId", branchId);
    try {
      const result = await api<Dashboard>(`/office/dashboard?${query}`);
      if (ask === asked) data = result;
    } catch (e) {
      if (ask === asked) problem = problemText(e, "The dashboard could not be loaded");
    } finally {
      if (ask === asked) loading = false;
    }
  }

  onMount(() => {
    group = defaultGroup(range);
    load();
    api<Branch[]>("/office/branches").then((list) => (branches = list)).catch(() => (branches = []));
    // The website's own figures, for those who look after it.
    if (may("finance.read") && (may("enquiries.read") || may("applications.read")))
      api<Website>("/admin/dashboard").then((figures) => (website = figures)).catch(() => (website = null));
  });

  function choosePreset(next: Preset) {
    preset = next;
    if (next !== "custom") {
      range = presetRange(next);
      group = defaultGroup(range);
      load();
    }
  }

  function chooseDates() {
    if (!range.from || !range.to) return;
    if (range.from > range.to) range = { from: range.to, to: range.from };
    group = defaultGroup(range);
    load();
  }

  // Income and expense recorded without a branch, so the branch rows add up.
  let unassigned = $derived.by(() => {
    const m = data?.money;
    if (!m || m.branches.length < 2) return null;
    const income = m.revenue + m.otherIncome - m.branches.reduce((sum, row) => sum + row.income, 0);
    const expense = m.expense - m.branches.reduce((sum, row) => sum + row.expense, 0);
    return { income: Math.round(income * 100) / 100, expense: Math.round(expense * 100) / 100 };
  });
  const late = (iso: string | null) => !!iso && dateInput(iso) < today();
  const soon = (iso: string | null) => !!iso && dateInput(iso) <= range7;
  const KIND: Record<string, string> = { TASK: "Task", FOLLOW_UP: "Follow-up", DEADLINE: "Deadline" };
</script>

<svelte:head><title>Dashboard — Bengal Port Admin</title></svelte:head>

<div class="o-page dash">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office · Dashboard</span>
      <h1>{greeting()}{firstName ? `, ${firstName}` : ""}.</h1>
      <p>Bengal Port at a glance for <b>{rangeLabel(range)}</b>{data?.range.branchId ? ` · ${branches.find((b) => b.id === data?.range.branchId)?.name ?? "one branch"}` : branches.length > 1 ? " · all branches" : ""}.</p>
    </div>
    <div class="o-actions">
      {#if may("customers.create")}<a class="o-btn ghost" href="/admin/customers?new=1"><UsersRound size={17} /> New customer</a>{/if}
      {#if may("payments.create")}<a class="o-btn" href="/admin/collections?new=1">Record payment</a>{/if}
    </div>
  </header>

  <section class="filters o-card" aria-label="Period and branch">
    <div class="o-tabs presets" role="group" aria-label="Period">
      {#each PRESETS as item (item.key)}
        <button type="button" class:active={preset === item.key} aria-pressed={preset === item.key} onclick={() => choosePreset(item.key)}>{item.label}</button>
      {/each}
    </div>
    <div class="controls">
      {#if preset === "custom"}
        <label class="o-field"><span>From</span><input type="date" bind:value={range.from} max={range.to || undefined} onchange={chooseDates} /></label>
        <label class="o-field"><span>To</span><input type="date" bind:value={range.to} min={range.from || undefined} onchange={chooseDates} /></label>
      {/if}
      {#if branches.length > 1 && !branchBound}
        <label class="o-field">
          <span>Branch</span>
          <select bind:value={branchId} onchange={load}>
            <option value="">All branches</option>
            {#each branches as branch (branch.id)}<option value={branch.id}>{branch.name}</option>{/each}
          </select>
        </label>
      {/if}
      <button type="button" class="o-btn ghost small refresh" onclick={load} disabled={loading} aria-label="Refresh the figures"><RefreshCw size={15} /> {loading ? "Loading…" : "Refresh"}</button>
    </div>
  </section>

  {#if problem}<p class="o-error" role="alert">{problem}</p>{/if}

  {#if !data && loading}
    <p class="o-loading">Loading the dashboard…</p>
  {:else if data}
    {#if data.money}
      {@const m = data.money}
      <section class="o-stats money" aria-label="Money" aria-busy={loading}>
        <div class="o-stat"><span>Revenue earned</span><b>{money(m.revenue)}</b><small>Work completed in the period{m.otherIncome ? ` · ${money(m.otherIncome)} exchange gain` : ""}</small></div>
        <div class="o-stat"><span>Expenses</span><b>{money(m.expense)}</b><small>Recorded in the period</small></div>
        <div class="o-stat dark"><span>Net profit</span><b>{money(m.netProfit)}</b><small>Revenue less expenses{m.netProfit < 0 ? ": a loss" : ""}</small></div>
        <div class="o-stat"><span>Still to collect</span><b>{money(m.pendingDue)}</b><small>{money(m.invoiceDue)} on invoices · {money(m.applicationDue)} on applications</small></div>
        <div class="o-stat"><span>Advances held</span><b>{money(m.advanceReceived)}</b><small>Paid ahead, owed back until the work is done</small></div>
        <div class="o-stat"><span>Invoiced, not yet earned</span><b>{money(m.deferredRevenue)}</b><small>Becomes revenue when the deal is completed</small></div>
      </section>
    {/if}

    <section class="o-stats work" aria-label="Work">
      <a class="o-stat link" href="/admin/customers"><span><UsersRound size={15} /> Clients</span><b>{data.totalClients}</b><small>{data.newClients} new in the period</small></a>
      <a class="o-stat link" href="/admin/deals"><span><Handshake size={15} /> Active deals</span><b>{data.activeDeals}</b><small>{data.money ? `Worth ${money(data.money.activeDealValue)}` : "Being worked on"}</small></a>
      <a class="o-stat link" class:alert={data.pendingApprovals > 0} href="/admin/approvals"><span><Inbox size={15} /> Waiting for approval</span><b>{data.pendingApprovals}</b><small>{data.pendingApprovals ? "Cancellations, refunds and the like" : "Nothing waiting"}</small></a>
      <a class="o-stat link" class:alert={data.overdueTasks > 0} href="/admin/tasks"><span><CheckSquare size={15} /> Open tasks</span><b>{data.openTasks}</b><small>{data.overdueTasks ? `${data.overdueTasks} overdue` : "None overdue"}</small></a>
      {#if website}
        <a class="o-stat link" href="/admin/enquiries"><span>New website enquiries</span><b>{website.newEnquiries}</b><small>Not answered yet</small></a>
        <a class="o-stat link" href="/admin/applications"><span>Applications in review</span><b>{website.activeApplications}</b><small>From the website</small></a>
      {/if}
    </section>

    {#if data.money}
      <section class="o-card">
        <div class="card-head">
          <div><h2>Income and expense</h2><p class="o-muted">Day by day, week by week or month by month.</p></div>
          <div class="o-tabs mini" role="group" aria-label="Group by">
            {#each [["day", "Daily"], ["week", "Weekly"], ["month", "Monthly"]] as [key, label] (key)}
              <button type="button" class:active={group === key} aria-pressed={group === key} onclick={() => { group = key as typeof group; load(); }}>{label}</button>
            {/each}
          </div>
        </div>
        {#if data.money.series.length}
          <IncomeChart series={data.money.series} group={data.range.group} />
        {:else}
          <p class="o-empty">No income or expense was recorded in this period.</p>
        {/if}
      </section>

        {#if data.money.branches.length > 1}
          <section class="o-card spaced">
            <h2>By branch</h2>
            <div class="o-table-wrap flat">
              <table class="o-table team">
                <thead><tr><th>Branch</th><th class="num">Income</th><th class="num">Expense</th><th class="num">Net</th><th class="num">Clients</th><th class="num">Active deals</th></tr></thead>
                <tbody>
                  {#each data.money.branches as row (row.id)}
                    <tr>
                      <td class="lead" data-label="Branch"><b>{row.name}</b></td>
                      <td class="num" data-label="Income">{money(row.income)}</td>
                      <td class="num" data-label="Expense">{money(row.expense)}</td>
                      <td class="num" data-label="Net"><b class:loss={row.net < 0}>{money(row.net)}</b></td>
                      <td class="num" data-label="Clients">{row.customers}</td>
                      <td class="num" data-label="Active deals">{row.activeDeals}</td>
                    </tr>
                  {/each}
                  {#if unassigned && (unassigned.income || unassigned.expense)}
                    <tr>
                      <td class="lead" data-label="Branch"><b>No branch</b><small>Entries not given a branch</small></td>
                      <td class="num" data-label="Income">{money(unassigned.income)}</td>
                      <td class="num" data-label="Expense">{money(unassigned.expense)}</td>
                      <td class="num" data-label="Net"><b class:loss={unassigned.income - unassigned.expense < 0}>{money(unassigned.income - unassigned.expense)}</b></td>
                      <td class="num" data-label="Clients">—</td>
                      <td class="num" data-label="Active deals">—</td>
                    </tr>
                  {/if}
                </tbody>
              </table>
            </div>
          </section>
        {/if}
      <div class="o-grid-2 pair">
        <section class="o-card">
          <div class="card-head"><h2>Recent transactions</h2>{#if may("accounts.read")}<a class="o-link" href="/admin/finance?tab=journal">Journal <ArrowRight size={14} /></a>{/if}</div>
          {#if data.money.recent.length}
            <ul class="list">
              {#each data.money.recent as entry (entry.id)}
                <li>
                  <div><b>{entry.memo || "Entry"}</b><small>{entry.reference} · {day(entry.date)}</small></div>
                  <span class="figure">{money(entry.amount)}{#if entry.status === "REVERSED"}<StatusPill status="REVERSED" />{/if}</span>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="o-empty">Nothing recorded yet.</p>
          {/if}
        </section>
        <div class="stack">
          {@render taskCard(data)}
          {@render deadlineCard(data)}
        </div>
      </div>
    {:else}
      <div class="o-grid-2 pair">
        {@render taskCard(data)}
        {@render deadlineCard(data)}
      </div>
    {/if}

    {#if data.performance.length}
      <section class="o-card">
        <div class="card-head">
          <div><h2>How the team is doing</h2><p class="o-muted">For {rangeLabel(range)}. Completed deals count most, then finished tasks and customer contacts; overdue tasks count against.</p></div>
        </div>
        {#if data.topPerformers.length}
          <ol class="podium" aria-label="Top of the team">
            {#each data.topPerformers.slice(0, 3) as person, i (person.id)}
              <li><Medal size={18} class={`medal m${i + 1}`} /><div><b>{person.name}</b><small>{ROLE_LABELS[person.role] ?? person.role} · {person.dealsCompleted} deals done · {person.tasksDone} tasks · {person.contacts} contacts</small></div></li>
            {/each}
          </ol>
        {/if}
        <div class="o-table-wrap flat">
          <table class="o-table team">
            <thead><tr><th>Staff</th><th class="num">Clients</th><th class="num">Active deals</th><th class="num">Deals done</th><th class="num">Tasks done</th><th class="num">Open</th><th class="num">Overdue</th><th class="num">Contacts</th></tr></thead>
            <tbody>
              {#each data.performance as person (person.id)}
                <tr>
                  <td class="lead" data-label="Staff"><b>{person.name}</b><small>{ROLE_LABELS[person.role] ?? person.role}</small></td>
                  <td class="num" data-label="Clients">{person.customers}</td>
                  <td class="num" data-label="Active deals">{person.activeDeals}</td>
                  <td class="num" data-label="Deals done">{person.dealsCompleted}</td>
                  <td class="num" data-label="Tasks done">{person.tasksDone}</td>
                  <td class="num" data-label="Open">{person.tasksOpen}</td>
                  <td class="num" data-label="Overdue"><span class:late={person.overdue > 0}>{person.overdue}</span></td>
                  <td class="num" data-label="Contacts">{person.contacts}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>
    {/if}
  {/if}
</div>

{#snippet taskCard(d: Dashboard)}
      <section class="o-card">
        <div class="card-head"><h2>Tasks and follow-ups</h2><a class="o-link" href="/admin/tasks">All tasks <ArrowRight size={14} /></a></div>
        {#if d.pendingTasks.length}
          <ul class="list">
            {#each d.pendingTasks as task (task.id)}
              <li>
                <div>
                  <b>{task.title}</b>
                  <small>{KIND[task.kind] ?? "Task"}{task.assignee ? ` · ${task.assignee.name}` : ""}{#if task.customer} · <a class="o-link" href={`/admin/customers/${task.customer.id}`}>{task.customer.name}</a>{/if}</small>
                </div>
                <span class="when" class:late={late(task.dueAt)}>{task.dueAt ? day(task.dueAt) : "No date"}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="o-empty">No open tasks.</p>
        {/if}
      </section>
{/snippet}

{#snippet deadlineCard(d: Dashboard)}
      <section class="o-card">
        <div class="card-head"><h2><CalendarClock size={17} /> Deal deadlines</h2><a class="o-link" href="/admin/deals">All deals <ArrowRight size={14} /></a></div>
        {#if d.deadlines.length}
          <ul class="list">
            {#each d.deadlines as deal (deal.id)}
              <li>
                <div><a class="o-link" href={`/admin/deals/${deal.id}`}>{deal.title}</a><small>{deal.dealNumber}{deal.customer ? ` · ${deal.customer.name}` : ""}</small></div>
                <span class="when" class:late={late(deal.endDate)} class:soon={!late(deal.endDate) && soon(deal.endDate)}>{day(deal.endDate)}</span>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="o-empty">No active deal has an end date.</p>
        {/if}
      </section>
{/snippet}

<style>
  .dash h1 { font-size: clamp(1.7rem, 3.6vw, 2.6rem); }
  .filters { display: flex; flex-wrap: wrap; align-items: flex-end; justify-content: space-between; gap: 0.8rem 1rem; margin-bottom: 1rem; }
  .presets { margin: 0; max-width: 100%; }
  .controls { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 0.6rem; }
  .controls .o-field { min-width: 9.5rem; }
  .refresh { align-self: flex-end; }
  .o-stats.money { margin-bottom: 0.8rem; }
  .o-stat span { display: flex; align-items: center; gap: 0.35rem; }
  .o-stat.link { color: inherit; text-decoration: none; transition: border-color 150ms ease, transform 120ms ease; }
  .o-stat.link:active { transform: scale(0.98); }
  .o-stat.link:focus-visible { outline: 3px solid #d19b2d; outline-offset: 2px; }
  .o-stat.alert b { color: #a3302a; }
  .card-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 0.6rem 1rem; margin-bottom: 0.9rem; }
  .card-head h2, .o-card > h2 { display: flex; align-items: center; gap: 0.4rem; margin: 0; font-size: 1.02rem; color: #07182f; }
  .o-card > h2 { margin-bottom: 0.9rem; }
  .card-head p { margin: 0.25rem 0 0; font-size: 0.82rem; }
  .card-head .o-link { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.85rem; }
  .mini { margin: 0; }
  .mini button { padding: 0.4rem 0.75rem; font-size: 0.8rem; }
  .pair { margin-top: 1rem; align-items: start; }
  .spaced { margin-top: 1rem; }
  .stack { display: grid; gap: 1rem; min-width: 0; }
  .stack .o-card + .o-card, .pair > .o-card + .o-card { margin-top: 0; }
  .pair + .o-card, .o-card + .pair { margin-top: 1rem; }
  .flat { border: 0; border-radius: 0; }
  .list { margin: 0; padding: 0; list-style: none; }
  .list li { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; padding: 0.65rem 0; border-top: 1px solid #edf0f2; }
  .list li:first-child { border-top: 0; padding-top: 0; }
  .list li > div { min-width: 0; }
  .list b, .list small, .list a { display: block; overflow-wrap: anywhere; }
  .list b { font-size: 0.88rem; color: #17283d; }
  .list small { margin-top: 0.15rem; color: #6a7686; font-size: 0.78rem; }
  .list small a { display: inline; }
  .figure { display: flex; flex-direction: column; align-items: flex-end; gap: 0.25rem; flex: none; font-weight: 750; font-variant-numeric: tabular-nums; }
  .when { flex: none; font-size: 0.8rem; color: #48576b; font-weight: 700; white-space: nowrap; }
  .late, .loss { color: #a3302a; font-weight: 750; }
  .soon { color: #7c5a12; }
  .podium { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 15rem), 1fr)); gap: 0.6rem; margin: 0 0 1rem; padding: 0; list-style: none; }
  .podium li { display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.75rem 0.85rem; border-radius: 0.7rem; background: #fbf7ec; }
  .podium b, .podium small { display: block; }
  .podium small { margin-top: 0.15rem; color: #6a7686; font-size: 0.76rem; line-height: 1.4; }
  .podium :global(.medal) { flex: none; margin-top: 0.1rem; }
  .podium :global(.m1) { color: #b78320; }
  .podium :global(.m2) { color: #7a8593; }
  .podium :global(.m3) { color: #9a5b2e; }
  @media (hover: hover) and (pointer: fine) { .o-stat.link:hover { border-color: #d9c48f; } }
  @media (max-width: 48rem) {
    .presets { flex-wrap: wrap; }
    /* Each person as a small grid of figures instead of a long list. */
    .team tr { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.4rem 0.6rem; }
    .team td { display: flex; flex-direction: column-reverse; align-items: flex-start; justify-content: flex-end; gap: 0.1rem; padding: 0; text-align: left; font-size: 0.95rem; font-weight: 750; }
    .team td::before { font-size: 0.68rem; font-weight: 650; line-height: 1.2; }
    .team td.lead { grid-column: 1 / -1; flex-direction: column; font-weight: 400; }
    .filters { align-items: stretch; }
    .controls { width: 100%; }
    .controls .o-field { flex: 1 1 9rem; }
  }
  @media (max-width: 40rem) {
    .o-stats { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.6rem; }
    .o-stats .o-stat { padding: 0.85rem 0.9rem; }
    .o-stats .o-stat b { font-size: 1.12rem; }
    .o-stats .o-stat small { font-size: 0.7rem; line-height: 1.35; }
  }
  @media (prefers-reduced-motion: reduce) { .o-stat.link { transition: none; } }
</style>
