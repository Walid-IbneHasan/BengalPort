<script lang="ts">
  import { onMount } from "svelte";
  import { Check, Code2, Eye, LoaderCircle, Save } from "lucide-svelte";
  import { api } from "$lib/api";
  import type { DivisionContent } from "$lib/division-content";
  import CmsImageField from "./CmsImageField.svelte";
  type Field = {
    path: string;
    label: string;
    value: string;
    long: boolean;
    image: boolean;
  };
  let {
    division,
    fallback,
  }: { division: "education" | "healthcare"; fallback: DivisionContent } =
    $props();
  let draft = $state<DivisionContent>(structuredClone(fallback)),
    revision = $state(0),
    published = $state(true),
    loading = $state(true),
    saving = $state(false),
    error = $state(""),
    success = $state(""),
    advanced = $state(false),
    json = $state("");
  let fields = $derived(flatten(draft));
  const name = $derived(
    division === "education" ? "Global Education" : "Global Healthcare",
  );
  function title(path: string) {
    return path
      .replace(/\.(\d+)\./g, " $1 · ")
      .replaceAll(".", " · ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase());
  }
  function flatten(value: unknown, path = ""): Field[] {
    if (typeof value === "string")
      return [
        {
          path,
          label: title(path),
          value,
          long: value.length > 75 || /description/i.test(path),
          image: /(^|\.)image$/i.test(path),
        },
      ];
    if (!value || typeof value !== "object") return [];
    return Object.entries(value).flatMap(([key, item]) =>
      flatten(item, path ? `${path}.${key}` : key),
    );
  }
  function setPath(path: string, value: string) {
    const copy: any = structuredClone(draft),
      keys = path.split(".");
    let target = copy;
    for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
    target[keys.at(-1) as string] = value;
    draft = copy;
    success = "";
  }
  function toggleAdvanced() {
    advanced = !advanced;
    if (advanced) json = JSON.stringify(draft, null, 2);
  }
  function applyJson() {
    try {
      draft = JSON.parse(json);
      advanced = false;
      success = "JSON applied locally. Save to publish.";
    } catch {
      error = "The JSON is not valid.";
    }
  }
  async function load() {
    try {
      const token = localStorage.getItem("bp_token");
      const page = await api<any>(`/admin/content/${division}`, {
        headers: { authorization: `Bearer ${token}` },
      });
      draft = page.content;
      revision = page.revision;
      published = page.published;
    } catch (e) {
      error = e instanceof Error ? e.message : "Unable to load content";
    } finally {
      loading = false;
    }
  }
  async function save() {
    saving = true;
    error = "";
    success = "";
    try {
      const token = localStorage.getItem("bp_token");
      const page = await api<any>(`/admin/content/${division}`, {
        method: "PUT",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: draft, published, revision }),
      });
      revision = page.revision;
      success = `${name} saved as revision ${revision}.`;
    } catch (e) {
      error = e instanceof Error ? e.message : "Unable to save content";
    } finally {
      saving = false;
    }
  }
  onMount(load);
</script>

