<script lang="ts">
  import {
    Menu,
    X,
    Globe2,
    Mail,
    Phone,
    Facebook,
    Linkedin,
    Youtube,
    ChevronDown,
    ArrowRight,
  } from "lucide-svelte";
  import { page } from "$app/state";
  import { cmsContent } from "$lib/cms";
  let open = false;
  const links = [
    ["HOME", "/"],
    ["ABOUT US", "/about"],
    ["SERVICES", "/services"],
    ["OPPORTUNITIES", "/opportunities"],
    ["CONTACT US", "/contact"],
  ];
  const active = (href: string) =>
    href === "/"
      ? page.url.pathname === "/"
      : page.url.pathname.startsWith(href);
</script>

<header>
  <div class="utility">
    <div class="wrap utility-inner">
      <span><Globe2 size={17} />{$cmsContent.utility.message}</span>
      <div class="contact">
        <a href={`mailto:${$cmsContent.utility.email}`}
          ><Mail size={17} /> {$cmsContent.utility.email}</a
        ><a href={`tel:${$cmsContent.utility.phone.replace(/\s/g, "")}`}
          ><Phone size={17} /> {$cmsContent.utility.phone}</a
        ><a aria-label="Facebook" href="#social"><Facebook size={18} /></a><a
          aria-label="LinkedIn"
          href="#social"><Linkedin size={18} /></a
        ><a aria-label="YouTube" href="#social"><Youtube size={19} /></a>
      </div>
    </div>
  </div>
  <nav class="nav" aria-label="Main navigation">
    <a class="brand" href="/"
      ><img src="/images/logo.webp" alt="Bengal Port official logo" /><span
        ><b>BENGAL PORT</b><small>Connecting Bengal to the World</small></span
      ></a
    >
    <div class:show={open} class="links">
      {#each links as link}<a
          class:active={active(link[1])}
          href={link[1]}
          onclick={() => (open = false)}
          >{link[0]}{#if link[0] === "SERVICES"}<ChevronDown
              size={15}
            />{/if}</a
        >{/each}
    </div>
    <a class="apply" href="/apply"
      ><span>APPLY / ENQUIRY</span><i><ArrowRight size={20} /></i></a
    ><button
      class="menu"
      aria-label={open ? "Close navigation" : "Open navigation"}
      aria-expanded={open}
      onclick={() => (open = !open)}
      >{#if open}<X />{:else}<Menu />{/if}</button
    >
  </nav>
</header>

<style>
  .utility {
    background: #102b4b;
    color: #f7f9fb;
    height: 3.375rem;
    display: flex;
    align-items: center;
    font-size: 0.875rem;
  }
  .utility-inner,
  .utility span,
  .contact,
  .contact a {
    display: flex;
    align-items: center;
  }
  .utility-inner {
    justify-content: space-between;
  }
  .utility span,
  .contact a {
    gap: 0.55rem;
  }
  .contact {
    gap: 1.85rem;
  }
  .contact a {
    color: #f7f9fb;
    text-decoration: none;
    transition: color 0.2s;
  }
  .contact a:hover {
    color: #edca72;
  }
  .nav {
    height: 5.6875rem;
    background: rgba(255, 255, 255, 0.98);
    border-radius: 0 0 1.75rem 1.75rem;
    display: flex;
    align-items: center;
    padding: 0 max(3.6vw, 1.75rem);
    gap: 1.75rem;
    box-shadow: 0 0.5rem 1.6rem rgba(23, 48, 79, 0.065);
    position: relative;
    z-index: 20;
  }
  .brand {
    display: flex;
    align-items: center;
    text-decoration: none;
    color: var(--heading);
    min-width: 22.8rem;
  }
  .brand img {
    width: 4.25rem;
    height: 4.25rem;
    border-radius: 50%;
    object-fit: cover;
    margin-right: 1rem;
  }
  .brand b {
    font-size: 1.78rem;
    letter-spacing: 0.015em;
    font-weight: 740;
  }
  .brand small {
    display: block;
    font-size: 0.875rem;
    margin-top: 0.1rem;
    color: var(--muted);
  }
  .links {
    display: flex;
    align-items: stretch;
    justify-content: center;
    flex: 1;
    height: 100%;
  }
  .links a {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0 clamp(1rem, 2.2vw, 2.35rem);
    text-decoration: none;
    color: #29405a;
    font-weight: 660;
    font-size: 0.875rem;
    position: relative;
    white-space: nowrap;
    transition: color 0.22s;
  }
  .links a:hover,
  .links a.active {
    color: var(--gold-deep);
  }
  .links a:after {
    content: "";
    position: absolute;
    bottom: 0.9rem;
    left: 35%;
    right: 35%;
    height: 2px;
    background: var(--gold);
    transform: scaleX(0);
    transition: transform 0.25s;
  }
  .links a:hover:after,
  .links a.active:after {
    transform: scaleX(1);
  }
  .apply {
    display: flex;
    align-items: center;
    gap: 1.05rem;
    white-space: nowrap;
    background: #d5a541;
    color: var(--heading);
    text-decoration: none;
    padding: 0.35rem 0.4rem 0.35rem 1.55rem;
    height: 3.25rem;
    border-radius: 1.75rem;
    font-weight: 760;
    font-size: 0.9rem;
    box-shadow: 0 0.45rem 1rem rgba(166, 116, 21, 0.16);
    transition:
      transform 0.28s cubic-bezier(0.16, 1, 0.3, 1),
      background 0.25s,
      box-shadow 0.25s;
  }
  .apply i {
    display: grid;
    place-items: center;
    background: var(--heading);
    color: #fff;
    border-radius: 50%;
    width: 2.5rem;
    height: 2.5rem;
    transition:
      transform 0.3s cubic-bezier(0.16, 1, 0.3, 1),
      background 0.25s;
  }
  .apply:hover {
    background: #dfb85f;
    transform: translateY(-0.18rem);
    box-shadow: 0 0.75rem 1.45rem rgba(166, 116, 21, 0.21);
  }
  .apply:hover i {
    transform: rotate(-8deg) translateX(0.12rem);
    background: #0f2947;
  }
  .apply:active {
    transform: scale(0.98);
  }
  .menu {
    display: none;
    border: 0;
    background: transparent;
    color: var(--heading);
    min-width: 2.75rem;
    min-height: 2.75rem;
    border-radius: 50%;
    place-items: center;
  }
  .menu:hover {
    background: #f1f3f4;
  }
  @media (max-width: 68.75rem) {
    .brand {
      min-width: auto;
    }
    .brand span {
      display: none;
    }
    .contact a:nth-child(-n + 2) {
      display: none;
    }
    .links {
      position: absolute;
      display: none;
      top: 5.35rem;
      left: 1.25rem;
      right: 1.25rem;
      height: auto;
      background: white;
      border-radius: 1rem;
      box-shadow: var(--shadow);
      padding: 0.9rem;
      flex-direction: column;
    }
    .links.show {
      display: flex;
      animation: menu-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .links a {
      padding: 0.9rem;
      min-height: 2.75rem;
    }
    .links a:after {
      display: none;
    }
    .menu {
      display: grid;
    }
    .apply {
      margin-left: auto;
    }
    .utility {
      height: 2.625rem;
    }
  }
  @media (max-width: 37.5rem) {
    .utility-inner > span {
      font-size: 0.7rem;
    }
    .contact {
      gap: 0.7rem;
    }
    .nav {
      height: 4.75rem;
      padding: 0 1rem;
      border-radius: 0 0 1.25rem 1.25rem;
    }
    .brand img {
      width: 3.25rem;
      height: 3.25rem;
    }
    .apply {
      padding: 0.28rem;
      height: 2.8rem;
      gap: 0.45rem;
    }
    .apply span {
      font-size: 0;
    }
    .apply span:after {
      content: "APPLY";
      font-size: 0.75rem;
      margin-left: 0.65rem;
    }
    .apply i {
      width: 2.2rem;
      height: 2.2rem;
    }
    .links {
      top: 4.45rem;
    }
    .menu {
      min-width: 2.75rem;
    }
  }
  @keyframes menu-in {
    from {
      opacity: 0;
      transform: translateY(-0.5rem);
      clip-path: inset(0 0 100% 0 round 1rem);
    }
    to {
      opacity: 1;
      transform: none;
      clip-path: inset(0 round 1rem);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .links.show {
      animation: none;
    }
  }
  @media (max-width: 37.5rem) {
    .nav {
      padding-inline: 0.75rem;
      gap: 0.35rem;
    }
    .brand img {
      margin-right: 0;
    }
    .apply {
      gap: 0.3rem;
    }
    .apply span:after {
      font-size: 0.72rem;
      margin-left: 0.55rem;
    }
    .links {
      left: 0.75rem;
      right: 0.75rem;
    }
  }
  .utility-inner {
    width: 100%;
    max-width: none;
    padding-inline: max(3.6vw, 1.75rem);
  }
  @media (max-width: 68.75rem) {
    .utility-inner {
      padding-inline: max(3.6vw, 1.75rem);
    }
  }
  @media (max-width: 37.5rem) {
    .utility-inner {
      padding-inline: 0.75rem;
    }
    .contact {
      margin-left: auto;
    }
  }
  /* Emil Kowalski-inspired interaction refinement: quick feedback, calm depth. */
  .utility {
    background: #163653;
    color: rgba(255, 255, 255, 0.88);
  }
  .utility-inner {
    letter-spacing: 0.005em;
  }
  .contact a {
    color: rgba(255, 255, 255, 0.88);
    transition: color 160ms ease;
  }
  .nav {
    box-shadow: 0 0.45rem 1.8rem rgba(23, 48, 79, 0.075);
  }
  .brand img {
    box-shadow: 0 0.2rem 0.8rem rgba(23, 48, 79, 0.12);
    transition:
      transform 200ms var(--ease-out),
      box-shadow 200ms ease;
  }
  .brand b {
    color: #1d3856;
    font-weight: 700;
    letter-spacing: 0.005em;
  }
  .links a {
    color: #3c5066;
    font-weight: 640;
    transition: color 160ms ease;
  }
  .links a::after {
    transform-origin: center;
    transition: transform 200ms var(--ease-out);
  }
  .apply {
    background: #d3a84f;
    color: #17304f;
    font-weight: 700;
    overflow: hidden;
    isolation: isolate;
    box-shadow:
      0 0.35rem 1rem rgba(166, 116, 21, 0.15),
      inset 0 1px rgba(255, 255, 255, 0.35);
    transition:
      transform 160ms var(--ease-out),
      background-color 200ms ease,
      box-shadow 200ms ease;
  }
  .apply::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    background: linear-gradient(
      110deg,
      transparent 15%,
      rgba(255, 255, 255, 0.3) 48%,
      transparent 75%
    );
    transform: translateX(-115%);
    transition: transform 420ms var(--ease-out);
  }
  .apply i {
    transition:
      transform 200ms var(--ease-out),
      background-color 180ms ease;
  }
  .apply:active,
  .menu:active {
    transform: scale(0.97);
  }
  .menu {
    transition:
      transform 140ms var(--ease-out),
      background-color 160ms ease;
  }
  @media (hover: hover) and (pointer: fine) {
    .contact a:hover {
      color: #f0cc76;
    }
    .brand:hover img {
      transform: rotate(-2deg) scale(1.025);
      box-shadow: 0 0.35rem 1rem rgba(23, 48, 79, 0.16);
    }
    .apply:hover {
      background: #ddb75f;
      transform: translateY(-0.12rem);
      box-shadow:
        0 0.7rem 1.4rem rgba(166, 116, 21, 0.19),
        inset 0 1px rgba(255, 255, 255, 0.4);
    }
    .apply:hover::before {
      transform: translateX(115%);
    }
    .apply:hover i {
      transform: translateX(0.12rem);
      background: #203d5d;
    }
    .menu:hover {
      background: #f1f3f4;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .brand img,
    .apply,
    .apply::before,
    .apply i,
    .menu {
      transition-duration: 0.01ms;
    }
  }
  @media (max-width: 37.5rem) {
    .utility-inner {
      gap: 0.5rem;
    }
    .utility-inner > span {
      min-width: 0;
      line-height: 1.25;
    }
    .contact a {
      min-width: 2.25rem;
      min-height: 2.25rem;
      justify-content: center;
    }
    .nav {
      width: 100%;
      max-width: 100vw;
      display: grid;
      grid-template-columns: 3.25rem minmax(0, 1fr) 4.25rem 2.75rem;
      gap: 0.25rem;
      padding-inline: 0.75rem;
    }
    .brand {
      grid-column: 1;
      width: 3.25rem;
    }
    .apply {
      grid-column: 3;
      width: 4.25rem;
      min-width: 4.25rem;
      padding-inline: 0.4rem;
      justify-content: center;
    }
    .menu {
      grid-column: 4;
      width: 2.75rem;
      min-width: 2.75rem;
    }
    .links {
      grid-column: 1 / -1;
      width: auto;
    }
  }
  @media (max-width: 22.5rem) {
    .utility-inner > span {
      font-size: 0.65rem;
    }
    .contact a {
      min-width: 2rem;
      padding: 0;
    }
    .nav {
      grid-template-columns: 3rem minmax(0, 1fr) 4rem 2.75rem;
      padding-inline: 0.5rem;
    }
    .brand,
    .brand img {
      width: 3rem;
      height: 3rem;
    }
    .apply {
      width: 4rem;
      min-width: 4rem;
    }
  }
</style>
