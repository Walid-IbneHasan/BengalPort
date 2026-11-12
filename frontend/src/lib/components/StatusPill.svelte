<script lang="ts">
  import { statusText, toneOf } from "$lib/office";

  // A status in a small coloured pill: green for done, amber for waiting,
  // red for overdue or cancelled, blue for in progress, grey for drafts.
  let { status, label = "" }: { status: string; label?: string } = $props();
</script>

<span class="o-pill {toneOf(status)}">{label || statusText(status)}</span>
