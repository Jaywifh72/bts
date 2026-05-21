# CineCanon — Agentic OS Design

A structured operating system layered around Claude Code so that work on
**cinecanon.com** (repo `bts`, local path `C:\dev\bts`) is repeatable,
trackable, and delegable.

> **Status:** Design / plan document. Nothing in `C:\dev\bts` is modified by
> this document — it describes a target state and a rollout order to get there.
> Drafted 2026-05-21.

---

## 0. What CineCanon is, and what's already there

### 0.1 The product

CineCanon is a **cinematography reference engine** — a working technical
reference for camera-department professionals and the AI search engines they
increasingly trust. It publishes per-scene gear attribution, lighting plots
with cinematographer-motivation paragraphs, color pipelines (ACES / IDT / ODT),
stunt sequences, VFX vendor shot counts, score and sound-design metadata, and a
citation chain that backs every claim. The audience is professional: DPs,
gaffers, colorists, VFX producers, ADs, stunt coordinators, composers, editors,
production designers, and costume / hair / makeup teams.

Its defensible difference versus IMDb, TMDb, Letterboxd, and Wikipedia is that
**every claim is cited and confidence-graded** on a seven-tier rubric (T7-1
"Verified" through T7-7 "Uncertain"). The live site exposes ~13,000 indexed
URLs and a public, CC-BY-4.0 API at `/api/v1`.

### 0.2 The stack

A pnpm monorepo with three workspaces:

| Workspace | Purpose |
|---|---|
| `apps/web` | Next.js (App Router, React 19, RSC + Server Actions) — public dossiers + admin console |
| `packages/db` | Drizzle ORM over Postgres 16 + pgvector + pg_trgm — 91 migrations (numbered through 0094), schema, queries, seed, tests |
| `packages/scraper` | Python ingest pipelines — TMDb, Wikidata, MusicBrainz, RSS, social, Wayback, embeddings |

Auth is NextAuth 5; rate-limit and cache are Upstash Redis; errors go to
Sentry; hosting is Vercel with a managed Neon Postgres. CI runs typecheck,
lint, vitest, build, and Playwright E2E on every push.

### 0.3 The existing Claude Code setup — an audit

CineCanon is **not** starting from zero. It already has one domain built out as
a near-complete Agentic OS, and several loose parts elsewhere.

**Already strong:**

- **`CLAUDE.md`** (root, ~7.5 KB) — documents the stack, DB / Next.js
  conventions, the T7 confidence rubric, error-handling patterns, the public
  API contract, TMDb attribution rules, a "Don't do these" list, and an "In
  flight" section. This is a genuinely good CLAUDE.md.
- **`.claude/agents/`** — six Claude Code subagents:
  `cinecanon-a11y-auditor`, `cinecanon-citation-steward`,
  `cinecanon-density-reviewer`, `cinecanon-qa`, `cinecanon-ux-lead`,
  `legal-counsel`.
- **`.claude/skills/cinecanon-sentinel/`** — one mature skill: the AEO / GEO /
  SEO observatory. It has a `SKILL.md`, a `README.md`, a Hermes orchestrator
  prompt, seven sub-agents, a `references/` library, `patches/`, `learnings/`,
  and `scripts/`. **This is the template** — it is what every other domain
  should look like.
- **Automations (GitHub Actions):** `ci.yml`, `aeo-cycle.yml` (daily
  06:00 ET), `scraper-weekly.yml` (Sunday 04:00 UTC), `admin-job.yml`,
  `scraper-job.yml`, `db-script.yml`, `migrate.yml`, `seed-aeo-prompts.yml`,
  `seed-music.yml`.
- **Partial memory store:** `docs/superpowers/plans/` + `docs/superpowers/specs/`
  (a de-facto plan/spec workflow), `docs/runbooks/`, `docs/audits/`,
  `docs/qa-reports/`, `output/`, and per-agent `learnings/` inside the Sentinel
  skill.

**Gaps and smells worth fixing:**

