# Data Layer Design — Global Cinematic Technical Repository (v1)

| | |
|---|---|
| **Date** | 2026-04-30 |
| **Status** | Approved (pending implementation plan) |
| **Parent project** | Global Cinematic Technical Repository: Master Development Blueprint |
| **Sub-project** | 1 of 6 — Data Layer (the relational schema and seed data) |
| **Successor** | Sub-project 2 — Public web app (consumes this schema) |

---

## 1. Context

### 1.1 What this sub-project is

The blueprint describes a digital archive of Behind-the-Scenes and technical filmmaking metadata. The full vision is a platform with six independent subsystems:

1. **Data layer** — relational schema + seed data ← *this sub-project*
2. Public web app ("Studio Pro" frontend)
3. Search & discovery (Algolia / faceted filtering)
4. Content acquisition pipeline (TMDb / IMDb / Wikidata / EPK ingestion)
5. Visual identity, interactive components, media assets
6. Monetization (auth, subscriptions, sponsored hubs)

This sub-project delivers only the data layer. Every later layer depends on it.

### 1.2 Anchor audience

The schema is designed first for **working professionals** — DPs, gaffers, colorists, ACs, VFX supervisors. Pros will spot bullshit metadata in three seconds and never come back. Designing for this audience also produces the only schema that justifies the doc's monetization approach (manufacturer-sponsored content hubs require real DPs as the readership).

Cinephiles, hobbyists, and film students get value downstream of getting the pro audience right. They are not v1 design drivers.

### 1.3 Killer queries the schema must answer

Three reference queries chosen as the regression contract for the data model:

- **Q1**: *"Every theatrical feature shot on ALEXA 65 with Panavision Sphero Anamorphic, sorted by DP."*
- **Q2**: *"What lenses did Greig Fraser use on* Dune: Part Two*?"*
- **Q3**: *"Every magic-hour exterior in 2023 features, by lighting fixture."*

If any of these break after a schema change, the schema is wrong, not the test.

---

## 2. Foundational decisions (Q&A log)

| # | Question | Decision | Rationale |
|---|---|---|---|
| Q1 | v1 schema scope | **Core spine only.** Productions, People + Crew_Assignments, Equipment three-tier, Scenes, Equipment_Usage. | Deferring "advanced standards" (Smart Lens Metadata, Sensor Analytics, Emulsion Physics) avoids modeling fields before real data informs their shape. |
| Q2 | Anchor audience | **Working professionals.** | Justifies the monetization approach in the parent blueprint; produces the most rigorous schema. |
| Q3 | Tech stack | **TypeScript + PostgreSQL + Drizzle ORM + drizzle-kit migrations.** | Type-safe SQL without ORM-magic; one language end-to-end into the JS-anchored frontend layers. |
| Q4 | Source attribution rigor | **Row-level via dedicated `_sources` join tables.** | Pro audience will not trust uncited data. Cell-level was overkill for v1; loose was insufficient. |
| Q5 | Equipment hierarchy | **Three-tier: Manufacturer → Series → Items.** Specs as JSONB on items for v1. | Matches how DPs talk about gear; supports manufacturer-sponsored hub queries trivially. |
| Q6 | Crew role taxonomy | **Flat lookup table with a `category` column.** | Controlled vocabulary on day one; non-destructive future migration to a hierarchical role tree. |

---

## 3. Schema design

### 3.1 Entity overview

**17 tables total** in v1: six core entities, three supporting reference entities, three production-related junctions, and four row-level attribution joins. The summary table below is authoritative.

```
productions ─┬─< crew_assignments >─ people
             │                          │
             │                       roles
             │
             └─< scenes >─< equipment_usage >─ equipment_items
                                                     │
                                          equipment_series ─ equipment_manufacturers

sources ──< production_sources, scene_sources,
            crew_assignment_sources, equipment_usage_sources
```

Plus production-related junctions: `production_formats`, `production_studios` (with `studios` table).

**Tables in v1:**

