# CineCanon

A cinematography reference engine built for working professionals and the AI
search engines they increasingly trust. Per-scene gear attribution, lighting
plots with cinematographer motivation paragraphs, color pipelines, stunt
sequences, and the citation chain that backs every claim.

## What's here

A pnpm monorepo with three workspaces:

| Workspace | Purpose |
|---|---|
| `apps/web` | Next.js 16 App Router site — public dossiers + admin console |
| `packages/db` | Drizzle + Postgres schema, migrations, queries, seed, tests |
| `packages/scraper` | TMDb / Wikidata / RSS / social ingest pipelines |

## Stack

- **Runtime**: Next.js 16 + React 19 (App Router, RSC, ISR via `revalidate`)
- **DB**: Postgres 16 + pgvector + pg_trgm (Docker locally; Neon for prod — see `docs/runbooks/managed-postgres.md`)
- **ORM**: drizzle-orm + postgres-js
- **Embeddings**: SigLIP-2 (visual, 768-dim) + text-embedding-3-small (1536-dim), HNSW indexed
- **Rate limit**: Upstash Redis with in-memory fallback (`docs/runbooks/upstash-redis.md`)
- **Errors**: Sentry, opt-in via DSN (`docs/runbooks/sentry.md`)
- **CI**: GitHub Actions — typecheck, lint, vitest against Postgres-pgvector, build, Playwright E2E

## Local development

```bash
# Prereqs: Node 22+, pnpm 10, Docker Desktop
pnpm install

# Start Postgres
docker compose up -d postgres

# Migrate + seed
pnpm --filter @bts/db migrate
pnpm --filter @bts/db seed

# Start the dev server
pnpm web:dev
# → http://localhost:3000
```

## Quality gates

```bash
pnpm typecheck                  # tsc --noEmit across all workspaces
pnpm lint                       # next lint (web)
pnpm --filter @bts/db test      # vitest against real Postgres
pnpm --filter @bts/web e2e      # Playwright smokes (dev server must be running)
```

All four run automatically on every push via `.github/workflows/ci.yml`.

## Layout

```
apps/web/
  app/                  # Next.js routes
    admin/              # Curation + review console (token-auth)
    api/                # Public + internal API + CSV export + lookbook search
    films/[slug]/       # Per-production dossier
    crew/[slug]/        # Per-person dossier
    gear/.../           # Manufacturer → series → item
    for-{dps,colorists,coordinators,gaffers}/             # Role landing pages
    {sound,editing,music,production-design,
     costume-hair-makeup}/                                # Discipline pages
    {locations,awards,decades,shots,lookbook,methodology}/  # Cross-cuts
  components/           # Server + client components
  e2e/                  # Playwright smoke spec
  lib/                  # jsonLd, rate-limit, site, tmdb-image, etc.

packages/db/
  migrations/           # SQL migrations (0001 → 0094, strict numeric order)
  src/
    schema/             # Drizzle schema modules
    queries/            # Read paths
    seed/               # Curated seed data
    tests/              # vitest specs

packages/scraper/
  src/
    tmdb/               # Person + production enrichment
    wikidata/           # SPARQL ingest (awards, education)
    rss/, newsletter/   # Cinematography.com, AC Magazine, ICG, etc.
    social/             # IG/X/Threads citation normalisation
    vfx-studios/        # 60+ post-houses
    wayback/            # Link-rot archive + health
    embeddings/         # Visual + text embedding generators (Modal Python)
```

## Deferred wiring

Some production infrastructure needs credentials that aren't in this repo.
Each has a self-contained runbook:

- [`docs/runbooks/sentry.md`](docs/runbooks/sentry.md) — error tracking
- [`docs/runbooks/upstash-redis.md`](docs/runbooks/upstash-redis.md) — rate-limit backend
- [`docs/runbooks/managed-postgres.md`](docs/runbooks/managed-postgres.md) — Neon cutover
- [`docs/runbooks/siglip2-inference.md`](docs/runbooks/siglip2-inference.md) — Modal-hosted encoder for `/lookbook`

## Documentation

- `CLAUDE.md` — project conventions + the Agentic OS map and skills index
- `vault/` — the project memory vault; start at `vault/README.md`
- `docs/superpowers/plans/` — strategy and roadmap docs
- `docs/runbooks/` — deployment runbooks

## License

Private. © 2026.
