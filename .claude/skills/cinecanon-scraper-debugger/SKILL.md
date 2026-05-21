---
name: cinecanon-scraper-debugger
description: Diagnoses and fixes a failing or misbehaving ingest pipeline in packages/scraper — TMDb, Wikidata, MusicBrainz, RSS, social, or Wayback — including bad query ranking, Postgres array-literal traps, and postgres-js row-shape surprises. Use when a scraper errors, produces wrong or empty data, the user mentions "musicbrainz", "tmdb ingest", "wikidata", "the scraper is failing", "bad scrape data", or a weekly scraper run failed.
---

# cinecanon-scraper-debugger

## What this skill is

The procedure for debugging `packages/scraper`. The git history shows ingest
debugging is recurring — especially MusicBrainz query ranking and Postgres
array-literal serialization. This skill makes that debugging systematic.

## When this skill triggers

- "The `<TMDb | Wikidata | MusicBrainz | RSS | social | Wayback>` scraper is
  failing / returning wrong data"
- A `scraper-weekly.yml` or `scraper-job.yml` run failed
- Empty, duplicated, or mis-ranked ingest results

## Procedure

### 1. Reproduce

- Run the specific CLI command locally against the Docker Postgres:
  `pnpm --filter @bts/scraper cli <command>`.
- Capture the exact failure — exception, wrong row count, or wrong ranking.
- Stage the raw observed output in `vault/raw/research/` if it is large.

### 2. Check the known traps first

- **Postgres array literals.** `text[]` columns need a PG array *literal*, not
  a JS array — a recurring `fix(seed)` / `fix(musicbrainz)` cause. Symptom:
  insert errors or single-element arrays getting flattened.
- **postgres-js row shape.** A `postgres-js` row is not a plain array; indexing
  it like one is a TypeScript and runtime trap (commit `4dafacbf`).
- **MusicBrainz ranking.** OST/score titles must be boosted and promo singles
  penalized; the Lucene query needs an artist/composer clause or it mis-ranks
  (commits `26cdd39b`, `ef1ff3fd`, `ef30771b`). Pick the max-tracks release.
- **ANY(bigint[]) drift.** Drizzle + `ANY()` over arrays has a literal trap —
  prefer per-row `UPDATE` when in doubt (commits `2ef89d98`, `295f51ee`).

### 3. Isolate and fix

- Narrow to the smallest failing unit — one record, one query.
- Fix in `packages/scraper/src/<pipeline>/`. Keep the fix minimal and typed.
- If the fix changes data shape, check the consuming schema/queries still hold.

### 4. Verify

- Re-run the CLI command; confirm correct count, ranking, and types.
- `pnpm typecheck`. Run `cinecanon-ship-checklist` if app/db code changed.
- Long backfills use their own DB connection — never the web app's pool.

## Guardrails

- Don't widen scope into a refactor; fix the failing pipeline.
- Don't paper over bad upstream data — if a source is wrong, record it (it may
  be a `cinecanon-citation-audit` or `cinecanon-legal-review` matter).
- Errors in production paths go to Sentry, not `console`.

## Finish

Append to `vault/learnings/cinecanon-scraper-debugger.md`: the pipeline, the
root cause, and — if it was a known trap — whether the trap note in
`vault/wiki/patterns/` needs sharpening.
