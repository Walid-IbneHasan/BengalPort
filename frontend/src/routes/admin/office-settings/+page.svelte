<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { confirmAction } from "$lib/confirm";
  import { toasts } from "$lib/toast";
  import { day, officeMe, officePermissions, ROLE_LABELS } from "$lib/office";
  import { imageUrl, uploadForm } from "$lib/office-files";
  import { documentsContentFrom } from "$lib/documents-content";
  import { ACTION_LABELS, isSensitive, parseCurrencies, parseDays, RESOURCE_LABELS, sortActions } from "$lib/permission-labels";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import StatusPill from "$lib/components/StatusPill.svelte";
  import { Building2, KeyRound, PenLine, Plus, ShieldAlert, SlidersHorizontal, UsersRound } from "lucide-svelte";

  // The Super Admin's controls: branches, each member of staff's role and
  // branch, what each role may do, the authority signature printed on
  // invoices, and the reminder rules and invoice terms.
  type Tab = "staff" | "roles" | "branches" | "signatures" | "rules";
  type Branch = { id: string; code: string; name: string; address: string | null; phone: string | null; active: boolean; _count?: { users: number; customers: number } };
  type Staff = { id: string; name: string; email: string; role: string; branchId: string | null; allBranches: boolean; branch: { name: string } | null };
  type Cell = { allowed: boolean; changed: boolean; byDefault: boolean };
  type Matrix = { resources: Record<string, string[]>; roles: { role: string; permissions: Record<string, Cell> }[] };
  type Signature = { id: string; label: string; ownerName: string; ownerTitle: string | null; active: boolean; uploadedByName: string | null; createdAt: string; retiredAt: string | null };
  type Settings = { documentExpiryDays: number[]; paymentReminderDays: number[]; dealDeadlineDays: number[]; invoiceTerms: string; currencies: string[] };

  const TABS: { key: Tab; label: string; need: string; icon: any }[] = [
    { key: "staff", label: "Staff", need: "users.update", icon: UsersRound },
    { key: "roles", label: "Roles and permissions", need: "roles.update", icon: KeyRound },
    { key: "branches", label: "Branches", need: "branches.update", icon: Building2 },
    { key: "signatures", label: "Signature", need: "signature.update", icon: PenLine },
    { key: "rules", label: "Reminders and terms", need: "settings.update", icon: SlidersHorizontal },
  ];
  const STAFF_ROLES = ["EMPLOYEE", "ACCOUNTANT", "MANAGER", "MODERATOR", "ADMIN"];

  const may = (permission: string) => $officePermissions.has(permission);
  let tabs = $derived(TABS.filter((item) => may(item.need)));
  let tab = $state<Tab>((page.url.searchParams.get("tab") as Tab) || "staff");
  $effect(() => {
    if (tabs.length && !tabs.some((item) => item.key === tab)) tab = tabs[0].key;
  });

  function choose(next: Tab) {
    tab = next;
    goto(`?tab=${next}`, { replaceState: true, noScroll: true, keepFocus: true });
    loadTab();
  }

  // ---- Staff -----------------------------------------------------------------
  let staff = $state<Staff[]>([]),
    branches = $state<Branch[]>([]),
    staffProblem = $state<Record<string, string>>({}),
    savingStaff = $state("");

  async function loadPeople() {
    const [people, places] = await Promise.all([api<Staff[]>("/office/staff"), api<Branch[]>("/office/branches")]);
    staff = people;
    branches = places;
  }

  // Saves one change; answers whether it was saved, so a refused or
  // abandoned change can put the control back as it was.
  async function saveStaff(person: Staff, change: Partial<Pick<Staff, "role" | "branchId" | "allBranches">>): Promise<boolean> {
    if (change.role && change.role !== person.role) {
      const yes = await confirmAction({
        title: `Make ${person.name} ${ROLE_LABELS[change.role]}?`,
        message: `What ${person.name} may see and do changes to the ${ROLE_LABELS[change.role]} permissions. They are signed out and sign in again with the new role. The change is recorded in the audit log.`,
        confirmLabel: "Change role",
        tone: change.role === "ADMIN" ? "danger" : "default",
      });
      if (!yes) return false;
    }
    savingStaff = person.id;
    staffProblem = { ...staffProblem, [person.id]: "" };
    try {
      await api(`/office/staff/${person.id}`, { method: "PUT", body: JSON.stringify(change) });
      toasts.show(`${person.name}: saved`);
      await loadPeople();
      return true;
    } catch (e) {
      staffProblem = { ...staffProblem, [person.id]: problemText(e, "Not saved") };
      return false;
    } finally {
      savingStaff = "";
    }
  }

  // ---- Roles and permissions -------------------------------------------------
  let matrix = $state<Matrix | null>(null),
    roleShown = $state("MANAGER"),
    cellProblem = $state(""),
    busyCell = $state("");
  let shownRole = $derived(matrix?.roles.find((row) => row.role === roleShown) ?? null);
  let changedCount = $derived(shownRole ? Object.values(shownRole.permissions).filter((cell) => cell.changed).length : 0);
  const groups = [
    { key: "office", label: "Office" },
    { key: "website", label: "Website" },
    { key: "control", label: "Running the admin" },
  ] as const;

  async function loadMatrix() {
    matrix = await api<Matrix>("/office/roles");
  }

  async function setPermission(permission: string, allowed: boolean) {
    if (!shownRole) return;
    const cell = shownRole.permissions[permission];
    const before = { ...cell };
    cell.allowed = allowed;
    cell.changed = allowed !== cell.byDefault;
    busyCell = permission;
    cellProblem = "";
    try {
      await api("/office/roles", { method: "PUT", body: JSON.stringify({ role: roleShown, permission, allowed }) });
    } catch (e) {
      Object.assign(cell, before);
      cellProblem = problemText(e, "That permission was not changed");
    } finally {
      busyCell = "";
    }
  }

  async function resetRole() {
    if (!shownRole) return;
    const changed = Object.entries(shownRole.permissions).filter(([, cell]) => cell.changed);
    if (!(await confirmAction({ title: `Put ${ROLE_LABELS[roleShown]} back to the standard permissions?`, message: `${changed.length} change${changed.length === 1 ? "" : "s"} you made for this role are undone.`, confirmLabel: "Put back", tone: "default" }))) return;
    for (const [permission, cell] of changed) await setPermission(permission, cell.byDefault);
    toasts.show(`${ROLE_LABELS[roleShown]} has the standard permissions again`);
  }

  // ---- Branches ----------------------------------------------------------------
  type BranchDraft = { id?: string; code: string; name: string; address: string; phone: string; active: boolean };
  let branchDraft = $state<BranchDraft | null>(null),
    branchProblem = $state(""),
    savingBranch = $state(false);

  async function saveBranch(event: SubmitEvent) {
    event.preventDefault();
    if (!branchDraft) return;
    savingBranch = true;
    branchProblem = "";
    const { id, ...body } = branchDraft;
    try {
      await api(id ? `/office/branches/${id}` : "/office/branches", { method: id ? "PUT" : "POST", body: JSON.stringify(body) });
      toasts.show(id ? "Branch saved" : "Branch added");
      branchDraft = null;
      await loadPeople();
    } catch (e) {
      branchProblem = problemText(e, "The branch was not saved");
    } finally {
      savingBranch = false;
    }
  }

  // ---- Signatures --------------------------------------------------------------
  let signatures = $state<Signature[]>([]),
    pictures = $state<Record<string, string>>({}),
    sigForm = $state({ ownerName: "", ownerTitle: "", label: "Authority signature" }),
    sigFile = $state<File | null>(null),
    sigPreview = $state(""),
    sigProblem = $state(""),
    uploading = $state(false);

  // The owner's signature saved under "Documents and PDFs", offered as the
  // authority signature for invoices when none is in use yet.
  let pdfSignature = $state<{ image: string; ownerName: string; ownerTitle: string } | null>(null),
    adopting = $state(false);
  async function loadSignatures() {
    signatures = await api<Signature[]>("/office/signatures");
    try {
      const saved = documentsContentFrom((await api<{ content: unknown }>("/content/documents", { cache: "no-store" }))?.content).signatures;
      pdfSignature = saved.signatureImage && saved.ownerName ? { image: saved.signatureImage, ownerName: saved.ownerName, ownerTitle: saved.ownerTitle } : null;
    } catch {
      pdfSignature = null;
    }
    for (const signature of signatures)
      if (!pictures[signature.id])
        imageUrl(`/office/signatures/${signature.id}/image`)
          .then((url) => (pictures = { ...pictures, [signature.id]: url }))
          .catch(() => {});
  }

  function pickSignature(event: Event) {
    const file = (event.currentTarget as HTMLInputElement).files?.[0] ?? null;
    if (sigPreview) URL.revokeObjectURL(sigPreview);
    sigFile = file;
    sigPreview = file ? URL.createObjectURL(file) : "";
  }

  async function uploadSignature(event: SubmitEvent) {
    event.preventDefault();
    if (!sigFile) {
      sigProblem = "Choose a picture of the signature.";
      return;
    }
    uploading = true;
    sigProblem = "";
    try {
      await uploadForm("/office/signatures", sigForm, sigFile);
      toasts.show("New signature saved", { detail: "Invoices issued from now on carry it. Earlier invoices keep the one they were issued with." });
      sigFile = null;
      if (sigPreview) URL.revokeObjectURL(sigPreview);
      sigPreview = "";
      (event.currentTarget as HTMLFormElement).reset();
      await loadSignatures();
    } catch (e) {
      sigProblem = problemText(e, "The signature was not saved");
    } finally {
      uploading = false;
    }
  }

  async function adoptPdfSignature() {
    if (!pdfSignature) return;
    adopting = true;
    sigProblem = "";
    try {
      const response = await fetch(pdfSignature.image);
      if (!response.ok) throw new Error("The signature picture could not be read. Upload it here instead.");
      const blob = await response.blob();
      const file = new File([blob], "signature." + (blob.type.split("/")[1] || "png"), { type: blob.type || "image/png" });
      await uploadForm("/office/signatures", { ownerName: pdfSignature.ownerName, ownerTitle: pdfSignature.ownerTitle, label: "Authority signature" }, file);
      toasts.show("Invoices now carry this signature");
      await loadSignatures();
    } catch (e) {
      sigProblem = problemText(e, "The signature was not saved");
    } finally {
      adopting = false;
    }
  }

  async function retire(signature: Signature) {
    if (!(await confirmAction({ title: "Stop using this signature?", message: "New invoices are issued without a signature until a new one is added. Invoices already issued keep it.", confirmLabel: "Stop using it" }))) return;
    try {
      await api(`/office/signatures/${signature.id}/retire`, { method: "POST" });
      toasts.show("Signature retired");
      await loadSignatures();
    } catch (e) {
      sigProblem = problemText(e, "The signature was not retired");
    }
  }

  // ---- Reminder rules and invoice terms ------------------------------------------
  let rules = $state({ documentExpiryDays: "", paymentReminderDays: "", dealDeadlineDays: "", currencies: "", invoiceTerms: "" }),
    rulesProblem = $state(""),
    savingRules = $state(false);

  async function loadRules() {
    const settings = await api<Settings>("/office/settings");
    rules = {
      documentExpiryDays: settings.documentExpiryDays.join(", "),
      paymentReminderDays: settings.paymentReminderDays.join(", "),
      dealDeadlineDays: settings.dealDeadlineDays.join(", "),
      currencies: settings.currencies.join(", "),
      invoiceTerms: settings.invoiceTerms,
    };
  }

  async function saveRules(event: SubmitEvent) {
    event.preventDefault();
    rulesProblem = "";
    const documentExpiryDays = parseDays(rules.documentExpiryDays, 365);
    const paymentReminderDays = parseDays(rules.paymentReminderDays, 90);
    const dealDeadlineDays = parseDays(rules.dealDeadlineDays, 90);
    const currencies = parseCurrencies(rules.currencies);
    if (!documentExpiryDays || !paymentReminderDays || !dealDeadlineDays) {
      rulesProblem = "Write the days as whole numbers separated by commas, such as 15, 7.";
      return;
    }
    if (!currencies) {
      rulesProblem = "Write currencies as three-letter codes separated by commas, such as USD, EUR, GBP.";
      return;
    }
    savingRules = true;
    try {
      await api("/office/settings", { method: "PUT", body: JSON.stringify({ documentExpiryDays, paymentReminderDays, dealDeadlineDays, currencies, invoiceTerms: rules.invoiceTerms }) });
      toasts.show("Settings saved");
      await loadRules();
    } catch (e) {
      rulesProblem = problemText(e, "The settings were not saved");
    } finally {
      savingRules = false;
    }
  }

  // ---- Loading -------------------------------------------------------------------
  let loading = $state(true),
    problem = $state("");

  async function loadTab() {
    loading = true;
    problem = "";
    try {
      if (tab === "staff" || tab === "branches") await loadPeople();
      else if (tab === "roles") await loadMatrix();
      else if (tab === "signatures") await loadSignatures();
      else await loadRules();
    } catch (e) {
      problem = problemText(e, "This could not be loaded");
    } finally {
      loading = false;
    }
  }

  onMount(loadTab);
  onDestroy(() => {
    for (const url of Object.values(pictures)) URL.revokeObjectURL(url);
    if (sigPreview) URL.revokeObjectURL(sigPreview);
  });

  let active = $derived(signatures.find((signature) => signature.active) ?? null);