- **Five of CineCanon's eight working domains have an agent but no skill.** An
  agent is a delegate you spawn; a *skill* is the written, repeatable procedure
  that says how the work runs every time. The QA agent's own description says
  "Run on demand" — there is no codified procedure, schedule, or memory wiring
  around it.
- **`.claude/agents/` mixes agents with memory files.** `licenses.md` and
  `risk-register.md` are not agents — they are append-only knowledge files
  maintained *by* the `legal-counsel` agent. They belong in the memory vault.
- **The memory store is real but unmapped.** `docs/`, `output/`, and
  `learnings/` already hold codified knowledge, but `CLAUDE.md` does not
  describe the folder structure, so Claude cannot navigate it efficiently, and
  there is no staging tier for raw research.
- **Doc drift.** `README.md` says Next.js 14; `CLAUDE.md` says Next.js 16. The
  a11y agent's file is named `cinecanon-ally-auditor.md` but its `name:` field
  is `cinecanon-a11y-auditor`. Small, but symptomatic of memory that isn't
  routinely reconciled.

The job of this Agentic OS is to **replicate the Sentinel pattern across every
other domain**, give the memory store a documented structure, and (optionally)
put a dashboard on top.

---

## 1. Layer 1 — Architecture

> Decompose recurring work into a hierarchy: **domains → tasks → skills →
> automations.** Every recurring task worth standardizing becomes a Claude Code
> **skill** (`SKILL.md`) so it runs the same way every time. Skills that should
> run on a schedule or trigger become **automations**. Ad-hoc judgment work
> stays a skill you invoke; recurring scans and reports become automations.

### 1.1 The domains

Eight domains, derived from what the repo and its 320-commit history actually
show. The git log makes the weighting clear: the data layer and the web app are
the two heaviest areas of work — `apps/web` is touched by 145 commits and
`packages/db` by 138 — with `packages/scraper` (42 commits), AEO, and QA /
hardening behind them. The data layer also shows the most file churn per
commit, because each entity buildout touches schema, queries, migrations, and
seed together.

| # | Domain | What it covers | Evidence in the repo |
|---|---|---|---|
| A | **Content & Dossier Engine** | Ingesting and enriching film / crew / gear / facility data; building new entity types; authoring seed data | 138 commits touch `packages/db`, 42 touch `packages/scraper`; "Phase 1–4" entity buildouts; `feat(facility)`, `feat(score)`, `feat(sound)`, `feat(crew)` |
| B | **Editorial & Citation Integrity** | Applying the T7 rubric, sourcing claims, resolving disputes, link-rot triage, dossier freshness | `0033_claims.sql`, `cinecanon-citation-steward` agent, `/methodology`, `packages/scraper/src/wayback` |
| C | **AI Search Visibility (AEO/GEO/SEO)** | Citation Precision measurement, schema / ClaimReview, `llms.txt`, competitor citation tracking | `cinecanon-sentinel` skill, `aeo-cycle.yml`, `feat(aeo)` commits, `feat(seo)` foundation |
| D | **Site QA & Health** | Broken-link / missing-image crawls, layout-regression sweeps, defect triage → fix | `cinecanon-qa` agent, `scripts/qa-full-crawl.sh`, `docs/qa-reports/` (latest crawl: 1,702 broken images) |
| E | **Web Feature Delivery** | Speccing, planning, building, and shipping new routes / components / tools | `docs/superpowers/specs/` + `plans/`, "Phase 4 decision-support tools", `ci.yml` quality gates |
| F | **Design, UX & Accessibility** | UX audits, data-density / provenance review, WCAG audits | `cinecanon-ux-lead`, `cinecanon-density-reviewer`, `cinecanon-a11y-auditor` agents, `docs/audits/` |
| G | **Legal, Compliance & Licensing** | Third-party data / media licensing, TMDb attribution, scraping policy, the risk register | `legal-counsel` agent, `licenses.md`, `risk-register.md`, `SECURITY.md` |
| H | **Dev Infrastructure & Release** | Migration authoring, deploy runbooks, CI, Vercel / Neon operations | 93 migrations under strict numeric order, `docs/runbooks/`, `migrate.yml`, `db-script.yml` |

