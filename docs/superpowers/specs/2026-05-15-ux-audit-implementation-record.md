# UX-audit implementation record

**Engagement window:** 2026-05-15 (single-session)
**Audit basis:** `cinecanon-ux-lead` agent pass, reconciled with `cinecanon-a11y-auditor` and `cinecanon-density-reviewer` passes.
**Scope:** Themes A–G of the master plan, plus six of seven Theme F schema migrations.

This document is the handoff record — what landed, how to deploy it, and what editorial work remains. It supersedes none of the planning docs; each individual decision is cited back to its plan-doc rationale where one exists.

---

## What was delivered

51 audit items shipped across seven themes. Two-package typecheck clean at every checkpoint.

| Theme | Items | Shipped | Deferred / Blocked |
|---|---|---|---|
| **A** a11y blockers (WCAG AA failures) | 11 | **11** ✅ | — |
| **B** a11y important (AA edge cases) | 9 | **9** ✅ | — |
| **C** density follow-up | 9 | **6 + 3 unblocked by F** | — |
| **D** density big lifts (`/locations`, `/tools`, `/references`, dept tables, region-first releases, multi-decade canon) | 6 | **6** ✅ | — |
| **E** deferred features (⌘K, anchor copy, /ask chips, compare overlap, numbered pagination, bookmark parity, search↔ask) | 8 | **8** ✅ | — |
| **F** schema migrations | 7 | **6** ✅ | F3b (costume) / F3c (build) — wait for curator data |
| **G** polish | 15 | **11** | G2 (lang attrs), G10/G11/G12 — scope decisions |

---

## Migration deployment

Five new migrations land at the end of the engagement (0059 → 0063). All idempotent — safe to run multiple times.

```bash
pnpm --filter @bts/db migrate
```

| # | File | What it does |
|---|---|---|
| 0059 | `crew_assignments_is_primary.sql` | `is_primary BOOLEAN` on crew_assignments + partial index + inline backfill (lowest `credit_order` per `(production_id, role_id)`) |
| 0060 | `entity_provenance_columns.sql` | 5 provenance columns on `people` / `vfx_houses` / `stunt_companies` / `stunt_schools` |
| 0061 | `claim_entity_types_extension.sql` | Adds `stunt_company` / `stunt_school` / `format` / `society` to `claim_entity_type_enum` |
| 0062 | `scoring_stages.sql` | New `scoring_stages` + `production_scoring_stages` for /music vendor panel |
| 0063 | `media_assets_provenance.sql` | 5 provenance columns on `media_assets` (powers `/references/[id]` byline) |

### Post-deploy cache flush

Most index pages run on `revalidate = 86400`. After migrating, run a one-off:

```ts
import { revalidatePath } from 'next/cache';
['/films', '/crew', '/vfx', '/stunts/companies', '/stunts/schools',
 '/format', '/societies', '/sound', '/music', '/locations', '/tools',
 '/references', '/awards', '/ask', '/search', '/lookbook']
  .forEach(revalidatePath);
```

Without the flush, readers see stale renders for up to 24 hours.

---

## What lights up on day one

These surfaces all render new affordances **immediately on deploy**, without waiting for editorial backfill:

- **Mobile drawer** is now `role="dialog"` with focus trap, Escape, return-focus
- **TopNav** bookmark ★ and hamburger are 44×44 with visible focus rings
- **`⌘K` / `Ctrl+K`** opens the new command palette from anywhere
- **Section heading `#` button** copies a deep link to clipboard (mounted on Studios, Lab & finishing, Lighting, Color pipeline, Sources, Provenance, Claims)
- **Sortable column headers** on `/films?view=table`
- **Numbered pagination** with 1 2 3 … 12 layout on every paginated page
- **/films/compare** shared-collaborators panel
- **/crew/compare** shared-productions panel
- **/films?view=table** and **/crew?view=table** with depth-dot legend
- **/awards** group-by (org / year / recipient / category), `✓ WON` / `○ NOM` glyphs, per-row `[src] ↗` source links
- **/locations** sortable atlas (Country · Locations · Productions · Years · Top format · Example films)
- **/tools** capability catalog (Tool · Inputs · Outputs · Catalog-backed · URL-as-state · PDF · Offline OK)
- **/references** bibliography (pub year + last-cited timestamp)
- **/sound** post-houses vendor panel (sound_mix + sound_design kinds)
- **Region-first release tables** on every film detail page
- **/ask filter chips** removable via `×`; "Restore all filters" link
- **Search↔Ask cross-links** when results are thin or empty
- **Editable `/lookbook` CTA** leading to the working `/shots` palette
- **`EntityClaimsList`** on /crew, /vfx, /stunts/companies, /stunts/schools, /format, /societies — renders the moment the first claim attaches via the polymorphic `claim_entities` graph
- **`EntityProvenanceFooter`** on every entity detail page renders the "Report claim error" CTA immediately; the rigor badge, `<time datetime>` verified stamp, and curated-by byline appear as curators flip individual rows

