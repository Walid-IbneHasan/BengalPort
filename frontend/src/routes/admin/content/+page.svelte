<script lang="ts">
  import { onMount } from "svelte";
  import { api } from "$lib/api";
  import { cmsContent, loadCmsContent } from "$lib/cms";
  import { defaultHomeContent, type HomeContent } from "$lib/home-content";
  import {
    ArrowLeft,
    Check,
    Code2,
    Eye,
    FileText,
    LoaderCircle,
    Save,
  } from "lucide-svelte";
  import CmsImageField from "$lib/components/CmsImageField.svelte";
  type Section = keyof HomeContent;
  type Field = {
    path: string;
    label: string;
    value: string;
    long: boolean;
    image: boolean;
  };
  const sections: Array<{ key: Section; label: string; hint: string }> = [
    {
      key: "utility",
      label: "Utility bar",
      hint: "Top contact and partner message",
    },
    {
      key: "hero",
      label: "Hero heading",
      hint: "Primary title and description",
    },
    {
      key: "divisions",
      label: "Division cards",
      hint: "Business, education and healthcare",
    },
    { key: "stats", label: "Statistics", hint: "Numbers below the hero" },
    { key: "intro", label: "Introduction", hint: "Opening statement and link" },
    { key: "promises", label: "Trust points", hint: "Supporting benefits" },
    { key: "pathways", label: "Pathways", hint: "Detailed service pathways" },
    { key: "process", label: "Process", hint: "Steps and supporting copy" },
    {
      key: "featured",
      label: "Featured items",
      hint: "Opportunity image cards",
    },
    { key: "closing", label: "Closing CTA", hint: "Final conversion panel" },
    { key: "footer", label: "Footer", hint: "Address and copyright" },
  ];
  let draft: HomeContent = structuredClone(defaultHomeContent),
    selected: Section = "hero",
    revision = 0,
    published = true,
    loading = true,
    saving = false,
    error = "",
    success = "",
    advanced = false,
    json = "";
  $: fields = flatten(draft[selected]);
  $: if (advanced) json = JSON.stringify(draft[selected], null, 2);
  function title(v: string) {
    return v
      .replace(/\.(\d+)\./g, " $1 · ")
      .replaceAll(".", " · ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (c) => c.toUpperCase());
  }
  function flatten(v: unknown, path = ""): Field[] {
    if (typeof v === "string")
      return [
        {
          path,
          label: title(path),
          value: v,
          long: v.length > 70 || /description|subtitle/i.test(path),
          image: /(^|\.)image$/i.test(path),
        },
      ];
    if (!v || typeof v !== "object") return [];
    return Object.entries(v).flatMap(([k, item]) =>
      flatten(item, path ? `${path}.${k}` : k),
    );
  }
  function recommendation(path: string) {
    if (selected === "divisions")
      return "Square or portrait recommended · approximately 1:1. Vertical and horizontal images are responsively cropped.";
    if (selected === "featured")
      return "Landscape recommended · approximately 16:10. Other orientations are safely cropped.";
    return "Landscape recommended · approximately 16:9.";
  }
  function setPath(path: string, value: string) {
    const copy: any = structuredClone(draft),
      keys = path.split(".");
    let target: any = copy[selected];
    for (let i = 0; i < keys.length - 1; i++) target = target[keys[i]];
    target[keys.at(-1)!] = value;
    draft = copy;
    success = "";
  }
  function choose(key: Section) {
    selected = key;
    advanced = false;
    error = "";
    success = "";
  }
  function applyJson() {
    try {
      draft = { ...draft, [selected]: JSON.parse(json) };
      advanced = false;
      success =
        "Advanced changes applied locally. Save the homepage to publish them.";
    } catch {
      error = "The JSON is not valid. Check commas, quotes and brackets.";
    }
  }
  async function load() {
    loading = true;
    error = "";
    try {
      const token = localStorage.getItem("bp_token");
      if (!token) throw new Error("Admin sign-in required");
      const page = await api<any>("/admin/content/home", {
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
      const page = await api<any>("/admin/content/home", {
        method: "PUT",
        headers: { authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: draft, published, revision }),
      });
      revision = page.revision;
      cmsContent.set(draft);
      await loadCmsContent(true);
      success = `Homepage saved as revision ${revision}.`;
    } catch (e) {
      error = e instanceof Error ? e.message : "Unable to save content";
    } finally {
      saving = false;
    }
  }
  onMount(load);
</script>

<svelte:head><title>Homepage Content — Bengal Port Admin</title></svelte:head>
<div class="cms-shell">
  <aside>
    <a class="back" href="/admin"><ArrowLeft size={18} /> Dashboard</a>
    <div class="brand">
      <img src="/images/logo.webp" alt="" />
      <div><b>CONTENT STUDIO</b><span>Homepage CMS</span></div>
    </div>
    <nav>
      {#each sections as section}<button
          class:active={selected === section.key}
          onclick={() => choose(section.key)}
          ><span>{section.label}</span><small>{section.hint}</small></button
        >{/each}
    </nav>
  </aside>
  <main>
    <header>
      <div>
        <span class="kicker">WEBSITE CONTENT</span>
        <h1>{sections.find((s) => s.key === selected)?.label}</h1>
        <p>Edit the published homepage without changing code.</p>
      </div>
      <div class="header-actions">
        <label class="publish"
          ><input type="checkbox" bind:checked={published} /><span
            >Published</span
          ></label
        ><a class="preview" href="/" target="_blank"
          ><Eye size={18} /> Preview</a
        ><button class="save" disabled={saving || loading} onclick={save}
          >{#if saving}<LoaderCircle class="spin" size={18} />{:else}<Save
              size={18}
            />{/if}{saving ? "Saving…" : "Save homepage"}</button
        >
      </div>
    </header>
    {#if error}<div class="notice error" role="alert">
        {error}
      </div>{/if}{#if success}<div class="notice success">
        <Check size={18} />{success}
      </div>{/if}{#if loading}<div class="loading">
        <LoaderCircle class="spin" />
        <p>Loading the latest content…</p>
      </div>{:else}<div class="editor-head">
        <div>
          <b>Revision {revision}</b><span
            >Changes remain private until saved.</span
          >
        </div>
        <button onclick={() => (advanced = !advanced)}
          >{#if advanced}<FileText size={17} /> Form editor{:else}<Code2
              size={17}
            /> Advanced JSON{/if}</button
        >
      </div>
      {#if advanced}<section class="json-editor">
          <div class="json-warning">
            <Code2 size={20} />
            <p>
              <b>Advanced mode</b><span
                >Add, remove or reorder repeatable items here.</span
              >
            </p>
          </div>
          <textarea
            bind:value={json}
            spellcheck="false"
            aria-label="Section JSON"></textarea><button
            class="apply"
            onclick={applyJson}>Apply section JSON</button
          >
        </section>{:else}<section class="form-editor">
          {#each fields as field}{#if field.image}<CmsImageField
                label={field.label}
                value={field.value}
                purpose={`homepage ${selected} ${field.path}`}
                recommendation={recommendation(field.path)}
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
  </main>
</div>

<style>
  .cms-shell {
    min-height: 100svh;
    background: #f4f6f7;
    color: var(--text);
    display: grid;
    grid-template-columns: 17.5rem 1fr;
  }
  .cms-shell > aside {
    background: #102640;
    color: #fff;
    padding: 1.5rem 1rem;
    position: sticky;
    top: 0;
    height: 100svh;
    overflow: auto;
  }
  .back {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #c5d0dc;
    text-decoration: none;
    font-size: 0.85rem;
    padding: 0.65rem;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    padding: 1.4rem 0.65rem 1.7rem;
    border-bottom: 1px solid #ffffff17;
  }
  .brand img {
    width: 2.8rem;
    height: 2.8rem;
    border-radius: 50%;
  }
  .brand b,
  .brand span,
  nav button span,
  nav button small {
    display: block;
  }
  .brand b {
    font-size: 0.86rem;
    letter-spacing: 0.08em;
  }
  .brand span {
    font-size: 0.75rem;
    color: #9fb0c2;
    margin-top: 0.2rem;
  }
  nav {
    padding-top: 1rem;
  }
  nav button {
    width: 100%;
    border: 0;
    background: transparent;
    color: #bdc9d6;
    text-align: left;
    border-radius: 0.7rem;
    padding: 0.7rem 0.8rem;
    margin: 0.12rem 0;
    cursor: pointer;
    transition:
      background 0.2s,
      color 0.2s;
  }
  nav button span {
    font-weight: 700;
    font-size: 0.9rem;
  }
  nav button small {
    font-size: 0.72rem;
    margin-top: 0.18rem;
    color: #8295aa;
  }
  nav button:hover,
  nav button.active {
    background: #ffffff12;
    color: #efc96c;
  }
  nav button.active small {
    color: #c7d2dd;
  }
  .cms-shell > main {
    padding: clamp(1.3rem, 4vw, 3rem);
    min-width: 0;
  }
  .cms-shell header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 2rem;
    margin-bottom: 1.8rem;
  }
  .kicker {
    font-size: 0.75rem;
    letter-spacing: 0.12em;
    font-weight: 800;
    color: var(--gold-deep);
  }
  h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    letter-spacing: -0.035em;
    color: var(--heading);
    margin: 0.35rem 0;
  }
  header p {
    color: var(--muted);
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .publish,
  .preview,
  .save,
  .editor-head button,
  .apply {
    min-height: 2.75rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border-radius: 0.7rem;
    font-weight: 720;
    font-size: 0.85rem;
  }
  .publish {
    background: #fff;
    padding: 0.6rem 0.8rem;
    border: 1px solid #dfe4e8;
  }
  .publish input {
    accent-color: var(--gold-deep);
  }
  .preview {
    color: var(--heading);
    background: #fff;
    border: 1px solid #dfe4e8;
    padding: 0.6rem 0.9rem;
    text-decoration: none;
  }
  .save {
    border: 0;
    background: var(--gold);
    color: var(--heading);
    padding: 0.6rem 1rem;
    cursor: pointer;
  }
  .save:disabled {
    opacity: 0.55;
    cursor: wait;
  }
  .notice {
    padding: 0.85rem 1rem;
    border-radius: 0.7rem;
    margin-bottom: 1rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .notice.error {
    background: #fff0f0;
    color: #8f2929;
  }
  .notice.success {
    background: #eaf7ef;
    color: #276541;
  }
  .loading {
    min-height: 24rem;
    display: grid;
    place-items: center;
    align-content: center;
    color: var(--muted);
    gap: 0.6rem;
  }
  .spin {
    animation: spin 0.8s linear infinite;
  }
  .editor-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background: #fff;
    border: 1px solid #e1e6e9;
    border-radius: 0.9rem 0.9rem 0 0;
    padding: 1rem 1.2rem;
  }
  .editor-head b,
  .editor-head span {
    display: block;
  }
  .editor-head span {
    font-size: 0.78rem;
    color: var(--muted);
    margin-top: 0.2rem;
  }
  .editor-head button,
  .apply {
    border: 1px solid #dce2e6;
    background: #fff;
    color: var(--heading);
    padding: 0.55rem 0.8rem;
    cursor: pointer;
  }
  .form-editor,
  .json-editor {
    background: #fff;
    border: 1px solid #e1e6e9;
    border-top: 0;
    border-radius: 0 0 0.9rem 0.9rem;
    padding: clamp(1rem, 3vw, 2rem);
  }
  .form-editor {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.15rem 1.35rem;
  }
  .form-editor label {
    display: grid;
    gap: 0.4rem;
  }
  .form-editor label span {
    font-size: 0.78rem;
    font-weight: 750;
    color: #43566a;
  }
  .form-editor input,
  .form-editor textarea,
  .json-editor textarea {
    width: 100%;
    border: 1px solid #d6dde2;
    border-radius: 0.65rem;
    padding: 0.75rem 0.85rem;
    background: #fbfcfc;
    color: var(--text);
    outline: none;
  }
  .form-editor input {
    min-height: 2.8rem;
  }
  .form-editor input:focus,
  .form-editor textarea:focus,
  .json-editor textarea:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px #c7983620;
    background: #fff;
  }
  .json-warning {
    display: flex;
    gap: 0.8rem;
    background: #f7f2e6;
    color: #624c1c;
    padding: 1rem;
    border-radius: 0.7rem;
    margin-bottom: 1rem;
  }
  .json-warning p,
  .json-warning b,
  .json-warning span {
    display: block;
    margin: 0;
  }
  .json-warning span {
    font-size: 0.8rem;
    margin-top: 0.2rem;
  }
  .json-editor textarea {
    min-height: 32rem;
    font:
      13px/1.65 Consolas,
      monospace;
    resize: vertical;
  }
  .apply {
    margin-top: 1rem;
    background: var(--heading);
    color: #fff;
    border: 0;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  @media (max-width: 64rem) {
    .cms-shell {
      grid-template-columns: 1fr;
    }
    .cms-shell > aside {
      position: static;
      height: auto;
    }
    .brand {
      padding-block: 0.8rem;
    }
    nav {
      display: flex;
      overflow-x: auto;
      gap: 0.35rem;
      padding: 0.8rem 0 0;
    }
    nav button {
      min-width: 10rem;
    }
    .cms-shell header {
      flex-direction: column;
    }
    .header-actions {
      justify-content: flex-start;
    }
  }
  @media (max-width: 43rem) {
    .cms-shell > main {
      padding: 1rem;
    }
    .form-editor {
      grid-template-columns: 1fr;
    }
    .header-actions {
      width: 100%;
    }
    .save {
      flex: 1;
    }
  }
</style>
