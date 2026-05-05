-- T2-3: post-production houses (DI / color / sound mix / VFX-as-service).
-- Unique-to-Studio-Pro field — no competitor (ShotOnWhat, ShotDeck,
-- Cinelenses) models the post-pipeline this way.
--
-- 'kind' distinguishes:
--   - 'di_lab' / 'color' — Company 3, FotoKem, EFILM, Picture Shop, Goldcrest, Harbor
--   - 'sound_mix' — Skywalker Sound, Formosa, Sony Pictures Post
--   - 'finishing' — generic finishing facility
--   - 'mastering' — IMAX DMR, Dolby
--
-- A production_post_houses join captures (production, house, role)
-- with optional notes (e.g. "Theatrical DI" vs "Home video remaster").

DO $$ BEGIN
  CREATE TYPE post_house_kind AS ENUM ('di_lab', 'color', 'sound_mix', 'finishing', 'mastering', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
DO $$ BEGIN
  CREATE TYPE post_house_role AS ENUM ('di', 'color_grading', 'sound_mix', 'sound_design', 'finishing', 'imax_remaster', 'mastering', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS post_houses (
  id            bigserial PRIMARY KEY,
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  kind          post_house_kind NOT NULL,
  country       text,
  city          text,
  website       text,
  founded_year  integer,
  description   text,
  created_at    timestamp with time zone NOT NULL DEFAULT NOW(),
  updated_at    timestamp with time zone NOT NULL DEFAULT NOW()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS production_post_houses (
  production_id bigint NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  post_house_id bigint NOT NULL REFERENCES post_houses(id) ON DELETE RESTRICT,
  role          post_house_role NOT NULL,
  notes         text,
  created_at    timestamp with time zone NOT NULL DEFAULT NOW(),
  PRIMARY KEY (production_id, post_house_id, role)
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS production_post_houses_house_role_idx
  ON production_post_houses (post_house_id, role);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_houses_kind_idx ON post_houses (kind);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS post_houses_name_trgm_idx
  ON post_houses USING gin (name gin_trgm_ops);
--> statement-breakpoint
-- Seed the major post houses every working colorist / re-recording mixer
-- recognizes. These are real companies with real catalogues.
INSERT INTO post_houses (slug, name, kind, country, city, website) VALUES
  ('company-3',     'Company 3',           'di_lab',    'US', 'Los Angeles', 'https://www.company3.com'),
  ('fotokem',       'FotoKem',             'di_lab',    'US', 'Burbank',     'https://www.fotokem.com'),
  ('efilm',         'EFILM',               'di_lab',    'US', 'Los Angeles', 'https://www.efilm.com'),
  ('picture-shop',  'Picture Shop',        'di_lab',    'US', 'Burbank',     'https://www.picture-shop.com'),
  ('goldcrest-post','Goldcrest Post',      'di_lab',    'GB', 'London',      'https://www.goldcrest-post.com'),
  ('harbor',        'Harbor',              'di_lab',    'US', 'New York',    'https://www.harborpicturecompany.com'),
  ('molinare',      'Molinare',            'di_lab',    'GB', 'London',      'https://www.molinare.co.uk'),
  ('technicolor',   'Technicolor',         'di_lab',    'US', 'Los Angeles', 'https://www.technicolor.com'),
  ('skywalker-sound','Skywalker Sound',    'sound_mix', 'US', 'Marin County', 'https://www.skywalkersound.com'),
  ('formosa-group', 'Formosa Group',       'sound_mix', 'US', 'Los Angeles', 'https://www.formosagroup.com'),
  ('sony-post',     'Sony Pictures Post Production Services', 'sound_mix', 'US', 'Culver City', null),
  ('imax-dmr',      'IMAX DMR',            'mastering', 'CA', 'Mississauga', 'https://www.imax.com'),
  ('dolby-labs',    'Dolby Laboratories',  'mastering', 'US', 'San Francisco', 'https://www.dolby.com')
ON CONFLICT (slug) DO NOTHING;