</script>

<svelte:head><title>Office settings — Bengal Port Admin</title></svelte:head>

<div class="o-page">
  <header class="o-head">
    <div>
      <span class="o-kicker">Office</span>
      <h1>Office settings</h1>
      <p>Who works here and what each role may do, the branches, the signature printed on invoices, and the reminder rules.</p>
    </div>
  </header>

  <nav class="o-tabs" aria-label="Settings sections">
    {#each tabs as item (item.key)}
      <button class:active={tab === item.key} aria-pressed={tab === item.key} onclick={() => choose(item.key)}><item.icon size={15} /> {item.label}</button>
    {/each}
  </nav>

  {#if problem}<p class="o-error" role="alert">{problem}</p>{/if}

  {#if loading}
    <p class="o-loading">Loading…</p>
  {:else if tab === "staff"}
    <section class="o-card">
      <div class="card-head">
        <div><h2>Staff</h2><p class="o-muted">Each person's role decides what they see and do. Someone tied to a branch sees only that branch's customers and figures.</p></div>
        <a class="o-btn ghost small" href="/admin/users">Add a person under Users</a>
      </div>
      <div class="o-table-wrap flat">
        <table class="o-table">
          <thead><tr><th>Person</th><th>Role</th><th>Branch</th><th>Sees</th></tr></thead>
          <tbody>
            {#each staff as person (person.id)}
              {@const self = person.id === $officeMe?.id}
              <tr>
                <td class="lead" data-label="Person"><b>{person.name}</b><small>{person.email}</small>
                  {#if staffProblem[person.id]}<span class="o-error inline" role="alert" use:intoView={staffProblem[person.id]}>{staffProblem[person.id]}</span>{/if}
                </td>
                <td data-label="Role">
                  {#if may("roles.update") && !self}
                    <select class="o-select" aria-label={`Role of ${person.name}`} value={person.role} disabled={savingStaff === person.id} onchange={(e) => { const select = e.currentTarget; saveStaff(person, { role: select.value }).then((saved) => { if (!saved) select.value = person.role; }); }}>
                      {#each STAFF_ROLES as role (role)}<option value={role} disabled={role === "ADMIN" && $officeMe?.role !== "ADMIN"}>{ROLE_LABELS[role]}</option>{/each}
                    </select>
                  {:else}<b>{ROLE_LABELS[person.role] ?? person.role}</b>{#if self}<small>You</small>{/if}{/if}
                </td>
                <td data-label="Branch">
                  <select class="o-select" aria-label={`Branch of ${person.name}`} value={person.branchId ?? ""} disabled={savingStaff === person.id} onchange={(e) => { const select = e.currentTarget; saveStaff(person, { branchId: select.value || null }).then((saved) => { if (!saved) select.value = person.branchId ?? ""; }); }}>
                    <option value="">No branch</option>
                    {#each branches as branch (branch.id)}<option value={branch.id}>{branch.name}</option>{/each}
                  </select>
                </td>
                <td data-label="Sees">
                  {#if person.role === "ADMIN"}<span class="o-muted">Everything</span>
                  {:else}
                    <label class="o-check"><input type="checkbox" checked={person.allBranches || !person.branchId} disabled={!person.branchId || savingStaff === person.id} onchange={(e) => { const box = e.currentTarget; saveStaff(person, { allBranches: box.checked }).then((saved) => { if (!saved) box.checked = !box.checked; }); }} /> All branches</label>
                  {/if}
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  {:else if tab === "roles" && matrix}
    <section class="o-card">
      <div class="card-head">
        <div>
          <h2>Roles and permissions</h2>
          <p class="o-muted">Tick what each role may do. The change applies at once to everyone with the role. The Super Admin can always do everything.</p>
        </div>
      </div>
      <div class="o-tabs roles" role="group" aria-label="Role">
        {#each matrix.roles as row (row.role)}
          <button class:active={roleShown === row.role} aria-pressed={roleShown === row.role} onclick={() => { roleShown = row.role; cellProblem = ""; }}>{ROLE_LABELS[row.role] ?? row.role}</button>
        {/each}
      </div>
      <div class="legend">
        <span><ShieldAlert size={14} /> Needs care: money, passports, the signature, approving, deleting</span>
        <span><i class="dot"></i> Different from the standard for this role</span>
        {#if changedCount}<button class="o-btn ghost small" onclick={resetRole}>Put {changedCount} change{changedCount === 1 ? "" : "s"} back to standard</button>{/if}
      </div>
      {#if cellProblem}<p class="o-error" role="alert" use:intoView={cellProblem}>{cellProblem}</p>{/if}
      {#if shownRole}
        {#each groups as group (group.key)}
          <h3 class="group">{group.label}</h3>
          <div class="matrix">
            {#each Object.entries(matrix.resources).filter(([resource]) => (RESOURCE_LABELS[resource]?.group ?? "office") === group.key) as [resource, actions] (resource)}
              <div class="resource">
                <div class="name"><b>{RESOURCE_LABELS[resource]?.name ?? resource}</b>{#if RESOURCE_LABELS[resource]?.hint}<small>{RESOURCE_LABELS[resource].hint}</small>{/if}</div>
                <div class="actions">
                  {#each sortActions(actions) as action (action)}
                    {@const key = `${resource}.${action}`}
                    {@const cell = shownRole.permissions[key]}
                    <label class="chip" class:on={cell.allowed} class:changed={cell.changed}>
                      <input type="checkbox" checked={cell.allowed} disabled={busyCell === key} onchange={(e) => setPermission(key, e.currentTarget.checked)} />
                      {ACTION_LABELS[action] ?? action}
                      {#if isSensitive(key)}<ShieldAlert size={13} aria-label="needs care" />{/if}
                      {#if cell.changed}<i class="dot" title={`Standard: ${cell.byDefault ? "allowed" : "not allowed"}`}></i>{/if}
                    </label>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/each}
      {/if}
    </section>
  {:else if tab === "branches"}
    <section class="o-card">
      <div class="card-head">
        <div><h2>Branches</h2><p class="o-muted">Offices of the company. Customers, deals, invoices and entries can belong to a branch, and the dashboard can show each one.</p></div>
        {#if may("branches.create")}<button class="o-btn small" onclick={() => { branchProblem = ""; branchDraft = { code: "", name: "", address: "", phone: "", active: true }; }}><Plus size={16} /> Add branch</button>{/if}
      </div>
      <div class="branches">
        {#each branches as branch (branch.id)}
          <article class="branch">
            <div><b>{branch.name}</b><small>{branch.code}{branch.address ? ` · ${branch.address}` : ""}{branch.phone ? ` · ${branch.phone}` : ""}</small><small>{branch._count?.users ?? 0} staff · {branch._count?.customers ?? 0} customers</small></div>
            <div class="side">{#if !branch.active}<StatusPill status="INACTIVE" label="Closed" />{/if}<button class="o-btn ghost small" onclick={() => { branchProblem = ""; branchDraft = { id: branch.id, code: branch.code, name: branch.name, address: branch.address ?? "", phone: branch.phone ?? "", active: branch.active }; }}>Edit</button></div>
          </article>
        {/each}
      </div>
    </section>
  {:else if tab === "signatures"}
    <div class="o-grid-2">
      <section class="o-card">
        <h2>The signature on invoices</h2>
        {#if active}
          <figure class="signature">
            {#if pictures[active.id]}<img src={pictures[active.id]} alt={`Signature of ${active.ownerName}`} />{:else}<span class="o-muted">Loading the picture…</span>{/if}
            <figcaption><b>{active.ownerName}</b>{active.ownerTitle ? `, ${active.ownerTitle}` : ""}<small>{active.label} · added {day(active.createdAt)}{active.uploadedByName ? ` by ${active.uploadedByName}` : ""}</small></figcaption>
          </figure>
          <p class="o-muted small">Printed on every invoice issued by someone allowed to use it. Each invoice keeps the signature it was issued with.</p>
          <button class="o-btn danger small" onclick={() => retire(active!)}>Stop using it</button>
        {:else}
          <p class="o-notice warn">No signature is in use. Invoices are issued with a blank line for a handwritten signature.</p>
          {#if pdfSignature}
            <div class="adopt">
              <img src={pdfSignature.image} alt={`Signature of ${pdfSignature.ownerName}`} />
              <p><b>{pdfSignature.ownerName}</b>'s signature is saved under Documents and PDFs. Use it on invoices too?</p>
              <button class="o-btn navy small" disabled={adopting} onclick={adoptPdfSignature}>{adopting ? "Saving…" : "Use it on invoices"}</button>
            </div>
          {/if}
        {/if}
        {#if signatures.some((signature) => !signature.active)}
          <h3 class="group">Earlier signatures</h3>
          <ul class="history">
            {#each signatures.filter((signature) => !signature.active) as signature (signature.id)}
              <li>{#if pictures[signature.id]}<img src={pictures[signature.id]} alt="" />{/if}<span><b>{signature.ownerName}</b><small>Used {day(signature.createdAt)} – {signature.retiredAt ? day(signature.retiredAt) : "—"}</small></span></li>
            {/each}
          </ul>
        {/if}
      </section>
      <section class="o-card">
        <h2>Add a new signature</h2>
        <form class="o-form" onsubmit={uploadSignature}>
          <label class="o-field"><span>Name of the person who signs</span><input bind:value={sigForm.ownerName} required maxlength="120" placeholder="Md. Rahim Uddin" /></label>
          <label class="o-field"><span>Their title <small>(optional)</small></span><input bind:value={sigForm.ownerTitle} maxlength="120" placeholder="Managing Director" /></label>
          <label class="o-field"><span>Picture of the signature</span><input type="file" accept="image/png,image/jpeg,image/webp" onchange={pickSignature} />
            <span class="hint">Sign on plain white paper, take a straight photo in good light, and crop it close. A PNG with a see-through background looks best. Up to 5 MB.</span></label>
          {#if sigPreview}<img class="preview" src={sigPreview} alt="The chosen signature" />{/if}
          {#if sigProblem}<p class="o-error" role="alert" use:intoView={sigProblem}>{sigProblem}</p>{/if}
          <div class="o-form-actions"><button class="o-btn navy" disabled={uploading}>{uploading ? "Saving…" : active ? "Use this signature instead" : "Use this signature"}</button></div>
        </form>
      </section>
    </div>
  {:else if tab === "rules"}
    <section class="o-card">
      <h2>Reminders and invoice terms</h2>
      <form class="o-form" onsubmit={saveRules}>
        <div class="o-fields">
          <label class="o-field"><span>Warn before a document expires</span><input bind:value={rules.documentExpiryDays} inputmode="numeric" /><span class="hint">Days before, separated by commas. 15, 7 warns 15 days and 7 days before.</span></label>
          <label class="o-field"><span>Remind before an invoice is due</span><input bind:value={rules.paymentReminderDays} inputmode="numeric" /><span class="hint">Days before the due date. Overdue invoices are reminded once a week.</span></label>
          <label class="o-field"><span>Warn before a deal's end date</span><input bind:value={rules.dealDeadlineDays} inputmode="numeric" /><span class="hint">Days before the end date of an active deal.</span></label>
          <label class="o-field"><span>Currencies customers pay in</span><input bind:value={rules.currencies} /><span class="hint">Three-letter codes. Taka (BDT) is always included; the books are kept in taka.</span></label>
          <label class="o-field wide"><span>Standard terms on invoices and agreements</span><textarea bind:value={rules.invoiceTerms} rows="9" maxlength="6000"></textarea><span class="hint">Cancellation, refunds and additional charges. Each new invoice and deal starts with these; they can be changed on each one.</span></label>
        </div>
        {#if rulesProblem}<p class="o-error" role="alert" use:intoView={rulesProblem}>{rulesProblem}</p>{/if}
        <div class="o-form-actions"><button class="o-btn navy" disabled={savingRules}>{savingRules ? "Saving…" : "Save settings"}</button></div>
      </form>
    </section>
  {/if}
</div>

{#if branchDraft}
  <OfficeSheet title={branchDraft.id ? `Edit ${branchDraft.name}` : "Add branch"} onclose={() => (branchDraft = null)}>
    <form id="branch-form" class="o-form" onsubmit={saveBranch}>
      <div class="o-fields">
        <label class="o-field"><span>Short code</span><input bind:value={branchDraft.code} required maxlength="12" placeholder="CTG" /><span class="hint">2 to 12 letters or digits.</span></label>
        <label class="o-field"><span>Name</span><input bind:value={branchDraft.name} required maxlength="120" placeholder="Chattogram office" /></label>
        <label class="o-field wide"><span>Address <small>(optional)</small></span><input bind:value={branchDraft.address} maxlength="300" /></label>
        <label class="o-field"><span>Phone <small>(optional)</small></span><input bind:value={branchDraft.phone} maxlength="40" inputmode="tel" /></label>
        <label class="o-check wide"><input type="checkbox" bind:checked={branchDraft.active} /> Open (a closed branch keeps its records)</label>
      </div>
    </form>
    {#snippet footer()}
      {#if branchProblem}<p class="o-error full" role="alert" use:intoView={branchProblem}>{branchProblem}</p>{/if}
      <button type="button" class="o-btn ghost" onclick={() => (branchDraft = null)}>Cancel</button>
      <button type="submit" form="branch-form" class="o-btn navy" disabled={savingBranch}>{savingBranch ? "Saving…" : "Save branch"}</button>
    {/snippet}
  </OfficeSheet>
{/if}

<style>
  .o-tabs button { display: inline-flex; align-items: center; gap: 0.35rem; }
  .card-head { display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 0.7rem 1rem; margin-bottom: 1rem; }
  .card-head h2, .o-card > h2 { margin: 0 0 0.25rem; font-size: 1.02rem; color: #07182f; }
  .o-card > h2 { margin-bottom: 0.9rem; }
  .card-head p { margin: 0; font-size: 0.85rem; max-width: 46rem; }
  .flat { border: 0; border-radius: 0; }
  .inline { display: block; margin-top: 0.4rem; }
  .o-select { min-width: 10rem; }
  .roles { margin-bottom: 0.8rem; }
  .legend { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 1.2rem; margin-bottom: 0.8rem; font-size: 0.8rem; color: #5d6b7c; }
  .legend span { display: inline-flex; align-items: center; gap: 0.35rem; }
  .dot { display: inline-block; width: 0.5rem; height: 0.5rem; border-radius: 50%; background: #d19b2d; }
  .group { margin: 1.2rem 0 0.5rem; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; color: #8a95a3; }
  .matrix { border: 1px solid #e1e6e9; border-radius: 0.8rem; }
  .resource { display: grid; grid-template-columns: minmax(12rem, 1fr) 2fr; gap: 0.6rem 1rem; align-items: center; padding: 0.75rem 0.9rem; border-top: 1px solid #edf0f2; }
  .resource:first-child { border-top: 0; }
  .name b, .name small { display: block; }
  .name b { font-size: 0.88rem; color: #17283d; }
  .name small { margin-top: 0.1rem; font-size: 0.76rem; color: #6a7686; }
  .actions { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .chip { position: relative; display: inline-flex; align-items: center; gap: 0.35rem; min-height: 2.4rem; padding: 0.35rem 0.7rem; border: 1px solid #d5dbe1; border-radius: 2rem; background: #fff; color: #48576b; font-size: 0.82rem; font-weight: 700; cursor: pointer; user-select: none; }
  .chip input { width: 1rem; height: 1rem; margin: 0; accent-color: #17704b; }
  .chip.on { border-color: #9fd2b9; background: #eef8f2; color: #17583d; }
  .chip.changed { box-shadow: inset 0 0 0 1px #d19b2d; }
  .chip:focus-within { outline: 3px solid #d19b2d; outline-offset: 2px; }
  .branches { display: grid; gap: 0.6rem; }
  .branch { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.8rem 0.9rem; border: 1px solid #e1e6e9; border-radius: 0.75rem; }
  .branch b, .branch small { display: block; overflow-wrap: anywhere; }
  .branch small { margin-top: 0.15rem; color: #6a7686; font-size: 0.8rem; }
  .side { display: flex; align-items: center; gap: 0.5rem; flex: none; }
  .signature { margin: 0 0 0.8rem; padding: 1rem; border: 1px dashed #d5dbe1; border-radius: 0.75rem; background: #fff; }
  .signature img { display: block; max-width: 100%; max-height: 8rem; margin-bottom: 0.6rem; object-fit: contain; }
  .signature figcaption b, .signature figcaption small { display: block; }
  .signature figcaption small { margin-top: 0.15rem; color: #6a7686; font-size: 0.78rem; }
  .small { font-size: 0.82rem; }
  .warn { background: #fbf1da; color: #7c5a12; }
  .history { display: grid; gap: 0.5rem; margin: 0; padding: 0; list-style: none; }
  .history li { display: flex; align-items: center; gap: 0.7rem; }
  .history img { width: 6rem; height: 2.5rem; object-fit: contain; border: 1px solid #edf0f2; border-radius: 0.4rem; background: #fff; }
  .history b, .history small { display: block; }
  .history small { color: #6a7686; font-size: 0.76rem; }
  .adopt { display: grid; gap: 0.6rem; justify-items: start; margin-bottom: 1rem; padding: 0.9rem; border: 1px dashed #d5dbe1; border-radius: 0.75rem; background: #fff; }
  .adopt img { max-width: 100%; max-height: 5rem; object-fit: contain; }
  .adopt p { margin: 0; font-size: 0.86rem; }
  .preview { max-width: 100%; max-height: 7rem; object-fit: contain; border: 1px dashed #d5dbe1; border-radius: 0.6rem; padding: 0.5rem; background: #fff; }
  .full { flex: 1 1 100%; }
  @media (max-width: 48rem) {
    .resource { grid-template-columns: 1fr; }
    .branch { flex-direction: column; align-items: flex-start; }
    .o-select { min-width: 0; width: 100%; }
    td[data-label="Role"], td[data-label="Branch"] { flex-direction: column; align-items: stretch; gap: 0.3rem; text-align: left; }
  }
</style>
