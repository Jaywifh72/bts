---
name: cinecanon-ship-checklist
description: The pre-merge quality gate for the bts monorepo — runs typecheck, lint, the Drizzle DB test suite, and a build check, then reviews the change against CLAUDE.md's "Don't do these" list. Use before merging or pushing any change to CineCanon, when the user says "ready to ship", "ship checklist", "pre-merge check", "is this safe to merge", "quality gate", or after any skill that modifies code.
---

# cinecanon-ship-checklist

## What this skill is

The gate every code change passes before merge. `ci.yml` runs the automated
half on push; this skill runs it *before* push so a red CI is rare, and adds
the human-judgment review that CI cannot do.

## When this skill triggers

- "Ready to merge / ship / push?"
- The closing step of `cinecanon-entity-scaffolder`, `cinecanon-dossier-builder`,
  `cinecanon-migration-author`, or any code-modifying skill
- Before opening or approving a PR

## Procedure

### 1. Automated gate

Run, from the repo root, and do not proceed past a failure:

```bash
pnpm typecheck          # tsc --noEmit across workspaces — strict
pnpm lint               # ESLint on apps/web
pnpm db:test            # Drizzle/vitest against real Postgres
pnpm web:build          # production build — catches static/dynamic mismatches
```

Fix every failure before continuing. **Never push broken types.** If a build
fails on a static→dynamic mismatch, check for a missing `force-dynamic` or an
ISR misconfiguration.

### 2. "Don't do these" review

Read the change against the `CLAUDE.md` "Don't do these" list. Specifically:

- No JSON-LD added outside `apps/web/lib/jsonLd.tsx`.
- No `console.log` / `console.error` in production paths — Sentry only.
- No `'use client'` on a page/layout unless interactivity demands it.
- No writes to `/api/v1` (read-only by design).
- No new code that fans out heavy DB queries at build time.
- No credentials in committed files.
- Confidence grades respected — T7-6/T7-7 never emitted as structured data.

### 3. Surface-specific checks

- **Migration in the change?** Numeric order unbroken; idempotent; routes
  NULL-project new columns if they deploy before the migration applies.
- **TMDb data on a new/changed page?** Attribution footer present.
- **Route handler added?** `export const runtime = 'nodejs'`; defensive
  try/catch (pattern: commit `79152879`).
- **DB-heavy batch work?** Not sharing the web app's connection pool.

### 4. Verdict

Report a clear PASS or a blocking list. Do not soften a fail into a "mostly
fine" — the gate is binary.

## Finish

Append to `vault/learnings/cinecanon-ship-checklist.md` only when something
failed: what failed, the fix, whether it should become a new CI check or a
`CLAUDE.md` "Don't do these" entry.
