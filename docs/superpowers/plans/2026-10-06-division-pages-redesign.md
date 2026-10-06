# Division Pages Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the Global Business, Global Healthcare and Global Umrah pages to the Education page's standard: same navy and gold palette, a service-specific hero each, distinct section layouts, every word editable in Admin → Content.

**Architecture:** Each page becomes one Svelte 5 component (`BusinessPortal`, `HealthcarePortal`, `UmrahPortal`) rendered by a thin route page, like `EducationPortal`. Small shared units (`reveal`, `RotatingWord`, `flags`, `markets`, the dotted world map) are extracted first. Each page gets its own backend content schema and default content on both sides; saved content from before is filled from the defaults by `fillMissing`, so no data migration is needed.

**Tech Stack:** SvelteKit 2 / Svelte 5 runes, Vite 6, Fastify + Zod, Prisma (no schema change), node:test on both sides, lucide-svelte icons.

**Spec:** `docs/superpowers/specs/2026-10-06-division-pages-redesign-design.md`

## Global Constraints

- Palette tokens exactly as `EducationPortal.svelte` sets them: `--ink #17304f`, `--ink-deep #102640`, `--ink-panel linear-gradient(145deg, #1d3a60, #102640)`, `--ink-soft #e9eef4`, `--accent #c79836`, `--accent-hover #ddb85d`, `--accent-text #8a6a2b`, `--accent-deep #a87618`, `--accent-soft #fbf5e8`, `--on-ink #c9d5e2`, `--on-ink-gold #efc45e`, `--text #33465a`, `--muted #607083`, `--line #e2e6e8`, page background `#fafaf7`. No division tints.
- Small gold text on light backgrounds uses `#8a6a2b` (4.8:1); large gold display text uses `#a87618`.
- Buttons: `.primary` gold with navy text and hover `--accent-hover`; `.ghost` white, border `#d7dce3`, navy text; `.pill` navy; `.outline` white border on navy. Focus ring `3px solid rgba(199,152,54,.55)`, offset 3px.
- Layout: content `max-width: 88rem`; inline padding `1rem` on phones, `clamp(2rem, 5vw, 5rem)` from 64rem; hero is a rounded `1.25rem` panel; sections `padding-block: 2.6rem` on phones, `4rem` from 48rem; section anchors have `scroll-margin-top: 6.2rem` (phones) / `10.7rem` (from 37.51rem).
- Breakpoints as Education: 40rem, 48rem, 56rem, 64rem; phone floor 390px.
- Every hero loop and reveal respects `prefers-reduced-motion: reduce`.
- Image fields in content are named `image` or `photo` so the admin editor shows the uploader; an image value must match `^(\/|https?:\/\/)`.
- Copy in content defaults is the owner's voice: plain English, no exclamation marks, "we" for Bengal Port.
- Commit after each task with the trailer `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`. Never push or merge unless the owner asks.

## Review Focus

1. A market name in Business content that `markets.ts` does not know (e.g. "Mongolia"): the title still shows it and no arc is drawn, nothing throws. Test added to Task 1 (`markets.test.ts`).
2. A page saved in the database before this change (old `shortcuts`, `icon` fields, no `reviews`): the public page renders with defaults for the new sections and the admin editor saves without a validation error. Tests added to Tasks 2, 4 and 6 (content tests save an old-shaped draft through `fillMissing`).
3. No live records: an empty hospital list on Healthcare and an empty partner list on Business show the empty-state copy, and the Healthcare destination chips fall back to the default cities. Tests added to Task 1 (`flags.test.ts` city parsing) and checked visually in Tasks 3 and 5.
4. Umrah departures in the past or empty: past dates are hidden; with none left the strip disappears. Test added to Task 6 (`umrah.test.ts`).
5. Long treatment titles and package inclusions on a 390px phone: no horizontal scroll, text wraps. Checked with the phone capture in Tasks 5 and 7; `overflow-wrap: anywhere` on card text.

---

### Task 1: Shared pieces

**Files:**
- Create: `frontend/src/lib/reveal.ts`
- Create: `frontend/src/lib/components/RotatingWord.svelte`
- Create: `frontend/src/lib/flags.ts`, `frontend/src/lib/flags.test.ts`
- Create: `frontend/src/lib/markets.ts`, `frontend/src/lib/markets.test.ts`
- Exists: `frontend/src/lib/world-dots.json` (3015 `[x, y]` pairs in degrees, x = lon + 180, y = 90 − lat; generated from Natural Earth 110m land, public domain)
- Modify: `frontend/src/lib/education.ts` (re-export `flagCodes` from `flags.ts`), `frontend/src/lib/components/EducationPortal.svelte` (use shared `reveal`)

**Interfaces:**
- Produces: `reveal(node, { threshold? })` Svelte action; `RotatingWord` props `{ words: string[]; interval?: number; prefix?: string; onchange?: (index: number, word: string) => void }`; `flagCodes(names: string[]): string[]`, `flagCode(name: string): string | undefined`, `countryOf(place: string): string` ("Bangkok, Thailand" → "Thailand"); `marketPlace(name): { name, lat, lon } | null`, `DHAKA`, `project(lat, lon): { x, y }`, `arcPath(from, to): string`.

- [ ] **Step 1: Write the failing tests**

`frontend/src/lib/markets.test.ts`:

