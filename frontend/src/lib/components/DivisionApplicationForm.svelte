<script lang="ts">
  import { onMount, tick } from "svelte";
  import { toasts } from "$lib/toast";
  import { api } from "$lib/api";
  import { applicationForms, type ApplicationDivision } from "$lib/application-forms";
  import { fieldError } from "$lib/application-validation";
  import DocumentList from "./DocumentList.svelte";
  import PaymentPanel from "./PaymentPanel.svelte";
  import FormGuard from "./FormGuard.svelte";
  import { ArrowLeft, ArrowRight, Check, Clock, ShieldCheck } from "lucide-svelte";

  let { division }: { division: ApplicationDivision } = $props();
  let step = $state(0), form = $state<Record<string, any>>({}), sending = $state(false), error = $state(""), reference = $state("");
  // The message for each answer on the current step that needs attention.
  let errors = $state<Record<string, string>>({});
  const invalid = (key: string) => (errors[key] ? "true" : undefined);
  const describedBy = (key: string) => (errors[key] ? `field-${key}-error` : undefined);
  // The submitted application and the link that lets its sender attach documents.
  let submitted = $state<{ id: string; uploadToken: string; payToken: string; amountDue: string | null } | null>(null);
  let guard = $state<{ fields(): Record<string, string>; problem(): string; reset(): void }>();
  let config = $derived(applicationForms[division]);
  // Signed-in members can follow the application from their dashboard.
  let member = $state(false);
  let shell = $state<HTMLDivElement>();
  // Brings the top of the form (below the site header) into view.
  function showTop() {
    if (!shell) return;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: shell.getBoundingClientRect().top + window.scrollY - 110, behavior: calm ? "auto" : "smooth" });
  }
  let current = $derived(config.steps[step]);

  // Answers are kept for this browser tab, so a refresh or an accidental
  // navigation does not lose a long form. Closing the tab discards them.
  const draftKey = () => `bp_application_draft_${division}`;
  let draftReady = $state(false), restored = $state(false);
  onMount(() => {
    try { member = Boolean(localStorage.getItem("bp_token")); } catch { /* storage is blocked */ }
    try {
      const saved = JSON.parse(sessionStorage.getItem(draftKey()) || "null");
      if (saved?.form && Object.keys(saved.form).length) {
        form = saved.form;
        step = Math.min(Number(saved.step) || 0, config.steps.length - 1);
        restored = true;
      }
    } catch {
      // Storage is unavailable or the draft is unreadable: start empty.
    }
    draftReady = true;
  });
  $effect(() => {
    const draft = JSON.stringify({ form, step });
    if (!draftReady || reference) return;
    try { sessionStorage.setItem(draftKey(), draft); } catch { /* storage full or blocked */ }
  });
  function clearDraft() {
    try { sessionStorage.removeItem(draftKey()); } catch { /* nothing stored */ }
  }
  function startAgain() { form = {}; step = 0; error = ""; errors = {}; restored = false; clearDraft(); }

  function setValue(key: string, value: unknown) { form[key] = value; clearError(key); }
  function toggle(key: string, option: string) {
    const values = Array.isArray(form[key]) ? [...form[key]] : [];
    form[key] = values.includes(option) ? values.filter((item) => item !== option) : [...values, option];
    clearError(key);
  }
  // A corrected answer loses its message at once; the summary goes with the last one.
  function clearError(key: string) {
    if (!errors[key]) return;
    const { [key]: _, ...rest } = errors;
    errors = rest;
    if (!Object.keys(rest).length) error = "";
  }
  function continueForm(event: SubmitEvent) {
    event.preventDefault(); error = "";
    // Every answer that needs attention is marked under its field; the
    // summary at the top says how many, and focus goes to the first.
    const problems = current.fields
      .map((field) => [field.key, fieldError(field, form[field.key])] as const)
      .filter(([, problem]) => problem);
    errors = Object.fromEntries(problems);
    if (problems.length) {
      error = problems.length === 1 ? problems[0][1] : `Please check the ${problems.length} answers marked below.`;
      document.getElementById(`field-${problems[0][0]}`)?.focus();
      return;
    }
    if (step < config.steps.length - 1) { step += 1; showTop(); }
    else submit();
  }
  async function submit() {
    error = guard?.problem() ?? ""; if (error) return;
    sending = true;
    try {
      const result = await api<{ id: string; reference: string; uploadToken: string; payToken: string; amountDue: string | null }>("/applications", { method: "POST", body: JSON.stringify({ division, type: division, fullName: form.fullName, email: form.email, phone: form.phone, details: form, ...guard?.fields() }) });
      submitted = { id: result.id, uploadToken: result.uploadToken, payToken: result.payToken, amountDue: result.amountDue };
      reference = result.reference;
      clearDraft();
      // The confirmation replaces a long form: say so at once, and bring it
      // into view instead of leaving the customer at the bottom of the page.
      toasts.show("Application submitted successfully", { detail: `Your reference number is ${result.reference}.` });
      await tick();
      showTop();
      shell?.querySelector<HTMLElement>(".complete h2")?.focus({ preventScroll: true });
    } catch (e) { error = e instanceof Error ? e.message : "The application could not be submitted."; }
    finally { sending = false; guard?.reset(); }
  }
