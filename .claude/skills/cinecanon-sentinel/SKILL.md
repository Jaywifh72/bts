---
name: cinecanon-sentinel
description: Self-evolving multi-agent AEO/GEO/SEO observatory for cinecanon.com, integrated against the bts pnpm monorepo (Next.js 16 + Drizzle + Postgres + pgvector). Runs daily Citation-Precision-first measurement across ChatGPT, Claude, Perplexity, Gemini, and Google AI Overviews; propagates confidence-graded claims (T7-1..T7-5) into ClaimReview JSON-LD via the existing lib/jsonLd.tsx; ingests /ask query log as a prompt-bank flywheel; tracks IMDb Pro / fxguide / ASC / Wikipedia citation competition. Use this skill whenever the user mentions CineCanon SEO, AEO, GEO, AI visibility, share of answer, ChatGPT citing CineCanon, Perplexity rankings for cinematography queries, schema markup, ClaimReview, the /ask log, the /api/v1 surface, or wants the AEO system to run a cycle. Also trigger for "run sentinel", "AEO cycle", "score this dossier", "did the AI get the lens package right", "check our AI citation precision", "ship ClaimReview on the X dossiers", or any request touching CineCanon's search/AI surface.
---

# CineCanon-Sentinel v2: AEO Observatory for cinecanon.com

## What this skill is

A single-site AEO/GEO system grounded in Princeton GEO-bench (KDD 2024) and the IQRush 2026 distribution-sampling work, **integrated against the bts monorepo**: pnpm + Next.js 16 + Drizzle on Postgres + pgvector + Upstash + Sentry + NextAuth.

Key design difference from v1: rather than build a parallel storage layer (Supabase), parallel schema generators (separate JSON-LD), and parallel alerting (custom Telegram), v2 **piggybacks on what's already in the repo**:

