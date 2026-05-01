# Web App Implementation Plan — Studio Pro (Sub-project 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `apps/web` — a statically generated Next.js App Router application that imports `@bts/db` directly and renders 14 routes (production/person/equipment detail pages, three killer query pages, and browse indexes) with a dark, data-dense design system.

**Architecture:** pnpm workspace at `C:\dev\bts`. The web app lives at `apps/web` alongside `packages/db`. Server Components call typed query functions in `packages/db/src/queries/` directly — no HTTP layer. All pages are statically generated via `generateStaticParams` at build time. Tailwind CSS for all styling; no component library.

**Tech Stack:** Next.js 14+ App Router, TypeScript strict, Tailwind CSS v3, `next/font` (Inter + DM Serif Display), `@bts/db` (workspace), Drizzle ORM (via @bts/db), PostgreSQL 16 (Docker, local only — used at build time).

**Prerequisite reading:** `docs/superpowers/specs/2026-04-30-web-app-design.md` — every decision in this plan is anchored there.

**Working directory for all commands:** `C:\dev\bts` unless the step specifies otherwise.

---

## File map

```
packages/db/
  package.json                    ← Task 1: add ./schema/specs export
  src/
    index.ts                      ← Task 1: export schema tables
    queries/
      killer-queries.ts           (exists — unchanged)
      productions.ts              ← Task 2
      people.ts                   ← Task 3
      equipment.ts                ← Task 4

apps/web/
  package.json                    ← Task 5
  tsconfig.json                   ← Task 5
  next.config.ts                  ← Task 5
  tailwind.config.ts              ← Task 6
  postcss.config.mjs              ← Task 6
  app/
    globals.css                   ← Task 6
    layout.tsx                    ← Task 7
    page.tsx                      ← Task 24
    not-found.tsx                 ← Task 25
    error.tsx                     ← Task 25
    films/
      page.tsx                    ← Task 11
      [slug]/page.tsx             ← Task 13
    crew/
      page.tsx                    ← Task 15
      [slug]/page.tsx             ← Task 16
    gear/
      layout.tsx                  ← Task 18
      page.tsx                    ← Task 17
      [manufacturer]/
        page.tsx                  ← Task 18
        [series]/
          page.tsx                ← Task 19
          [item]/
            page.tsx              ← Task 20
    queries/
      alexa65-sphero/page.tsx     ← Task 21
      dune-part-two-lenses/page.tsx ← Task 22
      magic-hour-2023/page.tsx    ← Task 23
  components/
    nav/TopNav.tsx                ← Task 7
    ui/
      DataTable.tsx               ← Task 8
      Badge.tsx                   ← Task 8
      SectionHeader.tsx           ← Task 9
      SourceCitation.tsx          ← Task 9
    productions/
      FormatBadge.tsx             ← Task 10
      ProductionCard.tsx          ← Task 10
      ProductionDetail.tsx        ← Task 12
      SceneList.tsx               ← Task 12
    people/
      PersonCard.tsx              ← Task 14
      FilmographyTable.tsx        ← Task 14
    equipment/
      ManufacturerCard.tsx        ← Task 17
      SpecsTable.tsx              ← Task 19
    queries/
      KillerQueryTable.tsx        ← Task 21
  lib/
    fonts.ts                      ← Task 7
```

---

## Task 1: Data layer prerequisite — exports + index

**Files:**
- Modify: `packages/db/package.json`
- Modify: `packages/db/src/index.ts`

The web app needs two things from `@bts/db` that aren't yet exported: the schema tables (for query functions) and the Zod spec schemas (for `SpecsTable`). This task wires both.

- [ ] **Step 1: Add subpath export and schema re-export**

In `packages/db/package.json`, add an `exports` field:

```json
{
  "name": "@bts/db",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts",
    "./schema/specs": "./src/schema/specs/index.ts"
  },
  "scripts": {
    "migrate": "drizzle-kit migrate",
    "generate": "drizzle-kit generate",
    "studio": "drizzle-kit studio",
    "seed": "tsx src/seed/run.ts",
    "seed:reset": "tsx scripts/reset-db.ts",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "drizzle-orm": "^0.36.0",
    "postgres": "^3.4.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "drizzle-kit": "^0.30.0",
    "tsx": "^4.0.0",
    "typescript": "^5.6.0",
    "vitest": "^2.0.0",
    "dotenv": "^16.0.0"
  }
}
```

In `packages/db/src/index.ts`, add schema re-exports so query files don't need to deep-import:

```typescript
export { db, sql } from './db.js';
export * from './schema/index.js';
```

- [ ] **Step 2: Verify typecheck still passes**

```bash
cd packages/db && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/db/package.json packages/db/src/index.ts
git commit -m "feat(db): add schema/specs subpath export and schema re-exports"
```

---

## Task 2: Query functions — productions

**Files:**
- Create: `packages/db/src/queries/productions.ts`

Two query functions: `listProductions` (for the `/films` index and `generateStaticParams`) and `getProductionWithFullDetail` (for `/films/[slug]`).

- [ ] **Step 1: Create the file**

```typescript
// packages/db/src/queries/productions.ts
import { eq, desc, and } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { SeedDb } from '../seed/run.ts';
import { db as defaultDb } from '../db.ts';

export async function listProductions(db: SeedDb = defaultDb) {
  return db.execute<{
    slug: string;
    title: string;
    type: string;
    release_year: number | null;
    synopsis: string | null;
    primary_aspect_ratio: string | null;
    primary_acquisition_format: string | null;
  }>(sql`
    SELECT
      p.slug, p.title, p.type, p.release_year, p.synopsis,
      pf.aspect_ratio AS primary_aspect_ratio,
      pf.acquisition_format AS primary_acquisition_format
    FROM productions p
    LEFT JOIN production_formats pf
      ON pf.production_id = p.id AND pf.is_primary = true
    ORDER BY p.release_year DESC NULLS LAST, p.title ASC
  `);
}

export async function getProductionWithFullDetail(db: SeedDb = defaultDb, slug: string) {
  // Production core
  const [prod] = await db.execute<{
    id: number; slug: string; title: string; original_title: string | null;
    type: string; release_year: number | null; runtime_minutes: number | null;
    synopsis: string | null; imdb_id: string | null; tmdb_id: number | null;
  }>(sql`SELECT id, slug, title, original_title, type, release_year, runtime_minutes,
              synopsis, imdb_id, tmdb_id
         FROM productions WHERE slug = ${slug}`);

  if (!prod) return null;

  const [formats, studios, crew, scenes, productionSources] = await Promise.all([
    // Formats
    db.execute<{
      label: string | null; aspect_ratio: string; acquisition_format: string;
      color_space: string | null; frame_rate: string | null; is_primary: boolean;
    }>(sql`SELECT label, aspect_ratio, acquisition_format, color_space,
                  frame_rate::text, is_primary
           FROM production_formats WHERE production_id = ${prod.id}
           ORDER BY is_primary DESC`),

    // Studios
    db.execute<{ name: string; kind: string; role: string }>(sql`
      SELECT s.name, s.kind, ps.role
      FROM production_studios ps JOIN studios s ON s.id = ps.studio_id
      WHERE ps.production_id = ${prod.id} ORDER BY s.name`),

    // Crew
    db.execute<{
      person_slug: string; display_name: string; role_slug: string; role_name: string;
      role_category: string; credit_order: number | null; credit_name_override: string | null;
    }>(sql`
      SELECT ppl.slug AS person_slug, ppl.display_name, r.slug AS role_slug,
             r.name AS role_name, r.category AS role_category,
             ca.credit_order, ca.credit_name_override
      FROM crew_assignments ca
      JOIN people ppl ON ppl.id = ca.person_id
      JOIN roles r ON r.id = ca.role_id
      WHERE ca.production_id = ${prod.id}
      ORDER BY r.category, ca.credit_order NULLS LAST, ppl.display_name`),

    // Scenes with equipment
    db.execute<{
      scene_id: number; scene_slug: string; scene_title: string;
      scene_synopsis: string | null; time_of_day: string | null;
      interior_exterior: string | null; location: string | null;
      series_slug: string; series_name: string; series_category: string;
      manufacturer_slug: string;
      item_slug: string | null; item_name: string | null;
      setup_label: string | null; usage_role: string | null;
    }>(sql`
      SELECT sc.id AS scene_id, sc.slug AS scene_slug, sc.title AS scene_title,
             sc.synopsis AS scene_synopsis, sc.time_of_day, sc.interior_exterior, sc.location,
             es.slug AS series_slug, es.name AS series_name, es.category AS series_category,
             em.slug AS manufacturer_slug,
             ei.slug AS item_slug, ei.name AS item_name,
             eu.setup_label, eu.usage_role
      FROM scenes sc
      JOIN equipment_usage eu ON eu.scene_id = sc.id
      JOIN equipment_series es ON es.id = eu.equipment_series_id
      JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
      LEFT JOIN equipment_items ei ON ei.id = eu.equipment_item_id
      WHERE sc.production_id = ${prod.id}
      ORDER BY sc.id, es.category, es.name`),

    // Production sources
    db.execute<{
      title: string; publication: string | null; author: string | null;
      published_at: string | null; url: string | null; archive_url: string | null;
      confidence: string; claim_quote: string | null;
    }>(sql`
      SELECT s.title, s.publication, s.author, s.published_at::text, s.url, s.archive_url,
             ps.confidence, ps.claim_quote
      FROM production_sources ps JOIN sources s ON s.id = ps.source_id
      WHERE ps.production_id = ${prod.id}
      ORDER BY ps.confidence`),
  ]);

  return { production: prod, formats, studios, crew, scenes, productionSources };
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd packages/db && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/queries/productions.ts
git commit -m "feat(db): add productions query functions (list + full detail)"
```

