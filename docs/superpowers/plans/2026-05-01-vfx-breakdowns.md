# VFX Breakdowns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add VFX houses as first-class browsable entities with per-production shot counts, vendor credits, and technique tagging, plus an ETL scraper pipeline sourcing data from The Art of VFX and Befores & Afters.

**Architecture:** Five new DB tables extend the existing Drizzle/Postgres schema. A new `packages/scraper` package runs Playwright scrapers that write raw JSON files, then a separate import step upserts into Postgres. A node-cron scheduler runs the pipeline weekly as a Docker Compose service. The web app gains `/vfx` and `/vfx/[slug]` routes plus a VFX section on film detail pages.

**Tech Stack:** Drizzle ORM + PostgreSQL (existing), Playwright, fuse.js, node-cron, Next.js App Router (existing), vitest (existing)

---

## File Map

**Create:**
- `packages/db/src/schema/vfx.ts` — 5 new tables
- `packages/db/src/queries/vfx.ts` — listVfxHouses, getVfxHouseWithFilmography, getProductionVfxData
- `packages/db/src/seed/data/vfx-techniques.ts` — seeded technique vocabulary
- `packages/scraper/package.json`
- `packages/scraper/tsconfig.json`
- `packages/scraper/src/scrapers/types.ts`
- `packages/scraper/src/scrapers/art-of-vfx.ts`
- `packages/scraper/src/scrapers/befores-and-afters.ts`
- `packages/scraper/src/import/transform.ts`
- `packages/scraper/src/import/upsert.ts`
- `packages/scraper/src/scheduler.ts`
- `packages/scraper/src/cli.ts`
- `apps/web/app/vfx/page.tsx`
- `apps/web/app/vfx/[slug]/page.tsx`
- `apps/web/components/vfx/VfxHouseCard.tsx`
- `apps/web/components/vfx/VfxFilmography.tsx`
- `apps/web/components/productions/VfxSection.tsx`

