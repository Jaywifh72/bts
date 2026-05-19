# Integration Notes — CineCanon-Sentinel ↔ bts repo

What infrastructure to reuse, what to add, and where the surgical seams are.

## Reuse, don't reinvent

The existing `bts` codebase has eight pieces of infrastructure that the AEO observatory should reuse rather than rebuild. Reinventing them creates two sources of truth and guarantees they'll drift.

### 1. Drizzle + Postgres (not Supabase)

**What the v1 design assumed:** Supabase with RLS, row-level security policies, `auth.uid()` references.

**What's actually here:** Plain Postgres via Drizzle, in `packages/db`. 90 existing migrations. pgvector enabled (migration 0021). No RLS, no Supabase.

**Implication:**
- AEO tables live in the same Postgres DB as `productions`, `crew`, `claims`, etc.
- Migration goes in `packages/db/migrations/0091_aeo_observatory.sql` and `0092_ask_query_log.sql` (see `patches/`).
- TypeScript schema definitions in `packages/db/src/schema/aeo.ts` (new file, follows the pattern from `productions.ts`, `crew.ts`, `claims.ts`).
- Queries in `packages/db/src/queries/aeo/` (one file per surface).
- Auth is handled at the Next.js layer (NextAuth + drizzle-adapter); the AEO observatory's admin views go under `/admin/(authenticated)/aeo/` which inherits the existing auth boundary.