A ninth, lighter domain — **Growth & Monetization** — exists in seed form
(`CineCanon_Monetization_Pitch.pptx`, `docs/monetization/`). It is listed at
the end of §1.3 but is not a priority for the OS.

### 1.2 The decomposition rule

For each domain: **list the recurring tasks → standardize each worth-keeping
one as a skill → promote to an automation only the skills that are both
recurring *and* unattended-safe.**

- **Skill, invoked on demand** — anything needing human judgment per run: a
  dossier buildout, a feature spec, a legal review of a specific PR.
- **Automation, scheduled or triggered** — deterministic recurring scans and
  reports: the daily AEO cycle, the weekly scraper refresh, a weekly QA crawl.
- **Not everything is automated.** A QA *crawl* is deterministic and should run
  weekly unattended; *fixing* the defects it finds is judgment work and stays a
  skill you invoke. Sentinel already models this split correctly — copy it.

### 1.3 Domains → tasks → skills → automations

Naming convention for net-new skills: `cinecanon-<verb-noun>`, mirroring the
existing `cinecanon-sentinel`. **EXISTS** = already in the repo; **NEW** = to be
created.

#### Domain A — Content & Dossier Engine

| Recurring task | Skill | Automation |
|---|---|---|
| Build or expand a film / crew dossier end-to-end (data → seed → routes → checks) | `cinecanon-dossier-builder` — **NEW** | — invoke on demand |
| Stand up a new entity type (the repeating "migration + schema + queries + routes + seed" pattern that Phases 1–4 all followed) | `cinecanon-entity-scaffolder` — **NEW** | — invoke on demand |
| Refresh TMDb posters/backdrops, discover BTS videos, refresh Wikidata awards | (covered by automation) | `scraper-weekly.yml` — **EXISTS** |
| Debug a flaky scraper (the recurring `fix(musicbrainz)` churn) | `cinecanon-scraper-debugger` — **NEW** | — invoke on demand |
| Seed a new content suite (music, awards, facilities) | reuse `cinecanon-entity-scaffolder` | `seed-music.yml` etc. — **EXISTS** |

#### Domain B — Editorial & Citation Integrity

| Recurring task | Skill | Automation |
|---|---|---|
| Grade new claims against the T7-1…T7-7 rubric | `cinecanon-claim-grader` — **NEW** (wraps the `citation-steward` agent) | — invoke on demand |
| Audit one dossier's full source / citation chain | `cinecanon-citation-audit` — **NEW** | — invoke on demand |
| Sweep the site for link rot and stale archives | (covered by automation) | `link-rot-scan` workflow — **NEW**, weekly |
| Quarterly dossier-freshness review | reuse `cinecanon-citation-audit` | calendar-triggered review — **NEW** |

#### Domain C — AI Search Visibility (AEO/GEO/SEO)

| Recurring task | Skill | Automation |
|---|---|---|
| Run the daily Citation-Precision cycle; score dossiers; draft interventions | `cinecanon-sentinel` — **EXISTS** (mature; 7 sub-agents, references, learnings) | `aeo-cycle.yml` daily 06:00 ET — **EXISTS** |
| Seed / refresh the prompt bank | `cinecanon-sentinel` (prompt-curator sub-agent) — **EXISTS** | `seed-aeo-prompts.yml` — **EXISTS** |
| Weekly synthesis + monthly architecture review | `cinecanon-sentinel` (learnings-synthesizer) — **EXISTS** | weekly cron (extend `aeo-cycle.yml`) |

> **This domain is already a complete Agentic OS vertical.** It needs no new
> design — it *is* the design. Leave it; clone its shape.

#### Domain D — Site QA & Health

| Recurring task | Skill | Automation |
|---|---|---|
| Full-crawl link + image probe across the sitemap | `cinecanon-qa-sweep` — **NEW** (wraps `cinecanon-qa` agent + `qa-full-crawl.sh`) | `qa-crawl-weekly` workflow — **NEW**, weekly |
| Triage a QA report into a prioritized fix list | `cinecanon-qa-sweep` (triage mode) — **NEW** | — invoke on demand |
| Fix the defects (e.g. the 1,702 broken images) | judgment work — stays a skill | — invoke on demand |

