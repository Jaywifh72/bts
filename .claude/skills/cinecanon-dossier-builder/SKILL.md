---
name: cinecanon-dossier-builder
description: Builds or expands a single CineCanon dossier — a film, crew member, or facility — end-to-end: gathers the technical metadata, grades and cites every claim, writes the curated seed, and verifies the page renders with correct JSON-LD. Use when the user wants to add a new film/crew/facility to CineCanon, fill out a thin dossier, "build the dossier for [X]", "expand [X]", "add the lighting/lens/color data for [film]", or enrich an existing entity's curated content.
---

# cinecanon-dossier-builder

## What this skill is

The procedure for filling one dossier with deep, cited, confidence-graded
content. The `cinecanon-entity-scaffolder` skill builds an entity *type*; this
skill builds one *instance* well. The brand promise — every claim cited and
confidence-graded — is the whole job.

## When this skill triggers

- "Build / create the dossier for `<film | crew | facility>`"
- "Expand / enrich / fill out `<X>`'s page"
- "Add the `<camera | lens | lighting | color | stunt | VFX | score>` data for `<film>`"
- A dossier flagged thin by `cinecanon-qa-sweep` or `cinecanon-citation-audit`

## Procedure

### 1. Scope and template

- Identify the entity and which sections need content (camera/lens/filters,
  lighting plot, color pipeline, locations, VFX vendors, awards, score, sound,
  stunts — as applicable).
- Open a marquee dossier of the same kind as the quality bar (e.g. a curated
  Best-Cinematography film). Match its depth.

### 2. Gather

- Use the scrapers / existing data first (TMDb, Wikidata, MusicBrainz). For
  editorial depth, research trade and primary sources (ASC, fxguide, ICG,
  cinematographer interviews, press kits).
- Stage raw research in `vault/raw/research/YYYY-MM-DD-<slug>.md` as you go.

### 3. Grade and cite every claim

- Every factual claim gets a source and a T7 grade. Apply
  `cinecanon-claim-grader` (rubric: `vault/wiki/patterns/confidence-grading.md`).
- A claim with no source is not a claim — leave it out or mark it T7-7 and
  surface it honestly. Never invent a gear list or a lighting motivation.
- T7-1…T7-5 will emit as `ClaimReview`; T7-6/T7-7 are UI-badge only.

### 4. Write the seed

- Add or update the curated seed in `packages/db/src/seed/data/`.
- Lighting-plot and color-pipeline paragraphs carry cinematographer
  *motivation*, not just specs — that is the editorial voice.
- Serialize Postgres array literals correctly.

### 5. Verify

- Run the page locally (`pnpm web:dev`); confirm every section renders.
- Confirm JSON-LD is present and the `ClaimReview` blocks match the graded
  claims. Confirm the TMDb attribution footer is present if TMDb data shows.
- Run `cinecanon-ship-checklist`.

## Guardrails

- **Never fabricate technical metadata.** A wrong cited claim is worse than no
  claim — it is the one thing the brand cannot afford.
- Respect third-party licensing — if in doubt about a poster, still image, or
  quoted text, run `cinecanon-legal-review`.
- Don't degrade fact-per-fold density; if the page restructures, run
  `cinecanon-density-review`.

## Finish

Append to `vault/learnings/cinecanon-dossier-builder.md`: the dossier, the best
sources found, any claim that could only reach T7-6/T7-7 and why.
