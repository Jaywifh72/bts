---
name: cinecanon-feature-plan
description: Turns an approved CineCanon feature spec into a dated, task-by-task implementation plan — each task naming the files it touches, a one-line rationale, and a conventional-commit message. Use after a spec exists and the user wants to break the work into ordered steps, says "implementation plan", "break this into tasks", "plan the build for X", or "turn the spec into a plan".
---

# cinecanon-feature-plan

## What this skill is

Stage 2 of CineCanon's plan/spec workflow (`vault/wiki/patterns/plan-spec-workflow.md`).
It converts an approved spec into an ordered task list a builder can execute
without re-deciding anything.

## When this skill triggers

- "Write the implementation plan for `<feature>`"
- "Break the `<feature>` spec into tasks"
- After `cinecanon-feature-spec`, once the spec is approved

## Procedure

### 1. Require an approved spec

If there is no spec, stop and run `cinecanon-feature-spec` first. A plan built
from an unapproved spec is wasted work.

### 2. Write the plan

Write `docs/superpowers/plans/YYYY-MM-DD-<slug>.md` (same slug as the spec).
Open with a short header — goal, architecture summary, tech stack, whether it
needs migrations. Then a numbered task list. Each task:

- **Files** — created vs. modified, by path.
- **Reasoning** — one line: why this task, why here in the order.
- **Commit** — a conventional-commit message (`feat(scope): …`, `fix(scope): …`,
  `chore(web): …`), matching the repo's commit style.

### 3. Order the tasks correctly

- Config and shared utilities first; consumers after.
- For new entity types, follow `entity-buildout.md` order: migration → schema →
  queries → routes → seed.
- A deploy-window-safe order: ship NULL-projecting routes before the migration
  is applied to prod when needed.
- Last task is always the quality gate (`cinecanon-ship-checklist`).

### 4. Keep tasks small

Each task should be one focused commit. If a task spans many unrelated files,
split it.

## Guardrails

- The plan implements the spec — it does not expand scope. New ideas go back to
  the spec.
- Name real file paths, not vague areas. "One search away" is the bar.
- A finished plan is history; a change of direction is a new dated plan.

## Finish

Append to `vault/learnings/cinecanon-feature-plan.md`: the feature, task count,
any ordering trap (especially deploy-window or build-time-query ordering).