```ts
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { DHAKA, arcPath, marketPlace, project } from "./markets.js";

describe("placing a market on the map", () => {
  test("knows the markets the business page names, in any case", () => {
    assert.deepEqual(marketPlace("China"), { name: "China", lat: 23.1, lon: 113.3 });
    assert.equal(marketPlace("u.a.e.")?.lon, 55.3);
  });
  test("a place it does not know draws nothing", () => {
    assert.equal(marketPlace("Mongolia"), null);
  });
  test("projects degrees onto the 360 by 180 map", () => {
    assert.deepEqual(project(0, 0), { x: 180, y: 90 });
    assert.deepEqual(project(DHAKA.lat, DHAKA.lon), { x: 270.4, y: 66.2 });
  });
  test("an arc starts at the origin and bows north", () => {
    const d = arcPath(DHAKA, { name: "China", lat: 23.1, lon: 113.3 });
    assert.match(d, /^M270\.4 66\.2 Q/);
    const control = Number(d.split(" ")[3]);
    assert.ok(control < 66.2, "control point sits above both ends");
  });
});
```

`frontend/src/lib/flags.test.ts`:

```ts
import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { countryOf, flagCode, flagCodes } from "./flags.js";

describe("flags for places", () => {
  test("one flag per country, in order, unknown ones left out", () => {
    assert.deepEqual(flagCodes(["UK", "Malaysia", "Atlantis", "uk"]), ["gb", "my"]);
  });
  test("a single country", () => {
    assert.equal(flagCode("Turkey"), "tr");
    assert.equal(flagCode("Nowhere"), undefined);
  });
  test("the country of a 'City, Country' place", () => {
    assert.equal(countryOf("Bangkok, Thailand"), "Thailand");
    assert.equal(countryOf("Singapore"), "Singapore");
  });
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `cd frontend && npx tsx --test src/lib/markets.test.ts src/lib/flags.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 3: Write the shared modules**

`frontend/src/lib/flags.ts`: move the `flags` table and `flagCodes` from `education.ts` verbatim, add:

```ts
export const flagCode = (name: string): string | undefined =>
  flags[name.trim().toLowerCase().replace(/\./g, "")];
// "Bangkok, Thailand" -> "Thailand"; a bare name is its own country.
export const countryOf = (place: string): string => place.split(",").at(-1)!.trim();
```

Add `turkey`, `thailand`, `singapore`, `vietnam`, `indonesia`, `qatar`, `oman`, `kuwait`, `bahrain` to the table. In `education.ts` replace the table and function with `export { flagCodes } from "./flags.js";`.

`frontend/src/lib/markets.ts`:

```ts
// Where the Business hero draws its trade routes to. Names are matched the
// way flags are: case and dots ignored. Coordinates are a city in the market.
export type Market = { name: string; lat: number; lon: number };
const places: Record<string, [number, number]> = {
  china: [23.1, 113.3], turkey: [41.0, 28.9], vietnam: [10.8, 106.7],
  uae: [25.2, 55.3], "united arab emirates": [25.2, 55.3], india: [19.1, 72.9],
  malaysia: [3.1, 101.7], thailand: [13.8, 100.5], singapore: [1.4, 103.8],
  indonesia: [-6.2, 106.8], japan: [35.7, 139.7], "south korea": [37.6, 126.9],
  germany: [53.5, 10.0], italy: [45.5, 9.2], uk: [51.5, -0.1], "united kingdom": [51.5, -0.1],
  usa: [40.7, -74.0], "united states": [40.7, -74.0], canada: [43.7, -79.4],
  australia: [-33.9, 151.2], "saudi arabia": [21.5, 39.2], egypt: [30.0, 31.2],
};
export const DHAKA: Market = { name: "Bangladesh", lat: 23.8, lon: 90.4 };
export function marketPlace(name: string): Market | null {
  const hit = places[name.trim().toLowerCase().replace(/\./g, "")];
  return hit ? { name, lat: hit[0], lon: hit[1] } : null;
}
// Equirectangular: the map is 360 wide and 180 high, in degrees.
export const project = (lat: number, lon: number) => ({
  x: Math.round((lon + 180) * 10) / 10,
  y: Math.round((90 - lat) * 10) / 10,
});
// A quadratic curve from one place to another, bowing north.
export function arcPath(from: Market, to: Market): string {
  const a = project(from.lat, from.lon), b = project(to.lat, to.lon);
  const lift = Math.min(28, Math.hypot(b.x - a.x, b.y - a.y) * 0.28);
  const cx = Math.round(((a.x + b.x) / 2) * 10) / 10;
  const cy = Math.round(((a.y + b.y) / 2 - lift) * 10) / 10;
  return `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`;
}
```

`frontend/src/lib/reveal.ts`: the Education `reveal` action, exported, with `{ threshold = 0.12 }` option and an early return when `matchMedia` is unavailable or reduced motion is on.

`frontend/src/lib/components/RotatingWord.svelte`: words cycle every `interval` (default 2400ms) with the Education `place-in` keyframe; `onchange(index, word)` fires on every change; reduced motion keeps the first word; the full list is rendered once in a visually hidden span prefixed by `prefix`.

- [ ] **Step 4: Run the tests and the Education tests**