#### Domain E — Web Feature Delivery

| Recurring task | Skill | Automation |
|---|---|---|
| Write a feature design spec (`docs/superpowers/specs/`) | `cinecanon-feature-spec` — **NEW** | — invoke on demand |
| Write the dated implementation plan (`docs/superpowers/plans/`) | `cinecanon-feature-plan` — **NEW** | — invoke on demand |
| Run the pre-merge quality gate (typecheck, lint, db test, E2E + the "Don't do these" review) | `cinecanon-ship-checklist` — **NEW** (cross-domain) | `ci.yml` — **EXISTS** (the automated half) |

#### Domain F — Design, UX & Accessibility

| Recurring task | Skill | Automation |
|---|---|---|
| End-to-end UX audit of a page or flow | `cinecanon-ux-audit` — **NEW** (wraps `cinecanon-ux-lead`) | — invoke on demand |
| WCAG 2.2 AA audit | `cinecanon-a11y-audit` — **NEW** (wraps `cinecanon-a11y-auditor`) | optional axe-core check in `ci.yml` |
| Data-density / provenance PR review | `cinecanon-density-review` — **NEW** (wraps `cinecanon-density-reviewer`) | — invoke on demand |

#### Domain G — Legal, Compliance & Licensing

| Recurring task | Skill | Automation |
|---|---|---|
| Pre-merge legal review of any change touching third-party data / media / brand / user data | `cinecanon-legal-review` — **NEW** (wraps `legal-counsel`) | — invoke on demand |
| Verify TMDb / CC-BY attribution coverage across surfaces | `cinecanon-attribution-check` — **NEW** | optional CI grep check |
| Quarterly license + risk-register audit | reuse `cinecanon-legal-review` | calendar-triggered review — **NEW** |

#### Domain H — Dev Infrastructure & Release

| Recurring task | Skill | Automation |
|---|---|---|
| Author a new migration under strict numeric order + idempotency rules | `cinecanon-migration-author` — **NEW** | — invoke on demand |
| Apply migrations / run db scripts / dispatch admin jobs against Neon prod | (covered by automations) | `migrate.yml`, `db-script.yml`, `admin-job.yml` — **EXISTS** |
| Execute a deploy runbook | follow `docs/runbooks/` (wiki) | — invoke on demand |

#### Domain I — Growth & Monetization *(low priority)*

A single ad-hoc skill, `cinecanon-monetization-brief`, can wrap the recurring
"turn site capabilities into a partner / monetization narrative" task that
produced `CineCanon_Monetization_Pitch.pptx`. No automation. Defer until the
eight core domains are codified.

### 1.4 Summary count

- **Skills:** 1 exists (`cinecanon-sentinel`) + ~14 net-new across Domains A, B,
  D, E, F, G, H (plus 1 optional in I).
- **Automations:** 9 exist (CI + AEO + scraper + 6 ops workflows) + 3 net-new
  (`qa-crawl-weekly`, `link-rot-scan`, quarterly legal/freshness review).

---

## 2. Layer 2 — Memory

> A persistent markdown memory store so Claude can reference past work, plus a
> CLAUDE.md that states the project's purpose **and** documents the folder
> structure so Claude navigates efficiently. The "Karpathy" structure: `raw/`
> (staging), `wiki/` (codified notes), `output/` (finished deliverables).

### 2.1 What CineCanon already has

The repo is already two-thirds of the way to the Karpathy vault — it just isn't
named or mapped as one:

| Karpathy tier | Already in the repo | Missing |
|---|---|---|
| `raw/` — staging | *(nothing — raw research is lost between sessions)* | the whole tier |
| `wiki/` — codified notes | `docs/runbooks/`, `docs/naming.md`, `.claude/skills/cinecanon-sentinel/references/` | a general codified-knowledge home |
| `output/` — deliverables | `output/`, `docs/superpowers/specs/` + `plans/`, `docs/audits/`, `docs/qa-reports/`, `docs/monetization/` | consistent naming + an index |
| learnings | `.claude/skills/cinecanon-sentinel/learnings/` | learnings outside the AEO domain |

