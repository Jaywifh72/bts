---
name: cinecanon-ux-audit
description: Runs an end-to-end UX audit of a CineCanon page or flow — information density, citation legibility, comparability, visual hierarchy, navigation — and produces a P0/P1/P2 findings report with concrete file paths. Wraps the cinecanon-ux-lead agent. Use when the user wants UX feedback, says "audit the X page", "review this flow", "what's wrong with the UX", or before shipping a significant UI change.
---

# cinecanon-ux-audit

## What this skill is

The Design/UX audit procedure (Domain F). It produces a ranked, file-anchored
UX report — the same shape as `docs/audits/2026-05-15-ux-audit.md`.

## When this skill triggers

- "Audit the UX of `<page/flow>`" / "review this flow"
- "What's wrong with the `<X>` page?"
- Before merging a significant UI change (pair with `cinecanon-density-review`)

## Procedure

### 1. Scope

- Name the pages/flows in scope. Typical: homepage, films index + detail, crew
  detail, VFX/stunts detail, awards, search/ask, gear.
- Audit against the live dev server (`pnpm web:dev`, localhost:3000) so the
  findings are real.

### 2. Delegate to the UX lead

Spawn the **`cinecanon-ux-lead`** agent. It evaluates for CineCanon's
professional audience (DPs, gaffers, colorists, VFX producers, ADs): scanning
for facts, comparing across films, trusting sourced data. Audit dimensions:

- **Information density** — fact-per-fold; dense but scannable.
- **Citation legibility** — is provenance visible without being noise?
- **Comparability** — can a pro compare the same field across films?
- **Hierarchy & navigation** — a film page emits 30+ sections; can a DP reach
  the lighting section without scrolling past 15 unrelated ones?
- **Domain literacy** — does the copy speak the craft correctly?

### 3. Report

Write `vault/output/audits/YYYY-MM-DD-<slug>-ux-audit.md` (or `docs/audits/`).
Rank findings **P0** (ship-blocking first impression), **P1** (visible friction
for working pros), **P2** (polish). Each finding gets a concrete file/route.
Open with a "top wins" summary.

## Guardrails

- This skill audits and recommends; it does not implement. Fixes are a separate
  step, planned via `cinecanon-feature-plan` if non-trivial.
- An accessibility finding is a `cinecanon-a11y-audit` matter — flag and route
  it, don't half-audit it here.
- Don't recommend changes that reduce information density to look "cleaner" —
  density is the product.

## Finish

Append to `vault/learnings/cinecanon-ux-audit.md`: the pages audited, the top
recurring friction, any pattern worth a `wiki/` note.
