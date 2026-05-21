---
name: cinecanon-qa-sweep
description: Crawls the live cinecanon.com site for broken links, missing or broken images, layout regressions, and SEO/meta gaps, then triages the findings into a prioritized fix list. Wraps the cinecanon-qa agent and scripts/qa-full-crawl.sh. Use when the user asks to "QA the site", "run a crawl", "check for broken links/images", "site health check", or wants the latest crawl report triaged.
---

# cinecanon-qa-sweep

## What this skill is

The Site QA & Health procedure (Domain D). It runs a full crawl, then turns the
raw report into a ranked, actionable fix list. The crawl itself is deterministic
and also runs unattended weekly via `.github/workflows/qa-crawl-weekly.yml`;
this skill is the on-demand + triage path.

## When this skill triggers

- "QA the site" / "run a crawl" / "site health check"
- "Are there broken links / broken images?"
- "Triage the latest QA report"
- A `qa-crawl-weekly.yml` run produced a report that needs reading

## Procedure

### 1. Crawl

- Run `scripts/qa-full-crawl.sh` — it probes every URL in the sitemap index and
  every `<img>` on film and key index pages (HEAD-only, parallelized).
- The report lands in `docs/qa-reports/cinecanon-qa-<date>.md`. For net-new
  reports prefer `vault/output/qa-reports/`.

### 2. Delegate the judgment crawl

- Spawn the **`cinecanon-qa`** agent for the parts a script cannot judge:
  layout regressions, missing content, SEO/meta issues, visual defects.
- Give it the crawl report as input so it does not re-probe.

### 3. Triage

Sort findings into a ranked list, not a flat dump:

- **P0** — broken pages (4xx/5xx/network error), missing core content.
- **P1** — broken images, broken outbound links, missing meta/OG, visible
  layout regressions.
- **P2** — polish, minor inconsistency.

Group by root cause. The latest full crawl found ~1,700 broken images and a
cluster of network-error crew pages — broken images especially tend to share
one cause (e.g. the TMDb image-optimizer quota issue behind commits
`031c80b0` / `c891ea08`). Name the cause, not just the count.

### 4. Hand off

- Each P0/P1 finding gets a concrete file/route so the fix is one search away.
- Fixing the defects is judgment work — do it as a separate, explicit step or
  route it to `cinecanon-dossier-builder` (thin content) or a feature fix.

## Guardrails

- This skill *finds and triages*; it does not silently mass-edit. Fixes are a
  deliberate follow-up.
- A crawl hits production — keep it HEAD-only and parallel-bounded as the
  script already is; don't hammer the site.

## Finish

Append to `vault/learnings/cinecanon-qa-sweep.md`: defect counts by bucket, the
dominant root cause this run, and whether it is recurring (a recurring cause is
a candidate for a new CI check or a code fix, not weekly re-triage).
