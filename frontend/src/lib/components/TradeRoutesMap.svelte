<script lang="ts">
  import dots from "$lib/world-dots.json";
  import { DHAKA, arcPath, marketPlace, project } from "$lib/markets";

  // The Business hero's backdrop: the world as a field of dots, with a gold
  // route drawn from Dhaka to the market the title currently names. Routes
  // already shown stay faintly in place, so a full cycle leaves a network.
  let { markets, active = 0 }: { markets: string[]; active?: number } = $props();

  // One path holds every dot: a dot is a zero-length stroke with round caps.
  const land = (dots as [number, number][]).map(([x, y]) => `M${x} ${y}h0.01`).join("");
  const home = project(DHAKA.lat, DHAKA.lon);

  let routes = $derived(
    markets.map((name) => {
      const place = marketPlace(name);
      return place ? { name, d: arcPath(DHAKA, place), end: project(place.lat, place.lon) } : null;
    }),
  );
  // Which routes have had their turn since the page opened.
  let seen = $state(new Set<number>());
  $effect(() => {
    if (routes[active]) seen = new Set([...seen, active]);
  });
</script>

<svg class="map" viewBox="12 18 348 128" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">
  <path class="land" d={land} />
  {#each routes as route, i}
    {#if route}
      <path class="arc" class:active={i === active} class:seen={i !== active && seen.has(i)} d={route.d} pathLength="1" />
      <circle class="port" class:lit={i === active} cx={route.end.x} cy={route.end.y} r="1.1" />
      {#if i === active}
        {#key active}
          <circle class="traveller" r="1.3" style={`offset-path: path('${route.d}')`} />
          <circle class="landing" cx={route.end.x} cy={route.end.y} r="2.8" />
        {/key}
      {/if}
    {/if}
  {/each}
  <circle class="home-ring" cx={home.x} cy={home.y} r="2.4" />
  <circle class="home" cx={home.x} cy={home.y} r="1.5" />
</svg>

<style>
  .map {
    display: block;
    width: 100%;
    height: 100%;
    overflow: visible;
  }
  .land {
    fill: none;
    stroke: #e9eef4;
    stroke-width: 1.15;
    stroke-linecap: round;
    opacity: 0.26;
  }
  .arc {
    fill: none;
    stroke: #efc45e;
    stroke-width: 0.9;
    stroke-linecap: round;
    stroke-dasharray: 1;
    stroke-dashoffset: 1;
    opacity: 0;
    transition: opacity 600ms ease;
  }
  .arc.active {
    opacity: 1;
    animation: draw 1400ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
    filter: drop-shadow(0 0 1.2px rgba(239, 196, 94, 0.8));
  }
  .arc.seen {
    opacity: 0.3;
    stroke-dashoffset: 0;
  }
  @keyframes draw {
    to {
      stroke-dashoffset: 0;
    }
  }
  .port {
    fill: #efc45e;
    opacity: 0.45;
    transition: opacity 400ms ease;
  }
  .port.lit {
    opacity: 1;
  }
  .traveller {
    fill: #fff;
    offset-rotate: 0deg;
    animation: travel 1400ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.9));
  }
  @keyframes travel {
    from {
      offset-distance: 0%;
      opacity: 1;
    }
    85% {
      opacity: 1;
    }
    to {
      offset-distance: 100%;
      opacity: 0;
    }
  }
  .landing {
    fill: none;
    stroke: #efc45e;
    stroke-width: 0.6;
    transform-box: fill-box;
    transform-origin: center;
    transform: scale(0);
    opacity: 0;
    animation: land 900ms 1200ms cubic-bezier(0.23, 1, 0.32, 1) forwards;
  }
  @keyframes land {
    from {
      transform: scale(0);
      opacity: 0.9;
    }
    to {
      transform: scale(1);
      opacity: 0;
    }
  }
  .home {
    fill: #efc45e;
    filter: drop-shadow(0 0 2px rgba(239, 196, 94, 0.9));
  }
  .home-ring {
    fill: none;
    stroke: #efc45e;
    stroke-width: 0.6;
    transform-box: fill-box;
    transform-origin: center;
    animation: pulse 2600ms ease-out infinite;
  }
  @keyframes pulse {
    from {
      transform: scale(0.4);
      opacity: 0.9;
    }
    to {
      transform: scale(2.2);
      opacity: 0;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .arc {
      opacity: 0.55;
      stroke-dashoffset: 0;
      animation: none;
      transition: none;
    }
    .arc.active {
      opacity: 1;
      animation: none;
    }
    .traveller,
    .landing {
      display: none;
    }
    .home-ring {
      animation: none;
      transform: scale(1.4);
      opacity: 0.6;
    }
  }
</style>
