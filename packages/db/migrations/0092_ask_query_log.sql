-- 0092_ask_query_log.sql
-- ----------------------------------------------------------------------
-- Add logging for /ask natural-language queries so the AEO observatory's
-- prompt-curator can ingest real working-pro intent as the prompt-bank
-- flywheel input.
--
-- The /ask route is at apps/web/app/ask/page.tsx (server component).
-- It calls extractFilters(query) → searchProductionsCombined(...).
-- The patch in patches/ask-logging.diff adds a fire-and-forget insert
-- against this table at the start of each non-empty query.
--
-- Privacy notes:
--   - We store the raw query text (it's already sent to OpenAI).
--   - We do NOT store user_id, IP, or session for unauthenticated users.
--     For authenticated users, an optional user_id reference is allowed
--     to dedupe repeat-same-query patterns from a single curator.
--   - A monthly retention job purges rows older than 180 days.
-- ----------------------------------------------------------------------

create table if not exists ask_query_log (
  id              uuid primary key default gen_random_uuid(),
  query_text      text not null,
  -- Optional, only for authenticated submissions.
  -- DEVIATION from patch doc: users.id is uuid in this repo
  -- (NextAuth + drizzle-adapter). Patch had text; adjusted to match.
  user_id         uuid references users(id) on delete set null,
  -- The interpreted filters extractFilters() returned, for analytics.
  filters_json    jsonb,
  -- Number of results returned, helpful for spotting dead queries.
  result_count    int,
  -- Was an OpenAI embedding fetched (i.e. did the user query include themes)?
  used_embedding  boolean not null default false,
  -- Latency of the full /ask request roundtrip in ms.
  total_latency_ms int,
  -- For the prompt-curator dedup, we cache the text-embedding-3-small
  -- vector once and reuse it. Same dim as productions/keyframes (1536).
  query_embedding vector(1536),
  -- Source: 'web' (the /ask UI), 'api' (future), 'test' (synthetic).
  source          text not null default 'web' check (source in ('web','api','test')),
  -- Cluster the prompt-curator assigned during nightly ingestion;
  -- populated lazily, NULL until the curator processes the row.
  assigned_cluster text,
  -- Was this query promoted to the aeo_prompts bank?
  promoted_to_prompt_id uuid references aeo_prompts(id) on delete set null,
  observed_at     timestamptz not null default now()
);

-- For nightly ingestion: pull unprocessed rows from last 24h
create index if not exists idx_ask_query_log_observed
  on ask_query_log (observed_at desc);

-- For curator dedup against existing prompts via cosine similarity
create index if not exists idx_ask_query_log_embedding
  on ask_query_log using hnsw (query_embedding vector_cosine_ops)
  where query_embedding is not null;

-- For analytics: which clusters dominate
create index if not exists idx_ask_query_log_cluster
  on ask_query_log (assigned_cluster) where assigned_cluster is not null;

-- Retention: purge after 180 days. Job in packages/db/scripts/retention/.
-- This SQL only documents the contract; the actual sweep runs nightly.
comment on table ask_query_log is
  'Retention: 180 days. Purged nightly by packages/db/scripts/retention/ask_query_log.ts.
   The prompt-curator should ingest unprocessed rows within 24h of arrival.';
