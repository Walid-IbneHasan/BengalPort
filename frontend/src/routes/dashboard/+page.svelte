<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { api, ApiError } from "$lib/api";
  import { detailGroups } from "$lib/submission-details";
  import { enquiryTitle, statusInfo } from "$lib/member-activity";
  import DocumentList from "$lib/components/DocumentList.svelte";
  import { ArrowRight, ChevronDown, ClipboardList, MessageSquare, WalletCards } from "lucide-svelte";

  type Activity = { enquiries: any[]; applications: any[]; payments: any[] };
  let user = $state<any>(null),
    activity = $state<Activity | null>(null),
    loading = $state(true),
    error = $state(""),
    open = $state("");

  const money = (value: unknown) =>
    `৳${new Intl.NumberFormat("en-BD", { maximumFractionDigits: 2 }).format(Number(value) || 0)}`;
  const day = (value: string) =>
    new Date(value).toLocaleDateString("en-BD", { day: "numeric", month: "short", year: "numeric" });
  const division = (type: string) => type.charAt(0) + type.slice(1).toLowerCase();
  const toggle = (id: string) => (open = open === id ? "" : id);

  onMount(async () => {
    if (!localStorage.getItem("bp_token")) return goto("/login?next=/dashboard");
    try {
      user = JSON.parse(localStorage.getItem("bp_user") || "null");
      activity = await api<Activity>("/auth/me/activity");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        localStorage.removeItem("bp_token");
        localStorage.removeItem("bp_user");
        return goto("/login?next=/dashboard");
      }
      error = "Your activity could not be loaded. Please try again shortly.";
    } finally {
      loading = false;
    }
  });
</script>

<svelte:head><title>My Dashboard — Bengal Port</title><meta name="robots" content="noindex" /></svelte:head>

