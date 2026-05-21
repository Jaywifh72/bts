# Pattern: entity-type buildout

How CineCanon adds a new kind of dossier entity. Every "Phase 1–4" expansion in
the git history followed this recipe — `person_style_profiles`,
`practitioner_partnerships`, `craft_decision_trees`, the facility houses,
`production_craft_dossiers`, `annotated_walkthroughs`. Codified here so it runs
the same way every time. The `cinecanon-entity-scaffolder` skill executes it.

## The five steps, in order

1. **Migration** — `packages/db/migrations/NNNN_name.sql`.
   - Strict numeric order; do not skip numbers. Latest is `0094`.
   - PKs use `gen_random_uuid()`. Time columns are `timestamptz default now()`.
   - Idempotent where practical: `create table if not exists`,
     `create index if not exists`.
   - Vector columns are `vector(1536)` with HNSW + `vector_cosine_ops`.

2. **Schema** — `packages/db/src/schema/<domain>.ts`.
   - One Drizzle file per domain. Mirror the migration exactly.
   - Export the table and its inferred types.

3. **Queries** — `packages/db/src/queries/<surface>.ts`.
   - One file per read surface (e.g. `getProductionWithFullDetail`).
   - Keep build-time fan-out low: detail pages run ~19 queries each and the
     Postgres pool is small. Heavy reads must not run at build time.

4. **Routes** — `apps/web/app/...`.
   - Server Components by default; `'use client'` only where interactivity
     demands it. `params`/`searchParams` are async — `await` them.
   - Detail pages use ISR: `export const revalidate = 86400`.
   - JSON-LD goes through `apps/web/lib/jsonLd.tsx` builders only.
   - Any TMDb-sourced data carries the TMDb attribution footer.

5. **Seed** — `packages/db/src/seed/data/`.
   - Curated seed data, editorially deep for marquee entities.
   - Serialize Postgres array literals correctly (a recurring `fix(seed)` trap).

## Deploy-window safety

If routes ship before the migration is applied to prod, project the new
columns as `NULL` until the migration lands — keeps prod green during the
window. See commits `a88fc0e2`, `2c003291`, `79535db8` for the pattern.

## Always finish with the quality gate

`pnpm typecheck && pnpm lint && pnpm db:test`, then a build check. Use the
`cinecanon-ship-checklist` skill — never push broken types.
