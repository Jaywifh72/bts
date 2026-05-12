-- E-28 — visual embeddings on production_keyframes via SigLIP-2.
-- 768-dim float vector matches SigLIP-2 base (vs 1024 for large).
-- HNSW index for ANN cosine-similarity queries.
ALTER TABLE production_keyframes ADD COLUMN embedding vector(768);
CREATE INDEX production_keyframes_embedding_hnsw
  ON production_keyframes USING hnsw (embedding vector_cosine_ops);