| # | Table | Purpose |
|---|---|---|
| 1 | `productions` | Feature, series, episode, short, special, documentary. Central node. |
| 2 | `production_formats` | One row per acquisition format on a production (handles multi-format releases like *Dune 2*: 2.39:1 + IMAX 1.43:1). |
| 3 | `studios` | Production companies, distributors, networks, streamers. |
| 4 | `production_studios` | Many-to-many junction with role. |
| 5 | `people` | Non-actor crew. One row per person across all credits. |
| 6 | `roles` | Lookup: canonical role names with category. |
| 7 | `crew_assignments` | Production × person × role junction. |
| 8 | `equipment_manufacturers` | Manufacturers, rental houses, custom builders. |
| 9 | `equipment_series` | Groupings (Cooke S7/i, ALEXA family, SkyPanel line). |
| 10 | `equipment_items` | Specific items (Cooke S7/i 32mm, ALEXA Mini LF). |
| 11 | `scenes` | Narrative segments inside productions. |
| 12 | `equipment_usage` | Scene × equipment × (optional crew) junction. |
| 13 | `sources` | Citation pool. |
| 14 | `production_sources` | Row-level attribution for productions. |
| 15 | `scene_sources` | Row-level attribution for scenes. |
| 16 | `crew_assignment_sources` | Row-level attribution for crew claims. |
| 17 | `equipment_usage_sources` | Row-level attribution for gear-usage claims. |

### 3.2 `productions`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial PK` | Internal; never in URLs. |
| `slug` | `text UNIQUE NOT NULL` | Public identifier. |
| `type` | `enum` | `feature`, `series`, `episode`, `short`, `special`, `documentary`. |
| `parent_id` | `bigint NULL FK → productions.id` | Self-FK; episode rolls up to series. |
| `title` | `text NOT NULL` | |
| `original_title` | `text NULL` | Non-English originals. |
| `release_year` | `int NULL` | |
| `principal_photography_start` | `date NULL` | |
| `principal_photography_end` | `date NULL` | |
| `runtime_minutes` | `int NULL` | |
| `synopsis` | `text NULL` | Short editorial blurb. |
| `tmdb_id` | `int UNIQUE NULL` | |
| `imdb_id` | `text UNIQUE NULL` | |
| `wikidata_id` | `text UNIQUE NULL` | |
| `created_at` / `updated_at` | `timestamptz` | |

**Aspect ratio, color space, frame rate live in `production_formats`, not here.** Modern productions have multiple formats.

### 3.3 `production_formats`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial PK` | |
| `production_id` | `bigint FK NOT NULL` | |
| `label` | `text NULL` | "Theatrical 2D," "IMAX 70mm sequences," "B&W IMAX." |
| `aspect_ratio` | `text` | `2.39:1`, `1.43:1`, `1.85:1`, `2.20:1`. |
| `acquisition_format` | `text` | Free text in v1: `ARRIRAW 4.5K LF Open Gate`, `IMAX 65mm 15-perf`, `VistaVision 8-perf`. Promote to lookup in sub-project 4. |
| `color_space` | `text NULL` | `DCI-P3`, `Rec.709`, `Rec.2020`, `ACES`. |
| `frame_rate` | `numeric(5,2) NULL` | |
| `is_primary` | `bool DEFAULT false` | One row per production should be true. |

### 3.4 `studios` and `production_studios`

**`studios`:**

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial PK` | |
| `slug` | `text UNIQUE` | |
| `name` | `text NOT NULL` | |
| `country` | `text NULL` | ISO-3166 alpha-2. |
| `kind` | `enum` | `studio`, `production_company`, `distributor`, `network`, `streamer`. |
| `parent_studio_id` | `bigint NULL FK → studios.id` | Corporate trees: HBO → WBD; Lucasfilm → Disney. |

**`production_studios`** (junction):

| Column | Type | Notes |
|---|---|---|
| `production_id` | `bigint FK` | |
| `studio_id` | `bigint FK` | |
| `role` | `enum` | `production_company`, `distributor`, `financier`, `network`, `co_production`. |
| | | PK is `(production_id, studio_id, role)`. |

### 3.5 `people`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial PK` | |
| `slug` | `text UNIQUE NOT NULL` | |
| `display_name` | `text NOT NULL` | Canonical credit; no society suffixes. |
| `given_name` / `family_name` | `text NULL` | For sort/search. |
| `aliases` | `text[]` | Pseudonyms, romanized variants, name changes. |
| `birth_date`, `death_date` | `date NULL` | |
| `country` | `text NULL` | ISO-3166 alpha-2. |
| `bio` | `text NULL` | 2–3 sentences max. |
| `member_societies` | `text[]` | `{ASC, BSC, AFC, ACS, CSC, ...}` — abbreviations only. |
| `imdb_id` | `text UNIQUE NULL` | `nm12345678`. |
| `wikidata_id` | `text UNIQUE NULL` | |

