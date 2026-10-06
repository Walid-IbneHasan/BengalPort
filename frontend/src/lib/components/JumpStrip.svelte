<script lang="ts">
  import { ArrowRight } from "lucide-svelte";

  // A row of quick links that sits across the lower edge of a hero: an icon,
  // a title and a line under it, each leading somewhere on the page or site.
  type Item = { icon: any; title: string; subtitle: string; href: string };
  let { items, label = "Quick links" }: { items: Item[]; label?: string } = $props();
</script>

<nav class="strip" aria-label={label}>
  {#each items as item}{@const Icon = item.icon}
    <a href={item.href}>
      <i><Icon size={20} /></i>
      <span><b>{item.title}</b><small>{item.subtitle}</small></span>
      <ArrowRight size={16} class="go" />
    </a>
  {/each}
</nav>

<style>
  .strip {
    --s-ink: var(--ink, #17304f);
    --s-gold: var(--on-ink-gold, #efc45e);
    --s-line: var(--line, #e2e6e8);
    --s-muted: var(--muted, #607083);
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    border: 1px solid var(--s-line);
    border-radius: 1rem;
    background: #fff;
    box-shadow: 0 1rem 2.6rem #17304f1f;
    overflow: hidden;
  }
  a {
    display: grid;
    grid-template-columns: 2.5rem 1fr;
    gap: 0.6rem;
    align-items: center;
    min-height: 4.6rem;
    padding: 0.85rem 0.9rem;
    color: var(--s-ink);
    text-decoration: none;
    transition: background-color 160ms ease;
  }
  a:nth-child(even) {
    border-left: 1px solid var(--s-line);
  }
  a:nth-child(n + 3) {
    border-top: 1px solid var(--s-line);
  }
  i {
    width: 2.5rem;
    height: 2.5rem;
    display: grid;
    place-items: center;
    border-radius: 50%;
    background: var(--s-ink);
    color: var(--s-gold);
  }
  span {
    display: grid;
    gap: 0.1rem;
    min-width: 0;
  }
  b {
    font-size: 0.86rem;
    line-height: 1.2;
  }
  small {
    font-size: 0.72rem;
    line-height: 1.35;
    color: var(--s-muted);
  }
  a :global(.go) {
    display: none;
    color: var(--s-muted);
    transition: transform 160ms cubic-bezier(0.23, 1, 0.32, 1), color 160ms ease;
  }
  @media (hover: hover) and (pointer: fine) {
    a:hover {
      background: #fafaf7;
    }
    a:hover :global(.go) {
      transform: translateX(0.2rem);
      color: var(--s-ink);
    }
  }
  @media (min-width: 48rem) {
    .strip {
      grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
    }
    a {
      grid-template-columns: 2.75rem 1fr auto;
      gap: 0.8rem;
      min-height: 5.4rem;
      padding: 1rem 1.2rem;
    }
    a:nth-child(n + 2) {
      border-left: 1px solid var(--s-line);
      border-top: 0;
    }
    i {
      width: 2.75rem;
      height: 2.75rem;
    }
    b {
      font-size: 0.95rem;
    }
    small {
      font-size: 0.76rem;
    }
    a :global(.go) {
      display: block;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    a,
    a :global(.go) {
      transition: none;
    }
  }
</style>