**Modify:**
- `packages/db/src/schema/enums.ts` — add 3 new enums
- `packages/db/src/schema/index.ts` — export vfx.ts
- `packages/db/src/seed/run.ts` — add vfx-techniques step
- `packages/db/src/index.ts` — export vfx queries
- `packages/db/src/tests/migrations.test.ts` — update table count 17 → 22
- `packages/db/src/tests/cascades.test.ts` — add VFX cascade tests
- `apps/web/components/productions/ProductionDetail.tsx` — add VfxSection
- `apps/web/app/films/[slug]/page.tsx` — pass vfx data
- `docker-compose.yml` — add scraper service
- `pnpm-workspace.yaml` — add scraper package (if packages/* glob not already there)

---

### Task 1: Add VFX enums to enums.ts

**Files:**
- Modify: `packages/db/src/schema/enums.ts`

- [ ] **Step 1: Open `packages/db/src/schema/enums.ts` and add the three new enums at the end of the file**

```typescript
export const vfxCreditRoleEnum = pgEnum('vfx_credit_role_enum', [
  'primary', 'additional', 'special_sequences', 'miniatures', 'previsualization',
]);

export const vfxTechniqueCategoryEnum = pgEnum('vfx_technique_category_enum', [
  'creature', 'environment', 'character', 'practical_enhancement',
  'simulation', 'compositing', 'other',
]);
```

Also update `sourceKindEnum` to add `'vfx_breakdown_article'`:

```typescript
// Change this existing line:
export const sourceKindEnum = pgEnum('source_kind_enum', [
  'magazine_article', 'press_release', 'epk_document', 'interview_transcript',
  'book', 'podcast', 'commentary_track', 'documentary',
  'manufacturer_product_page', 'social_media', 'personal_communication',
  'forum_post', 'wiki', 'other',
]);
// To:
export const sourceKindEnum = pgEnum('source_kind_enum', [
  'magazine_article', 'press_release', 'epk_document', 'interview_transcript',
  'book', 'podcast', 'commentary_track', 'documentary',
  'manufacturer_product_page', 'social_media', 'personal_communication',
  'forum_post', 'wiki', 'vfx_breakdown_article', 'other',
]);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
pnpm --filter @bts/db typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/db/src/schema/enums.ts
git commit -m "feat(db): add VFX enums to schema"
```

---

### Task 2: Create VFX schema tables

**Files:**
- Create: `packages/db/src/schema/vfx.ts`
- Modify: `packages/db/src/schema/index.ts`

- [ ] **Step 1: Create `packages/db/src/schema/vfx.ts`**

```typescript
import {
  pgTable, bigserial, bigint, smallserial, smallint,
  integer, text, timestamp, primaryKey, unique, index,
} from 'drizzle-orm/pg-core';
import {
  vfxCreditRoleEnum,
  vfxTechniqueCategoryEnum,
  sourceConfidenceEnum,
} from './enums.ts';
import { productions } from './productions.ts';
import { sources } from './sources.ts';

export const vfxHouses = pgTable('vfx_houses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  country: text('country'),
  foundedYear: integer('founded_year'),
  website: text('website'),
  wikidataId: text('wikidata_id').unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export const vfxCredits = pgTable('vfx_credits', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  vfxHouseId: bigint('vfx_house_id', { mode: 'number' })
    .notNull()
    .references(() => vfxHouses.id, { onDelete: 'restrict' }),
  shotCount: integer('shot_count'),
  role: vfxCreditRoleEnum('role').notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  productionHouseUnq: unique('vfx_credits_production_house_unq').on(t.productionId, t.vfxHouseId),
  productionIdx: index('vfx_credits_production_idx').on(t.productionId),
  houseIdx: index('vfx_credits_house_idx').on(t.vfxHouseId),
}));

export const vfxTechniques = pgTable('vfx_techniques', {
  id: smallserial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  category: vfxTechniqueCategoryEnum('category').notNull(),
});

export const productionVfxTechniques = pgTable('production_vfx_techniques', {
  productionId: bigint('production_id', { mode: 'number' })
    .notNull()
    .references(() => productions.id, { onDelete: 'cascade' }),
  techniqueId: smallint('technique_id')
    .notNull()
    .references(() => vfxTechniques.id, { onDelete: 'restrict' }),
}, (t) => ({
  pk: primaryKey({ columns: [t.productionId, t.techniqueId] }),
  productionIdx: index('production_vfx_techniques_production_idx').on(t.productionId),
}));

export const vfxHouseSources = pgTable('vfx_house_sources', {
  vfxHouseId: bigint('vfx_house_id', { mode: 'number' })
    .notNull()
    .references(() => vfxHouses.id, { onDelete: 'cascade' }),
  sourceId: bigint('source_id', { mode: 'number' })
    .notNull()
    .references(() => sources.id, { onDelete: 'restrict' }),
  confidence: sourceConfidenceEnum('confidence').notNull(),
  claimQuote: text('claim_quote'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  pk: primaryKey({ columns: [t.vfxHouseId, t.sourceId] }),
  sourceIdx: index('vfx_house_sources_source_idx').on(t.sourceId),
}));
```

- [ ] **Step 2: Add export to `packages/db/src/schema/index.ts`**

```typescript
export * from './vfx.ts';
```

Add this line after the existing exports.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter @bts/db typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/schema/vfx.ts packages/db/src/schema/index.ts
git commit -m "feat(db): add VFX schema tables"
```

---

### Task 3: Generate migration, apply it, update migration test

**Files:**
- Modify: `packages/db/src/tests/migrations.test.ts`

- [ ] **Step 1: Generate the migration**

```bash
pnpm --filter @bts/db generate
```

Expected: a new file appears in `packages/db/migrations/` (e.g. `0002_vfx_schema.sql`)

- [ ] **Step 2: Apply the migration**

Make sure the Docker postgres container is running first:
```bash
docker -c desktop-linux start bts-postgres
```

Then:
```bash
pnpm --filter @bts/db migrate
```

Expected: `All migrations applied successfully.`

- [ ] **Step 3: Update the table count in the migration test**

In `packages/db/src/tests/migrations.test.ts`, find:
```typescript
expect(tables.length).toBe(17);
```

Change to:
```typescript
expect(tables.length).toBe(22);
```

(17 existing + 5 new: vfx_houses, vfx_credits, vfx_techniques, production_vfx_techniques, vfx_house_sources)

- [ ] **Step 4: Run the migration tests**

```bash
pnpm --filter @bts/db test -- --reporter=verbose migrations
```

Expected: 2 passing tests

- [ ] **Step 5: Commit**

```bash
git add packages/db/migrations/ packages/db/src/tests/migrations.test.ts
git commit -m "feat(db): generate and apply VFX schema migration"
```

---

### Task 4: Add VFX cascade tests

**Files:**
- Modify: `packages/db/src/tests/cascades.test.ts`

- [ ] **Step 1: Add VFX imports at the top of `cascades.test.ts`**

After the existing imports, add:
```typescript
import {
  vfxHouses, vfxCredits, vfxTechniques,
  productionVfxTechniques, vfxHouseSources,
} from '../schema/index.ts';
```

- [ ] **Step 2: Add a new describe block at the bottom of the file**

```typescript
describe('cascade matrix — VFX tables', () => {
  it('production deletion CASCADEs to vfx_credits', async () => {
    const [p] = await db.insert(productions).values({ slug: 'casc-vfx-p-1', type: 'feature', title: 'T' }).returning();
    const [h] = await db.insert(vfxHouses).values({ slug: 'casc-vfx-h-1', name: 'TestHouse' }).returning();
    await db.insert(vfxCredits).values({ productionId: p.id, vfxHouseId: h.id, role: 'primary' });
    await db.delete(productions).where(eq(productions.id, p.id));
    const orphans = await db.select().from(vfxCredits).where(eq(vfxCredits.productionId, p.id));
    expect(orphans.length).toBe(0);
    await db.delete(vfxHouses).where(eq(vfxHouses.id, h.id));
  });

  it('production deletion CASCADEs to production_vfx_techniques', async () => {
    const [p] = await db.insert(productions).values({ slug: 'casc-vfx-p-2', type: 'feature', title: 'T' }).returning();
    const [t] = await db.insert(vfxTechniques).values({ slug: 'casc-vfx-t-2', name: 'Test', category: 'creature' }).returning();
    await db.insert(productionVfxTechniques).values({ productionId: p.id, techniqueId: t.id });
    await db.delete(productions).where(eq(productions.id, p.id));
    const orphans = await db.select().from(productionVfxTechniques).where(eq(productionVfxTechniques.productionId, p.id));
    expect(orphans.length).toBe(0);
    await db.delete(vfxTechniques).where(eq(vfxTechniques.id, t.id));
  });

  it('vfx_house deletion CASCADEs to vfx_house_sources', async () => {
    const [h] = await db.insert(vfxHouses).values({ slug: 'casc-vfx-h-3', name: 'H' }).returning();
    const [src] = await db.insert(sources).values({ slug: 'casc-vfx-src-3', kind: 'wiki', title: 'S' }).returning();
    await db.insert(vfxHouseSources).values({ vfxHouseId: h.id, sourceId: src.id, confidence: 'primary' });
    await db.delete(vfxHouses).where(eq(vfxHouses.id, h.id));
    const orphans = await db.select().from(vfxHouseSources).where(eq(vfxHouseSources.vfxHouseId, h.id));
    expect(orphans.length).toBe(0);
    await db.delete(sources).where(eq(sources.id, src.id));
  });

  it('vfx_house deletion is RESTRICTED when it has vfx_credits', async () => {
    const [p] = await db.insert(productions).values({ slug: 'casc-vfx-r-p-1', type: 'feature', title: 'T' }).returning();
    const [h] = await db.insert(vfxHouses).values({ slug: 'casc-vfx-r-h-1', name: 'H' }).returning();
    await db.insert(vfxCredits).values({ productionId: p.id, vfxHouseId: h.id, role: 'primary' });
    await expect(db.delete(vfxHouses).where(eq(vfxHouses.id, h.id))).rejects.toThrow(/foreign key/i);
    await db.delete(productions).where(eq(productions.id, p.id));
    await db.delete(vfxHouses).where(eq(vfxHouses.id, h.id));
  });
});
```

- [ ] **Step 3: Run the cascade tests**

```bash
pnpm --filter @bts/db test -- --reporter=verbose cascades
```

Expected: all tests pass including the 4 new VFX ones

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/tests/cascades.test.ts
git commit -m "test(db): add VFX cascade tests"
```

---

### Task 5: DB queries for VFX

**Files:**
- Create: `packages/db/src/queries/vfx.ts`
- Modify: `packages/db/src/queries/productions.ts` (extend getProductionWithFullDetail)
- Modify: `packages/db/src/index.ts`

- [ ] **Step 1: Create `packages/db/src/queries/vfx.ts`**

```typescript
import { db as defaultDb } from '../db.ts';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
type SeedDb = PostgresJsDatabase<Record<string, never>>;
import { sql } from 'drizzle-orm';

export async function listVfxHouses(db: SeedDb = defaultDb) {
  return db.execute<{
    slug: string;
    name: string;
    country: string | null;
    founded_year: number | null;
    production_count: number;
  }>(sql`
    SELECT vh.slug, vh.name, vh.country, vh.founded_year,
           COUNT(DISTINCT vc.production_id)::int AS production_count
    FROM vfx_houses vh
    LEFT JOIN vfx_credits vc ON vc.vfx_house_id = vh.id
    GROUP BY vh.id
    ORDER BY vh.name ASC
  `);
}

export async function getVfxHouseWithFilmography(db: SeedDb = defaultDb, slug: string) {
  const [house] = await db.execute<{
    id: number;
    slug: string;
    name: string;
    country: string | null;
    founded_year: number | null;
    website: string | null;
    total_productions: number;
    primary_credits: number;
    total_shots: number | null;
  }>(sql`
    SELECT
      vh.id, vh.slug, vh.name, vh.country, vh.founded_year, vh.website,
      COUNT(DISTINCT vc.production_id)::int AS total_productions,
      COUNT(DISTINCT CASE WHEN vc.role = 'primary' THEN vc.production_id END)::int AS primary_credits,
      SUM(vc.shot_count) AS total_shots
    FROM vfx_houses vh
    LEFT JOIN vfx_credits vc ON vc.vfx_house_id = vh.id
    WHERE vh.slug = ${slug}
    GROUP BY vh.id
  `);
  if (!house) return null;

  const [filmography, techniques] = await Promise.all([
    db.execute<{
      production_slug: string;
      production_title: string;
      release_year: number | null;
      role: string;
      shot_count: number | null;
    }>(sql`
      SELECT p.slug AS production_slug, p.title AS production_title,
             p.release_year, vc.role, vc.shot_count
      FROM vfx_credits vc
      JOIN productions p ON p.id = vc.production_id
      WHERE vc.vfx_house_id = ${house.id}
      ORDER BY p.release_year DESC NULLS LAST, p.title ASC
    `),

    db.execute<{ slug: string; name: string; category: string }>(sql`
      SELECT DISTINCT vt.slug, vt.name, vt.category
      FROM production_vfx_techniques pvt
      JOIN vfx_techniques vt ON vt.id = pvt.technique_id
      JOIN vfx_credits vc ON vc.production_id = pvt.production_id
      WHERE vc.vfx_house_id = ${house.id}
      ORDER BY vt.category, vt.name
    `),
  ]);

  return { house, filmography, techniques };
}

export async function getProductionVfxData(db: SeedDb = defaultDb, productionId: number) {
  const [credits, techniques] = await Promise.all([
    db.execute<{
      vfx_house_slug: string;
      vfx_house_name: string;
      role: string;
      shot_count: number | null;
      notes: string | null;
    }>(sql`
      SELECT vh.slug AS vfx_house_slug, vh.name AS vfx_house_name,
             vc.role, vc.shot_count, vc.notes
      FROM vfx_credits vc
      JOIN vfx_houses vh ON vh.id = vc.vfx_house_id
      WHERE vc.production_id = ${productionId}
      ORDER BY CASE vc.role
        WHEN 'primary' THEN 1
        WHEN 'special_sequences' THEN 2
        WHEN 'additional' THEN 3
        WHEN 'miniatures' THEN 4
        WHEN 'previsualization' THEN 5
      END, vh.name
    `),

    db.execute<{ slug: string; name: string; category: string }>(sql`
      SELECT vt.slug, vt.name, vt.category
      FROM production_vfx_techniques pvt
      JOIN vfx_techniques vt ON vt.id = pvt.technique_id
      WHERE pvt.production_id = ${productionId}
      ORDER BY vt.category, vt.name
    `),
  ]);

  return { credits, techniques };
}
```

- [ ] **Step 2: Export the new queries from `packages/db/src/index.ts`**

Add this line:
```typescript
export * from './queries/vfx.ts';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
pnpm --filter @bts/db typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/queries/vfx.ts packages/db/src/index.ts
git commit -m "feat(db): add VFX query functions"
```

---

### Task 6: VFX techniques seed data

**Files:**
- Create: `packages/db/src/seed/data/vfx-techniques.ts`
- Modify: `packages/db/src/seed/run.ts`

- [ ] **Step 1: Create `packages/db/src/seed/data/vfx-techniques.ts`**

```typescript
import { vfxTechniques } from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

type TechniqueSeed = {
  slug: string;
  name: string;
  category:
    | 'creature' | 'environment' | 'character' | 'practical_enhancement'
    | 'simulation' | 'compositing' | 'other';
};

const techniquesData: TechniqueSeed[] = [
  // Creature
  { slug: 'cg-creature', name: 'CG Creature', category: 'creature' },
  { slug: 'creature-animation', name: 'Creature Animation', category: 'creature' },
  { slug: 'fur-simulation', name: 'Fur Simulation', category: 'creature' },

  // Environment
  { slug: 'cg-environment', name: 'CG Environment', category: 'environment' },
  { slug: 'environment-replacement', name: 'Environment Replacement', category: 'environment' },
  { slug: 'matte-painting', name: 'Matte Painting', category: 'environment' },
  { slug: 'virtual-production', name: 'Virtual Production', category: 'environment' },

  // Character
  { slug: 'de-aging', name: 'De-aging', category: 'character' },
  { slug: 'digital-double', name: 'Digital Double', category: 'character' },
  { slug: 'facial-capture', name: 'Facial Capture', category: 'character' },
  { slug: 'motion-capture', name: 'Motion Capture', category: 'character' },
  { slug: 'performance-capture', name: 'Performance Capture', category: 'character' },

  // Practical Enhancement
  { slug: 'wire-removal', name: 'Wire Removal', category: 'practical_enhancement' },
  { slug: 'crowd-replication', name: 'Crowd Replication', category: 'practical_enhancement' },
  { slug: 'set-extension', name: 'Set Extension', category: 'practical_enhancement' },

  // Simulation
  { slug: 'water-simulation', name: 'Water Simulation', category: 'simulation' },
  { slug: 'fire-simulation', name: 'Fire & Explosion Simulation', category: 'simulation' },
  { slug: 'cloth-simulation', name: 'Cloth Simulation', category: 'simulation' },
  { slug: 'destruction-simulation', name: 'Destruction Simulation', category: 'simulation' },
  { slug: 'particle-effects', name: 'Particle Effects', category: 'simulation' },

  // Compositing
  { slug: 'rotoscoping', name: 'Rotoscoping', category: 'compositing' },
  { slug: 'colour-grading-vfx', name: 'VFX Colour Grading', category: 'compositing' },
  { slug: 'cg-integration', name: 'CG Integration', category: 'compositing' },

  // Other
  { slug: 'title-sequence', name: 'Title Sequence', category: 'other' },
  { slug: 'miniatures', name: 'Miniatures & Scale Models', category: 'other' },
  { slug: 'previsualization', name: 'Previsualization', category: 'other' },
];

export async function seedVfxTechniques(db: SeedDb) {
  for (const t of techniquesData) {
    await db.insert(vfxTechniques)
      .values({ slug: t.slug, name: t.name, category: t.category })
      .onConflictDoUpdate({
        target: vfxTechniques.slug,
        set: { name: t.name, category: t.category },
      });
  }
}
```

- [ ] **Step 2: Add the step to `packages/db/src/seed/run.ts`**

Import at the top:
```typescript
import { seedVfxTechniques } from './data/vfx-techniques.ts';
```

Add to the `steps` array after `'attributions'`:
```typescript
{ name: 'vfx_techniques', run: async (db) => { await seedVfxTechniques(db); } },
```

- [ ] **Step 3: Run the seed to verify techniques insert cleanly**

```bash
pnpm --filter @bts/db seed
```

Expected: all steps pass including `✓ vfx_techniques`

- [ ] **Step 4: Commit**

```bash
git add packages/db/src/seed/data/vfx-techniques.ts packages/db/src/seed/run.ts
git commit -m "feat(db): add VFX techniques seed data"
```

---

### Task 7: Bootstrap packages/scraper

**Files:**
- Create: `packages/scraper/package.json`
- Create: `packages/scraper/tsconfig.json`

- [ ] **Step 1: Create `packages/scraper/package.json`**

```json
{
  "name": "@bts/scraper",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "scrape:artofvfx": "tsx src/cli.ts scrape:artofvfx",
    "scrape:beforesandafters": "tsx src/cli.ts scrape:beforesandafters",
    "import:vfx": "tsx src/cli.ts import:vfx",
    "run": "tsx src/cli.ts run",
    "start": "tsx src/scheduler.ts",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@bts/db": "workspace:*",
    "playwright": "^1.44.0",
    "fuse.js": "^7.0.0",
    "node-cron": "^3.0.0",
    "dotenv": "^16.0.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/node-cron": "^3.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.6.0"
  }
}
```

- [ ] **Step 2: Create `packages/scraper/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "strict": true,
    "skipLibCheck": true
  },
  "include": ["src/**/*.ts"]
}
```

- [ ] **Step 3: Create the directory structure**

```bash
mkdir -p packages/scraper/src/scrapers
mkdir -p packages/scraper/src/import
mkdir -p packages/scraper/data/vfx-raw/unmatched
```

Create a `.gitkeep` in `packages/scraper/data/vfx-raw/unmatched/.gitkeep` so git tracks the directories. Add `packages/scraper/data/vfx-raw/*.json` and `packages/scraper/data/vfx-raw/**/*.json` to `.gitignore` (but not the directory itself).

- [ ] **Step 4: Install dependencies**

```bash
pnpm --filter @bts/scraper install
pnpm --filter @bts/scraper exec playwright install chromium
```

- [ ] **Step 5: Verify pnpm-workspace.yaml includes packages/***

Check `pnpm-workspace.yaml` at the repo root. If it contains `packages/*`, the new package is already picked up. If it lists packages explicitly, add `- 'packages/scraper'`.

- [ ] **Step 6: Commit**

```bash
git add packages/scraper/package.json packages/scraper/tsconfig.json packages/scraper/data/
git commit -m "feat(scraper): bootstrap packages/scraper package"
```

---

### Task 8: Scraper shared types

**Files:**
- Create: `packages/scraper/src/scrapers/types.ts`

- [ ] **Step 1: Create `packages/scraper/src/scrapers/types.ts`**

```typescript
import { z } from 'zod';

export const RawVendorSchema = z.object({
  name: z.string(),
  shots: z.number().int().nullable(),
  role: z.enum(['primary', 'additional', 'special_sequences', 'miniatures', 'previsualization']),
});

export const RawVfxBreakdownSchema = z.object({
  source_url: z.string().url(),
  source: z.enum(['artofvfx', 'beforesandafters']),
  production_slug: z.string(),          // resolved by matcher; empty string = unmatched
  scraped_at: z.string().datetime(),
  total_shots: z.number().int().nullable(),
  vendors: z.array(RawVendorSchema),
  techniques: z.array(z.string()),      // slugs from vfx_techniques.slug
  sequences: z.array(z.object({        // discarded at import; kept for auditability
    name: z.string(),
    vendor: z.string().nullable(),
    notes: z.string().nullable(),
  })).default([]),
});

export type RawVfxBreakdown = z.infer<typeof RawVfxBreakdownSchema>;
export type RawVendor = z.infer<typeof RawVendorSchema>;
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/scraper/src/scrapers/types.ts
git commit -m "feat(scraper): add shared RawVfxBreakdown types"
```

---

### Task 9: Production matcher utility

**Files:**
- Create: `packages/scraper/src/scrapers/matcher.ts`

The matcher is shared by both scrapers. It queries the productions table and uses fuse.js to resolve a scraped title+year to a slug.

- [ ] **Step 1: Create `packages/scraper/src/scrapers/matcher.ts`**

```typescript
import 'dotenv/config';
import Fuse from 'fuse.js';
import { db, sql } from '@bts/db';

type ProductionRow = { slug: string; title: string; release_year: number | null };

let _cache: ProductionRow[] | null = null;

async function loadProductions(): Promise<ProductionRow[]> {
  if (_cache) return _cache;
  const rows = await db.execute<ProductionRow>(sql`
    SELECT slug, title, release_year FROM productions ORDER BY release_year, title
  `);
  _cache = [...rows];
  return _cache;
}

/**
 * Given a scraped film title and year, return the matching production_slug
 * or null if no confident match is found.
 *
 * Algorithm:
 *  1. Filter productions to exact release_year match (or all if year unknown).
 *  2. Run fuse.js fuzzy search on title with threshold 0.3.
 *  3. Accept only if exactly one candidate scores above threshold.
 */
