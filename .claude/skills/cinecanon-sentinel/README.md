# CineCanon-Sentinel v2

A self-evolving AEO/GEO/SEO observatory for cinecanon.com — integrated against the actual `bts` codebase.

## What's new in v2

v1 was design-doctrine-correct but assumed Supabase, no existing claims model, no `/ask` log, and no JSON-LD utilities. v2 integrates against the real stack:

| v1 assumed | Reality | v2 does |
|---|---|---|
| Supabase + RLS | Drizzle on plain Postgres | Drizzle migration `0091_aeo_observatory.sql` |
| Build a claims model | `0033_claims.sql` already exists with `getClaimsForProduction` | Reuse; emit ClaimReview from existing claims |
| Build JSON-LD utilities | `lib/jsonLd.tsx` has 9 builders | Add `buildClaimReviewJsonLd` next to them |
| `/ask` already logs | `/ask` doesn't log anything | Add `ask_query_log` table + 15-line patch to `ask/page.tsx` |
| Roll our own rate limiting | `@upstash/ratelimit` is a dep | Reuse it |
| Roll our own alerting | `@sentry/nextjs` is configured | Sentry for failures, Telegram for digests |
| Build vector dedup | pgvector + `text-embedding-3-small` already running | Reuse `vector(1536)` + HNSW |
| Site is `/ask`, `/queries`, `/films`, `/crew` | Also `/dossiers`, `/walkthroughs`, `/decisions`, `/partnerships`, `/tools/*` | Phase 2 expands ClaimReview to all five |
| One surface to instrument | `/admin/(authenticated)` is rich (audit, claims, sources, health) | Optional `/admin/aeo` route group in Phase 3 |

The math, architecture, agent count, intervention catalog, competitor pools, and Princeton metric definitions are unchanged. Only the integration layer.

## File map (v2)

```
cinecanon-sentinel-v2/
├── README.md                          # This file
├── SKILL.md                           # Claude Code master skill entry
├── HERMES_ORCHESTRATOR.md             # Hermes::aeo-chief system prompt
├── agents/                            # 7 agents (1 Hermes + 6 Claude Code) — same as v1
│   ├── prompt-curator.md
│   ├── engine-poller.md
│   ├── citation-extractor.md
│   ├── entity-graph-curator.md
│   ├── citation-landscape-watcher.md
│   ├── content-optimizer.md
│   └── learnings-synthesizer.md
├── references/
│   ├── integration_notes.md           # NEW — what to reuse from bts repo
│   ├── princeton_metrics.md           # Universal — unchanged
│   ├── geo_interventions.md           # Universal — unchanged
│   ├── cinema_interventions.md        # CineCanon-specific — unchanged
│   ├── engine_specs.md                # 5 engines — unchanged
│   ├── prompt_bank_schema.md          # 30 cinema starter prompts — unchanged
│   ├── competitor_targets.md          # 10 citation pools — unchanged
│   └── llms_txt_template.md           # Tailored to /api/v1, /digest.xml — unchanged
└── patches/                           # NEW — concrete diffs against bts repo
    ├── 0091_aeo_observatory.sql       # Drizzle migration for AEO tables
    ├── 0092_ask_query_log.sql         # Drizzle migration for /ask logging
    ├── claimreview.md                 # lib/jsonLd.tsx + films/[slug] patches
    ├── ask-logging.md                 # /ask logging patch
    └── CLAUDE.md                      # Proposed root CLAUDE.md (none exists)
```

## Install (against the real repo)

### 0. Prereqs

```bash
# Verify the bts repo state
cd C:\Dev\bts
pnpm install
pnpm typecheck     # baseline — must pass before AEO work begins
pnpm web:build     # baseline — must pass before AEO work begins
```

### 1. Drop the skill into the project's Claude Code config

```bash
mkdir -p C:\Dev\bts\.claude\skills
cp -r cinecanon-sentinel-v2 C:\Dev\bts\.claude\skills\cinecanon-sentinel

# Verify
cd C:\Dev\bts
claude code --list-skills | grep cinecanon-sentinel
```

### 2. Land the CLAUDE.md (none exists today)

```bash
cp .claude/skills/cinecanon-sentinel/patches/CLAUDE.md ./CLAUDE.md
git add CLAUDE.md
git commit -m "docs: add root CLAUDE.md with stack conventions"
```

This isn't AEO-specific — it documents the existing stack for any future Claude Code work. But the AEO skill references conventions defined here, so it's a prereq.

### 3. Apply the Drizzle migrations

```bash
# Copy the migration files
cp .claude/skills/cinecanon-sentinel/patches/0091_aeo_observatory.sql \
   packages/db/migrations/0091_aeo_observatory.sql

cp .claude/skills/cinecanon-sentinel/patches/0092_ask_query_log.sql \
   packages/db/migrations/0092_ask_query_log.sql

# Add the Drizzle TS schema files
# (Skill agents will draft these following the existing patterns in
#  packages/db/src/schema/productions.ts, claims.ts, etc.)

pnpm db:migrate
```

