<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { api, apiPage } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { day, officePermissions } from "$lib/office";
  import { Bell, BellOff, CalendarClock, CheckCheck, FileClock, FileText, Inbox, ListChecks, Mail, Settings2, Wallet } from "lucide-svelte";

  // What the office told this person: payment reminders, follow-ups,
  // deadlines, documents about to expire, new invoices, approvals and tasks
  // given to them. Each person chooses which arrive here and which by email.
  type Note = { id: string; type: string; title: string; body: string; link: string | null; createdAt: string; readAt: string | null };
  type Preference = { type: string; label: string; inApp: boolean; email: boolean };

  const ICONS: Record<string, any> = {
    PAYMENT_REMINDER: Wallet,
    FOLLOW_UP: ListChecks,
    DEADLINE: CalendarClock,
    DOCUMENT_EXPIRY: FileClock,
    NEW_INVOICE: FileText,
    PENDING_APPROVAL: Inbox,
    TASK_ASSIGNED: ListChecks,
  };

  let tab = $state<"all" | "unread" | "settings">("all"),
    rows = $state<Note[]>([]),
    unread = $state(0),
    loading = $state(true),
    problem = $state(""),
    preferences = $state<Preference[]>([]),
    savingPrefs = $state(false),
    prefProblem = $state(""),
    running = $state(false),
    runProblem = $state("");

  async function load() {
    loading = true;
    problem = "";
    try {
      const response = await fetchList(tab === "unread");
      rows = response.rows;
      unread = response.unread;
    } catch (e) {
      rows = [];
      problem = problemText(e, "The notifications could not be loaded");
    } finally {
      loading = false;
    }
  }

  // The list comes with the unread count in its meta.
  async function fetchList(onlyUnread: boolean) {
    const page = await apiPage<Note>(`/office/notifications${onlyUnread ? "?unread=1" : ""}`);
    return { rows: page.rows, unread: Number((page.meta as any).unread ?? 0) };
  }

  async function loadPreferences() {
    prefProblem = "";
    try {
      preferences = await api<Preference[]>("/office/notification-preferences");
    } catch (e) {
      prefProblem = problemText(e, "Your choices could not be loaded");
    }
  }

  onMount(load);

  function choose(next: typeof tab) {
    tab = next;
    if (next === "settings") loadPreferences();
    else load();
  }

  async function open(note: Note) {
    if (!note.readAt) {
      api(`/office/notifications/${note.id}/read`, { method: "POST" }).catch(() => {});
      note.readAt = new Date().toISOString();
      unread = Math.max(0, unread - 1);
    }
    if (note.link) goto(note.link);
  }

  async function readAll() {
    try {
      await api("/office/notifications/read-all", { method: "POST" });
      toasts.show("All marked as read");
      await load();
    } catch (e) {
      problem = problemText(e, "They were not marked as read");
    }
  }

  async function savePreferences() {
    savingPrefs = true;
    prefProblem = "";
    try {
      await api("/office/notification-preferences", { method: "PUT", body: JSON.stringify({ preferences: preferences.map(({ type, inApp, email }) => ({ type, inApp, email })) }) });
      toasts.show("Your choices are saved");
    } catch (e) {
      prefProblem = problemText(e, "Your choices were not saved");
    } finally {
      savingPrefs = false;
    }
  }

  // Sends any reminders that are due now instead of at the next quarter hour.
  async function runNow() {
    running = true;
    runProblem = "";
    try {
      const result = await api<{ sent: number }>("/office/notifications/run", { method: "POST" });
      toasts.show(result.sent ? `${result.sent} reminder${result.sent === 1 ? "" : "s"} sent` : "Nothing was due", { detail: "Reminders also go out by themselves every 15 minutes." });
      if (tab !== "settings") await load();
    } catch (e) {
      runProblem = problemText(e, "The reminders could not be sent");
    } finally {
      running = false;
    }
  }

  const when = (iso: string) => {
    const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes} min ago`;
    if (minutes < 24 * 60) return `${Math.round(minutes / 60)} h ago`;
    return day(iso);
  };
</script>

<svelte:head><title>Notifications — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office</span>
      <h1>Notifications</h1>
      <p>Reminders and news for you: payments due, follow-ups, deadlines, documents about to expire, new invoices and approvals.</p>
    </div>
    <div class="o-actions">
      {#if tab !== "settings" && unread}<button class="o-btn ghost" onclick={readAll}><CheckCheck size={17} /> Mark all as read</button>{/if}
      {#if $officePermissions.has("settings.update")}<button class="o-btn ghost" onclick={runNow} disabled={running}><Bell size={17} /> {running ? "Sending…" : "Send due reminders now"}</button>{/if}
    </div>
  </header>
  {#if runProblem}<p class="o-error" role="alert" use:intoView={runProblem}>{runProblem}</p>{/if}

  <nav class="o-tabs" aria-label="Show">
    <button class:active={tab === "all"} aria-pressed={tab === "all"} onclick={() => choose("all")}>All</button>
    <button class:active={tab === "unread"} aria-pressed={tab === "unread"} onclick={() => choose("unread")}>Unread{unread ? ` (${unread})` : ""}</button>
    <button class:active={tab === "settings"} aria-pressed={tab === "settings"} onclick={() => choose("settings")}><Settings2 size={15} /> What I receive</button>
  </nav>

  {#if tab === "settings"}
    <section class="o-card">
      <h2>What I receive</h2>
      <p class="o-muted intro">Choose, for each kind, whether it shows here and whether it is also emailed to you.</p>
      {#if preferences.length}
        <div class="o-table-wrap flat">
          <table class="o-table">
            <thead><tr><th>Kind</th><th>Here</th><th>By email</th></tr></thead>
            <tbody>
              {#each preferences as preference (preference.type)}
                <tr>
                  <td class="lead" data-label="Kind"><b>{preference.label}</b></td>
                  <td data-label="Here"><label class="o-check"><input type="checkbox" bind:checked={preference.inApp} /> <span class="o-sr">Show “{preference.label}” here</span><Bell size={15} /></label></td>
                  <td data-label="By email"><label class="o-check"><input type="checkbox" bind:checked={preference.email} /> <span class="o-sr">Email “{preference.label}”</span><Mail size={15} /></label></td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      {:else if !prefProblem}
        <p class="o-loading">Loading your choices…</p>
      {/if}
      {#if prefProblem}<p class="o-error" role="alert" use:intoView={prefProblem}>{prefProblem}</p>{/if}
      {#if preferences.length}<div class="o-form-actions save"><button class="o-btn navy" onclick={savePreferences} disabled={savingPrefs}>{savingPrefs ? "Saving…" : "Save my choices"}</button></div>{/if}
    </section>
  {:else}
    {#if problem}<p class="o-error" role="alert">{problem}</p>{/if}
    {#if loading}
      <p class="o-loading">Loading notifications…</p>
    {:else if !rows.length}
      <div class="o-card o-empty">
        <BellOff size={28} />
        <h3>{tab === "unread" ? "You're all caught up" : "No notifications yet"}</h3>
        <p>Reminders arrive here by themselves.</p>
      </div>
    {:else}
      <ul class="notes o-card">
        {#each rows as note (note.id)}
          {@const Icon = ICONS[note.type] ?? Bell}
          <li class:unread={!note.readAt}>
            <button type="button" onclick={() => open(note)}>
              <span class="icon"><Icon size={18} /></span>
              <span class="text"><b>{note.title}</b><span>{note.body}</span></span>
              <time datetime={note.createdAt}>{when(note.createdAt)}</time>
              {#if !note.readAt}<i class="dot" aria-label="Unread"></i>{/if}
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</div>

<style>
  .o-card > h2 { margin-bottom: 0.3rem; }
  .intro { margin: 0 0 1rem; font-size: 0.86rem; }
  .flat { border: 0; border-radius: 0; }
  .save { margin-top: 1rem; }
  .notes { margin: 0; padding: 0.4rem; list-style: none; }
  .notes li + li { border-top: 1px solid #edf0f2; }
  .notes button { display: grid; grid-template-columns: 2.4rem minmax(0, 1fr) auto 0.6rem; align-items: start; gap: 0.75rem; width: 100%; padding: 0.85rem 0.7rem; border: 0; border-radius: 0.6rem; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
  .notes button:focus-visible { outline: 3px solid #d19b2d; outline-offset: -3px; }
  .icon { display: grid; place-items: center; width: 2.4rem; height: 2.4rem; border-radius: 0.65rem; background: #f1f3f5; color: #48576b; }
  .unread .icon { background: #fbf1da; color: #8a6414; }
  .text { min-width: 0; }
  .text b, .text span { display: block; overflow-wrap: anywhere; }
  .text b { font-size: 0.9rem; color: #17283d; font-weight: 650; }
  .unread .text b { font-weight: 800; color: #07182f; }
  .text span { margin-top: 0.2rem; color: #5d6b7c; font-size: 0.84rem; line-height: 1.45; }
  time { font-size: 0.76rem; color: #7a8593; white-space: nowrap; padding-top: 0.15rem; }
  .dot { width: 0.55rem; height: 0.55rem; margin-top: 0.4rem; border-radius: 50%; background: #d19b2d; }
  @media (hover: hover) and (pointer: fine) { .notes button:hover { background: #faf8f1; } }
  @media (max-width: 40rem) {
    .notes button { grid-template-columns: 2.2rem minmax(0, 1fr) 0.6rem; }
    time { grid-column: 2; grid-row: 2; padding: 0; }
  }
</style>
