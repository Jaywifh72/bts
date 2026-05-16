# Theme F — Schema-tier follow-ups

**Status:** planning · drafted 2026-05-15
**Scope:** the four schema-touching items deferred from the UX-audit P0→G implementation pass.

This document is intentionally not a migration. It's the spec session that has to happen before any drizzle migration is generated. The goal is to ground each item in:
1. what user task is currently broken or weak,
2. what the schema actually carries today (with citations to the existing tables),
3. the minimum-viable shape that lights up the dormant UI,
4. a backfill strategy,
5. open questions that need a human decision before a PR can land.

The four items are F1–F4 from the master plan. **Audit revealed two upgrades to that plan**, called out below.

---

## Audit-driven plan revisions

Two findings while reviewing the existing schema changed the recommendation:

### Revision 1 — F2 is not a migration

The master plan listed F2 as "new citation tables per entity type" (`person_claims`, `vfx_claims`, etc.). **This is wrong.** The existing `claims` schema (`packages/db/src/schema/claims.ts`) is already polymorphic:

```ts
// already exists, already polymorphic
claimEntities = pgTable('claim_entities', {
  claimId: ...,
  entityType: claimEntityTypeEnum,   // 'production' | 'person' | 'vfx_house' | 'post_house' | 'equipment_*' | 'video' | 'scene' | 'location' | 'role' | 'source'
  entityId: bigint,
  entitySlug: text,
});
```

And `claimEntityTypeEnum` in `enums.ts:142` already enumerates **every entity type the UI cares about**. Citation-rendering on `/crew/[slug]`, `/vfx/[slug]`, `/stunts/companies/[slug]`, `/format/[slug]`, etc. is **purely a query + render task** — no schema work required. This downgrades F2 from "multi-week" to "1–2 sessions of query writing + UI plumbing."

### Revision 2 — F3 is partially complete

`post_houses` already exists (`schema/post-houses.ts`) with a clean `kind` enum that includes `sound_mix`, `sound_design`, `color`, `di_lab`, `finishing`, `mastering`. This covers:
- `/sound` department vendor panel (post-houses with `sound_mix` / `sound_design`)
- `/production-design` — partially, via `color` / `finishing` for grading houses; needs a separate `build_shops` table for construction
- Doesn't cover music (no `scoring_stages`) or costume (no `workshops`)

So F3 is two new tables (music, costume), not four.

---

## Revised ordering & summary

| # | Item | Effort | Risk | UI it unlocks | Ship order |
|---|---|---|---|---|---|
| **F4** | `is_primary` boolean on `crew_assignments` | S (1–2 hrs) | Low | Cleaner `/films/compare` query; "Primary DP" / "Primary editor" everywhere | **1st** |
| **F1** | Provenance columns on people / vfx_houses / stunt_companies / stunt_schools / media_assets | M (1 day migration, multi-day backfill) | Low–Medium | `EntityProvenanceFooter` "Verified N days ago" + "Curated by" byline on 7 entity types; `PersonTable` tier column | **2nd** |
| **F2** | Render `[N]` citations on non-film entity pages (no migration, just queries + UI) | M–L | Low | `[N]` markers on crew biographies, vfx-house overviews, stunt-company taglines, awards detail rows | **3rd** |
| **F3a** | `scoring_stages` table for music vendor panel | S (small migration, hard data-sourcing) | Medium | `/music` vendor panel (Newman Stage, AIR Lyndhurst, Eastwood Stage, Abbey Road…) | **4th** |
| **F3b** | `workshops` table for costume / wardrobe vendor panel | S (small migration, hard data-sourcing) | Medium | `/costume-hair-makeup` vendor panel | **5th (or skip until demand)** |
| **F3c** | `build_shops` table for production-design vendor panel | S | Medium | `/production-design` vendor panel | **defer** |

**Total realistic effort: ~2 working weeks** to complete F1, F2, F3a, F4. F3b and F3c are skippable until a curator volunteers to ingest the data.

---

## F4 — `is_primary` on `crew_assignments` (ship first)