<div class="editor">
  <header>
    <div>
      <span>PUBLIC WEBSITE</span>
      <h1>{name} page</h1>
      <p>Edit the complete public portal without changing code.</p>
    </div>
    <div class="actions">
      <label><input type="checkbox" bind:checked={published} /> Published</label
      ><a href={`/${division}`} target="_blank"><Eye size={17} /> Preview</a
      ><button onclick={save} disabled={saving || loading}
        >{#if saving}<LoaderCircle class="spin" size={17} />{:else}<Save
            size={17}
          />{/if}{saving ? "Saving…" : "Save changes"}</button
      >
    </div>
  </header>
  {#if error}<div class="notice error">{error}</div>{/if}{#if success}<div
      class="notice success"
    >
      <Check size={17} />{success}
    </div>{/if}
  {#if loading}<div class="loading">
      <LoaderCircle class="spin" /> Loading content…
    </div>{:else}
    <div class="bar">
      <div>
        <b>Revision {revision}</b><span
          >Changes publish to the live portal.</span
        >
      </div>
      <button onclick={toggleAdvanced}
        ><Code2 size={16} />{advanced ? "Form editor" : "Advanced JSON"}</button
      >
    </div>
    {#if advanced}<section class="json">
        <textarea bind:value={json} spellcheck="false"></textarea><button
          onclick={applyJson}>Apply JSON</button
        >
      </section>
    {:else}<section class="fields">
        {#each fields as field}
          {#if field.image}<CmsImageField
              label={field.label}
              value={field.value}
              purpose={`${division} ${field.path}`}
              recommendation="Landscape recommended · ideally 16:9 or wider. Portrait uploads are supported and will be responsively cropped."
              onchange={(value) => setPath(field.path, value)}
            />
          {:else}<label
              ><span>{field.label}</span>{#if field.long}<textarea
                  rows="3"
                  value={field.value}
                  oninput={(e) => setPath(field.path, e.currentTarget.value)}
                ></textarea>{:else}<input
                  value={field.value}
                  oninput={(e) => setPath(field.path, e.currentTarget.value)}
                />{/if}</label
            >{/if}
        {/each}
      </section>{/if}
  {/if}
</div>

<style>
  .editor {
    padding: clamp(1rem, 4vw, 3rem);
    max-width: 95rem;
    margin: auto;
  }
  .editor > header {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    margin-bottom: 1.4rem;
  }
  .editor > header > div > span {
    font-size: 0.7rem;
    letter-spacing: 0.13em;
    font-weight: 800;
    color: var(--gold-deep);
  }
  h1 {
    font-size: clamp(2rem, 7vw, 3rem);
    letter-spacing: -0.04em;
    color: var(--heading);
    margin: 0.35rem 0;
  }
  header p {
    color: var(--muted);
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .actions > * {
    min-height: 2.75rem;
    border: 1px solid #dbe1e5;
    background: #fff;
    border-radius: 0.65rem;
    padding: 0.6rem 0.8rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    color: var(--heading);
    font-size: 0.78rem;
    font-weight: 750;
    text-decoration: none;
  }
  .actions button {
    background: var(--gold);
  }
  button {
    cursor: pointer;
  }
  .notice {
    padding: 0.8rem;
    border-radius: 0.65rem;
    margin-bottom: 0.7rem;
  }
  .error {
    background: #fff0f0;
    color: #8d2929;
  }
  .success {
    background: #eaf7ef;
    color: #286642;
    display: flex;
    gap: 0.4rem;
  }
  .loading {
    height: 20rem;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.6rem;
    color: var(--muted);
  }
  .spin {
    animation: spin 0.8s linear infinite;
  }
  .bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    border: 1px solid #dfe5e8;
    border-radius: 0.8rem 0.8rem 0 0;
    padding: 1rem;
  }
  .bar b,
  .bar span {
    display: block;
  }
  .bar span {
    font-size: 0.72rem;
    color: var(--muted);
  }
  .bar button,
  .json button {
    min-height: 2.75rem;
    border: 1px solid #dbe1e5;
    background: #fff;
    border-radius: 0.6rem;
    padding: 0.55rem 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .fields,
  .json {
    background: #fff;
    border: 1px solid #dfe5e8;
    border-top: 0;
    border-radius: 0 0 0.8rem 0.8rem;
    padding: 1rem;
    display: grid;
    gap: 1rem;
  }
  .fields label {
    display: grid;
    gap: 0.35rem;
  }
  .fields label > span {
    font-size: 0.7rem;
    font-weight: 750;
    color: #40546a;
  }
  .fields input,
  .fields textarea,
  .json textarea {
    width: 100%;
    border: 1px solid #d5dde2;
    background: #fbfcfc;
    border-radius: 0.6rem;
    padding: 0.75rem;
    outline: 0;
  }
  .fields input:focus,
  .fields textarea:focus,
  .json textarea:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px #c9952d1c;
  }
  .json textarea {
    min-height: 38rem;
    font:
      13px/1.6 Consolas,
      monospace;
  }
  .json button {
    width: max-content;
    background: var(--heading);
    color: #fff;
  }
  .actions a:active,
  .actions button:active,
  .bar button:active,
  .json button:active {
    transform: scale(0.97);
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (min-width: 48rem) {
    .editor > header {
      flex-direction: row;
      justify-content: space-between;
    }
    .fields {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      padding: 2rem;
    }
    .actions {
      justify-content: flex-end;
    }
  }
  @media (max-width: 39.99rem) {
    .bar {
      align-items: flex-start;
      gap: 0.75rem;
      flex-direction: column;
    }
    .bar button {
      width: 100%;
      justify-content: center;
    }
    .actions > * {
      flex: 1;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .spin {
      animation: none;
    }
  }
</style>
