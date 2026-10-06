# Global Business, Healthcare and Umrah page redesign

Date: 2026-10-06. Branch: `feature/education-page-redesign`.

## Goal

Give the three remaining division pages the same level of craft as the new
Education page: the site's navy and gold palette, but a layout and a hero
idea that belong to each service. Education shows drifting country flags
because it sends students abroad; Business, Healthcare and Umrah each get a
hero that says what they do at a glance, and sections laid out differently
from one another instead of the shared icon-card template.

What stays fixed: the colour palette, type (Manrope), the header, footer,
WhatsApp button, the Apply/Enquiry routes, the admin content editor, the
live records (suppliers, factories, hospitals, reviews) and the landed-cost
calculator. Every piece of copy stays editable in Admin → Content.

Decisions taken with the owner on 2026-10-06:

- Business hero: **trade routes map**.
- Healthcare hero: **care pathway**.
- Umrah hero: **Makkah to Madinah**.
- Umrah packages and departures live in **page content**, not a new table.

## Shared system

Reused from the Education page, promoted to shared code where two pages
need it:

- **Palette tokens** on each page root: `--ink #17304f`, `--ink-deep #102640`,
  `--ink-panel` gradient `#1d3a60 → #102640`, `--ink-soft #e9eef4`,
  `--accent #c79836`, `--accent-hover #ddb85d`, `--accent-text #8a6a2b`,
  `--accent-deep #a87618`, `--accent-soft #fbf5e8`, `--on-ink #c9d5e2`,
  `--on-ink-gold #efc45e`, text `#33465a`, muted `#607083`, line `#e2e6e8`,
  page background `#fafaf7`. No division tints.
- **Buttons**: `.primary` gold with navy text, `.ghost` white with navy text,
  `.pill` navy, `.outline` white border on navy, as on Education.
- **Section heading**: gold eyebrow, navy h2 with a short gold rule, centred
  or left-aligned per section.
- **Motion**: one authored hero moment per page; sections fade up on scroll
  through a shared `reveal` action (`src/lib/reveal.ts`, extracted from the
  Education and Division portals); `prefers-reduced-motion` stops hero loops
  and makes reveals immediate.
- **`RotatingWord.svelte`** (new, shared): cycles through a list of words on
  an interval with the Education "place-in" entrance, pauses under reduced
  motion, and renders the full list for screen readers once.
- **`Testimonials.svelte`** (exists): the review slideshow, used on all
  three pages inside a reviews section with a navy panel beside it, exactly
  as on Education. `ReviewSection.svelte` and `ReviewCards.svelte` become
  unused on these pages and are removed if nothing else imports them.
- **`flags.ts`** (new, shared): `flagCodes()` moves here from
  `education.ts`, which re-exports it, so Business partner rows and
  Healthcare destination chips can show flags.
- Layout width `max-width: 88rem`, inline padding `clamp(2rem, 5vw, 5rem)`
  on desktop, `1rem` on phones; sections `padding-block: 4rem` desktop,
  `2.6rem` phones; the hero is a rounded 1.25rem panel like Education.
- Phone floor is 390px wide; everything is verified at that width and at
  1300px and 1920px.

Each page becomes one component in `src/lib/components/`:
`BusinessPortal.svelte`, `HealthcarePortal.svelte`, `UmrahPortal.svelte`,
rendered by a thin `+page.svelte` like Education. `DivisionPortal.svelte`
is deleted once Healthcare and Umrah no longer use it.

## Global Business

Mode: persuade a Bangladeshi importer, exporter or buyer that Bengal Port
can take them from "I need a supplier" to goods cleared at port.

### Hero: trade routes map

- Full-width navy panel (`--ink-panel`), rounded, `min-height 86svh` on
  desktop. Behind the copy: an equirectangular world map drawn as small
  gold-tinted dots on navy (public-domain Natural Earth outline from
  Wikimedia Commons, simplified, inlined as SVG in `TradeRoutesMap.svelte`).
  Bangladesh carries a steady gold beacon (pulsing ring).
