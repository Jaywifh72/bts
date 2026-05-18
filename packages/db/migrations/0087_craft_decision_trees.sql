-- Migration 0087 — craft_decision_trees.
--
-- Editorial framework for "when to choose X vs Y" decisions that
-- working pros face on every production. Each tree is a discrete
-- decision (e.g. "Anamorphic vs spherical", "Practical fire vs CGI",
-- "Full orchestra vs sampled mockup", "Wire rig vs decelerator")
-- with options and the criteria that distinguish them.
--
-- Trees are tagged to a craft (cinematography / vfx / stunts /
-- music / sound / costume / pd / mu-hair / editing / color) so
-- they can index off /<craft>/decisions.
--
-- Options carry pros/cons + cost_band + complexity_band + and a
-- jsonb 'when_to_choose' list of trigger conditions.

CREATE TABLE "craft_decision_trees" (
  "id"                  bigserial PRIMARY KEY,
  "slug"                text NOT NULL UNIQUE,
  "craft"               text NOT NULL,                            -- 'cinematography', 'vfx', 'stunts', 'music', 'sound', 'costume', 'pd', 'mu-hair', 'editing', 'color'
  "title"               text NOT NULL,                            -- "Anamorphic vs spherical"
  "question"            text NOT NULL,                            -- "When should I shoot anamorphic instead of spherical?"
  "summary"             text,                                     -- 1-2 paragraph editorial framing
  "decision_factors"    text[] NOT NULL DEFAULT '{}',             -- ['aspect ratio', 'budget', 'lens character', 'lighting load']
  "references"          jsonb NOT NULL DEFAULT '[]'::jsonb,
  "data_tier"           production_data_tier NOT NULL DEFAULT 'imported',
  "curated_by"          text,
  "curated_by_url"      text,
  "last_curated_review" timestamp with time zone,
  "last_verified_at"    timestamp with time zone,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at"          timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX "craft_decision_trees_craft_idx"
  ON "craft_decision_trees" ("craft");

CREATE TABLE "craft_decision_options" (
  "id"                  bigserial PRIMARY KEY,
  "tree_id"             bigint NOT NULL REFERENCES "craft_decision_trees"("id") ON DELETE CASCADE,
  "slug"                text NOT NULL,                            -- 'anamorphic'
  "label"               text NOT NULL,                            -- 'Anamorphic'
  "summary"             text,                                     -- short pitch
  "when_to_choose"      text[] NOT NULL DEFAULT '{}',             -- trigger conditions
  "pros"                text[] NOT NULL DEFAULT '{}',
  "cons"                text[] NOT NULL DEFAULT '{}',
  "cost_band"           text,                                     -- 'low' | 'medium' | 'high' | 'tentpole'
  "complexity_band"     text,                                     -- 'low' | 'medium' | 'high' | 'expert-only'
  "example_films"       text[] NOT NULL DEFAULT '{}',             -- production slugs
  "sort_order"          integer NOT NULL DEFAULT 0,
  "created_at"          timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "craft_decision_options_unique" UNIQUE ("tree_id", "slug")
);

CREATE INDEX "craft_decision_options_tree_idx"
  ON "craft_decision_options" ("tree_id");