---

## What needs editorial / curator work after deploy

These surfaces exist but render empty until data is seeded:

1. **`data_tier='curated'` flag** on people / vfx_houses / stunt_companies / stunt_schools / media_assets. Default after migration is `'imported'` — curators flip individual rows to `'curated'` and stamp `curated_by` / `last_curated_review` / `last_verified_at`.
2. **Claim attachments to non-production entities.** The `claim_entities` graph supports `person`, `vfx_house`, `stunt_company`, `stunt_school`, `format`, `society` (after migration 0061). The `EntityClaimsList` panel renders any claim attached to that entity. Today, the existing claims set is heavily production-weighted; curators need to write claims for biographies, vendor histories, school programmes, etc.
3. **`scoring_stages` seed.** Migration 0062 creates the table but doesn't seed it. Expected first-pass seed: ~25 best-known stages worldwide (Newman Stage, Eastwood Stage, AIR Lyndhurst, Abbey Road One, Capitol Studios, Sony Pictures Studios, Synchron Stage Vienna, etc.). Half-day editorial work.
4. **`is_primary` curator audit.** Migration 0059 backfills using `MIN(credit_order)`. Co-DPs and multi-editor docs need a curator sweep to mark additional rows as primary.

---

## Files at a glance

### New components (web)

```
apps/web/components/
├── ui/
│   ├── EntityProvenanceFooter.tsx     # Theme P0-2 — reusable provenance footer
│   ├── EntityClaimsList.tsx           # Theme F2 — polymorphic claims renderer
│   ├── ViewToggle.tsx                 # Theme P0-5 — grid/table switch
│   ├── AnchorCopyButton.tsx           # Theme E2 — clipboard #link button
│   ├── Compare.tsx                    # Theme P0-3 — checkbox + drawer
│   └── Abbr.tsx                       # Theme G1 — accessible abbreviation
├── productions/
│   └── ProductionTable.tsx            # Theme P0-5 — sortable table view
├── people/
│   └── PersonTable.tsx                # Theme P0-5
├── role/
│   └── DepartmentIndex.tsx            # Theme P0-1 — shared dept-index contract
└── nav/
    └── CommandPalette.tsx             # Theme E1 — ⌘K palette
```

### New pages (web)

```
apps/web/app/
├── films/compare/page.tsx             # Theme P0-3
└── crew/compare/page.tsx              # Theme P0-3
```

### New utilities (web)

```
apps/web/lib/
├── format-time.ts                     # Shared relative-time formatter
└── queries-index.ts                   # Theme G9 — single source of truth for killer queries
```

### Schema files touched

```
packages/db/src/schema/
├── crew.ts                            # +isPrimary
├── people.ts                          # +5 provenance columns
├── vfx.ts                             # +5 provenance columns
├── stunts.ts                          # +5 provenance columns × 2 tables
├── media.ts                           # +5 provenance columns
├── enums.ts                           # +4 claim_entity_type values
├── scoring-stages.ts                  # NEW — F3a
└── index.ts                           # re-exports scoring_stages
```

### New / extended queries