export async function matchProduction(
  title: string,
  year: number | null,
): Promise<string | null> {
  const all = await loadProductions();
  const pool = year !== null ? all.filter((p) => p.release_year === year) : all;

  if (pool.length === 0) return null;

  const fuse = new Fuse(pool, {
    keys: ['title'],
    threshold: 0.3,
    includeScore: true,
  });

  const results = fuse.search(title);
  if (results.length === 1) return results[0].item.slug;
  if (results.length > 1) {
    // Accept only if top result score is significantly better than second
    const top = results[0].score ?? 1;
    const second = results[1].score ?? 1;
    if (top < 0.1 && second > top * 2) return results[0].item.slug;
  }
  return null;
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/scraper/src/scrapers/matcher.ts
git commit -m "feat(scraper): add production fuzzy matcher"
```

---

### Task 10: Art of VFX scraper

**Files:**
- Create: `packages/scraper/src/scrapers/art-of-vfx.ts`

The Art of VFX (artofvfx.com) publishes one article per film. Film pages use the URL pattern `https://www.artofvfx.com/<title-slug>/`. The scraper discovers the URL by searching the site, then parses shot counts and vendor tables from the article body.

- [ ] **Step 1: Create `packages/scraper/src/scrapers/art-of-vfx.ts`**

```typescript
import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RawVfxBreakdown, RawVendor } from './types.ts';
import { matchProduction } from './matcher.ts';
import { db, sql } from '@bts/db';

const RAW_DIR = new URL('../../data/vfx-raw/', import.meta.url).pathname;
const UNMATCHED_DIR = path.join(RAW_DIR, 'unmatched');

/**
 * Discover the Art of VFX article URL for a given film title.
 * Uses the site's search: https://www.artofvfx.com/?s=<title>
 */
async function findArticleUrl(page: import('playwright').Page, title: string): Promise<string | null> {
  const searchUrl = `https://www.artofvfx.com/?s=${encodeURIComponent(title)}`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  // First result link
  const link = await page.$('article a[href]');
  return link ? await link.getAttribute('href') : null;
}