</script>

{#snippet fieldProblem(key: string)}{#if errors[key]}<small class="field-error" id={`field-${key}-error`} role="alert">{errors[key]}</small>{/if}{/snippet}

<div class="application-shell" bind:this={shell}>
  {#if reference}
    <section class="complete" aria-live="polite"><i><Check size={30}/></i><span>APPLICATION SUBMITTED</span><h2 tabindex="-1">Thank you, {form.fullName}.</h2><p>Your reference number is <strong>{reference}</strong>. Keep it for future communication with Bengal Port.</p>{#if submitted?.amountDue}<div class="attach"><PaymentPanel applicationId={submitted.id} token={submitted.payToken} quiet title="Pay now with bKash (optional)" /></div>{/if}{#if submitted}<div class="attach"><h3>Attach your documents <small>(optional)</small></h3><p>Passport copy, photograph, certificates or medical reports help us process your application faster. You can also send them to our team later.</p><DocumentList applicationId={submitted.id} uploadToken={submitted.uploadToken} canAttach /></div>{/if}<div class="finished"><p class="submitted"><span class="tick"><Check size={15}/></span> Your application has been submitted successfully.</p><p class="after">{member ? "You can follow its progress from your dashboard." : "Our team will contact you. Keep your reference number; you can close this page."}</p><div class="next">{#if member}<a class="btn" href="/dashboard">VIEW MY APPLICATIONS</a>{/if}<a class="plain" href="/">Back to home</a></div></div></section>
  {:else}
    <header class="form-header"><div><span>{division} APPLICATION</span><h2>{config.title}</h2><p>{config.intro}</p><p class="meta"><Clock size={15}/><span>About {config.minutes} minutes in {config.steps.length} steps. Your answers stay in this tab until you submit.</span></p></div><ShieldCheck size={30}/></header>
    <nav class="progress" aria-label="Application progress">{#each config.steps as item, index}<button type="button" class:active={index===step} class:done={index<step} onclick={() => index < step && (step=index)} aria-current={index===step?"step":undefined}><i>{index<step?"✓":index+1}</i><span>{item.title}</span></button>{/each}</nav>
    <form onsubmit={continueForm} novalidate>
      <div class="step-heading"><span>STEP {step+1} OF {config.steps.length}</span><h3>{current.title}</h3><p>{current.description}</p>{#if current.note}<p class="why"><ShieldCheck size={17}/><span>{current.note}</span></p>{/if}</div>
      {#if restored}<p class="form-note">We restored the answers you entered earlier in this tab. <button type="button" onclick={startAgain}>Start again</button></p>{/if}
      {#if error}<p class="form-error" role="alert">{error}</p>{/if}
      <div class="fields">
        {#each current.fields as field}
          {#if field.section}<h4 class="group-title">{field.section}</h4>{/if}
          <div class:wide={field.type==="textarea"||field.type==="multi"||field.type==="checkbox"} class:consent={field.type==="checkbox"} class="field">
            {#if field.type === "multi"}
              <fieldset id={`field-${field.key}`} tabindex="-1" aria-invalid={invalid(field.key)} aria-describedby={describedBy(field.key)}><legend>{field.label}{field.required?" *":""}</legend><div class="choices">{#each field.options||[] as option}<label><input type="checkbox" checked={(form[field.key]||[]).includes(option)} onchange={() => toggle(field.key,option)}/><span>{option}</span></label>{/each}</div></fieldset>{@render fieldProblem(field.key)}
            {:else if field.type === "checkbox"}
              <label class="check"><input id={`field-${field.key}`} type="checkbox" aria-invalid={invalid(field.key)} aria-describedby={describedBy(field.key)} checked={form[field.key]===true} onchange={(e)=>setValue(field.key,e.currentTarget.checked)}/><span>{field.label} *</span></label>{@render fieldProblem(field.key)}
            {:else}
              <label for={`field-${field.key}`}>{field.label}{field.required?" *":""}</label>
              {#if field.type === "textarea"}<textarea id={`field-${field.key}`} rows="4" aria-invalid={invalid(field.key)} aria-describedby={describedBy(field.key)} value={form[field.key]||""} oninput={(e)=>setValue(field.key,e.currentTarget.value)}></textarea>
              {:else if field.type === "select"}<select id={`field-${field.key}`} aria-invalid={invalid(field.key)} aria-describedby={describedBy(field.key)} value={form[field.key]||""} onchange={(e)=>setValue(field.key,e.currentTarget.value)}><option value="">Select an option</option>{#each field.options||[] as option}<option value={option}>{option}</option>{/each}</select>
              {:else}<input id={`field-${field.key}`} type={field.type||"text"} aria-invalid={invalid(field.key)} aria-describedby={describedBy(field.key)} min={field.type==="number"?0:undefined} value={form[field.key]||""} oninput={(e)=>setValue(field.key,e.currentTarget.value)}/>{/if}
              {#if field.hint}<small>{field.hint}</small>{/if}
              {@render fieldProblem(field.key)}
            {/if}
          </div>
        {/each}
      </div>
      {#if step===config.steps.length-1}<FormGuard bind:this={guard} />{/if}<p class="legal-note">Your details are handled as described in our <a href="/privacy" target="_blank">Privacy Policy</a> and <a href="/terms" target="_blank">Terms of Use</a>.</p>
      <div class="actions">{#if step>0}<button type="button" class="secondary" onclick={()=>{step-=1;error="";errors={}}}><ArrowLeft size={17}/> BACK</button>{/if}<button class="primary" disabled={sending}>{sending?"SUBMITTING...":step===config.steps.length-1?"SUBMIT APPLICATION":"SAVE & CONTINUE"}<ArrowRight size={17}/></button></div>
    </form>
  {/if}
</div>

<style>
  .application-shell{max-width:68rem;margin:auto;background:#fff;border:1px solid #e1e7e9;border-radius:1.25rem;box-shadow:0 1rem 3rem rgba(23,48,79,.09);overflow:hidden}.form-header{display:flex;justify-content:space-between;gap:1.5rem;padding:clamp(1.35rem,4vw,2.5rem);background:linear-gradient(135deg,#143451,#1c476b);color:#fff}.form-header span,.step-heading>span,.complete>span{font-size:.7rem;letter-spacing:.14em;font-weight:800;color:#e2b753}.form-header h2{margin:.45rem 0 .5rem;font-size:clamp(1.45rem,4vw,2.2rem);line-height:1.15}.form-header p{max-width:43rem;margin:0;color:#d6e1e8;line-height:1.6}.form-header>svg{flex:none;color:#e2b753}.progress{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));padding:1.2rem clamp(1rem,4vw,2.5rem);border-bottom:1px solid #e7ebed}.progress button{position:relative;border:0;background:none;color:#7a8893;padding:.3rem;cursor:pointer}.progress button:not(:last-child):after{content:"";position:absolute;top:1.25rem;left:calc(50% + 1.25rem);right:calc(-50% + 1.25rem);height:1px;background:#dce3e6}.progress i{position:relative;z-index:1;display:grid;place-items:center;width:2.5rem;height:2.5rem;margin:auto;border-radius:50%;background:#edf1f2;font-style:normal;font-weight:800}.progress span{display:block;margin-top:.5rem;font-size:.72rem}.progress .active i,.progress .done i{background:#d2a342;color:#17304f}.progress .active span{color:#17304f;font-weight:800}.application-shell form{padding:clamp(1.25rem,4vw,2.5rem)}.step-heading{margin-bottom:1.6rem}.step-heading h3{margin:.35rem 0;font-size:1.45rem;color:#17304f}.step-heading p{margin:0;color:#687a89}.fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1.15rem}.field{display:grid;gap:.45rem}.field.wide{grid-column:1/-1}.field>label,legend{color:#29465f;font-size:.82rem;font-weight:750}input,select,textarea{width:100%;min-height:3rem;border:1px solid #d6dfe2;border-radius:.7rem;background:#fbfcfc;padding:.7rem .85rem;color:#263c50;outline:none}textarea{resize:vertical;line-height:1.55}input:focus,select:focus,textarea:focus,fieldset:focus{border-color:#bf8e2d;box-shadow:0 0 0 .2rem rgba(199,152,54,.14)}fieldset{margin:0;padding:1rem;border:1px solid #dce3e5;border-radius:.8rem}.choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem;margin-top:.8rem}.choices label,.check{display:flex;align-items:flex-start;gap:.65rem;min-height:2.75rem;padding:.65rem .75rem;border:1px solid #e2e7e9;border-radius:.65rem;background:#f8faf9;color:#40576b;font-size:.82rem;line-height:1.4}.choices input,.check input{width:1.1rem;min-height:1.1rem;height:1.1rem;margin:.08rem 0 0;accent-color:#b78320;flex:none}.consent+.consent{margin-top:-.55rem}.form-error{padding:.8rem 1rem;border-radius:.7rem;background:#fff0f0;color:#943d45}.form-note{padding:.8rem 1rem;border-radius:.7rem;background:#f1f6f9;color:#40576b;font-size:.86rem}.form-note button{border:0;background:none;padding:0;color:#9b6b16;font-weight:750;text-decoration:underline;cursor:pointer}.actions{display:flex;justify-content:flex-end;gap:.75rem;margin-top:2rem;padding-top:1.4rem;border-top:1px solid #e4e9eb}.actions button{display:flex;align-items:center;justify-content:center;gap:.55rem;min-height:3rem;border-radius:1.6rem;padding:.7rem 1.2rem;font-weight:800;transition:transform 150ms cubic-bezier(.23,1,.32,1),background-color 180ms ease}.actions button:active{transform:scale(.97)}.primary{border:0;background:#d0a03d;color:#17304f}.secondary{border:1px solid #d7dfe2;background:#fff;color:#40566a}.complete{padding:clamp(2rem,7vw,5rem);text-align:center}.complete i{display:grid;place-items:center;width:4.5rem;height:4.5rem;margin:0 auto 1.3rem;border-radius:50%;background:#eaf6ef;color:#2f7650}.complete h2{font-size:clamp(1.8rem,5vw,2.8rem);color:#17304f;margin:.6rem 0}.complete p{max-width:38rem;margin:0 auto 1.5rem;color:#687986;line-height:1.7}.complete strong{color:#17304f}.attach{max-width:34rem;margin:0 auto 1.8rem;padding:1.2rem;border:1px solid #e1e7e9;border-radius:1rem;background:#f8faf9;text-align:left}.attach h3{margin:0 0 .3rem;font-size:1.05rem;color:#17304f}.attach h3 small{font-weight:500;color:#748391}.attach p{margin:0 0 .9rem;font-size:.86rem;line-height:1.55;color:#687986}.complete h2:focus{outline:none}.finished{max-width:34rem;margin:0 auto;padding-top:1.4rem;border-top:1px solid #e4e9eb}.complete p.submitted{display:inline-flex;align-items:center;gap:.65rem;max-width:100%;margin:0 auto .7rem;padding:.7rem 1.2rem .7rem .8rem;border-radius:1.4rem;background:#eaf6ef;color:#256645;font-weight:750;line-height:1.35;text-align:left}.tick{flex:none;display:grid;place-items:center;width:1.7rem;height:1.7rem;border-radius:50%;background:#2f9a63;color:#fff}.complete p.after{margin:0 auto 1.1rem;font-size:.9rem}.next{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.8rem 1.4rem}.next .plain{color:#9b6b16;font-weight:750}.legal-note{margin:1.4rem 0 0;font-size:.8rem;color:#6b7b88}.legal-note a{color:#9b6b16;font-weight:700}.form-header .meta{display:flex;align-items:flex-start;gap:.5rem;margin:.9rem 0 0;font-size:.82rem;line-height:1.45;color:#c9d5e2}.form-header .meta :global(svg){flex:none;margin-top:.15rem;color:#e2b753}.why{display:flex;gap:.6rem;align-items:flex-start;margin:1rem 0 0;padding:.8rem 1rem;border-radius:.7rem;background:#fbf5e8;color:#5b4a22;font-size:.86rem;line-height:1.5}.why :global(svg){flex:none;margin-top:.1rem;color:#a87618}.group-title{grid-column:1/-1;margin:.8rem 0 -.3rem;padding-bottom:.45rem;border-bottom:1px solid #e7ebed;font-size:1rem;font-weight:800;letter-spacing:-.01em;color:#17304f}.group-title:first-child{margin-top:0}.field-error{margin:0;font-size:.8rem;font-weight:600;line-height:1.4;color:#b42318}.field [aria-invalid="true"]{border-color:#d9342b;box-shadow:0 0 0 .2rem rgba(217,52,43,.14)}@media(hover:hover) and (pointer:fine){.primary:hover{background:#dfb757;transform:translateY(-.1rem)}.secondary:hover{background:#f4f6f6}}@media(max-width:42rem){.form-header{align-items:flex-start}.form-header>svg{display:none}.progress{display:flex;gap:.4rem;padding:1rem 1rem 0;border-bottom:0}.progress button{flex:1;height:.4rem;padding:0;border-radius:99px;background:#e4e9eb}.progress button:after,.progress i,.progress span{display:none}.progress .active,.progress .done{background:#d2a342}.application-shell form{padding-inline:1rem}.fields{grid-template-columns:1fr;gap:1rem}.field.wide{grid-column:auto}.choices{grid-template-columns:1fr}.actions{flex-direction:column-reverse}.actions button{width:100%}}@media(max-width:25rem){.form-header{padding:1.2rem}.application-shell{border-radius:1rem}}@media(prefers-reduced-motion:reduce){.actions button{transition-duration:.01ms}}
</style>
