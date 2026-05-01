# Web App Design — Global Cinematic Technical Repository (v1)

| | |
|---|---|
| **Date** | 2026-04-30 |
| **Status** | Approved |
| **Parent project** | Global Cinematic Technical Repository: Master Development Blueprint |
| **Sub-project** | 2 of 6 — Public Web App |
| **Predecessor** | Sub-project 1 — Data Layer (`packages/db`) |
| **Successor** | Sub-project 3 — Search & Discovery |

---

## 1. Context

### 1.1 What this sub-project is

Sub-project 2 delivers the public read-only web application that surfaces the data layer built in sub-project 1. It is a statically generated Next.js App Router application that imports the typed Drizzle query layer from `@bts/db` directly — no HTTP API boundary.

The app has a working name of **Studio Pro**. It is positioned as a professional reference tool, not an editorial or discovery magazine.

### 1.2 Anchor audience

Working professionals — DPs, gaffers, ACs, colorists, VFX supervisors. The same audience the data layer was designed for. A pro will arrive knowing a production title, a person's name, or a piece of gear, and expect to find dense, cited, accurate data immediately. The UI must signal "made for us" within three seconds.

### 1.3 Scope for this sub-project

**In scope:**
- Static read-only web app: production detail, person detail, equipment detail pages
- Browse/index pages for each entity type
- Three killer query pages matching the data layer's regression contract
- Dark, data-dense visual design system (Tailwind, no component library)
- Source attribution display on every entity

**Explicitly out of scope (per master blueprint):**
- Text search UI (sub-project 3 — Algolia / pg_trgm)
- Faceted filtering (thin wrapper over search; deferred to sub-project 3)
- Auth, subscriptions (sub-project 6)
- Admin / editorial UI (sub-project 4 or 5)
- Interactive components, media assets (sub-project 5)
- Write paths of any kind

---

## 2. Decisions (Q&A log)

| # | Question | Decision | Rationale |
|---|---|---|---|
| D1 | Primary entry point | **Production-first** | DPs arrive in prep knowing a film title. Productions surface crew, formats, and gear in one place — the richest node. Equipment cross-reference is the differentiating sticky feature. |
| D2 | Scope | **Read-only browse + killer query pages, no search** | Seed corpus (~15-20 productions) is too small for a search box to add value. Search is sub-project 3. |
| D3 | Visual register | **Dark, technical, data-dense** | Working pros live in Resolve/Frame.io/Silverstack — all dark. Signals "made for us." Differentiates from Letterboxd/IMDb in the light/editorial lane. |
| D4 | Page inventory | **Full detail pages for productions, people, manufacturers, series, items. Scenes inline.** | Killer query results link to entity detail pages — stubs break the loop that keeps a pro engaged. Scenes have no standalone URL use case at this stage. |
| D5 | Data fetching | **React Server Components query `@bts/db` directly** | No external consumers at this stage; RSC eliminates round-trip overhead; typed Drizzle layer already captures type-safety; Route Handlers can be added later. |
| D6 | Framework | **Next.js 14+ App Router** | Static generation is a genuine win for read-only data. App Router layout nesting maps cleanly to gear URL hierarchy. TypeScript/pnpm monorepo already in place. Natural foundation for sub-projects 5 and 6. |

---

## 3. Architecture

### 3.1 Repo placement

```
bts/                          ← pnpm workspace root (C:\dev\bts)
├── packages/
│   └── db/                   ← @bts/db (sub-project 1, complete)
└── apps/
    └── web/                  ← @bts/web (this sub-project)
        ├── app/
        ├── components/
        ├── lib/
        ├── public/
        ├── next.config.ts
        ├── tailwind.config.ts
        ├── package.json
        └── tsconfig.json
```

`apps/web/package.json` declares `"@bts/db": "workspace:*"` as a dependency. The web app imports the typed Drizzle `db` instance and query functions directly — no HTTP boundary.

### 3.2 Rendering strategy

**Fully static.** `generateStaticParams` walks every slug at build time and pre-renders all detail pages. The killer query pages bake their results in at build time too. At runtime, zero DB connections are made — pages are served as flat HTML from a CDN edge. `next build` is rerun whenever the seed data changes.

A broken slug in `generateStaticParams` fails the build rather than silently serving a runtime 404. This is intentional — it makes data integrity problems visible in CI.

### 3.3 Query layer convention

All DB queries live in `packages/db/src/queries/`, organized by entity. Each file exports typed async functions that accept a `db` instance and return plain objects — no Drizzle internal types leak into `apps/web`. New query files added for the web app:

```
packages/db/src/queries/
  killer-queries.ts        ← exists
  productions.ts           ← listProductions(), getProductionBySlug(), getProductionWithFullDetail()
  people.ts                ← listPeople(), getPersonBySlug(), getPersonFilmography()
  equipment.ts             ← listManufacturers(), getManufacturerBySlug(),
                              getSeriesBySlug(), getItemBySlug(),
                              getProductionsUsingItem()
```