### Problem
The existing schema is:
```ts
crewAssignments = pgTable('crew_assignments', {
  productionId, personId, roleId, creditOrder, creditNameOverride, startedOn, endedOn, notes,
});
```

There's no flag for "this is the lead DP" vs "this is an additional photographer." Today, the codebase fakes it with `credit_order ASC NULLS LAST LIMIT 1` — which works most of the time but is wrong when:
- Multiple co-DPs share a project (`credit_order=1, credit_order=1`)
- A second-unit DP is listed first by data-import accident
- A documentary lists 3 cinematographers; "primary" is editorial, not credit-order

I hit this writing `getProductionsForComparison` for `/films/compare` — the subquery is messy:
```sql
ORDER BY ca.credit_order ASC NULLS LAST LIMIT 1
```
With `is_primary`, it becomes:
```sql
WHERE ca.is_primary = TRUE LIMIT 1
```
…and the curator can explicitly mark co-DPs as both primary.

### Proposed shape
```sql
ALTER TABLE crew_assignments
  ADD COLUMN is_primary BOOLEAN NOT NULL DEFAULT FALSE;

-- Partial index for the common "primary X on production Y" lookup
CREATE INDEX crew_assignments_primary_idx
  ON crew_assignments (production_id, role_id)
  WHERE is_primary;
```

### Backfill
Heuristic: for each `(production_id, role_id)` group, mark the row with the lowest `credit_order` (NULLS last, tiebreaker `created_at` asc) as `is_primary = TRUE`.

```sql
WITH ranked AS (
  SELECT id,
         ROW_NUMBER() OVER (
           PARTITION BY production_id, role_id
           ORDER BY credit_order ASC NULLS LAST, created_at ASC
         ) AS rn
  FROM crew_assignments
)
UPDATE crew_assignments ca
SET is_primary = TRUE
FROM ranked r
WHERE ca.id = r.id AND r.rn = 1;
```

For multi-primary edits (co-DPs), curators flip individual rows in `/admin/curate`.

### UI rollout
- Rewrite `getProductionsForComparison` to use `is_primary`
- New helper `getPrimaryCrewForRole(productionSlug, roleSlug)` — replaces ~6 ad-hoc subqueries
- Admin: add an "is_primary" toggle to the crew-assignment edit form
- `ProductionDetail.tsx` crew section: pin primary crew above secondary crew per department

### Effort
Migration + backfill + drizzle codegen: **~1 hour.** UI consumption: **~2 hours** across 6 call sites.

### Open questions
1. **Do we want a CHECK constraint guaranteeing ≥1 primary per `(production_id, role_id)`?** No — some role/production combos have no primary (e.g. uncredited additional photographers). Backfill leaves those at `FALSE`.
2. **Should the admin form auto-promote when current primary is deleted?** Yes; add a trigger or a post-delete hook in the curator action.

### Recommendation
**Ship F4 first.** It's the smallest, cleanest, least risky, and immediately cleans up code I wrote in the audit pass. No reason to defer.

---

## F1 — Provenance columns on non-film entities

### Problem
The `EntityProvenanceFooter` is mounted on 7 entity detail pages but **renders only the correction CTA** on six of them, because the columns it consumes (`last_verified_at`, `curated_by`, `curated_by_url`, `last_curated_review`, `data_tier`) only exist on `productions`. The audit's P0-2 specifically called out that "provenance is a film-detail privilege, not a site primitive" — extracting `EntityProvenanceFooter` was the structural fix. F1 is what makes the data flow.

### Affected tables
Five entity tables need the same column set:

| Table | Has provenance now? | Backfill scope |
|---|---|---|
| `people` | ❌ | ~600 rows; ~30 are curated, rest imported from TMDb |
| `vfx_houses` | ❌ | ~80 rows; majority curated |
| `stunt_companies` | ❌ | ~25 rows; nearly all curated |
| `stunt_schools` | ❌ | ~10 rows; all curated |
| `media_assets` | ❌ | ~400 rows; tier semantics differ (see below) |

