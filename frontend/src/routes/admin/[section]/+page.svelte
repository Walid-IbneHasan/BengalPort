<script lang="ts">
  import { onMount } from "svelte";
  import { afterNavigate } from "$app/navigation";
  import { page } from "$app/state";
  import { api } from "$lib/api";
  import {
    ArrowRight,
    Check,
    ExternalLink,
    FileText,
    Plus,
    Search,
    Trash2,
    X,
  } from "lucide-svelte";
  import CmsImageField from "$lib/components/CmsImageField.svelte";
  type Config = {
    title: string;
    description: string;
    columns: [string, string][];
    add?: "partner" | "opportunity";
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
        "Track submitted business, education and healthcare applications.",
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
        "Review institutions and the programs available to students.",
      columns: [
        ["name", "Institution"],
        ["country", "Country"],
        ["programs", "Programs"],
        ["description", "Description"],
      ],
    },
    healthcare: {
      title: "Healthcare",
      description:
        "Review partner hospitals and international patient services.",
      columns: [
        ["name", "Hospital"],
        ["place", "Location"],
        ["services", "Services"],
        ["description", "Description"],
      ],
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
        ["amount", "Paid"],
        ["due", "Remaining due"],
        ["status", "Status"],
        ["createdAt", "Date"],
      ],
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
  let form: any = {
    name: "",
    country: "",
    industry: "",
    product: "",
    description: "",
    featured: false,
    title: "",
    slug: "",
    category: "BUSINESS",
    location: "",
    deadline: "",
    image: "/images/global-business.webp",
    published: true,
  };
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
      rows = await api(
        `/admin/resources/${section}${search ? `?search=${encodeURIComponent(search)}` : ""}`,
        { headers: headers() },
      );
    } catch (e) {
      error = e instanceof Error ? e.message : "Unable to load records";
    } finally {
      loading = false;
    }
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
        row.user?.name ||
        row.application?.fullName ||
        row.payment?.user?.name ||
        row.payment?.application?.fullName ||
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
    if (!confirm("Delete this record? This cannot be undone.")) return;
    try {
      await api(`/admin/resources/${section}/${id}`, {
        method: "DELETE",
        headers: headers(),
      });
      rows = rows.filter((row) => row.id !== id);
      success = "Record deleted";
      setTimeout(() => (success = ""), 1800);
    } catch (e) {
      error = e instanceof Error ? e.message : "Delete failed";
    }
  }
  async function create() {
    saving = true;
    error = "";
    try {
      let body: any;
      if (config.add === "opportunity") {
        body = {
          slug:
            form.slug ||
            form.title
              .toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, "-"),
          category: form.category,
          title: form.title,
          description: form.description,
          country: form.country,
          location: form.location,
          deadline: form.deadline || null,
          image: form.image,
          published: form.published,
        };
        await api("/admin/opportunities", {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(body),
        });
      } else {
        body = {
          name: form.name,
          country: form.country,
          industry: form.industry,
          product: form.product,
          description: form.description,
          image: form.image,
          featured: form.featured,
        };
        await api(`/admin/resources/${section}`, {
          method: "POST",
          headers: headers(),
          body: JSON.stringify(body),
        });
      }
      drawer = false;
      success = "Record created";
      form = {
        name: "",
        country: "",
        industry: "",
        product: "",
        description: "",
        featured: false,
        title: "",
        slug: "",
        category: "BUSINESS",
        location: "",
        deadline: "",
        image: "/images/global-business.webp",
        published: true,
      };
      await load();
    } catch (e) {
      error = e instanceof Error ? e.message : "Unable to create record";
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
      rows = [];
      drawer = false;
      load();
    }
  });
</script>

<svelte:head
  ><title>{config?.title || "Admin"} — Bengal Port</title></svelte:head
>
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
      {#if config.add}<button class="primary" onclick={() => (drawer = true)}
          ><Plus size={18} /> Add {section === "opportunities"
            ? "opportunity"
            : section.slice(0, -1)}</button
        >{/if}
    </header>
    {#if error}<div class="notice error">
        {error}<button onclick={() => (error = "")}><X size={15} /></button>
      </div>{/if}{#if success}<div class="notice success">
        <Check size={16} />{success}
      </div>{/if}{#if section === "settings"}<section class="settings">
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
        <div class="health">
          <i></i>
          <div>
            <b>System status</b><span
              >Frontend, Fastify API and PostgreSQL are configured for this
              workspace.</span
            >
          </div>
          <strong>Operational</strong>
        </div>
      </section>{:else}<div class="toolbar">
        <label
          ><Search size={17} /><input
            bind:value={search}
            onkeydown={(e) => e.key === "Enter" && load()}
            placeholder={`Search ${config.title.toLowerCase()}`}
          /></label
        ><button onclick={load}>Search</button><span>{rows.length} records</span
        >
      </div>
      <section class="table-card" aria-busy={loading}>
        <div class="table-wrap">
          <table>
            <thead
              ><tr
                >{#each config.columns as column}<th>{column[1]}</th
                  >{/each}{#if ["opportunities", "suppliers", "factories"].includes(section)}<th
                    class="actions">Actions</th
                  >{/if}</tr
              ></thead
            ><tbody
              >{#if loading}{#each Array(5) as _}<tr class="skeleton"
                    >{#each config.columns as _}<td><i></i></td>{/each}</tr
                  >{/each}{:else}{#each rows as row}<tr
                    >{#each config.columns as column}<td
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
                          >{/if}</td
                      >{/each}{#if ["opportunities", "suppliers", "factories"].includes(section)}<td
                        class="actions"
                        ><button
                          class="delete"
                          aria-label="Delete record"
                          onclick={() => remove(row.id)}
                          ><Trash2 size={16} /></button
                        ></td
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
          <span>NEW RECORD</span>
          <h2 id="drawer-title">
            Add {section === "opportunities"
              ? "opportunity"
              : section.slice(0, -1)}
          </h2>
        </div>
        <button aria-label="Close" onclick={() => (drawer = false)}
          ><X /></button
        >
      </header>
      <form
        onsubmit={(e) => {
          e.preventDefault();
          create();
        }}
      >
        {#if config.add === "opportunity"}<label
            ><span>Title *</span><input
              bind:value={form.title}
              required
            /></label
          >
          <div class="form-grid">
            <label
              ><span>Category *</span><select bind:value={form.category}
                >{#each ["BUSINESS", "EDUCATION", "HEALTHCARE", "FACTORY_VISIT", "BUSINESS_TOUR", "SCHOLARSHIP", "EVENT"] as c}<option
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
          <CmsImageField
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
        >
        <footer>
          <button type="button" class="cancel" onclick={() => (drawer = false)}
            >Cancel</button
          ><button class="primary" disabled={saving}
            >{saving ? "Saving…" : "Create record"}</button
          >
        </footer>
      </form>
    </aside>
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
    min-width: min(25rem, 55vw);
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
  .table-wrap {
    overflow: auto;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    min-width: 58rem;
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
    width: 5rem;
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
    color: var(--gold-deep);
    font-weight: 750;
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
  .settings > a,
  .settings > .health {
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
  .health > i {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: #3b9963;
    box-shadow: 0 0 0 0.3rem #3b99631c;
  }
  .health strong {
    margin-left: auto;
    color: #347854;
    font-size: 0.75rem;
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
  }
  .drawer > header {
    background: #102640;
    color: #fff;
    padding: 1.4rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .drawer h2 {
    margin: 0.3rem 0 0;
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