Query functions are called directly from `async` Server Components. No `fetch()`, no Route Handlers, no client-side data loading.

---

## 4. URL Structure & Page Inventory

**14 routes total.**

### 4.1 Browse / index pages

```
/                              Homepage: featured productions grid + killer query links
/films                         All productions, sorted by release year desc
/crew                          All people, sorted by family name
/gear                          Manufacturer index
/gear/[manufacturer]           Series list for a manufacturer
```

### 4.2 Detail pages (generateStaticParams per slug)

```
/films/[slug]                                    Production detail
/crew/[slug]                                     Person detail
/gear/[manufacturer]/[series]                    Series detail
/gear/[manufacturer]/[series]/[item]             Item detail
```

### 4.3 Killer query pages (statically generated, data baked in at build)

```
/queries/alexa65-sphero           Q1: Features shot on ALEXA 65 + Panavision Sphero, by DP
/queries/dune-part-two-lenses     Q2: Lenses Greig Fraser used on Dune: Part Two
/queries/magic-hour-2023          Q3: Magic-hour exterior lighting in 2023 features
```

### 4.4 Utility

```
/not-found                         Next.js not-found.tsx (404)
```

### 4.5 Navigation

Persistent top nav with three primary anchors — **Films**, **Crew**, **Gear** — plus a **Queries** link. The gear URL hierarchy (`/gear/[manufacturer]/[series]/[item]`) is reflected in a breadcrumb bar rendered by `app/gear/layout.tsx`.

Scenes have no standalone URL — they render inline within `/films/[slug]` as an expandable section listing equipment per scene.

---

## 5. Component Architecture

### 5.1 Server vs. client split

All components are Server Components by default. A component becomes a Client Component only if it requires `useState`, `useEffect`, event handlers, or browser APIs. For this sub-project (read-only, no interactivity beyond navigation links), no Client Components are needed.

### 5.2 Layout nesting

```
app/layout.tsx            Root HTML shell, dark background, top nav (Server Component)
app/gear/layout.tsx       Breadcrumb bar reflecting manufacturer → series → item depth
```

### 5.3 Component inventory

```
components/
  nav/
    TopNav.tsx                     Persistent navigation bar
  productions/
    ProductionCard.tsx             Card for /films grid
    ProductionDetail.tsx           Full detail layout for /films/[slug]
    SceneList.tsx                  Scenes + inline equipment for a production
    FormatBadge.tsx                Aspect ratio / format pill
  people/
    PersonCard.tsx                 Card for /crew grid
    FilmographyTable.tsx           Production list for /crew/[slug]
  equipment/
    ManufacturerCard.tsx           Card for /gear index
    SpecsTable.tsx                 Renders JSONB specs by category shape (uses Zod schemas from @bts/db)
  queries/
    KillerQueryTable.tsx           Shared table component for all three killer query pages
  ui/
    DataTable.tsx                  Dark-themed table primitive (reused across all entities)
    Badge.tsx                      Pill: confidence level / equipment category / production type
    SectionHeader.tsx              Amber left-border rule + label + heading
    SourceCitation.tsx             Collapsible footnote block for _sources attribution
```

### 5.4 Attribution display

Every production, scene, crew assignment, and equipment usage row surfaces its `_sources` rows as collapsible citation footnotes. The `confidence` enum drives a visual badge:

| Confidence | Badge style |
|---|---|
| `primary` | White pill |
| `secondary` | Zinc-400 pill |
| `manufacturer_marketing` | Amber-400 pill with warning icon |
| `speculative` | Dashed border, zinc-500 text |

---

## 6. Visual Design System

### 6.1 Palette

| Role | Token | Hex |
|---|---|---|
| Page canvas | `zinc-950` | `#09090b` |
| Surface (cards, panels) | `zinc-900` | `#18181b` |
| Border / divider | `zinc-800` | `#27272a` |
| Text primary | `zinc-50` | `#fafafa` |
| Text muted | `zinc-400` | `#a1a1aa` |
| Accent | `amber-400` | `#fbbf24` |
| Danger | `rose-500` | `#f43f5e` |

Amber is the single accent. It reads as a technical indicator (on-set monitors, warning LEDs) rather than a decorative color, and pairs with near-black without the coldness of cyan or blue.

### 6.2 Typography

| Use | Font | Loading |
|---|---|---|
| UI / data / labels | `Inter` | `next/font/google` |
| Display / film titles / person names | `DM Serif Display` | `next/font/google` |

One serif + one sans-serif. `DM Serif Display` gives production titles editorial weight without making the layout feel like a magazine. Both are self-hosted via `next/font` for zero layout shift.

### 6.3 Density targets

- Data table rows: `text-sm` (14px), 36px row height, `px-3 py-2` cell padding — matches Resolve inspector density.
- Cards: 4–6 productions visible per viewport at 1440px without scrolling.
- No hero images, no decorative full-bleed photography. Film titles are typographic.

### 6.4 Component primitives

All built with Tailwind utility classes. No component library (no shadcn, no Radix) — the UI is read-only with no interactive widgets beyond navigation links.