Run: `cd frontend && npx tsx --test src/lib/markets.test.ts src/lib/flags.test.ts src/lib/education.test.ts`
Expected: all PASS (education's flag tests still pass through the re-export).

- [ ] **Step 5: Switch EducationPortal to the shared `reveal`, run svelte-check, commit**

Run: `cd frontend && npm run check` → 0 errors.

```bash
git add frontend/src/lib frontend/src/lib/components/RotatingWord.svelte frontend/src/lib/components/EducationPortal.svelte
git commit -m "feat(frontend): shared reveal, rotating word, flags and market helpers for the division pages"
```

---

### Task 2: Business content model and admin editor

**Files:**
- Modify: `backend/src/lib/schemas.ts` (`businessContentSchema`), `backend/src/lib/business-content.ts`, `frontend/src/lib/business-content.ts`
- Modify: `frontend/src/lib/components/DivisionContentEditor.svelte` (allow `division: "business"`, name "Global Business")
- Modify: `frontend/src/routes/admin/business-content/+page.svelte` (render `DivisionContentEditor` with `division="business"`, `fallback={defaultBusinessContent}`, `lists`)
- Create: `backend/test/business-content.test.ts`

**Interfaces:**
- Produces `BusinessContent`:

```ts
export type BusinessContent = {
  hero: { eyebrow: string; title: string; markets: string[]; categories: string[]; tagline: string; description: string; primary: string; secondary: string };
  services: { eyebrow: string; title: string; description: string; items: Array<{ image: string; title: string; description: string; cta: string; href: string }> };
  process: { eyebrow: string; title: string; description: string; steps: Array<{ number: string; title: string; description: string }> };
  calculator: { eyebrow: string; title: string; description: string; note: string; cta: string };
  partners: { eyebrow: string; title: string; description: string; empty: string };
  trust: { eyebrow: string; title: string; description: string; items: Array<{ icon: string; title: string; description: string }> };
  stats: Array<{ value: string; label: string; icon: string }>;
  reviews: { eyebrow: string; heading: string; description: string; invite: string; cta: string; photo: string };
  closing: { title: string; description: string; primary: string; primaryHref: string; secondary: string; secondaryHref: string };
};
```

- [ ] **Step 1: Write the failing backend test** (`backend/test/business-content.test.ts`, same harness as `education-content.test.ts`: real app, admin user, the saved page restored afterwards)

```ts
describe("the Global Business page before anyone edits it", () => {
  test("names the markets it sources from and six things it does", async () => {
    const content = await live();
    assert.deepEqual(content.hero.markets.slice(0, 3), ["China", "Turkey", "Vietnam"]);
    assert.equal(content.services.items.length, 6);
    assert.ok(content.services.items.every((item: any) => item.image.startsWith("/images/")));
    assert.equal("shortcuts" in content, false);
  });
});
describe("editing the Global Business page", () => {
  test("the team can change the markets and add a step", async () => {
    await clear();
    const content = draft();
    content.hero.markets = ["China", "Mongolia"];
    content.process.steps.push({ number: "06", title: "Review", description: "A short review call after delivery." });
    assert.equal((await save(content)).statusCode, 200);
    const shown = await live();
    assert.deepEqual(shown.hero.markets, ["China", "Mongolia"]);
    assert.equal(shown.process.steps.length, 6);
  });
  test("a page saved before this redesign still saves after the editor fills it", async () => {
    await clear();
    const old = draft();
    delete old.process; delete old.calculator; delete old.reviews;
    old.shortcuts = [{ icon: "globe", title: "Import", subtitle: "x", href: "#" }];
    old.services.items = old.services.items.map(({ image, ...rest }: any) => ({ ...rest, icon: "globe" }));
    // What the admin editor sends after fillMissing: the defaults for what was missing.
    const filled = fillMissing(defaultBusinessContent, old);
    assert.equal((await save(filled)).statusCode, 200);
    assert.equal((await live()).calculator.title, defaultBusinessContent.calculator.title);
  });
  test("a tile needs a picture", async () => {
    await clear();
    const content = draft();
    content.services.items[0].image = "not a path";
    assert.equal((await save(content)).statusCode, 400);
  });
});
```

(`fillMissing` is imported from `../../frontend/src/lib/content-fields.js`? No: copy the four-line `fillMissing` into the test file to keep the backend test self-contained.)

- [ ] **Step 2: Run it to see it fail** — `cd backend && npx tsx --test test/business-content.test.ts` → FAIL (no `markets`).

- [ ] **Step 3: Update the schema**

```ts
const stringList = (max: number) => z.array(text).min(1).max(max);
export const businessContentSchema = z.object({
  hero: z.object({
    eyebrow: text, title: text,
    markets: stringList(8), categories: stringList(6),
    tagline: text, description: paragraph, primary: text, secondary: text,
  }),
  services: z.object({
    eyebrow: text, title: text, description: paragraph,
    items: z.array(z.object({ image: link, title: text, description: paragraph, cta: text, href: z.string().trim().min(1) })).min(1).max(6),
  }),
  process: z.object({ eyebrow: text, title: text, description: paragraph, steps: z.array(z.object({ number: text, title: text, description: paragraph })).min(1).max(8) }),
  calculator: z.object({ eyebrow: text, title: text, description: paragraph, note: text, cta: text }),
  partners: z.object({ eyebrow: text, title: text, description: paragraph, empty: paragraph }),
  trust: z.object({ eyebrow: text, title: text, description: paragraph, items: z.array(z.object({ icon: text, title: text, description: paragraph })).min(1).max(8) }),
  stats: z.array(z.object({ value: text, label: text, icon: text })).min(1).max(8),
  reviews: z.object({ eyebrow: text, heading: text, description: paragraph, invite: paragraph, cta: text, photo: link }),
  closing: z.object({ title: text, description: paragraph, primary: text, primaryHref: link, secondary: text, secondaryHref: link }),
});
```

- [ ] **Step 4: Write the defaults on both sides** (identical objects; the backend file is `as const`-free plain object)

```ts
hero: {
  eyebrow: "GLOBAL BUSINESS", title: "Sourcing from",
  markets: ["China", "Turkey", "Vietnam", "UAE", "India", "Malaysia"],
  categories: ["Textiles", "Machinery", "Electronics", "Packaging", "Agro products"],
  tagline: "Trade. Source. Explore. Grow.",
  description: "Your trusted partner in international trade, global sourcing, business tours and trade opportunities. We connect markets, build partnerships and grow together.",
  primary: "Start an enquiry", secondary: "Plan a business visit",
},
services: {
  eyebrow: "WHAT WE DO", title: "From the first product search to goods cleared at port",
  description: "Six ways we work with importers, exporters and buyers.",
  items: [
    { image: "/images/divisions/biz-sourcing.webp", title: "Global sourcing", description: "Verified manufacturers and suppliers across established markets, shortlisted around your specification and budget.", cta: "Find suppliers", href: "#partners" },
    { image: "/images/divisions/biz-import-export.webp", title: "Import and export", description: "Structured documentation and coordination for products moving in and out of Bangladesh.", cta: "Learn more", href: "/apply?tab=business" },
    { image: "/images/divisions/biz-tours.webp", title: "Business tours and factory visits", description: "Coordinated visits to markets, factories and international trade fairs.", cta: "Plan a visit", href: "/apply?tab=business&form=enquiry&about=Business+tour" },
    { image: "/images/divisions/biz-opportunities.webp", title: "Trade opportunities", description: "Current products, buying leads, visits and partnership openings.", cta: "View opportunities", href: "/opportunities" },
    { image: "/images/divisions/biz-costing.webp", title: "Landed-cost planning", description: "Product cost, shipping and duty estimated before you commit to a purchase.", cta: "Calculate now", href: "#calculator" },
    { image: "/images/divisions/biz-documents.webp", title: "Document support", description: "Guided import, export and visit documentation from our team.", cta: "Ask an expert", href: "/contact" },
  ],
},
process: {
  eyebrow: "HOW AN ENGAGEMENT RUNS", title: "Five steps from brief to delivery",
  description: "One coordinator, a clear sequence and no surprises at the port.",
  steps: [
    { number: "01", title: "Brief", description: "Tell us the product, volume, budget and timeline." },
    { number: "02", title: "Shortlist", description: "We propose verified suppliers or factories that fit." },
    { number: "03", title: "Verify and visit", description: "Samples, audits and, when useful, a coordinated factory visit." },
    { number: "04", title: "Negotiate and order", description: "Terms, contracts and payment steps agreed with you in the loop." },
    { number: "05", title: "Ship and clear", description: "Shipping, documents and customs handled through to delivery." },
  ],
},
calculator: {
  eyebrow: "TRADE PLANNING", title: "Know your landed cost before you commit",
  description: "A quick planning estimate. Our team prepares a detailed quotation for your actual shipment.",
  note: "Planning estimate only; taxes and fees may vary.", cta: "Request a detailed quote",
},
partners: {
  eyebrow: "BUSINESS NETWORK", title: "A verified network across markets",
  description: "Suppliers and factories maintained by the Bengal Port team. Ask us to open a conversation with any of them.",
  empty: "Our partner list is being updated. Tell us what you want to source and we will suggest suitable options.",
},
trust: (keep today's items), stats: (keep today's),
reviews: {
  eyebrow: "CLIENT REVIEWS", heading: "What our clients say",
  description: "What importers, exporters and buyers say about working with our team.",
  invite: "Used our service? Sign in, open your application in your dashboard and write a review. It appears here once our team has approved it.",
  cta: "Write a review", photo: "/images/divisions/biz-reviews.webp",
},
closing: (keep today's),
```

- [ ] **Step 5: Admin editor** — in `DivisionContentEditor.svelte` add `"business"` to the `division` union and `business: "Global Business"` to the name map. Replace the body of `routes/admin/business-content/+page.svelte` with the Education-style wrapper: `<DivisionContentEditor division="business" fallback={defaultBusinessContent} lists note="The hero's markets are the places the map draws routes to; keep them country names." />`. Delete the page's bespoke flatten editor code and styles.

- [ ] **Step 6: Run tests, typecheck, check; commit**

Run: `cd backend && npm run typecheck && npx tsx --test test/business-content.test.ts`; `cd frontend && npm run check && npm test` → all pass.

```bash
git add backend/src/lib/schemas.ts backend/src/lib/business-content.ts backend/test/business-content.test.ts frontend/src/lib/business-content.ts frontend/src/lib/components/DivisionContentEditor.svelte frontend/src/routes/admin/business-content/+page.svelte
git commit -m "feat(business): content model for the redesigned page, edited with the shared content editor"
```

---

### Task 3: Business page

**Files:**
- Create: `frontend/src/lib/components/TradeRoutesMap.svelte`, `frontend/src/lib/components/BusinessPortal.svelte`
- Modify: `frontend/src/routes/business/+page.svelte` (thin wrapper), `frontend/src/routes/business/+page.ts` (unchanged data; confirm the `partners` shape: each item carries `type: "supplier" | "factory"`)
- Remove from the route page: the old markup, styles and the `.business-page` overrides in `frontend/src/styles.css` lines 313–321 (the `.business-page` block) once nothing uses them.

**Interfaces:**
- `TradeRoutesMap` props: `{ markets: string[]; active: number }`. Renders `<svg viewBox="12 18 348 128">`: one `<path class="land">` whose `d` is every dot as `M{x} {y}h0.01` (stroke `#e9eef4`, opacity .28, width 1.15, round caps); Dhaka beacon (`<circle>` r 1.6 gold + pulsing ring); for each market with a place, `<path class="arc" class:active={i === active} class:seen={i < active} d={arcPath(DHAKA, place)} pathLength="1">` with `stroke-dasharray: 1; stroke-dashoffset: 1` animated to 0 over 1400ms when active; a travelling `<circle r=1.4>` using `offset-path: path("…")` and `offset-distance` 0→100% on the active arc; a landing ring at the destination scaling 0→1 after 1200ms. Markets without a place are skipped. Under reduced motion every arc is drawn static.
- `BusinessPortal` props: `{ content: BusinessContent; partners: any[]; partnersUnavailable: boolean; reviews: PublicReview[] }`.

- [ ] **Step 1: Hero** — markup:

```svelte
<section class="hero">
  <TradeRoutesMap markets={content.hero.markets} active={market} />
  <div class="chips" aria-hidden="true">{#each content.hero.categories.slice(0, 5) as chip, i}<span class={`chip chip-${i}`}>{chip}</span>{/each}</div>
  <span class="eyebrow">{content.hero.eyebrow}</span>
  <h1>{content.hero.title}</h1>
  <p class="market"><RotatingWord words={content.hero.markets} prefix="Sourcing from " onchange={(i) => (market = i)} /></p>
  <p class="tagline">{content.hero.tagline}</p>
  <div class="lede"><p>{content.hero.description}</p><div><a class="primary" href={applyHref("BUSINESS")}>{content.hero.primary}<ArrowRight size={18} /></a><a class="ghost" href={applyHref("BUSINESS", "enquiry", "Business tour")}>{content.hero.secondary}</a></div></div>
</section>
```

Hero styles: `background: var(--ink-panel)`, `color: #fff`, `min-height: 86svh` from 48rem, map absolutely positioned `inset: 0` behind, `.market` in `--on-ink-gold` display type `clamp(2rem, 8vw, 4.8rem)` weight 900; `.chip` = `padding .45rem .8rem; border: 1px solid rgba(239,196,94,.55); border-radius 99rem; background rgba(16,38,64,.55); color var(--on-ink-gold); font-size .78rem; font-weight 750`, positioned at the four corners like Education's flag balls with the same `float-a`/`float-b` keyframes; chips 4 and 5 hidden below 48rem. `.ghost` on navy: `background: rgba(255,255,255,.08); color: #fff; border-color: rgba(255,255,255,.35)`.

- [ ] **Step 2: What we do (bento)** — `.bento { display: grid; gap: 1rem; grid-template-columns: repeat(4, minmax(0, 1fr)); grid-auto-rows: 15rem }` from 64rem; tile 1 `grid-column: span 2; grid-row: span 2`, tile 6 `grid-column: span 2`; `repeat(2, …)` from 40rem with tile 1 spanning 2 columns only; one column below. Each tile is an `<a>` with the photo as `<img>` (object-fit cover), a navy gradient foot `linear-gradient(0deg, rgba(16,38,64,.92) 0%, rgba(16,38,64,.35) 55%, transparent 100%)`, white `h3`, `--on-ink` description clamped to 2 lines (`display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden`) and a gold CTA line with arrow; hover lifts 4px and scales the image 1.04.

- [ ] **Step 3: How an engagement runs (rail)** — cream band `background: var(--accent-soft)` full-bleed like Education's directory; `.rail { display: grid; grid-template-columns: repeat(5, 1fr); position: relative }` with a `::before` gold line at `top: 1.25rem; left: 10%; right: 10%; height: 2px`; nodes `2.5rem` navy circles with gold numerals, centred; title and sentence below centred; phones: `grid-template-columns: 1fr` with the line vertical on the left (`left: 1.2rem; top: 0; bottom: 0; width: 2px`) and content offset `3.5rem`.

- [ ] **Step 4: Calculator** — keep the three inputs and the landed formula from the old page; layout: a white card with inputs (left, `.field` styles) and a navy result panel (right, `--ink-panel`) with the estimate in `--on-ink-gold` display numerals (`font-variant-numeric: tabular-nums`), note in `--on-ink`, and `.primary` linking to `applyHref("BUSINESS", "enquiry", \`Landed cost estimate ৳${landed.toLocaleString("en-IN")}\`)`. Stacks on phones.

- [ ] **Step 5: Partner network (list)** — state `kind: "all" | "supplier" | "factory"`, `industry: "All"`; derived `groups` = partners filtered, grouped by `country` (sorted, Bangladesh first); each group: a heading row with the flag (`https://flagcdn.com/w40/${flagCode(country)}.png`, hidden when unknown) and country; rows `grid-template-columns: 3.5rem 1fr auto` (thumb, text, action) with `b` name, `small` `industry · product`, gold `Featured` tag when `featured`; "Request connection" → `applyHref("BUSINESS", "enquiry", name)`. Empty list: `content.partners.empty` and a `.pill` to the enquiry. `partnersUnavailable`: a one-line notice.

- [ ] **Step 6: Why Bengal Port** — `.proof` navy panel grid `minmax(0, .9fr) minmax(0, 1.1fr)` from 56rem: left heading + description (`--on-ink`), right trust items 2×2 with gold numerals `0{i+1}`; bottom `.stats` row inside the panel separated by `border-top: 1px solid rgba(255,255,255,.14)`, four columns, gold icons (`--on-ink-gold`), values `1.45rem` tabular.

- [ ] **Step 7: Reviews and closing** — copy the Education `reviews` section exactly (heading, `.reviews-panel` with `content.reviews.photo`, `.invite`, `.primary` to `/dashboard`, `<Testimonials {reviews} />` when any), and the closing panel with `content.closing.*` and its two hrefs.

- [ ] **Step 8: Route page** — `+page.svelte` becomes `<svelte:head>` with title and description, then `<BusinessPortal content={data.content} partners={data.partners} partnersUnavailable={data.partnersUnavailable} reviews={data.reviews} />`. Remove the `.business-page` block from `styles.css`.

- [ ] **Step 9: Verify** — Chrome at 1920: hero arcs draw in step with the word, chips float, bento hover; phone capture (headless, width 500, reduced motion) for the whole page and a motion-on hero capture; `npm run check` 0 errors; detector `impeccable detect --json frontend/src/lib/components/BusinessPortal.svelte frontend/src/lib/components/TradeRoutesMap.svelte`; both test suites.

- [ ] **Step 10: Commit**

```bash
git add frontend/src/lib/components/BusinessPortal.svelte frontend/src/lib/components/TradeRoutesMap.svelte frontend/src/routes/business frontend/src/styles.css
git commit -m "feat(business): redesign the Global Business page around its trade routes"
```

---

### Task 4: Healthcare content model

**Files:**
- Modify: `backend/src/lib/schemas.ts` (add `healthcareContentSchema`), `backend/src/routes/admin.ts` (`healthcare` entry uses it), `backend/src/lib/division-content.ts`, `frontend/src/lib/division-content.ts` (type `HealthcareContent`, defaults)
- Modify: `frontend/src/routes/admin/division-content/[division]/+page.svelte` (`healthcare: lists: true`, note about specialties)
- Create: `backend/test/healthcare-content.test.ts`

**Interfaces:**

```ts
export type HealthcareContent = Omit<DivisionContent, "shortcuts" | "services"> & {
  hero: DivisionContent["hero"] & {
    specialties: string[];
    pathway: Array<{ icon: string; title: string; description: string }>; // exactly 3
    cities: string[]; // fallback destination chips
  };
  treatments: Array<{ title: string; image: string; description: string; procedures: string[]; cta: string }>;
  reviews: { eyebrow: string; heading: string; description: string; invite: string; cta: string; photo: string };
};
```

Schema: `divisionContentSchema.omit({ shortcuts: true, services: true }).extend({ hero: divisionContentSchema.shape.hero.extend({ specialties: stringList(8), pathway: z.array(z.object({ icon: text, title: text, description: text })).length(3), cities: stringList(8) }), treatments: z.array(z.object({ title: text, image: link, description: paragraph, procedures: stringList(8), cta: text })).min(1).max(8), reviews: <same object as business> })`.

Defaults: hero title "Treatment abroad for", specialties `["Cardiology", "Oncology", "Orthopaedics", "Fertility", "Neurology", "Dental care"]`, pathway `[{ icon: "file", title: "Diagnosis review", description: "Your reports read and your options explained." }, { icon: "hospital", title: "Hospital match", description: "Suitable hospitals and specialists, with costs." }, { icon: "plane", title: "Travel and care", description: "Appointments, travel and a coordinator throughout." }]`, cities `["Bangkok, Thailand", "Kuala Lumpur, Malaysia", "Chennai, India", "Istanbul, Turkey", "Singapore"]`, secondary "See partner hospitals"; six treatments using `care-*.webp` with two-sentence descriptions and 3–4 procedures each (e.g. Cardiology: Angiography, Bypass surgery, Valve repair, Pacemaker); reviews photo `care-reviews.webp`, heading "What our patients say"; closing title "Ready to plan treatment abroad?".

- [ ] Steps mirror Task 2: failing test (defaults name six treatments and three pathway nodes; a treatment can be re-worded; an old-shaped page filled by `fillMissing` saves; a pathway with two nodes is refused), run, implement, admin `lists: true`, run `npm run typecheck`, `npx tsx --test test/healthcare-content.test.ts`, `npm run check`; commit `feat(healthcare): content model for the redesigned page`.

---

### Task 5: Healthcare page

**Files:**
- Create: `frontend/src/lib/components/HealthcarePortal.svelte`
- Modify: `frontend/src/routes/healthcare/+page.svelte` (thin wrapper), `+page.ts` (type `HealthcareContent`, `fillMissing(defaultHealthcareContent, …)` as Education does)

- [ ] **Step 1: Hero** — light panel (`#fdfdfb`, dot grid `radial-gradient(#d8dfe6 2px, transparent 2px) 32px`), eyebrow, `h1 {content.hero.title}`, `RotatingWord words={content.hero.specialties}` in `--accent-deep` display type, tagline, then `.pathway`: `display: grid; grid-template-columns: repeat(3, 1fr); position: relative; max-width: 52rem` with a `::before` line (`--line`) and a `.fill` gold line whose `width` animates 0→100% over 6s in a loop (`@keyframes fill`), nodes `2.75rem` white circles with `--line` border that turn navy with gold icon while lit (`.lit`), lit index driven by a 2s interval; title `b` and `small` description under each. Chips: derived `places = unique(records.map(r => \`${r.city}, ${r.country}\`))` topped up from `content.hero.cities` to four; each chip: pin icon, text, flag image via `flagCode(countryOf(place))`; positioned and floating like Education's flags. Lede and buttons: `.primary` → `applyHref("HEALTHCARE")`, `.ghost` → `#hospitals`.

- [ ] **Step 2: Treatments index** — state `selected = 0`; desktop (from 56rem) grid `minmax(0, .8fr) minmax(0, 1.2fr)`: left `<div role="tablist">` of buttons (`aria-selected`, arrow-key navigation, `.on` state navy with gold left numeral), right `<div role="tabpanel">` with `{#key selected}` crossfade: photo (16:9), description, procedures chips (`.subjects li` style from Education), `matching = records.filter(r => r.services.some(s => s.name.toLowerCase().includes(key)))` where `key` is the first word of the title lowercased, listed as "Available at …" links to `#hospitals`, and `.pill` → `applyHref("HEALTHCARE", "enquiry", title)`. Below 56rem: an accordion (`<details>` per treatment, first open).

- [ ] **Step 3: Partner hospitals** — keep the search and country select from DivisionPortal (`query`, `country`, `filtered`); cards: navy header strip (`name` in white, flag chip with `city, country`), photo, description, services chips (3), gold link "Request hospital connection" → `applyHref("HEALTHCARE", "enquiry", name)`; grid 3 / 2 / 1. Empty: `content.directory` wording plus the Education-style `.none` block.

- [ ] **Step 4: Pathway timeline** — `.timeline` vertical: a central line on desktop (`left: 50%`), step cards alternating `grid-column: 1` / `3` with gold numeral nodes on the line; phones: line on the left, cards full width.

- [ ] **Step 5: Clarity panel, reviews, closing** — same navy panel pattern as Business's "Why Bengal Port" (feature points 3 + stats row); reviews section with `Testimonials`; closing.

- [ ] **Step 6: Verify and commit** — as Task 3 Step 9; commit `feat(healthcare): redesign the Global Healthcare page around the care pathway`.

---

### Task 6: Umrah content model

**Files:**
- Modify: `backend/src/lib/schemas.ts` (`umrahContentSchema`), `backend/src/routes/admin.ts` (`umrah` entry), both `division-content.ts` files, admin division-content page (`umrah: lists: true`)
- Create: `backend/test/umrah-content.test.ts`, `frontend/src/lib/umrah.ts`, `frontend/src/lib/umrah.test.ts`

**Interfaces:**

```ts
export type UmrahContent = Omit<DivisionContent, "shortcuts" | "services" | "directory"> & {
  hero: DivisionContent["hero"] & { journeys: string[]; departures: Array<{ date: string; label: string }> };
  packages: Array<{ name: string; tag: string; nights: string; makkahHotel: string; madinahHotel: string; distance: string; price: string; inclusions: string[]; cta: string }>;
  stages: Array<{ title: string; subtitle: string; image: string; points: string[] }>; // exactly 4
  reviews: { eyebrow: string; heading: string; description: string; invite: string; cta: string; photo: string };
};
// frontend/src/lib/umrah.ts
export function upcomingDepartures(departures: { date: string; label: string }[], today = new Date()): { date: Date; day: string; month: string; label: string }[]
// keeps dates on or after today, sorted, at most three; day "14", month "Nov"
export const isHighlighted = (pkg: { tag: string }) => pkg.tag.trim().length > 0;
```

Schema: `divisionContentSchema.omit({ shortcuts: true, services: true, directory: true }).extend({ hero: …extend({ journeys: stringList(6), departures: z.array(z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), label: text })).max(3) }), packages: z.array(z.object({ name: text, tag: z.string().trim().max(40), nights: text, makkahHotel: text, madinahHotel: text, distance: text, price: text, inclusions: stringList(10), cta: text })).min(1).max(3), stages: z.array(z.object({ title: text, subtitle: text, image: link, points: stringList(5) })).length(4), reviews: … })`. Note `tag` may be empty, so it is `z.string()` not `text`.

Defaults: hero title "Your Umrah,", journeys `["in Ramadan", "with family", "in a group", "with Ziyarat"]`, departures `[{ date: "2026-11-14", label: "November group · 20 seats" }, { date: "2026-12-19", label: "Winter family group" }, { date: "2027-02-20", label: "Ramadan group · early booking" }]`, secondary "See packages"; packages Economy (tag ""), Standard (tag "Most chosen"), Premium (tag ""), with nights "7 nights · 4 Makkah, 3 Madinah" style strings, hotels, distance "Hotels 600–900 m from the Haram", price "From ৳ 1,45,000", inclusions 5–6 lines, cta "Enquire about this package"; stages Before you fly / On arrival / In Makkah / In Madinah and Ziyarat with `umrah-before`, `umrah-ziyarat` (arrival transfers), `umrah-makkah`, `umrah-madinah` and 2–3 points each; reviews heading "What our pilgrims say", photo `umrah-reviews.webp`.

- [ ] **Step 1: Failing unit test** (`umrah.test.ts`): past departures hidden; sorted; at most three; day and month formatted; `isHighlighted` true only with a tag. Run → FAIL. Implement `umrah.ts`. PASS.
- [ ] **Step 2: Failing backend test**: defaults have three packages and four stages; a package price can be changed; an old-shaped page filled by `fillMissing` saves; five stages are refused. Run → FAIL. Implement schema, defaults, admin entry, `lists: true`. PASS, `typecheck`, `check`.
- [ ] **Step 3: Commit** `feat(umrah): content model for the redesigned page, with packages and departures`.

---

### Task 7: Umrah page

**Files:**
- Create: `frontend/src/lib/components/UmrahPortal.svelte`
- Modify: `frontend/src/routes/umrah/+page.svelte`, `+page.ts`

- [ ] **Step 1: Hero** — `background: radial-gradient(ellipse at 50% 120%, #1d3a60 0%, #102640 55%, #0b1b31 100%)`; stars: two absolutely positioned layers with `background-image: radial-gradient(rgba(255,255,255,.55) .6px, transparent 1px)` at `background-size: 90px 90px` and `140px 140px` (offset), the top layer animated `opacity .35↔.8` over 7s; silhouettes: two inline `<svg>` at the lower corners, `fill: none; stroke: var(--on-ink-gold); stroke-width: 1.2; opacity: .35`, width `clamp(9rem, 22vw, 18rem)`: left Masjid al-Haram (Kaaba cube with its gold band, two minarets, the clock-tower outline behind), right Masjid an-Nabawi (dome with crescent finial on a drum, two minarets, arcade line); a `<svg class="route">` spanning between them with a quadratic path and a travelling `<circle>` via `offset-path`, 9s loop. Eyebrow, `h1`, `RotatingWord words={content.hero.journeys}` in `--on-ink-gold`, tagline, departures strip: `{#each upcomingDepartures(content.hero.departures) as d}<span class="date"><b>{d.day}</b><small>{d.month}</small><span>{d.label}</span></span>{/each}` as gold-outlined pills, hidden when empty; lede and buttons (`.primary` → `applyHref("UMRAH")`, `.ghost` on navy → `#packages`).

- [ ] **Step 2: Packages** — `.tiers` grid 3 columns from 56rem; card: name, tag chip when highlighted, nights, two hotel lines, distance, price in navy display `1.6rem`, inclusions list with check icons in `--ink-soft` discs, `.pill` CTA → `applyHref("UMRAH", "enquiry", name)`; highlighted card `border: 2px solid var(--accent); transform: translateY(-.5rem)` on desktop; on phones highlighted first via `order: -1`.

- [ ] **Step 3: Stages ribbon** — four columns from 56rem; each: photo 4:3 with the gold ribbon (`::before` 3px line across the column tops with a gold node), title, subtitle in `--accent-text`, points list; phones stacked with the ribbon vertical on the left.

- [ ] **Step 4: Family panel, reviews, numerals, closing** — navy panel (feature + stats); reviews with `Testimonials`; process as a row of `3.2rem` gold numerals joined by a dotted line (`border-top: 2px dotted rgba(199,152,54,.6)`), 4 / 2 columns; closing with the Kaaba `<svg>` as a 12% opacity watermark at the right.

- [ ] **Step 5: Verify and commit** — as Task 3 Step 9; commit `feat(umrah): redesign the Global Umrah page around the journey to Makkah and Madinah`.

---

### Task 8: Cleanup and final sweep

**Files:**
- Delete: `frontend/src/lib/components/DivisionPortal.svelte`; `ReviewSection.svelte` and `ReviewCards.svelte` if `grep -rn "ReviewSection\|ReviewCards" frontend/src` finds no other importer
- Modify: `frontend/src/lib/division-content.ts` — `DivisionContent` keeps only what Healthcare and Umrah still share; remove dead types
- Check: `frontend/src/lib/content-fields.test.ts` still passes; `README.md` content section mentions the three pages' editable sections if it lists Education's

- [ ] **Step 1:** Remove unused components and types; `npm run check` → 0 errors and no new "unused CSS selector" warnings in the new components.
- [ ] **Step 2:** `npm test` at the root → both suites green.
- [ ] **Step 3:** Headless captures of all three pages at 1300 and 500 wide; Chrome walk through the Services menu to each page confirming the header is unaffected and each hero animates once.
- [ ] **Step 4:** Commit `chore(frontend): remove the old division portal and unused review components`.
