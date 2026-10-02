<script lang="ts">
  import { Download } from "lucide-svelte";
  import { api } from "$lib/api";

  // Admin settings: download a fresh copy of the whole database.
  let preparing = $state(false), error = $state(""), started = $state(false);

  async function download() {
    preparing = true;
    error = "";
    started = false;
    try {
      // The link works for two minutes; the browser saves the file itself.
      const { url } = await api<{ url: string }>("/admin/backup-link");
      window.location.href = url;
      started = true;
    } catch (e) {
      error = e instanceof Error ? e.message : "The backup could not be prepared.";
    } finally {
      preparing = false;
    }
  }
</script>

<section class="backup">
  <div>
    <b>Database backup</b>
    <span>Everything on the site lives in the database: applications, documents, images, payments and page content. Download a copy regularly and keep it somewhere safe, away from the server.</span>
    {#if error}<p class="problem" role="alert">{error}</p>{/if}
    {#if started}<p class="done" role="status">The download has started. The file can be restored with PostgreSQL's pg_restore.</p>{/if}
  </div>
  <button onclick={download} disabled={preparing}><Download size={16} /> {preparing ? "Preparing…" : "Download a backup"}</button>
</section>

<style>
  .backup{background:#fff;border:1px solid #e0e5e8;border-radius:.9rem;padding:1.2rem;display:flex;align-items:flex-start;justify-content:space-between;gap:1rem}
  b,span{display:block}
  span{font-size:.78rem;color:var(--muted);margin-top:.3rem;line-height:1.5;max-width:38rem}
  button{flex:none;display:inline-flex;align-items:center;gap:.4rem;min-height:2.6rem;border:0;border-radius:.7rem;padding:.6rem 1.1rem;background:var(--gold);color:var(--heading);font-weight:750;cursor:pointer}
  button:disabled{opacity:.6}
  p{margin:.6rem 0 0;padding:.6rem .8rem;border-radius:.6rem;font-size:.8rem;line-height:1.5}
  .problem{background:#fff0f0;color:#922f2f}
  .done{background:#eaf7ef;color:#276541}
  @media(max-width:40rem){.backup{flex-direction:column}}
</style>
