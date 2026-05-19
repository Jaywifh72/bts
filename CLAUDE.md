# Repository: `bts` — CineCanon

A working reference for cinematic technical craft. Behind-the-scenes technical metadata for working camera-department professionals.

## Stack at a glance

- **pnpm monorepo** (`packageManager: pnpm@10.33.2`)
- **`apps/web`** — Next.js 16 + React 19 (App Router, Server Components, Server Actions)
- **`packages/db`** — Drizzle ORM over Postgres + pgvector
- **`packages/scraper`** — Python scrapers (TMDb, MusicBrainz, Wikidata, RSS, social, Wayback) for data ingestion
- **Auth:** NextAuth 5 (beta) with `@auth/drizzle-adapter`
- **Cache/rate-limit:** `@upstash/ratelimit` + `@upstash/redis`
- **Errors:** `@sentry/nextjs`
- **Hosting:** Vercel (build config tuned to a small Postgres connection pool)

## Workflow commands

```bash
pnpm web:dev               # Next.js dev server
pnpm web:build             # Production build
pnpm web:typecheck         # tsc --noEmit on apps/web
pnpm web:lint              # ESLint on apps/web
pnpm typecheck             # Both packages
pnpm lint                  # Lint web
pnpm db:test               # Drizzle test suite
pnpm db:migrate            # Run pending migrations
pnpm db:seed               # Seed dev DB
pnpm db:studio             # Open Drizzle Studio
```

## Conventions

### Database (Drizzle, Postgres + pgvector)

- **Migrations** live in `packages/db/migrations/NNNN_name.sql` — strict numeric ordering. Don't skip numbers.
- **Schema** in `packages/db/src/schema/` (one file per domain — `productions.ts`, `crew.ts`, `claims.ts`, etc.)
- **Queries** in `packages/db/src/queries/` (one file per surface — `getProductionWithFullDetail`, `getClaimsForProduction`, etc.)
- **Always use `gen_random_uuid()`** for PKs (matches all 90 existing migrations).
- **Always use `timestamptz`** for time columns with `default now()`.
- **Vector embeddings** are 1536-dim (`text-embedding-3-small` from OpenAI). Use HNSW indexes with `vector_cosine_ops`.
- **Build-time concern:** the Next.js build runs `generateStaticParams` over thousands of slugs and each page hits ~19 queries. Don't write code that fans out heavy queries at build time — Postgres pool is small. Use ISR with `revalidate = 86400` for film/crew detail pages.

### Next.js (App Router + React 19)

- **Server Components are the default.** Use `'use client'` only where interactivity demands it.
- **`params` are async**: `props: { params: Promise<{ slug: string }> }`, then `await props.params` inside the handler. Same for `searchParams`.
- **Route handlers** at `app/api/v1/.../route.ts` with `export const runtime = 'nodejs'` (we use the Node runtime for full DB access).
- **All `/api/v1` endpoints** are public, CC-BY 4.0, edge-cached `s-maxage=300, stale-while-revalidate=3600`, with CORS open.
- **JSON-LD** is centralized in `apps/web/lib/jsonLd.tsx`. Use the `build*JsonLd` builders + the `<JsonLd>` component. Don't hand-roll structured data anywhere else.
- **Path alias** is `@/*` → `./*` (App Router root).
- **Brand styling** uses CSS variables `--cc-paper`, `--cc-amber`, `--cc-ink` exposed as Tailwind utilities `cc-paper`, `cc-amber`, `cc-ink`. Fonts: Inter (sans), DM Serif Display (serif).

### Confidence grading

- Editorial claims use **T7-1 through T7-7** grades — `claims` table, `claim_entity_types_extension` migration `0061`.
- T7-1..T7-3 are "Verified" (primary, trade, academic).
- T7-4 is "Confirmed" (cross-referenced secondary).
- T7-5 is "Reported" (single secondary).
- T7-6 is "Reported — Community" (forum/community).
- T7-7 is "Uncertain" (explicitly marked).
- **Only T7-1 through T7-5 should be emitted as Schema.org ClaimReview** — see `lib/jsonLd.tsx::shouldEmitClaimReview`.

