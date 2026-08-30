<script lang="ts">
  import { onMount } from "svelte";
  import { goto } from "$app/navigation";
  import { page } from "$app/state";
  import { api } from "$lib/api";
  import {
    Activity,
    BriefcaseBusiness,
    Building2,
    ClipboardList,
    FileCheck2,
    FileText,
    Images,
    GraduationCap,
    HeartPulse,
    LayoutDashboard,
    Menu,
    MessageSquare,
    Receipt,
    Settings,
    Store,
    UserRound,
    WalletCards,
    X,
  } from "lucide-svelte";
  let { children } = $props();
  let menuOpen = $state(false),
    ready = $state(false);
  const nav = [
    { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
    { label: "Enquiries", href: "/admin/enquiries", icon: MessageSquare },
    { label: "Applications", href: "/admin/applications", icon: ClipboardList },
    { label: "Opportunities", href: "/admin/opportunities", icon: Activity },
    { label: "Suppliers", href: "/admin/suppliers", icon: Store },
    { label: "Factories", href: "/admin/factories", icon: Building2 },
    { label: "Education", href: "/admin/education", icon: GraduationCap },
    { label: "Healthcare", href: "/admin/healthcare", icon: HeartPulse },
    { label: "Users", href: "/admin/users", icon: UserRound },
    { label: "Payments", href: "/admin/payments", icon: WalletCards },
    { label: "Receipts", href: "/admin/receipts", icon: Receipt },
    { label: "Hisab Kitab", href: "/admin/accounts", icon: FileCheck2 },
    { label: "Website content", href: "/admin/content", icon: FileText },
    { label: "Media library", href: "/admin/media", icon: Images },
    {
      label: "Business page",
      href: "/admin/business-content",
      icon: BriefcaseBusiness,
    },
    {
      label: "Education page",
      href: "/admin/division-content/education",
      icon: GraduationCap,
    },
    {
      label: "Healthcare page",
      href: "/admin/division-content/healthcare",
      icon: HeartPulse,
    },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];
  const active = (href: string) =>
    href === "/admin"
      ? page.url.pathname === "/admin"
      : page.url.pathname.startsWith(href);
  onMount(async () => {
    const token = localStorage.getItem("bp_token");
    const user = JSON.parse(localStorage.getItem("bp_user") || "null");
    if (!token || user?.role !== "ADMIN") {
      goto("/login?next=/admin");
      return;
    }
    try {
      await api("/admin/dashboard", {
        headers: { authorization: `Bearer ${token}` },
      });
      ready = true;
    } catch {
      localStorage.removeItem("bp_token");
      localStorage.removeItem("bp_user");
      goto("/login?next=/admin");
    }
  });
</script>

{#if page.url.pathname === "/admin/content"}
  {@render children()}
{:else if !ready}
  <div class="admin-loading">
    <img src="/images/logo.webp" alt="" /><span>Opening admin workspace…</span>
  </div>
{:else}
  <div class="admin-shell">
    <aside class:open={menuOpen}>
      <div class="brand">
        <img src="/images/logo.webp" alt="Bengal Port" />
        <div><b>BENGAL PORT</b><span>Administration</span></div>
        <button aria-label="Close navigation" onclick={() => (menuOpen = false)}
          ><X size={20} /></button
        >
      </div>
      <nav aria-label="Admin navigation">
        {#each nav as item}<a
            class:active={active(item.href)}
            href={item.href}
            onclick={() => (menuOpen = false)}
            ><svelte:component this={item.icon} size={18} /><span
              >{item.label}</span
            >{#if active(item.href)}<i></i>{/if}</a
          >{/each}
      </nav>
      <div class="account">
        <span>Signed in as</span><b>Administrator</b><a href="/"
          >View public website</a
        >
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
        ><b>Bengal Port Admin</b><a href="/">Website</a>
      </div>
      {@render children()}
    </div>
  </div>
{/if}

<style>
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
  .admin-shell nav {
    padding-top: 0.9rem;
    overflow-y: auto;
    scrollbar-width: none;
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
    color: #e1ba60;
    font-size: 0.75rem;
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
    .admin-shell > aside {
      position: fixed;
      left: 0;
      transform: translateX(-100%);
      width: min(18rem, 86vw);
      transition: transform 240ms var(--ease-drawer);
    }
    .admin-shell > aside.open {
      transform: none;
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
      padding: 0 1rem;
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
    .mobile-bar a {
      margin-left: auto;
      color: #e6c36d;
      font-size: 0.78rem;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .admin-shell > aside,
    .admin-shell nav a {
      transition: none;
    }
  }
</style>
