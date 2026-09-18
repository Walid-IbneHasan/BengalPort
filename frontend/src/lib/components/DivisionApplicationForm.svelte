<script lang="ts">
  import { api } from "$lib/api";
  import { applicationForms, type ApplicationDivision, type ApplicationField } from "$lib/application-forms";
  import { ArrowLeft, ArrowRight, Check, ShieldCheck } from "lucide-svelte";

  let { division }: { division: ApplicationDivision } = $props();
  let step = $state(0), form = $state<Record<string, any>>({}), sending = $state(false), error = $state(""), reference = $state("");
  let config = $derived(applicationForms[division]);
  let current = $derived(config.steps[step]);

  function setValue(key: string, value: unknown) { form[key] = value; }
  function toggle(key: string, option: string) {
    const values = Array.isArray(form[key]) ? [...form[key]] : [];
    form[key] = values.includes(option) ? values.filter((item) => item !== option) : [...values, option];
  }
  function valid(field: ApplicationField) {
    if (!field.required) return true;
    const value = form[field.key];
    return field.type === "multi" ? Array.isArray(value) && value.length > 0 : field.type === "checkbox" ? value === true : String(value ?? "").trim().length > 0;
  }
  function continueForm(event: SubmitEvent) {
    event.preventDefault(); error = "";
    const missing = current.fields.find((field) => !valid(field));
    if (missing) { error = `Please complete “${missing.label}”.`; document.getElementById(`field-${missing.key}`)?.focus(); return; }
    if (step < config.steps.length - 1) { step += 1; window.scrollTo({ top: document.querySelector(".application-shell")?.getBoundingClientRect().top! + window.scrollY - 110, behavior: "smooth" }); }
    else submit();
  }
  async function submit() {
    sending = true; error = "";
    try {
      const result = await api<{ reference: string }>("/applications", { method: "POST", body: JSON.stringify({ division, type: division, fullName: form.fullName, email: form.email, phone: form.phone, details: form }) });
      reference = result.reference;
    } catch (e) { error = e instanceof Error ? e.message : "The application could not be submitted."; }
    finally { sending = false; }
  }
</script>

