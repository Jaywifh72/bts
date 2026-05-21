---
name: cinecanon-claim-grader
description: Grades new or changed editorial claims against CineCanon's T7-1 to T7-7 confidence rubric, attaches sources, and determines whether each claim emits as Schema.org ClaimReview. Wraps the cinecanon-citation-steward agent. Use when adding or editing claims, when the user says "grade these claims", "what tier is this", "confidence grade", or as the grading step inside cinecanon-dossier-builder.
---

# cinecanon-claim-grader

## What this skill is

The Editorial procedure for grading claims (Domain B). It applies the T7 rubric
consistently so the brand promise — every claim cited and confidence-graded —
holds. Rubric reference: `vault/wiki/patterns/confidence-grading.md`.

## When this skill triggers

- "Grade these claims" / "what confidence tier is this?"
- Adding or editing claims on any dossier
- The grading step of `cinecanon-dossier-builder`

## Procedure

### 1. Collect the claims and their sources

- List each factual claim and its supporting source(s). A claim with no source
  is not yet a claim — get a source or it does not ship.

### 2. Grade each claim

Delegate to the **`cinecanon-citation-steward`** agent, which owns the rubric.
Apply:

| Grade | Label | Source type |
|---|---|---|
| T7-1 | Verified | Primary |
| T7-2 | Verified | Trade |
| T7-3 | Verified | Academic |
| T7-4 | Confirmed | Cross-referenced secondary |
| T7-5 | Reported | Single secondary |
| T7-6 | Reported — Community | Forum / community |
| T7-7 | Uncertain | Explicitly uncertain |

Grade honestly to the *actual* strength of the source. Do not round a T7-5 up
to T7-4 because cross-referencing would be convenient — find the second source
or leave it at T7-5.

### 3. Determine emission

- **T7-1…T7-5** → emits as `ClaimReview` (T7-1/2/3 → rating 5, T7-4 → 4,
  T7-5 → 3). Always gate on `shouldEmitClaimReview(grade)` in
  `apps/web/lib/jsonLd.tsx`.
- **T7-6, T7-7** → **never** structured data. UI badge only.

### 4. Record

- Write the claim + source + grade into the `claims` table per the existing
  schema (`0033_claims.sql`). Surface the grade in the UI.

## Guardrails

- **Never inflate a grade to get a claim into schema.** A hallucinated or
  over-graded citation is worse than no citation — it breaks the one promise.
- T7-7 is a legitimate, honest outcome. Mark it and move on.
- Disputed or contested claims route to `cinecanon-citation-audit` for the
  full dispute trail.

## Finish

Append to `vault/learnings/cinecanon-claim-grader.md`: claims graded, the
distribution across tiers, any source-type call that was genuinely ambiguous.