- Gold arcs animate out of Dhaka to the market currently named in the
  title: a quadratic curve drawn on with `stroke-dasharray`, a travelling
  dot, then a soft landing ring at the destination. One arc at a time, in
  step with the rotating word; previous arcs fade to 30% so the routes
  accumulate into a network over a cycle.
- Copy, centred: eyebrow "GLOBAL BUSINESS"; h1 "Sourcing from" with the
  market on its own line in gold display type (`RotatingWord`), markets
  from content (default China, Turkey, Vietnam, UAE, India, Malaysia);
  tagline "Trade. Source. Explore. Grow."; buttons "Start an enquiry"
  (`applyHref("BUSINESS")`) and "Plan a business visit"
  (`applyHref("BUSINESS", "enquiry", "Business tour")`).
- Where Education floats flags, Business floats **product-category chips**
  (gold text on translucent navy pills with a thin gold border): Textiles,
  Machinery, Electronics, Packaging, Agro products, from content. Four on
  desktop, three on phones, same float keyframes as the flags.
- Market coordinates live in code (`src/lib/markets.ts`, name → lat/lon,
  matched case-insensitively like `flagCodes`); a market the table does not
  know is shown in the title but draws no arc.
- Phones: the map scales with the panel and sits at 55% opacity behind the
  title; arcs still draw; the chips move to the panel's lower corners.

### Sections, in order

1. **Hero** as above.
2. **What we do** — a bento grid of six photo tiles, not icon cards:
   tile 1 (Global sourcing) spans two columns and two rows with a large
   photo; tiles 2–5 (Import & export, Business tours & factory visits,
   Trade opportunities, Landed-cost planning) are single; tile 6 (Document
   support) spans two columns. Each tile: photo with a navy gradient foot,
   title in white over the photo, a two-line description and a gold CTA
   line below. Phones: single column, featured tile first. Content:
   `services.items[{ image, title, description, cta, href }]` (an `image`
   field replaces `icon`).
