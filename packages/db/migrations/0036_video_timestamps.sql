CREATE TYPE transcript_status_enum AS ENUM (
  'pending',
  'fetched',
  'manual',
  'unavailable',
  'failed'
);

CREATE TYPE video_annotation_type_enum AS ENUM (
  'visible_gear',
  'vfx_before_after',
  'lighting_setup_visible',
  'monitor_lut_visible',
  'rigging_stunt_visible',
  'virtual_production_visible',
  'interview_quote',
  'general_evidence'
);

CREATE TYPE video_annotation_review_status_enum AS ENUM (
  'pending',
  'reviewed',
  'rejected'
);

CREATE TABLE production_video_transcripts (
  id BIGSERIAL PRIMARY KEY,
  video_id BIGINT NOT NULL REFERENCES production_videos(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL DEFAULT 'en',
  status transcript_status_enum NOT NULL DEFAULT 'pending',
  source_label TEXT,
  full_text TEXT,
  fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (video_id, language_code)
);
CREATE INDEX production_video_transcripts_status_idx
  ON production_video_transcripts(status);

CREATE TABLE production_video_transcript_segments (
  id BIGSERIAL PRIMARY KEY,
  transcript_id BIGINT NOT NULL REFERENCES production_video_transcripts(id) ON DELETE CASCADE,
  start_seconds INTEGER NOT NULL,
  end_seconds INTEGER,
  text TEXT NOT NULL,
  confidence_score NUMERIC(4, 3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_seconds >= 0 AND (end_seconds IS NULL OR end_seconds >= start_seconds))
);
CREATE INDEX production_video_transcript_segments_transcript_idx
  ON production_video_transcript_segments(transcript_id, start_seconds);

CREATE TABLE production_video_chapters (
  id BIGSERIAL PRIMARY KEY,
  video_id BIGINT NOT NULL REFERENCES production_videos(id) ON DELETE CASCADE,
  start_seconds INTEGER NOT NULL,
  end_seconds INTEGER,
  title TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (video_id, start_seconds),
  CHECK (start_seconds >= 0 AND (end_seconds IS NULL OR end_seconds >= start_seconds))
);
CREATE INDEX production_video_chapters_video_idx
  ON production_video_chapters(video_id, start_seconds);

CREATE TABLE production_video_timestamp_annotations (
  id BIGSERIAL PRIMARY KEY,
  video_id BIGINT NOT NULL REFERENCES production_videos(id) ON DELETE CASCADE,
  claim_id BIGINT REFERENCES claims(id) ON DELETE SET NULL,
  evidence_item_id BIGINT REFERENCES evidence_items(id) ON DELETE SET NULL,
  annotation_type video_annotation_type_enum NOT NULL,
  review_status video_annotation_review_status_enum NOT NULL DEFAULT 'pending',
  start_seconds INTEGER NOT NULL,
  end_seconds INTEGER,
  label TEXT NOT NULL,
  note TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (start_seconds >= 0 AND (end_seconds IS NULL OR end_seconds >= start_seconds))
);
CREATE INDEX production_video_timestamp_annotations_video_idx
  ON production_video_timestamp_annotations(video_id, start_seconds);
CREATE INDEX production_video_timestamp_annotations_claim_idx
  ON production_video_timestamp_annotations(claim_id)
  WHERE claim_id IS NOT NULL;
CREATE INDEX production_video_timestamp_annotations_status_idx
  ON production_video_timestamp_annotations(review_status);
CREATE INDEX production_video_timestamp_annotations_type_idx
  ON production_video_timestamp_annotations(annotation_type);

CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON production_video_transcripts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON production_video_chapters
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at_trigger
  BEFORE UPDATE ON production_video_timestamp_annotations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
