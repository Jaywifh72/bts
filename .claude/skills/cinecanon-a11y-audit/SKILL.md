---
name: cinecanon-a11y-audit
description: Runs a WCAG 2.2 AA accessibility audit of a CineCanon page or flow — keyboard, screen reader, reduced motion, 200% zoom, 320px width, color contrast on the dark theme — and reports violations with file paths and fixes. Wraps the cinecanon-a11y-auditor agent. Use when the user asks "is this accessible", "a11y check", "WCAG audit", "screen reader", "color contrast", or before merging UI changes.
---

# cinecanon-a11y-audit

## What this skill is

The accessibility audit procedure (Domain F). CineCanon's UI is intentionally
dark, warm, type-dense, and table-heavy — which makes WCAG 2.2 AA the floor,
not the ceiling. This skill produces a violations report with concrete fixes.

## When this skill triggers

- "Is this accessible?" / "a11y check" / "WCAG audit"
- "Can a screen reader use this?" / "check color contrast"
- Before merging any UI change (pair with `cinecanon-ux-audit`)

## Procedure

### 1. Scope

- Name the pages/components in scope. Audit against the running dev server.

### 2. Delegate to the auditor

Spawn the **`cinecanon-a11y-auditor`** agent (WCAG 2.2 AA, specialized for the
dark theme and dense tables). It checks, end to end:

- **Keyboard** — full operability, visible focus, no traps, sensible order.
- **Screen reader** — landmarks, headings, labels, alt text (the recurring
  empty `alt=""` on hero images on `/films/[slug]` and `/crew/[slug]` is a real
  violation, not cosmetic).
- **Color contrast** — text and non-text on the dark warm palette; the
  `--cc-paper` / `--cc-amber` / `--cc-ink` tokens must clear AA.
- **Reduced motion** — `prefers-reduced-motion` respected.
- **200% zoom and 320px width** — no loss of content or function.

### 3. Report

Write `vault/output/audits/YYYY-MM-DD-<slug>-a11y-audit.md`. For each
violation: the WCAG criterion, the file/route, and the concrete fix. Rank by
severity — a keyboard trap or missing form label outranks a marginal contrast
ratio.

## Guardrails

- AA is the bar; do not pass a page that only "mostly" meets it.
- Don't propose removing density or color identity to chase contrast — fix the
  token or the pairing instead.
- This skill audits; fixes are a separate, explicit step.

## Finish

Append to `vault/learnings/cinecanon-a11y-audit.md`: violations found, any
recurring one (e.g. empty `alt`), and whether it warrants an automated
axe-core check in `ci.yml`.