### Error handling

- **Sentry first.** Errors go through `@sentry/nextjs`. The auto-instrumentation captures unhandled exceptions; for caught errors that matter, call `Sentry.captureException` with tagged context.
- **Defensive try/catch on route handlers** — see commit `79152879 QC: defensive try/catch on 4 unprotected routes` for the pattern.
- **Routes that depend on un-applied migrations** project columns as NULL to keep prod green during the deploy window — see commits `a88fc0e2`, `2c003291`, `79535db8`.

### Public API

- **Stable surface**: `/api/v1/productions/{slug}`, `/api/v1/crew/{slug}`, `/api/v1` (discovery doc).
- **License**: CC-BY 4.0. Attribution required: *"Data courtesy of CineCanon"* with link back.
- **Rate-limited by edge cache only** (no Upstash gating on read endpoints; the cache absorbs traffic).
- **`_meta` block** on every response with `license`, `attribution`, `api_version`.

### TMDb attribution

Movie metadata is from TMDb. **Every page that surfaces TMDb-sourced data must carry the attribution footer**: *"Movie metadata courtesy of TMDb — this product uses the TMDb API but is not endorsed or certified by TMDb."*

## CineCanon-Sentinel (AEO/GEO observatory)

The AEO/GEO/SEO observatory lives at `.claude/skills/cinecanon-sentinel/`. It is operated by Hermes (`aeo-chief` agent, daily 06:00 ET) with 6 Claude Code subagents handling polling, scoring, schema, competitive tracking, content interventions, and weekly synthesis.

**Hero metric:** Citation Precision — when AI engines cite CineCanon, do they get the facts right? Brand promise is "every claim cited and confidence-graded"; a hallucinated citation is worse than no citation.

**Storage:** AEO observatory tables are namespaced `aeo_*` in the same Postgres database, migration `0091_aeo_observatory.sql` and onward. Same Drizzle conventions. Separate Neon pooler endpoint to avoid contention with the web app's build-time queries.

**Schema integration:** ClaimReview emission piggybacks on the existing claims data via `lib/jsonLd.tsx::buildClaimReviewJsonLd`. No parallel schema generation — just an additional builder alongside the existing ones.

**`/ask` flywheel:** the `ask_query_log` table (migration `0092_ask_query_log.sql`) is populated fire-and-forget from `/ask`. The `prompt-curator` agent ingests it nightly to grow the prompt bank from real working-pro intent.

See `.claude/skills/cinecanon-sentinel/SKILL.md` and `.claude/skills/cinecanon-sentinel/README.md` for details.

## Don't do these

- Don't add new JSON-LD code outside `lib/jsonLd.tsx`.
- Don't add console.log or console.error in production code paths — use Sentry.
- Don't share the web app's DB connection pool for long-running batch jobs.
- Don't write to `/api/v1` (it's read-only by design).
- Don't bypass the confidence-grade rubric. If a claim is T7-7, it's T7-7 — the UI shows it; structured data doesn't.
- Don't add `'use client'` to a page or layout unless interactivity demands it. Server Components are the default.
- Don't bypass the rate-limit cap in `next.config.mjs::experimental.cpus`. The Postgres pool is small.
- Don't include credentials in committed files. `.env.local` and Vercel env vars only.

## In flight (top of mind)

Per the most recent commits:
- Phase 4 decision-support tools just landed (`/tools/scoring-session-cost`, `/tools/stunt-rig-picker`, `/tools/hdr-target-picker`, `/tools/anamorphic-vs-spherical`).
- Phase 3 annotated walkthroughs (edit/cue/VFX-shot breakdowns) live at `/walkthroughs/[slug]`.
- Phase 2 craft dossiers at `/dossiers/[slug]` cover PD, costume, makeup-hair deep-dives.
- Hydration warning suppression added on `<html>`/`<body>` for browser-extension compatibility.

When adding AEO-observatory features, prefer integrating with these recent surfaces over creating new ones.
