---
name: cinecanon-entity-scaffolder
description: Stands up a new dossier entity type in the bts monorepo end-to-end — Drizzle migration, schema module, query surface, Next.js routes, and curated seed — following the repeatable buildout recipe that every "Phase 1-4" expansion used. Use whenever the user wants to add a new kind of entity to CineCanon (a new facility type, a new craft profile, a new cross-cut), says "scaffold", "new entity type", "new table + routes", "Phase N", or references the migration + schema + queries + routes + seed pattern.
---

# cinecanon-entity-scaffolder

## What this skill is

The codified "new entity type" buildout. CineCanon grew through repeated
entity expansions — `person_style_profiles`, `practitioner_partnerships`,
`craft_decision_trees`, the facility houses, `production_craft_dossiers`,
`annotated_walkthroughs` — and every one followed the same five-step recipe.
This skill runs that recipe the same way each time so nothing is skipped.

Reference: `vault/wiki/patterns/entity-buildout.md`. Read it before starting.

## When this skill triggers

- "Add a new entity type / table / dossier kind to CineCanon"
- "Scaffold `<X>`" / "stand up `<X>` like the facility houses"
- "Phase `<N>`" content expansion
- Any request that implies migration + schema + queries + routes + seed together

## Procedure

### 0. Orient

- Read `vault/wiki/patterns/entity-buildout.md` and this skill's
  `vault/learnings/cinecanon-entity-scaffolder.md` (if it exists).
- Find the closest existing entity and use it as the template. Facility-type
  entities → copy a `*_houses` table; person-profile entities → copy
  `person_style_profiles`. Name the template explicitly to the user.
- Confirm the entity's fields, relationships, and which surfaces it appears on.

### 1. Migration

- Create `packages/db/migrations/NNNN_<name>.sql`. **NNNN is the next number
  after the current highest** — check `ls packages/db/migrations` first; do not
  skip or reuse numbers.
- PKs: `gen_random_uuid()`. Time columns: `timestamptz default now()`.
- Make it idempotent: `create table if not exists`, `create index if not exists`.
- Vector columns: `vector(1536)`, HNSW index with `vector_cosine_ops`.
- FKs reference existing tables; match the on-delete behavior of the template.

### 2. Schema

- Add `packages/db/src/schema/<domain>.ts` (or extend the right existing file —
  one file per domain). Mirror the migration column-for-column.
- Export the table and inferred select/insert types.

### 3. Queries

- Add `packages/db/src/queries/<surface>.ts` — one file per read surface.
- Keep build-time fan-out low: detail pages already run ~19 queries each and
  the Postgres pool is small. New heavy reads must not run at build time.

### 4. Routes

- Add the routes under `apps/web/app/...`. Server Components by default;
  `'use client'` only where interactivity demands it.
- `params` and `searchParams` are async — `await` them.
- Detail pages: `export const revalidate = 86400` (ISR).
- JSON-LD only via `apps/web/lib/jsonLd.tsx` builders. If the entity needs a
  new structured-data type, add a `build*JsonLd` function there — never
  hand-roll Schema.org elsewhere.
- If the entity surfaces TMDb-sourced data, include the TMDb attribution
  footer.

### 5. Seed

- Add curated seed data in `packages/db/src/seed/data/`. Editorially deep for
  marquee entities.
- Serialize Postgres array literals correctly (a recurring `fix(seed)` trap —
  text[] literals, not JS arrays).

### 6. Gate

- Run the `cinecanon-ship-checklist` skill: `pnpm typecheck`, `pnpm lint`,
  `pnpm db:test`, build check.
- If routes will deploy before the migration is applied to prod, project the
  new columns as `NULL` until the migration lands (commits `a88fc0e2`,
  `2c003291`, `79535db8`).

## Guardrails

- Never skip a migration number.
- Never add JSON-LD outside `lib/jsonLd.tsx`.
- Never add `'use client'` to a page/layout unless interactivity demands it.
- Confidence-graded claims obey the T7 rubric — see
  `vault/wiki/patterns/confidence-grading.md`.

## Finish

Append a dated entry to `vault/learnings/cinecanon-entity-scaffolder.md`: the
entity built, the template used, any trap hit (especially seed serialization
or build-time query fan-out).