---

## Task 3: Query functions — people

**Files:**
- Create: `packages/db/src/queries/people.ts`

- [ ] **Step 1: Create the file**

```typescript
// packages/db/src/queries/people.ts
import { sql } from 'drizzle-orm';
import type { SeedDb } from '../seed/run.ts';
import { db as defaultDb } from '../db.ts';

export async function listPeople(db: SeedDb = defaultDb) {
  return db.execute<{
    slug: string; display_name: string; country: string | null;
    member_societies: string[] | null;
  }>(sql`
    SELECT slug, display_name, country, member_societies
    FROM people ORDER BY family_name ASC NULLS LAST, display_name ASC
  `);
}

export async function getPersonBySlug(db: SeedDb = defaultDb, slug: string) {
  const [person] = await db.execute<{
    slug: string; display_name: string; given_name: string | null;
    family_name: string | null; aliases: string[] | null;
    birth_date: string | null; country: string | null;
    bio: string | null; member_societies: string[] | null;
    imdb_id: string | null; wikidata_id: string | null;
  }>(sql`
    SELECT slug, display_name, given_name, family_name, aliases,
           birth_date::text, country, bio, member_societies, imdb_id, wikidata_id
    FROM people WHERE slug = ${slug}
  `);
  return person ?? null;
}

export async function getPersonFilmography(db: SeedDb = defaultDb, slug: string) {
  return db.execute<{
    production_slug: string; production_title: string;
    release_year: number | null; production_type: string;
    role_name: string; role_category: string; credit_name_override: string | null;
    primary_aspect_ratio: string | null; primary_acquisition_format: string | null;
  }>(sql`
    SELECT p.slug AS production_slug, p.title AS production_title,
           p.release_year, p.type AS production_type,
           r.name AS role_name, r.category AS role_category,
           ca.credit_name_override,
           pf.aspect_ratio AS primary_aspect_ratio,
           pf.acquisition_format AS primary_acquisition_format
    FROM crew_assignments ca
    JOIN people ppl ON ppl.id = ca.person_id
    JOIN productions p ON p.id = ca.production_id
    JOIN roles r ON r.id = ca.role_id
    LEFT JOIN production_formats pf
      ON pf.production_id = p.id AND pf.is_primary = true
    WHERE ppl.slug = ${slug}
    ORDER BY p.release_year DESC NULLS LAST, p.title ASC
  `);
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/db && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/queries/people.ts
git commit -m "feat(db): add people query functions (list + by-slug + filmography)"
```

---

## Task 4: Query functions — equipment

**Files:**
- Create: `packages/db/src/queries/equipment.ts`

- [ ] **Step 1: Create the file**

```typescript
// packages/db/src/queries/equipment.ts
import { sql } from 'drizzle-orm';
import type { SeedDb } from '../seed/run.ts';
import { db as defaultDb } from '../db.ts';

// ── Manufacturers ──────────────────────────────────────────────────────────────

export async function listManufacturers(db: SeedDb = defaultDb) {
  return db.execute<{
    slug: string; name: string; kind: string; country: string | null;
    description: string | null; series_count: number;
  }>(sql`
    SELECT em.slug, em.name, em.kind, em.country, em.description,
           COUNT(es.id)::int AS series_count
    FROM equipment_manufacturers em
    LEFT JOIN equipment_series es ON es.manufacturer_id = em.id
    GROUP BY em.id ORDER BY em.name ASC
  `);
}

export async function getManufacturerBySlug(db: SeedDb = defaultDb, slug: string) {
  const [manufacturer] = await db.execute<{
    slug: string; name: string; kind: string; country: string | null;
    founded_year: number | null; website: string | null; description: string | null;
  }>(sql`
    SELECT slug, name, kind, country, founded_year, website, description
    FROM equipment_manufacturers WHERE slug = ${slug}
  `);
  if (!manufacturer) return null;

  const series = await db.execute<{
    slug: string; name: string; category: string;
    year_introduced: number | null; year_discontinued: number | null;
    description: string | null; item_count: number;
  }>(sql`
    SELECT es.slug, es.name, es.category, es.year_introduced, es.year_discontinued,
           es.description, COUNT(ei.id)::int AS item_count
    FROM equipment_series es
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    LEFT JOIN equipment_items ei ON ei.series_id = es.id
    WHERE em.slug = ${slug}
    GROUP BY es.id ORDER BY es.category, es.name
  `);

  return { manufacturer, series };
}

// ── Series ─────────────────────────────────────────────────────────────────────

export async function listSeriesByManufacturer(db: SeedDb = defaultDb, manufacturerSlug: string) {
  return db.execute<{ slug: string }>(sql`
    SELECT es.slug FROM equipment_series es
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    WHERE em.slug = ${manufacturerSlug}
  `);
}

export async function getSeriesBySlug(db: SeedDb = defaultDb, seriesSlug: string) {
  const [series] = await db.execute<{
    slug: string; name: string; category: string;
    year_introduced: number | null; year_discontinued: number | null;
    description: string | null; manufacturer_slug: string; manufacturer_name: string;
  }>(sql`
    SELECT es.slug, es.name, es.category, es.year_introduced, es.year_discontinued,
           es.description, em.slug AS manufacturer_slug, em.name AS manufacturer_name
    FROM equipment_series es
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    WHERE es.slug = ${seriesSlug}
  `);
  if (!series) return null;

  const [items, usedOn] = await Promise.all([
    db.execute<{
      slug: string; name: string; status: string;
      year_introduced: number | null; specs: unknown;
    }>(sql`
      SELECT slug, name, status, year_introduced, specs
      FROM equipment_items WHERE series_id = (
        SELECT id FROM equipment_series WHERE slug = ${seriesSlug}
      ) ORDER BY name
    `),
    db.execute<{ production_slug: string; production_title: string; release_year: number | null }>(sql`
      SELECT DISTINCT p.slug AS production_slug, p.title AS production_title, p.release_year
      FROM equipment_usage eu
      JOIN equipment_series es ON es.id = eu.equipment_series_id
      JOIN scenes sc ON sc.id = eu.scene_id
      JOIN productions p ON p.id = sc.production_id
      WHERE es.slug = ${seriesSlug}
      ORDER BY p.release_year DESC NULLS LAST
    `),
  ]);

  return { series, items, usedOn };
}

// ── Items ──────────────────────────────────────────────────────────────────────

export async function listItemsBySeries(db: SeedDb = defaultDb, seriesSlug: string) {
  return db.execute<{ slug: string }>(sql`
    SELECT ei.slug FROM equipment_items ei
    JOIN equipment_series es ON es.id = ei.series_id
    WHERE es.slug = ${seriesSlug}
  `);
}

export async function getItemBySlug(db: SeedDb = defaultDb, itemSlug: string) {
  const [item] = await db.execute<{
    slug: string; name: string; model_number: string | null; status: string;
    year_introduced: number | null; year_discontinued: number | null;
    specs: unknown; series_slug: string; series_name: string;
    series_category: string; manufacturer_slug: string; manufacturer_name: string;
  }>(sql`
    SELECT ei.slug, ei.name, ei.model_number, ei.status,
           ei.year_introduced, ei.year_discontinued, ei.specs,
           es.slug AS series_slug, es.name AS series_name, es.category AS series_category,
           em.slug AS manufacturer_slug, em.name AS manufacturer_name
    FROM equipment_items ei
    JOIN equipment_series es ON es.id = ei.series_id
    JOIN equipment_manufacturers em ON em.id = es.manufacturer_id
    WHERE ei.slug = ${itemSlug}
  `);
  if (!item) return null;

  const usedOn = await db.execute<{
    production_slug: string; production_title: string; release_year: number | null;
    scene_title: string; setup_label: string | null;
  }>(sql`
    SELECT DISTINCT p.slug AS production_slug, p.title AS production_title,
                    p.release_year, sc.title AS scene_title, eu.setup_label
    FROM equipment_usage eu
    JOIN equipment_items ei ON ei.id = eu.equipment_item_id
    JOIN scenes sc ON sc.id = eu.scene_id
    JOIN productions p ON p.id = sc.production_id
    WHERE ei.slug = ${itemSlug}
    ORDER BY p.release_year DESC NULLS LAST, p.title
  `);

  return { item, usedOn };
}
```

- [ ] **Step 2: Typecheck**

```bash
cd packages/db && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/queries/equipment.ts
git commit -m "feat(db): add equipment query functions (manufacturers, series, items)"
```

---

