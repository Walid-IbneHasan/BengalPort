<script lang="ts">
  import { cmsContent } from "$lib/cms";
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api, ApiError } from "$lib/api";
  import { apiUrl } from "$lib/config";
  import { isStaff, staffRole, type StaffRole } from "$lib/staff";
  import { officePermissions, pathPermission, ROLE_LABELS, setOfficeMe, type OfficeMe } from "$lib/office";
  import "../../office.css";
  import {
    Activity,
    BriefcaseBusiness,
    Building2,
    ClipboardList,
    FileCheck2,
    FileText,
    Images,
    Info,
    LayoutGrid,
    Phone,
    GraduationCap,
    HeartPulse,
    LayoutDashboard,
    Menu,
    MessageSquare,
    MoonStar,
    Receipt,
    ScrollText,
    Bell,
    BookOpenCheck,
    BookOpenText,
    Building,
    CheckSquare,
    FolderLock,
    Handshake,
    History,
    Landmark,
    SlidersHorizontal,
    UsersRound,
    Settings,
    Star,
    Store,
    UserRound,
    WalletCards,
    X,
  } from "lucide-svelte";
  let { children } = $props();
  let menuOpen = $state(false),
    ready = $state(false),
    unreachable = $state(false),
    role = $state<StaffRole | null>(null);
  // The office (business management) first, then the website. Each link
  // shows only for staff whose role has its permission.
  type NavItem = { label: string; href: string; icon: any; need?: string | null; group: "office" | "website" };
  const nav: NavItem[] = [
    { group: "office", label: "Dashboard", href: "/admin", icon: LayoutDashboard, need: "dashboard.read" },
    { group: "office", label: "Customers", href: "/admin/customers", icon: UsersRound, need: "customers.read" },
    { group: "office", label: "Deals", href: "/admin/deals", icon: Handshake, need: "deals.read" },
    { group: "office", label: "Invoices", href: "/admin/accounts/invoices", icon: ScrollText, need: "invoices.read" },
    { group: "office", label: "Collections", href: "/admin/collections", icon: Landmark, need: "payments.read" },
    { group: "office", label: "Finance", href: "/admin/finance", icon: BookOpenCheck, need: "accounts.read" },
    { group: "office", label: "Hisab Kitab", href: "/admin/accounts", icon: FileCheck2, need: "hisab.read" },
    { group: "office", label: "Documents", href: "/admin/documents", icon: FolderLock, need: "documents.read" },
    { group: "office", label: "Tasks", href: "/admin/tasks", icon: CheckSquare, need: "tasks.read" },
    { group: "office", label: "Approvals", href: "/admin/approvals", icon: Building, need: null },
    { group: "office", label: "Notifications", href: "/admin/notifications", icon: Bell, need: null },
    { group: "office", label: "Audit log", href: "/admin/audit", icon: History, need: "audit.read" },
    { group: "office", label: "Office settings", href: "/admin/office-settings", icon: SlidersHorizontal, need: "settings.update" },
    // No role but the Super Admin has "guide.read", so only they see it.
    { group: "office", label: "Admin guide", href: "/admin/guide", icon: BookOpenText, need: "guide.read" },
    { group: "website", label: "Enquiries", href: "/admin/enquiries", icon: MessageSquare, need: "enquiries.read" },
    { group: "website", label: "Applications", href: "/admin/applications", icon: ClipboardList, need: "applications.read" },
    { group: "website", label: "Opportunities", href: "/admin/opportunities", icon: Activity, need: "directory.read" },
    { group: "website", label: "Suppliers", href: "/admin/suppliers", icon: Store, need: "directory.read" },
    { group: "website", label: "Factories", href: "/admin/factories", icon: Building2, need: "directory.read" },
    { group: "website", label: "Education", href: "/admin/education", icon: GraduationCap, need: "directory.read" },
    { group: "website", label: "Healthcare", href: "/admin/healthcare", icon: HeartPulse, need: "directory.read" },
    { group: "website", label: "Users", href: "/admin/users", icon: UserRound, need: "users.read" },
    { group: "website", label: "Website payments", href: "/admin/payments", icon: WalletCards, need: "payments.read" },
    { group: "website", label: "Receipts", href: "/admin/receipts", icon: Receipt, need: "payments.read" },
    { group: "website", label: "Reviews", href: "/admin/reviews", icon: Star, need: "reviews.read" },
    { group: "website", label: "Website content", href: "/admin/content", icon: FileText, need: "content.read" },
    { group: "website", label: "Media library", href: "/admin/media", icon: Images, need: "media.read" },
    { group: "website", label: "Business page", href: "/admin/business-content", icon: BriefcaseBusiness, need: "content.read" },
    { group: "website", label: "Education page", href: "/admin/division-content/education", icon: GraduationCap, need: "content.read" },
    { group: "website", label: "Healthcare page", href: "/admin/division-content/healthcare", icon: HeartPulse, need: "content.read" },
    { group: "website", label: "Umrah page", href: "/admin/division-content/umrah", icon: MoonStar, need: "content.read" },
    { group: "website", label: "About page", href: "/admin/page-content/about", icon: Info, need: "content.read" },
    { group: "website", label: "Services page", href: "/admin/page-content/services", icon: LayoutGrid, need: "content.read" },
    { group: "website", label: "Contact page", href: "/admin/page-content/contact", icon: Phone, need: "content.read" },
    { group: "website", label: "Opportunities page", href: "/admin/page-content/opportunities", icon: Activity, need: "content.read" },
    { group: "website", label: "Apply page", href: "/admin/page-content/apply", icon: ClipboardList, need: "content.read" },
    { group: "website", label: "Pay page", href: "/admin/page-content/pay", icon: WalletCards, need: "content.read" },
    { group: "website", label: "Sign-in page", href: "/admin/page-content/login", icon: UserRound, need: "content.read" },
    { group: "website", label: "Privacy Policy", href: "/admin/page-content/privacy", icon: FileText, need: "content.read" },
    { group: "website", label: "Terms of Use", href: "/admin/page-content/terms", icon: FileText, need: "content.read" },
    { group: "website", label: "Documents and PDFs", href: "/admin/page-content/documents", icon: FileText, need: "content.update" },
    { group: "website", label: "Settings", href: "/admin/settings", icon: Settings, need: "settings.update" },
  ];
  // Hisab Kitab is not lit while its invoices, which have their own link, are open.
  const active = (href: string) =>
    href === "/admin"
      ? page.url.pathname === "/admin"
      : page.url.pathname.startsWith(href) &&
        !(href === "/admin/accounts" && page.url.pathname.startsWith("/admin/accounts/invoices"));
  // Staff see only the pages their role may open.
  const may = (need: string | null | undefined) => !need || role === "ADMIN" || $officePermissions.has(need);
  let shownNav = $derived(nav.filter((item) => may(item.need)));
  let officeNav = $derived(shownNav.filter((item) => item.group === "office"));
  let websiteNav = $derived(shownNav.filter((item) => item.group === "website"));
  let allowed = $derived(may(pathPermission(page.url.pathname)));
  // Without the dashboard, start at the first page the role can open.
  $effect(() => {
    if (ready && /^\/admin\/?$/.test(page.url.pathname) && !may("dashboard.read")) {
      const first = shownNav.find((item) => item.href !== "/admin");
      if (first) goto(first.href, { replaceState: true });
    }
  });
  // Unread notifications, for the bell; looked at again every minute.
  let unread = $state(0);
  async function checkInbox() {
    try {
      const body = await fetch(`${apiUrl()}/office/notifications?unread=1`, { headers: { authorization: `Bearer ${localStorage.getItem("bp_token")}` } }).then((r) => (r.ok ? r.json() : null));
      if (body) unread = body.meta?.unread ?? 0;
    } catch {
      // Offline for a moment: the next check will do.
    }
  }
  $effect(() => {
    if (!ready) return;
    checkInbox();
    // A tab in the background does not ask; it asks again when it is looked at.
    const timer = setInterval(() => document.visibilityState === "visible" && checkInbox(), 60_000);
    const back = () => document.visibilityState === "visible" && checkInbox();
    document.addEventListener("visibilitychange", back);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", back);
    };
  });
  $effect(() => {
    // Opening the notifications page clears the count soon after.
    if (page.url.pathname === "/admin/notifications") setTimeout(checkInbox, 1500);
  });
  onMount(async () => {
    const token = localStorage.getItem("bp_token");
    const user = JSON.parse(localStorage.getItem("bp_user") || "null");
    if (!token || !isStaff(user?.role)) {
      goto(`/login?next=${encodeURIComponent(page.url.pathname)}`);
      return;
    }
    try {
      // The server says what the account is now; it may have changed since sign-in.
      const me = await api<{ role: string }>("/auth/me", {
        headers: { authorization: `Bearer ${token}` },
      });
      if (!isStaff(me.role)) throw new ApiError("Admin access required", "FORBIDDEN", undefined, 403);
      role = me.role;
      staffRole.set(me.role);
      setOfficeMe(await api<OfficeMe>("/office/me/permissions", { headers: { authorization: `Bearer ${token}` } }));
      localStorage.setItem("bp_user", JSON.stringify({ ...user, role: me.role }));
      ready = true;
    } catch (e) {
      // Being asked to replace a temporary password is not a refused session:
      // the request itself has already moved them to the profile page.
      if (e instanceof ApiError && e.code === "PASSWORD_CHANGE_REQUIRED") return;
      // Only a refused session ends it; a network problem can be retried.
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        localStorage.removeItem("bp_token");
        localStorage.removeItem("bp_user");
        goto(`/login?next=${encodeURIComponent(page.url.pathname)}`);
      } else unreachable = true;
    }
  });
  function signOut() {
    localStorage.removeItem("bp_token");
    localStorage.removeItem("bp_user");
    goto("/login");
  }