Actors are explicitly out of scope for v1 (the parent blueprint specifies non-actor crew).

### 3.6 `roles`

| Column | Type | Notes |
|---|---|---|
| `id` | `smallserial PK` | |
| `slug` | `text UNIQUE NOT NULL` | |
| `name` | `text NOT NULL` | "Director of Photography", "Gaffer", "First Assistant Camera". |
| `aliases` | `text[]` | "DP" / "Cinematographer" / "Lighting Cameraman" → `director-of-photography`. |
| `category` | `enum` | `camera`, `grip`, `electric`, `sound`, `art`, `wardrobe`, `makeup_hair`, `production`, `post`, `vfx`, `direction`, `writing`, `music`, `stunts`. |
| `description` | `text NULL` | One-liner. |

Seed: ~50 canonical roles, weighted toward camera/electric/grip/post departments.

### 3.7 `crew_assignments`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial PK` | |
| `production_id` | `bigint FK NOT NULL` | |
| `person_id` | `bigint FK NOT NULL` | |
| `role_id` | `smallint FK NOT NULL` | |
| `credit_order` | `int NULL` | Department display order. |
| `credit_name_override` | `text NULL` | When on-screen credit differs from canonical name. |
| `started_on` / `ended_on` | `date NULL` | Mid-production joins/departures. |
| `notes` | `text NULL` | "Replaced X after week 3." |
| | | UNIQUE `(production_id, person_id, role_id)`. |

### 3.8 `equipment_manufacturers`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial PK` | |
| `slug` | `text UNIQUE NOT NULL` | |
| `name` | `text NOT NULL` | |
| `kind` | `enum` | `manufacturer`, `rental_house`, `custom_builder`. |
| `country` | `text NULL` | |
| `founded_year` | `int NULL` | |
| `website` | `text NULL` | |
| `description` | `text NULL` | |

### 3.9 `equipment_series`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial PK` | |
| `manufacturer_id` | `bigint FK NOT NULL` | |
| `slug` | `text UNIQUE NOT NULL` | |
| `name` | `text NOT NULL` | |
| `category` | `enum` | `lens_set`, `camera_body`, `lighting_fixture`, `filter`, `recorder`, `mount`, `accessory`. |
| `year_introduced` | `int NULL` | |
| `year_discontinued` | `int NULL` | |
| `description` | `text NULL` | |

### 3.10 `equipment_items`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial PK` | |
| `series_id` | `bigint FK NOT NULL` | |
| `slug` | `text UNIQUE NOT NULL` | |
| `name` | `text NOT NULL` | |
| `model_number` | `text NULL` | |
| `year_introduced` | `int NULL` | |
| `year_discontinued` | `int NULL` | |
| `status` | `enum` | `active`, `discontinued`, `rare`, `prototype`, `rehoused`. |
| `specs` | `jsonb NOT NULL DEFAULT '{}'` | Category-shaped specs; advisory shape per category, validated at the application boundary by Zod schemas living in `packages/db/src/schema/specs/{category}.ts`. The seed loader and any future write path call these validators before inserting; the DB column itself has no JSONB-shape constraint. |

**Advisory spec shapes per category** (committed as Zod schemas in code, not in the DB):

```jsonc
// lens_set
{ "focal_length_mm": 32, "max_aperture_t": 2.0, "min_aperture_t": 22,
  "image_circle_mm": 46.31, "lens_format": "full_frame_plus",
  "is_anamorphic": false, "anamorphic_squeeze": null,
  "minimum_focus_m": 0.36, "weight_kg": 1.6, "front_diameter_mm": 110,
  "mount": "PL" }

// camera_body
{ "sensor_size": "LF", "sensor_resolution_max": "4448x3096",
  "sensor_format_options": ["4.5K LF Open Gate", "4.5K LF 2.39:1", "4K UHD"],
  "max_frame_rate_fps": 90, "internal_codecs": ["ARRIRAW", "ProRes 4444 XQ"],
  "mount": "LPL", "color_science": "ARRI LogC4", "weight_kg": 2.6 }

// lighting_fixture
{ "fixture_kind": "led_panel", "color_temperature_range_k": "2800-10000",
  "max_output_lumens": 30000, "cri": 95, "tlci": 92,
  "rgb_color_mixing": true, "weight_kg": 11 }

// filter
{ "filter_kind": "diffusion", "subkind": "black_pro_mist",
  "strengths_available": [0.125, 0.25, 0.5, 1.0, 2.0],
  "size_mm_round": 138, "size_inch_square": "4x5.65" }
```

