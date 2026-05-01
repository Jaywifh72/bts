# BTS — Global Cinematic Technical Repository

Monorepo for a behind-the-scenes / technical filmmaking metadata platform. v1 ships only the data layer (`packages/db`); other layers (web app, search, ingestion, design system, monetization) are documented in `docs/superpowers/specs/` and arrive as separate sub-projects.

## Setup

1. Install Docker Desktop, Node 20+ (24+ also works), pnpm 10.
2. `pnpm install`
3. `cp .env.example .env`
4. `cp .env.example packages/db/.env` (the db package needs its own copy — pnpm scripts run with cwd inside the package)
5. `docker compose up -d` — starts Postgres 16 with `bts_dev` and `bts_test` databases.
6. `pnpm db:migrate` — applies migrations to `bts_dev`.
7. `pnpm db:seed` — populates `bts_dev` with v1 seed data (~30s).
8. `pnpm db:test` — runs all four test suites (26 tests).

## Repo layout

- `packages/db/` — Drizzle schema, migrations, seed, queries, tests.
- `docs/superpowers/specs/` — design specs.
- `docs/superpowers/plans/` — implementation plans.

## Specs and plans

- `docs/superpowers/specs/2026-04-30-data-layer-design.md` — v1 data layer design (the source of truth for schema decisions).
- `docs/superpowers/plans/2026-04-30-data-layer-plan.md` — the step-by-step implementation plan that produced this codebase.

## Useful root scripts

| Command | What it does |
|---|---|
| `pnpm db:migrate` | Apply Drizzle migrations to `bts_dev`. |
| `pnpm db:seed` | Idempotent seed of `bts_dev` (~30s). |
| `pnpm db:test` | Run all 4 test suites against `bts_test`. |
| `pnpm db:studio` | Open Drizzle Studio at http://localhost:4983. |

## Future sub-projects (not in v1)

| Sub-project | Will live at |
|---|---|
| Public web app | `apps/web/` |
| Algolia / search | `packages/search/` |
| TMDb / IMDb / Wikidata / EPK ingestion | `packages/ingest/` |
| Admin / editorial UI | `apps/admin/` |
| "Studio Pro" design system | `packages/ui/` |

Each gets its own brainstorm → spec → plan cycle.
