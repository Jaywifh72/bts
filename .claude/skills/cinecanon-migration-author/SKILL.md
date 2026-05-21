---
name: cinecanon-migration-author
description: Authors a new Postgres migration for the bts monorepo following the strict numeric-ordering, idempotency, and Drizzle conventions — and pairs it with the matching schema module. Use when the user wants to add or alter a table or column, says "new migration", "add a column", "alter table", "migration NNNN", or any database schema change to CineCanon.
---

# cinecanon-migration-author

## What this skill is

The procedure for writing one migration safely. CineCanon has 91 migrations
under strict numeric order (through `0094`); a single skipped number or a
non-idempotent statement can wedge a deploy. This skill makes a migration
boring.

## When this skill triggers

- "New migration" / "add a column to `<table>`" / "alter `<table>`"
- "Migration `NNNN`" / any schema change
- Called by `cinecanon-entity-scaffolder` for its migration step

## Procedure

### 1. Number it

- `ls packages/db/migrations` — take the highest `NNNN` and add one.
- **Never skip, never reuse.** The ordering is load-bearing.
- Name: `NNNN_<short_snake_case>.sql`.

### 2. Write it to convention

- PKs: `gen_random_uuid()`.
- Time columns: `timestamptz` with `default now()`.
- Idempotent: `create table if not exists`, `create index if not exists`,
  `alter table ... add column if not exists`, `on conflict do nothing` for any
  seed-style inserts. Re-running the migration must be safe.
- Vectors: `vector(1536)`; HNSW index with `vector_cosine_ops`.
- FKs: explicit `on delete` behavior, matching sibling tables.
- AEO observatory tables stay namespaced `aeo_*`.

### 3. Mirror it in the schema

- Update `packages/db/src/schema/<domain>.ts` to match the migration exactly —
  one schema file per domain. A migration without its schema change is half a
  change.

### 4. Plan the deploy window

- If app code referencing the new columns will deploy *before* the migration
  is applied to prod, the routes must project those columns as `NULL` until it
  lands (pattern: commits `a88fc0e2`, `2c003291`, `79535db8`). Note this
  explicitly so the route work accounts for it.
- Migrations apply to Neon prod via the `migrate.yml` workflow — they are not
  auto-applied on deploy.

### 5. Verify

- `pnpm db:migrate` against the local Docker Postgres, then `pnpm db:test`.
- Run `cinecanon-ship-checklist`.

## Guardrails

- Don't edit an already-applied migration — write a new one.
- Don't put credentials or environment-specific values in a migration.
- Don't run long batch backfills on the web app's connection pool.

## Finish

Append to `vault/learnings/cinecanon-migration-author.md`: the migration
number, what it changed, any deploy-window coordination it required.