### 3.11 `scenes`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial PK` | |
| `production_id` | `bigint FK NOT NULL` | |
| `slug` | `text NOT NULL` | UNIQUE `(production_id, slug)`. |
| `scene_number` | `text NULL` | Script numbers like `47A`, `INT-001`. |
| `title` | `text NOT NULL` | Editorial title. |
| `synopsis` | `text NULL` | |
| `position_in_runtime_seconds` | `int NULL` | |
| `interior_exterior` | `enum NULL` | `int`, `ext`, `int_ext`. |
| `time_of_day` | `enum NULL` | `dawn`, `day`, `dusk`, `night`, `magic_hour`. |
| `location` | `text NULL` | Free text in v1. |

### 3.12 `equipment_usage`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial PK` | |
| `scene_id` | `bigint FK NOT NULL` | |
| `equipment_series_id` | `bigint FK NOT NULL` | Always known at minimum. |
| `equipment_item_id` | `bigint FK NULL` | Set when item is known. |
| `crew_assignment_id` | `bigint FK NULL` | Operator/responsible person, when known. |
| `setup_label` | `text NULL` | Free-text grouping: `A-Cam`, `B-Cam`, `Drone`, `Underwater`. |
| `usage_role` | `text NULL` | Free-text role tag, app-validated per equipment category. |
| `notes` | `text NULL` | |

**Constraint — composite-FK approach (chosen over a trigger):** `equipment_items` carries a denormalized `series_id` column (already present as the natural FK to its series). `equipment_usage` carries both `equipment_series_id` and `equipment_item_id`, and a composite FK enforces `(equipment_item_id, equipment_series_id) → equipment_items(id, series_id)` when `equipment_item_id IS NOT NULL`. This is enforceable as a real `FOREIGN KEY` (no trigger required), and it stays cheap because the redundant column already exists. A pure single-row `CHECK` cannot reference another table, which is why a trigger would otherwise be needed.

### 3.13 `sources`

| Column | Type | Notes |
|---|---|---|
| `id` | `bigserial PK` | |
| `slug` | `text UNIQUE NOT NULL` | |
| `kind` | `enum` | `magazine_article`, `press_release`, `epk_document`, `interview_transcript`, `book`, `podcast`, `commentary_track`, `documentary`, `manufacturer_product_page`, `social_media`, `personal_communication`, `forum_post`, `wiki`, `other`. |
| `title` | `text NOT NULL` | |
| `publication` | `text NULL` | |
| `author` | `text NULL` | String only. Not a FK to `people`. |
| `published_at` | `date NULL` | |
| `accessed_at` | `date NULL` | |
| `url` | `text NULL` | Partial UNIQUE `WHERE url IS NOT NULL`. |
| `archive_url` | `text NULL` | Wayback Machine snapshot. |
| `notes` | `text NULL` | |

### 3.14 Attribution join tables (four)

All four follow the same shape; only the parent FK varies.

- `production_sources(production_id, source_id, confidence, claim_quote, notes, created_at)`
- `scene_sources(scene_id, source_id, confidence, claim_quote, notes, created_at)`
- `crew_assignment_sources(crew_assignment_id, source_id, confidence, claim_quote, notes, created_at)`
- `equipment_usage_sources(equipment_usage_id, source_id, confidence, claim_quote, notes, created_at)`

| Column | Type | Notes |
|---|---|---|
| `[claim]_id` | `bigint FK NOT NULL` | |
| `source_id` | `bigint FK NOT NULL` | |
| `confidence` | `enum NOT NULL` | `primary`, `secondary`, `manufacturer_marketing`, `speculative`. |
| `claim_quote` | `text NULL` | |
| `notes` | `text NULL` | |
| | | PK is `(claim_id, source_id)`. |

**Confidence semantics:**