**Connection pooling concern:** the existing `next.config.mjs` caps build concurrency because of a small Postgres pool. The AEO observatory's daily cycle must:
- Run outside of build windows (cron at 06:00 ET is well clear)
- Use a separate connection pool (a second Neon pooler endpoint, or PgBouncer's transaction-mode pool, dedicated to AEO ingest)
- Cap concurrent connections at 5 per agent to leave headroom for any user traffic

### 2. pgvector with `text-embedding-3-small` (already in use)

**What's here:** Migration 0021 enables pgvector. Migration 0030 adds keyframe embeddings. Migration 0053 versions the embedding model. The `/ask` route already calls OpenAI's `text-embedding-3-small` and uses cosine similarity.

**Reuse for AEO:**
- `aeo_prompts.text_embedding vector(1536)` — same dimension
- `ask_query_log.query_embedding vector(1536)` — same dimension
- HNSW index with `vector_cosine_ops` — same pattern as the existing vector indexes
- `prompt-curator` dedup uses `<->` (cosine distance) just like `getSemanticallySimilar`

The embedding cost is small because we cache aggressively. The query embedder is the same one already running on `/ask`, so warm cache hits are free.

### 3. `@upstash/ratelimit` + `@upstash/redis` (existing deps)

**What the v1 design assumed:** Roll our own rate limiter in the engine-poller agent.

**What's actually here:** Upstash is wired into the app already.

**Reuse:**
- Engine-poller wraps API calls with a Ratelimit instance per engine
- The same Redis can hold judge-cache entries for hot pages (Citation Precision judge results), backing the `aeo_judge_cache` Postgres table with a faster lookup
- Outreach-target dedup uses Upstash sets (no need for a DB table)

```ts
import { Ratelimit } from '@upstash/ratelimit';
import { redis } from '@/lib/redis';

const enginePollerLimits = {
  chatgpt:    new Ratelimit({ redis, limiter: Ratelimit.tokenBucket(5, '1 m', 5) }),
  claude:     new Ratelimit({ redis, limiter: Ratelimit.tokenBucket(8, '1 m', 8) }),
  perplexity: new Ratelimit({ redis, limiter: Ratelimit.tokenBucket(10, '1 m', 10) }),
  gemini:     new Ratelimit({ redis, limiter: Ratelimit.tokenBucket(5, '1 m', 5) }),
  ai_overview:new Ratelimit({ redis, limiter: Ratelimit.tokenBucket(3, '1 m', 3) }),
};
```

### 4. Sentry (already configured)

**What the v1 design assumed:** Roll our own alerting via Telegram.

**What's actually here:** `@sentry/nextjs` is configured.

**Reuse:**
- Failure alerts in the engine-poller and citation-extractor go through Sentry with tags `{ surface: 'aeo', agent: '...', engine: '...' }`
- Telegram stays as the digest channel (daily summary) and human-facing notifications
- Sentry's release tracking lets `learnings-synthesizer` correlate AEO metric shifts with deploys

```ts
import * as Sentry from '@sentry/nextjs';

try {
  await pollEngine(...);
} catch (err) {
  Sentry.captureException(err, {
    tags: { surface: 'aeo', agent: 'engine-poller', engine: 'chatgpt' },
    extra: { cycleId, promptId, sampleIndex },
  });
  throw err;
}
```

### 5. The existing claims data model

**What's here:**
- `0033_claims.sql` — claims table
- `0034_source_taxonomy_and_evidence.sql` — sources + evidence
- `0061_claim_entity_types_extension.sql` — entity types
- Query helpers: `getClaimsForProduction`, `getSourcesForClaims`, `getEvidenceForClaims`
- Page routes: `/claims`, `/claims/[id]`, `/admin/(authenticated)/claims`

**Implication for ClaimReview emission:**
The hard work — modeling, sourcing, grading, evidence-linking — is **already done**. The AEO patch is roughly: read what's already loaded into `films/[slug]/page.tsx`, filter by grade ≥ T7-5, emit Schema.org ClaimReview.

No new tables. No new queries. ~50 lines in `lib/jsonLd.tsx` + ~10 lines in each affected page. See `patches/claimreview.md`.

### 6. The existing JSON-LD pattern

**What's here:** `apps/web/lib/jsonLd.tsx` with builders for `Movie`, `Person`, `Product`, `Organization`, `BreadcrumbList`, `CreativeWork (scene)`, `Article (stunt sequence)`, `ImageObject`, `VideoObject`, plus a generic `<JsonLd>` component.

**Reuse:** Add `buildClaimReviewJsonLd` next to the others. Don't create a separate schema-generation file.

### 7. The `/admin/(authenticated)` surface

**What's here:** authenticated admin routes for audit, claims, corrections, curate, evidence, health, ingest/runs, keyframes, media, sources, users, video-timestamps, videos.

**Reuse for AEO:**
- New route group `/admin/(authenticated)/aeo/` with sub-pages:
  - `/admin/aeo` — daily digest view (replicates the Telegram digest in the UI)
  - `/admin/aeo/precision` — per-page Citation Precision history with sparklines
  - `/admin/aeo/interventions` — pending PRs, day-14/day-28 decision queue
  - `/admin/aeo/earned-media` — outreach briefs with status tracking
- Reuses existing NextAuth boundary; no new auth code
- Emits audit-log entries to `/admin/audit` via the existing pattern

This is **not** required for Phase 0 (digest in Telegram alone is fine to start), but it's the natural home as the system matures.

### 8. The `/api/v1` surface

**What's here:** Discovery doc at `/api/v1`, route handlers at `/api/v1/productions/[slug]` and `/api/v1/crew/[slug]`. CC-BY 4.0. CORS open. Edge-cached.

**Reuse:**
- Add `/api/v1/aeo/precision` (read-only public Precision feed) — partners and AI engines can poll this directly
- Add `/api/v1/aeo/claims` — high-confidence claims feed, filterable by grade
- Add `/api/v1/aeo/digest.xml` — Atom feed of recent precision wins and ClaimReview emissions

These extend the existing API contract (`_meta.license: 'CC-BY 4.0'`, edge-cache, attribution required). No new pattern.

## Add, don't piggyback

Some things genuinely need to be new because nothing in the existing repo addresses them:

### Engine-API credentials

`OPENAI_API_KEY` already exists (used by `/ask`). Add the rest:

```
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
GOOGLE_AI_API_KEY=...
SERPAPI_KEY=...                          # For Google AI Overviews
AEO_JUDGE_MODEL=claude-opus-4-6          # Citation Precision judge
AEO_NEON_POOLER_URL=postgres://...       # Dedicated pool for AEO ingest
```

### Hermes orchestrator config

Hermes lives outside the bts repo. The `HERMES_ORCHESTRATOR.md` system prompt goes to your Hermes agent registry. The Hermes side authenticates to the bts Postgres via the dedicated pool URL.

### Telegram binding

If Hermes doesn't have a Telegram binding yet:
```
hermes binding add telegram --token $TELEGRAM_BOT_TOKEN --chat-id $CHAT_ID
```

### Cron schedule

The daily 06:00 ET cycle runs in Hermes, not Vercel Cron. Vercel Cron is fine for short jobs but the AEO cycle takes ~30 minutes and exceeds Vercel's serverless timeout. Run it from the Hermes host.

If Hermes is unavailable for any reason, a fallback is a GitHub Actions workflow on `schedule: 0 6 * * *` that runs `claude code --skill cinecanon-sentinel "run today's cycle"`. Slower but reliable.

## Surgical seams (where to actually patch)

In order of leverage:

1. **`apps/web/lib/jsonLd.tsx`** — add `buildClaimReviewJsonLd` + `shouldEmitClaimReview` (see `patches/claimreview.md`). ~50 lines.

2. **`apps/web/app/films/[slug]/page.tsx`** — emit ClaimReview for high-confidence claims (see `patches/claimreview.md`). ~10 lines.

3. **`apps/web/app/ask/page.tsx`** — fire-and-forget logging to `ask_query_log` (see `patches/ask-logging.md`). ~15 lines + 1 new query helper.

4. **`packages/db/migrations/0091_aeo_observatory.sql`** — new file, copy from `patches/0091_aeo_observatory.sql`.

5. **`packages/db/migrations/0092_ask_query_log.sql`** — new file, copy from `patches/0092_ask_query_log.sql`.

6. **`packages/db/src/schema/aeo.ts`** — new file with Drizzle table definitions matching the SQL.

7. **`packages/db/src/queries/aeo/`** — new directory with query helpers.

8. **`apps/web/app/llms.txt`** — already exists as a route file. The `entity-graph-curator` agent will own its weekly regeneration (see `references/llms_txt_template.md`).

9. **`CLAUDE.md`** at repo root — new file, copy from `patches/CLAUDE.md`. None exists today.

10. **`/dossiers/[slug]`, `/walkthroughs/[slug]`, `/decisions/[slug]`, `/partnerships/[slug]`** — same ClaimReview pattern as `/films/[slug]`, applied in Phase 2.

## What stayed identical from v1

The math (Princeton metrics, bootstrap CIs, judge-LLM faithfulness scoring), the 4-loop architecture (inner/daily/weekly/monthly), the 7-agent split, the intervention catalog and effect sizes, the competitor pool tracking — none of that changed.

The change is purely storage and integration. v1 was design-doctrine-correct; v2 is design-doctrine-correct *and* lands cleanly in your actual repo without inventing parallel systems.
