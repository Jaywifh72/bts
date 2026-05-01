# VFX Breakdowns Design

**Goal:** Add visual effects breakdown data to the app — VFX houses as first-class browsable entities, per-production shot counts and vendor credits, technique tagging, and an automated scraper pipeline sourcing data from The Art of VFX and Befores & Afters.

**Architecture:** ETL pipeline with raw JSON buffer. Playwright-based scrapers write per-article JSON files; a separate import step validates and upserts into Postgres. This decouples scraping from importing so schema changes don't require re-scraping. A `node-cron` scheduler runs the full pipeline weekly as a Docker Compose service.

**Tech Stack:** Drizzle ORM + PostgreSQL (existing), Playwright (scraping), node-cron (scheduling), Next.js App Router (UI)

---

## Data Model

### New file: `packages/db/src/schema/vfx.ts`

Five new tables, all following existing schema conventions.

#### `vfx_houses`

First-class entities analogous to `studios`. Browsable with their own pages.

| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| slug | text UNIQUE NOT NULL | e.g. `weta-digital` |
| name | text NOT NULL | e.g. `Weta Digital` |
| country | text | |
| founded_year | integer | |
| website | text | |
| wikidata_id | text UNIQUE | |
| created_at / updated_at | timestamptz | |

#### `vfx_credits`

Links a VFX house to a production with structured breakdown data.

| Column | Type | Notes |
|---|---|---|
| id | bigserial PK | |
| production_id | bigint FK → productions.id CASCADE | |
| vfx_house_id | bigint FK → vfx_houses.id RESTRICT | |
| shot_count | integer | Nullable — not always published |
| role | vfxCreditRoleEnum NOT NULL | See enum below |
| notes | text | |
| created_at / updated_at | timestamptz | |

**Deliberate simplification — one row per house per production.** A unique constraint on `(production_id, vfx_house_id)` enforces this. In cases where a house has multiple roles (e.g. both primary vendor and special sequences), `role` should reflect the highest-priority role (`primary` > `special_sequences` > `additional` > etc.) and additional context goes in `notes`. This keeps the credit model simple and avoids ambiguous aggregation.

**`vfxCreditRoleEnum`** (new): `primary | additional | special_sequences | miniatures | previsualization`

#### `vfx_techniques`

Controlled vocabulary of VFX techniques. Seeded, not scraped.

| Column | Type | Notes |
|---|---|---|
| id | smallserial PK | |
| slug | text UNIQUE NOT NULL | e.g. `cg-environment` |
| name | text NOT NULL | e.g. `CG Environment` |
| category | vfxTechniqueCategoryEnum NOT NULL | See enum below |

**`vfxTechniqueCategoryEnum`** (new): `creature | environment | character | practical_enhancement | simulation | compositing | other`

#### `production_vfx_techniques`

Junction table linking productions to techniques.

| Column | Type | Notes |
|---|---|---|
| production_id | bigint FK → productions.id CASCADE | |
| technique_id | smallint FK → vfx_techniques.id RESTRICT | |

Primary key on `(production_id, technique_id)`.

#### `vfx_house_sources`

Attribution for VFX house data, using the same `attributionColumns()` helper as existing source tables.

| Column | Type | Notes |
|---|---|---|
| vfx_house_id | bigint FK → vfx_houses.id CASCADE | |
| source_id | bigint FK → sources.id RESTRICT | |
| confidence | sourceConfidenceEnum NOT NULL | |
| claim_quote | text | |
| notes | text | |
| created_at | timestamptz | |

Primary key on `(vfx_house_id, source_id)`.

### Changes to existing files

**`enums.ts`:** Add `vfxCreditRoleEnum` and `vfxTechniqueCategoryEnum`.

**`enums.ts` — `sourceKindEnum`:** Add `'vfx_breakdown_article'` alongside existing kinds.

**`schema/index.ts`:** Export all new tables and enums.

### Migrations

Run `drizzle-kit generate` to produce migration SQL, then `drizzle-kit migrate` to apply.

---

## Scraper Package

### New package: `packages/scraper`

```
packages/scraper/
  src/
    scrapers/
      art-of-vfx.ts          # Playwright scraper for artofvfx.com
      befores-and-afters.ts  # Playwright scraper for beforesandafters.com
      types.ts               # Shared RawVfxBreakdown interface
    import/
      transform.ts           # RawVfxBreakdown → validated domain objects
      upsert.ts              # Validated objects → Postgres via @bts/db
    scheduler.ts             # node-cron weekly schedule
    cli.ts                   # CLI entry point
  data/
    vfx-raw/                 # Gitignored — one JSON file per article
      unmatched/             # Articles that couldn't be matched to a production
  package.json
  tsconfig.json
```

### Raw JSON format

One file per scraped article, named `<production-slug>--<source>.json` (e.g. `avatar-the-way-of-water-2022--artofvfx.json`):

