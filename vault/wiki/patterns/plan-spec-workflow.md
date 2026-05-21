# Pattern: the plan / spec workflow

How a web feature goes from idea to merged. The team already works this way —
`docs/superpowers/specs/` holds design specs and `docs/superpowers/plans/`
holds dated implementation plans. This note codifies the convention so the
`cinecanon-feature-spec` and `cinecanon-feature-plan` skills run it the same
way every time.

## The four stages

1. **Spec** — *what and why.* A design document: the problem, the user, the
   proposed surface, the data model, the trade-offs, what is explicitly out of
   scope. Written by `cinecanon-feature-spec`. Lands as
   `docs/superpowers/specs/YYYY-MM-DD-<slug>-design.md` (or
   `vault/output/specs/` for net-new work).

2. **Plan** — *how, as ordered tasks.* Each task names the files it
   creates/modifies, a one-line reasoning, and a conventional-commit message.
   Written by `cinecanon-feature-plan` from an approved spec. Lands as
   `docs/superpowers/plans/YYYY-MM-DD-<slug>.md`.

3. **Build** — work the plan task by task. New entity types follow the
   `entity-buildout.md` recipe. Commit per task with the planned message.

4. **Gate** — `cinecanon-ship-checklist` before every merge: `pnpm typecheck`,
   `pnpm lint`, `pnpm db:test`, build check, plus a review against the
   "Don't do these" list in `CLAUDE.md`. `ci.yml` runs the automated half on
   every push.

## Why a spec before a plan

The spec is cheap to change and the plan is cheap to change; code is not.
Disagreements about scope and data model get resolved on the spec, before any
file is written. A plan written from an unapproved spec is wasted work.

## Naming

Dated, kebab-case: `2026-05-16-google-auth.md`. A spec and its plan share the
slug. A finished plan is history — a follow-up is a new dated file, never an
edit of the old one.
