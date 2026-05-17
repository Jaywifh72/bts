-- Migration 0069 (PROPOSED) — Award taxonomy: crafts, award_orgs, award_categories.
--
-- Replaces the hardcoded `awardOrgEnum` with a seedable `award_orgs` table
-- so adding ACE/CAS/MPSE/HPA/ADG/CDG/MUAHS/SCL (and any future society)
-- doesn't require a schema migration.
--
-- `crafts` is the controlled vocabulary that powers the /awards/craft/[craft]
-- routes. Categories link to a craft via `award_categories.craft_id`
-- (nullable — non-craft categories like Best Picture leave it NULL).

-- ── crafts ─────────────────────────────────────────────────────────
CREATE TABLE "crafts" (
  "id"          bigserial PRIMARY KEY,
  "slug"        text NOT NULL UNIQUE,
  "name"        text NOT NULL,
  "sort_order"  integer NOT NULL DEFAULT 0,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now()
);

-- Seed the craft vocabulary. Casting is included per Phase 1 decision.
-- Original Song is intentionally NOT here (classified as non-craft).
INSERT INTO "crafts" ("slug", "name", "sort_order") VALUES
  ('cinematography',     'Cinematography',          10),
  ('editing',            'Editing',                 20),
  ('production-design',  'Production Design',       30),
  ('costume-design',     'Costume Design',          40),
  ('makeup-hairstyling', 'Makeup & Hairstyling',    50),
  ('sound',              'Sound',                   60),
  ('score',              'Original Score',          70),
  ('visual-effects',     'Visual Effects',          80),
  ('stunts',             'Stunts',                  90),
  ('casting',            'Casting',                100),
  ('animation',          'Animation',              110),
  ('art-direction',      'Art Direction',          120);

-- ── award_orgs ─────────────────────────────────────────────────────
CREATE TABLE "award_orgs" (
  "id"                  bigserial PRIMARY KEY,
  "slug"                text NOT NULL UNIQUE,
  "name"                text NOT NULL,
  "country"             text,                                -- ISO-3166 alpha-2; NULL = international
  "kind"                text NOT NULL DEFAULT 'society',     -- society | academy | festival | guild | other
  "is_craft_focused"    boolean NOT NULL DEFAULT false,      -- e.g. ASC/ACE/CAS — true; AMPAS — false
  "website_url"         text,
  "founded_year"        integer,
  "summary"             text,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);

-- Seed: every value currently in `awardOrgEnum`, plus the 8 craft societies
-- the spec calls out. Slugs MUST match the legacy enum string so the
-- backfill in 0070 can join on them directly.
INSERT INTO "award_orgs" ("slug", "name", "country", "kind", "is_craft_focused") VALUES
  -- legacy enum values
  ('academy_awards',     'Academy Awards',                          'US',   'academy',  false),
  ('bafta',              'British Academy Film Awards',             'GB',   'academy',  false),
  ('cannes',             'Cannes Film Festival',                    'FR',   'festival', false),
  ('golden_globes',      'Golden Globe Awards',                     'US',   'academy',  false),
  ('critics_choice',     'Critics'' Choice Awards',                 'US',   'other',    false),
  ('asc_award',          'ASC Awards',                              'US',   'society',  true),
  ('aso_award',          'Australian Cinematographers Society',     'AU',   'society',  true),
  ('csc_award',          'Canadian Society of Cinematographers',    'CA',   'society',  true),
  ('bsc_award',          'British Society of Cinematographers',     'GB',   'society',  true),
  ('spirit_awards',      'Independent Spirit Awards',               'US',   'other',    false),
  ('venice',             'Venice Film Festival',                    'IT',   'festival', false),
  ('berlin',             'Berlin International Film Festival',      'DE',   'festival', false),
  ('ves_award',          'Visual Effects Society Awards',           'US',   'society',  true),
  ('eca',                'European Cinematography Awards',          NULL,   'society',  true),
  ('other',              'Other / Uncategorized',                   NULL,   'other',    false),
  -- Phase 2 craft societies
  ('ace_eddie',          'ACE Eddie Awards (American Cinema Editors)', 'US', 'society', true),
  ('cas_award',          'Cinema Audio Society Awards',             'US',   'society',  true),
  ('mpse_golden_reel',   'MPSE Golden Reel Awards',                 'US',   'society',  true),
  ('hpa_award',          'Hollywood Professional Association Awards','US',  'society',  true),
  ('adg_award',          'Art Directors Guild Awards',              'US',   'guild',    true),
  ('cdg_award',          'Costume Designers Guild Awards',          'US',   'guild',    true),
  ('muahs_award',        'Make-Up Artists & Hair Stylists Guild',   'US',   'guild',    true),
  ('scl_award',          'Society of Composers & Lyricists Awards', 'US',   'society',  true),
  -- additional spec-mentioned orgs
  ('camerimage',         'EnergaCamerimage',                        'PL',   'festival', true),
  ('taurus_award',       'Taurus World Stunt Awards',               'US',   'society',  true),
  ('sag_stunt_ensemble', 'SAG Award — Stunt Ensemble',              'US',   'society',  true),
  ('academy_stunt_design','Academy Award — Stunt Design (placeholder)', 'US','academy', true);