| Primitive | Description |
|---|---|
| `DataTable` | `zinc-900` background, `zinc-800` borders, `odd:bg-zinc-900 even:bg-zinc-950` zebra striping |
| `Badge` | Pill-shaped, one variant per confidence level, equipment category, and production type |
| `SectionHeader` | Amber left-border rule + `zinc-400` label + `zinc-50` heading |
| `SourceCitation` | `text-xs`, muted, collapsible footnote |

---

## 7. Error Handling

**404:** `notFound()` called from any Server Component when a slug lookup returns null. A single `app/not-found.tsx` renders a dark-themed not-found page with a link back to `/films`.

**Build-time slug safety:** `generateStaticParams` failures abort the build. A bad slug is a data problem, caught in CI, not a runtime 404 in production.

**Unexpected errors:** A single `app/error.tsx` catches unexpected Server Component errors. No per-route error boundaries — the data is read-only and query failures are rare.

**Environment:** `DATABASE_URL` loaded from `.env.local` (git-ignored) at dev and build time. Reuses the same variable name as `packages/db/.env`.

---

## 8. Testing

| Layer | Tool | What it catches |
|---|---|---|
| Type checking | `tsc --noEmit` | Query result type mismatches, schema changes that break the web app |
| Build smoke | `next build` | Broken `generateStaticParams`, missing slugs, render errors |
| No component unit tests | — | Components are thin wrappers over typed data; no logic to unit-test |

CI sequence (addition to existing):
```
db:migrate → db:seed → tsc --noEmit (web) → next build
```

End-to-end tests (Playwright) are deferred to sub-projects 5–6 when user interaction flows exist.

---

## 9. Repo layout (v1 addition)

```
bts/
├── packages/
│   └── db/
│       └── src/
│           └── queries/
│               ├── killer-queries.ts   ← exists
│               ├── productions.ts      ← new
│               ├── people.ts           ← new
│               └── equipment.ts        ← new
└── apps/
    └── web/
        ├── app/
        │   ├── layout.tsx
        │   ├── page.tsx                         /
        │   ├── not-found.tsx
        │   ├── error.tsx
        │   ├── films/
        │   │   ├── page.tsx                     /films
        │   │   └── [slug]/
        │   │       └── page.tsx                 /films/[slug]
        │   ├── crew/
        │   │   ├── page.tsx                     /crew
        │   │   └── [slug]/
        │   │       └── page.tsx                 /crew/[slug]
        │   ├── gear/
        │   │   ├── layout.tsx                   breadcrumb wrapper
        │   │   ├── page.tsx                     /gear
        │   │   └── [manufacturer]/
        │   │       ├── page.tsx                 /gear/[manufacturer]
        │   │       └── [series]/
        │   │           ├── page.tsx             /gear/[manufacturer]/[series]
        │   │           └── [item]/
        │   │               └── page.tsx         /gear/[manufacturer]/[series]/[item]
        │   └── queries/
        │       ├── alexa65-sphero/
        │       │   └── page.tsx
        │       ├── dune-part-two-lenses/
        │       │   └── page.tsx
        │       └── magic-hour-2023/
        │           └── page.tsx
        ├── components/
        │   ├── nav/TopNav.tsx
        │   ├── productions/
        │   │   ├── ProductionCard.tsx
        │   │   ├── ProductionDetail.tsx
        │   │   ├── SceneList.tsx
        │   │   └── FormatBadge.tsx
        │   ├── people/
        │   │   ├── PersonCard.tsx
        │   │   └── FilmographyTable.tsx
        │   ├── equipment/
        │   │   ├── ManufacturerCard.tsx
        │   │   └── SpecsTable.tsx
        │   ├── queries/
        │   │   └── KillerQueryTable.tsx
        │   └── ui/
        │       ├── DataTable.tsx
        │       ├── Badge.tsx
        │       ├── SectionHeader.tsx
        │       └── SourceCitation.tsx
        ├── lib/
        │   └── fonts.ts                         Inter + DM Serif Display via next/font
        ├── public/
        ├── next.config.ts
        ├── tailwind.config.ts
        ├── package.json
        └── tsconfig.json
```

---

## 10. Out of scope (deferred deliberately)

| Item | Where it goes |
|---|---|
| Text search, faceted filtering | Sub-project 3 |
| TMDb / IMDb / Wikidata sync | Sub-project 4 |
| Admin / editorial UI | Sub-project 4 or 5 |
| Media assets (stills, BTS clips, before/after pairs) | Sub-project 5 |
| Interactive components, design system | Sub-project 5 |
| Auth, subscriptions, sponsored hubs | Sub-project 6 |
| Route Handlers / REST API | When an external consumer exists |
| Playwright end-to-end tests | When interactive flows exist |
| Manufacturer-sponsored hub pages | Sub-project 6 |

---

## 11. Next steps

1. Spec review (separate agent verifies completeness and consistency).
2. User reviews this document.
3. Invoke writing-plans skill — produces a task-by-task implementation plan.
4. Implement against the plan in `apps/web`.