`stunt_sequences` and `safety_bulletins` arguably want provenance too but are nested under productions — provenance can route through the parent production until proven otherwise.

### Proposed shape (per table)
```sql
ALTER TABLE <table> ADD COLUMN data_tier production_data_tier NOT NULL DEFAULT 'imported';
ALTER TABLE <table> ADD COLUMN curated_by TEXT;
ALTER TABLE <table> ADD COLUMN curated_by_url TEXT;
ALTER TABLE <table> ADD COLUMN last_curated_review TIMESTAMPTZ;
ALTER TABLE <table> ADD COLUMN last_verified_at TIMESTAMPTZ;
```

**Reuse the `production_data_tier` enum** (`'curated' | 'imported'`) rather than declaring per-table enums. Add `'mixed'` to the enum if a future entity needs a third tier (e.g. media_assets that are auto-imported but human-captioned).

### Backfill strategy
Two-phase, low-risk:

**Phase A — bulk mark as `imported`.** Migration sets every existing row to `data_tier='imported'`, `last_verified_at=NOW()`. This is conservatively correct: assumes nothing was hand-curated until proven otherwise.

**Phase B — curator backfill via admin UI.** New admin action in `/admin/curate/edit/<entity>/<slug>` lets a curator:
1. Flip `data_tier` to `curated`
2. Set `curated_by` (their handle) + `curated_by_url` (their portfolio link)
3. Stamp `last_curated_review` to now

The footer then immediately renders rigor badges, byline, and verified-N-days-ago on that entity. **The UI is already in place** — F1 just turns the lights on row-by-row as curators audit each dossier.

### Special case — `media_assets`
A `media_asset` isn't really curated/imported the way a person or a vfx_house is. It's a URL with metadata. The provenance semantics here should be:
- `data_tier='curated'` → the asset was manually associated with at least one entity by a curator (vs. auto-ingested from TMDb)
- `last_verified_at` → most recent successful link-check (already tracked via `sources.last_status` for source rows; merge that signal into media_assets at the rendering layer)
- `curated_by` → who attached the *first* association

Treat media_assets as a follow-on to the simpler entity migrations; ship people/vfx_houses/stunt_* first.

### UI rollout
- `EntityProvenanceFooter` already accepts all five fields; pass them through from each detail page's query
- `PersonTable` C2 (deferred): add `tier` column once `people.data_tier` exists; render the same chip styling as `ProductionTable`
- `getPersonBySlug` / `getVfxHouseWithFilmography` / etc. need their SELECT extended to include the 5 new columns
- `/admin/curate/edit/<entity>/<slug>`: new form section for the curation fields

### Effort
- Drizzle migrations: 5 tables × ~15 min = **1.5 hrs**
- Backfill SQL: trivial
- Query updates (5 entity-detail queries): **2 hrs**
- Admin form: **half day**
- Per-entity curator audit (the slow part): **ongoing**; not blocking the PR

### Risk
**Low.** Adding nullable columns with defaults is reversible; no data is overwritten. The only failure mode is forgetting to update a detail-page query — which the typecheck will catch since the `EntityProvenanceFooter` props are typed.

### Open questions
1. Use `production_data_tier` enum site-wide, or define `entity_data_tier` with broader values? **Recommendation: reuse.** Adding a value to an enum is cheap if needed later.
2. Should `last_verified_at` be auto-stamped on any UPDATE to the entity? **No.** Verification is an editorial signal, not a "the row was modified" signal. Curators stamp it explicitly.
3. What does `last_curated_review` mean for entities that have never been formally reviewed? **Null.** The byline renders only when `curated_by` is set; null `last_curated_review` just hides the "Last reviewed N months ago" sub-line.

### Recommendation
**Ship F1 second**, after F4. Bundle as one migration touching all five tables (drizzle handles multi-table migrations fine). Backfill in the same migration with the `'imported'` default. Curator audit pass runs in parallel for as long as it takes.

---

## F2 — `[N]` citations on non-film entity pages (NOT a migration)

