---
name: cinecanon-citation-audit
description: Sweeps one CineCanon dossier's full source and citation chain — every claim sourced and correctly T7-graded, every source link live (no link rot), disputes recorded, and ClaimReview emission consistent with the grades. Wraps the cinecanon-citation-steward agent. Use when the user wants to audit a dossier's sources, says "citation audit", "check the sources on [X]", "is [dossier] well-cited", or for the quarterly dossier-freshness review.
---

# cinecanon-citation-audit

## What this skill is

The Editorial procedure for auditing an existing dossier's provenance
(Domain B). `cinecanon-claim-grader` grades claims as they are written; this
skill verifies a whole dossier after the fact — and catches link rot, stale
sources, and grade/emission drift.

## When this skill triggers

- "Audit the citations / sources on `<dossier>`"
- "Is `<dossier>` well-cited?" / "citation audit"
- Quarterly dossier-freshness review
- A dossier flagged by `cinecanon-qa-sweep` or after a dispute is raised

## Procedure

### 1. Inventory

- Pull every claim on the dossier and its source(s) and T7 grade from the
  `claims` table (`getClaimsForProduction` and siblings).

### 2. Audit with the steward

Spawn the **`cinecanon-citation-steward`** agent. For every claim, check:

- **Sourced** — a real, specific source, not a vague gesture.
- **Correctly graded** — the T7 grade matches the actual source strength
  (`vault/wiki/patterns/confidence-grading.md`). Flag any over-grade.
- **Live** — the source URL resolves. Dead links are link rot — record them
  and, where possible, swap in the Wayback archive (`packages/scraper/src/wayback`).
- **Emission-consistent** — T7-1…T7-5 emit `ClaimReview`; T7-6/T7-7 do not. An
  emitted T7-7 or a non-emitted T7-2 is a defect.
- **Disputes** — any contested claim has its dispute trail recorded; never
  silently overwrite a disputed claim.

### 3. Report and fix

- Write findings as a dated note in `vault/output/audits/` (or attach to the
  dossier review). Rank: wrong/over-graded claims first, link rot second,
  emission drift third.
- Downgrades and link-rot fixes can be applied directly via the steward;
  contested calls go to a human.

## Guardrails

- The audit can only *lower* confidence on the evidence — raising a grade needs
  a genuine new source, via `cinecanon-claim-grader`.
- Never delete a disputed claim's history.
- Site-wide link rot is the automation's job (`link-rot-scan.yml`); this skill
  is the per-dossier deep audit.

## Finish

Append to `vault/learnings/cinecanon-citation-audit.md`: dossier audited, count
of over-grades and dead links, any systemic source that keeps rotting.
