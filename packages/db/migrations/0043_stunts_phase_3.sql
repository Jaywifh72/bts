-- Stunt section, phase 3 — sequence-level detail layer.
--
-- A `stunt_sequence` represents a single set-piece (the HALO jump,
-- the pole-cat sequence, a specific car chase) tied back to its
-- production and optionally to a specific scene. The detail layer
-- is what no other reference site catalogues at this depth: rigging
-- breakdown, VFX-handoff frame, safety officer + bulletins followed,
-- and BTS video evidence.
--
-- `rigging` jsonb shape:
--   {
--     rigs?: Array<{ type, manufacturer?, capacity_lbs?, notes? }>,
--     mounts?: string[],
--     harness?: string,
--     notes?: string
--   }
--
-- `vehicle` jsonb (when sequence is vehicle-led):
--   {
--     picture_car?: { make, model, year?, modifications?: string[] },
--     precision_driver_person_slug?: string,
--     towing_rig?: 'russian_arm' | 'black_bird' | 'camera_car' | 'self_driven' | string,
--     prep_company?: string
--   }
--
-- `references` jsonb same shape as the rest of the archive
-- (`{ title, url, publication, kind }`).

CREATE TABLE stunt_sequences (
  id                          BIGSERIAL PRIMARY KEY,
  production_id               BIGINT NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  scene_id                    BIGINT REFERENCES scenes(id) ON DELETE SET NULL,
  slug                        TEXT NOT NULL,                 -- per-production unique
  name                        TEXT NOT NULL,
  description                 TEXT,
  screen_minutes              NUMERIC(4,2) CHECK (screen_minutes IS NULL OR screen_minutes >= 0),
  discipline_tags             TEXT[] NOT NULL DEFAULT '{}',
  rigging                     JSONB NOT NULL DEFAULT '{}'::jsonb,
  vehicle                     JSONB,
  vfx_handoff_frame           INTEGER CHECK (vfx_handoff_frame IS NULL OR vfx_handoff_frame >= 0),
  vfx_handoff_house_id        BIGINT REFERENCES vfx_houses(id) ON DELETE SET NULL,
  safety_officer_person_id    BIGINT REFERENCES people(id) ON DELETE SET NULL,
  safety_bulletins_followed   TEXT[] NOT NULL DEFAULT '{}',
  bts_video_url               TEXT,
  "references"                JSONB NOT NULL DEFAULT '[]'::jsonb,
  sort_order                  INTEGER NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (production_id, slug)
);
CREATE INDEX stunt_sequences_production_idx ON stunt_sequences(production_id, sort_order);
CREATE INDEX stunt_sequences_scene_idx
  ON stunt_sequences(scene_id) WHERE scene_id IS NOT NULL;

CREATE TABLE stunt_sequence_credits (
  id                          BIGSERIAL PRIMARY KEY,
  sequence_id                 BIGINT NOT NULL REFERENCES stunt_sequences(id) ON DELETE CASCADE,
  person_id                   BIGINT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role                        TEXT NOT NULL,                  -- 'coordinator' | 'performer' | 'double' | 'rigger' | 'safety' | '2nd_unit_director' | 'precision_driver' | 'fight_choreographer'
  doubling_for_person_id      BIGINT REFERENCES people(id) ON DELETE SET NULL,
  notes                       TEXT,
  sort_order                  INTEGER NOT NULL DEFAULT 0,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sequence_id, person_id, role)
);
CREATE INDEX stunt_sequence_credits_sequence_idx ON stunt_sequence_credits(sequence_id, sort_order);
CREATE INDEX stunt_sequence_credits_person_idx ON stunt_sequence_credits(person_id);
