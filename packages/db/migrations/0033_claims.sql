CREATE TYPE claim_type_enum AS ENUM (
  'production_camera',
  'production_lens',
  'production_filter',
  'production_format',
  'production_lighting',
  'production_color_pipeline',
  'production_post_house',
  'production_vfx_house',
  'production_vfx_sequence',
  'scene_camera',
  'scene_lens',
  'scene_lighting',
  'scene_vfx',
  'scene_location',
  'gear_spec',
  'person_credit',
  'video_evidence',
  'general_bts_fact'
);

CREATE TYPE claim_status_enum AS ENUM (
  'candidate',
  'needs_source',
  'sourced',
  'reviewed',
  'verified',
  'disputed',
  'deprecated',
  'rejected'
);

CREATE TYPE claim_confidence_enum AS ENUM (
  'primary',
  'secondary',
  'manufacturer',
  'rental_house',
  'bts_visual',
  'inferred',
  'speculative',
  'conflicting'
);

CREATE TYPE claim_entity_type_enum AS ENUM (
  'production',
  'scene',
  'person',
  'role',
  'equipment_manufacturer',
  'equipment_series',
  'equipment_item',
  'vfx_house',
  'source',
  'video',
  'post_house',
  'location'
);

CREATE TYPE claim_conflict_kind_enum AS ENUM (
  'direct_conflict',
  'partial_conflict',
  'stale_source',
  'duplicate',
  'scope_mismatch'
);

CREATE TYPE claim_conflict_resolution_status_enum AS ENUM (
  'open',
  'reviewing',
  'resolved',
  'dismissed'
);

CREATE TABLE claims (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  claim_type claim_type_enum NOT NULL,
  statement TEXT NOT NULL,
  normalized_statement TEXT NOT NULL,
  status claim_status_enum NOT NULL DEFAULT 'candidate',
  confidence claim_confidence_enum NOT NULL DEFAULT 'inferred',
  editorial_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_verified_at TIMESTAMPTZ,
  verified_by TEXT
);
CREATE INDEX claims_type_idx ON claims(claim_type);
CREATE INDEX claims_status_idx ON claims(status);
CREATE INDEX claims_confidence_idx ON claims(confidence);
CREATE INDEX claims_last_verified_idx ON claims(last_verified_at);

CREATE TABLE claim_sources (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  source_id BIGINT NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
  confidence claim_confidence_enum NOT NULL,
  quote TEXT,
  timestamp_seconds INTEGER CHECK (timestamp_seconds IS NULL OR timestamp_seconds >= 0),
  page_number INTEGER CHECK (page_number IS NULL OR page_number > 0),
  url_fragment TEXT,
  editorial_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX claim_sources_claim_idx ON claim_sources(claim_id);
CREATE INDEX claim_sources_source_idx ON claim_sources(source_id);
CREATE UNIQUE INDEX claim_sources_claim_source_locator_unq
  ON claim_sources (
    claim_id,
    source_id,
    COALESCE(timestamp_seconds, -1),
    COALESCE(page_number, -1),
    COALESCE(url_fragment, '')
  );

CREATE TABLE claim_entities (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  entity_type claim_entity_type_enum NOT NULL,
  entity_id BIGINT NOT NULL,
  entity_slug TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (claim_id, entity_type, entity_id)
);
CREATE INDEX claim_entities_claim_idx ON claim_entities(claim_id);
CREATE INDEX claim_entities_reverse_idx ON claim_entities(entity_type, entity_id);

CREATE TABLE claim_conflicts (
  id BIGSERIAL PRIMARY KEY,
  claim_a_id BIGINT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  claim_b_id BIGINT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  conflict_kind claim_conflict_kind_enum NOT NULL,
  resolution_status claim_conflict_resolution_status_enum NOT NULL DEFAULT 'open',
  resolution_note TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (claim_a_id <> claim_b_id)
);
CREATE INDEX claim_conflicts_claim_a_idx ON claim_conflicts(claim_a_id);
CREATE INDEX claim_conflicts_claim_b_idx ON claim_conflicts(claim_b_id);
CREATE INDEX claim_conflicts_resolution_status_idx ON claim_conflicts(resolution_status);
CREATE UNIQUE INDEX claim_conflicts_pair_kind_unq
  ON claim_conflicts (
    LEAST(claim_a_id, claim_b_id),
    GREATEST(claim_a_id, claim_b_id),
    conflict_kind
  );

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON claims
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON claim_sources
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON claim_conflicts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
