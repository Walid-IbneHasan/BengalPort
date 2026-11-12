<script lang="ts">
  import { onMount, untrack } from "svelte";
  import { api, ApiError } from "$lib/api";
  import { problemText } from "$lib/problem";
  import { intoView } from "$lib/into-view";
  import { toasts } from "$lib/toast";
  import { officeMe, officePermissions } from "$lib/office";
  import { blankCustomer, customerBody, CUSTOMER_STATUSES, draftFromCustomer, type Customer, type CustomerDraft, type DuplicateCandidate } from "$lib/crm";
  import OfficeSheet from "$lib/components/OfficeSheet.svelte";
  import LookupSelect from "./LookupSelect.svelte";
  import { UserRound } from "lucide-svelte";

  // The customer form, in a side panel: adding someone new or changing a
  // customer's details. Used by the customer list and the customer's page.
  // It warns when the phone number or email is already on the list, and the
  // server refuses a duplicate unless "Save as a new customer anyway" is chosen.
  let {
    customer = null,
    onclose,
    onsaved,
  }: { customer?: Customer | null; onclose: () => void; onsaved: (customer: Customer) => void } = $props();

  type Staff = { id: string; name: string; role: string };
  type Branch = { id: string; name: string; active: boolean };

  let draft = $state<CustomerDraft>(untrack(() => (customer ? draftFromCustomer(customer) : blankCustomer())));
  let staff = $state<Staff[]>([]),
    branches = $state<Branch[]>([]),
    matches = $state<DuplicateCandidate[]>([]),
    candidates = $state<DuplicateCandidate[]>([]),
    saving = $state(false),
    problem = $state("");
  let lastChecked = "";

  const may = (permission: string) => $officePermissions.has(permission);
  // An employee's customers are always their own, so they do not choose.
  let choosesPerson = $derived($officeMe?.role !== "EMPLOYEE");

  onMount(() => {
    api<Staff[]>("/office/staff").then((list) => (staff = list)).catch(() => (staff = []));
    api<Branch[]>("/office/branches").then((list) => (branches = list)).catch(() => (branches = []));
  });

  // While the form is filled in: is this person already a customer?
  async function checkDuplicates() {
    const phone = draft.phone.trim();
    const email = draft.email.trim();
    if (phone.replace(/\D/g, "").length < 7 && !email.includes("@")) {
      matches = [];
      return;
    }
    const key = `${phone}|${email}`;
    if (key === lastChecked) return;
    lastChecked = key;
    try {
      matches = await api<DuplicateCandidate[]>(
        `/office/customers/duplicates?phone=${encodeURIComponent(phone)}&email=${encodeURIComponent(email)}${draft.id ? `&notId=${draft.id}` : ""}`,
      );
    } catch {
      // Only a hint; the server checks again when the form is saved.
      matches = [];
    }
  }

  async function save(event?: SubmitEvent, force = false) {
    event?.preventDefault();
    saving = true;
    problem = "";
    try {
      const body = JSON.stringify(customerBody(draft, { passport: may("passport.read"), force }));
      const saved = draft.id
        ? await api<Customer>(`/office/customers/${draft.id}`, { method: "PUT", body })
        : await api<Customer>("/office/customers", { method: "POST", body });
      candidates = [];
      toasts.show(draft.id ? "Customer saved" : `Customer added: ${saved.customerCode}`);
      onsaved(saved);
    } catch (e) {
      if (e instanceof ApiError && e.code === "DUPLICATE_CUSTOMER") {
        candidates = (e.details?.candidates ?? []) as DuplicateCandidate[];
        problem = `${e.message} Open them below, or save this as a new customer anyway.`;
      } else {
        candidates = [];
        problem = problemText(e, "The customer was not saved");
      }
    } finally {
      saving = false;
    }
  }
</script>

