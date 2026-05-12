ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'asc_article';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'icg_article';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'cinematographer_interview';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'director_interview';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'vfx_supervisor_interview';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'official_epk';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'bts_video';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'vfx_breakdown_video';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'manufacturer_documentation';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'rental_house_confirmation';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'studio_press_kit';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'award_submission';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'trade_article';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'database_import';
ALTER TYPE source_kind_enum ADD VALUE IF NOT EXISTS 'community_submission';

CREATE TYPE evidence_kind_enum AS ENUM (
  'video_timestamp',
  'video_still',
  'article_quote',
  'image_crop',
  'pdf_page',
  'social_post',
  'manual_editor_note'
);

CREATE TYPE evidence_review_status_enum AS ENUM (
  'pending',
  'reviewed',
  'rejected'
);

CREATE TABLE evidence_items (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT NOT NULL REFERENCES claims(id) ON DELETE CASCADE,
  source_id BIGINT REFERENCES sources(id) ON DELETE SET NULL,
  kind evidence_kind_enum NOT NULL,
  review_status evidence_review_status_enum NOT NULL DEFAULT 'pending',
  thumbnail_url TEXT,
  asset_url TEXT,
  caption TEXT,
  rights_note TEXT,
  created_by TEXT,
  timestamp_seconds INTEGER CHECK (timestamp_seconds IS NULL OR timestamp_seconds >= 0),
  page_number INTEGER CHECK (page_number IS NULL OR page_number > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX evidence_items_claim_idx ON evidence_items(claim_id);
CREATE INDEX evidence_items_source_idx ON evidence_items(source_id) WHERE source_id IS NOT NULL;
CREATE INDEX evidence_items_kind_idx ON evidence_items(kind);
CREATE INDEX evidence_items_review_status_idx ON evidence_items(review_status);

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON evidence_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
