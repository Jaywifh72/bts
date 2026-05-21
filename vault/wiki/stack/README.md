# Stack

Stack conventions and operational runbooks.

## Conventions

The authoritative conventions live in the root **`CLAUDE.md`** — database
(Drizzle / Postgres / pgvector), Next.js (App Router, React 19, Server
Components), the public `/api/v1` contract, JSON-LD centralization, error
handling, and TMDb attribution. Do not duplicate them here; read `CLAUDE.md`.

This folder is for stack knowledge that does **not** belong in `CLAUDE.md` —
longer-form explanation, history, "why it is this way" notes.

## Runbooks

Deploy and infrastructure runbooks currently live in **`docs/runbooks/`**:

- `deploy-cinecanon.md` — deploy procedure
- `managed-postgres.md` — Neon cutover
- `upstash-redis.md` — rate-limit backend
- `sentry.md` — error tracking
- `siglip2-inference.md` — Modal-hosted visual encoder for `/lookbook`

Migrating these into `vault/wiki/stack/` is a deliberate follow-up (see the
note in `vault/README.md`). Until then, `docs/runbooks/` is canon.

## Stack snapshot

- pnpm monorepo: `apps/web` (Next.js 16 / React 19), `packages/db` (Drizzle +
  Postgres 16 + pgvector + pg_trgm), `packages/scraper` (Python ingest).
- Auth: NextAuth 5. Cache/rate-limit: Upstash Redis. Errors: Sentry.
- Hosting: Vercel + managed Neon Postgres. CI: GitHub Actions.
