<script lang="ts">
  import { onMount } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import { api, apiPage } from "$lib/api";
  import { lastPage, pageSummary, type PageMeta } from "$lib/pagination";
  import {
    ArrowRight,
    Check,
    Download,
    ExternalLink,
    FileText,
    Plus,
    Search,
    Trash2,
    X,
  } from "lucide-svelte";
  import CmsImageField from "$lib/components/CmsImageField.svelte";
  import { detailGroups } from "$lib/submission-details";
  import DocumentList from "$lib/components/DocumentList.svelte";
  import FeeSettings from "$lib/components/FeeSettings.svelte";
  import SystemStatus from "$lib/components/SystemStatus.svelte";
  import BackupCard from "$lib/components/BackupCard.svelte";
  import StaffNotes from "$lib/components/StaffNotes.svelte";
  import ApplicationEditor from "$lib/components/ApplicationEditor.svelte";
  import RefundDialog from "$lib/components/RefundDialog.svelte";
  import { xlsx } from "$lib/xlsx";
  import {
    applicationRows,
    enquiryRows,
    exportFileName,
  } from "$lib/record-export";
  import { taka, type PaymentSummary } from "$lib/payment-rules";
  import {
    blankProgram,
    blankRecord,
    blankService,
    paymentMethods,
    recordBody,
    recordFromRow,
    type RecordKind,
  } from "$lib/admin-records";
  type Config = {
    title: string;
    description: string;
    columns: [string, string][];
    add?: RecordKind;
  };
  const configs: Record<string, Config> = {
    enquiries: {
      title: "Enquiries",
      description:
        "Review incoming questions and move each conversation forward.",
      columns: [
        ["name", "Person"],
        ["type", "Division"],
        ["contact", "Contact"],
        ["message", "Message"],
        ["status", "Status"],
        ["createdAt", "Received"],
      ],
    },
    applications: {
      title: "Applications",
      description:
        "Track submitted business, education, healthcare and Umrah applications.",
      columns: [
        ["reference", "Reference"],
        ["fullName", "Applicant"],
        ["type", "Type"],
        ["contact", "Contact"],
        ["status", "Status"],
        ["createdAt", "Submitted"],
      ],
    },
    opportunities: {
      title: "Opportunities",
      description:
        "Publish and manage opportunities shown on the public website.",
      columns: [
        ["title", "Opportunity"],
        ["category", "Category"],
        ["place", "Location"],
        ["deadline", "Deadline"],
        ["published", "Visibility"],
      ],
      add: "opportunity",
    },
    suppliers: {
      title: "Suppliers",
      description:
        "Maintain the supplier network available to the business division.",
      columns: [
        ["name", "Supplier"],
        ["country", "Country"],
        ["industry", "Industry"],
        ["product", "Product"],
        ["featured", "Featured"],
      ],
      add: "partner",
    },
    factories: {
      title: "Factories",
      description:
        "Maintain verified factories and visit-ready production partners.",
      columns: [
        ["name", "Factory"],
        ["country", "Country"],
        ["industry", "Industry"],
        ["product", "Product"],
        ["featured", "Featured"],
      ],
      add: "partner",
    },
    education: {
      title: "Education",
      description:
        "Manage institutions and the programs available to students.",
      columns: [
        ["name", "Institution"],
        ["country", "Country"],
        ["programs", "Programs"],
        ["description", "Description"],
      ],
      add: "institution",
    },
    healthcare: {
      title: "Healthcare",
      description:
        "Manage partner hospitals and international patient services.",
      columns: [
        ["name", "Hospital"],
        ["place", "Location"],
        ["services", "Services"],
        ["description", "Description"],
      ],
      add: "hospital",
    },
    users: {
      title: "Users",
      description: "Manage registered users and administrative access.",
      columns: [
        ["name", "User"],
        ["email", "Email"],
        ["phone", "Phone"],
        ["role", "Role"],
        ["activity", "Activity"],
        ["createdAt", "Joined"],
      ],
    },
    payments: {
      title: "Payments",
      description:
        "Monitor collected amounts, payment status and outstanding balances.",
      columns: [
        ["customer", "Customer"],
        ["service", "Service"],
        ["amount", "Amount"],
        ["method", "Method"],
        ["due", "Remaining due"],
        ["status", "Status"],
        ["createdAt", "Date"],
      ],
      add: "payment",
    },
    receipts: {
      title: "Receipts",
      description:
        "Open and print receipts generated from completed or partial payments.",
      columns: [
        ["receiptNumber", "Receipt"],
        ["customer", "Customer"],
        ["amount", "Amount paid"],
        ["due", "Remaining due"],
        ["createdAt", "Generated"],
        ["open", ""],
      ],
    },
    settings: {
      title: "Settings",
      description:
        "Manage the website and confirm the application environment.",
      columns: [],
    },
  };
  const statuses = [
    "DRAFT",
    "SUBMITTED",
    "IN_REVIEW",
    "APPROVED",
    "REJECTED",
    "CANCELLED",
  ];
  const money = (v: any) =>
    `\u09F3${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 2 }).format(Number(v) || 0)}`;
  let section: string = page.params.section ?? "",
    config = configs[section],
    rows: any[] = [],
    loading = true,
    error = "",
    success = "",
    search = "",
    drawer = false,
    saving = false;
  const PAGE_SIZE = 25;
  let meta: PageMeta = { total: 0, page: 1, pageSize: PAGE_SIZE };
  // The enquiry or application whose full details are open.
  let viewing: any = null;
  // What the open application costs, and the amount staff are entering for it.
  let owing: PaymentSummary | null = null;
  let amountDue: number | null = null;
  let savingAmount = false;
  // Whether the open application's answers are being corrected.
  let editing = false;
  let exporting = false;
  // The payment whose refunds are open.
  let refunding = "";
  const refundedOf = (row: any) =>
    (row.refunds ?? [])
      .filter((refund: any) => refund.status === "COMPLETED")
      .reduce((sum: number, refund: any) => sum + Number(refund.amount), 0);
  const refundPending = (row: any) =>
    (row.refunds ?? []).some((refund: any) => refund.status === "PENDING");
  const canRefund = (row: any) =>
    ["PAID", "PARTIALLY_PAID", "REFUNDED"].includes(row.status);
  async function openDetails(row: any) {
    viewing = row;
    editing = false;
    owing = null;
    if (section !== "applications") return;
    try {
      owing = await api<PaymentSummary>(`/payments/application/${row.id}`, {
        headers: headers(),
      });
      amountDue = owing.amountDue;
    } catch {
      // The rest of the application still shows.
    }
  }
  async function saveAmountDue() {
    savingAmount = true;
    error = "";
    try {
      await api(`/admin/resources/applications/${viewing.id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify({
          amountDue: amountDue === null || amountDue === undefined ? null : Number(amountDue),
        }),
      });
      await openDetails(viewing);
    } catch (e) {
      error = e instanceof Error ? e.message : "The amount could not be saved";
    } finally {
      savingAmount = false;
    }
  }
  function applicationSaved(updated: any) {
    viewing = { ...viewing, ...updated };
    rows = rows.map((row) => (row.id === updated.id ? { ...row, ...updated } : row));
    editing = false;
    success = "Changes saved";
    setTimeout(() => (success = ""), 1800);
  }
  function notesChanged(count: number) {
    const id = viewing.id;
    rows = rows.map((row) =>
      row.id === id ? { ...row, _count: { ...row._count, notes: count } } : row,
    );
  }
  // Downloads every record matching the search, not just the page shown.
  async function exportRecords() {
    exporting = true;
    error = "";
    try {
      const all = await api<any[]>(
        `/admin/resources/${section}${search ? `?search=${encodeURIComponent(search)}` : ""}`,
      );
      const sheet =
        section === "applications" ? applicationRows(all) : enquiryRows(all);
      const link = document.createElement("a");
      link.href = URL.createObjectURL(
        new Blob([xlsx(config.title, sheet)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      link.download = exportFileName(section);
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    } catch (e) {
      error = e instanceof Error ? e.message : "The export could not be made";
    } finally {
      exporting = false;
    }
  }
  $: viewable = ["enquiries", "applications"].includes(section);
  $: viewingGroups = viewing
    ? detailGroups(
        section === "applications" ? viewing.type : undefined,
        viewing.details,
      )
    : [];
  let form: any = blankRecord();
  // What one record of each kind is called in buttons and headings.
  const nouns: Record<RecordKind, string> = {
    opportunity: "opportunity",
    partner: "partner",
    institution: "institution",
    hospital: "hospital",
    payment: "payment",
  };
  // Payments are a record of money received, so they are added but never edited.
  $: editable = Boolean(config?.add) && config.add !== "payment";
  let applications: any[] = [];
  $: noun =
    section === "suppliers"
      ? "supplier"
      : section === "factories"
        ? "factory"
        : config?.add
          ? nouns[config.add]
          : "record";
  function startAdding() {
    form = blankRecord(config.add);
    drawer = true;
    if (config.add === "payment")
      api<any[]>("/admin/resources/applications?page=1&pageSize=100", {
        headers: headers(),
      })
        .then((list) => (applications = list))
        .catch(() => (applications = []));
  }
  function startEditing(row: any) {
    form = recordFromRow(config.add as RecordKind, row);
    drawer = true;
  }
  const token = () => localStorage.getItem("bp_token");
  const headers = () => ({ authorization: `Bearer ${token()}` });
  async function load() {
    if (!config || section === "settings") {
      loading = false;
      return;
    }
    loading = true;
    error = "";
    try {
      const result = await apiPage<any>(
        `/admin/resources/${section}?page=${meta.page}&pageSize=${PAGE_SIZE}${search ? `&search=${encodeURIComponent(search)}` : ""}`,
        { headers: headers() },
      );
      // Deleting the last row of the last page leaves it empty: step back.
      if (!result.rows.length && result.meta.page > 1) {
        meta = { ...meta, page: lastPage(result.meta) };
        return load();
      }
      rows = result.rows;
      meta = result.meta;
    } catch (e) {
      error = e instanceof Error ? e.message : "Unable to load records";
    } finally {
      loading = false;
    }
  }
  function goToPage(page: number) {
    meta = { ...meta, page };
    load();
  }
  function value(row: any, key: string) {
    if (key === "contact")
      return row.email || row.phone
        ? [row.email, row.phone].filter(Boolean).join(" · ")
        : "—";
    if (key === "place")
      return [row.city || row.location, row.country].filter(Boolean).join(", ");
    if (key === "createdAt" || key === "deadline")
      return row[key]
        ? new Date(row[key]).toLocaleDateString("en-BD", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "—";
    if (key === "programs" || key === "services")
      return `${row[key]?.length || 0} ${key}`;
    if (key === "activity")
      return `${row._count?.enquiries || 0} enquiries · ${row._count?.applications || 0} applications`;
    if (key === "customer")
      return (
        row.application?.fullName ||
        row.user?.name ||
        row.payment?.application?.fullName ||
        row.payment?.user?.name ||
        "Walk-in customer"
      );
    if (key === "amount") return money(row.amount || row.payment?.amount);
    if (key === "due")
      return money(row.receipt?.remainingDue ?? row.remainingDue ?? 0);
    return row[key] ?? "—";
  }
  async function update(id: string, body: any) {
    error = "";
    try {
      const updated: any = await api(`/admin/resources/${section}/${id}`, {
        method: "PATCH",
        headers: headers(),
        body: JSON.stringify(body),
      });
      rows = rows.map((row) => (row.id === id ? { ...row, ...updated } : row));
      success = "Saved";
      setTimeout(() => (success = ""), 1800);
    } catch (e) {
      error = e instanceof Error ? e.message : "Update failed";
    }
  }
  async function remove(id: string) {
    const question =
      section === "applications"
        ? "Delete this application with its documents and notes? This cannot be undone."
        : "Delete this record? This cannot be undone.";
    if (!confirm(question)) return;
    try {
      await api(`/admin/resources/${section}/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      success = "Record deleted";
      await load();
      setTimeout(() => (success = ""), 1800);
    } catch (e) {
      error = e instanceof Error ? e.message : "Delete failed";
    }
  }
  async function save() {
    saving = true;
    error = "";
    try {
      const kind = config.add as RecordKind;
      const body = JSON.stringify(recordBody(kind, form));
      if (form.id)
        await api(`/admin/resources/${section}/${form.id}`, {
          method: "PUT",
          headers: headers(),
          body,
        });
      else
        await api(
          kind === "opportunity"
            ? "/admin/opportunities"
            : kind === "payment"
              ? "/payments"
              : `/admin/resources/${section}`,
          { method: "POST", headers: headers(), body },
        );
      drawer = false;
      success = form.id
        ? "Changes saved"
        : kind === "payment"
          ? "Payment recorded"
          : "Record created";
      setTimeout(() => (success = ""), 1800);
      await load();
    } catch (e) {
      error = e instanceof Error ? e.message : "Unable to save the record";
    } finally {
      saving = false;
    }
  }
  onMount(load);
  afterNavigate(() => {
    const next = page.params.section ?? "";
    if (next !== section) {
      section = next;
      config = configs[section];
      search = "";
      meta = { total: 0, page: 1, pageSize: PAGE_SIZE };
      rows = [];
      drawer = false;
      viewing = null;
      load();
    }
  });
</script>

<svelte:head
  ><title>{config?.title || "Admin"} — Bengal Port</title></svelte:head
>
<svelte:window onkeydown={(e) => e.key === "Escape" && (viewing = null)} />
{#if !config}<div class="resource">
    <div class="empty">
      <FileText />
      <h2>Page not found</h2>
      <a href="/admin">Return to dashboard</a>
    </div>
  </div>{:else}<div class="resource">
    <header>
      <div>
        <span>ADMINISTRATION</span>
        <h1>{config.title}</h1>
        <p>{config.description}</p>
      </div>
      {#if config.add}<button class="primary" onclick={startAdding}
          ><Plus size={18} />
          {config.add === "payment" ? "Record payment" : `Add ${noun}`}</button
        >{/if}
    </header>
    {#if error}<div class="notice error">
        {error}<button onclick={() => (error = "")}><X size={15} /></button>
      </div>{/if}{#if success}<div class="notice success">
        <Check size={16} />{success}
      </div>{/if}{#if section === "settings"}<section class="settings">
        <FeeSettings />
        <a href="/admin/content"
          ><div>
            <b>Website content</b><span
              >Edit homepage copy, statistics, sections and footer information.</span
            >
          </div>
          <ArrowRight /></a
        ><a href="/admin/accounts"
          ><div>
            <b>Financial configuration</b><span
              >Review accounting categories and business transactions.</span
            >
          </div>
          <ArrowRight /></a
        >
        <BackupCard />
        <SystemStatus />
      </section>{:else}<div class="toolbar">
        <label
          ><Search size={17} /><input
            bind:value={search}
            onkeydown={(e) => e.key === "Enter" && goToPage(1)}
            placeholder={`Search ${config.title.toLowerCase()}`}
          /></label
        ><button onclick={() => goToPage(1)}>Search</button>{#if viewable}<button
            class="export"
            disabled={exporting || !meta.total}
            onclick={exportRecords}
            ><Download size={16} />
            {exporting ? "Preparing…" : "Export to Excel"}</button
          >{/if}<span
          >{meta.total} {meta.total === 1 ? "record" : "records"}</span
        >
      </div>
      <section class="table-card" aria-busy={loading}>
        <div class="table-wrap">
          <table>
            <thead
              ><tr
                >{#each config.columns as column}<th>{column[1]}</th
                  >{/each}{#if editable}<th class="actions">Actions</th>{/if}{#if viewable}<th class="actions">Details</th>{/if}{#if section === "payments"}<th class="actions">Refunds</th>{/if}</tr
              ></thead
            ><tbody
              >{#if loading}{#each Array(5) as _}<tr class="skeleton"
                    >{#each config.columns as _}<td><i></i></td>{/each}</tr
                  >{/each}{:else}{#each rows as row}<tr
                    >{#each config.columns as column}<td
                        data-label={column[1]}
                        >{#if column[0] === "status" && ["enquiries", "applications"].includes(section)}<select
                            class="status"
                            value={row.status}
                            onchange={(e) =>
                              update(row.id, { status: e.currentTarget.value })}
                            >{#each statuses as status}<option value={status}
                                >{status.replaceAll("_", " ")}</option
                              >{/each}</select
                          >{:else if column[0] === "role"}<select
                            class="status"
                            value={row.role}
                            onchange={(e) =>
                              update(row.id, { role: e.currentTarget.value })}
                            ><option>USER</option><option>ADMIN</option></select
                          >{:else if column[0] === "published"}<button
                            class:off={!row.published}
                            class="toggle"
                            aria-label="Toggle publishing"
                            onclick={() =>
                              update(row.id, { published: !row.published })}
                            ><i></i><span
                              >{row.published ? "Published" : "Draft"}</span
                            ></button
                          >{:else if column[0] === "featured"}<span
                            class:yes={row.featured}
                            class="badge"
                            >{row.featured ? "Featured" : "Standard"}</span
                          >{:else if column[0] === "open"}<a
                            class="open"
                            href={`/receipt/${row.receiptNumber}`}
                            ><ExternalLink size={15} /> Open</a
                          >{:else}<span
                            class:main={[
                              "name",
                              "title",
                              "reference",
                              "receiptNumber",
                            ].includes(column[0])}>{value(row, column[0])}</span
                          >{#if section === "payments" && column[0] === "amount" && (refundedOf(row) > 0 || refundPending(row))}<small
                              class="refunded"
                              >{#if refundedOf(row) > 0}{money(refundedOf(row))} refunded{/if}{#if refundPending(row)}{refundedOf(row) > 0 ? " · " : ""}refund waiting{/if}</small
                            >{/if}{/if}</td
                      >{/each}{#if editable}<td class="actions"
                        ><button class="view" onclick={() => startEditing(row)}
                          >Edit</button
                        ><button
                          class="delete"
                          aria-label="Delete record"
                          onclick={() => remove(row.id)}
                          ><Trash2 size={16} /></button
                        ></td
                      >{/if}{#if viewable}<td class="actions"
                        ><button class="view" onclick={() => openDetails(row)}
                          >View{#if row._count?.notes}<span
                              class="note-count"
                              title={`${row._count.notes} staff ${row._count.notes === 1 ? "note" : "notes"}`}
                              >{row._count.notes}</span
                            >{/if}</button
                        ><button
                          class="delete"
                          aria-label={section === "enquiries"
                            ? "Delete enquiry"
                            : "Delete application"}
                          onclick={() => remove(row.id)}
                          ><Trash2 size={16} /></button
                        ></td
                      >{/if}{#if section === "payments"}<td class="actions"
                        >{#if canRefund(row)}<button
                            class="view"
                            onclick={() => (refunding = row.id)}
                            >{row.status === "REFUNDED" ? "Refunds" : "Refund"}</button
                          >{/if}</td
                      >{/if}</tr
                  >{/each}{/if}</tbody
            >
          </table>
          {#if !loading && !rows.length}<div class="empty">
              <FileText size={28} />
              <h2>No records found</h2>
              <p>Try another search or add the first record.</p>
            </div>{/if}
        </div>
        {#if meta.total > meta.pageSize}<nav class="pager" aria-label="Pages">
            <span>{pageSummary(meta)}</span>
            <button disabled={meta.page <= 1 || loading} onclick={() => goToPage(meta.page - 1)}>Previous</button>
            <span>Page {meta.page} of {lastPage(meta)}</span>
            <button disabled={meta.page >= lastPage(meta) || loading} onclick={() => goToPage(meta.page + 1)}>Next</button>
          </nav>{/if}
      </section>{/if}
  </div>{/if}
{#if drawer}<div
    class="backdrop"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && (drawer = false)}
  >
    <aside
      class="drawer"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
    >
      <header>
        <div>
          <span>{form.id ? "EDIT RECORD" : "NEW RECORD"}</span>
          <h2 id="drawer-title">
            {config.add === "payment" ? "Record" : form.id ? "Edit" : "Add"}
            {noun}
          </h2>
        </div>
        <button aria-label="Close" onclick={() => (drawer = false)}
          ><X /></button
        >
      </header>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {#if config.add === "payment"}<label
            ><span>Application</span><select bind:value={form.applicationId}
              ><option value="">No application (walk-in customer)</option
              >{#each applications as item}<option value={item.id}
                  >{item.reference} · {item.fullName}</option
                >{/each}</select
            ></label
          ><label
            ><span>Service *</span><input
              bind:value={form.service}
              required
              maxlength="200"
              placeholder="e.g. Umrah package, MBBS admission support"
            /></label
          >
          <div class="form-grid">
            <label
              ><span>Total due (৳) *</span><input
                type="number"
                min="1"
                step="any"
                bind:value={form.totalDue}
                required
              /></label
            ><label
              ><span>Amount paid now (৳) *</span><input
                type="number"
                min="1"
                step="any"
                bind:value={form.amount}
                required
              /></label
            ><label
              ><span>Payment method *</span><select bind:value={form.method}
                >{#each paymentMethods as method}<option>{method}</option
                  >{/each}</select
              ></label
            ><label
              ><span>Transaction reference</span><input
                bind:value={form.transactionId}
                maxlength="100"
                placeholder="Optional"
              /></label
            >
          </div>
          <p class="hint">
            A receipt is created automatically. If the application was submitted
            by a signed-in member, the payment and receipt appear on their
            dashboard.
          </p>{:else if config.add === "opportunity"}<label
            ><span>Title *</span><input
              bind:value={form.title}
              required
            /></label
          >
          <div class="form-grid">
            <label
              ><span>Category *</span><select bind:value={form.category}
                >{#each ["BUSINESS", "EDUCATION", "HEALTHCARE", "UMRAH", "FACTORY_VISIT", "BUSINESS_TOUR", "SCHOLARSHIP", "EVENT"] as c}<option
                    >{c}</option
                  >{/each}</select
              ></label
            ><label
              ><span>Country *</span><input
                bind:value={form.country}
                required
              /></label
            ><label
              ><span>Location *</span><input
                bind:value={form.location}
                required
              /></label
            ><label
              ><span>Deadline</span><input
                type="date"
                bind:value={form.deadline}
              /></label
            >
          </div>{:else if config.add === "institution" || config.add === "hospital"}<div
            class="form-grid"
          >
            <label
              ><span>Name *</span><input
                bind:value={form.name}
                required
              /></label
            ><label
              ><span>Country *</span><input
                bind:value={form.country}
                required
              /></label
            >{#if config.add === "hospital"}<label
                ><span>City *</span><input
                  bind:value={form.city}
                  required
                /></label
              >{/if}
          </div>{:else}<div class="form-grid">
            <label
              ><span>Name *</span><input
                bind:value={form.name}
                required
              /></label
            ><label
              ><span>Country *</span><input
                bind:value={form.country}
                required
              /></label
            ><label
              ><span>Industry *</span><input
                bind:value={form.industry}
                required
              /></label
            ><label
              ><span>Product or service *</span><input
                bind:value={form.product}
                required
              /></label
            >
          </div>
          <label class="check"
            ><input type="checkbox" bind:checked={form.featured} /> Feature this partner</label
          >{/if}
          {#if config.add !== "payment"}<CmsImageField
            label="Card image"
            value={form.image}
            purpose={`${section} card image`}
            recommendation="Landscape recommended · approximately 4:3. Portrait and square uploads are supported through responsive cropping."
            onchange={(value) => (form.image = value)}
          />
          <label
          ><span>Description *</span><textarea
            rows="5"
            bind:value={form.description}
            required
            minlength="10"></textarea></label
        >{/if}
        {#if config.add === "institution"}<fieldset class="items">
            <legend>Programs</legend>
            {#each form.programs as program, i}<div class="item">
                <input bind:value={program.title} placeholder="Program title" aria-label="Program title" required />
                <input bind:value={program.level} placeholder="Level, e.g. Undergraduate" aria-label="Level" required />
                <input bind:value={program.discipline} placeholder="Discipline, e.g. Medicine" aria-label="Discipline" required />
                <input type="date" bind:value={program.deadline} aria-label="Application deadline" />
                <button
                  type="button"
                  class="delete"
                  aria-label="Remove program"
                  onclick={() => (form.programs = form.programs.filter((_: unknown, n: number) => n !== i))}
                  ><Trash2 size={15} /></button
                >
              </div>{/each}
            <button type="button" class="add-item" onclick={() => (form.programs = [...form.programs, blankProgram()])}
              ><Plus size={15} /> Add program</button
            >
          </fieldset>{:else if config.add === "hospital"}<fieldset class="items">
            <legend>Services</legend>
            {#each form.services as service, i}<div class="item">
                <input bind:value={service.title} placeholder="Service title" aria-label="Service title" required />
                <input bind:value={service.category} placeholder="Category, e.g. Specialist care" aria-label="Category" required />
                <input class="wide" bind:value={service.description} placeholder="Short description" aria-label="Description" required />
                <button
                  type="button"
                  class="delete"
                  aria-label="Remove service"
                  onclick={() => (form.services = form.services.filter((_: unknown, n: number) => n !== i))}
                  ><Trash2 size={15} /></button
                >
              </div>{/each}
            <button type="button" class="add-item" onclick={() => (form.services = [...form.services, blankService()])}
              ><Plus size={15} /> Add service</button
            >
          </fieldset>{/if}
        <footer>
          <button type="button" class="cancel" onclick={() => (drawer = false)}
            >Cancel</button
          ><button class="primary" disabled={saving}
            >{saving
              ? "Saving…"
              : form.id
                ? "Save changes"
                : config.add === "payment"
                  ? "Record payment"
                  : "Create record"}</button
          >
        </footer>
      </form>
    </aside>
  </div>{/if}
{#if refunding}{#key refunding}<RefundDialog
      paymentId={refunding}
      onchange={load}
      onclose={() => (refunding = "")}
    />{/key}{/if}
{#if viewing}<div
    class="backdrop"
    role="presentation"
    onclick={(e) => e.target === e.currentTarget && (viewing = null)}
  >
    <div
      class="drawer details"
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-title"
    >
      <header>
        <div>
          <span
            >{viewing.type}
            {section === "applications" ? "APPLICATION" : "ENQUIRY"}</span
          >
          <h2 id="details-title">{viewing.reference || viewing.name}</h2>
        </div>
        <div class="header-actions">
          {#if section === "applications" && !editing}<button
              class="edit-answers"
              onclick={() => (editing = true)}>Edit answers</button
            >{/if}
          <button aria-label="Close" onclick={() => (viewing = null)}
            ><X /></button
          >
        </div>
      </header>
      {#if editing}<div class="details-body">
          {#key viewing.id}<ApplicationEditor
              application={viewing}
              onsaved={applicationSaved}
              oncancel={() => (editing = false)}
            />{/key}
        </div>{:else}<div class="details-body">
        <section>
          <h3>Staff notes</h3>
          {#key viewing.id}<StaffNotes
              resource={section === "applications" ? "applications" : "enquiries"}
              id={viewing.id}
              onchange={notesChanged}
            />{/key}
        </section>
        <section>
          <h3>Contact</h3>
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{viewing.fullName || viewing.name}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd><a href={`tel:${viewing.phone}`}>{viewing.phone}</a></dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>
                {#if viewing.email}<a href={`mailto:${viewing.email}`}
                    >{viewing.email}</a
                  >{:else}Not provided{/if}
              </dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>{viewing.status.replaceAll("_", " ")}</dd>
            </div>
            <div>
              <dt>{section === "applications" ? "Submitted" : "Received"}</dt>
              <dd>
                {new Date(viewing.createdAt).toLocaleString("en-BD", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            {#if viewing.user}<div>
                <dt>Member account</dt>
                <dd>{viewing.user.email}</dd>
              </div>{/if}
          </dl>
        </section>
        {#if viewing.message}<section>
            <h3>Message</h3>
            <p class="message">{viewing.message}</p>
          </section>{/if}
        {#if section === "applications"}<section>
            <h3>Payment</h3>
            {#if owing}<dl>
                <div><dt>Paid</dt><dd>{taka(owing.paid)}</dd></div>
                <div>
                  <dt>Remaining</dt>
                  <dd>{owing.remaining === null ? "Not set" : taka(owing.remaining)}</dd>
                </div>
              </dl>
              <form
                class="amount-due"
                onsubmit={(e) => {
                  e.preventDefault();
                  saveAmountDue();
                }}
              >
                <label
                  ><span>Amount due (৳)</span><input
                    type="number"
                    min="0"
                    step="0.01"
                    bind:value={amountDue}
                    placeholder="Not set"
                  /></label
                ><button class="view" disabled={savingAmount}
                  >{savingAmount ? "Saving…" : "Save amount"}</button
                >
              </form>
              <p class="hint">
                The total this application costs. The customer can pay it in
                full or in part{owing.onlinePayment ? " with bKash" : ""} from
                their dashboard or the Pay page.
              </p>{:else}<p class="hint">Loading payment details…</p>{/if}
          </section>
          <section>
            <h3>Documents</h3>
            {#key viewing.id}<DocumentList
                applicationId={viewing.id}
                documents={viewing.documents ?? []}
                canDownload
              />{/key}
          </section>{/if}
        {#each viewingGroups as group}<section>
            <h3>{group.title}</h3>
            <dl>
              {#each group.rows as item}<div>
                  <dt>{item.label}</dt>
                  <dd>{item.value}</dd>
                </div>{/each}
            </dl>
          </section>{/each}
      </div>{/if}
    </div>
  </div>{/if}

<style>
  .resource {
    padding: clamp(1.15rem, 3.5vw, 3rem);
    max-width: 100rem;
    margin: auto;
  }
  .resource > header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 2rem;
    margin-bottom: 1.6rem;
  }
  .resource header > div > span,
  .drawer header span {
    font-size: 0.7rem;
    letter-spacing: 0.14em;
    color: var(--gold-deep);
    font-weight: 800;
  }
  .resource h1 {
    font-size: clamp(2rem, 4vw, 3rem);
    letter-spacing: -0.04em;
    color: var(--heading);
    margin: 0.35rem 0;
  }
  .resource header p {
    color: var(--muted);
    margin: 0;
    max-width: 42rem;
  }
  .primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    border: 0;
    background: var(--gold);
    color: var(--heading);
    min-height: 2.75rem;
    padding: 0.65rem 1rem;
    border-radius: 0.7rem;
    font-weight: 750;
    cursor: pointer;
    white-space: nowrap;
    transition:
      transform 150ms var(--ease-out),
      box-shadow 180ms ease;
  }
  .primary:active,
  .toolbar button:active,
  .delete:active,
  .view:active,
  .open:active {
    transform: scale(0.97);
  }
  .notice {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 0.9rem;
    border-radius: 0.7rem;
    margin-bottom: 0.8rem;
    font-size: 0.8rem;
  }
  .notice button {
    margin-left: auto;
    border: 0;
    background: none;
  }
  .notice.error {
    background: #fff0f0;
    color: #922f2f;
  }
  .notice.success {
    background: #eaf7ef;
    color: #276541;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem;
    margin-bottom: 0.8rem;
  }
  .toolbar label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: #fff;
    border: 1px solid #dce2e6;
    border-radius: 0.7rem;
    padding: 0 0.8rem;
    flex: 0 1 25rem;
    min-width: min(14rem, 100%);
  }
  .toolbar button,
  .toolbar > span {
    white-space: nowrap;
  }
  .toolbar input {
    border: 0;
    outline: 0;
    background: transparent;
    min-height: 2.65rem;
    width: 100%;
  }
  .toolbar button {
    border: 1px solid #dce2e6;
    background: #fff;
    border-radius: 0.7rem;
    min-height: 2.65rem;
    padding: 0 1rem;
    font-weight: 700;
    color: var(--heading);
  }
  .toolbar .export {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
  }
  .toolbar .export:disabled {
    opacity: 0.5;
  }
  .refunded {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.68rem;
    color: #8a5a12;
  }
  .note-count {
    display: inline-block;
    min-width: 1.15rem;
    margin-left: 0.4rem;
    padding: 0.05rem 0.3rem;
    border-radius: 1rem;
    background: #faf0d5;
    color: #72591e;
    font-size: 0.66rem;
    text-align: center;
  }
  .header-actions {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .drawer header .edit-answers {
    width: auto;
    white-space: nowrap;
    padding: 0 0.9rem;
    font-size: 0.75rem;
    font-weight: 700;
  }
  .toolbar > span {
    margin-left: auto;
    color: #798795;
    font-size: 0.75rem;
  }
  .table-card {
    background: #fff;
    border: 1px solid #e0e5e8;
    border-radius: 1rem;
    overflow: hidden;
    box-shadow: 0 0.5rem 1.8rem #1026400a;
  }
  /* Nothing here scrolls any more, so no room is kept for a scrollbar. */
  .table-wrap {
    overflow: auto;
    scrollbar-gutter: auto;
  }
  /* The table needs about 52rem. Where its card is narrower than that
     (phones, tablets, and laptops with the sidebar open) each record is shown
     as a card instead, so nothing has to be scrolled sideways. */
  .table-card {
    container-type: inline-size;
  }
  table {
    width: 100%;
    border-collapse: collapse;
  }
  @container (max-width: 52rem) {
    table,
    tbody {
      display: block;
    }
    thead {
      display: none;
    }
    tbody {
      display: grid;
      gap: 0.6rem;
      padding: 0.6rem;
    }
    tbody tr {
      display: block;
      padding: 0.85rem 0.95rem;
      border: 1px solid #e6eaed;
      border-radius: 0.8rem;
      min-width: 0;
    }
    tbody td {
      display: grid;
      grid-template-columns: 6.25rem minmax(0, 1fr);
      gap: 0.75rem;
      align-items: center;
      padding: 0.32rem 0;
      border: 0;
      max-width: none;
      font-size: 0.8rem;
      overflow-wrap: anywhere;
    }
    tbody td::before {
      content: attr(data-label);
      font-size: 0.68rem;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: #738191;
    }
    /* The first column names the record: shown as the card's heading. */
    tbody td:first-child {
      display: block;
      padding: 0 0 0.45rem;
      font-size: 0.92rem;
    }
    tbody td:first-child > span {
      color: #23384f;
      font-weight: 750;
    }
    tbody td:first-child::before,
    tbody td.actions::before,
    tbody td[data-label=""]::before {
      content: none;
    }
    tbody td[data-label=""] {
      display: block;
    }
    tbody td > span {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      line-clamp: 3;
      overflow: hidden;
    }
    tbody td.actions {
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      width: auto;
      padding: 0.6rem 0.6rem 0 0;
      text-align: left;
    }
    tbody td.actions:empty {
      display: none;
    }
    .skeleton td::before {
      visibility: hidden;
    }
  }
  @container (min-width: 38rem) and (max-width: 52rem) {
    tbody {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  th {
    text-align: left;
    padding: 0.8rem 1rem;
    background: #f7f8f9;
    color: #738191;
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  td {
    padding: 0.9rem 1rem;
    border-top: 1px solid #edf0f2;
    color: #596879;
    font-size: 0.75rem;
    max-width: 24rem;
  }
  td .main {
    display: block;
    color: #23384f;
    font-weight: 750;
  }
  td > span {
    line-height: 1.5;
  }
  .status {
    border: 1px solid #d9dfe4;
    background: #fff;
    border-radius: 0.5rem;
    padding: 0.42rem 0.55rem;
    color: #35495d;
    font-size: 0.7rem;
    outline: none;
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    min-height: 2.25rem;
    border: 0;
    background: none;
    color: #276541;
    font-size: 0.72rem;
  }
  .toggle i {
    width: 1.8rem;
    height: 1rem;
    border-radius: 1rem;
    background: #4e9c70;
    position: relative;
  }
  .toggle i:after {
    content: "";
    position: absolute;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: #fff;
    right: 0.15rem;
    top: 0.15rem;
    transition: transform 160ms var(--ease-out);
  }
  .toggle.off {
    color: #7a8794;
  }
  .toggle.off i {
    background: #c8d0d7;
  }
  .toggle.off i:after {
    transform: translateX(-0.8rem);
  }
  .badge {
    display: inline-flex;
    padding: 0.3rem 0.5rem;
    border-radius: 0.4rem;
    background: #eef1f3;
    color: #657382;
  }
  .badge.yes {
    background: #faf0d5;
    color: #72591e;
  }
  .actions {
    text-align: right;
    width: 8rem;
    white-space: nowrap;
  }
  .actions button + button {
    margin-left: 0.4rem;
    vertical-align: middle;
  }
  .delete {
    width: 2.2rem;
    height: 2.2rem;
    border: 1px solid #eadada;
    background: #fff;
    color: #a84747;
    border-radius: 0.55rem;
    display: inline-grid;
    place-items: center;
  }
  .open {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    min-height: 2.25rem;
    color: var(--gold-deep);
    font-weight: 750;
  }
  .view {
    min-height: 2.2rem;
    padding: 0 0.8rem;
    border: 1px solid #d9dfe4;
    border-radius: 0.55rem;
    background: #fff;
    color: var(--heading);
    font-size: 0.72rem;
    font-weight: 700;
    cursor: pointer;
  }
  .pager {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: flex-end;
    gap: 0.6rem 0.9rem;
    padding: 0.8rem 1rem;
    border-top: 1px solid #edf0f2;
    font-size: 0.75rem;
    color: #6d7b89;
  }
  .pager span:first-child {
    margin-right: auto;
  }
  .pager button {
    min-height: 2.2rem;
    padding: 0 0.8rem;
    border: 1px solid #d9dfe4;
    border-radius: 0.55rem;
    background: #fff;
    color: var(--heading);
    font-size: 0.72rem;
    font-weight: 700;
  }
  .pager button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .skeleton i {
    display: block;
    height: 0.8rem;
    border-radius: 0.4rem;
    background: #edf0f2;
    animation: pulse 1s ease-in-out infinite;
  }
  .empty {
    padding: 4rem 2rem;
    text-align: center;
    color: #7a8795;
  }
  .empty h2 {
    font-size: 1rem;
    color: var(--heading);
    margin: 0.8rem 0 0.35rem;
  }
  .settings {
    display: grid;
    gap: 0.8rem;
    max-width: 55rem;
  }
  .settings > a {
    background: #fff;
    border: 1px solid #e0e5e8;
    border-radius: 0.9rem;
    padding: 1.2rem;
    display: flex;
    align-items: center;
    gap: 1rem;
    text-decoration: none;
    color: inherit;
  }
  .settings > a > svg {
    margin-left: auto;
  }
  .settings b,
  .settings span {
    display: block;
  }
  .settings span {
    font-size: 0.78rem;
    color: var(--muted);
    margin-top: 0.3rem;
  }
  .backdrop {
    position: fixed;
    inset: 0;
    z-index: 110;
    background: #07182f80;
    display: flex;
    justify-content: flex-end;
    backdrop-filter: blur(2px);
  }
  .drawer {
    width: min(36rem, 100vw);
    height: 100%;
    background: #f7f8f9;
    box-shadow: -2rem 0 5rem #07182f2b;
    animation: drawer-in 240ms var(--ease-drawer);
    overflow-y: auto;
  }
  .drawer > header {
    background: #102640;
    color: #fff;
    padding: 1.4rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .drawer > header {
    gap: 0.8rem;
  }
  .drawer > header > div:first-child {
    min-width: 0;
  }
  .drawer h2 {
    margin: 0.3rem 0 0;
    font-size: clamp(1.15rem, 5.2vw, 1.5rem);
    overflow-wrap: anywhere;
  }
  .drawer header button {
    flex: none;
  }
  .drawer header button {
    width: 2.5rem;
    height: 2.5rem;
    border: 0;
    border-radius: 0.65rem;
    background: #ffffff12;
    color: #fff;
  }
  .drawer form {
    padding: 1.5rem;
    display: grid;
    gap: 1rem;
  }
  .drawer label {
    display: grid;
    gap: 0.4rem;
  }
  .drawer label > span {
    font-size: 0.72rem;
    font-weight: 750;
    color: #405267;
  }
  .drawer input,
  .drawer select,
  .drawer textarea {
    width: 100%;
    border: 1px solid #d6dde2;
    border-radius: 0.6rem;
    padding: 0.72rem 0.8rem;
    background: #fff;
    outline: none;
  }
  .drawer input:focus,
  .drawer select:focus,
  .drawer textarea:focus {
    border-color: var(--gold);
    box-shadow: 0 0 0 3px #c7983620;
  }
  .form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .drawer .check {
    display: flex;
    align-items: center;
  }
  .drawer .check input {
    width: auto;
  }
  .drawer footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.6rem;
    border-top: 1px solid #e0e5e8;
    padding-top: 1rem;
  }
  .amount-due {
    display: flex;
    align-items: flex-end;
    gap: 0.6rem;
    padding: 0.8rem 0 0.5rem;
    border-top: 1px solid #edf0f2;
  }
  .amount-due label {
    flex: 1;
  }
  .drawer.details {
    display: flex;
    flex-direction: column;
  }
  .details-body {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
    display: grid;
    gap: 1rem;
    align-content: start;
  }
  .details-body section {
    background: #fff;
    border: 1px solid #e0e5e8;
    border-radius: 0.8rem;
    padding: 1rem 1.1rem;
  }
  .details-body h3 {
    margin: 0 0 0.6rem;
    font-size: 0.7rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--gold-deep);
  }
  .details-body dl {
    margin: 0;
  }
  .details-body dl > div {
    display: grid;
    grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
    gap: 1rem;
    padding: 0.55rem 0;
    border-top: 1px solid #edf0f2;
  }
  .details-body dl > div:first-child {
    border-top: 0;
  }
  .details-body dt {
    font-size: 0.74rem;
    color: #6d7b89;
    line-height: 1.45;
  }
  .details-body dd {
    margin: 0;
    font-size: 0.8rem;
    font-weight: 650;
    color: #23384f;
    line-height: 1.45;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  .details-body dd a {
    color: var(--gold-deep);
  }
  .message {
    margin: 0;
    font-size: 0.84rem;
    line-height: 1.6;
    color: #23384f;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
  }
  .hint {
    margin: 0;
    font-size: 0.74rem;
    line-height: 1.5;
    color: #6d7b89;
  }
  .items {
    margin: 0;
    padding: 0.9rem;
    border: 1px solid #d6dde2;
    border-radius: 0.7rem;
    display: grid;
    gap: 0.6rem;
  }
  .items legend {
    padding: 0 0.3rem;
    font-size: 0.72rem;
    font-weight: 750;
    color: #405267;
  }
  .item {
    display: grid;
    grid-template-columns: 1fr 1fr auto;
    gap: 0.5rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid #e6eaed;
  }
  .item .delete {
    grid-row: 1;
    grid-column: 3;
  }
  .item .wide {
    grid-column: 1 / 3;
  }
  .add-item {
    justify-self: start;
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px dashed #c3ccd3;
    background: #fff;
    border-radius: 0.6rem;
    padding: 0.5rem 0.8rem;
    font-size: 0.75rem;
    font-weight: 700;
    color: var(--heading);
  }
  .cancel {
    border: 1px solid #d7dde2;
    background: #fff;
    border-radius: 0.7rem;
    padding: 0.65rem 1rem;
  }
  .primary:disabled {
    opacity: 0.55;
  }
  @media (hover: hover) and (pointer: fine) {
    .primary:hover {
      transform: translateY(-0.1rem);
      box-shadow: 0 0.6rem 1.2rem #a7751729;
    }
    .settings > a:hover {
      border-color: #d4bd83;
    }
    .delete:hover {
      background: #fff1f1;
    }
    .view:hover {
      background: #f4f6f8;
    }
  }
  @keyframes drawer-in {
    from {
      transform: translateX(100%);
    }
    to {
      transform: none;
    }
  }
  @keyframes pulse {
    50% {
      opacity: 0.45;
    }
  }
  /* On phones and tablets fields use 16px text: iPhones zoom the page when a smaller field is focused. */
  @media (max-width: 58rem) {
    .status {
      font-size: 1rem;
      padding: 0.4rem 0.5rem;
      max-width: 100%;
    }
  }
  @media (max-width: 43rem) {
    .resource > header {
      align-items: flex-start;
      flex-direction: column;
    }
    .resource > header .primary {
      width: 100%;
    }
    .toolbar {
      flex-wrap: wrap;
    }
    .toolbar label {
      min-width: 100%;
    }
    .toolbar > span {
      margin-left: 0;
    }
    .form-grid {
      grid-template-columns: 1fr;
    }
    .details-body dl > div {
      grid-template-columns: 1fr;
      gap: 0.2rem;
    }
    /* A programme or service: its fields one under another, the remove
       button beside the first. */
    .item {
      grid-template-columns: minmax(0, 1fr) auto;
    }
    .item input,
    .item .wide {
      grid-column: 1;
    }
    .item .delete {
      grid-column: 2;
    }
    .drawer form,
    .details-body {
      padding: 1.1rem;
    }
    .drawer > header {
      padding: 1.1rem;
    }
    .drawer footer {
      flex-wrap: wrap;
    }
    .drawer footer > * {
      flex: 1;
      justify-content: center;
    }
    .amount-due {
      flex-wrap: wrap;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .drawer,
    .skeleton i {
      animation: none;
    }
    .primary,
    .toggle i:after {
      transition: none;
    }
  }
</style>