## Task 5: Scaffold apps/web

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/next.config.ts`
- Modify: `pnpm-workspace.yaml`

**Confirmed context:** `packages/db/src/schema/index.ts` already exists and exports all table definitions. `packages/db/src/schema/specs/index.ts` already exists and exports `validateSpecs(category, specs)`, `lensSpecsSchema`, `cameraSpecsSchema`, `lightingSpecsSchema`, `filterSpecsSchema`. Both are in the codebase — Task 1 adds the `exports` field to `package.json` and the schema re-export to `src/index.ts`; no new files need to be created.

- [ ] **Step 1: Update pnpm workspace**

In `pnpm-workspace.yaml`, add the `apps/*` pattern if not present:

```yaml
packages:
  - 'packages/*'
  - 'apps/*'
```

- [ ] **Step 2: Create apps/web/package.json**

```json
{
  "name": "@bts/web",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bts/db": "workspace:*",
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 3: Create apps/web/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "ES2022"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": false,
    "resolveJsonModule": true,
    "noEmit": true,
    "strict": true,
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
```

> **Note:** Check that `tsconfig.base.json` exists at `C:\dev\bts\tsconfig.base.json`. If it doesn't define `strict: true`, add it here.

- [ ] **Step 4: Create apps/web/next.config.ts**

```typescript
import type { NextConfig } from 'next';

const config: NextConfig = {
  transpilePackages: ['@bts/db'],
};

export default config;
```

`transpilePackages` tells Next.js to compile `@bts/db`'s TypeScript source directly rather than expecting pre-compiled JS — necessary because `packages/db` has `"main": "./src/index.ts"`.

- [ ] **Step 5: Install dependencies**

```bash
pnpm install
```

Expected: resolves without errors, `apps/web/node_modules` created with Next.js and React.

- [ ] **Step 6: Verify Next.js is found**

```bash
cd apps/web && pnpm exec next --version
```

Expected: prints a Next.js version string.

- [ ] **Step 7: Commit**

```bash
git add pnpm-workspace.yaml apps/web/package.json apps/web/tsconfig.json apps/web/next.config.ts pnpm-lock.yaml
git commit -m "feat(web): scaffold apps/web Next.js workspace package"
```

---

## Task 6: Tailwind + globals.css

**Files:**
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.mjs`
- Create: `apps/web/app/globals.css`

- [ ] **Step 1: Create tailwind.config.ts**

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-inter)'],
        serif: ['var(--font-dm-serif-display)'],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Create postcss.config.mjs**

```javascript
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
```

- [ ] **Step 3: Create app/globals.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply bg-zinc-950 text-zinc-50;
  }

  /* Amber focus rings */
  :focus-visible {
    @apply outline-2 outline-amber-400 outline-offset-2;
  }

  /* Native details/summary styling */
  details > summary {
    @apply cursor-pointer list-none;
  }
  details > summary::-webkit-details-marker {
    display: none;
  }
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/tailwind.config.ts apps/web/postcss.config.mjs apps/web/app/globals.css
git commit -m "feat(web): add Tailwind CSS config and base styles"
```

---

## Task 7: Fonts, root layout, TopNav

**Files:**
- Create: `apps/web/lib/fonts.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/components/nav/TopNav.tsx`

- [ ] **Step 1: Create lib/fonts.ts**

```typescript
import { Inter, DM_Serif_Display } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const dmSerifDisplay = DM_Serif_Display({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-dm-serif-display',
  display: 'swap',
});
```

- [ ] **Step 2: Create components/nav/TopNav.tsx**

```tsx
import Link from 'next/link';

const links = [
  { href: '/films', label: 'Films' },
  { href: '/crew', label: 'Crew' },
  { href: '/gear', label: 'Gear' },
  { href: '/queries/alexa65-sphero', label: 'Queries' },
] as const;