-- ── award_categories ───────────────────────────────────────────────
CREATE TYPE "award_recipient_kind_enum" AS ENUM (
  'production',     -- Best Picture
  'person',         -- Best Director, Best Cinematography (DP), Best Casting
  'vfx_house',      -- VES company-level
  'stunt_company',  -- Taurus team
  'society',        -- (rare — e.g. honorary org awards)
  'other_org'
);

CREATE TABLE "award_categories" (
  "id"              bigserial PRIMARY KEY,
  "org_id"          bigint NOT NULL REFERENCES "award_orgs"("id") ON DELETE CASCADE,
  "slug"            text NOT NULL,
  "name"            text NOT NULL,
  "craft_id"        bigint REFERENCES "crafts"("id") ON DELETE SET NULL,
  "recipient_kind"  award_recipient_kind_enum NOT NULL DEFAULT 'person',
  "is_active"       boolean NOT NULL DEFAULT true,
  "first_year"      integer,
  "last_year"       integer,
  "sort_order"      integer NOT NULL DEFAULT 0,
  "notes"           text,
  "created_at"      timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "award_categories_org_slug_unique" UNIQUE ("org_id", "slug")
);

CREATE INDEX "award_categories_craft_idx" ON "award_categories" ("craft_id") WHERE "craft_id" IS NOT NULL;
CREATE INDEX "award_categories_org_idx"   ON "award_categories" ("org_id");

-- Seed AMPAS categories (subset — extend per seeding plan in Phase 5).
-- Done via subselect so we don't hardcode the org_id from the insert above.
INSERT INTO "award_categories" ("org_id", "slug", "name", "craft_id", "recipient_kind", "sort_order")
SELECT o.id, v.slug, v.name, (SELECT id FROM crafts WHERE slug = v.craft_slug), v.recipient_kind::award_recipient_kind_enum, v.sort_order
FROM "award_orgs" o
CROSS JOIN (VALUES
  ('best-picture',            'Best Picture',                NULL,                  'production', 10),
  ('best-director',           'Best Director',               NULL,                  'person',     20),
  ('best-cinematography',     'Best Cinematography',         'cinematography',      'person',     30),
  ('best-film-editing',       'Best Film Editing',           'editing',             'person',     40),
  ('best-production-design',  'Best Production Design',      'production-design',   'person',     50),
  ('best-costume-design',     'Best Costume Design',         'costume-design',      'person',     60),
  ('best-makeup-hairstyling', 'Best Makeup and Hairstyling', 'makeup-hairstyling',  'person',     70),
  ('best-sound',              'Best Sound',                  'sound',               'person',     80),
  ('best-original-score',     'Best Original Score',         'score',               'person',     90),
  ('best-original-song',      'Best Original Song',          NULL,                  'person',    100),
  ('best-visual-effects',     'Best Visual Effects',         'visual-effects',      'person',    110),
  ('best-casting',            'Best Casting',                'casting',             'person',    120),
  ('best-animated-feature',   'Best Animated Feature',       'animation',           'production',130)
) AS v(slug, name, craft_slug, recipient_kind, sort_order)
WHERE o.slug = 'academy_awards';

-- Seed ASC (cinematography-only)
INSERT INTO "award_categories" ("org_id", "slug", "name", "craft_id", "recipient_kind", "sort_order")
SELECT o.id, 'feature-theatrical', 'Feature Film — Theatrical Release', c.id, 'person', 10
FROM "award_orgs" o, "crafts" c
WHERE o.slug = 'asc_award' AND c.slug = 'cinematography';

-- Seed ACE Eddie (editing)
INSERT INTO "award_categories" ("org_id", "slug", "name", "craft_id", "recipient_kind", "sort_order")
SELECT o.id, v.slug, v.name, c.id, 'person', v.sort_order
FROM "award_orgs" o, "crafts" c, (VALUES
  ('best-edited-feature-dramatic', 'Best Edited Feature Film (Dramatic)',  10),
  ('best-edited-feature-comedy',   'Best Edited Feature Film (Comedy)',    20)
) AS v(slug, name, sort_order)
WHERE o.slug = 'ace_eddie' AND c.slug = 'editing';
