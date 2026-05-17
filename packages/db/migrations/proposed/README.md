# Phase 2 — Craft Awards Section: proposed schema

Status: **DRAFT — not in `_journal.json`. Review before promoting.**

Files in this folder are draft migrations for the Craft Awards section. They
are deliberately kept out of the live migration sequence (0069+) until the
schema is approved. To promote, rename to the next free index and add to
`meta/_journal.json`.

## Decisions locked in (from Phase 1)

| # | Decision |
|---|---|
| 1 | Keep existing route `/for-coordinators` (do not rename) |
| 2 | Award citations use the **sources junction** pattern (`award_sources` + `sourceConfidenceEnum`). Polymorphic media reserved for ceremony photos/clips only. |
| 3 | **Casting = craft** |
| 4 | **Original Song = non-craft** (group with picture/directing/writing/acting) |
| 5 | Replace `awardOrgEnum` with FK to new `award_orgs` table. Existing 15 enum values seeded as rows; `award_org_id` backfilled from old enum column; enum then dropped. |
| 6 | Rename `production_awards` → `awards` |

## Migration order

1. **0069_award_taxonomy.sql** — create `award_orgs`, `award_categories`, `crafts` tables + seed core rows.
2. **0070_awards_rename_and_fk.sql** — rename `production_awards` → `awards`; add `award_org_id`, `category_id`, `recipient_kind` columns; backfill; drop old enum column + `awardOrgEnum` type.
3. **0071_award_recipients.sql** — extract multi-recipient model into `award_recipients` junction (keeps single-recipient FKs for now, marked deprecated).
4. **0072_award_sources.sql** — `award_sources` junction with `source_confidence` for cited provenance.

## ER (textual)

```
crafts (id, slug, name, sort_order)
  ▲
  │ (category.craft_id, nullable — non-craft categories have NULL)
  │
award_orgs (id, slug, name, country, kind, is_craft_focused, website_url)
  ▲
  │
award_categories (id, org_id → award_orgs, slug, name, craft_id → crafts NULL,
                  recipient_kind award_recipient_kind_enum, is_active,
                  first_year NULL, last_year NULL)
  ▲
  │
awards (id, production_id → productions, category_id → award_categories,
        year, is_winner, recipient_person_id NULL, recipient_vfx_house_id NULL,
        recipient_stunt_company_id NULL, source_url DEPRECATED, ...)
  ▲           ▲
  │           │
  │      award_sources (award_id, source_id → sources,
  │                     confidence source_confidence_enum,
  │                     note, created_at)
  │
award_recipients (award_id, recipient_kind, person_id NULL,
                  vfx_house_id NULL, stunt_company_id NULL,
                  production_id NULL, society_id NULL, ...)
```

`award_recipient_kind_enum`: `production | person | vfx_house | stunt_company | society | other_org`

## Open questions for review

- **Drop `awardOrgEnum` immediately or deprecate-and-keep?** Draft does an
  immediate drop after backfill. If any code still selects on the enum,
  switch to deprecate-and-keep.
- **`source_url` column on `awards`** — kept nullable for now so existing rows
  don't break, but new code should write through `award_sources`. Drop in a
  later migration once backfilled.
- **`crafts` seed list** — see 0069 for the proposed 12-craft list. Add/remove
  before promoting.