export function TopNav() {
  return (
    <nav className="border-b border-zinc-800 bg-zinc-950">
      <div className="mx-auto flex max-w-7xl items-center gap-8 px-6 py-4">
        <Link href="/" className="font-serif text-lg text-zinc-50 hover:text-amber-400">
          Studio Pro
        </Link>
        <ul className="flex gap-6">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-sm text-zinc-400 hover:text-zinc-50 transition-colors"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
```

- [ ] **Step 3: Create app/layout.tsx**

```tsx
import type { Metadata } from 'next';
import './globals.css';
import { inter, dmSerifDisplay } from '@/lib/fonts';
import { TopNav } from '@/components/nav/TopNav';

export const metadata: Metadata = {
  title: {
    template: '%s | Studio Pro',
    default: 'Studio Pro — Cinematic Technical Reference',
  },
  description: 'Behind-the-scenes technical metadata for working film professionals.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSerifDisplay.variable}`}>
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-50 antialiased">
        <TopNav />
        <main className="mx-auto max-w-7xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Create a placeholder homepage to allow next dev to start**

```tsx
// apps/web/app/page.tsx (temporary — replaced in Task 24)
export default function Home() {
  return <h1 className="font-serif text-3xl">Studio Pro</h1>;
}
```

- [ ] **Step 5: Start dev server and verify**

```bash
cd apps/web && pnpm dev
```

Open `http://localhost:3000`. Expected: dark page with "Studio Pro" in the nav and heading. No console errors.

Kill the dev server (`Ctrl+C`).

- [ ] **Step 6: Commit**

```bash
git add apps/web/lib/fonts.ts apps/web/app/layout.tsx apps/web/components/nav/TopNav.tsx apps/web/app/page.tsx
git commit -m "feat(web): add fonts, root layout, and TopNav"
```

---

## Task 8: UI primitives — DataTable and Badge

**Files:**
- Create: `apps/web/components/ui/DataTable.tsx`
- Create: `apps/web/components/ui/Badge.tsx`

- [ ] **Step 1: Create DataTable.tsx**

```tsx
// components/ui/DataTable.tsx
interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T extends Record<string, unknown>> {
  columns: Column<T>[];
  rows: T[];
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  emptyMessage = 'No data.',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-3 py-2 text-left font-medium text-zinc-400"
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}
            >
              {columns.map((col) => (
                <td
                  key={String(col.key)}
                  className={`px-3 py-2 text-zinc-200 ${col.className ?? ''}`}
                >
                  {col.render
                    ? col.render(row)
                    : String(row[col.key as keyof T] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create Badge.tsx**

```tsx
// components/ui/Badge.tsx

type BadgeVariant =
  | 'confidence-primary'
  | 'confidence-secondary'
  | 'confidence-manufacturer'
  | 'confidence-speculative'
  | 'category'
  | 'type'
  | 'status'
  | 'default';

const variantClasses: Record<BadgeVariant, string> = {
  'confidence-primary':
    'bg-zinc-50 text-zinc-900 border border-zinc-300',
  'confidence-secondary':
    'bg-transparent text-zinc-400 border border-zinc-600',
  'confidence-manufacturer':
    'bg-amber-400/10 text-amber-400 border border-amber-400/30',
  'confidence-speculative':
    'bg-transparent text-zinc-500 border border-dashed border-zinc-600',
  category:
    'bg-zinc-800 text-zinc-300 border border-zinc-700',
  type:
    'bg-zinc-800 text-zinc-300 border border-zinc-700',
  status:
    'bg-zinc-800 text-zinc-300 border border-zinc-700',
  default:
    'bg-zinc-800 text-zinc-300 border border-zinc-700',
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: string;
}

export function Badge({ label, variant = 'default', icon }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium ${variantClasses[variant]}`}
    >
      {icon && <span aria-hidden="true">{icon}</span>}
      {label}
    </span>
  );
}

export function confidenceBadgeVariant(confidence: string): BadgeVariant {
  switch (confidence) {
    case 'primary': return 'confidence-primary';
    case 'secondary': return 'confidence-secondary';
    case 'manufacturer_marketing': return 'confidence-manufacturer';
    case 'speculative': return 'confidence-speculative';
    default: return 'default';
  }
}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/ui/DataTable.tsx apps/web/components/ui/Badge.tsx
git commit -m "feat(web): add DataTable and Badge UI primitives"
```

---

## Task 9: UI primitives — SectionHeader and SourceCitation

**Files:**
- Create: `apps/web/components/ui/SectionHeader.tsx`
- Create: `apps/web/components/ui/SourceCitation.tsx`

- [ ] **Step 1: Create SectionHeader.tsx**

```tsx
// components/ui/SectionHeader.tsx
interface SectionHeaderProps {
  label: string;
  heading: string;
}

export function SectionHeader({ label, heading }: SectionHeaderProps) {
  return (
    <div className="mb-4 border-l-2 border-amber-400 pl-3">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">{label}</p>
      <h2 className="text-lg font-semibold text-zinc-50">{heading}</h2>
    </div>
  );
}
```

- [ ] **Step 2: Create SourceCitation.tsx**

The component accepts an array of source rows for one entity and renders a single `<details>` disclosure widget.

```tsx
// components/ui/SourceCitation.tsx
import { Badge, confidenceBadgeVariant } from './Badge';

interface Source {
  title: string;
  publication: string | null;
  author: string | null;
  published_at: string | null;
  url: string | null;
  archive_url: string | null;
  confidence: string;
  claim_quote: string | null;
}

interface SourceCitationProps {
  sources: Source[];
}

function highestConfidence(sources: Source[]): string {
  const order = ['primary', 'secondary', 'manufacturer_marketing', 'speculative'];
  for (const conf of order) {
    if (sources.some((s) => s.confidence === conf)) return conf;
  }
  return sources[0]?.confidence ?? 'secondary';
}

export function SourceCitation({ sources }: SourceCitationProps) {
  if (sources.length === 0) return null;

  const topConf = highestConfidence(sources);
  const label = `${sources.length} source${sources.length > 1 ? 's' : ''}`;

  return (
    <details className="mt-1">
      <summary className="inline-flex cursor-pointer items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300">
        {label}
        <Badge label={topConf.replace('_', ' ')} variant={confidenceBadgeVariant(topConf)} />
      </summary>
      <ul className="mt-2 space-y-3 pl-2">
        {sources.map((s, i) => (
          <li key={i} className="border-l border-zinc-800 pl-3 text-xs text-zinc-400">
            <p className="font-medium text-zinc-300">{s.title}</p>
            {s.publication && <p>{s.publication}{s.author ? ` — ${s.author}` : ''}</p>}
            {s.published_at && <p>Published {s.published_at}</p>}
            {(s.url || s.archive_url) && (
              <a
                href={s.url ?? s.archive_url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline"
              >
                {s.url ? 'Source' : 'Archive'}
              </a>
            )}
            {s.claim_quote && (
              <blockquote className="mt-1 border-l border-zinc-700 pl-2 italic text-zinc-500">
                "{s.claim_quote}"
              </blockquote>
            )}
            <Badge
              label={s.confidence.replace('_', ' ')}
              variant={confidenceBadgeVariant(s.confidence)}
            />
            {s.confidence === 'manufacturer_marketing' && (
              <span className="ml-1 text-amber-400" aria-label="Manufacturer claim">⚠</span>
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/ui/SectionHeader.tsx apps/web/components/ui/SourceCitation.tsx
git commit -m "feat(web): add SectionHeader and SourceCitation UI primitives"
```

---

## Task 10: FormatBadge and ProductionCard

**Files:**
- Create: `apps/web/components/productions/FormatBadge.tsx`
- Create: `apps/web/components/productions/ProductionCard.tsx`

- [ ] **Step 1: Create FormatBadge.tsx**

```tsx
// components/productions/FormatBadge.tsx
interface Format {
  aspect_ratio: string;
  acquisition_format: string;
  label?: string | null;
}

export function FormatBadge({ format }: { format: Format }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
      <span className="font-medium text-zinc-100">{format.aspect_ratio}</span>
      <span className="text-zinc-500">·</span>
      <span>{format.acquisition_format}</span>
      {format.label && (
        <>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-500">{format.label}</span>
        </>
      )}
    </span>
  );
}
```

- [ ] **Step 2: Create ProductionCard.tsx**

```tsx
// components/productions/ProductionCard.tsx
import Link from 'next/link';
import { FormatBadge } from './FormatBadge';

interface ProductionCardProps {
  slug: string;
  title: string;
  type: string;
  releaseYear: number | null;
  synopsis: string | null;
  primaryAspectRatio: string | null;
  primaryAcquisitionFormat: string | null;
}

export function ProductionCard({
  slug, title, type, releaseYear, synopsis,
  primaryAspectRatio, primaryAcquisitionFormat,
}: ProductionCardProps) {
  return (
    <Link
      href={`/films/${slug}`}
      className="block rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-serif text-lg leading-tight text-zinc-50">{title}</h2>
        {releaseYear && (
          <span className="shrink-0 text-sm tabular-nums text-zinc-400">{releaseYear}</span>
        )}
      </div>
      <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">{type}</p>
      {synopsis && (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{synopsis}</p>
      )}
      {primaryAspectRatio && primaryAcquisitionFormat && (
        <div className="mt-3">
          <FormatBadge format={{
            aspect_ratio: primaryAspectRatio,
            acquisition_format: primaryAcquisitionFormat,
          }} />
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/productions/FormatBadge.tsx apps/web/components/productions/ProductionCard.tsx
git commit -m "feat(web): add FormatBadge and ProductionCard components"
```

---

## Task 11: /films index page

**Files:**
- Create: `apps/web/app/films/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/films/page.tsx
import type { Metadata } from 'next';
import { db } from '@bts/db';
import { listProductions } from '@bts/db/src/queries/productions';
import { ProductionCard } from '@/components/productions/ProductionCard';

export const metadata: Metadata = { title: 'Films' };

export default async function FilmsPage() {
  const rows = await listProductions(db);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Films</h1>
        <p className="mt-1 text-sm text-zinc-400">{rows.length} productions</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <ProductionCard
            key={row.slug}
            slug={row.slug}
            title={row.title}
            type={row.type}
            releaseYear={row.release_year}
            synopsis={row.synopsis}
            primaryAspectRatio={row.primary_aspect_ratio}
            primaryAcquisitionFormat={row.primary_acquisition_format}
          />
        ))}
      </div>
    </>
  );
}
```

> **Import note:** The query import uses the deep path `@bts/db/src/queries/productions` because the `@bts/db` main export only re-exports `db`, `sql`, and schema. Since `transpilePackages` is configured, Next.js can resolve TypeScript deep imports within the package.

- [ ] **Step 2: Start dev server and verify the films list renders**

```bash
cd apps/web && pnpm dev
```

Open `http://localhost:3000/films`. Expected: grid of production cards. Kill server.

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/films/page.tsx
git commit -m "feat(web): add /films index page"
```

---

## Task 12: SceneList and ProductionDetail components

**Files:**
- Create: `apps/web/components/productions/SceneList.tsx`
- Create: `apps/web/components/productions/ProductionDetail.tsx`

- [ ] **Step 1: Create SceneList.tsx**

SceneList receives the flat scene+equipment rows from `getProductionWithFullDetail` and groups them by scene.

```tsx
// components/productions/SceneList.tsx
import Link from 'next/link';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';

interface SceneRow {
  scene_id: number; scene_slug: string; scene_title: string;
  scene_synopsis: string | null; time_of_day: string | null;
  interior_exterior: string | null; location: string | null;
  series_slug: string; series_name: string; series_category: string;
  manufacturer_slug: string;
  item_slug: string | null; item_name: string | null;
  setup_label: string | null; usage_role: string | null;
}

interface SceneListProps {
  rows: SceneRow[];
}

interface GearRow {
  series_slug: string; series_name: string; series_category: string;
  manufacturer_slug: string;
  item_slug: string | null; item_name: string | null;
  setup_label: string | null; usage_role: string | null;
}

interface Scene {
  scene_id: number; scene_slug: string; scene_title: string;
  scene_synopsis: string | null; time_of_day: string | null;
  interior_exterior: string | null; location: string | null;
  gear: GearRow[];
}

function groupScenes(rows: SceneRow[]): Scene[] {
  const map = new Map<number, Scene>();
  for (const row of rows) {
    if (!map.has(row.scene_id)) {
      map.set(row.scene_id, {
        scene_id: row.scene_id, scene_slug: row.scene_slug,
        scene_title: row.scene_title, scene_synopsis: row.scene_synopsis,
        time_of_day: row.time_of_day, interior_exterior: row.interior_exterior,
        location: row.location, gear: [],
      });
    }
    map.get(row.scene_id)!.gear.push({
      series_slug: row.series_slug, series_name: row.series_name,
      series_category: row.series_category, manufacturer_slug: row.manufacturer_slug,
      item_slug: row.item_slug, item_name: row.item_name,
      setup_label: row.setup_label, usage_role: row.usage_role,
    });
  }
  return Array.from(map.values());
}

export function SceneList({ rows }: SceneListProps) {
  const scenes = groupScenes(rows);

  if (scenes.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <SectionHeader label="Production" heading="Scenes & Equipment" />
      <div className="space-y-4">
        {scenes.map((scene) => (
          <div key={scene.scene_id} className="rounded border border-zinc-800 bg-zinc-900">
            <div className="border-b border-zinc-800 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-medium text-zinc-100">{scene.scene_title}</h3>
                {scene.interior_exterior && (
                  <Badge label={scene.interior_exterior.toUpperCase()} variant="category" />
                )}
                {scene.time_of_day && (
                  <Badge label={scene.time_of_day.replace('_', ' ')} variant="category" />
                )}
              </div>
              {scene.location && (
                <p className="mt-0.5 text-xs text-zinc-500">{scene.location}</p>
              )}
            </div>
            <div className="divide-y divide-zinc-800/50">
              {scene.gear.map((g, i) => (
                <div key={i} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2 text-sm">
                  <Badge label={g.series_category} variant="category" />
                  {g.setup_label && (
                    <span className="text-xs text-zinc-500">{g.setup_label}</span>
                  )}
                  <Link
                    href={`/gear/${g.manufacturer_slug}/${g.series_slug}`}
                    className="text-zinc-200 hover:text-amber-400"
                  >
                    {g.series_name}
                  </Link>
                  {g.item_slug && g.item_name && (
                    <>
                      <span className="text-zinc-600">›</span>
                      <Link
                        href={`/gear/${g.manufacturer_slug}/${g.series_slug}/${g.item_slug}`}
                        className="text-zinc-400 hover:text-amber-400"
                      >
                        {g.item_name}
                      </Link>
                    </>
                  )}
                  {g.usage_role && (
                    <span className="text-xs text-zinc-600">{g.usage_role}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create ProductionDetail.tsx**

```tsx
// components/productions/ProductionDetail.tsx
import Link from 'next/link';
import { FormatBadge } from './FormatBadge';
import { SceneList } from './SceneList';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SourceCitation } from '@/components/ui/SourceCitation';

type DetailData = NonNullable<Awaited<ReturnType<
  typeof import('@bts/db/src/queries/productions').getProductionWithFullDetail
>>>;

export function ProductionDetail({ data }: { data: DetailData }) {
  const { production, formats, studios, crew, scenes, productionSources } = data;

  // Group crew by category
  const crewByCategory = crew.reduce<Record<string, typeof crew>>((acc, c) => {
    (acc[c.role_category] ??= []).push(c);
    return acc;
  }, {});

  return (
    <article>
      {/* Header */}
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          {production.type} · {production.release_year ?? 'TBD'}
        </p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{production.title}</h1>
        {production.original_title && (
          <p className="mt-1 text-sm text-zinc-500">{production.original_title}</p>
        )}
        {production.synopsis && (
          <p className="mt-3 max-w-2xl text-zinc-400">{production.synopsis}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {formats.map((f, i) => <FormatBadge key={i} format={f} />)}
        </div>
        {productionSources.length > 0 && (
          <div className="mt-3">
            <SourceCitation sources={productionSources} />
          </div>
        )}
      </header>

      {/* Studios */}
      {studios.length > 0 && (
        <div className="mb-6">
          <SectionHeader label="Production" heading="Studios" />
          <ul className="space-y-1">
            {studios.map((s, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <span className="text-zinc-200">{s.name}</span>
                <span className="text-xs text-zinc-500">{s.role.replace('_', ' ')}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Crew */}
      {Object.entries(crewByCategory).map(([category, members]) => (
        <div key={category} className="mb-6">
          <SectionHeader label="Department" heading={category.replace('_', ' ')} />
          <ul className="space-y-1">
            {members.map((m, i) => (
              <li key={i} className="flex items-center gap-2 text-sm">
                <Link
                  href={`/crew/${m.person_slug}`}
                  className="text-zinc-200 hover:text-amber-400"
                >
                  {m.credit_name_override ?? m.display_name}
                </Link>
                <span className="text-zinc-500">{m.role_name}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}

      {/* Scenes + Equipment */}
      <SceneList rows={scenes} />
    </article>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors. If TypeScript complains about the `typeof import(...)` return type, replace with an explicit interface matching the shape returned by `getProductionWithFullDetail`.

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/productions/SceneList.tsx apps/web/components/productions/ProductionDetail.tsx
git commit -m "feat(web): add SceneList and ProductionDetail components"
```

---

## Task 13: /films/[slug] production detail page

**Files:**
- Create: `apps/web/app/films/[slug]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/films/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@bts/db';
import { listProductions, getProductionWithFullDetail } from '@bts/db/src/queries/productions';
import { ProductionDetail } from '@/components/productions/ProductionDetail';

interface Props {
  params: { slug: string };
}

export async function generateStaticParams() {
  const rows = await listProductions(db);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) return {};
  return { title: data.production.title };
}

export default async function FilmDetailPage({ params }: Props) {
  const data = await getProductionWithFullDetail(db, params.slug);
  if (!data) notFound();
  return <ProductionDetail data={data} />;
}
```

- [ ] **Step 2: Test in dev**

```bash
cd apps/web && pnpm dev
```

Open `http://localhost:3000/films/dune-part-two` (or any seeded slug). Expected: full production detail page with crew, formats, and scenes. Kill server.

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/films/[slug]/page.tsx
git commit -m "feat(web): add /films/[slug] production detail page"
```

---

## Task 14: PersonCard and FilmographyTable

**Files:**
- Create: `apps/web/components/people/PersonCard.tsx`
- Create: `apps/web/components/people/FilmographyTable.tsx`

- [ ] **Step 1: Create PersonCard.tsx**

```tsx
// components/people/PersonCard.tsx
import Link from 'next/link';

interface PersonCardProps {
  slug: string;
  displayName: string;
  country: string | null;
  memberSocieties: string[] | null;
}

export function PersonCard({ slug, displayName, country, memberSocieties }: PersonCardProps) {
  return (
    <Link
      href={`/crew/${slug}`}
      className="block rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
    >
      <h2 className="font-serif text-lg text-zinc-50">{displayName}</h2>
      <div className="mt-1 flex flex-wrap gap-1 text-xs text-zinc-500">
        {country && <span>{country}</span>}
        {memberSocieties?.map((s) => (
          <span key={s} className="rounded border border-zinc-700 px-1">{s}</span>
        ))}
      </div>
    </Link>
  );
}
```

- [ ] **Step 2: Create FilmographyTable.tsx**

```tsx
// components/people/FilmographyTable.tsx
import Link from 'next/link';
import { FormatBadge } from '@/components/productions/FormatBadge';

interface FilmographyRow {
  production_slug: string; production_title: string;
  release_year: number | null; production_type: string;
  role_name: string; role_category: string; credit_name_override: string | null;
  primary_aspect_ratio: string | null; primary_acquisition_format: string | null;
}

export function FilmographyTable({ rows }: { rows: FilmographyRow[] }) {
  if (rows.length === 0) return <p className="text-sm text-zinc-500">No credits found.</p>;

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Production</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Year</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Role</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Format</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
              <td className="px-3 py-2">
                <Link href={`/films/${row.production_slug}`} className="text-zinc-200 hover:text-amber-400">
                  {row.production_title}
                </Link>
              </td>
              <td className="px-3 py-2 tabular-nums text-zinc-400">
                {row.release_year ?? '—'}
              </td>
              <td className="px-3 py-2 text-zinc-400">
                {row.credit_name_override
                  ? `${row.role_name} (as ${row.credit_name_override})`
                  : row.role_name}
              </td>
              <td className="px-3 py-2">
                {row.primary_aspect_ratio && row.primary_acquisition_format
                  ? <FormatBadge format={{ aspect_ratio: row.primary_aspect_ratio, acquisition_format: row.primary_acquisition_format }} />
                  : <span className="text-zinc-600">—</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/people/PersonCard.tsx apps/web/components/people/FilmographyTable.tsx
git commit -m "feat(web): add PersonCard and FilmographyTable components"
```

---

## Task 15: /crew index page

**Files:**
- Create: `apps/web/app/crew/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/crew/page.tsx
import type { Metadata } from 'next';
import { db } from '@bts/db';
import { listPeople } from '@bts/db/src/queries/people';
import { PersonCard } from '@/components/people/PersonCard';

export const metadata: Metadata = { title: 'Crew' };

export default async function CrewPage() {
  const rows = await listPeople(db);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Crew</h1>
        <p className="mt-1 text-sm text-zinc-400">{rows.length} people</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <PersonCard
            key={row.slug}
            slug={row.slug}
            displayName={row.display_name}
            country={row.country}
            memberSocieties={row.member_societies}
          />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify in dev then typecheck**

```bash
cd apps/web && pnpm dev
```

Open `http://localhost:3000/crew`. Kill server.

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/crew/page.tsx
git commit -m "feat(web): add /crew index page"
```

---

## Task 16: /crew/[slug] person detail page

**Files:**
- Create: `apps/web/app/crew/[slug]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/crew/[slug]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db } from '@bts/db';
import { listPeople, getPersonBySlug, getPersonFilmography } from '@bts/db/src/queries/people';
import { FilmographyTable } from '@/components/people/FilmographyTable';
import { SectionHeader } from '@/components/ui/SectionHeader';

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  const rows = await listPeople(db);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = await getPersonBySlug(db, params.slug);
  return person ? { title: person.display_name } : {};
}

export default async function CrewDetailPage({ params }: Props) {
  const [person, filmography] = await Promise.all([
    getPersonBySlug(db, params.slug),
    getPersonFilmography(db, params.slug),
  ]);
  if (!person) notFound();

  return (
    <article>
      <header className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Crew</p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{person.display_name}</h1>
        <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-400">
          {person.country && <span>{person.country}</span>}
          {person.member_societies?.map((s) => (
            <span key={s} className="rounded border border-zinc-700 px-1 text-xs">{s}</span>
          ))}
        </div>
        {person.bio && (
          <p className="mt-3 max-w-2xl text-zinc-400">{person.bio}</p>
        )}
        {person.imdb_id && (
          <a
            href={`https://www.imdb.com/name/${person.imdb_id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-amber-400 hover:underline"
          >
            IMDb ↗
          </a>
        )}
      </header>

      <SectionHeader label="Career" heading="Filmography" />
      <FilmographyTable rows={filmography} />
    </article>
  );
}
```

- [ ] **Step 2: Verify in dev then typecheck**

```bash
cd apps/web && pnpm dev
```

Open `http://localhost:3000/crew/greig-fraser`. Kill server.

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/crew/[slug]/page.tsx
git commit -m "feat(web): add /crew/[slug] person detail page"
```

---

## Task 17: ManufacturerCard and /gear index page

**Files:**
- Create: `apps/web/components/equipment/ManufacturerCard.tsx`
- Create: `apps/web/app/gear/page.tsx`

- [ ] **Step 1: Create ManufacturerCard.tsx**

```tsx
// components/equipment/ManufacturerCard.tsx
import Link from 'next/link';

interface ManufacturerCardProps {
  slug: string;
  name: string;
  kind: string;
  country: string | null;
  description: string | null;
  seriesCount: number;
}

export function ManufacturerCard({ slug, name, kind, country, description, seriesCount }: ManufacturerCardProps) {
  return (
    <Link
      href={`/gear/${slug}`}
      className="block rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between">
        <h2 className="font-serif text-lg text-zinc-50">{name}</h2>
        <span className="text-xs text-zinc-500">{seriesCount} series</span>
      </div>
      <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">
        {kind.replace('_', ' ')}{country ? ` · ${country}` : ''}
      </p>
      {description && (
        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">{description}</p>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Create app/gear/page.tsx**

```tsx
// app/gear/page.tsx
import type { Metadata } from 'next';
import { db } from '@bts/db';
import { listManufacturers } from '@bts/db/src/queries/equipment';
import { ManufacturerCard } from '@/components/equipment/ManufacturerCard';

export const metadata: Metadata = { title: 'Gear' };

export default async function GearPage() {
  const rows = await listManufacturers(db);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">Gear</h1>
        <p className="mt-1 text-sm text-zinc-400">{rows.length} manufacturers</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <ManufacturerCard
            key={row.slug}
            slug={row.slug}
            name={row.name}
            kind={row.kind}
            country={row.country}
            description={row.description}
            seriesCount={row.series_count}
          />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/components/equipment/ManufacturerCard.tsx apps/web/app/gear/page.tsx
git commit -m "feat(web): add ManufacturerCard and /gear index page"
```

---

## Task 18: Gear breadcrumb layout and /gear/[manufacturer] page

**Files:**
- Create: `apps/web/app/gear/layout.tsx`
- Create: `apps/web/app/gear/[manufacturer]/page.tsx`

- [ ] **Step 1: Create app/gear/layout.tsx**

The breadcrumb bar is a server layout — it receives the URL segments via `params` but layouts don't get `params` directly. We'll render it as a simple structural wrapper; the individual pages render their own breadcrumbs.

```tsx
// app/gear/layout.tsx
export default function GearLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs text-zinc-500">
        {/* Breadcrumbs are rendered by each page via its heading hierarchy */}
      </div>
      {children}
    </div>
  );
}
```

> **Note:** Next.js App Router layouts don't receive `params` — only pages do. Breadcrumb navigation is handled by each page's header rather than the layout.

- [ ] **Step 2: Create app/gear/[manufacturer]/page.tsx**

```tsx
// app/gear/[manufacturer]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@bts/db';
import { listManufacturers, getManufacturerBySlug } from '@bts/db/src/queries/equipment';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';

interface Props { params: { manufacturer: string } }

export async function generateStaticParams() {
  const rows = await listManufacturers(db);
  return rows.map((r) => ({ manufacturer: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getManufacturerBySlug(db, params.manufacturer);
  return data ? { title: data.manufacturer.name } : {};
}

export default async function ManufacturerPage({ params }: Props) {
  const data = await getManufacturerBySlug(db, params.manufacturer);
  if (!data) notFound();
  const { manufacturer, series } = data;

  return (
    <article>
      <header className="mb-8">
        <p className="text-xs text-zinc-500">
          <Link href="/gear" className="hover:text-amber-400">Gear</Link>
          {' › '}
        </p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{manufacturer.name}</h1>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">
          {manufacturer.kind.replace('_', ' ')}{manufacturer.country ? ` · ${manufacturer.country}` : ''}
          {manufacturer.founded_year ? ` · Est. ${manufacturer.founded_year}` : ''}
        </p>
        {manufacturer.description && (
          <p className="mt-3 max-w-2xl text-zinc-400">{manufacturer.description}</p>
        )}
        {manufacturer.website && (
          <a
            href={manufacturer.website}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-block text-xs text-amber-400 hover:underline"
          >
            Website ↗
          </a>
        )}
      </header>

      <SectionHeader label="Products" heading="Series" />
      <div className="space-y-2">
        {series.map((s) => (
          <Link
            key={s.slug}
            href={`/gear/${params.manufacturer}/${s.slug}`}
            className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-600 transition-colors"
          >
            <div>
              <span className="text-zinc-100">{s.name}</span>
              {s.description && (
                <p className="mt-0.5 line-clamp-1 text-xs text-zinc-500">{s.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Badge label={s.category} variant="category" />
              <span className="text-zinc-500">{s.item_count} items</span>
            </div>
          </Link>
        ))}
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Typecheck and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/app/gear/layout.tsx apps/web/app/gear/[manufacturer]/page.tsx
git commit -m "feat(web): add gear breadcrumb layout and /gear/[manufacturer] page"
```

---

## Task 19: SpecsTable and /gear/[manufacturer]/[series] page

**Files:**
- Create: `apps/web/components/equipment/SpecsTable.tsx`
- Create: `apps/web/app/gear/[manufacturer]/[series]/page.tsx`

- [ ] **Step 1: Create SpecsTable.tsx**

Imports Zod schemas via the `./schema/specs` subpath export added in Task 1.

```tsx
// components/equipment/SpecsTable.tsx
import { validateSpecs } from '@bts/db/schema/specs';

interface SpecsTableProps {
  category: string;
  specs: unknown;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

export function SpecsTable({ category, specs }: SpecsTableProps) {
  let parsed: Record<string, unknown>;
  try {
    parsed = validateSpecs(category, specs) as Record<string, unknown>;
  } catch {
    parsed = (typeof specs === 'object' && specs !== null)
      ? specs as Record<string, unknown>
      : {};
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return null;

  const knownKeys = new Set(Object.keys(parsed));
  const rawEntries = typeof specs === 'object' && specs !== null
    ? Object.entries(specs as Record<string, unknown>)
    : [];
  const unknownEntries = rawEntries.filter(([k]) => !knownKeys.has(k));

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Spec</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value], i) => (
            <tr key={key} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
              <td className="px-3 py-2 text-zinc-400">{key.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2 text-zinc-200">{formatValue(value)}</td>
            </tr>
          ))}
          {unknownEntries.map(([key, value], i) => (
            <tr key={`unknown-${key}`} className={(entries.length + i) % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
              <td className="px-3 py-2 text-zinc-500">{key.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2 text-zinc-500">{formatValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create app/gear/[manufacturer]/[series]/page.tsx**

```tsx
// app/gear/[manufacturer]/[series]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@bts/db';
import {
  listManufacturers, listSeriesByManufacturer, getSeriesBySlug,
} from '@bts/db/src/queries/equipment';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';

interface Props { params: { manufacturer: string; series: string } }

export async function generateStaticParams() {
  const manufacturers = await listManufacturers(db);
  const params = await Promise.all(
    manufacturers.map(async (m) => {
      const series = await listSeriesByManufacturer(db, m.slug);
      return series.map((s) => ({ manufacturer: m.slug, series: s.slug }));
    })
  );
  return params.flat();
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getSeriesBySlug(db, params.series);
  return data ? { title: data.series.name } : {};
}

export default async function SeriesPage({ params }: Props) {
  const data = await getSeriesBySlug(db, params.series);
  if (!data) notFound();
  const { series, items, usedOn } = data;

  return (
    <article>
      <header className="mb-8">
        <p className="text-xs text-zinc-500">
          <Link href="/gear" className="hover:text-amber-400">Gear</Link>
          {' › '}
          <Link href={`/gear/${params.manufacturer}`} className="hover:text-amber-400">
            {series.manufacturer_name}
          </Link>
          {' › '}
        </p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{series.name}</h1>
        <div className="mt-2 flex items-center gap-2">
          <Badge label={series.category} variant="category" />
          {series.year_introduced && (
            <span className="text-xs text-zinc-500">Introduced {series.year_introduced}</span>
          )}
          {series.year_discontinued && (
            <span className="text-xs text-zinc-500">Discontinued {series.year_discontinued}</span>
          )}
        </div>
        {series.description && (
          <p className="mt-3 max-w-2xl text-zinc-400">{series.description}</p>
        )}
      </header>

      {/* Items */}
      <div className="mb-8">
        <SectionHeader label="Products" heading="Items" />
        <div className="space-y-2">
          {items.map((item) => (
            <Link
              key={item.slug}
              href={`/gear/${params.manufacturer}/${params.series}/${item.slug}`}
              className="flex items-center justify-between rounded border border-zinc-800 bg-zinc-900 px-4 py-3 hover:border-zinc-600 transition-colors"
            >
              <span className="text-zinc-100">{item.name}</span>
              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <Badge label={item.status} variant="status" />
                {item.year_introduced && <span>Introduced {item.year_introduced}</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Used on */}
      {usedOn.length > 0 && (
        <div>
          <SectionHeader label="Credits" heading="Used on" />
          <ul className="space-y-1">
            {usedOn.map((p) => (
              <li key={p.production_slug} className="flex items-center gap-3 text-sm">
                <Link href={`/films/${p.production_slug}`} className="text-zinc-200 hover:text-amber-400">
                  {p.production_title}
                </Link>
                {p.release_year && <span className="text-zinc-500">{p.release_year}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
cd apps/web && pnpm typecheck
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/components/equipment/SpecsTable.tsx apps/web/app/gear/[manufacturer]/[series]/page.tsx
git commit -m "feat(web): add SpecsTable and /gear/[manufacturer]/[series] page"
```

---

## Task 20: /gear/[manufacturer]/[series]/[item] page

**Files:**
- Create: `apps/web/app/gear/[manufacturer]/[series]/[item]/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/gear/[manufacturer]/[series]/[item]/page.tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db } from '@bts/db';
import {
  listManufacturers, listSeriesByManufacturer,
  listItemsBySeries, getItemBySlug,
} from '@bts/db/src/queries/equipment';
import { SpecsTable } from '@/components/equipment/SpecsTable';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';

interface Props { params: { manufacturer: string; series: string; item: string } }

export async function generateStaticParams() {
  const manufacturers = await listManufacturers(db);
  const params = await Promise.all(
    manufacturers.map(async (m) => {
      const series = await listSeriesByManufacturer(db, m.slug);
      return Promise.all(
        series.map(async (s) => {
          const items = await listItemsBySeries(db, s.slug);
          return items.map((i) => ({
            manufacturer: m.slug,
            series: s.slug,
            item: i.slug,
          }));
        })
      );
    })
  );
  return params.flat(2);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getItemBySlug(db, params.item);
  return data ? { title: data.item.name } : {};
}

export default async function ItemPage({ params }: Props) {
  const data = await getItemBySlug(db, params.item);
  if (!data) notFound();
  const { item, usedOn } = data;

  return (
    <article>
      <header className="mb-8">
        <p className="text-xs text-zinc-500">
          <Link href="/gear" className="hover:text-amber-400">Gear</Link>
          {' › '}
          <Link href={`/gear/${params.manufacturer}`} className="hover:text-amber-400">
            {item.manufacturer_name}
          </Link>
          {' › '}
          <Link href={`/gear/${params.manufacturer}/${params.series}`} className="hover:text-amber-400">
            {item.series_name}
          </Link>
          {' › '}
        </p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{item.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge label={item.series_category} variant="category" />
          <Badge label={item.status} variant="status" />
          {item.model_number && (
            <span className="text-xs text-zinc-500">Model: {item.model_number}</span>
          )}
          {item.year_introduced && (
            <span className="text-xs text-zinc-500">Introduced {item.year_introduced}</span>
          )}
          {item.year_discontinued && (
            <span className="text-xs text-zinc-500">Discontinued {item.year_discontinued}</span>
          )}
        </div>
      </header>

      {/* Specs */}
      <div className="mb-8">
        <SectionHeader label="Technical" heading="Specifications" />
        <SpecsTable category={item.series_category} specs={item.specs} />
      </div>

      {/* Used on */}
      {usedOn.length > 0 && (
        <div>
          <SectionHeader label="Credits" heading="Used on" />
          <div className="overflow-x-auto rounded border border-zinc-800">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900">
                  <th className="px-3 py-2 text-left font-medium text-zinc-400">Production</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-400">Year</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-400">Scene</th>
                  <th className="px-3 py-2 text-left font-medium text-zinc-400">Setup</th>
                </tr>
              </thead>
              <tbody>
                {usedOn.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
                    <td className="px-3 py-2">
                      <Link href={`/films/${row.production_slug}`} className="text-zinc-200 hover:text-amber-400">
                        {row.production_title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 tabular-nums text-zinc-400">{row.release_year ?? '—'}</td>
                    <td className="px-3 py-2 text-zinc-400">{row.scene_title}</td>
                    <td className="px-3 py-2 text-zinc-500">{row.setup_label ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </article>
  );
}
```

- [ ] **Step 2: Typecheck and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/app/gear/[manufacturer]/[series]/[item]/page.tsx
git commit -m "feat(web): add /gear/[manufacturer]/[series]/[item] item detail page"
```

---

## Task 21: KillerQueryTable and /queries/alexa65-sphero

**Files:**
- Create: `apps/web/components/queries/KillerQueryTable.tsx`
- Create: `apps/web/app/queries/alexa65-sphero/page.tsx`

- [ ] **Step 1: Create KillerQueryTable.tsx**

```tsx
// components/queries/KillerQueryTable.tsx
interface Column {
  key: string;
  header: string;
  render: (row: Record<string, unknown>) => React.ReactNode;
}

interface KillerQueryTableProps {
  columns: Column[];
  rows: Record<string, unknown>[];
  emptyMessage?: string;
}

export function KillerQueryTable({ columns, rows, emptyMessage = 'No results.' }: KillerQueryTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyMessage}</p>;
  }

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            {columns.map((col) => (
              <th key={col.key} className="px-3 py-2 text-left font-medium text-zinc-400">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-zinc-200">
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 2: Create queries/alexa65-sphero/page.tsx**

```tsx
// app/queries/alexa65-sphero/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@bts/db';
import { findFeaturesShotOnAlexa65WithSphero } from '@bts/db/src/queries/killer-queries';
import { KillerQueryTable } from '@/components/queries/KillerQueryTable';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const metadata: Metadata = { title: 'ALEXA 65 + Panavision Sphero' };

export default async function Alexa65SpheroPage() {
  const rows = await findFeaturesShotOnAlexa65WithSphero(db);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Killer Query</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">
          ALEXA 65 + Panavision Sphero Anamorphic
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Every theatrical feature shot on the ARRI ALEXA 65 with Panavision Sphero
          anamorphic lenses, sorted by Director of Photography.
        </p>
      </div>
      <SectionHeader label={`${rows.length} result${rows.length !== 1 ? 's' : ''}`} heading="" />
      <KillerQueryTable
        rows={rows as unknown as Record<string, unknown>[]}
        columns={[
          {
            key: 'title',
            header: 'Production',
            render: (row) => (
              <Link href={`/films/${row['slug'] as string}`} className="text-zinc-200 hover:text-amber-400">
                {row['title'] as string}
              </Link>
            ),
          },
          {
            key: 'release_year',
            header: 'Year',
            render: (row) => <span className="tabular-nums text-zinc-400">{String(row['release_year'] ?? '—')}</span>,
          },
          {
            key: 'dp_name',
            header: 'Director of Photography',
            render: (row) => (
              <Link href={`/crew/${row['dp_slug'] as string}`} className="text-zinc-200 hover:text-amber-400">
                {row['dp_name'] as string}
              </Link>
            ),
          },
        ]}
      />
    </>
  );
}
```

- [ ] **Step 3: Update killer-queries.ts Q1 to add slug columns**

The current `findFeaturesShotOnAlexa65WithSphero` returns `{ title, release_year, dp_name }` but the page needs `slug` and `dp_slug` for links. Update `packages/db/src/queries/killer-queries.ts`:

```typescript
// Change the return type annotation:
export async function findFeaturesShotOnAlexa65WithSphero(db: SeedDb = defaultDb) {
  return db.execute<{
    title: string;
    slug: string;          // ← add
    release_year: number | null;
    dp_name: string;
    dp_slug: string;       // ← add
  }>(sql`
    SELECT DISTINCT p.title, p.slug, p.release_year, ppl.display_name AS dp_name, ppl.slug AS dp_slug
    FROM productions p
    ...  // rest of query unchanged
```

Add `p.slug,` and `ppl.slug AS dp_slug` to the SELECT clause. Do not change the WHERE or ORDER BY clauses.

- [ ] **Step 4: Typecheck packages/db to confirm**

```bash
cd packages/db && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Typecheck and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/components/queries/KillerQueryTable.tsx apps/web/app/queries/alexa65-sphero/page.tsx packages/db/src/queries/killer-queries.ts
git commit -m "feat(web): add KillerQueryTable and /queries/alexa65-sphero page"
```

---

## Task 22: /queries/dune-part-two-lenses page

**Files:**
- Create: `apps/web/app/queries/dune-part-two-lenses/page.tsx`

- [ ] **Step 1: Verify the ARRI Rental manufacturer slug**

```bash
grep -i "arri.rental\|arri_rental" C:/dev/bts/packages/db/src/seed/data/manufacturers.ts
```

Note the exact `slug` value. If it is not `arri-rental`, update the `href` values in Step 2 to use the correct slug. The seed file is authoritative.

- [ ] **Step 2: Create the page**

```tsx
// app/queries/dune-part-two-lenses/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@bts/db';
import { findLensesByDpOnProduction } from '@bts/db/src/queries/killer-queries';
import { KillerQueryTable } from '@/components/queries/KillerQueryTable';

export const metadata: Metadata = { title: 'Greig Fraser lenses on Dune: Part Two' };

export default async function DunePartTwoLensesPage() {
  const rows = await findLensesByDpOnProduction(db, 'greig-fraser', 'dune-part-two');

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Killer Query</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">
          Greig Fraser — Lenses on <em>Dune: Part Two</em>
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Every lens series and item used by{' '}
          <Link href="/crew/greig-fraser" className="text-amber-400 hover:underline">Greig Fraser</Link>
          {' '}on{' '}
          <Link href="/films/dune-part-two" className="text-amber-400 hover:underline">Dune: Part Two</Link>
          {' '}(2024).
        </p>
      </div>
      <KillerQueryTable
        rows={rows as unknown as Record<string, unknown>[]}
        columns={[
          {
            key: 'series_name',
            header: 'Lens Series',
            render: (row) => (
              <Link
                href={`/gear/arri-rental/${row['series_slug'] as string}`}
                className="text-zinc-200 hover:text-amber-400"
              >
                {row['series_name'] as string}
              </Link>
            ),
          },
          {
            key: 'item_name',
            header: 'Item',
            render: (row) =>
              row['item_slug']
                ? (
                  <Link
                    href={`/gear/arri-rental/${row['series_slug'] as string}/${row['item_slug'] as string}`}
                    className="text-zinc-400 hover:text-amber-400"
                  >
                    {row['item_name'] as string}
                  </Link>
                )
                : <span className="text-zinc-600">—</span>,
          },
        ]}
      />
    </>
  );
}
```

> **Note on lens links:** The `manufacturer_slug` for ARRI Rental lenses is `arri-rental` in the seed data. Verify this matches the actual slug in `packages/db/src/seed/data/manufacturers.ts` before committing. If different, update the href accordingly, or update the query to return `manufacturer_slug` and use it dynamically.

- [ ] **Step 2: Typecheck and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/app/queries/dune-part-two-lenses/page.tsx
git commit -m "feat(web): add /queries/dune-part-two-lenses page"
```

---

## Task 23: /queries/magic-hour-2023 page

**Files:**
- Create: `apps/web/app/queries/magic-hour-2023/page.tsx`

- [ ] **Step 1: Create the page**

```tsx
// app/queries/magic-hour-2023/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@bts/db';
import { findMagicHourExteriorLightingByYear } from '@bts/db/src/queries/killer-queries';
import { KillerQueryTable } from '@/components/queries/KillerQueryTable';

export const metadata: Metadata = { title: 'Magic-Hour Exterior Lighting 2023' };

export default async function MagicHour2023Page() {
  const rows = await findMagicHourExteriorLightingByYear(db, 2023);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Killer Query</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">
          Magic-Hour Exterior Lighting — 2023 Features
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-400">
          Every magic-hour exterior scene in 2023 theatrical features, with the
          lighting fixtures used on each scene.
        </p>
      </div>
      <KillerQueryTable
        rows={rows as unknown as Record<string, unknown>[]}
        columns={[
          {
            key: 'title',
            header: 'Production',
            render: (row) => (
              <Link href={`/films/${row['slug'] as string}`} className="text-zinc-200 hover:text-amber-400">
                {row['title'] as string}
              </Link>
            ),
          },
          {
            key: 'scene_title',
            header: 'Scene',
            render: (row) => <span className="text-zinc-400">{row['scene_title'] as string}</span>,
          },
          {
            key: 'lighting_series',
            header: 'Lighting Series',
            render: (row) => <span className="text-zinc-200">{row['lighting_series'] as string}</span>,
          },
          {
            key: 'lighting_item',
            header: 'Item',
            render: (row) =>
              row['lighting_item']
                ? <span className="text-zinc-400">{row['lighting_item'] as string}</span>
                : <span className="text-zinc-600">—</span>,
          },
        ]}
      />
    </>
  );
}
```

- [ ] **Step 2: Update killer-queries.ts Q3 to add slug column**

The current `findMagicHourExteriorLightingByYear` returns `{ title, scene_title, lighting_series, lighting_item }` but the page needs `slug` for the production link. Update `packages/db/src/queries/killer-queries.ts`:

```typescript
// Change the return type annotation:
export async function findMagicHourExteriorLightingByYear(db: SeedDb, year: number) {
  return db.execute<{
    title: string;
    slug: string;          // ← add
    scene_title: string;
    lighting_series: string;
    lighting_item: string | null;
  }>(sql`
    SELECT p.title, p.slug, sc.title AS scene_title,   -- ← add p.slug here
           es.name AS lighting_series, ei.name AS lighting_item
    ...  // rest of query unchanged
```

Add `p.slug,` immediately after `p.title,` in the SELECT clause.

- [ ] **Step 3: Typecheck packages/db to confirm**

```bash
cd packages/db && pnpm typecheck
```

Expected: no errors.

- [ ] **Step 4: Typecheck and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/app/queries/magic-hour-2023/page.tsx
git commit -m "feat(web): add /queries/magic-hour-2023 page"
```

---

## Task 24: Homepage

**Files:**
- Modify: `apps/web/app/page.tsx` (replace placeholder from Task 7)

- [ ] **Step 1: Replace homepage**

```tsx
// app/page.tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import { db } from '@bts/db';
import { listProductions } from '@bts/db/src/queries/productions';
import { ProductionCard } from '@/components/productions/ProductionCard';

export const metadata: Metadata = {
  title: 'Studio Pro — Cinematic Technical Reference',
};

const queries = [
  {
    href: '/queries/alexa65-sphero',
    title: 'ALEXA 65 + Panavision Sphero',
    description: 'Every feature shot on this combination, by DP.',
  },
  {
    href: '/queries/dune-part-two-lenses',
    title: 'Greig Fraser on Dune: Part Two',
    description: 'Every lens used on the production.',
  },
  {
    href: '/queries/magic-hour-2023',
    title: 'Magic-Hour Lighting, 2023',
    description: 'Every exterior magic-hour scene, by fixture.',
  },
] as const;

export default async function HomePage() {
  const productions = await listProductions(db);
  const featured = productions.slice(0, 6);

  return (
    <>
      {/* Hero */}
      <div className="mb-12 border-b border-zinc-800 pb-8">
        <h1 className="font-serif text-5xl text-zinc-50">Studio Pro</h1>
        <p className="mt-3 max-w-xl text-zinc-400">
          Behind-the-scenes technical metadata for working film professionals.
          Camera packages, lens choices, lighting rigs — cited and searchable.
        </p>
        <div className="mt-4 flex gap-4">
          <Link href="/films" className="text-sm text-amber-400 hover:underline">Browse all films →</Link>
          <Link href="/gear" className="text-sm text-amber-400 hover:underline">Browse gear →</Link>
          <Link href="/crew" className="text-sm text-amber-400 hover:underline">Browse crew →</Link>
        </div>
      </div>

      {/* Featured productions */}
      <div className="mb-12">
        <div className="mb-4 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-zinc-50">Recent Additions</h2>
          <Link href="/films" className="text-xs text-zinc-500 hover:text-amber-400">View all</Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((row) => (
            <ProductionCard
              key={row.slug}
              slug={row.slug}
              title={row.title}
              type={row.type}
              releaseYear={row.release_year}
              synopsis={row.synopsis}
              primaryAspectRatio={row.primary_aspect_ratio}
              primaryAcquisitionFormat={row.primary_acquisition_format}
            />
          ))}
        </div>
      </div>

      {/* Killer queries */}
      <div>
        <h2 className="mb-4 font-serif text-xl text-zinc-50">Reference Queries</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          {queries.map((q) => (
            <Link
              key={q.href}
              href={q.href}
              className="rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-amber-400/30 transition-colors"
            >
              <h3 className="font-medium text-zinc-100">{q.title}</h3>
              <p className="mt-1 text-sm text-zinc-500">{q.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify in dev**

```bash
cd apps/web && pnpm dev
```

Open `http://localhost:3000`. Expected: hero section, 6 production cards, 3 query links. Kill server.

- [ ] **Step 3: Typecheck and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/app/page.tsx
git commit -m "feat(web): add homepage with featured productions and query links"
```

---

## Task 25: not-found.tsx and error.tsx

**Files:**
- Create: `apps/web/app/not-found.tsx`
- Create: `apps/web/app/error.tsx`

- [ ] **Step 1: Create not-found.tsx**

```tsx
// app/not-found.tsx
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Not Found' };

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="text-xs uppercase tracking-widest text-zinc-500">404</p>
      <h1 className="font-serif text-4xl text-zinc-50">Not Found</h1>
      <p className="text-zinc-400">This page does not exist in the archive.</p>
      <Link href="/films" className="text-sm text-amber-400 hover:underline">
        ← Back to Films
      </Link>
    </div>
  );
}
```

- [ ] **Step 2: Create error.tsx**

`error.tsx` must be a Client Component (Next.js requirement for error boundaries).

```tsx
// app/error.tsx
'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="text-xs uppercase tracking-widest text-zinc-500">Error</p>
      <h1 className="font-serif text-4xl text-zinc-50">Something went wrong</h1>
      <p className="text-zinc-400">
        {error.message ?? 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="text-sm text-amber-400 hover:underline"
        >
          Try again
        </button>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          Home
        </Link>
      </div>
    </div>
  );
}
```

> **Note:** `error.tsx` is the one intentional Client Component in this project. Next.js requires it to be a Client Component to access the `reset` function.

- [ ] **Step 3: Typecheck and commit**

```bash
cd apps/web && pnpm typecheck
git add apps/web/app/not-found.tsx apps/web/app/error.tsx
git commit -m "feat(web): add not-found and error pages"
```

---

## Task 26: Root scripts update and full build verification

**Files:**
- Modify: `package.json` (workspace root)

- [ ] **Step 1: Add web scripts to workspace root**

```json
{
  "name": "bts",
  "version": "0.0.0",
  "private": true,
  "packageManager": "pnpm@10.33.2",
  "scripts": {
    "db:test": "pnpm --filter @bts/db test",
    "db:migrate": "pnpm --filter @bts/db migrate",
    "db:seed": "pnpm --filter @bts/db seed",
    "db:studio": "pnpm --filter @bts/db studio",
    "web:dev": "pnpm --filter @bts/web dev",
    "web:build": "pnpm --filter @bts/web build",
    "web:typecheck": "pnpm --filter @bts/web typecheck",
    "typecheck": "pnpm --filter @bts/db typecheck && pnpm --filter @bts/web typecheck"
  }
}
```

- [ ] **Step 2: Ensure Docker Postgres is running and DB is seeded**

```bash
docker compose up -d
pnpm db:migrate
pnpm db:seed
```

Expected: migrations applied, seed data loaded, no errors.

- [ ] **Step 3: Run full typecheck**

```bash
pnpm typecheck
```

Expected: both `@bts/db` and `@bts/web` pass with no errors.

- [ ] **Step 4: Run the build**

```bash
pnpm web:build
```

Expected: Next.js generates static pages for all routes. Watch for:
- All `generateStaticParams` calls resolving without error
- No missing slug errors
- No TypeScript errors surfaced during build
- Final output: `Route (app)` table listing all 14 routes as `○ (Static)`

- [ ] **Step 5: Verify the build output**

After a successful build, start the production server briefly:

```bash
cd apps/web && pnpm start
```

Open `http://localhost:3000` and spot-check:
- Homepage renders with productions and query links
- `/films/dune-part-two` shows full production detail with crew and scenes
- `/gear/arri/arri-alexa-65-series` (or equivalent seeded slug) shows series with items
- `/queries/alexa65-sphero` shows a results table with *The Revenant*
- `/nonexistent-route` returns the 404 page

Kill server.

- [ ] **Step 6: Commit**

```bash
git add package.json
git commit -m "feat(web): add workspace-level web scripts and verify full static build"
```

---

## CI addendum

The complete CI sequence for sub-project 2 (appended to existing data-layer CI):

```
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm typecheck          ← checks both @bts/db and @bts/web
pnpm web:build          ← smoke tests all generateStaticParams + rendering
```

A clean `pnpm web:build` is the definitive signal that sub-project 2 is complete.