{#snippet people(list: DuplicateCandidate[])}
  <ul class="matches">
    {#each list as row (row.id)}
      <li>
        <UserRound size={17} />
        <div>
          <a class="o-link" href={`/admin/customers/${row.id}`}>{row.name}</a>
          <small>{row.customerCode}{row.phone ? ` · ${row.phone}` : ""}{row.email ? ` · ${row.email}` : ""}</small>
        </div>
      </li>
    {/each}
  </ul>
{/snippet}

<OfficeSheet
  title={draft.id ? `Edit ${customer?.name ?? "customer"}` : "New customer"}
  subtitle={draft.id ? (customer?.customerCode ?? "") : "They get their own customer number (C-…) when saved."}
  onclose={onclose}
>
  <form id="customer-form" class="o-form" onsubmit={(event) => save(event)}>
    <div class="o-fields">
      <label class="o-field wide"><span>Full name</span><input bind:value={draft.name} required maxlength="160" autocomplete="off" placeholder="Rahima Begum" /></label>
      <label class="o-field">
        <span>Phone</span>
        <input type="tel" bind:value={draft.phone} onblur={checkDuplicates} required maxlength="30" autocomplete="off" placeholder="01712-345678" />
      </label>
      <div class="o-field">
        <label class="o-field">
          <span>WhatsApp <small>(optional)</small></span>
          {#if draft.sameWhatsapp}
            <input type="tel" value={draft.phone} disabled />
          {:else}
            <input type="tel" bind:value={draft.whatsapp} maxlength="30" autocomplete="off" placeholder="01712-345678" />
          {/if}
        </label>
        <label class="o-check"><input type="checkbox" bind:checked={draft.sameWhatsapp} /> Same as phone</label>
      </div>
      <label class="o-field wide">
        <span>Email <small>(optional)</small></span>
        <input type="email" bind:value={draft.email} onblur={checkDuplicates} maxlength="160" autocomplete="off" placeholder="name@example.com" />
      </label>

      {#if matches.length && !candidates.length}
        <div class="wide dupe" role="status">
          <b>Already a customer?</b>
          <p>{matches.length === 1 ? "Someone on the list has" : "These customers have"} the same phone number or email.</p>
          {@render people(matches)}
        </div>
      {/if}

      <label class="o-field wide"><span>Address <small>(optional)</small></span><input bind:value={draft.address} maxlength="300" placeholder="House, road, area, city" /></label>
      <LookupSelect kind="customer-category" label="Category" bind:value={draft.category} hint="What they come to us for, such as Education or Healthcare." />
      <LookupSelect kind="lead-source" label="Lead source" bind:value={draft.leadSource} hint="How they found us, such as Facebook or a referral." />
      <label class="o-field">
        <span>Status</span>
        <select bind:value={draft.status}>
          {#each CUSTOMER_STATUSES as item (item.value)}<option value={item.value}>{item.label}</option>{/each}
        </select>
        <small class="hint">A lead has not bought anything yet.</small>
      </label>
      {#if choosesPerson}
        <label class="o-field">
          <span>Given to</span>
          <select bind:value={draft.assignedToId}>
            <option value="">Nobody yet</option>
            {#each staff as person (person.id)}<option value={person.id}>{person.name}</option>{/each}
          </select>
          <small class="hint">The member of staff who looks after them.</small>
        </label>
      {/if}
      {#if branches.length > 1}
        <label class="o-field">
          <span>Branch</span>
          <select bind:value={draft.branchId}>
            <option value="">{draft.id ? "No branch" : "My branch"}</option>
            {#each branches as branch (branch.id)}<option value={branch.id}>{branch.name}{branch.active ? "" : " (closed)"}</option>{/each}
          </select>
        </label>
      {/if}
      <label class="o-field">
        <span>Next follow-up <small>(optional)</small></span>
        <input type="date" bind:value={draft.nextFollowUpAt} />
        <small class="hint">The customer shows under “Follow-up due” from this day.</small>
      </label>
      <label class="o-field wide"><span>Notes <small>(optional)</small></span><textarea bind:value={draft.notes} maxlength="4000"></textarea></label>
    </div>

    {#if may("passport.read")}
      <fieldset class="passport">
        <legend>Passport <small>(optional)</small></legend>
        <div class="o-fields">
          <label class="o-field"><span>Passport number</span><input bind:value={draft.passportNumber} maxlength="40" autocomplete="off" /></label>
          <label class="o-field"><span>Country</span><input bind:value={draft.passportCountry} maxlength="80" placeholder="Bangladesh" /></label>
          <label class="o-field"><span>Expiry date</span><input type="date" bind:value={draft.passportExpiry} /></label>
        </div>
        <p class="hint">Only roles with the passport permission can see these.</p>
      </fieldset>
    {/if}

    {#if candidates.length}
      <div class="dupe" role="alert" use:intoView={candidates}>
        <b>Already on the list</b>
        <p>Open the customer to add to their record, or save this person as someone new.</p>
        {@render people(candidates)}
        <button type="button" class="o-btn ghost" disabled={saving} onclick={() => save(undefined, true)}>{saving ? "Saving…" : "Save as a new customer anyway"}</button>
      </div>
    {/if}
  </form>
  {#snippet footer()}
    {#if problem}<p class="o-error wide-error" role="alert" use:intoView={problem}>{problem}</p>{/if}
    <button type="button" class="o-btn ghost" onclick={onclose}>Cancel</button>
    <button type="submit" form="customer-form" class="o-btn navy" disabled={saving}>{saving ? "Saving…" : draft.id ? "Save customer" : "Add customer"}</button>
  {/snippet}
</OfficeSheet>

<style>
  .o-field > .o-field { gap: 0.35rem; }
  .passport { margin: 0; padding: 1rem; border: 1px solid #e1e6e9; border-radius: 0.75rem; background: #fff; min-width: 0; }
  .passport legend { padding: 0 0.35rem; font-size: 0.8rem; font-weight: 800; color: #405066; }
  .passport legend small { font-weight: 600; color: #7a8593; }
  .passport .hint { margin: 0.7rem 0 0; font-size: 0.76rem; color: #6a7585; }
  .dupe { display: grid; gap: 0.45rem; padding: 0.85rem 0.95rem; border: 1px solid #e8d6a6; border-radius: 0.7rem; background: #fdf8ec; color: #6f5418; }
  .dupe b { color: #07182f; }
  .dupe p { margin: 0; font-size: 0.84rem; line-height: 1.45; }
  .dupe .o-btn { justify-self: start; }
  .matches { display: grid; gap: 0.4rem; margin: 0; padding: 0; list-style: none; }
  .matches li { display: flex; align-items: flex-start; gap: 0.55rem; padding: 0.5rem 0.6rem; border-radius: 0.55rem; background: #fff; }
  .matches li div { min-width: 0; }
  .matches small { display: block; color: #6a7585; font-size: 0.78rem; overflow-wrap: anywhere; }
  .wide-error { flex: 1 1 100%; }
</style>
