<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import {
    defaultBusinessContent,
    type BusinessContent,
  } from "$lib/business-content";
  import { Check, Code2, Eye, LoaderCircle, Save } from "lucide-svelte";
  import CmsImageField from "$lib/components/CmsImageField.svelte";
  type Field = {
    path: string;
    label: string;
    value: string;
    long: boolean;
    image: boolean;
  };
  let draft: BusinessContent = structuredClone(defaultBusinessContent),
    revision = 0,
    published = true,
    loading = true,
    saving = false,
    error = "",
    success = "",
    advanced = false,
    json = "";
  $: fields = flatten(draft);
  $: if (advanced) json = JSON.stringify(draft, null, 2);
  function fieldLabel(path: string) {
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
          label: fieldLabel(path),
          value,
          long: value.length > 74 || /description/i.test(path),
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
    let target: any = copy;
    for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
    target[keys.at(-1)!] = value;
    draft = copy;
    success = "";
  }
  async function load() {
    loading = true;
    error = "";
    try {
      const token = localStorage.getItem("bp_token");
      const page = await api<any>("/admin/content/business", {
        headers: { authorization: `Bearer ${token}` },
      });
      draft = page.content;
      revision = page.revision;
      published = page.published;
    } catch (e) {
      error = e instanceof Error ? e.message : "Unable to load page content";
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
      const page = await api<any>("/admin/content/business", {
        method: "PUT",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: draft, published, revision }),
      });
      revision = page.revision;
      success = `Global Business page saved as revision ${revision}.`;
    } catch (e) {
      error = e instanceof Error ? e.message : "Unable to save page content";
    } finally {
      saving = false;
    }
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
  onMount(load);
</script>

<svelte:head
  ><title>Global Business Content — Bengal Port Admin</title></svelte:head
>
<div class="editor">
  <header>
    <div>
      <span>PUBLIC WEBSITE</span>
      <h1>Global Business page</h1>
      <p>
        Edit hero copy, imagery, capabilities, services, statistics, trust
        points and calls to action.
      </p>
    </div>
    <div class="actions">
      <label><input type="checkbox" bind:checked={published} /> Published</label
      ><a href="/business" target="_blank"><Eye size={17} /> Preview</a><button
        class="save"
        onclick={save}
        disabled={saving || loading}
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
    </div>{/if}{#if loading}<div class="loading">
      <LoaderCircle class="spin" /><span>Loading business content…</span>
    </div>{:else}<div class="editor-head">
      <div>
        <b>Revision {revision}</b><span
          >Changes publish to the live Global Business page.</span
        >
      </div>
      <button onclick={() => (advanced = !advanced)}
        ><Code2 size={16} />{advanced ? "Form editor" : "Advanced JSON"}</button
      >
    </div>
    {#if advanced}<section class="json">
        <textarea
          bind:value={json}
          spellcheck="false"
          aria-label="Global Business page JSON"></textarea><button
          onclick={applyJson}>Apply JSON</button
        >
      </section>{:else}<section class="fields">
        {#each fields as field}{#if field.image}<CmsImageField
              label={field.label}
              value={field.value}
              purpose={`business ${field.path}`}
              recommendation="Wide landscape recommended · approximately 21:9. Portrait uploads remain supported through responsive cropping."
              onchange={(value) => setPath(field.path, value)}
            />{:else}<label
              ><span>{field.label}</span>{#if field.long}<textarea
                  rows="3"
                  value={field.value}
                  oninput={(e) => setPath(field.path, e.currentTarget.value)}
                ></textarea>{:else}<input
                  value={field.value}
                  oninput={(e) => setPath(field.path, e.currentTarget.value)}
                />{/if}</label
            >{/if}{/each}
      </section>{/if}{/if}
</div>

<style>
  .editor {
    padding: clamp(1.1rem, 3.5vw, 3rem);
    max-width: 95rem;
    margin: auto;
  }
  .editor > header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
    margin-bottom: 1.5rem;
  }
  .editor > header span {
    font-size: 0.7rem;
    letter-spacing: 0.13em;
    font-weight: 800;
    color: var(--gold-deep);
  }
  h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    letter-spacing: -0.04em;
    color: var(--heading);
    margin: 0.35rem 0;
  }
  header p {
    color: var(--muted);
    margin: 0;
  }
  .actions {
    display: flex;
    gap: 0.55rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .actions label,
  .actions a,
  .actions button,
  .editor-head button {
    min-height: 2.75rem;
    border: 1px solid #dce2e6;
    background: #fff;
    border-radius: 0.65rem;
    padding: 0.55rem 0.8rem;
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    color: var(--heading);
    text-decoration: none;
    font-size: 0.78rem;
    font-weight: 750;
  }
  .actions .save {
    background: var(--gold);
    border-color: var(--gold);
  }
  button {
    cursor: pointer;
  }
  .notice {
    padding: 0.8rem 1rem;
    border-radius: 0.7rem;
    margin-bottom: 0.8rem;
  }
  .notice.error {
    background: #fff0f0;
    color: #8f2929;
  }
  .notice.success {
    background: #eaf7ef;
    color: #276541;
    display: flex;
    gap: 0.5rem;
  }
  .loading {
    height: 25rem;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 0.7rem;
    color: var(--muted);
  }
  .spin {
    animation: spin 0.8s linear infinite;
  }
  .editor-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    border: 1px solid #e0e5e8;
    border-radius: 0.9rem 0.9rem 0 0;
    padding: 1rem;
  }
  .editor-head b,
  .editor-head span {
    display: block;
  }
  .editor-head span {
    font-size: 0.72rem;
    color: var(--muted);
    margin-top: 0.2rem;
  }
  .fields,
  .json {
    background: #fff;
    border: 1px solid #e0e5e8;
    border-top: 0;
    border-radius: 0 0 0.9rem 0.9rem;
    padding: clamp(1rem, 3vw, 2rem);
  }
  .fields {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1rem 1.25rem;
  }
  .fields label {
    display: grid;
    gap: 0.38rem;
  }
  .fields label > span {
    font-size: 0.7rem;
    font-weight: 750;
    color: #40546a;
  }
  .fields input,
  .fields textarea,
  .json textarea {
    border: 1px solid #d6dde2;
    background: #fbfcfc;
    border-radius: 0.62rem;
    padding: 0.75rem 0.8rem;
    outline: 0;
    width: 100%;
  }
  .fields input:focus,
  .fields textarea:focus,
  .json textarea:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px #c9952d1f;
  }
  .json textarea {
    min-height: 38rem;
    font:
      13px/1.6 Consolas,
      monospace;
  }
  .json button {
    margin-top: 0.8rem;
    background: var(--heading);
    color: #fff;
    border: 0;
    border-radius: 0.65rem;
    padding: 0.7rem 1rem;
  }
  .actions button:active,
  .actions a:active,
  .editor-head button:active,
  .json button:active {
    transform: scale(0.97);
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (min-width: 48rem) {
    .fields {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  @media (max-width: 51.99rem) {
    .editor > header {
      flex-direction: column;
    }
    .actions {
      width: 100%;
    }
    .actions .save {
      flex: 1;
    }
  }
  @media (max-width: 39.99rem) {
    .editor-head {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.75rem;
    }
    .editor-head button {
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