### 2.2 Proposed vault structure

Keep the vault **inside the repo**, under a single top-level `vault/` folder, so
it versions with the code and travels with every clone. (An external Obsidian
vault works too — the structure is identical — but in-repo keeps memory and code
in lockstep.) Migrate the scattered folders above into it.

```
vault/
  README.md                 # vault index — the map of the map
  raw/                      # STAGING — short-lived, not codified yet
    research/               #   dumped web research, scrape findings
    chat-dumps/             #   pasted Claude sessions worth keeping
    inbox/                  #   anything unfiled
  wiki/                     # CODIFIED — article-style, durable, deduplicated
    domains/                #   one note per domain (A–I): purpose, tasks, owners
    patterns/               #   the entity-type buildout pattern, T7 rubric explained,
                            #   the plan/spec workflow, ISR-aware change timing
    stack/                  #   DB conventions, jsonLd rules, deploy runbooks
    competitors/            #   IMDb Pro, fxguide, ASC, Wikipedia citation profiles
    legal/                  #   licenses.md + risk-register.md MOVE here from .claude/agents/
  output/                   # DELIVERABLES — finished, dated, addressable
    specs/                  #   was docs/superpowers/specs/
    plans/                  #   was docs/superpowers/plans/
    audits/                 #   UX + a11y audits
    qa-reports/             #   crawl reports
    aeo-digests/            #   daily/weekly Sentinel digests of record
  learnings/                # APPEND-ONLY — one file per skill/domain
    dossier-builder.md
    qa-sweep.md
    aeo-chief.md            #   already exists inside the Sentinel skill — link or move
    ...
```

Rules, stated once in `vault/README.md` and enforced by every skill:

- **`raw/` is a staging area, not an archive.** A skill dumps research here,
  then either codifies the durable parts into `wiki/` or discards them. Nothing
  in `raw/` is load-bearing.
- **`wiki/` is deduplicated and current.** One concept, one note. When a fact
  changes, the note is edited, not appended. This is where the README/CLAUDE.md
  Next.js-version drift gets fixed and stays fixed.
- **`output/` is immutable and dated.** `YYYY-MM-DD-<slug>.md`. A finished
  audit is never edited; a follow-up is a new dated file.
- **`learnings/` is append-only.** Each skill ends its run by appending what it
  learned. The Sentinel's weekly synthesizer already does this — generalize the
  habit to every skill.
- **Each skill keeps its own `references/`** inside its skill folder for static
  domain knowledge (Sentinel already does this). `wiki/` is cross-skill;
  `references/` is skill-local.

> The "Anthropic memory" / `consolidate-memory` reflex maps cleanly here: a
> periodic pass that merges duplicate `wiki/` notes, fixes stale facts, and
> prunes the index. Schedule it monthly alongside the Sentinel architecture
> review.

### 2.3 Improved CLAUDE.md outline

The current `CLAUDE.md` is strong on stack conventions but says nothing about
the OS itself — where skills live, where memory lives, what to read first.
Proposed structure (keep the good parts, add the navigation layer):

```
# Repository: bts — CineCanon

## 1. Purpose                  (1 paragraph: what CineCanon is, who it serves,
                                why "every claim cited and confidence-graded")

## 2. The Agentic OS — read this first
   - The 8 domains (one line each) and where each is owned
   - Skills live in   .claude/skills/<name>/SKILL.md   — index table below
   - Agents live in   .claude/agents/
   - Memory lives in  vault/  — see vault/README.md
   - Automations are  .github/workflows/
   - READ ORDER for any task: this file → vault/wiki/domains/<domain>.md
     → the relevant SKILL.md → that skill's references/ and learnings/

## 3. Memory map
   - vault/raw/      staging        vault/wiki/    codified
   - vault/output/   deliverables   vault/learnings/  append-only per skill
   - How to navigate; when to write where

## 4. Skills index
   | Skill | Domain | Trigger / when to use |
   (one row per skill — the at-a-glance routing table)

## 5. Stack at a glance          (KEEP — fix the Next.js 14 vs 16 drift)
## 6. Conventions                (KEEP — DB, Next.js, T7 grading, errors,
                                  public API, TMDb attribution)
## 7. Don't do these             (KEEP)
## 8. In flight                  (KEEP — or point to vault/wiki/ so it's
                                  easier to keep fresh)
```