3. **How an engagement runs** — a horizontal five-step rail on a cream
   band: a gold line with numbered gold nodes; under each node the step
   title and one sentence (Brief → Shortlist → Verify and visit →
   Negotiate and order → Ship and clear). Phones: vertical rail with the
   line on the left. Content: new `process` section (same shape as
   Healthcare's).
4. **Landed-cost calculator** — kept, restyled as a trade-desk card: inputs
   on the left, result on the right in navy with the estimate in gold
   display numerals, note below, "Request a detailed quote" opening the
   Business enquiry with the estimate in the subject. Copy from a new
   `calculator` content block (eyebrow, title, description, note).
5. **Partner network** — the live suppliers and factories as a grouped
   list, not photo cards (today every card shows the same stock photo):
   filter pills All / Suppliers / Factories plus an industry select; rows
   grouped by country with the country flag, each row: name, industry ·
   product, a featured tag in gold where `featured` is set, and "Request
   connection" (`applyHref("BUSINESS", "enquiry", name)`). Thumbnails show
   as 3.5rem rounded squares when a record has its own image.
6. **Why Bengal Port** — the `trust` points and `stats` merged into one
   navy panel: title and description on the left, the four trust points as
   a 2×2 list with gold numerals on the right, and the stats as a gold-ruled
   row along the bottom.
7. **Client reviews** — heading, navy panel with photo and copy, and the
   `Testimonials` slideshow for Business reviews. Content: new `reviews`
   block (eyebrow, heading, description, invite, cta, photo), as on
   Education.
8. **Closing** — the existing closing panel.

Removed: the shortcut strip (the hero chips and the sticky section rhythm
replace it), the icon-card grid, the standalone stats band.

### Content model

`businessContentSchema`: `hero` adds `markets: string[]` (1–8),
`categories: string[]` (1–6), `primary`, `secondary`; `services.items` get
`image` instead of `icon`; add `process`, `calculator`, `reviews`; drop
`shortcuts`. `BusinessContent` and `defaultBusinessContent` mirror it on
both sides. Saved content from before is filled from the defaults by
`fillMissing`, so the live page and the admin editor work without a data
migration.

## Global Healthcare

Mode: reassure a patient and their family that treatment abroad is
organised, calm and accountable.

### Hero: care pathway

- Light hero, the counterpart of Business's dark one: off-white panel
  (`#fdfdfb`) with the faint dot grid used on Education.
- Copy, centred: eyebrow "GLOBAL HEALTHCARE"; h1 "Treatment abroad for"
  with the specialty on its own line in gold (`RotatingWord`), specialties
  from content (default Cardiology, Oncology, Orthopaedics, Fertility,
  Neurology, Dental care); tagline "Trusted direction. Human support.";
  buttons "Request healthcare support" (`applyHref("HEALTHCARE")`) and
  "See partner hospitals" (`#hospitals`).
- Under the title, the **pathway rail**: three nodes on a gold line —
  Diagnosis review, Hospital match, Travel and care — each with an icon
  and a one-line description from content. The line fills from left to
  right and each node lights in turn on a 6-second loop; under reduced
  motion all three are lit.
- Where Education floats flags, Healthcare floats **destination chips**:
  city and country with a pin icon and the country flag, built from the
  live hospital records (unique city/country pairs) and topped up from a
  default list (Bangkok, Kuala Lumpur, Chennai, Istanbul, Singapore) so
  there are always four. Same float keyframes.

### Sections, in order

1. **Hero** as above.
2. **Treatments we coordinate** — a specialty index: on desktop, a left
   column of six large tabs (the specialties) and a right panel showing the
   selected one: photo, description, typical procedures as chips, the
   partner hospitals from the live directory whose services mention it,
   and "Ask about {specialty}" (`applyHref("HEALTHCARE", "enquiry",
   specialty)`). Tabs switch on click and on keyboard; the panel crossfades.
   Phones: an accordion. Content: new `treatments[{ title, image,
   description, procedures: string[], cta }]`.
3. **Partner hospitals** (`#hospitals`) — the live directory redesigned:
   search and country select kept; cards get a navy header strip with the
   hospital name and a flag chip, the photo below, services as chips, and
   "Request hospital connection". Three across on desktop, one on phones.
4. **Your pathway, step by step** — the four `process` steps as a vertical
   timeline that zigzags on desktop (gold nodes on a central line, cards
   alternating sides) and stacks on phones.
5. **Care with clarity** — the `feature` points and `stats` merged into one
   navy panel, the healthcare counterpart of Business's "Why Bengal Port".
6. **Patient stories** — reviews heading, navy panel and `Testimonials`
   for Healthcare reviews. Content: new `reviews` block.
7. **Closing** — the existing closing panel.

Removed: shortcut strip, icon-card grid, standalone stats band.

### Content model

New `healthcareContentSchema` = `divisionContentSchema` without
`shortcuts`, with `hero` extended by `specialties: string[]` and
`pathway: [{ title, description, icon }]` (exactly three), plus
`treatments` and `reviews`. The backend saves `/admin/content/healthcare`
against it (today Healthcare and Umrah share the generic schema).

## Global Umrah

Mode: a calm, respectful invitation to plan a pilgrimage with people who
handle the details.

### Hero: Makkah to Madinah

- Deep navy night panel: a faint star field (CSS radial-gradient dots in
  two layers, the top layer twinkling slowly), gold line-art silhouettes
  at the two lower corners — Masjid al-Haram with the Kaaba at left,
  Masjid an-Nabawi's dome and minarets at right — authored as simple SVG
  at 35% opacity, and a gold arc between them with a slow travelling light
  (the Makkah–Madinah journey). Under reduced motion the arc is static.
- Copy, centred: eyebrow "GLOBAL UMRAH"; h1 "Your Umrah," with the
  journey on its own line in gold (`RotatingWord`): "in Ramadan", "with
  family", "in a group", "with Ziyarat", from content; tagline
  "Transparent guidance. Human support."; buttons "Plan your Umrah"
  (`applyHref("UMRAH")`, an enquiry) and "See packages" (`#packages`).
- Under the title, **next group departures**: up to three date pills with
  month, day and a label (for example "Ramadan group · 12 seats"), from
  content. When none are set the strip is hidden.
- No floating chips here; the stars and silhouettes carry the hero.

### Sections, in order

1. **Hero** as above.
2. **Packages** (`#packages`) — three tier cards from content: name, nights
   in Makkah and Madinah, hotel distance from the Haram, "from ৳ price",
   inclusions as a check list, and "Enquire about {name}"
   (`applyHref("UMRAH", "enquiry", name)`). The card marked `highlighted`
   gets a gold border and a "Most chosen" tag. Phones: stacked, highlighted
   first.
3. **The journey, stage by stage** — four stages on a gold ribbon with a
   photo each: Before you fly (visa, flights), On arrival (transfers), In
   Makkah (hotel steps from the Haram), In Madinah and Ziyarat. Each stage
   lists two or three points. Desktop: four columns with the ribbon
   running through the photos' tops; phones: stacked. Content: new
   `stages[{ title, subtitle, image, points: string[] }]`.
4. **For individuals, families and groups** — `feature` points and `stats`
   merged into one navy panel.
5. **Pilgrim reviews** — reviews heading, navy panel and `Testimonials` for
   Umrah reviews. Content: new `reviews` block.
6. **How to begin** — the four `process` steps as a row of large gold
   numerals joined by a dotted gold line; phones: two by two.
7. **Closing** — the existing closing panel with the Kaaba silhouette as a
   faint watermark.

Removed: shortcut strip, icon-card grid, standalone stats band, the
"directory" block (Umrah has no records).

### Content model

New `umrahContentSchema` = `divisionContentSchema` without `shortcuts`
and `directory`, with `hero` extended by `journeys: string[]` and
`departures: [{ date (ISO), label }]` (0–3), plus `packages` (1–3),
`stages` (exactly four) and `reviews`.

## Admin

The content editor already builds its fields from the content object, so
every new section appears in Admin → Content for each page with no editor
code: text and paragraph fields, image fields with the uploader (any path
ending in `image` or `photo`), string lists and lists of objects with add
and remove. The one check during implementation is that a string list
inside a list item (package inclusions, stage points) edits correctly; if
it does not, `content-fields.ts` is extended, with a test.

## Backend

- `schemas.ts`: the three schemas above; `/admin/content/:slug` validates
  with the schema for that slug.
- `division-content.ts` and `business-content.ts` defaults on both sides
  carry the new sections with the copy below as defaults.
- Seeding is unchanged in shape: `pageContent.upsert` with `update: {}`,
  so existing databases keep what the team wrote and gain the new
  sections through `fillMissing`.
- Tests: a content test per page (defaults validate; each new section can
  be edited and comes back; a bad image path is refused), unit tests for
  `markets.ts` and `flags.ts`, and the existing suites stay green.

## Images to generate

I will build with the current photos as placeholders and swap in yours as
they arrive; file names below are what the defaults point at, under
`frontend/static/images/`. Common style for every prompt:

> Photorealistic editorial photograph, natural light, calm composition with
> clear negative space on one side for text, muted deep-navy and warm-gold
> tones present in the scene, people of South Asian appearance where people
> appear, no text, no logos, no watermarks, no visible brand names.

Tiles are 3:2 (1600×1067); panel photos are 16:9 (1600×900). Please export
as WebP or JPEG; I convert and compress on this side.

**Business**

| File | Prompt |
|---|---|
| `biz-sourcing.webp` | A Bangladeshi buyer and a Chinese supplier inspecting rolls of fabric on a bright textile factory floor, quality tags visible, wide shot. |
| `biz-import-export.webp` | A container terminal at golden hour, stacked containers and gantry cranes, a ship at the quay, long shadows, wide shot. |
| `biz-tours.webp` | A small delegation of four business visitors in a modern factory, a plant manager pointing along a production line, wide shot. |
| `biz-opportunities.webp` | A trade-fair booth with product samples on a counter, two people shaking hands, soft hall lighting, medium shot. |
| `biz-costing.webp` | A desk with a laptop, calculator, shipping documents and a cup of tea by a window, overhead angle, soft daylight. |
| `biz-documents.webp` | Close-up of hands checking customs paperwork beside a passport and a rubber stamp, shallow depth of field. |
| `biz-reviews.webp` (16:9) | A confident Bangladeshi business owner standing in a warehouse aisle, arms crossed, slight smile, wide shot. |

**Healthcare**

| File | Prompt |
|---|---|
| `care-cardiology.webp` | A cardiologist explaining a heart model to a patient and his wife in a bright modern consulting room. |
| `care-oncology.webp` | A calm oncology consultation: a doctor seated with a patient and a family member, soft daylight, reassuring body language. |
| `care-orthopaedics.webp` | A physiotherapist helping a patient take steps between parallel bars in a bright rehabilitation room. |
| `care-fertility.webp` | A couple in consultation with a doctor in a warm, modern clinic, tablet on the desk, gentle expressions. |
| `care-dental.webp` | A modern dental clinic, a dentist showing a patient a scan on a screen, clean white and teal interior. |
| `care-checkups.webp` | An executive health-screening lobby, a nurse with a tablet greeting a patient, bright and spacious. |
| `care-reviews.webp` (16:9) | A patient and family with a coordinator at a hospital reception desk, relieved smiles, wide shot. |

**Umrah**

| File | Prompt |
|---|---|
| `umrah-before.webp` | A passport with a visa page, a boarding pass and prayer beads laid on a prayer mat, soft morning light, overhead angle. |
| `umrah-makkah.webp` | Masjid al-Haram at night seen from a hotel window, the Kaaba softly lit in the courtyard below, respectful wide shot. |
| `umrah-madinah.webp` | The green dome of Masjid an-Nabawi at dawn with pilgrims walking calmly across the marble courtyard, wide shot. |
| `umrah-ziyarat.webp` | A comfortable modern coach on a desert road near Madinah at golden hour, mountains behind, wide shot. |
| `umrah-reviews.webp` (16:9) | A multi-generation Bangladeshi family in modest white pilgrim dress smiling softly in a mosque courtyard, faces turned slightly away, wide shot. |

No hero images are needed: the Business map, the Healthcare pathway and
the Umrah night sky are drawn in code.

## Default copy

Written as defaults and editable afterwards. Headlines:

- Business: hero as above; "What we do"; "How an engagement runs"; "Know
  your landed cost before you commit"; "A verified network across markets";
  "Built for dependable global trade"; "What our clients say"; closing
  "Ready to grow your business globally?".
- Healthcare: hero as above; "Treatments we coordinate"; "Partner hospitals
  and services"; "Your pathway, step by step"; "Important health decisions
  deserve a calm, accountable process"; "What our patients say"; closing
  "Ready to plan treatment abroad?".
- Umrah: hero as above; "Packages for every pilgrim"; "The journey, stage
  by stage"; "For individuals, families and groups"; "What our pilgrims
  say"; "Begin with a simple enquiry"; closing "Ready to plan your sacred
  journey?".

## Verification

For each page: desktop 1300px and 1920px in Chrome, phone width with the
headless-Chrome recipe (reduced motion for section captures, motion on for
the hero), hover and focus states on the hero controls and tabs, keyboard
reach of every control, `svelte-check`, both test suites, and the design
detector once per changed component. Reduced motion checked once per hero.

## Implementation order

1. Shared pieces: `reveal.ts`, `RotatingWord.svelte`, `flags.ts`,
   `markets.ts`, schema and default-content scaffolding, tests.
2. Business page, end to end, verified.
3. Healthcare page, end to end, verified.
4. Umrah page, end to end, verified.
5. Remove `DivisionPortal.svelte` and anything left unused; final sweep.

Each page is its own commit. Pushing and merging happen when the owner
asks, as before.

## Out of scope

The home page, the Services index page, the header, the apply forms, the
admin editor's own look, and any change to the Education page.
