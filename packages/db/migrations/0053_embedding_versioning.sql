-- Migration 0053 — Embedding model versioning columns.
--
-- Vector dimensions and model identity are currently implicit:
--   • productions.embedding         vector(1536)  — assumed text-embedding-3-small
--   • people.embedding              vector(1536)  — assumed text-embedding-3-small
--   • production_keyframes.embedding vector(768)  — assumed SigLIP-2
--
-- When OpenAI rotates text-embedding-3-small (it has been re-versioned twice
-- since 2024), or when we switch keyframes to a newer visual model, we need
-- to run incremental re-embed campaigns. Without per-row markers we can't
-- distinguish freshly-embedded rows from stale ones.
--
-- This migration adds (model, generated_at) markers on each embedding-bearing
-- table. Backfill uses the current canonical model name as the default; new
-- rows pick up the canonical at write time.
--
-- drizzle-kit wraps each migration in its own transaction.

ALTER TABLE productions
  ADD COLUMN IF NOT EXISTS embedding_model TEXT,
  ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;

ALTER TABLE people
  ADD COLUMN IF NOT EXISTS embedding_model TEXT,
  ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;

ALTER TABLE production_keyframes
  ADD COLUMN IF NOT EXISTS embedding_model TEXT,
  ADD COLUMN IF NOT EXISTS embedding_generated_at TIMESTAMPTZ;

-- Backfill: stamp existing embedded rows with the current canonical model so
-- a "where embedding_model != $current" sweep correctly finds 0 stale rows
-- today and lights up only after a model rotation.
UPDATE productions
  SET embedding_model = 'text-embedding-3-small',
      embedding_generated_at = COALESCE(updated_at, NOW())
  WHERE embedding IS NOT NULL AND embedding_model IS NULL;

UPDATE people
  SET embedding_model = 'text-embedding-3-small',
      embedding_generated_at = COALESCE(updated_at, NOW())
  WHERE embedding IS NOT NULL AND embedding_model IS NULL;

UPDATE production_keyframes
  SET embedding_model = 'siglip-2-base-patch16-384',
      embedding_generated_at = COALESCE(updated_at, NOW())
  WHERE embedding IS NOT NULL AND embedding_model IS NULL;

-- Index on (model, generated_at) so the rotation query is fast at scale:
--   SELECT id FROM productions WHERE embedding_model != $current ORDER BY id LIMIT 100
CREATE INDEX IF NOT EXISTS productions_embedding_model_idx
  ON productions (embedding_model, embedding_generated_at) WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS people_embedding_model_idx
  ON people (embedding_model, embedding_generated_at) WHERE embedding IS NOT NULL;

CREATE INDEX IF NOT EXISTS production_keyframes_embedding_model_idx
  ON production_keyframes (embedding_model, embedding_generated_at) WHERE embedding IS NOT NULL;