The single highest-value change: **§2 and §4**. Today Claude has to discover
the Sentinel skill by reading prose; with a skills index and a documented read
order, every future session orients in one file.

---

## 3. Layer 3 — Observability *(optional — advanced step)*

> A dashboard where each skill / automation is a clickable button that spawns a
> headless Claude Code instance (`claude -p`), plus usage metrics. **This is the
> most optional layer — do it last, or not at all.** Layers 1 and 2 deliver most
> of the value on their own.

### 3.1 The button board

A simple local dashboard — a single HTML file, or an `/admin/ops` route group
inside the existing authenticated admin console (CineCanon already has
`/admin/(authenticated)` with audit and health views, and the Sentinel skill
already planned an `/admin/aeo` route group — so the precedent and the auth
gate exist).

Each skill and each on-demand automation becomes a button that runs, e.g.:

```
claude -p "use the cinecanon-qa-sweep skill, full crawl + triage"
```

Suggested buttons, grouped by domain:

| Group | Buttons |
|---|---|
| Content | Build dossier · Scaffold entity type · Debug scraper |
| Editorial | Grade claims · Audit citations |
| AEO | Run Sentinel cycle · Weekly synthesis |
| QA | Run QA crawl · Triage QA report |
| Delivery | New feature spec · New feature plan · Ship checklist |
| Design | UX audit · a11y audit · Density review |
| Legal | Legal review · Attribution check |

### 3.2 Metrics that matter

CineCanon already produces most of the raw signal — the dashboard just surfaces
it:

- **Per skill:** run count, last-run timestamp, success rate, approximate cost
  (the Sentinel digests already track per-cycle cost — generalize it).
- **Hero metric, AEO:** Citation Precision (already the Sentinel hero metric)
  and ClaimReview coverage % of curated dossiers.
- **QA health:** broken-link and broken-image counts over time (the
  `qa-reports/` crawls already produce these — chart the trend; the current
  1,702 broken images is the kind of number a dashboard makes impossible to
  ignore).
- **Editorial:** share of claims at each T7 tier; count of T7-7 ("Uncertain")
  claims; link-rot incidents per week.
- **Delivery:** open vs. shipped specs/plans; CI pass rate.

### 3.3 Why it's optional

The button board is a convenience, not a capability — every skill is already
runnable from the Claude Code CLI without it. Build it only once Layers 1 and 2
are in daily use and the friction of remembering skill names is real.

---

## 4. Already in place vs. net-new

| Component | Status |
|---|---|
| Root `CLAUDE.md` with stack conventions | **In place** — extend with OS map + skills index (§2.3) |
| 6 Claude Code agents (a11y, citation-steward, density-reviewer, qa, ux-lead, legal-counsel) | **In place** — keep; wrap recurring invocations in skills |
| `cinecanon-sentinel` skill (AEO domain, full vertical) | **In place** — the template; leave as-is |
| Automations: `ci`, `aeo-cycle`, `scraper-weekly`, `admin-job`, `scraper-job`, `db-script`, `migrate`, `seed-*` | **In place** |
| Partial memory: `docs/superpowers/`, `docs/runbooks/`, `docs/audits/`, `docs/qa-reports/`, `output/`, Sentinel `learnings/` | **In place** — reorganize into `vault/` (§2.2) |
| `licenses.md` + `risk-register.md` | **In place but misfiled** — move from `.claude/agents/` to `vault/wiki/legal/` |
| ~14 net-new skills (Domains A, B, D, E, F, G, H) | **Net-new** |
| Automations: `qa-crawl-weekly`, `link-rot-scan`, quarterly legal/freshness review | **Net-new** |
| `vault/raw/` staging tier + `vault/wiki/` codified tier + `vault/README.md` index | **Net-new** |
| CLAUDE.md §2 (OS map) + §4 (skills index) | **Net-new** |
| Observability dashboard | **Net-new — optional** |