### Problem
Crew biographies, vfx-house "About" copy, stunt-company taglines, and award rows render factual claims **without `[N]` markers**, even though the underlying `claims` graph exists. The reader can't tell whether "Roger Deakins, BSC, was born in Torquay" is sourced or asserted.

### What's already in place
- `claims` table — every claim is a structured row with confidence, status, last_verified_at
- `claim_sources` — links claims to source URLs with quotes, page numbers, timestamps
- `claim_entities` — links claims to ANY entity via `(entity_type, entity_id)` — already includes `person`, `vfx_house`, `post_house`, `equipment_*`, `scene`, `location`, `video`, `source`
- `ClaimConfidenceBadge` + `CitationMarker` + `SourcesList` components — render the markers/badges/footnotes

### What's missing
- A query: `getClaimsForEntity(entityType, entityId)` that joins claims → claim_sources → sources for rendering
- A render helper: `<ClaimList claims={…} />` that mirrors the production-detail claims section but for arbitrary entity types
- **Editorial work**: turning unstructured biography paragraphs into structured claims with attached sources. This is the slow part.

### Two approaches to text annotation

The hardest design decision in F2:

**A. Inline `{{N}}` markers in biography source text.** Curator writes:
```
"Roger Deakins, BSC{{1}}, was born in Torquay{{2}} in 1949{{2}}."
```
At render time, replace `{{N}}` with `<CitationMarker numbers={[N]} />`. Simple, but couples editorial text to claim ordering and makes claim reuse awkward.

**B. Structured claims rendered alongside paragraphs.** Biography paragraph reads naturally; a "Sourced claims" panel below lists each structured claim with its `[N]` and confidence badge. Decouples text from claim IDs; matches how the film-detail `ProductionClaims` already works.

**Recommendation: B.** Mirrors the existing convention. Biography stays human-readable. Claims panel renders below, sortable by confidence. No inline-markup discipline required from curators.

### UI rollout
- New query: `getClaimsForEntity(db, entityType, entityId)` in `queries/claims.ts`
- New component: `<EntityClaimsList claims={…} />` — generalization of `ProductionClaims`
- Mount on: `/crew/[slug]`, `/vfx/[slug]`, `/stunts/companies/[slug]`, `/stunts/schools/[slug]`, `/format/[slug]`, `/societies/[slug]` — under `<EntityProvenanceFooter>` and above existing content
- `CareerStats` and `FilmographyTable` (C7-deferred): once entity-level claims exist, surface `[N]` markers on individual rows where a claim attaches (e.g. "ASC member since 1999 [3]")
- `AwardsList` already has source URLs (C6 shipped); merge into the entity claims footnote list rather than rendering inline `[src] ↗` separately, for visual consistency

### Effort
- Query: **30 min**
- Render component: **2 hrs**
- 6 detail-page mounts: **30 min each**
- Editorial pass to populate person/vfx_house/stunt_company claims with sources: **multi-week curator-side work, not blocking the PR**

### Risk
Low for the UI layer. The editorial work is unbounded but graceful: pages render empty claims panel when no claims attach to that entity, exactly like the production-detail page does today.

### Open questions
1. **Should `[N]` markers appear inside biography body text or only in a side panel?** Recommendation: side panel only (option B). Biography stays clean prose.
2. **How do we handle claims that contradict each other?** The schema already has `claim_conflicts`. Render conflicting claims with a `⚠ disputed` glyph and link to the resolution view (admin already has one).
3. **Should the homepage / global search surface entity claims?** Out of scope. Claims belong on the entity detail page.

### Recommendation
**Ship F2 third.** Single PR for the query + component + 6 page mounts. Curator backfill is async after merge. The big editorial pass happens entity-by-entity over weeks; no need to gate the code on data completeness.

---

## F3 — Per-department vendor schemas

### Problem
The `DepartmentIndex` component (sound/editing/music/costume-hair-makeup/production-design) has a `vendors?: ReactNode` slot that's currently unused. The audit said:
> Each department deserves a bespoke "vendor" panel: sound → post-houses, music → scoring stages, costume → workshops, production-design → build shops.

