# Observability Dashboard — Design Spec

> Agentic OS, Layer 3 (Observability). The **optional, advanced** layer.
> Layers 1 (architecture: domains/skills/automations) and 2 (memory: the
> vault) deliver most of the value on their own. Build this only once
> Layers 1–2 are in daily use and remembering skill names is real friction.

**Status:** spec + working prototype. Drafted 2026-05-21.
**Prototype:** `vault/output/observability/dashboard.html` — open it in a
browser today; it is self-contained.

## Problem & user

The user is the operator of CineCanon's Agentic OS — running skills, watching
automations, judging whether the system is healthy. After Layers 1–2 there are
15 skills and 12 automations. Two frictions appear:

1. **Recall.** Remembering each skill's exact name and invocation.
2. **Blindness.** No single place shows whether Citation Precision is holding,
   how many images are broken, how many claims are stuck at T7-7, or which
   skills have actually been used.

A dashboard solves both: every skill is a button, and the metrics that matter
are on one screen.

## Proposed surface

A single dashboard with three regions:

1. **Metrics row** — the health signals (see below).
2. **Skill board** — every skill as a button, grouped by domain. Clicking a
   button produces the headless invocation `claude -p "use the <skill> skill, …"`
   for the operator to run in a terminal.
3. **Automations panel** — the 12 GitHub Actions workflows with their schedule
   and last-run status.

Two delivery options, in order of preference:

- **Option A — standalone HTML** (the prototype). One file, no build, no auth,
  no app code. The operator opens it locally. Buttons copy the `claude -p`
  command to the clipboard. Ship this first — it is zero-risk to the live app.
- **Option B — `/admin/ops` route group.** Fold the dashboard into the existing
  authenticated admin console (`apps/web/app/admin/(authenticated)/`). This
  gives live metrics from Postgres and real last-run status from the GitHub
  API, but it is app code behind the existing auth gate and needs a normal
  feature review (`cinecanon-feature-spec` → `-plan` → `-ship-checklist`).
  The Sentinel skill already anticipated an `/admin/aeo` route group — Option B
  would sit beside it.

## Metrics that matter

CineCanon already produces the raw signal; the dashboard surfaces it.

| Metric | Source | Why it matters |
|---|---|---|
| Citation Precision (hero) | `aeo_daily_metrics` (Sentinel) | The brand promise, measured |
| ClaimReview coverage % | curated dossiers vs. emitted blocks | Schema leverage realized |
| Broken images (latest crawl) | `qa-crawl-weekly` report | Live QA debt (last crawl: ~1,700) |
| Broken / network-error pages | `qa-crawl-weekly` report | Hard site failures |
| Open T7-7 claims | `claims` table | Editorial uncertainty backlog |
| Link-rot incidents (7d) | `sources:health` / `link-rot-scan` | Citation-chain decay |
| CI pass rate (30d) | GitHub Actions API | Delivery health |
| Skill runs (7d) | per-skill `vault/learnings/` entries | Which skills are actually used |

Per skill, Option B also tracks run count, last-run, success rate, and
approximate cost — generalizing what the Sentinel digests already track per
cycle.

## Data model

- **Option A** — none. Static HTML; metric values are hand-set or pasted from
  the latest digests/reports. Buttons are pure clipboard helpers.
- **Option B** — no new tables. Reads `aeo_daily_metrics`, `claims`, `sources`,
  the QA report files, and the GitHub Actions API. A thin
  `getOpsDashboardData` query surface aggregates them.

## How a button "spawns" a skill

The framework's "clickable button → headless `claude -p`" works like this:

- **Option A** copies `claude -p "use the cinecanon-qa-sweep skill, full crawl
  and triage"` to the clipboard; the operator pastes it into a terminal in the
  repo. Honest about the one manual step; zero infrastructure.
- **Option B** could shell out to `claude -p` server-side from a Server Action,
  but that runs Claude Code on the web host — out of scope here and a security
  review of its own. The prototype deliberately stops at clipboard.

## Trade-offs

- Option A is instant and safe but its metrics are not live — they are as fresh
  as the last paste. Acceptable for a v1 convenience layer.
- Option B is live but is real app code, behind auth, sharing the web host. It
  must not run heavy queries on the web app's small Postgres pool — read from
  the Sentinel's `AEO_NEON_POOLER_URL` and from cached report files instead.
- Either way this layer is a convenience, not a capability: every skill is
  already runnable from the CLI without it.

## Out of scope

- Server-side execution of `claude -p` (security review of its own).
- Auth / multi-user. Option A is single-operator local; Option B inherits the
  existing admin auth.
- Editing skills or automations from the dashboard — it observes and launches,
  it does not author.
- Real-time streaming of a running skill's output.

## Open questions

1. Is the clipboard step (Option A) acceptable long-term, or is Option B worth
   the review cost soon?
2. Should the dashboard live in the repo (`vault/output/observability/`) or be
   a separate operator tool outside it?
3. Should "skill runs (7d)" be tracked more rigorously than counting
   `vault/learnings/` entries — e.g. a lightweight `ops_skill_runs` log?

## Recommendation

Ship **Option A** now (the prototype is done). Revisit **Option B** only after
the skills and automations have a few weeks of real use and the metrics are
demonstrably worth wiring live.