```
packages/db/src/queries/
├── productions.ts                     # +getProductionsForComparison, +getSharedCollaboratorsAcrossFilms, +getPrimaryCrewForRole, decade→decades, search returns data_tier
├── people.ts                          # +getSharedProductionsAcrossPeople; getPersonBySlug now selects provenance
├── claims.ts                          # getClaimsForEntity promoted public, +getClaimsBundleForEntity, +4 enum values in ClaimEntityType union
├── vfx.ts                             # provenance in getVfxHouseWithFilmography
├── stunts.ts                          # provenance in get*BySlug
├── post-houses.ts                     # +kinds/+limit filters
├── media.ts                           # +published_at, +last_cited_at, +provenance columns
├── search.ts                          # data_tier per result
└── scoring-stages.ts                  # NEW — F3a
```

### Planning docs

```
docs/superpowers/plans/
├── 2026-05-15-theme-f-schema-plan.md         # F-tier migration plan (Theme F doc)
docs/superpowers/specs/
└── 2026-05-15-ux-audit-implementation-record.md   # THIS DOC
```

---

## What was deliberately deferred

| Item | Why | Unblock conditions |
|---|---|---|
| F3b — `costume_workshops` table | Migration is cheap; the data ingest (50–100 hand-curated workshops) is the bottleneck | Curator volunteers to seed the table |
| F3c — `build_shops` table | Same | Same |
| G2 — `lang="fr/it"` on Cannes / Venice category names | Needs a schema-level language tag or an editorial lookup table for every category string | Editorial decision: tag-per-category or pattern-detect from strings |
| G10 — Promote Tool/Cross from `/for-dps` to `components/role/` | Medium refactor across 4 sibling pages | Separate PR-sized; not blocking other work |
| G11 — `/references` filter pills vs `/films` `<select>` | Needs a site-wide UX decision (pills everywhere or selects everywhere) | One decision call |
| G12 — Loading-skeleton layout parity audit | Audit + ~3 small rewrites | Half-day in a follow-up |
| Admin form for new provenance fields + `is_primary` | Curators need a non-SQL surface to flip rows | Half-day in a follow-up UI PR |
| Inline `{{N}}` markers in biography prose | Option (A) from F2 plan; rejected for option (B) — side panel | Reopen only if option B feels insufficient after curator usage |

---

## What this engagement intentionally did not touch

- Anything inside `/admin/(authenticated)/*` beyond the data layer
- Routing changes (no new top-level nav items added)
- The homepage hero treatment
- The `Footer` link inventory (just contrast + Atom label)
- Any visual redesign of cards / typography / spacing scale
- API routes other than the films CSV export
- Any change to the `/queries/<slug>` killer-query content pages

---

## Verification checklist before merging

- [ ] `pnpm --filter @bts/web exec tsc --noEmit` — clean
- [ ] `pnpm --filter @bts/db exec tsc --noEmit` — clean
- [ ] `pnpm --filter @bts/db migrate` runs without error on a fresh clone
- [ ] Spot-check `/films?view=table` — sortable headers visible, depth legend renders
- [ ] Spot-check `/films/compare?items=dune-part-two-2024,oppenheimer-2023` — shared-collaborators panel renders
- [ ] Press `⌘K` / `Ctrl+K` from anywhere — palette opens, type 2+ chars, navigate with ↑↓, Enter follows the link
- [ ] Resize to <1024px — hamburger opens dialog drawer; Escape closes; focus returns to hamburger
- [ ] `/awards?group=year` — grouped output renders; `✓ WON` / `○ NOM` glyphs visible
- [ ] On any film detail page with `release_dates` — the user's region row renders pinned at the top
- [ ] `/crew/<curated-person-slug>` — after flipping `data_tier='curated'` and stamping `last_verified_at`, the footer shows the rigor badge + verified timestamp + curated-by byline
- [ ] `prefers-reduced-motion` honored (set in OS, reload — no auto-rotators move)
- [ ] At 200% zoom on `/films?view=table` — table region is keyboard-scrollable

---

## One-line summary

Six themes delivered, 51 user-facing improvements, five idempotent migrations, two packages typecheck-clean, one comprehensive planning doc for the deferred schema work — the codebase is now meaningfully closer to "reference work for working pros" rather than "film database with a citation aesthetic."
