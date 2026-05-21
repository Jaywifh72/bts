---
name: cinecanon-density-review
description: Reviews a PR or component change that displays film/crew/gear/scene/source data, refusing changes that degrade fact-per-fold, break citation links, or flatten the confidence-tier UI. Wraps the cinecanon-density-reviewer agent. Use when reviewing a data-display PR, when the user says "density review", "does this keep the data dense", "review this component", or before merging changes to any data-heavy page or component.
---

# cinecanon-density-review

## What this skill is

The data-density and provenance gate (Domain F). CineCanon is a reference work;
its value is information density that stays scannable and provenance that stays
legible. This skill reviews data-display changes against a fixed rubric and
blocks regressions.

## When this skill triggers

- Reviewing a PR/component touching film/crew/gear/scene/source display
- "Density review" / "does this keep the data dense enough?"
- Before merging a change to any data-heavy page or component

## Procedure

### 1. Identify the change

- Pin down which data-display surfaces the PR touches and what it changes —
  layout, field set, citation affordances, confidence-tier UI.

### 2. Delegate to the reviewer

Spawn the **`cinecanon-density-reviewer`** agent. It reviews against a fixed
rubric and *refuses* changes that:

- **Degrade fact-per-fold** — fewer real facts visible per screen without a
  genuine usability gain.
- **Break citation links** — a claim must keep its visible, working source
  link.
- **Flatten the confidence-tier UI** — the T7 badge must stay legible;
  collapsing or hiding it is a refusal.

### 3. Verdict

Report a clear **APPROVE** or **REQUEST CHANGES** with specifics. A refusal
names the rubric line broken and the file. "Looks cleaner" is never sufficient
reason to lose density.

## Guardrails

- The reviewer is a gate — it is allowed to say no. Do not water a refusal down
  to a suggestion.
- Density is not clutter: if a change genuinely improves scanning *and* keeps
  the facts, that is an approve. The rubric protects facts, not visual noise.
- Confidence-tier and citation UI changes also implicate Editorial — route
  anything substantive to `cinecanon-citation-steward` via
  `cinecanon-citation-audit`.

## Finish

Append to `vault/learnings/cinecanon-density-review.md`: what was reviewed, the
verdict, any rubric line that keeps getting tripped (a candidate for a
component-level guardrail).