The headline: CineCanon has **one** domain (AEO) at full Agentic-OS maturity and
**seven** domains with agents but no codified skills, no memory wiring, and no
schedule. The work is replication, not invention.

---

## 5. Recommended rollout order

Sequenced so each step unblocks the next and value lands early.

**Step 1 — Foundation (cheap, unblocks everything).**
Create `vault/` with the `raw/ wiki/ output/` tiers and `vault/README.md`.
Move `docs/superpowers/`, `docs/audits/`, `docs/qa-reports/` into `vault/output/`;
move `docs/runbooks/` and `licenses.md` / `risk-register.md` into `vault/wiki/`.
Extend `CLAUDE.md` with §2 (OS map) and §4 (skills index — populated as skills
are built). Fix the Next.js 14/16 drift while you're in there.

**Step 2 — Codify the most repeatable domain first (Content & Dossier Engine).**
Build `cinecanon-entity-scaffolder` and `cinecanon-dossier-builder`. The data
layer sees the most file churn per commit and has the clearest repeatable
recipe — Phases 1–4 each followed the same "migration + schema + queries +
routes + seed" buildout — so standardizing it pays back fastest. Build
`cinecanon-ship-checklist` alongside, since every domain depends on it.

**Step 3 — Wrap existing agents as skills (low risk, fast).**
`cinecanon-qa-sweep`, `cinecanon-ux-audit`, `cinecanon-a11y-audit`,
`cinecanon-density-review`, `cinecanon-legal-review`, `cinecanon-claim-grader`.
The agents already exist and are good — this is mostly writing the `SKILL.md`
procedure, `references/`, and `learnings/` wrapper around each.

**Step 4 — Add the net-new automations.**
`qa-crawl-weekly` and `link-rot-scan` as GitHub Actions; the quarterly
legal / freshness review as a calendar reminder that invokes the relevant skill.

**Step 5 — Codify the delivery workflow.**
`cinecanon-feature-spec` and `cinecanon-feature-plan` — formalize the
`docs/superpowers/` plan/spec habit that the team already follows by convention.
Add `cinecanon-migration-author` and `cinecanon-scraper-debugger`.

**Step 6 — Observability (optional).**
Only after Layers 1–2 are in daily use: build the `/admin/ops` button board and
wire the metrics from §3.2.

Throughout: treat `cinecanon-sentinel` as the reference implementation. When a
new skill's shape is unclear, open the Sentinel skill and copy its structure —
`SKILL.md` + `references/` + `learnings/` + (where useful) sub-agents.

---

## Appendix — repo facts this design is grounded in

- Monorepo: `apps/web` (Next.js / React 19, 145 commits), `packages/db`
  (Drizzle + Postgres 16 + pgvector, 91 migration files numbered through 0094,
  138 commits), `packages/scraper` (Python ingest, 42 commits).
- 320 commits total; `master` branch; 10 feature worktrees under `.worktrees/`.
- `.claude/agents/`: 6 agents + 2 misfiled memory files (`licenses.md`,
  `risk-register.md`).
- `.claude/skills/`: 1 skill (`cinecanon-sentinel`) with 7 sub-agents,
  `references/`, `patches/`, `learnings/`, `scripts/`.
- `.github/workflows/`: 9 workflows (`ci`, `aeo-cycle`, `scraper-weekly`,
  `admin-job`, `scraper-job`, `db-script`, `migrate`, `seed-aeo-prompts`,
  `seed-music`).
- `docs/`: `superpowers/{plans,specs}/`, `runbooks/`, `audits/`, `qa-reports/`,
  `monetization/`.
- Latest full crawl (`2026-05-21`): 13,116 URLs, 0 4xx/5xx pages, but **1,702
  broken images** and 11 network-error crew pages — live, recurring QA signal.
- AEO cycle is live: daily, ~$3/run, currently 2 engines (ChatGPT, Claude) with
  Gemini / Perplexity pending API keys.
```