- `primary` — first-party (DP interview, AC's gear list, EPK)
- `secondary` — reputable third-party (AC magazine quoting the DP)
- `manufacturer_marketing` — manufacturer claims; treat with care
- `speculative` — visual-analysis inference, explicitly uncertain

**Why polymorphic-via-four-tables and not one `attributions` table:** Postgres can't FK-enforce polymorphic columns, and losing FK integrity on the trust layer is the wrong place to economize.

**Coverage:** v1 attaches sources only to productions, scenes, crew_assignments, equipment_usage. `production_formats`, `production_studios`, `equipment_items.specs`, and `people` bio facts use parent-level or external-cross-reference attribution.

---

## 4. Cross-cutting conventions

### 4.1 Primary keys and slugs

- `bigserial` everywhere, except `roles` which uses `smallserial`.
- No UUIDs.
- Public URLs use `slug`. IDs never leak past the API boundary.
- Slugs: kebab-case, lowercase, ASCII-only. Year suffixes only on collision.
- For child entities, uniqueness is `(parent_id, slug)`, not global.
- Slug generation lives in the application layer.

### 4.2 Timestamps

- Every table: `created_at timestamptz NOT NULL DEFAULT now()`, `updated_at timestamptz NOT NULL DEFAULT now()`.
- `updated_at` maintained by a single shared trigger `set_updated_at()`.
- `timestamptz` not `timestamp`. UTC in storage; render in user TZ at the API boundary.

### 4.3 Soft deletes — NO

v1 has no `deleted_at` column anywhere. Hard deletes only.

### 4.4 Cascade matrix

| Parent → Child | Behavior |
|---|---|
| `productions` → `scenes`, `production_formats`, `production_studios`, `crew_assignments`, `production_sources` | `CASCADE` |
| `scenes` → `equipment_usage`, `scene_sources` | `CASCADE` |
| `crew_assignments` → `crew_assignment_sources` | `CASCADE` |
| `equipment_usage` → `equipment_usage_sources` | `CASCADE` |
| `people` → `crew_assignments` | `RESTRICT` |
| `equipment_items` → `equipment_usage` | `RESTRICT` |
| `equipment_series` → `equipment_items` | `RESTRICT` |
| `equipment_manufacturers` → `equipment_series` | `RESTRICT` |
| `studios` → `production_studios` | `RESTRICT` |
| `roles` → `crew_assignments` | `RESTRICT` |
| `sources` → any `_sources` join | `RESTRICT` |

**Note on transitive deletes:** the matrix above lists *direct edges only*. Transitive deletion follows naturally from chained CASCADEs — e.g., deleting a production cascades to `scenes`, which cascades to `equipment_usage`, which cascades to `equipment_usage_sources`. The cascade-test suite (§8.2) covers each direct edge; transitive cases are implied and tested via a single end-to-end production-deletion test.

### 4.5 Enum strategy

| Pattern | Use for | Examples |
|---|---|---|
| Postgres native enum | Small, stable vocab | `productions.type`, `studios.kind`, `equipment_series.category`, `equipment_items.status`, `scenes.time_of_day`, attribution `confidence`. |
| Lookup table (FK) | Curated but expandable | `roles`. |
| Free text + app-layer validation | Volatile or wide vocab | `equipment_usage.usage_role`, `equipment_usage.setup_label`, `production_formats.acquisition_format`. |

### 4.6 External IDs

Nullable columns on entities the outside world knows about:

| Entity | External IDs |
|---|---|
| `productions` | `tmdb_id`, `imdb_id`, `wikidata_id` |
| `people` | `imdb_id`, `wikidata_id` |
| `studios` | `wikidata_id` |
| `equipment_manufacturers` | `wikidata_id` |

All UNIQUE-when-not-NULL via partial indexes.

### 4.7 Index plan

Implicit indexes (PK, UNIQUE) not repeated.

**productions:** `(type)`, `(release_year)`, `(parent_id)`, partial UNIQUE on each external ID.

**production_formats:** `(production_id)`, partial `(production_id) WHERE is_primary = true`.

**production_studios:** `(studio_id, role)`.

**people:** `(family_name)`, partial UNIQUE on external IDs.

**crew_assignments:** `(production_id, role_id)`, `(person_id, role_id)`.

**roles:** `(category)`, GIN index on `aliases`.

**equipment_series:** `(manufacturer_id, category)`.

**equipment_items:** `(series_id)`, `(status)`, GIN index on `specs`.

**scenes:** `(time_of_day, interior_exterior)`.

**equipment_usage** (critical for killer queries):
- `(equipment_series_id)`
- `(equipment_series_id, scene_id)` (composite)
- `(equipment_item_id) WHERE NOT NULL` (partial)
- `(scene_id)`
- `(crew_assignment_id) WHERE NOT NULL` (partial)

**sources:** `(kind)`, `(published_at DESC)`, partial UNIQUE on `url`.

**Each `_sources` join table:** composite PK from `claim_id` side; additional `(source_id)` index.

### 4.8 Naming conventions

- `snake_case` columns and table names.
- Plural table names.
- FK columns: `{singular_target}_id`.
- Boolean columns: `is_*` or `has_*`.
- Enum types: `{table}_{column}_enum`.

### 4.9 Migration discipline

- Each migration is reversible (working `up` + working `down`).
- Migrations are timestamped (drizzle-kit default) and never edited after merge.
- Migrations are single-purpose.
- Schema PRs include: (1) the change, (2) the rollback, (3) any required data backfill.

### 4.10 Search columns — deferred

No `tsvector`, no `pg_trgm` indexes, no full-text in v1. Search is sub-project 3.

---

## 5. Repo layout (v1 only)

```
bts/
├── package.json                  # workspace root
├── pnpm-workspace.yaml
├── docker-compose.yml            # local Postgres
├── .env.example                  # checked in; .env is git-ignored
└── packages/
    └── db/
        ├── package.json
        ├── tsconfig.json
        ├── drizzle.config.ts
        └── src/
            ├── schema/
            │   ├── enums.ts
            │   ├── productions.ts
            │   ├── people.ts
            │   ├── roles.ts
            │   ├── crew.ts
            │   ├── equipment.ts
            │   ├── scenes.ts
            │   ├── sources.ts
            │   └── index.ts
            ├── migrations/                  # drizzle-kit generated
            ├── seed/
            │   ├── data/
            │   │   ├── manufacturers.ts
            │   │   ├── series.ts
            │   │   ├── items.ts
            │   │   ├── roles.ts
            │   │   ├── studios.ts
            │   │   ├── people.ts
            │   │   ├── productions.ts
            │   │   ├── sources.ts
            │   │   ├── crew.ts
            │   │   ├── scenes.ts
            │   │   └── equipment-usage.ts
            │   └── run.ts                   # idempotent orchestrator
            ├── queries/
            │   └── killer-queries.ts        # the three reference queries
            ├── tests/
            │   ├── migrations.test.ts
            │   ├── cascades.test.ts
            │   └── killer-queries.test.ts
            └── index.ts
```

Future sub-projects fit as siblings: `apps/web`, `packages/search`, `packages/ingest`, `apps/admin`, `packages/ui`.

---

## 6. Dev environment

| Component | Choice |
|---|---|
| Postgres | 16.x |
| Local DB | Docker Compose, exposes 5432 |
| Optional cloud dev DB | Neon free tier |
| Migrations | drizzle-kit |
| Inspection | Drizzle Studio (http://localhost:4983) |
| Test runner | Vitest |
| Type checking | TypeScript strict mode |
| Package manager | pnpm |

**Connection string convention**: `DATABASE_URL=postgres://bts:bts@localhost:5432/bts_dev` (and `bts_test` for the test DB). Loaded from `.env`.

**Windows / OneDrive caveat:** the current working directory `C:\Users\jeanj\OneDrive\Jay Personal\BTS` will fight `node_modules` and `.git` if OneDrive sync is on. Recommended: move the repo to a non-synced path (`C:\dev\bts`). Acceptable: exclude `node_modules` and `.git` from sync.

---

## 7. Seed data plan

Hand-curated, anchor-audience-weighted. Volume target small enough to validate the model end-to-end, not so large it becomes "the database."

| Entity | Target count |
|---|---|
| `equipment_manufacturers` | ~10 |
| `equipment_series` | ~15–20 |
| `equipment_items` | ~50–80 |
| `roles` | ~50 |
| `studios` | ~12 |
| `people` | ~30–40 |
| `productions` | ~15–20 |
| `scenes` | ~40–60 |
| `equipment_usage` | ~150–250 |
| `sources` | ~40–60 |

**Candidate productions** (anchor-aud-weighted; mix of recent and canonical, format-diverse):

*Dune: Part Two* (2024), *Oppenheimer* (2023), *The Brutalist* (2024), *Poor Things* (2023), *Killers of the Flower Moon* (2023), *The Batman* (2022), *The Northman* (2022), *1917* (2019), *Blade Runner 2049* (2017), *Mad Max: Fury Road* (2015), *The Revenant* (2015), *Gravity* (2013), *Dunkirk* (2017), *Skyfall* (2012), *Children of Men* (2006).

Coverage spans IMAX 65mm, ALEXA 65, ALEXA Mini LF, S35 digital, S35 anamorphic, VistaVision, IMAX 70mm B&W. The schema must hold all of these without contortion.

**Format:** TypeScript files in `packages/db/src/seed/data/`. Each file exports a typed array. The orchestrator (`seed/run.ts`) runs them in FK-dependency order using `onConflictDoUpdate` keyed on `slug` for idempotency. No raw IDs in seed files; cross-references use slugs.

**Filter modeling convention.** Filters (matte-box diffusion, IRNDs, polarizers, lens-clip filters) are first-class `equipment_items` and get **their own `equipment_usage` rows** on the scene, **not** free-text on a lens row's `notes`. The `usage_role` column carries the placement: `in_mattebox_filter`, `lens_clip_filter`, `clip_in_filter`. The `setup_label` ties the filter row to its parent camera setup (`A-Cam`, `B-Cam`). This is enforced by editorial convention in v1; promotion to a formal `camera_setups` table is deferred. Free text in `notes` is reserved for non-equipment context (*"IR-converted body,"* *"Russian Arm car-mount"*).

---

## 8. Validation gate (the "does this work" test)

Three Vitest suites:

### 8.1 Migration sanity

`pnpm test:migrations` — runs every migration up, then down, then up again on a clean DB. Fails if any migration is irreversible or non-idempotent.

### 8.2 Cascade matrix

`pnpm test:cascades` — for every row in §4.4, an assertion test. Insert parent + child, delete parent, assert behavior matches. RESTRICT cases assert FK violation.

### 8.3 Killer queries — the regression contract

`pnpm test:queries` — runs the three reference queries from §1.3 against the seeded data:

- **Q1**: returns *The Revenant* (Lubezki, ALEXA 65 + Panavision Sphero T-Series anamorphic). The combination is genuinely uncommon; one matching row is the expected v1 result and is sufficient to prove the join chain. Test asserts `>= 1` rows and that *The Revenant* is among them. (Note: *Killers of the Flower Moon* used Panavision Panaspeed and Ultra Vista glass on the ALEXA 65, not Sphero; do not seed it as a Sphero match.)
- **Q2**: returns the seeded ARRI Rental DNA LF Vintage Primes used on *Dune: Part Two*. Iris filters appear as **separate `equipment_usage` rows** on the same scene/setup with `usage_role='in_mattebox_filter'` (per the filter modeling convention in §7), not as free text on the lens row's `notes`.
- **Q3**: returns scenes tagged `time_of_day=magic_hour` from 2023 features, joined to lighting `equipment_usage`.

If any of these fail, the schema or the seed data is wrong.

---

## 9. Out of scope (deferred deliberately)

| Item | Where it goes |
|---|---|
| Admin UI / editorial app | Sub-project 4 or 5 |
| TMDb / IMDb / Wikidata sync pipelines | Sub-project 4 |
| EPK ingestion pipeline | Sub-project 4 |
| Full-text search, Algolia integration | Sub-project 3 |
| Auth, subscriptions, multi-user editing | Sub-project 6 |
| HTTP API layer (REST/GraphQL) | Sub-project 2 |
| Public web app, Studio Pro design system | Sub-projects 2, 5 |
| Media/asset modeling (frames, BTS clips, before/after pairs) | Sub-project 5 |
| `vfx_workflow` table | Sub-project 4 or 5 |
| Smart Lens Metadata, Sensor Analytics, Emulsion Physics tables | Promote from JSONB when query patterns demand |
| Audit log / row history | Bolt on later via Postgres logical replication or audit extension |
| Genres, keywords, themes | Sub-project 4 (TMDb-derived) |
| Cast / actors | Out of scope for the Cinematic Technical Repository |

---

## 10. Next steps

1. Run spec review (separate agent verifies completeness/consistency).
2. User reviews this document.
3. Move to writing-plans skill — produces an implementation plan against this spec.
4. Implement against the plan in a clean repo (likely after moving repo out of OneDrive).
