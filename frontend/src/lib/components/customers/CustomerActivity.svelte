<script lang="ts">
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { ACTIVITY_KINDS, dayTime, type Activity } from "$lib/crm";
  import { Cog, History, Mail, MessageCircle, Phone, StickyNote, Users } from "lucide-svelte";

  // A customer's history: every call, WhatsApp message, email, meeting and
  // note, newest first, with what the system did (quieter) in between. Staff
  // who may change the customer can log a new contact here.
  let {
    customerId,
    activities,
    canLog,
    onlogged,
  }: { customerId: string; activities: Activity[]; canLog: boolean; onlogged: () => Promise<void> | void } = $props();

  const ICONS = { CALL: Phone, WHATSAPP: MessageCircle, EMAIL: Mail, MEETING: Users, NOTE: StickyNote, SYSTEM: Cog } as const;
  const PROMPTS: Record<keyof typeof ACTIVITY_KINDS, string> = {
    CALL: "What was said on the call?",
    WHATSAPP: "What was the WhatsApp conversation about?",
    EMAIL: "What was the email about?",
    MEETING: "What was agreed at the meeting?",
    NOTE: "Anything the team should know",
  };

  let kind = $state<keyof typeof ACTIVITY_KINDS>("CALL"),
    summary = $state(""),
    when = $state(""),
    saving = $state(false),
    problem = $state("");

  async function log(event: SubmitEvent) {
    event.preventDefault();
    saving = true;
    problem = "";
    try {
      // The time box is in this computer's clock; empty means "just now".
      await api(`/office/customers/${customerId}/activities`, {
        method: "POST",
        body: JSON.stringify({ kind, summary, at: when ? new Date(when).toISOString() : null }),
      });
      toasts.show(`${ACTIVITY_KINDS[kind]} logged`);
      summary = "";
      when = "";
      await onlogged();
    } catch (e) {
      problem = problemText(e, "It was not logged");
    } finally {
      saving = false;
    }
  }
</script>

<div class="activity">
  {#if canLog}
    <form class="o-card o-form log" onsubmit={log}>
      <h2 class="o-section-title">Log a call, WhatsApp, email, meeting or note</h2>
      <div class="kinds" role="group" aria-label="What happened">
        {#each Object.entries(ACTIVITY_KINDS) as [value, label] (value)}
          {@const Icon = ICONS[value as keyof typeof ACTIVITY_KINDS]}
          <button type="button" class="o-btn ghost small" class:on={kind === value} aria-pressed={kind === value} onclick={() => (kind = value as keyof typeof ACTIVITY_KINDS)}>
            <Icon size={15} /> {label}
          </button>
        {/each}
      </div>
      <div class="o-fields">
        <label class="o-field wide"><span>What happened</span><textarea bind:value={summary} required maxlength="2000" placeholder={PROMPTS[kind]}></textarea></label>
        <label class="o-field">
          <span>When <small>(optional)</small></span>
          <input type="datetime-local" bind:value={when} />
          <small class="hint">Leave empty for just now.</small>
        </label>
      </div>
      {#if problem}<p class="o-error" role="alert" use:intoView={problem}>{problem}</p>{/if}
      <div class="o-form-actions"><button type="submit" class="o-btn navy" disabled={saving}>{saving ? "Saving…" : `Log ${kind === "WHATSAPP" ? "WhatsApp" : ACTIVITY_KINDS[kind].toLowerCase()}`}</button></div>
    </form>
  {/if}

  {#if !activities.length}
    <div class="o-card o-empty">
      <History size={28} />
      <h3>Nothing logged yet</h3>
      <p>{canLog ? "Log the first call or message above, so everyone knows where things stand." : "Calls, messages and meetings with this customer will show here."}</p>
    </div>
  {:else}
    <ol class="o-card timeline" aria-label="History, newest first">
      {#each activities as item (item.id)}
        {@const Icon = ICONS[item.kind] ?? StickyNote}
        <li class:system={item.kind === "SYSTEM"}>
          <span class="icon" aria-hidden="true"><Icon size={16} /></span>
          <div>
            <p class="what"><span class="o-sr">{item.kind === "SYSTEM" ? "System" : ACTIVITY_KINDS[item.kind as keyof typeof ACTIVITY_KINDS]}: </span>{item.summary}</p>
            <small>{item.kind === "SYSTEM" ? "" : `${ACTIVITY_KINDS[item.kind as keyof typeof ACTIVITY_KINDS]} · `}{item.byName ?? "System"} · <time datetime={item.at}>{dayTime(item.at)}</time></small>
          </div>
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .activity { display: grid; gap: 1rem; }
  .log h2 { margin-bottom: 0; }
  .kinds { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .kinds .o-btn { min-height: 2.5rem; }
  .kinds .on { background: #07182f; color: #fff; box-shadow: none; }
  .timeline { display: grid; gap: 0; margin: 0; list-style: none; }
  .timeline li { position: relative; display: flex; gap: 0.8rem; padding: 0.75rem 0; border-top: 1px solid #edf0f2; }
  .timeline li:first-child { border-top: 0; padding-top: 0; }
  .icon { flex: none; display: grid; place-items: center; width: 2.1rem; height: 2.1rem; border-radius: 50%; background: #fdf3dc; color: #8a6113; }
  .timeline div { min-width: 0; }
  .what { margin: 0.15rem 0 0.2rem; color: #25384d; line-height: 1.5; white-space: pre-line; overflow-wrap: anywhere; }
  .timeline small { color: #7a8593; font-size: 0.78rem; }
  .system .icon { background: #f0f2f4; color: #8a95a3; width: 1.8rem; height: 1.8rem; }
  .system .what { color: #6a7686; font-size: 0.86rem; }
  @media (hover: hover) and (pointer: fine) { .kinds .on:hover { background: #17304f; } }
</style>
