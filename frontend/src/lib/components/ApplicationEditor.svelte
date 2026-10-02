<script lang="ts">
  import { api } from "$lib/api";
  import { editBody, editProblem, editSteps, editValues } from "$lib/application-edit";

  // Admin: correct what an applicant told us. The declarations they ticked,
  // the reference, the status and the amount due are not edited here.
  type Application = { id: string; type: string; fullName: string; email: string; phone: string; details?: Record<string, unknown> | null };
  let { application, onsaved, oncancel }: { application: Application; onsaved: (updated: Application) => void; oncancel: () => void } = $props();
  // The editor is created afresh for each application, so it starts from the
  // application it was given and does not follow later changes to it.
  // svelte-ignore state_referenced_locally
  let values = $state<Record<string, any>>(editValues(application));
  let saving = $state(false), error = $state("");
  // svelte-ignore state_referenced_locally
  const steps = editSteps(application.type);

  function toggle(key: string, option: string) {
    const chosen = Array.isArray(values[key]) ? values[key] : [];
    values[key] = chosen.includes(option) ? chosen.filter((item: string) => item !== option) : [...chosen, option];
  }

  async function save() {
    error = editProblem(application.type, values);
    if (error) return;
    saving = true;
    try {
      onsaved(await api<Application>(`/admin/resources/applications/${application.id}`, { method: "PUT", body: JSON.stringify(editBody(application, values)) }));
    } catch (e) {
      error = e instanceof Error ? e.message : "The changes could not be saved.";
    } finally {
      saving = false;
    }
  }
</script>

<form class="editor" novalidate onsubmit={(e) => { e.preventDefault(); save(); }}>
  <p class="intro">Correct the applicant's answers. Only the name, email and phone are required; the applicant is not notified.</p>
  {#each steps as step}
    <fieldset>
      <legend>{step.title}</legend>
      <div class="fields">
        {#each step.fields as field}
          <div class="field" class:wide={field.type === "textarea" || field.type === "multi"}>
            {#if field.type === "multi"}
              <span class="label">{field.label}</span>
              <div class="choices">
                {#each field.options || [] as option}
                  <label><input type="checkbox" checked={(values[field.key] || []).includes(option)} onchange={() => toggle(field.key, option)} /><span>{option}</span></label>
                {/each}
              </div>
            {:else}
              <label class="label" for={`edit-${field.key}`}>{field.label}</label>
              {#if field.type === "textarea"}
                <textarea id={`edit-${field.key}`} rows="3" bind:value={values[field.key]}></textarea>
              {:else if field.type === "select"}
                <select id={`edit-${field.key}`} bind:value={values[field.key]}>
                  <option value="">Not answered</option>
                  {#each field.options || [] as option}<option value={option}>{option}</option>{/each}
                  {#if values[field.key] && !(field.options || []).includes(values[field.key])}<option value={values[field.key]}>{values[field.key]}</option>{/if}
                </select>
              {:else}
                <input id={`edit-${field.key}`} type={field.type === "number" ? "text" : field.type || "text"} inputmode={field.type === "number" ? "decimal" : undefined} bind:value={values[field.key]} />
              {/if}
            {/if}
          </div>
        {/each}
      </div>
    </fieldset>
  {/each}
  {#if error}<p class="problem" role="alert">{error}</p>{/if}
  <footer>
    <button type="button" class="cancel" onclick={oncancel}>Cancel</button>
    <button class="save" disabled={saving}>{saving ? "Saving…" : "Save changes"}</button>
  </footer>
</form>

<style>
  .editor{display:grid;gap:1rem}
  .intro{margin:0;font-size:.78rem;line-height:1.5;color:#6d7b89}
  fieldset{margin:0;padding:1rem 1.1rem;background:#fff;border:1px solid #e0e5e8;border-radius:.8rem;min-width:0}
  legend{padding:0 .4rem;font-size:.7rem;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:var(--gold-deep)}
  .fields{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
  .field{display:grid;gap:.35rem;align-content:start;min-width:0}
  .field.wide{grid-column:1/-1}
  .label{font-size:.72rem;font-weight:750;color:#405267;line-height:1.35}
  input:not([type="checkbox"]),select,textarea{width:100%;min-height:2.5rem;border:1px solid #d6dde2;border-radius:.6rem;padding:.55rem .7rem;background:#fff;outline:none;font-size:.82rem}
  textarea{resize:vertical;line-height:1.5}
  input:focus,select:focus,textarea:focus{border-color:var(--gold);box-shadow:0 0 0 3px #c7983620}
  .choices{display:grid;grid-template-columns:1fr 1fr;gap:.4rem}
  .choices label{display:flex;align-items:flex-start;gap:.5rem;font-size:.78rem;color:#40576b;line-height:1.4}
  .choices input{width:1.05rem;height:1.05rem;min-height:1.05rem;margin:.1rem 0 0;accent-color:#b78320;flex:none}
  .problem{margin:0;padding:.6rem .8rem;border-radius:.6rem;background:#fff0f0;color:#922f2f;font-size:.8rem}
  footer{position:sticky;bottom:-1.5rem;display:flex;justify-content:flex-end;gap:.6rem;margin:0 -1.5rem -1.5rem;padding:.9rem 1.5rem;background:#fff;border-top:1px solid #e0e5e8}
  .cancel{border:1px solid #d7dde2;background:#fff;border-radius:.7rem;padding:.6rem 1rem;cursor:pointer}
  .save{border:0;background:var(--gold);color:var(--heading);border-radius:.7rem;padding:.6rem 1.1rem;font-weight:750;cursor:pointer}
  .save:disabled{opacity:.55}
  @media(max-width:43rem){.fields,.choices{grid-template-columns:1fr}}
</style>