/**
 * Parse vendor/shot data from an article page.
 * Art of VFX articles often have a structured table or bulleted list
 * of vendors with shot counts.
 */
async function parseArticle(page: import('playwright').Page, url: string): Promise<{
  total_shots: number | null;
  vendors: RawVendor[];
  techniques: string[];
  sequences: Array<{ name: string; vendor: string | null; notes: string | null }>;
}> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });

  const bodyText = await page.textContent('article') ?? await page.textContent('body') ?? '';

  // Extract total VFX shot count from patterns like "1,200 vfx shots" or "over 2000 shots"
  const totalMatch = bodyText.match(/(\d[\d,]*)\s+(?:vfx\s+)?shots?/i);
  const total_shots = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : null;

  // Extract vendors: look for lines with company names and shot counts
  // Pattern: "Company Name: 450 shots" or "Company Name – 450 shots"
  const vendorMatches = [...bodyText.matchAll(
    /([A-Z][A-Za-z\s&]+?)(?:\s*[:\–\-]\s*)(\d[\d,]*)\s+shots?/g,
  )];

  const vendors: RawVendor[] = vendorMatches.slice(0, 20).map((m, i) => ({
    name: m[1].trim(),
    shots: parseInt(m[2].replace(/,/g, ''), 10),
    role: i === 0 ? 'primary' : 'additional',
  }));

  // Technique detection from article text
  const techniqueKeywords: Record<string, string> = {
    'de-aging': 'de-aging',
    'de-aged': 'de-aging',
    'motion capture': 'motion-capture',
    'mocap': 'motion-capture',
    'performance capture': 'performance-capture',
    'digital double': 'digital-double',
    'cg environment': 'cg-environment',
    'set extension': 'set-extension',
    'matte painting': 'matte-painting',
    'water simulation': 'water-simulation',
    'crowd replication': 'crowd-replication',
    'virtual production': 'virtual-production',
    'led volume': 'virtual-production',
  };
  const lowerBody = bodyText.toLowerCase();
  const techniques = [...new Set(
    Object.entries(techniqueKeywords)
      .filter(([kw]) => lowerBody.includes(kw))
      .map(([, slug]) => slug),
  )];

  // Extract sequence headings (h2/h3 elements often name sequences)
  const headings = await page.$$eval('article h2, article h3', (els) =>
    els.map((el) => el.textContent?.trim() ?? '').filter(Boolean),
  );
  const sequences = headings
    .filter((h) => !h.match(/^\d+$/) && h.length > 3)
    .slice(0, 20)
    .map((name) => ({ name, vendor: null, notes: null }));

  return { total_shots, vendors, techniques, sequences };
}