<div class="application-shell">
  {#if reference}
    <section class="complete" aria-live="polite"><i><Check size={30}/></i><span>APPLICATION RECEIVED</span><h2>Thank you, {form.fullName}.</h2><p>Your reference number is <strong>{reference}</strong>. Keep it for future communication with Bengal Port.</p><a class="btn" href="/">RETURN HOME</a></section>
  {:else}
    <header class="form-header"><div><span>{division} APPLICATION</span><h2>{config.title}</h2><p>{config.intro}</p></div><ShieldCheck size={30}/></header>
    <nav class="progress" aria-label="Application progress">{#each config.steps as item, index}<button type="button" class:active={index===step} class:done={index<step} onclick={() => index < step && (step=index)} aria-current={index===step?"step":undefined}><i>{index<step?"✓":index+1}</i><span>{item.title}</span></button>{/each}</nav>
    <form onsubmit={continueForm} novalidate>
      <div class="step-heading"><span>STEP {step+1} OF {config.steps.length}</span><h3>{current.title}</h3><p>{current.description}</p></div>
      {#if error}<p class="form-error" role="alert">{error}</p>{/if}
      <div class="fields">
        {#each current.fields as field}
          <div class:wide={field.type==="textarea"||field.type==="multi"||field.type==="checkbox"} class:consent={field.type==="checkbox"} class="field">
            {#if field.type === "multi"}
              <fieldset id={`field-${field.key}`} tabindex="-1"><legend>{field.label}{field.required?" *":""}</legend><div class="choices">{#each field.options||[] as option}<label><input type="checkbox" checked={(form[field.key]||[]).includes(option)} onchange={() => toggle(field.key,option)}/><span>{option}</span></label>{/each}</div></fieldset>
            {:else if field.type === "checkbox"}
              <label class="check"><input id={`field-${field.key}`} type="checkbox" checked={form[field.key]===true} onchange={(e)=>setValue(field.key,e.currentTarget.checked)}/><span>{field.label} *</span></label>
            {:else}
              <label for={`field-${field.key}`}>{field.label}{field.required?" *":""}</label>
              {#if field.type === "textarea"}<textarea id={`field-${field.key}`} rows="4" value={form[field.key]||""} oninput={(e)=>setValue(field.key,e.currentTarget.value)}></textarea>
              {:else if field.type === "select"}<select id={`field-${field.key}`} value={form[field.key]||""} onchange={(e)=>setValue(field.key,e.currentTarget.value)}><option value="">Select an option</option>{#each field.options||[] as option}<option value={option}>{option}</option>{/each}</select>
              {:else}<input id={`field-${field.key}`} type={field.type||"text"} min={field.type==="number"?0:undefined} value={form[field.key]||""} oninput={(e)=>setValue(field.key,e.currentTarget.value)}/>{/if}
              {#if field.hint}<small>{field.hint}</small>{/if}
            {/if}
          </div>
        {/each}
      </div>
      <div class="actions">{#if step>0}<button type="button" class="secondary" onclick={()=>{step-=1;error=""}}><ArrowLeft size={17}/> BACK</button>{/if}<button class="primary" disabled={sending}>{sending?"SUBMITTING...":step===config.steps.length-1?"SUBMIT APPLICATION":"SAVE & CONTINUE"}<ArrowRight size={17}/></button></div>
    </form>
  {/if}
</div>

<style>
  .application-shell{max-width:68rem;margin:auto;background:#fff;border:1px solid #e1e7e9;border-radius:1.25rem;box-shadow:0 1rem 3rem rgba(23,48,79,.09);overflow:hidden}.form-header{display:flex;justify-content:space-between;gap:1.5rem;padding:clamp(1.35rem,4vw,2.5rem);background:linear-gradient(135deg,#143451,#1c476b);color:#fff}.form-header span,.step-heading>span,.complete>span{font-size:.7rem;letter-spacing:.14em;font-weight:800;color:#e2b753}.form-header h2{margin:.45rem 0 .5rem;font-size:clamp(1.45rem,4vw,2.2rem);line-height:1.15}.form-header p{max-width:43rem;margin:0;color:#d6e1e8;line-height:1.6}.form-header>svg{flex:none;color:#e2b753}.progress{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:1.2rem clamp(1rem,4vw,2.5rem);border-bottom:1px solid #e7ebed}.progress button{position:relative;border:0;background:none;color:#7a8893;padding:.3rem;cursor:pointer}.progress button:not(:last-child):after{content:"";position:absolute;top:1.25rem;left:calc(50% + 1.25rem);right:calc(-50% + 1.25rem);height:1px;background:#dce3e6}.progress i{position:relative;z-index:1;display:grid;place-items:center;width:2.5rem;height:2.5rem;margin:auto;border-radius:50%;background:#edf1f2;font-style:normal;font-weight:800}.progress span{display:block;margin-top:.5rem;font-size:.72rem}.progress .active i,.progress .done i{background:#d2a342;color:#17304f}.progress .active span{color:#17304f;font-weight:800}.application-shell form{padding:clamp(1.25rem,4vw,2.5rem)}.step-heading{margin-bottom:1.6rem}.step-heading h3{margin:.35rem 0;font-size:1.45rem;color:#17304f}.step-heading p{margin:0;color:#687a89}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.15rem}.field{display:grid;gap:.45rem}.field.wide{grid-column:1/-1}.field>label,legend{color:#29465f;font-size:.82rem;font-weight:750}input,select,textarea{width:100%;min-height:3rem;border:1px solid #d6dfe2;border-radius:.7rem;background:#fbfcfc;padding:.7rem .85rem;color:#263c50;outline:none}textarea{resize:vertical;line-height:1.55}input:focus,select:focus,textarea:focus,fieldset:focus{border-color:#bf8e2d;box-shadow:0 0 0 .2rem rgba(199,152,54,.14)}fieldset{margin:0;padding:1rem;border:1px solid #dce3e5;border-radius:.8rem}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;margin-top:.8rem}.choices label,.check{display:flex;align-items:flex-start;gap:.65rem;min-height:2.75rem;padding:.65rem .75rem;border:1px solid #e2e7e9;border-radius:.65rem;background:#f8faf9;color:#40576b;font-size:.82rem;line-height:1.4}.choices input,.check input{width:1.1rem;min-height:1.1rem;height:1.1rem;margin:.08rem 0 0;accent-color:#b78320;flex:none}.consent+.consent{margin-top:-.55rem}.form-error{padding:.8rem 1rem;border-radius:.7rem;background:#fff0f0;color:#943d45}.actions{display:flex;justify-content:flex-end;gap:.75rem;margin-top:2rem;padding-top:1.4rem;border-top:1px solid #e4e9eb}.actions button{display:flex;align-items:center;justify-content:center;gap:.55rem;min-height:3rem;border-radius:1.6rem;padding:.7rem 1.2rem;font-weight:800;transition:transform 150ms cubic-bezier(.23,1,.32,1),background-color 180ms ease}.actions button:active{transform:scale(.97)}.primary{border:0;background:#d0a03d;color:#17304f}.secondary{border:1px solid #d7dfe2;background:#fff;color:#40566a}.complete{padding:clamp(2rem,7vw,5rem);text-align:center}.complete i{display:grid;place-items:center;width:4.5rem;height:4.5rem;margin:0 auto 1.3rem;border-radius:50%;background:#eaf6ef;color:#2f7650}.complete h2{font-size:clamp(1.8rem,5vw,2.8rem);color:#17304f;margin:.6rem 0}.complete p{max-width:38rem;margin:0 auto 1.5rem;color:#687986;line-height:1.7}.complete strong{color:#17304f}@media(hover:hover) and (pointer:fine){.primary:hover{background:#dfb757;transform:translateY(-.1rem)}.secondary:hover{background:#f4f6f6}}@media(max-width:42rem){.form-header{align-items:flex-start}.form-header>svg{display:none}.progress{padding-inline:.5rem}.progress span{font-size:.62rem;line-height:1.25}.application-shell form{padding-inline:1rem}.fields{grid-template-columns:1fr;gap:1rem}.field.wide{grid-column:auto}.choices{grid-template-columns:1fr}.actions{flex-direction:column-reverse}.actions button{width:100%}}@media(max-width:25rem){.progress span{font-size:0}.progress{padding-block:.85rem}.progress i{width:2.35rem;height:2.35rem}.form-header{padding:1.2rem}.application-shell{border-radius:1rem}}@media(prefers-reduced-motion:reduce){.actions button{transition-duration:.01ms}}
</style>
