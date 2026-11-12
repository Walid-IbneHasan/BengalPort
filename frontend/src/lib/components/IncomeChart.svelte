<script lang="ts">
  import { money } from "$lib/office";
  import { niceMax, periodLabel, shortTaka } from "$lib/dashboard-range";

  // Income and expense side by side for each day, week or month. Hovering or
  // focusing a period shows its figures; the same figures are in a table for
  // anyone who prefers one, or uses a screen reader.
  type Point = { period: string; income: number; expense: number; net: number };
  let { series, group }: { series: Point[]; group: "day" | "week" | "month" } = $props();

  const HEIGHT = 230;
  const PAD = { top: 14, right: 8, bottom: 30, left: 52 };
  let width = $state(640);
  let active = $state<number | null>(null);
  let asTable = $state(false);

  let plotW = $derived(Math.max(10, width - PAD.left - PAD.right));
  let plotH = HEIGHT - PAD.top - PAD.bottom;
  let top = $derived(niceMax(Math.max(0, ...series.map((p) => Math.max(p.income, p.expense)))));
  let ticks = $derived([0, 0.25, 0.5, 0.75, 1].map((f) => f * top));
  let band = $derived(plotW / Math.max(1, series.length));
  let barW = $derived(Math.max(2, Math.min(24, (band * 0.72 - 2) / 2)));
  // Label every period when they fit, otherwise every second, third…
  let every = $derived(Math.max(1, Math.ceil(series.length / Math.max(1, Math.floor(plotW / (group === "month" ? 44 : 52))))));
  const y = (value: number) => PAD.top + plotH - (Math.max(0, value) / top) * plotH;

  // A bar with a 4px rounded top, square on the baseline.
  function bar(x: number, value: number) {
    const base = PAD.top + plotH;
    const h = base - y(value);
    if (h <= 0.5) return "";
    const r = Math.min(4, h, barW / 2);
    const t = base - h;
    return `M${x},${base}V${t + r}Q${x},${t} ${x + r},${t}H${x + barW - r}Q${x + barW},${t} ${x + barW},${t + r}V${base}Z`;
  }
  const centre = (i: number) => PAD.left + band * i + band / 2;
  let tipLeft = $derived(active === null ? 0 : Math.min(Math.max(centre(active), 90), width - 90));
</script>

<div class="chart">
  <div class="top">
    <ul class="legend" aria-label="Key">
      <li><i class="income"></i>Income</li>
      <li><i class="expense"></i>Expense</li>
    </ul>
    <button type="button" class="o-btn ghost small" aria-pressed={asTable} onclick={() => (asTable = !asTable)}>{asTable ? "Show chart" : "Show as table"}</button>
  </div>

  {#if asTable}
    <div class="o-table-wrap">
      <table class="o-table">
        <thead><tr><th>Period</th><th class="num">Income</th><th class="num">Expense</th><th class="num">Net</th></tr></thead>
        <tbody>
          {#each series as point (point.period)}
            <tr>
              <td class="lead" data-label="Period">{periodLabel(point.period, group)}</td>
              <td class="num" data-label="Income">{money(point.income)}</td>
              <td class="num" data-label="Expense">{money(point.expense)}</td>
              <td class="num" data-label="Net"><b class:loss={point.net < 0}>{money(point.net)}</b></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {:else}
    <div class="plot" bind:clientWidth={width}>
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} width={width} height={HEIGHT} role="img" aria-label={`Income and expense by ${group}. Use “Show as table” for the figures.`}>
        {#each ticks as tick, i (i)}
          <line class="grid" x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} />
          <text class="axis" x={PAD.left - 8} y={y(tick) + 4} text-anchor="end">{shortTaka(tick)}</text>
        {/each}
        {#each series as point, i (point.period)}
          {@const x = centre(i) - barW - 1}
          {#if active === i}<rect class="hover" x={PAD.left + band * i} y={PAD.top} width={band} height={plotH} />{/if}
          <path class="income" d={bar(x, point.income)} />
          <path class="expense" d={bar(x + barW + 2, point.expense)} />
          {#if i % every === 0}
            <text class="axis" x={centre(i)} y={HEIGHT - 10} text-anchor="middle">{periodLabel(point.period, group, true)}</text>
          {/if}
          <rect
            class="hit"
            x={PAD.left + band * i}
            y={PAD.top}
            width={band}
            height={plotH + 18}
            tabindex="0"
            role="button"
            aria-label={`${periodLabel(point.period, group)}: income ${money(point.income)}, expense ${money(point.expense)}`}
            onpointerenter={() => (active = i)}
            onpointerleave={() => (active = null)}
            onfocus={() => (active = i)}
            onblur={() => (active = null)}
          />
        {/each}
        <line class="base" x1={PAD.left} x2={width - PAD.right} y1={PAD.top + plotH} y2={PAD.top + plotH} />
      </svg>
      {#if active !== null && series[active]}
        {@const point = series[active]}
        <div class="tip" style:left={`${tipLeft}px`} aria-hidden="true">
          <b>{periodLabel(point.period, group)}</b>
          <span><i class="income"></i>Income <em>{money(point.income)}</em></span>
          <span><i class="expense"></i>Expense <em>{money(point.expense)}</em></span>
          <span class="net">Net <em class:loss={point.net < 0}>{money(point.net)}</em></span>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .chart { --income: #2a78d6; --expense: #eb6834; }
  .top { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 0.6rem; margin-bottom: 0.6rem; }
  .legend { display: flex; gap: 1rem; margin: 0; padding: 0; list-style: none; font-size: 0.8rem; color: #405066; font-weight: 700; }
  .legend li, .tip span { display: flex; align-items: center; gap: 0.4rem; }
  i { display: inline-block; width: 0.7rem; height: 0.7rem; border-radius: 0.2rem; }
  i.income { background: var(--income); }
  i.expense { background: var(--expense); }
  .plot { position: relative; width: 100%; min-width: 0; }
  svg { display: block; overflow: visible; }
  path.income { fill: var(--income); }
  path.expense { fill: var(--expense); }
  .grid { stroke: #edf0f2; stroke-width: 1; }
  .base { stroke: #b9c3cc; stroke-width: 1; }
  .axis { fill: #6a7686; font-size: 11px; font-variant-numeric: tabular-nums; }
  .hover { fill: #07182f0a; }
  .hit { fill: transparent; cursor: default; outline: none; }
  .hit:focus-visible { stroke: #d19b2d; stroke-width: 2; }
  .tip { position: absolute; top: 0; transform: translateX(-50%); display: grid; gap: 0.25rem; min-width: 11rem; padding: 0.6rem 0.75rem; border-radius: 0.6rem; background: #07182f; color: #fff; font-size: 0.78rem; pointer-events: none; box-shadow: 0 0.6rem 1.4rem #07182f30; }
  .tip b { font-size: 0.8rem; }
  .tip em { margin-left: auto; padding-left: 0.8rem; font-style: normal; font-weight: 750; font-variant-numeric: tabular-nums; }
  .tip .net { padding-top: 0.25rem; border-top: 1px solid #ffffff22; }
  .loss { color: #a3302a; }
  .tip .loss { color: #ffb4a8; }
</style>
