-- E-26 — pgvector extension + embedding columns.
--
-- text-embedding-3-small returns 1536-dim vectors. We store them on
-- productions and people for semantic search and "similar to" queries.
-- HNSW indexes (default since pgvector 0.7) give sub-100ms top-K
-- recall at our row counts (~539 productions, ~11k people).
--
-- The columns are nullable because embeddings are populated by a
-- batch job (`embed:productions`, `embed:people`) and we don't want
-- inserts to block on an external API call.

CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
ALTER TABLE productions ADD COLUMN IF NOT EXISTS embedding vector(1536);
--> statement-breakpoint
ALTER TABLE people ADD COLUMN IF NOT EXISTS embedding vector(1536);
--> statement-breakpoint
-- HNSW index with cosine distance — matches OpenAI text-embedding-3-*
-- which is L2-normalized; cosine == 1 - dot for normalized vectors.
CREATE INDEX IF NOT EXISTS productions_embedding_hnsw_idx
  ON productions USING hnsw (embedding vector_cosine_ops);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS people_embedding_hnsw_idx
  ON people USING hnsw (embedding vector_cosine_ops);