- Storage → existing Drizzle/Postgres (new migrations `0091_*` and `0092_*`)
- Schema → existing `lib/jsonLd.tsx` (new builder, same pattern)
- Claims → existing `0033_claims.sql` + `getClaimsForProduction` (just read what's loaded)
- /ask flywheel → existing `/ask` server component (one fire-and-forget log call)
- Rate limiting → existing `@upstash/ratelimit`
- Alerting → existing `@sentry/nextjs` (with Telegram as digest channel only)
- Embeddings → existing `text-embedding-3-small` + pgvector HNSW indexes

**Hero metric:** Citation Precision. CineCanon's brand is *"every claim cited and confidence-graded."* The Claude Opus 4.6 LLM-judge step that scores faithfulness 0/1/2 is the centerpiece, not the audit step.

## The four loops

1. **Inner (per prompt × engine):** N=5 samples, bootstrap CIs
2. **Daily:** poll → score → diff → intervene
3. **Weekly:** every agent's `learnings.md` becomes input to the synthesizer
4. **Monthly:** AutoMaAS-style architectural review

## Architecture in one diagram

```
                    ┌─ HERMES (frontier-API, daily 06:00 ET) ─┐
                    │                                          │
Hermes::aeo-chief — uses AEO_NEON_POOLER_URL (separate DB pool)
                    │                                          │
                    └───────────────────┬──────────────────────┘
                                        │ delegates via Task tool
                    ┌───────────────────▼──────────────────────┐
                    │   CLAUDE CODE SUBAGENTS                  │
                    │   (in .claude/skills/cinecanon-sentinel/)│
                    │                                          │
   ├──► prompt-curator
   │      ├─ reads ask_query_log (NEW: migration 0092)
   │      ├─ embeds via text-embedding-3-small (REUSES existing)
   │      ├─ deduplicates via pgvector HNSW (REUSES existing pattern)
   │      └─ writes to aeo_prompts table (NEW: migration 0091)
   │
   ├──► engine-poller (5 parallel: chatgpt, claude, perplexity, gemini, ai_overview)
   │      ├─ rate-limited via @upstash/ratelimit (REUSES existing)
   │      ├─ errors via @sentry/nextjs (REUSES existing)
   │      └─ writes to aeo_response_observations (NEW)
   │
   ├──► citation-extractor
   │      ├─ Princeton metrics with **Citation Precision as hero**
   │      ├─ Claude Opus 4.6 judge with aeo_judge_cache (NEW)
   │      └─ writes to aeo_citation_scores + aeo_daily_metrics (NEW)
   │
   ├──► entity-graph-curator
   │      ├─ Validates JSON-LD on curated dossiers (REUSES lib/jsonLd.tsx)
   │      ├─ Drafts ClaimReview PRs (uses NEW buildClaimReviewJsonLd builder)
   │      ├─ Owns `/admin/aeo` views (Phase 4)
   │      └─ Weekly SSR sanity check (curl with bot UAs)
   │
   ├──► citation-landscape-watcher
   │      └─ Tracks 10 pools (IMDb Pro, Wikipedia, fxguide, ASC, etc.)
   │
   ├──► content-optimizer
   │      └─ Princeton interventions retuned for cinema
   │
   └──► learnings-synthesizer
          └─ Weekly synthesis + monthly architecture review
                    │                                          │
                    └───────────────────┬──────────────────────┘
                                        ▼
                       AEO observatory tables (aeo_* in same Postgres)
                       Digest → Telegram. Failures → Sentry.
```

## When this skill triggers

- Anything CineCanon + (SEO | AEO | GEO | AI visibility | citations | rankings | schema)
- "Run the sentinel", "AEO cycle", "weekly synthesis", "monthly review"
- "Did ChatGPT/Claude/Perplexity/Gemini get [X] right" — Citation Precision check
- "Apply the ClaimReview patch", "ship ClaimReview on Phase 2 dossiers"
- "What's our share of answer on [topic]"
- Anything touching `/ask`, `/queries`, `/api/v1`, `/digest.xml`, `/references`
- Schema, structured data, JSON-LD, sameAs questions for cinecanon.com
- Requests to investigate competitor citation gaps (IMDb Pro, fxguide, ASC, Wikipedia)

## Quick-start

```bash
# Run today's full cycle
claude code --skill cinecanon-sentinel "run today's cycle"

# Single-phase invocations
claude code --skill cinecanon-sentinel "poll engines only"
claude code --skill cinecanon-sentinel "score precision on /films/the-brutalist-2024 for the last 14 days"
claude code --skill cinecanon-sentinel "weekly synthesis"
claude code --skill cinecanon-sentinel "what claims about The Brutalist are AI engines getting wrong"

# Apply v2 patches against the bts repo
claude code --skill cinecanon-sentinel "apply the ClaimReview patches in order — first the builder, then films/[slug]"
claude code --skill cinecanon-sentinel "apply the /ask logging patch"
```

## Stack-specific protocols

### Always typecheck and lint after a patch

The bts repo runs strict TypeScript. After any code patch:

```bash
pnpm web:typecheck
pnpm web:lint
```

If either fails, the agent fixes before continuing. Never push broken types.

### Database queries follow the existing pattern

- Queries live in `packages/db/src/queries/aeo/`
- Schema definitions in `packages/db/src/schema/aeo.ts`
- Use the existing Drizzle `db` instance
- AEO operations use the dedicated `AEO_NEON_POOLER_URL` to avoid contention with web app

### JSON-LD goes through `lib/jsonLd.tsx`

Never hand-roll Schema.org outside this file. If a new entity type needs JSON-LD, add a `build*JsonLd` function next to the existing nine builders. The agent enforces this; if a PR creates schema generation elsewhere, the agent flags it.

### Errors go to Sentry, digests to Telegram

The pattern:

```ts
import * as Sentry from '@sentry/nextjs';

try {
  await engineCall(...);
} catch (err) {
  Sentry.captureException(err, {
    tags: { surface: 'aeo', agent: 'engine-poller', engine },
    extra: { cycleId, promptId },
  });
  throw err;
}
```

Daily Telegram digest is the *summary*. Real-time failures go through Sentry — same channel ops already monitors.

### Confidence grades drive ClaimReview emission

- T7-1, T7-2, T7-3 → `reviewRating.ratingValue: 5`
- T7-4 → `ratingValue: 4`
- T7-5 → `ratingValue: 3`
- T7-6, T7-7 → **NOT emitted as structured data** (UI badge only)

Always call `shouldEmitClaimReview(grade)` before emitting.

### ISR-aware intervention timing

`/films/[slug]` has `revalidate = 86400`. Content interventions take up to 24h to propagate to ISR cache. The 14/28-day decision rules account for this — Day 1 effectively starts after the first revalidation, not at merge time.

For urgent fixes, the agent can trigger on-demand revalidation via the existing pattern (no new code needed; same Next.js `revalidatePath` action surface used by the editorial team).

### Public API extensions follow the v1 contract

If adding `/api/v1/aeo/precision` or similar endpoints (Phase 4):
- CC-BY 4.0 license
- CORS open
- Edge cache `s-maxage=300, stale-while-revalidate=3600`
- `_meta` block with `license`, `attribution`, `api_version`
- `runtime = 'nodejs'`

## Daily cycle (timing unchanged from v1)

1. **06:00 ET** — Hermes::aeo-chief reads yesterday's learnings, sets focus tag
2. **06:05** — prompt-curator pulls last 24h from `ask_query_log`, proposes up to 3 new prompts
3. **06:10–06:50** — 5 engine-pollers run in parallel; ~100 prompts × N=5 = 500 calls each
4. **06:50** — citation-extractor scores with Opus 4.6 judge
5. **07:00** — citation-landscape-watcher computes pool deltas
6. **07:10** — entity-graph-curator daily spot-check on 10 random curated dossiers
7. **07:20** — content-optimizer drafts intervention PRs (max 2 interventions per PR)
8. **08:00** — Telegram digest via Hermes binding

## Weekly cycle (Sundays 21:00 ET)

1. Full daily cycle first
2. entity-graph-curator runs full SSR sanity check on all 55 curated dossiers
3. citation-landscape-watcher runs Friday-style earned-media sweep
4. learnings-synthesizer reads `learnings/*.md` from past 7 days, opens skill-update PR
5. llms.txt regenerated with top-50-cited-pages section refreshed

## Monthly cycle (first Sunday)

Weekly synthesis + AutoMaAS architectural review:
- Which agents fired? Which never fired?
- Cost-per-precision-point-gained per agent
- Fuse/eliminate/generate proposals
- Posted to Google Drive monthly review doc + Telegram

## File map

See `README.md` for the full file map. Critical reads in order:

1. `references/integration_notes.md` — what to reuse from bts repo
2. `patches/CLAUDE.md` — proposed root CLAUDE.md for the repo
3. `patches/claimreview.md` — highest-leverage patch
4. `patches/ask-logging.md` — flywheel prereq
5. `patches/0091_aeo_observatory.sql` — AEO storage
6. `patches/0092_ask_query_log.sql` — /ask log table

## What this skill is not

- Not a content generator
- Not a replacement for `/admin/(authenticated)/audit` or `/admin/health` — extends them
- Not auto-merge — every PR is human-reviewed
- Not a parallel storage system — everything lives in the existing Postgres

## Extension paths

To add a new engine: edit `references/engine_specs.md` + add a row to `aeo_engines` + add to engine-poller rotation.

To add a new competitor pool: edit `references/competitor_targets.md` + add to `aeo_citation_pools`.

To add a new intervention type: edit `references/cinema_interventions.md` with the source paper + effect size. content-optimizer refuses to apply anything without documented effect size.

To roll ClaimReview to a new surface: copy the `films/[slug]/page.tsx` pattern from `patches/claimreview.md` to the new page. The builder + `shouldEmitClaimReview` function don't need changes.
