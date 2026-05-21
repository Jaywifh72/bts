# Pattern: confidence grading (the T7 rubric)

CineCanon's defensibility versus IMDb, TMDb, Letterboxd, and Wikipedia is that
**every claim is cited and confidence-graded**. The grade is not cosmetic — it
controls whether a claim is emitted as Schema.org structured data.

## The seven tiers

| Grade | Label | Meaning |
|---|---|---|
| T7-1 | Verified | Primary source |
| T7-2 | Verified | Trade source |
| T7-3 | Verified | Academic source |
| T7-4 | Confirmed | Cross-referenced secondary |
| T7-5 | Reported | Single secondary |
| T7-6 | Reported — Community | Forum / community source |
| T7-7 | Uncertain | Explicitly marked uncertain |

Schema reference: `claims` table (`0033_claims.sql`), entity-type extension in
migration `0061`.

## The hard rule

- **T7-1 … T7-5** → emitted as Schema.org `ClaimReview`.
  - T7-1/T7-2/T7-3 → `reviewRating.ratingValue: 5`
  - T7-4 → `ratingValue: 4`
  - T7-5 → `ratingValue: 3`
- **T7-6, T7-7** → **never** emitted as structured data. UI badge only.

Always call `shouldEmitClaimReview(grade)` (`apps/web/lib/jsonLd.tsx`) before
emitting. If a claim is T7-7, it is T7-7 — the UI shows it honestly; structured
data stays silent. Do not "round up" a grade to get a claim into schema.

## Who owns it

The `cinecanon-citation-steward` agent owns the rubric. The
`cinecanon-claim-grader` skill applies it to new claims; `cinecanon-citation-audit`
sweeps a dossier's existing grades. `/methodology` on the live site is the
public spec — treat it as canon.