async function writeResult(breakdown: RawVfxBreakdown, matched: boolean) {
  const dir = matched ? RAW_DIR : UNMATCHED_DIR;
  await fs.mkdir(dir, { recursive: true });
  const filename = `${breakdown.production_slug || 'unknown'}--artofvfx.json`;
  await fs.writeFile(path.join(dir, filename), JSON.stringify(breakdown, null, 2));
  console.log(`  ${matched ? '✓' : '⚠ unmatched'} ${filename}`);
}

export async function scrapeArtOfVfx(slugFilter?: string) {
  const productions = slugFilter
    ? await db.execute<{ slug: string; title: string; release_year: number | null }>(sql`
        SELECT slug, title, release_year FROM productions WHERE slug = ${slugFilter}
      `)
    : await db.execute<{ slug: string; title: string; release_year: number | null }>(sql`
        SELECT slug, title, release_year FROM productions ORDER BY release_year DESC
      `);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const prod of productions) {
    console.log(`Scraping Art of VFX for: ${prod.title} (${prod.release_year ?? '?'})`);
    try {
      const articleUrl = await findArticleUrl(page, prod.title);
      if (!articleUrl) {
        console.log(`  No article found`);
        continue;
      }

      const { total_shots, vendors, techniques, sequences } = await parseArticle(page, articleUrl);

      const productionSlug = await matchProduction(prod.title, prod.release_year) ?? '';
      const matched = productionSlug !== '';

      const breakdown: RawVfxBreakdown = {
        source_url: articleUrl,
        source: 'artofvfx',
        production_slug: productionSlug || prod.slug,
        scraped_at: new Date().toISOString(),
        total_shots,
        vendors,
        techniques,
        sequences,
      };

      await writeResult(breakdown, matched);
      // Polite delay between requests
      await new Promise((r) => setTimeout(r, 2_000));
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await browser.close();
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/scraper/src/scrapers/art-of-vfx.ts
git commit -m "feat(scraper): add Art of VFX Playwright scraper"
```

---

### Task 11: Befores & Afters scraper

**Files:**
- Create: `packages/scraper/src/scrapers/befores-and-afters.ts`

Befores & Afters (beforesandafters.com) uses a similar article-per-film structure but with less structured vendor data. The scraper searches via the site's search feature and falls back to regex on body text.

- [ ] **Step 1: Create `packages/scraper/src/scrapers/befores-and-afters.ts`**

```typescript
import 'dotenv/config';
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { RawVfxBreakdown, RawVendor } from './types.ts';
import { matchProduction } from './matcher.ts';
import { db, sql } from '@bts/db';

const RAW_DIR = new URL('../../data/vfx-raw/', import.meta.url).pathname;
const UNMATCHED_DIR = path.join(RAW_DIR, 'unmatched');

async function findArticleUrl(page: import('playwright').Page, title: string): Promise<string | null> {
  const searchUrl = `https://beforesandafters.com/?s=${encodeURIComponent(title)}`;
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const link = await page.$('h2.entry-title a, article a[href]');
  return link ? await link.getAttribute('href') : null;
}

async function parseArticle(page: import('playwright').Page, url: string): Promise<{
  total_shots: number | null;
  vendors: RawVendor[];
  techniques: string[];
  sequences: Array<{ name: string; vendor: string | null; notes: string | null }>;
}> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  const bodyText = await page.textContent('.entry-content, article, body') ?? '';

  const totalMatch = bodyText.match(/(\d[\d,]*)\s+(?:vfx\s+)?shots?/i);
  const total_shots = totalMatch ? parseInt(totalMatch[1].replace(/,/g, ''), 10) : null;

  // B&A articles mention vendors more narratively — extract company names near shot counts
  const vendorMatches = [...bodyText.matchAll(
    /([A-Z][A-Za-z\s&]+?)\s+(?:handled|delivered|created|provided|worked on)\s+(?:approximately\s+)?(\d[\d,]*)\s+shots?/gi,
  )];

  const vendors: RawVendor[] = vendorMatches.slice(0, 20).map((m, i) => ({
    name: m[1].trim(),
    shots: parseInt(m[2].replace(/,/g, ''), 10),
    role: i === 0 ? 'primary' : 'additional',
  }));

  const techniqueKeywords: Record<string, string> = {
    'de-aging': 'de-aging', 'de-aged': 'de-aging',
    'motion capture': 'motion-capture', 'mocap': 'motion-capture',
    'digital double': 'digital-double',
    'cg environment': 'cg-environment', 'set extension': 'set-extension',
    'matte painting': 'matte-painting', 'water simulation': 'water-simulation',
    'crowd replication': 'crowd-replication',
    'virtual production': 'virtual-production', 'led volume': 'virtual-production',
    'performance capture': 'performance-capture',
  };
  const lowerBody = bodyText.toLowerCase();
  const techniques = [...new Set(
    Object.entries(techniqueKeywords)
      .filter(([kw]) => lowerBody.includes(kw))
      .map(([, slug]) => slug),
  )];

  const headings = await page.$$eval('.entry-content h2, .entry-content h3', (els) =>
    els.map((el) => el.textContent?.trim() ?? '').filter(Boolean),
  );
  const sequences = headings.slice(0, 20).map((name) => ({ name, vendor: null, notes: null }));

  return { total_shots, vendors, techniques, sequences };
}

async function writeResult(breakdown: RawVfxBreakdown, matched: boolean) {
  const dir = matched ? RAW_DIR : UNMATCHED_DIR;
  await fs.mkdir(dir, { recursive: true });
  const filename = `${breakdown.production_slug || 'unknown'}--beforesandafters.json`;
  await fs.writeFile(path.join(dir, filename), JSON.stringify(breakdown, null, 2));
  console.log(`  ${matched ? '✓' : '⚠ unmatched'} ${filename}`);
}

export async function scrapeBeforesAndAfters(slugFilter?: string) {
  const productions = slugFilter
    ? await db.execute<{ slug: string; title: string; release_year: number | null }>(sql`
        SELECT slug, title, release_year FROM productions WHERE slug = ${slugFilter}
      `)
    : await db.execute<{ slug: string; title: string; release_year: number | null }>(sql`
        SELECT slug, title, release_year FROM productions ORDER BY release_year DESC
      `);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const prod of productions) {
    console.log(`Scraping Befores & Afters for: ${prod.title}`);
    try {
      const articleUrl = await findArticleUrl(page, prod.title);
      if (!articleUrl) { console.log(`  No article found`); continue; }

      const { total_shots, vendors, techniques, sequences } = await parseArticle(page, articleUrl);
      const productionSlug = await matchProduction(prod.title, prod.release_year) ?? '';
      const matched = productionSlug !== '';

      const breakdown: RawVfxBreakdown = {
        source_url: articleUrl,
        source: 'beforesandafters',
        production_slug: productionSlug || prod.slug,
        scraped_at: new Date().toISOString(),
        total_shots,
        vendors,
        techniques,
        sequences,
      };

      await writeResult(breakdown, matched);
      await new Promise((r) => setTimeout(r, 2_000));
    } catch (err) {
      console.error(`  Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  await browser.close();
}
```

- [ ] **Step 2: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add packages/scraper/src/scrapers/befores-and-afters.ts
git commit -m "feat(scraper): add Befores & Afters Playwright scraper"
```

---

### Task 12: Import pipeline (transform + upsert)

**Files:**
- Create: `packages/scraper/src/import/transform.ts`
- Create: `packages/scraper/src/import/upsert.ts`

- [ ] **Step 1: Create `packages/scraper/src/import/transform.ts`**

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import { RawVfxBreakdownSchema, type RawVfxBreakdown } from '../scrapers/types.ts';

const RAW_DIR = new URL('../../../data/vfx-raw/', import.meta.url).pathname;

export async function loadRawBreakdowns(): Promise<RawVfxBreakdown[]> {
  const results: RawVfxBreakdown[] = [];

  const files = await fs.readdir(RAW_DIR).catch(() => [] as string[]);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(RAW_DIR, file);
    try {
      const raw = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      const parsed = RawVfxBreakdownSchema.safeParse(raw);
      if (parsed.success) {
        results.push(parsed.data);
      } else {
        console.warn(`  Skipping invalid JSON: ${file}`, parsed.error.issues[0]?.message);
      }
    } catch (err) {
      console.warn(`  Could not read ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Prefer artofvfx over beforesandafters for the same production:
  // Sort so artofvfx entries come last (they win on upsert)
  results.sort((a, b) => {
    if (a.source === b.source) return 0;
    return a.source === 'artofvfx' ? 1 : -1;
  });

  return results;
}
```

- [ ] **Step 2: Create `packages/scraper/src/import/upsert.ts`**

```typescript
import 'dotenv/config';
import { db, sql } from '@bts/db';
import type { RawVfxBreakdown } from '../scrapers/types.ts';

/**
 * Upsert a single raw breakdown into the database.
 *
 * Conflict resolution (vfx_credits unique on production_id + vfx_house_id):
 *  - artofvfx wins over beforesandafters: caller sorts so artofvfx is processed last
 *  - non-null shot_count wins over null: only update shot_count if incoming is non-null
 *  - notes are appended with source prefix
 */
export async function upsertBreakdown(breakdown: RawVfxBreakdown): Promise<void> {
  if (!breakdown.production_slug) {
    console.warn(`  Skipping unmatched breakdown from ${breakdown.source_url}`);
    return;
  }

  // Resolve production ID
  const [prod] = await db.execute<{ id: number }>(sql`
    SELECT id FROM productions WHERE slug = ${breakdown.production_slug}
  `);
  if (!prod) {
    console.warn(`  Production not found: ${breakdown.production_slug}`);
    return;
  }

  // Upsert source record
  const [src] = await db.execute<{ id: number }>(sql`
    INSERT INTO sources (slug, kind, title, url, accessed_at)
    VALUES (
      ${`vfx-${breakdown.source}-${breakdown.production_slug}`},
      'vfx_breakdown_article',
      ${`VFX Breakdown: ${breakdown.production_slug} (${breakdown.source})`},
      ${breakdown.source_url},
      ${new Date().toISOString().split('T')[0]}
    )
    ON CONFLICT (url) WHERE url IS NOT NULL
    DO UPDATE SET accessed_at = EXCLUDED.accessed_at
    RETURNING id
  `);

  // Upsert each vendor as a vfx_house + vfx_credit
  for (const vendor of breakdown.vendors) {
    const vendorSlug = vendor.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    // Upsert VFX house
    const [house] = await db.execute<{ id: number }>(sql`
      INSERT INTO vfx_houses (slug, name)
      VALUES (${vendorSlug}, ${vendor.name})
      ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `);

    // Link source to house
    await db.execute(sql`
      INSERT INTO vfx_house_sources (vfx_house_id, source_id, confidence)
      VALUES (${house.id}, ${src.id}, 'secondary')
      ON CONFLICT (vfx_house_id, source_id) DO NOTHING
    `);

    // Upsert credit with conflict resolution
    const notePrefix = `[${breakdown.source}]`;
    await db.execute(sql`
      INSERT INTO vfx_credits (production_id, vfx_house_id, shot_count, role, notes)
      VALUES (
        ${prod.id}, ${house.id},
        ${vendor.shots ?? null},
        ${vendor.role},
        ${vendor.shots !== null ? null : null}
      )
      ON CONFLICT (production_id, vfx_house_id) DO UPDATE SET
        shot_count = CASE
          WHEN EXCLUDED.shot_count IS NOT NULL THEN EXCLUDED.shot_count
          ELSE vfx_credits.shot_count
        END,
        role = EXCLUDED.role,
        notes = CASE
          WHEN vfx_credits.notes IS NULL THEN NULL
          ELSE vfx_credits.notes || E'\n' || ${notePrefix}
        END,
        updated_at = NOW()
    `);
  }

  // Upsert technique tags
  for (const techniqueSlug of breakdown.techniques) {
    const [technique] = await db.execute<{ id: number }>(sql`
      SELECT id FROM vfx_techniques WHERE slug = ${techniqueSlug}
    `);
    if (!technique) { console.warn(`  Unknown technique slug: ${techniqueSlug}`); continue; }

    await db.execute(sql`
      INSERT INTO production_vfx_techniques (production_id, technique_id)
      VALUES (${prod.id}, ${technique.id})
      ON CONFLICT (production_id, technique_id) DO NOTHING
    `);
  }

  console.log(`  ✓ ${breakdown.production_slug} (${breakdown.source}): ${breakdown.vendors.length} vendors, ${breakdown.techniques.length} techniques`);
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add packages/scraper/src/import/
git commit -m "feat(scraper): add VFX import transform and upsert pipeline"
```

---

### Task 13: CLI entry point and scheduler

**Files:**
- Create: `packages/scraper/src/cli.ts`
- Create: `packages/scraper/src/scheduler.ts`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Create `packages/scraper/src/cli.ts`**

```typescript
import 'dotenv/config';
import { scrapeArtOfVfx } from './scrapers/art-of-vfx.ts';
import { scrapeBeforesAndAfters } from './scrapers/befores-and-afters.ts';
import { loadRawBreakdowns } from './import/transform.ts';
import { upsertBreakdown } from './import/upsert.ts';

const [, , command, ...args] = process.argv;
const slugFlag = args.find((_, i) => args[i - 1] === '--slug');

async function importVfx() {
  console.log('import:vfx — loading raw breakdowns...');
  const breakdowns = await loadRawBreakdowns();
  console.log(`  Found ${breakdowns.length} breakdown files`);
  for (const b of breakdowns) {
    await upsertBreakdown(b);
  }
  console.log('import:vfx done');
}

switch (command) {
  case 'scrape:artofvfx':
    console.log('scrape:artofvfx starting...');
    await scrapeArtOfVfx(slugFlag);
    break;
  case 'scrape:beforesandafters':
    console.log('scrape:beforesandafters starting...');
    await scrapeBeforesAndAfters(slugFlag);
    break;
  case 'import:vfx':
    await importVfx();
    break;
  case 'run':
    console.log('run: scrape:artofvfx → scrape:beforesandafters → import:vfx');
    await scrapeArtOfVfx(slugFlag);
    await scrapeBeforesAndAfters(slugFlag);
    await importVfx();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Usage: tsx src/cli.ts <scrape:artofvfx|scrape:beforesandafters|import:vfx|run> [--slug <production-slug>]');
    process.exit(1);
}
```

- [ ] **Step 2: Create `packages/scraper/src/scheduler.ts`**

```typescript
import 'dotenv/config';
import cron from 'node-cron';
import { scrapeArtOfVfx } from './scrapers/art-of-vfx.ts';
import { scrapeBeforesAndAfters } from './scrapers/befores-and-afters.ts';
import { loadRawBreakdowns } from './import/transform.ts';
import { upsertBreakdown } from './import/upsert.ts';

const schedule = process.env.SCRAPER_CRON ?? '0 3 * * 1'; // Monday 3AM

console.log(`Scraper scheduler started. Cron: ${schedule}`);

cron.schedule(schedule, async () => {
  console.log(`[${new Date().toISOString()}] Starting scheduled scrape run`);
  try {
    await scrapeArtOfVfx();
  } catch (e) {
    console.error('scrape:artofvfx failed:', e instanceof Error ? e.message : String(e));
  }
  try {
    await scrapeBeforesAndAfters();
  } catch (e) {
    console.error('scrape:beforesandafters failed:', e instanceof Error ? e.message : String(e));
  }
  try {
    const breakdowns = await loadRawBreakdowns();
    for (const b of breakdowns) {
      await upsertBreakdown(b).catch((err: unknown) => {
        console.error(`upsert failed for ${b.production_slug}:`, err instanceof Error ? err.message : String(err));
      });
    }
    console.log(`[${new Date().toISOString()}] Scheduled run complete`);
  } catch (e) {
    console.error('import:vfx failed:', e instanceof Error ? e.message : String(e));
  }
});
```

- [ ] **Step 3: Add the scraper service to `docker-compose.yml`**

```yaml
  scraper:
    build:
      context: .
      dockerfile: packages/scraper/Dockerfile
    environment:
      DATABASE_URL: postgres://bts:bts@postgres:5432/bts_dev
      SCRAPER_CRON: "0 3 * * 1"
    volumes:
      - ./packages/scraper/data:/app/packages/scraper/data
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    profiles:
      - scraper
```

Note: add `profiles: [scraper]` so the scraper container doesn't start by default with `docker compose up` — only when explicitly requested with `docker compose --profile scraper up`.

Also create a minimal `packages/scraper/Dockerfile`:

```dockerfile
FROM node:20-slim
RUN npx playwright install --with-deps chromium
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/scraper/package.json ./packages/scraper/
COPY packages/db/package.json ./packages/db/
RUN corepack enable && pnpm install --frozen-lockfile
COPY packages/ ./packages/
CMD ["pnpm", "--filter", "@bts/scraper", "start"]
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @bts/scraper typecheck
```

Expected: no errors

- [ ] **Step 5: Smoke-test the CLI with a single production**

```bash
pnpm --filter @bts/scraper import:vfx
```

Expected: `Found 0 breakdown files` (no JSON files yet — that's correct)

- [ ] **Step 6: Commit**

```bash
git add packages/scraper/src/cli.ts packages/scraper/src/scheduler.ts \
        packages/scraper/Dockerfile docker-compose.yml
git commit -m "feat(scraper): add CLI, scheduler, and Docker Compose service"
```

---

### Task 14: VFX house browse page

**Files:**
- Create: `apps/web/app/vfx/page.tsx`
- Create: `apps/web/components/vfx/VfxHouseCard.tsx`

- [ ] **Step 1: Create `apps/web/components/vfx/VfxHouseCard.tsx`**

```tsx
import Link from 'next/link';

interface VfxHouseCardProps {
  slug: string;
  name: string;
  country: string | null;
  productionCount: number;
}

export function VfxHouseCard({ slug, name, country, productionCount }: VfxHouseCardProps) {
  return (
    <Link
      href={`/vfx/${slug}`}
      className="block rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
    >
      <div className="flex items-start justify-between">
        <h2 className="font-serif text-lg text-zinc-50">{name}</h2>
        <span className="text-xs text-zinc-500">{productionCount} films</span>
      </div>
      {country && (
        <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">{country}</p>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/vfx/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { db, listVfxHouses } from '@bts/db';
import { VfxHouseCard } from '@/components/vfx/VfxHouseCard';

export const metadata: Metadata = { title: 'VFX Houses' };

export default async function VfxPage() {
  const rows = await listVfxHouses(db);

  return (
    <>
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest text-zinc-500">Archive</p>
        <h1 className="mt-1 font-serif text-3xl text-zinc-50">VFX Houses</h1>
        <p className="mt-1 text-sm text-zinc-400">{rows.length} houses</p>
      </div>
      {rows.length === 0 ? (
        <p className="text-zinc-500">No VFX data imported yet. Run the scraper to populate.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => (
            <VfxHouseCard
              key={row.slug}
              slug={row.slug}
              name={row.name}
              country={row.country}
              productionCount={row.production_count}
            />
          ))}
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 3: Verify the page compiles**

```bash
pnpm --filter @bts/web typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/vfx/page.tsx apps/web/components/vfx/VfxHouseCard.tsx
git commit -m "feat(web): add /vfx VFX houses browse page"
```

---

### Task 15: VFX house detail page

**Files:**
- Create: `apps/web/app/vfx/[slug]/page.tsx`
- Create: `apps/web/components/vfx/VfxFilmography.tsx`

- [ ] **Step 1: Create `apps/web/components/vfx/VfxFilmography.tsx`**

```tsx
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface FilmographyRow {
  production_slug: string;
  production_title: string;
  release_year: number | null;
  role: string;
  shot_count: number | null;
}

export function VfxFilmography({ rows }: { rows: FilmographyRow[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="flex flex-col gap-px">
      {rows.map((r) => (
        <div
          key={r.production_slug}
          className="flex items-center gap-3 rounded bg-zinc-950 px-3 py-2 text-sm"
        >
          <span className="w-10 shrink-0 text-xs text-zinc-500">{r.release_year ?? '—'}</span>
          <Link href={`/films/${r.production_slug}`} className="flex-1 text-zinc-200 hover:text-amber-400">
            {r.production_title}
          </Link>
          <Badge label={r.role} variant="category" />
          <span className="w-20 text-right text-xs text-zinc-500">
            {r.shot_count != null ? `${r.shot_count.toLocaleString()} shots` : '—'}
          </span>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Create `apps/web/app/vfx/[slug]/page.tsx`**

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, listVfxHouses, getVfxHouseWithFilmography } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { VfxFilmography } from '@/components/vfx/VfxFilmography';

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  const rows = await listVfxHouses(db);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getVfxHouseWithFilmography(db, params.slug);
  return data ? { title: data.house.name } : {};
}

export default async function VfxHousePage({ params }: Props) {
  const data = await getVfxHouseWithFilmography(db, params.slug);
  if (!data) notFound();
  const { house, filmography, techniques } = data;

  const totalShots = house.total_shots != null
    ? Math.round(house.total_shots).toLocaleString()
    : null;

  return (
    <article>
      <header className="mb-8 border-b border-zinc-800 pb-6">
        <p className="text-xs text-zinc-500">
          <Link href="/vfx" className="hover:text-amber-400">VFX Houses</Link>
          {' › '}
        </p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{house.name}</h1>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">
          {house.country ?? 'VFX House'}
          {house.founded_year ? ` · Est. ${house.founded_year}` : ''}
        </p>
        {house.website && (
          <a href={house.website} target="_blank" rel="noopener noreferrer"
             className="mt-2 inline-block text-xs text-amber-400 hover:underline">
            Website ↗
          </a>
        )}

        <div className="mt-6 flex gap-8">
          <div>
            <div className="font-serif text-2xl text-zinc-50">{house.total_productions}</div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Productions</div>
          </div>
          <div>
            <div className="font-serif text-2xl text-zinc-50">{house.primary_credits}</div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">as Primary</div>
          </div>
          {totalShots && (
            <div>
              <div className="font-serif text-2xl text-zinc-50">{totalShots}</div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Total shots</div>
            </div>
          )}
        </div>
      </header>

      {techniques.length > 0 && (
        <div className="mb-8">
          <SectionHeader label="Specialties" heading="Techniques" />
          <div className="flex flex-wrap gap-2">
            {techniques.map((t) => (
              <Badge key={t.slug} label={t.name} variant="category" />
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionHeader label="Credits" heading="Filmography" />
        <VfxFilmography rows={filmography} />
      </div>
    </article>
  );
}
```

- [ ] **Step 3: Typecheck**

```bash
pnpm --filter @bts/web typecheck
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/vfx/[slug]/page.tsx apps/web/components/vfx/VfxFilmography.tsx
git commit -m "feat(web): add /vfx/[slug] VFX house detail page"
```

---

### Task 16: VfxSection on film detail page

**Files:**
- Create: `apps/web/components/productions/VfxSection.tsx`
- Modify: `apps/web/app/films/[slug]/page.tsx`
- Modify: `apps/web/components/productions/ProductionDetail.tsx`

- [ ] **Step 1: Create `apps/web/components/productions/VfxSection.tsx`**

```tsx
import Link from 'next/link';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';

interface VfxCredit {
  vfx_house_slug: string;
  vfx_house_name: string;
  role: string;
  shot_count: number | null;
  notes: string | null;
}

interface VfxTechnique {
  slug: string;
  name: string;
  category: string;
}

interface VfxSectionProps {
  credits: VfxCredit[];
  techniques: VfxTechnique[];
}

export function VfxSection({ credits, techniques }: VfxSectionProps) {
  if (credits.length === 0 && techniques.length === 0) return null;

  const totalShots = credits.reduce((sum, c) => sum + (c.shot_count ?? 0), 0);

  return (
    <div className="mt-8">
      <SectionHeader label="Post-Production" heading="Visual Effects" />

      {techniques.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {techniques.map((t) => (
            <Badge key={t.slug} label={t.name} variant="category" />
          ))}
        </div>
      )}

      {credits.length > 0 && (
        <>
          <div className="rounded border border-zinc-800">
            {credits.map((c, i) => (
              <div
                key={c.vfx_house_slug}
                className={`flex items-center gap-3 px-4 py-2 text-sm ${i > 0 ? 'border-t border-zinc-800/50' : ''}`}
              >
                <Badge label={c.role.replace('_', ' ')} variant="category" />
                <Link href={`/vfx/${c.vfx_house_slug}`} className="flex-1 text-zinc-200 hover:text-amber-400">
                  {c.vfx_house_name}
                </Link>
                <span className="text-xs text-zinc-500">
                  {c.shot_count != null ? `${c.shot_count.toLocaleString()} shots` : '—'}
                </span>
              </div>
            ))}
          </div>
          {totalShots > 0 && (
            <p className="mt-2 text-right text-xs text-zinc-500">
              {totalShots.toLocaleString()} total VFX shots
            </p>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update `apps/web/app/films/[slug]/page.tsx`** to fetch VFX data alongside the existing query

Current:
```typescript
const data = await getProductionWithFullDetail(db, params.slug);
if (!data) notFound();
const media = await fetchTmdbMedia(data.production.tmdb_id);
return <ProductionDetail data={data} media={media} />;
```

Change to:
```typescript
import { getProductionWithFullDetail, getProductionVfxData, db } from '@bts/db';

const data = await getProductionWithFullDetail(db, params.slug);
if (!data) notFound();

const [media, vfx] = await Promise.all([
  fetchTmdbMedia(data.production.tmdb_id),
  getProductionVfxData(db, data.production.id),
]);

return <ProductionDetail data={data} media={media} vfx={vfx} />;
```

- [ ] **Step 3: Update `apps/web/components/productions/ProductionDetail.tsx`** to accept and render VFX data

Add `vfx` to the props type and import `VfxSection`:

```typescript
import { VfxSection } from './VfxSection';
import type { getProductionVfxData } from '@bts/db';

type VfxData = Awaited<ReturnType<typeof getProductionVfxData>>;

// Add to function signature:
export function ProductionDetail({
  data, media, vfx,
}: {
  data: DetailData;
  media: TmdbMedia | null;
  vfx: VfxData;
}) {
```

Add `<VfxSection>` after the crew section, before `<SceneList>`:
```tsx
<VfxSection credits={vfx.credits} techniques={vfx.techniques} />
<SceneList rows={scenes} />
```

- [ ] **Step 4: Typecheck**

```bash
pnpm --filter @bts/web typecheck
```

Expected: no errors

- [ ] **Step 5: Add a link to /vfx in the top nav**

In `apps/web/components/nav/TopNav.tsx`, add a VFX Houses nav link alongside the existing Gear and Crew links.

- [ ] **Step 6: Run the full test suite**

```bash
pnpm --filter @bts/db test
```

Expected: all tests pass

- [ ] **Step 7: Commit**

```bash
git add apps/web/components/productions/VfxSection.tsx \
        apps/web/app/films/[slug]/page.tsx \
        apps/web/components/productions/ProductionDetail.tsx \
        apps/web/components/nav/TopNav.tsx
git commit -m "feat(web): add VFX section to film detail page and nav link"
```