### 4. Apply the code patches

Apply in this order (each is independent, but order matches dependency):

```bash
# 4a. ClaimReview builder — adds capability without using it yet
claude code --skill cinecanon-sentinel \
  "apply the ClaimReview builder patch from patches/claimreview.md to apps/web/lib/jsonLd.tsx"

# 4b. /ask logging — must exist before prompt-curator starts ingesting
claude code --skill cinecanon-sentinel \
  "apply the /ask logging patch from patches/ask-logging.md"

# 4c. Emit ClaimReview from /films/[slug] — the high-leverage win
claude code --skill cinecanon-sentinel \
  "apply the ClaimReview emission patch to apps/web/app/films/[slug]/page.tsx"
```

After each patch, run:

```bash
pnpm web:typecheck
pnpm web:lint
pnpm web:build
```

### 5. Wire Hermes

```bash
# On the Hermes host
cp HERMES_ORCHESTRATOR.md ~/hermes/agents/aeo-chief/system_prompt.md

hermes agent register aeo-chief \
  --schedule "0 6 * * *" \
  --skill-path C:\Dev\bts\.claude\skills\cinecanon-sentinel \
  --db-url $AEO_NEON_POOLER_URL          # Dedicated pool, NOT the web app's
  --redis-url $UPSTASH_REDIS_REST_URL

hermes binding add telegram --token $TELEGRAM_BOT_TOKEN --chat-id $CHAT_ID
```

### 6. Seed and dry-run

```bash
claude code --skill cinecanon-sentinel \
  "seed the prompt bank with the 30 starter prompts from references/prompt_bank_schema.md"

claude code --skill cinecanon-sentinel \
  "dry-run cycle — poll 3 engines (chatgpt, claude, perplexity) with N=2 against the 30 starter prompts"
```

Expected dry-run cost: ~$2-4.

## Phased rollout (v2 compressed)

**Phase 0 — Validation week.** Apply CLAUDE.md, migrations, ClaimReview builder. No emission yet. Validate `pnpm web:build` still passes. ~$0.

**Phase 1 — ClaimReview emission on `/films/[slug]`.** Roll out structured-data ClaimReview blocks for the 55 curated dossiers (~660 blocks). Validate via Google Rich Results Test. Begin engine polling (3 engines × N=3 × 30 prompts) to establish baseline Precision per page. ~$50/wk.

**Phase 2 — Full measurement.** Expand to 5 engines × N=5 × 100 prompts. Wire `/ask` logging. Begin `prompt-curator` flywheel. Begin `citation-landscape-watcher`. Begin `entity-graph-curator` weekly schema sweep. ~$200/mo.

**Phase 3 — Intervention loop.** Add `content-optimizer` (draft PRs only). Add `learnings-synthesizer`. Roll ClaimReview to `/dossiers`, `/walkthroughs`, `/decisions`, `/partnerships`. ~$450/mo.

**Phase 4 (optional) — Admin surfacing.** Build the `/admin/(authenticated)/aeo/` route group for in-app digest viewing and intervention triage. ~$450/mo (no engine-API delta).

## Cost (unchanged from v1)

~$455/mo at full scale:
- Engine API: ~$225
- Claude Opus 4.6 precision judge (cached): ~$80
- Claude Code subagent runs: ~$80
- SerpAPI (AI Overviews): ~$45
- Postgres: included (using existing Neon)
- Sentry: included
- Upstash: included

## The two big v2 leverage points

### ClaimReview is now a 50-line patch, not a system to build

Because `0033_claims.sql` exists with confidence grades, sources, and evidence already modeled, ClaimReview emission is just an additional builder in `lib/jsonLd.tsx` + filtering already-loaded claims in `films/[slug]/page.tsx`. The hardest work was already done.

### `/ask` logging unlocks the flywheel

Without `ask_query_log`, the prompt-curator is curating against my 30 starter prompts forever. With it, real working-pro questions augment the bank within 24h of being asked. This is the single highest-value patch in the v2 set — apply it early.

## Authoritative sources for the design

- Princeton GEO-bench: arXiv:2311.09735 (KDD 2024)
- IQRush 2026 distribution sampling: arXiv:2603.08924
- AutoMaAS architecture search: arXiv:2510.02669
- LoudFace, ConvertMate, Foundation Marketing 2026 AEO audits
- Ahrefs 75K-Domain Brand Mention vs Backlink study, 2025

---

**For:** CineCanon — Cinematic Technical Reference, at cinecanon.com.
**Stack:** pnpm monorepo, Next.js 16, React 19, Drizzle, Postgres + pgvector, Upstash, Sentry, NextAuth.
**Drafted:** May 2026.
