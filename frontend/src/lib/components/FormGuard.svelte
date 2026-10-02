<script lang="ts" module>
  // Cloudflare's script is added to the page once, however many forms use it.
  let script: Promise<void> | undefined;
  function loadTurnstile(): Promise<void> {
    script ??= new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      tag.async = true;
      tag.onload = () => resolve();
      tag.onerror = () => {
        script = undefined;
        reject(new Error("The security check could not be loaded"));
      };
      document.head.append(tag);
    });
    return script;
  }
</script>

<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { api } from "$lib/api";

  // Spam protection for a public form: a field no person sees, and the
  // Cloudflare check when the API has it switched on. The form adds
  // `fields()` to what it submits, asks `problem()` before submitting and
  // calls `reset()` afterwards, because a passed check can be used once.
  let trap = $state(""), token = $state(""), siteKey = $state<string | null>(null), unavailable = $state(false);
  let holder = $state<HTMLDivElement>();
  let widget: string | undefined;
  const turnstile = () => (window as any).turnstile;

  export function fields(): Record<string, string> {
    return { contact_time_slot: trap, ...(token ? { captchaToken: token } : {}) };
  }
  export function problem(): string {
    if (!siteKey || token) return "";
    return unavailable
      ? "The security check could not load. Check your connection, switch off any content blocker for this site and reload the page."
      : "Please wait for the security check below to finish, then submit again.";
  }
  export function reset() {
    token = "";
    try { turnstile()?.reset(widget); } catch { /* the check was never shown */ }
  }

  onMount(async () => {
    try {
      siteKey = (await api<{ siteKey: string | null }>("/form-protection")).siteKey;
    } catch {
      return; // The API decides; without an answer the form is sent as it is.
    }
    if (!siteKey) return;
    try {
      await loadTurnstile();
      await tick();
      widget = turnstile().render(holder, {
        sitekey: siteKey,
        callback: (value: string) => { token = value; unavailable = false; },
        "expired-callback": () => (token = ""),
        "error-callback": () => { token = ""; unavailable = true; },
      });
    } catch {
      unavailable = true;
    }
  });
  onDestroy(() => {
    try { turnstile()?.remove(widget); } catch { /* nothing was shown */ }
  });
</script>

<div class="trap" aria-hidden="true">
  <label>Leave this field empty<input name="contact_time_slot" tabindex="-1" autocomplete="off" bind:value={trap} /></label>
</div>
{#if siteKey}
  <div class="check">
    <div bind:this={holder}></div>
    {#if unavailable}<p role="alert">The security check could not load. Check your connection, switch off any content blocker for this site and reload the page.</p>{/if}
  </div>
{/if}

<style>
  .trap{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden}
  .check{margin:1rem 0 0;min-height:4.1rem}
  .check p{margin:.5rem 0 0;font-size:.82rem;line-height:1.5;color:#943d45}
</style>