<section class="dash-hero">
  <div class="wrap">
    <span>MY BENGAL PORT</span>
    <h1>{user?.name ? `Welcome back, ${user.name.split(" ")[0]}.` : "Your global journey, in one place."}</h1>
    <p>Follow your applications, enquiries, payments and receipts.</p>
    <div class="hero-actions">
      <a class="primary" href="/apply">New application or enquiry <ArrowRight size={17} /></a>
      <a class="ghost" href="/profile">Account &amp; security</a>
      {#if user?.role === "ADMIN"}<a class="ghost" href="/admin">Admin workspace</a>{/if}
    </div>
  </div>
</section>

<section class="dash-page">
  <div class="wrap">
    {#if loading}
      <div class="state">Loading your activity…</div>
    {:else if error}
      <div class="state error" role="alert">{error}</div>
    {:else if activity}
      <div class="tiles">
        <a href="#applications"><ClipboardList size={20} /><b>{activity.applications.length}</b><span>Applications</span></a>
        <a href="#enquiries"><MessageSquare size={20} /><b>{activity.enquiries.length}</b><span>Enquiries</span></a>
        <a href="#payments"><WalletCards size={20} /><b>{activity.payments.length}</b><span>Payments</span></a>
      </div>

      <article id="applications">
        <header><h2>My applications</h2><p>Each application keeps the reference number you were given.</p></header>
        {#each activity.applications as item}
          {@const status = statusInfo(item.status)}
          <div class="row">
            <button class="summary" aria-expanded={open === item.id} onclick={() => toggle(item.id)}>
              <span class="main"><b>{item.reference}</b><small>{division(item.type)} application · submitted {day(item.createdAt)}</small></span>
              <i class={status.tone}>{status.label}</i>
              <span class="chevron" class:turned={open === item.id}><ChevronDown size={18} /></span>
            </button>
            {#if open === item.id}
              <div class="detail">
                {#each detailGroups(item.type, item.details) as group}
                  <h3>{group.title}</h3>
                  <dl>{#each group.rows as answer}<div><dt>{answer.label}</dt><dd>{answer.value}</dd></div>{/each}</dl>
                {/each}
                <h3>Documents</h3>
                <DocumentList applicationId={item.id} documents={item.documents ?? []} canAttach canDownload onchange={(list) => (item.documents = list)} />
              </div>
            {/if}
          </div>
        {:else}
          <div class="empty">
            <p>No applications yet. Applications you submit while signed in appear here.</p>
            <a href="/apply">Start an application <ArrowRight size={15} /></a>
          </div>
        {/each}
      </article>

      <article id="enquiries">
        <header><h2>My enquiries</h2><p>Questions you sent to the Bengal Port team.</p></header>
        {#each activity.enquiries as item}
          {@const status = statusInfo(item.status)}
          <div class="row">
            <button class="summary" aria-expanded={open === item.id} onclick={() => toggle(item.id)}>
              <span class="main"><b>{enquiryTitle(item)}</b><small>{division(item.type)} enquiry · sent {day(item.createdAt)}</small></span>
              <i class={status.tone}>{status.label}</i>
              <span class="chevron" class:turned={open === item.id}><ChevronDown size={18} /></span>
            </button>
            {#if open === item.id}<div class="detail"><p class="message">{item.message}</p></div>{/if}
          </div>
        {:else}
          <div class="empty">
            <p>No enquiries yet. Enquiries you send while signed in appear here.</p>
            <a href="/apply">Send an enquiry <ArrowRight size={15} /></a>
          </div>
        {/each}
      </article>

      <article id="payments">
        <header><h2>Payments &amp; receipts</h2><p>Payments recorded by Bengal Port against your account.</p></header>
        {#each activity.payments as item}
          {@const status = statusInfo(item.status)}
          <div class="row payment">
            <span class="main"><b>{item.service}</b><small>{day(item.createdAt)} · {item.method}</small></span>
            <span class="amounts"><b>{money(item.amount)} paid</b>{#if item.receipt && Number(item.receipt.remainingDue) > 0}<small>{money(item.receipt.remainingDue)} remaining</small>{/if}</span>
            <i class={status.tone}>{status.label}</i>
            {#if item.receipt}<a class="receipt" href={`/receipt/${item.receipt.receiptNumber}`}>Receipt <ArrowRight size={15} /></a>{/if}
          </div>
        {:else}
          <div class="empty"><p>No payments have been recorded for your account.</p></div>
        {/each}
      </article>
    {/if}
  </div>
</section>

<style>
  .dash-hero{background:#143451;color:#fff;padding:clamp(3rem,8vw,5.5rem) 0}.dash-hero span{font-size:.72rem;letter-spacing:.15em;color:#dfb252;font-weight:800}.dash-hero h1{font-size:clamp(2.1rem,7vw,3.6rem);letter-spacing:-.045em;margin:.7rem 0}.dash-hero p{color:#d3dee6;margin:0}
  .hero-actions{display:flex;flex-wrap:wrap;gap:.6rem;margin-top:1.6rem}.hero-actions a{display:inline-flex;align-items:center;gap:.5rem;min-height:2.9rem;padding:.65rem 1.05rem;border-radius:1.6rem;font-weight:750;font-size:.86rem;text-decoration:none;transition:transform 150ms cubic-bezier(.23,1,.32,1),background-color 180ms ease}.hero-actions a:active{transform:scale(.97)}.hero-actions .primary{background:#d0a03d;color:#17304f}.hero-actions .ghost{border:1px solid #ffffff3d;color:#fff}
  .dash-page{background:#f3f5f5;padding:clamp(1rem,5vw,3.5rem) 0;min-height:30rem}.dash-page .wrap{max-width:68rem;display:grid;gap:1rem}
  .state{padding:4rem 1rem;text-align:center;color:#6d7b86}.state.error{color:#91343e}
  .tiles{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:.8rem}.tiles a{display:grid;gap:.25rem;padding:1.1rem 1.2rem;border:1px solid #e0e5e7;border-radius:1rem;background:#fff;color:#b17d1c;text-decoration:none}.tiles b{font-size:1.7rem;letter-spacing:-.03em;color:#17304f;line-height:1.1;margin-top:.4rem}.tiles span{font-size:.78rem;color:#6d7b89}
  article{background:#fff;border:1px solid #e0e5e7;border-radius:1rem;padding:clamp(1.1rem,3vw,1.7rem);scroll-margin-top:10rem}article>header{margin-bottom:.6rem}article h2{font-size:1.15rem;color:#1c3b57;margin:0}article header p{font-size:.83rem;color:#748391;margin:.25rem 0 0}
  .row{border-top:1px solid #edf0f2}.summary{display:flex;align-items:center;gap:.9rem;width:100%;padding:.95rem .2rem;border:0;background:none;text-align:left;color:inherit}.main{display:grid;gap:.2rem;flex:1;min-width:0}.main b{color:#1c3b57;font-size:.95rem;overflow-wrap:anywhere}.main small,.amounts small{color:#748391;font-size:.76rem}
  i{flex:none;font-style:normal;font-size:.68rem;font-weight:800;letter-spacing:.04em;padding:.32rem .55rem;border-radius:.45rem;background:#edf0f1;color:#5d6b77}i.progress{background:#faf1da;color:#7a5a12}i.good{background:#e9f7ee;color:#267145}i.bad{background:#fff0f0;color:#91343e}
  .chevron{flex:none;display:grid;color:#7a8893;transition:transform 180ms cubic-bezier(.23,1,.32,1)}.chevron.turned{transform:rotate(180deg)}
  .detail{padding:.2rem .2rem 1.2rem}.detail h3{margin:1rem 0 .4rem;font-size:.68rem;letter-spacing:.1em;text-transform:uppercase;color:#a87618}.detail dl{margin:0}.detail dl>div{display:grid;grid-template-columns:minmax(0,2fr) minmax(0,3fr);gap:1rem;padding:.5rem 0;border-top:1px solid #f0f2f4}.detail dt{font-size:.76rem;color:#6d7b89;line-height:1.45}.detail dd{margin:0;font-size:.82rem;font-weight:650;color:#23384f;line-height:1.45;overflow-wrap:anywhere}.message{margin:0;white-space:pre-wrap;overflow-wrap:anywhere;font-size:.88rem;line-height:1.65;color:#33465a}
  .row.payment{display:flex;flex-wrap:wrap;align-items:center;gap:.9rem;padding:.95rem .2rem}.amounts{display:grid;gap:.2rem;text-align:right}.amounts b{color:#1c3b57;font-size:.9rem}.receipt{display:inline-flex;align-items:center;gap:.35rem;color:#a87618;font-weight:750;font-size:.82rem;text-decoration:none}
  .empty{border-top:1px solid #edf0f2;padding:1.4rem .2rem .4rem;color:#748391;font-size:.86rem}.empty p{margin:0 0 .6rem}.empty a{display:inline-flex;align-items:center;gap:.35rem;color:#a87618;font-weight:750;text-decoration:none}
  @media(hover:hover) and (pointer:fine){.hero-actions .primary:hover{background:#dfb757}.hero-actions .ghost:hover{background:#ffffff14}.summary:hover .main b{color:#a87618}.tiles a:hover{border-color:#d4bd83}}
  @media(max-width:40rem){.tiles{grid-template-columns:1fr}.tiles a{grid-template-columns:auto 1fr;align-items:center;column-gap:.8rem}.tiles b{margin:0;grid-row:span 2}.detail dl>div{grid-template-columns:1fr;gap:.15rem}.amounts{text-align:left;flex-basis:100%}.summary{flex-wrap:wrap}}
  @media(prefers-reduced-motion:reduce){.hero-actions a,.chevron{transition-duration:.01ms}}
</style>
