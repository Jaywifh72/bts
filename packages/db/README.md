# @bts/db

Postgres data layer for the Global Cinematic Technical Repository (v1).

Drizzle ORM + drizzle-kit + postgres.js + Zod (for JSONB spec validation) + Vitest.

## Quickstart

From the workspace root:

```bash
pnpm install
docker compose up -d
pnpm --filter @bts/db migrate
pnpm --filter @bts/db seed
pnpm --filter @bts/db test
```

`bts_dev` is now live with v1 seed data; `bts_test` is migrated and ready for the test suite to seed against.

## Package scripts

| Script | What it does |
|---|---|
| `pnpm migrate` | Apply Drizzle migrations to `DATABASE_URL`. |
| `pnpm generate` | Generate a new migration from schema changes. |
| `pnpm seed` | Run the idempotent seed orchestrator. |
| `pnpm seed:reset` | Drop the `public` and `drizzle` schemas, re-migrate, re-seed (`scripts/reset-db.ts`). |
| `pnpm studio` | Open Drizzle Studio. |
| `pnpm test` | Run all Vitest suites against `TEST_DATABASE_URL`. |
| `pnpm test:watch` | Vitest in watch mode. |
| `pnpm typecheck` | `tsc --noEmit`. |

## Schema overview

17 tables in the `public` schema:

| Group | Tables |
|---|---|
| Productions | `productions`, `production_formats`, `studios`, `production_studios` |
| People & roles | `people`, `roles`, `crew_assignments` |
| Equipment | `equipment_manufacturers`, `equipment_series`, `equipment_items` |
| Scenes & gear usage | `scenes`, `equipment_usage` |
| Sources & attributions | `sources`, `production_sources`, `scene_sources`, `crew_assignment_sources`, `equipment_usage_sources` |

Full schema design: `docs/superpowers/specs/2026-04-30-data-layer-design.md`.

## Conventions

- **Inter-schema imports use `.ts` extensions.** drizzle-kit's CJS loader can't resolve `.js` re-exports to `.ts` source files. `tsconfig.json` has `allowImportingTsExtensions: true` to permit this.
- **Re-exports in `src/schema/index.ts` use `.js` extensions** (the standard NodeNext convention for runtime consumers).
- **FK columns to `bigserial` PKs use `bigint('col', { mode: 'number' })`.** `smallint` for FKs to `roles.id` (smallserial).
- **Slugs everywhere.** Public-facing entities have a `text UNIQUE NOT NULL slug` column. IDs never leak past the API boundary.
- **Hard deletes only.** No `deleted_at` columns. Cascade behavior per spec §4.4.
- **No fact ships unsourced.** Every claim row has at least one row-level source attached via the four `_sources` join tables.
- **JSONB specs validated by Zod.** `equipment_items.specs` is JSONB; the seed loader and any future write path call `validateSpecs(category, specs)` from `src/schema/specs/`.

## Test suites

Four Vitest files, all running serially against `bts_test`:

| File | What it tests |
|---|---|
| `tests/specs.test.ts` | Zod validators for `equipment_items.specs` (5 tests). |
| `tests/cascades.test.ts` | Direct-edge + transitive FK cascade behavior (16 tests). |
| `tests/killer-queries.test.ts` | The three regression-contract queries from spec §1.3 (3 tests). |
| `tests/migrations.test.ts` | Forward + idempotent migration sanity (2 tests). |

Total: **26 tests.**

`vitest.config.ts` sets `fileParallelism: false` because all four files share one `bts_test` instance — concurrent file execution causes schema-reset races.

## Adding a new table

1. Create `src/schema/<name>.ts`. Use `.ts` extensions for any inter-schema imports.
2. Add `export * from './<name>.js';` to `src/schema/index.ts` (`.js` here — runtime consumer convention).
3. `pnpm generate` to produce a migration.
4. `pnpm migrate` to apply.
5. Smoke-test with a temporary `src/_smoke.ts` (insert a row, verify, delete).
6. Add cascade-matrix coverage to `tests/cascades.test.ts` if the new table is a parent or child in the FK graph.
7. Commit migration files alongside the schema file (the SQL migration AND the `meta/<NNNN>_snapshot.json`, per drizzle-kit's journal-tracked convention).

## Adding a custom (non-schema) migration

For triggers, custom indexes, or anything drizzle-kit doesn't generate:

```bash
pnpm exec drizzle-kit generate --custom --name <descriptive_name>
```

This scaffolds an empty migration file AND adds it to `migrations/meta/_journal.json`. Edit the SQL inside; use `--> statement-breakpoint` to separate independent statements (function declarations vs DO blocks etc).

## Killer queries (the regression contract)

Three reference queries pin the schema's correctness. They live in `src/queries/killer-queries.ts` and are exercised by `tests/killer-queries.test.ts`. If a schema change breaks one of them, the schema is wrong, not the test.

1. **Q1**: every theatrical feature shot on ALEXA 65 with Panavision Sphero anamorphic, sorted by DP. Expected for v1 seed: at least *The Revenant*.
2. **Q2**: lenses used by a given DP on a given production (e.g. Greig Fraser on *Dune: Part Two*). Expected: includes ARRI Rental DNA LF Vintage Primes.
3. **Q3**: every magic-hour exterior in a given year by lighting fixture (e.g. 2023 features). Expected: ≥1 row.

## Out of scope (v1)

- TMDb / IMDb / Wikidata sync
- EPK ingestion pipeline
- Algolia / full-text search
- Auth, subscriptions, multi-user editing
- HTTP API layer
- Web app, design system, interactive components
- Asset modeling
- `vfx_workflow` table
- Smart Lens Metadata, Sensor Analytics, Emulsion Physics tables (specs live in JSONB; promote when query patterns demand)
