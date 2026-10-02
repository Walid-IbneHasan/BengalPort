<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";

  // Admin settings: what is actually working on the server right now.
  type Status = { database: boolean; email: boolean; onlinePayment: boolean; teamInbox: boolean; formProtection: boolean };
  let status = $state<Status | null>(null);
  let failed = $state(false);

  onMount(async () => {
    try {
      status = await api<Status>("/admin/status");
    } catch {
      failed = true;
    }
  });

  let lines = $derived(
    status
      ? [
          { name: "Database", ok: status.database, on: "Connected", off: "Not reachable", note: status.database ? "" : "The API cannot reach PostgreSQL. Check DATABASE_URL on the server." },
          { name: "Email", ok: status.email, on: "Sending", off: "Not set up", note: status.email ? "" : "Sign-up codes, password resets and notifications are not sent until the SMTP settings are added on the server." },
          { name: "Team inbox", ok: status.teamInbox, on: "Set", off: "Not set", note: status.teamInbox ? "" : "Nobody is emailed about new enquiries and applications until ADMIN_NOTIFY_EMAIL is set on the server." },
          { name: "bKash payments", ok: status.onlinePayment, on: "Connected", off: "Not connected", note: status.onlinePayment ? "" : "Customers cannot pay online until the bKash settings are added on the server." },
          { name: "Spam check on forms", ok: status.formProtection, on: "On", off: "Off", note: status.formProtection ? "" : "The enquiry and application forms are protected by rate limits and a hidden field only. Add the Cloudflare Turnstile keys on the server to also check that visitors are people." },
        ]
      : [],
  );
  let problems = $derived(lines.filter((line) => !line.ok).length);
</script>

<section class="status" aria-live="polite">
  <header>
    <div>
      <b>System status</b>
      <span>Checked when this page opened.</span>
    </div>
    {#if status}<strong class:warn={problems > 0}>{problems === 0 ? "Everything is working" : problems === 1 ? "1 thing needs attention" : `${problems} things need attention`}</strong>{/if}
  </header>
  {#if failed}
    <p class="note">The status could not be loaded. The API may be unreachable.</p>
  {:else if !status}
    <p class="note">Checking…</p>
  {:else}
    <ul>
      {#each lines as line}
        <li>
          <i class:off={!line.ok}></i>
          <div><b>{line.name}</b>{#if line.note}<span>{line.note}</span>{/if}</div>
          <em class:off={!line.ok}>{line.ok ? line.on : line.off}</em>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .status{background:#fff;border:1px solid #e0e5e8;border-radius:.9rem;padding:1.2rem;display:grid;gap:.9rem}
  header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem}
  header b,header span{display:block}
  header span,.note{font-size:.78rem;color:var(--muted);margin:.3rem 0 0;line-height:1.5}
  header strong{flex:none;font-size:.72rem;color:#347854;background:#e8f5ef;padding:.35rem .6rem;border-radius:.45rem}
  header strong.warn{color:#7a5a12;background:#faf1da}
  ul{list-style:none;margin:0;padding:0;display:grid}
  li{display:flex;align-items:flex-start;gap:.8rem;padding:.7rem 0;border-top:1px solid #edf0f2}
  li>i{flex:none;width:.6rem;height:.6rem;margin-top:.35rem;border-radius:50%;background:#3b9963;box-shadow:0 0 0 .25rem #3b99631c}
  li>i.off{background:#c9952d;box-shadow:0 0 0 .25rem #c9952d24}
  li div{flex:1;min-width:0}
  li b{display:block;font-size:.84rem;color:var(--heading)}
  li span{display:block;font-size:.76rem;color:var(--muted);margin-top:.2rem;line-height:1.5}
  li em{flex:none;font-style:normal;font-size:.75rem;font-weight:700;color:#347854}
  li em.off{color:#7a5a12}
  @media(max-width:36rem){header{flex-direction:column}}
</style>