### What's already in place
- `post_houses` table with `sound_mix` / `sound_design` / `color` / `di_lab` / `finishing` / `mastering` kinds
- `production_post_houses` join with `role` enum — production-side associations already model "Skywalker Sound mixed the sound" / "Company 3 graded color"

So:
- **Sound** vendor panel can be built **today** from `post_houses WHERE kind IN ('sound_mix','sound_design')`. **No migration needed.**
- **Editing** has no obvious vendor (editors freelance); skip a vendor panel for `/editing`.

### What's missing
| Department | New table | Estimated row count | Data source |
|---|---|---|---|
| Music | `scoring_stages` | 30–50 | Editorial hand-seed (Newman Stage, AIR Lyndhurst, Abbey Road One, Eastwood Stage, etc.) |
| Costume | `costume_workshops` | 50–100 | Editorial hand-seed (Cosprop, Angels Costumes, Western Costume, etc.) |
| Production design | `build_shops` | 20–40 | Editorial hand-seed |

### Proposed shape — F3a: `scoring_stages` (recommended)
```sql
CREATE TABLE scoring_stages (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  facility_name TEXT,        -- e.g. "Newman Scoring Stage" inside "Fox Studios"
  country TEXT,
  city TEXT,
  capacity_orchestra INT,    -- typical orchestra size in players
  capacity_chorus INT,
  website TEXT,
  notes TEXT,
  -- provenance from F1
  data_tier production_data_tier NOT NULL DEFAULT 'imported',
  curated_by TEXT,
  curated_by_url TEXT,
  last_curated_review TIMESTAMPTZ,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE production_scoring_stages (
  production_id BIGINT NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  scoring_stage_id BIGINT NOT NULL REFERENCES scoring_stages(id) ON DELETE RESTRICT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (production_id, scoring_stage_id)
);
```

Mirrors `post_houses` exactly. `production_scoring_stages` is the production-side join.

### Proposed shape — F3b: `costume_workshops`
Identical structure to `scoring_stages` minus the orchestra/chorus capacity columns; add `specialties text[]` (e.g. `{period, fantasy, military}`).

### Proposed shape — F3c: `build_shops`
Same again. Add `disciplines text[]` (`{construction, fabrication, sculpting, scenic_painting}`).

### Backfill / data sourcing
Each table needs a **hand-curated seed** — there's no API to scrape. Realistic timelines:
- `scoring_stages`: half-day to seed the 25 best-known stages worldwide
- `costume_workshops`: full day; the field is fragmented
- `build_shops`: full day

This is the **bottleneck**. The migration is trivial; the data ingest is editorial work.

### UI rollout
- `DepartmentIndex.tsx` already has the `vendors?: ReactNode` slot — pass it from each department page
- `/music`: render top 10 `scoring_stages` ranked by `(production_scoring_stages count)` desc
- `/costume-hair-makeup`: same shape against `costume_workshops`
- `/production-design`: same against `build_shops`
- `/sound`: **today** — render from `post_houses WHERE kind IN ('sound_mix', 'sound_design')`, no schema work needed

### Effort
- F3a (music): migration + 30-row seed + `/music` panel: **~1 day**
- F3b (costume): same: **~1 day**
- F3c (production-design): same: **~1 day**
- Sound vendor panel (no migration): **~2 hrs**

### Risk
**Medium.** Not because the schema is hard — but because the data work is slow and the panel renders empty until it's done. Risk is the "graceful degrade" path: ensure the page reads correctly with zero vendor rows (matches `/locations` "An interactive map is on the roadmap" tone).

