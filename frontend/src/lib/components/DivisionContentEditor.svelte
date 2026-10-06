<script lang="ts">
  import { onMount } from "svelte";
  import { Check, Code2, Eye, LoaderCircle, Plus, Save, Trash2 } from "lucide-svelte";
  import { api } from "$lib/api";
  import { addItem, contentRows, fillMissing, removeItem, setAt } from "$lib/content-fields";
  import CmsImageField from "./CmsImageField.svelte";
  // Edits one page of the public website: a division portal, or the About,
  // Services or Contact page. `lists` lets items be added to and removed
  // from the page's lists; `note` is shown above the fields.
  type Content = Record<string, any>;
  let {
    division,
    fallback,
    lists = false,
    note = "",
    prepare,
  }: {
    division: "business" | "education" | "healthcare" | "umrah" | "about" | "services" | "contact";
    fallback: Content;
    lists?: boolean;
    note?: string;
    // How the saved page becomes the draft; the default fills in whatever it lacks.
    prepare?: (saved: unknown) => Content;
  } = $props();
  // svelte-ignore state_referenced_locally
  let draft = $state<Content>(structuredClone(fallback)),
    revision = $state(0),
    published = $state(true),
    loading = $state(true),
    saving = $state(false),
    error = $state(""),
    success = $state(""),
    advanced = $state(false),
    json = $state("");
  let rows = $derived(contentRows(draft, { lists }));
  const name = $derived(
    {
      business: "Global Business",
      education: "Global Education",
      healthcare: "Global Healthcare",
      umrah: "Global Umrah",
      about: "About Us",
      services: "Services",
      contact: "Contact",
    }[division],
  );
  function change(next: Content) {
    draft = next;
    success = "";
  }
  const setPath = (path: string, value: string) => change(setAt($state.snapshot(draft), path, value));
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
      // A page saved before a section was added still gets that section.
      draft = prepare ? prepare(page.content) : fillMissing(fallback, page.content);
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
      <p>Edit this page of the public website without changing code.</p>
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
    {:else}{#if note}<p class="note">{note}</p>{/if}<section class="fields">
        {#each rows as field}
          {#if field.kind === "add"}<button
              type="button"
              class="list-button"
              onclick={() => change(addItem($state.snapshot(draft), field.list))}
              ><Plus size={15} /> {field.label}</button
            >
          {:else if field.kind === "remove"}<button
              type="button"
              class="list-button remove"
              onclick={() => change(removeItem($state.snapshot(draft), field.list, field.index))}
              ><Trash2 size={15} /> {field.label}</button
            >
          {:else if field.image}<CmsImageField
              label={field.label}
              value={field.value}
              purpose={`${division} ${field.path}`}
              recommendation="Landscape recommended · ideally 16:9 or wider. Portrait uploads are supported and will be responsively cropped."
              onchange={(value) => setPath(field.path, value)}
            />
          {:else}<label
              ><span
                >{field.label}{#if field.remove}{@const item = field.remove}<button
                    type="button"
                    class="inline-remove"
                    aria-label={`Remove ${field.label}`}
                    onclick={() => change(removeItem($state.snapshot(draft), item.list, item.index))}
                    ><Trash2 size={13} /> Remove</button
                  >{/if}</span
              >{#if field.long}<textarea
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
    align-items: flex-start;
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
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.7rem;
    font-weight: 750;
    color: #40546a;
  }
  .note {
    margin: 0;
    padding: 0.8rem 1rem;
    background: #f6f8f9;
    border: 1px solid #dfe5e8;
    border-top: 0;
    font-size: 0.8rem;
    line-height: 1.5;
    color: #40546a;
  }
  .list-button {
    grid-column: 1 / -1;
    justify-self: start;
    align-self: end;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.6rem;
    border: 1px dashed #c3ccd3;
    background: #fff;
    border-radius: 0.6rem;
    padding: 0.5rem 0.8rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--heading);
  }
  .list-button.remove,
  .inline-remove {
    color: #a84747;
  }
  .inline-remove {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border: 0;
    background: none;
    padding: 0.6rem 0 0.6rem 0.6rem;
    margin: -0.6rem 0;
    min-height: 0;
    font-size: 0.7rem;
    font-weight: 700;
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
