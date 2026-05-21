---
name: cinecanon-feature-spec
description: Writes a feature design spec for CineCanon — the "what and why" document that precedes any implementation plan. Captures the problem, the user, the proposed surface, the data model, trade-offs, and explicit out-of-scope. Use when the user wants to design a new feature, says "spec out", "write a design doc for", "design the X feature", or is at the start of the plan/spec workflow before any code is written.
---

# cinecanon-feature-spec

## What this skill is

Stage 1 of CineCanon's plan/spec workflow (`vault/wiki/patterns/plan-spec-workflow.md`).
A spec settles *what* and *why* — and what the trade-offs are — before a single
file is written. Cheap to change; code is not.

## When this skill triggers

- "Spec out `<feature>`" / "design doc for `<feature>`"
- "I want to add `<feature>` — let's design it first"
- Any new feature at the idea stage, before an implementation plan exists

## Procedure

### 1. Understand the problem

- Who is the user? CineCanon's audience is professional — DPs, gaffers,
  colorists, VFX producers, ADs, stunt coordinators, composers, editors, PD,
  costume/hair/makeup. Name the specific role.
- What job are they trying to do? What is the current friction?
- Look at adjacent existing surfaces first — recent work landed
  `/dossiers/[slug]`, `/walkthroughs/[slug]`, the `/tools/*` decision aids.
  Prefer extending a recent surface over inventing a new one.

### 2. Draft the spec

Write `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md` (or
`vault/output/specs/` for net-new work). Sections:

- **Problem & user** — the job, the friction, who it serves.
- **Proposed surface** — the routes/components, in prose. Sketch the IA.
- **Data model** — new tables/columns, or "no schema change". If new entities,
  note that the build follows `vault/wiki/patterns/entity-buildout.md`.
- **Confidence & citation impact** — does it surface claims? How are they
  graded and emitted (T7 rubric)?
- **Trade-offs** — the real ones. Build-time query cost, ISR timing, the small
  Postgres pool, JSON-LD surface area.
- **Out of scope** — explicit. The single most useful section.
- **Open questions** — what needs a human decision.

### 3. Hand off

A spec is for review, not for building. Once the user approves it, run
`cinecanon-feature-plan` to turn it into an ordered implementation plan.

## Guardrails

- A spec proposes; it does not decide. Surface open questions, don't bury them.
- Keep it in prose — this is a reasoning document, not a task list.
- Respect the architectural "Don't do these" in `CLAUDE.md` at design time, not
  just at review time.

## Finish

Append to `vault/learnings/cinecanon-feature-spec.md`: the feature, which
existing surface it extended, any trade-off that proved decisive.