### Open questions
1. **Are `scoring_stages` regionalisable?** A scoring session in Vienna isn't the same vendor pool as one in LA. Add `region` enum or stay slug-based with country? Recommendation: country column is fine; the UI can filter by user region later (matches D5 region-first).
2. **Do workshops attach to costume_designers (people) or to productions?** Both. Schema should support `production_costume_workshops` AND `person_costume_workshops` (designer's home studio). Two joins, easy.
3. **Should F3 share a generic `vendors` table with `vendor_kind` enum instead of one table per department?** No — the kind-specific columns (`capacity_orchestra` for stages, `specialties` for workshops) justify separate tables. Polymorphism here would force everything into a generic `metadata jsonb` blob and lose the typing.

### Recommendation
- **Ship the sound vendor panel today** (no migration). Lights up `/sound` immediately.
- **Ship F3a (music) next** as the second-highest-leverage vendor panel. Music readers explicitly ask about scoring stages.
- **Defer F3b and F3c** until a curator is actively seeding the data. Migrations are cheap; empty panels aren't worth shipping.

---

## Combined ship plan

**Week 1**
1. F4 migration + backfill + UI cleanup (~3 hrs)
2. F1 migration on 4 entity tables + backfill (skip media_assets) (~4 hrs)
3. F1 query updates + EntityProvenanceFooter data flow (~3 hrs)
4. `/sound` vendor panel from existing `post_houses` data (~2 hrs)

**Week 2**
5. F2 query + EntityClaimsList component + 6 detail-page mounts (~1 day)
6. F3a music scoring_stages migration + 30-row seed + `/music` panel (~1 day)
7. F1 on `media_assets` (~half day)
8. Curator audit pass to flip `data_tier='curated'` on the highest-traffic entities

**Deferred indefinitely**
- F3b (costume workshops) — wait for data
- F3c (build shops) — wait for data
- The big editorial claims backfill — ongoing curator work

---

## Risks and what to watch

### Cross-cutting
- **Cache invalidation.** Most index pages use `revalidate=86400`. After F1/F4 ship, run a one-off `revalidatePath('/films')`, `revalidatePath('/crew')`, etc., or readers see stale renders for up to a day.
- **CitationRigorBadge component math.** The `CitationRigorData` calculation today assumes production-side claims. Verify the score formula doesn't divide-by-zero on entities with mixed claim coverage. The component already handles null cleanly.
- **Cost.** F2 editorial work is open-ended. Set a clear "MVP claim set" per entity type (e.g. for a person: birth, nationality, society memberships, schools, signature awards = 5 claims minimum) so the rollout doesn't drag on forever.

### Per-item
- **F4** — backfill picks "lowest credit_order" which may be wrong for some old TMDb-imported rows where credit_order was set by TMDb's own opaque rules. Curator can fix per-production via admin form; not a blocker.
- **F1** — using the existing `production_data_tier` enum on entities is opinionated. If a curator wants a `'partial'` tier for half-curated entries, we'd need to add an enum value site-wide. Cheap, but worth flagging.
- **F3a** — `production_scoring_stages` is a many-to-many but each production usually has exactly one scoring stage. Could be `productions.scoring_stage_id` column instead. Choose many-to-many to support productions with multiple scoring sessions (rare but real — Atmos remixes).

---

## What this plan deliberately does NOT include

- **Filmography text-claim annotation.** Inline `{{N}}` markers in biography text (F2 option A). Out of scope.
- **`sources.last_status` link-rot monitoring extended to media_assets URL.** Reuses existing infrastructure; not a schema change.
- **`scenes` and `safety_bulletins` provenance columns.** These nest under productions; provenance can route through the parent.
- **Per-region vendor filtering.** Once F3a/b lands, "show me LA-based scoring stages only" is a UI filter, not a schema concern.
- **A `claim_authors` table.** Some claims should attribute editorial authorship (which curator wrote it). Out of scope until needed.

---

## Sign-off checklist

Before turning any of this into drizzle migrations:

- [ ] Confirm `production_data_tier` enum reuse vs. new entity-scoped enum
- [ ] Confirm F1 backfill default of `'imported'` is correct for `media_assets`
- [ ] Confirm `is_primary` admin trigger behaviour on row deletion
- [ ] Confirm the F2 design (option B — side panel) over inline `{{N}}`
- [ ] Confirm F3a vs F3b/c prioritisation (recommendation: F3a only for v1)
- [ ] Confirm cache-invalidation strategy after F1 ships