</script>

<svelte:head><meta name="robots" content="noindex" /></svelte:head>
{#if page.url.pathname === "/admin/content" || page.url.pathname.startsWith("/admin/print/")}
  {@render children()}
{:else if !ready}
  <div class="admin-loading">
    <img src={$cmsContent.brand.logo} alt="" />
    {#if unreachable}<span role="alert">The server could not be reached.</span
      ><a href={page.url.pathname} data-sveltekit-reload>Try again</a
      >{:else}<span>Opening admin workspace…</span>{/if}
  </div>
{:else}
  <div class="admin-shell">
    <aside class:open={menuOpen}>
      <div class="brand">
        <img src={$cmsContent.brand.logo} alt={$cmsContent.brand.name} />
        <div><b>BENGAL PORT</b><span>Administration</span></div>
        <button aria-label="Close navigation" onclick={() => (menuOpen = false)}
          ><X size={20} /></button
        >
      </div>
      <nav aria-label="Admin navigation">
        {#snippet link(item: NavItem)}<a
            class:active={active(item.href)}
            href={item.href}
            onclick={() => (menuOpen = false)}
            ><svelte:component this={item.icon} size={18} /><span
              >{item.label}</span
            >{#if item.href === "/admin/notifications" && unread}<em class="count" aria-label={`${unread} unread`}>{unread > 99 ? "99+" : unread}</em>{/if}{#if active(item.href)}<i></i>{/if}</a
          >{/snippet}
        {#if officeNav.length}<p class="group">Office</p>{/if}
        {#each officeNav as item}{@render link(item)}{/each}
        {#if websiteNav.length}<p class="group">Website</p>{/if}
        {#each websiteNav as item}{@render link(item)}{/each}
      </nav>
      <div class="account">
        <span>Signed in as</span><b>{ROLE_LABELS[role ?? "ADMIN"]}</b><a href="/profile"
          >My profile</a
        ><a href="/"
          >View public website</a
        ><button onclick={signOut}>Sign out</button>
      </div>
    </aside>
    {#if menuOpen}<button
        class="scrim"
        aria-label="Close navigation"
        onclick={() => (menuOpen = false)}
      ></button>{/if}
    <div class="workspace">
      <div class="mobile-bar">
        <button aria-label="Open navigation" onclick={() => (menuOpen = true)}
          ><Menu /></button
        ><b>Bengal Port Admin</b><a class="bell" href="/admin/notifications" aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}><Bell size={19} />{#if unread}<em class="count">{unread > 99 ? "99+" : unread}</em>{/if}</a><a href="/">Website</a>
      </div>
      {#if allowed}
        {@render children()}
      {:else}
        <section class="not-yours" role="alert">
          <h1>Your role cannot open this page</h1>
          <p>The Super Admin decides what each role may see and do, under Office settings → Roles and permissions. Ask them if you need this page for your work.</p>
          <a href={shownNav[0]?.href ?? "/profile"}>Go to {shownNav[0]?.label ?? "my profile"}</a>
        </section>
      {/if}
    </div>
  </div>
{/if}

<style>
  .group {
    margin: 1rem 0 0.35rem;
    padding: 0 0.85rem;
    font-size: 0.66rem;
    font-weight: 800;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #8fa0b5;
  }
  .group:first-child {
    margin-top: 0.2rem;
  }
  .count {
    display: inline-grid;
    place-items: center;
    min-width: 1.35rem;
    height: 1.35rem;
    margin-left: auto;
    padding: 0 0.35rem;
    border-radius: 1rem;
    background: #d19b2d;
    color: #07182f;
    font-size: 0.7rem;
    font-style: normal;
    font-weight: 850;
  }
  .bell {
    position: relative;
    display: inline-grid !important;
    place-items: center;
  }
  .bell .count {
    position: absolute;
    top: -0.35rem;
    right: -0.55rem;
    min-width: 1.15rem;
    height: 1.15rem;
    font-size: 0.62rem;
  }
  .not-yours {
    max-width: 38rem;
    margin: clamp(2rem, 8vw, 5rem) auto;
    padding: 0 1.25rem;
  }
  .not-yours h1 {
    margin: 0 0 0.6rem;
    font-size: 1.35rem;
    color: #07182f;
  }
  .not-yours p {
    margin: 0 0 1.25rem;
    line-height: 1.6;
    color: #4b6072;
  }
  .not-yours a {
    display: inline-flex;
    padding: 0.65rem 1.1rem;
    border-radius: 0.6rem;
    background: #07182f;
    color: #fff;
    font-weight: 750;
    text-decoration: none;
  }
  .admin-loading {
    min-height: 100svh;
    background: #f2f4f6;
    display: grid;
    place-items: center;
    align-content: center;
    gap: 1rem;
    color: #637287;
  }
  .admin-loading img {
    width: 4.5rem;
    height: 4.5rem;
    border-radius: 50%;
    box-shadow: 0 0.6rem 1.6rem #10264020;
  }
  .admin-shell {
    min-height: 100svh;
    background: #f2f4f6;
    display: grid;
    grid-template-columns: 16.75rem minmax(0, 1fr);
    color: #25384d;
  }
  .admin-shell > aside {
    height: 100svh;
    position: sticky;
    top: 0;
    background: #102640;
    color: #fff;
    padding: 1.15rem 0.85rem;
    display: flex;
    flex-direction: column;
    z-index: 90;
    box-shadow: 0.5rem 0 2rem #10264012;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.35rem 0.45rem 1.15rem;
    border-bottom: 1px solid #ffffff14;
  }
  .brand img {
    width: 2.8rem;
    height: 2.8rem;
    border-radius: 50%;
    box-shadow: 0 0.25rem 0.8rem #0003;
  }
  .brand b,
  .brand span {
    display: block;
  }
  .brand b {
    font-size: 0.8rem;
    letter-spacing: 0.08em;
  }
  .brand span {
    font-size: 0.7rem;
    color: #9caec1;
    margin-top: 0.18rem;
  }
  .brand button {
    display: none;
    margin-left: auto;
    border: 0;
    background: #ffffff10;
    color: #fff;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.65rem;
  }
  /* The list is longer than most screens. It scrolls inside the sidebar, and
     a soft edge appears at the top or bottom while more items lie beyond it. */
  .admin-shell nav {
    flex: 1;
    min-height: 0;
    padding-top: 0.9rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: thin;
    scrollbar-color: #ffffff38 transparent;
    background:
      linear-gradient(#102640 40%, #10264000) top / 100% 2.6rem no-repeat local,
      linear-gradient(#10264000, #102640 60%) bottom / 100% 2.6rem no-repeat local,
      linear-gradient(#ffffff2e, #ffffff00) top / 100% 1.1rem no-repeat scroll,
      linear-gradient(#ffffff00, #ffffff2e) bottom / 100% 1.1rem no-repeat scroll;
  }
  .admin-shell nav a {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-height: 2.55rem;
    padding: 0.55rem 0.7rem;
    margin: 0.08rem 0;
    border-radius: 0.65rem;
    color: #b9c6d4;
    text-decoration: none;
    font-size: 0.83rem;
    font-weight: 650;
    transition:
      background-color 160ms ease,
      color 160ms ease,
      transform 140ms var(--ease-out);
  }
  .admin-shell nav a i {
    position: absolute;
    right: 0.55rem;
    width: 0.35rem;
    height: 0.35rem;
    border-radius: 50%;
    background: #e2b958;
    box-shadow: 0 0 0 0.2rem #e2b9581f;
  }
  .admin-shell nav a.active {
    background: #ffffff10;
    color: #f0c96f;
  }
  .admin-shell nav a:active {
    transform: scale(0.98);
  }
  .account {
    flex: none;
    margin-top: auto;
    border-top: 1px solid #ffffff14;
    padding: 1rem 0.7rem 0.25rem;
  }
  .account span,
  .account b {
    display: block;
  }
  .account span {
    font-size: 0.68rem;
    color: #879aad;
  }
  .account b {
    font-size: 0.82rem;
    margin: 0.2rem 0 0.65rem;
  }
  .account a {
    display: block;
    margin-top: 0.3rem;
    color: #e1ba60;
    font-size: 0.75rem;
  }
  .account button {
    display: block;
    margin-top: 0.7rem;
    padding: 0.45rem 0.7rem;
    border: 1px solid #ffffff24;
    border-radius: 0.55rem;
    background: none;
    color: #dbe3ee;
    font-size: 0.75rem;
    cursor: pointer;
  }
  .workspace {
    min-width: 0;
  }
  .mobile-bar {
    display: none;
  }
  .scrim {
    display: none;
  }
  @media (hover: hover) and (pointer: fine) {
    .admin-shell nav a:hover {
      background: #ffffff0b;
      color: #fff;
      transform: translateX(0.12rem);
    }
  }
  @media (max-width: 58rem) {
    .admin-shell {
      grid-template-columns: 1fr;
    }
    /* Closed, the menu is off-screen, casts no shadow onto the page and
       cannot be reached with the keyboard. */
    .admin-shell > aside {
      position: fixed;
      left: 0;
      transform: translateX(-100%);
      width: min(18rem, 86vw);
      height: 100dvh;
      padding-left: max(0.85rem, env(safe-area-inset-left));
      padding-bottom: max(1.15rem, env(safe-area-inset-bottom));
      visibility: hidden;
      box-shadow: none;
      transition:
        transform 240ms var(--ease-drawer),
        visibility 0s 240ms;
    }
    .admin-shell > aside.open {
      transform: none;
      visibility: visible;
      box-shadow: 0.5rem 0 2rem #07182f66;
      transition:
        transform 240ms var(--ease-drawer),
        visibility 0s;
    }
    .admin-shell nav a {
      min-height: 2.75rem;
    }
    .account {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem 1rem;
      padding-top: 0.8rem;
    }
    .account span,
    .account b {
      display: none;
    }
    .account a {
      padding: 0.5rem 0;
    }
    .account button {
      margin-top: 0;
      min-height: 2.5rem;
      padding: 0.45rem 0.9rem;
    }
    .brand button {
      display: grid;
      place-items: center;
    }
    .scrim {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 80;
      border: 0;
      background: #07182f80;
      backdrop-filter: blur(2px);
    }
    .mobile-bar {
      height: 3.75rem;
      padding: 0 max(1rem, env(safe-area-inset-right)) 0
        max(1rem, env(safe-area-inset-left));
      background: #102640;
      color: #fff;
      display: flex;
      align-items: center;
      gap: 0.8rem;
      position: sticky;
      top: 0;
      z-index: 70;
    }
    .mobile-bar button {
      border: 0;
      background: #ffffff10;
      color: #fff;
      width: 2.6rem;
      height: 2.6rem;
      border-radius: 0.65rem;
      display: grid;
      place-items: center;
    }
    .mobile-bar b {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mobile-bar a {
      margin-left: auto;
      padding: 0.75rem 0.2rem;
      color: #e6c36d;
      font-size: 0.78rem;
    }
  }
  /* A phone held sideways: less room for the heading, more for the list. */
  @media (max-height: 30rem) {
    .admin-shell > aside {
      padding-top: 0.6rem;
    }
    .brand {
      padding-bottom: 0.6rem;
    }
    .brand img {
      width: 2.2rem;
      height: 2.2rem;
    }
    .admin-shell nav {
      padding-top: 0.4rem;
    }
    .account {
      padding-top: 0.5rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .admin-shell > aside,
    .admin-shell nav a {
      transition: none;
    }
  }
</style>
