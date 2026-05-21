# Domains

CineCanon's recurring work decomposes into eight working domains (plus one
low-priority growth domain). Each domain holds recurring tasks; each task worth
standardizing is a **skill**; each skill that is recurring *and*
unattended-safe is also an **automation**.

This is the routing table — find the domain, then go to its skill.

| Domain | Owns | Skills | Agents | Automations |
|---|---|---|---|---|
| A — Content & Dossier Engine | Data ingest, new entity types, seed data | `cinecanon-entity-scaffolder`, `cinecanon-dossier-builder`, `cinecanon-scraper-debugger` | — | `scraper-weekly.yml`, `seed-music.yml` |
| B — Editorial & Citation Integrity | T7 grading, sourcing, disputes, link rot | `cinecanon-claim-grader`, `cinecanon-citation-audit` | `cinecanon-citation-steward` | `link-rot-scan.yml` |
| C — AI Search Visibility | Citation Precision, schema/ClaimReview, llms.txt | `cinecanon-sentinel` | (7 Sentinel sub-agents) | `aeo-cycle.yml`, `seed-aeo-prompts.yml` |
| D — Site QA & Health | Link/image crawls, regression sweeps, defect triage | `cinecanon-qa-sweep` | `cinecanon-qa` | `qa-crawl-weekly.yml` |
| E — Web Feature Delivery | Speccing, planning, building, shipping | `cinecanon-feature-spec`, `cinecanon-feature-plan`, `cinecanon-ship-checklist` | — | `ci.yml` |
| F — Design, UX & Accessibility | UX audits, density review, WCAG | `cinecanon-ux-audit`, `cinecanon-a11y-audit`, `cinecanon-density-review` | `cinecanon-ux-lead`, `cinecanon-density-reviewer`, `cinecanon-a11y-auditor` | — |
| G — Legal, Compliance & Licensing | Third-party licensing, attribution, risk register | `cinecanon-legal-review` | `legal-counsel` | `quarterly-compliance-review.yml` |
| H — Dev Infrastructure & Release | Migrations, runbooks, CI, Vercel/Neon | `cinecanon-migration-author` | — | `migrate.yml`, `db-script.yml`, `admin-job.yml`, `scraper-job.yml` |
| I — Growth & Monetization *(low priority)* | Partner/monetization narratives | *(deferred)* | — | — |

---

## A — Content & Dossier Engine

**Purpose.** Grow and maintain the dossier corpus — film, crew, gear, facility,
score, sound, stunt, VFX data — and the scrapers that feed it. The largest area
of work by file churn; the entity-buildout recipe (`wiki/patterns/`) repeats.

**Recurring tasks.** Build/expand a dossier end-to-end · stand up a new entity
type (migration + schema + queries + routes + seed) · refresh TMDb / Wikidata /
MusicBrainz data · debug a flaky scraper · seed a new content suite.

**Reach for.** `cinecanon-entity-scaffolder` for a new entity type;
`cinecanon-dossier-builder` to fill or expand one dossier;
`cinecanon-scraper-debugger` when an ingest pipeline misbehaves. Routine
refreshes run unattended via `scraper-weekly.yml`.

## B — Editorial & Citation Integrity

**Purpose.** Protect the brand promise — *every claim cited and
confidence-graded*. The T7-1…T7-7 rubric is canon (`wiki/patterns/`).

**Recurring tasks.** Grade new claims · audit a dossier's source chain ·
triage link rot · quarterly dossier-freshness review.

**Reach for.** `cinecanon-claim-grader` to apply the rubric;
`cinecanon-citation-audit` to sweep one dossier's sources. The
`cinecanon-citation-steward` agent is the deep reviewer both skills delegate
to. `link-rot-scan.yml` runs the weekly unattended scan.

## C — AI Search Visibility (AEO/GEO/SEO)

**Purpose.** Measure and improve how AI engines cite CineCanon. Hero metric:
**Citation Precision** — when engines cite us, are the facts right?

**Status.** Already a complete Agentic OS vertical — the `cinecanon-sentinel`
skill (7 sub-agents, `references/`, `learnings/`, `patches/`) plus the daily
`aeo-cycle.yml`. **It is the template every other domain copies.** No redesign
needed; see `.claude/skills/cinecanon-sentinel/SKILL.md`.

## D — Site QA & Health

**Purpose.** Keep the live site sound — no broken links, no missing images, no
layout regressions, no SEO-meta gaps.

**Recurring tasks.** Full-crawl link + image probe · triage a crawl into a
prioritized fix list · fix the defects.

**Reach for.** `cinecanon-qa-sweep` (crawl + triage; wraps the `cinecanon-qa`
agent and `scripts/qa-full-crawl.sh`). The weekly crawl runs unattended via
`qa-crawl-weekly.yml`; *fixing* defects stays a skill you invoke.

## E — Web Feature Delivery

**Purpose.** Take a feature from idea to shipped, the way the team already
works: a design spec, then a dated implementation plan, then build, then the
quality gate.

**Recurring tasks.** Write a spec · write the implementation plan · run the
pre-merge quality gate.

**Reach for.** `cinecanon-feature-spec`, then `cinecanon-feature-plan`, then
`cinecanon-ship-checklist` before every merge. `ci.yml` is the automated half
of the gate.

## F — Design, UX & Accessibility

**Purpose.** Keep the dense, dark, professional UI usable, scannable, and
WCAG 2.2 AA compliant.

**Recurring tasks.** UX audit of a page/flow · WCAG audit · data-density /
provenance PR review.

**Reach for.** `cinecanon-ux-audit`, `cinecanon-a11y-audit`,
`cinecanon-density-review` — each wraps the matching agent.

## G — Legal, Compliance & Licensing

**Purpose.** Stay clear on third-party data/media licensing, TMDb attribution,
scraping policy, and brand/defamation exposure.

**Recurring tasks.** Pre-merge legal review of any change touching third-party
data/media/brand/user-data · verify attribution coverage · quarterly license +
risk-register audit.

**Reach for.** `cinecanon-legal-review` (wraps `legal-counsel`). It maintains
`vault/wiki/legal/licenses.md` and `risk-register.md`. The quarterly audit runs
via `quarterly-compliance-review.yml`.

## H — Dev Infrastructure & Release

**Purpose.** Migrations, deploys, CI, and the Vercel/Neon operational surface.

**Recurring tasks.** Author a migration under strict numeric order + idempotency
rules · apply migrations / run scripts / dispatch jobs against Neon prod ·
execute a deploy runbook.

**Reach for.** `cinecanon-migration-author` for a new migration. Prod
operations run through the existing `migrate.yml`, `db-script.yml`,
`admin-job.yml`, `scraper-job.yml`. Runbooks live in `docs/runbooks/`.

## I — Growth & Monetization *(low priority)*

**Purpose.** Turn site capabilities into partner and monetization narratives
(the work behind `CineCanon_Monetization_Pitch.pptx`). Deferred until the eight
core domains are codified. A single `cinecanon-monetization-brief` skill can be
added when needed.