```json
{
  "source_url": "https://www.artofvfx.com/...",
  "source": "artofvfx",
  "production_slug": "avatar-the-way-of-water-2022",
  "scraped_at": "2026-05-01T00:00:00Z",
  "total_shots": 2021,
  "vendors": [
    { "name": "Weta Digital", "shots": 1200, "role": "primary" },
    { "name": "ILM", "shots": 400, "role": "additional" },
    { "name": "DNEG", "shots": 421, "role": "additional" }
  ],
  "techniques": ["cg_environment", "water_simulation", "creature"],
  "sequences": [
    { "name": "Underwater sequences", "vendor": "Weta Digital", "notes": "..." }
  ]
}
```

The `sequences` array is best-effort — present when the article structures content by sequence, absent otherwise. The import step discards `sequences` entirely; it is not persisted to the database (scene-to-VFX linking is out of scope).

### Scraper strategy

Both scrapers use Playwright (headless Chromium) to handle any JS-rendered content. Each scraper:

1. Accepts an optional `--slug` flag to target a single production, or iterates all known slugs from the `productions` table
2. Fetches the article URL (looked up or discovered via site search)
3. Parses structured fields with DOM selectors (shot count tables, vendor lists)
4. Falls back to regex on text content for less-structured Befores & Afters articles
5. Writes raw JSON — **never touches the DB directly**
6. Writes unmatched articles to `data/vfx-raw/unmatched/` for manual review

### Production matching

The scraper resolves a scraped film title + year to a `production_slug` as follows:

1. **Exact year match first** — filter `productions` by `release_year` (must match exactly)
2. **Fuzzy title match** — use `fuse.js` with `threshold: 0.3` on the `title` field within the year-filtered set
3. **Accept if exactly one match** — if multiple candidates score above the threshold, write to `unmatched/` for manual review
4. **No match** — also write to `unmatched/`

Manual fix: rename the JSON file so its path prefix matches the correct `production_slug` (e.g. `avatar-the-way-of-water-2022--artofvfx.json`), then re-run `import:vfx`.

### Upsert conflict resolution

When `import:vfx` encounters an existing `vfx_credits` row for the same `(production_id, vfx_house_id)`:

- **Art of VFX wins over Befores & Afters** — Art of VFX articles are more structured and typically cite shot counts directly from VFX houses; B&A data is treated as lower confidence. If both exist, the Art of VFX values for `shot_count` and `role` are kept.
- **Non-null wins over null** — if the existing row has a `shot_count` and the incoming data does not, the existing value is preserved.
- **`notes` are appended** — if both sources have notes, they are concatenated with a source label prefix (e.g. `[artofvfx] ... [beforesandafters] ...`).

The source URL for each import run is upserted into `sources` and linked via `vfx_house_sources` regardless of which value "wins" for the credit row, so both articles remain attributed.

### CLI commands

Run via `pnpm --filter @bts/scraper <command>`:

| Command | Description |
|---|---|
| `scrape:artofvfx` | Scrape Art of VFX (all known productions, or `--slug` for one) |
| `scrape:beforesandafters` | Scrape Befores & Afters |
| `import:vfx` | Transform all JSON in `data/vfx-raw/` and upsert to Postgres |
| `run` | `scrape:artofvfx` + `scrape:beforesandafters` + `import:vfx` in sequence |
| `start` | Long-running scheduler process (calls `run` weekly via node-cron) |

### Scheduler

`scheduler.ts` uses `node-cron` with a configurable `SCRAPER_CRON` env var (default: `0 3 * * 1` — Monday 3 AM). Docker Compose adds a `scraper` service that runs `pnpm --filter @bts/scraper start`.

---

## Web UI

### New routes (`apps/web/app/`)

#### `/vfx` — VFX houses browse page

Grid of VFX house cards (mirrors the `/gear` manufacturers grid). Each card: house name, country, production count.

**Query:** `listVfxHouses(db)` — returns all houses with production count aggregated from `vfx_credits`.

#### `/vfx/[slug]` — VFX house detail page

Layout (Option B from design review):

1. **Header:** house name, country, founded year, website link
2. **Stats row:** total productions · primary credits · total shots (sum of shot_count where not null)
3. **Technique tags:** all techniques across this house's productions
4. **Filmography list:** year · film title (link to `/films/[slug]`) · role badge · shot count

**Query:** `getVfxHouseWithFilmography(db, slug)`

### Modified components

#### `ProductionDetail.tsx` — new VFX section

Sits below the existing crew section. Rendered only when the production has VFX data.

Layout (Option A from design review):
- Technique badge tags row
- List of `vfx_credits` rows: role badge · house name (link to `/vfx/[slug]`) · shot count right-aligned
- Total shot count footer line

**Query extension:** `getProductionWithFullDetail` gains VFX credits and techniques in its return shape.

### New components

| Component | Path | Purpose |
|---|---|---|
| `VfxHouseCard` | `components/vfx/VfxHouseCard.tsx` | Card for the browse grid |
| `VfxSection` | `components/productions/VfxSection.tsx` | VFX block on film detail page |
| `VfxFilmography` | `components/vfx/VfxFilmography.tsx` | Filmography list on house page |

---

## Out of Scope

- Shot-level granularity (`vfx_shots` table) — too granular for what's parseable from these sources
- Scene-to-VFX linking — scraped data doesn't map to our scene slugs; left for future manual annotation
- VFX awards data (VES, Oscar) — separate feature
- User-submitted corrections to scraped data
