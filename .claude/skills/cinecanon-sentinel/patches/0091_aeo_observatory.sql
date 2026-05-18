-- 0091_aeo_observatory.sql
-- ----------------------------------------------------------------------
-- CineCanon-Sentinel: AEO/GEO observatory storage.
-- Integrates against the existing Drizzle Postgres schema (packages/db).
-- All FKs reference existing tables via column names; adjust if local
-- naming differs (e.g., productions.id is UUID per current schema).
--
-- Conventions followed from prior migrations (0001..0090):
--   - snake_case table & column names
--   - uuid PK with default gen_random_uuid()
--   - timestamptz columns with default now()
--   - text not null with check () for enums
--   - foreign keys named fk_<table>_<col>
--   - indexes named idx_<table>_<columns>
-- ----------------------------------------------------------------------

-- ----------------------------------------------------------------------
-- 1. aeo_engines — the 5 AI engines we sample
-- ----------------------------------------------------------------------
create table if not exists aeo_engines (
  id            uuid primary key default gen_random_uuid(),
  code          text not null unique check (code in (
                  'chatgpt','claude','perplexity','gemini','ai_overview'
                )),
  display_name  text not null,
  vendor        text not null,
  api_endpoint  text,
  active        boolean not null default true,
  cost_per_1k_queries_cents int,
  notes         text,
  created_at    timestamptz not null default now()
);

insert into aeo_engines (code, display_name, vendor) values
  ('chatgpt',     'ChatGPT (GPT-5.2 + browsing)', 'OpenAI'),
  ('claude',      'Claude Sonnet 4.6 + web_search', 'Anthropic'),
  ('perplexity',  'Perplexity Sonar', 'Perplexity'),
  ('gemini',      'Gemini 2.5 + grounding', 'Google'),
  ('ai_overview', 'Google AI Overviews', 'Google (via SerpAPI)')
on conflict (code) do nothing;

-- ----------------------------------------------------------------------
-- 2. aeo_prompts — the buyer-intent prompt bank
-- ----------------------------------------------------------------------
create table if not exists aeo_prompts (
  id                  uuid primary key default gen_random_uuid(),
  prompt_text         text not null,
  language            text not null default 'en' check (language = 'en'),
  funnel_stage        text not null check (funnel_stage in (
                        'awareness','consideration','decision','retention','support'
                      )),
  buyer_persona       text not null check (buyer_persona in (
                        'dp','gaffer','colorist','editor','sound_mixer','sound_designer',
                        'composer','music_supervisor','stunt_coordinator',
                        'production_designer','costume_designer','makeup_hair',
                        'researcher','journalist'
                      )),
  topical_cluster     text not null,
  expected_source_url text,
  -- pgvector embedding via text-embedding-3-small (already in use by /ask).
  -- 1536 dims to match production embeddings (see 0030_keyframe_embedding,
  -- 0053_embedding_versioning patterns).
  text_embedding      vector(1536),
  notes               text,
  source              text not null default 'curated' check (source in (
                        'curated','ask_log','synthesis_proposed'
                      )),
  created_at          timestamptz not null default now(),
  deprecated_on       date
);

create index if not exists idx_aeo_prompts_active
  on aeo_prompts (deprecated_on) where deprecated_on is null;
create index if not exists idx_aeo_prompts_cluster on aeo_prompts (topical_cluster);
-- HNSW vector index for prompt dedup against existing prompts.
create index if not exists idx_aeo_prompts_embedding
  on aeo_prompts using hnsw (text_embedding vector_cosine_ops);

-- ----------------------------------------------------------------------
-- 3. aeo_cycles — one row per orchestrator run
-- ----------------------------------------------------------------------
create table if not exists aeo_cycles (
  id               uuid primary key default gen_random_uuid(),
  cycle_number     bigserial unique,
  ran_on           date not null,
  focus_tag        text,
  intent_statement text,
  total_cost_cents integer,
  started_at       timestamptz not null default now(),
  finished_at      timestamptz,
  status           text not null default 'running' check (status in (
                     'running','succeeded','partial','failed'
                   ))
);

create index if not exists idx_aeo_cycles_ran_on on aeo_cycles (ran_on desc);

-- ----------------------------------------------------------------------
-- 4. aeo_response_observations — raw engine samples (immutable log)
-- ----------------------------------------------------------------------
create table if not exists aeo_response_observations (
  id                          uuid primary key default gen_random_uuid(),
  cycle_id                    uuid not null references aeo_cycles(id) on delete cascade,
  prompt_id                   uuid not null references aeo_prompts(id) on delete restrict,
  engine_id                   uuid not null references aeo_engines(id) on delete restrict,
  sample_index                int not null check (sample_index >= 1),
  observed_at                 timestamptz not null default now(),
  raw_response_json           jsonb,
  response_text               text,
  citations_json              jsonb,
  total_words_in_response     int,
  ai_overview_present         boolean,
  raw_response_token_cost_cents int,
  vendor_request_id           text,
  error_code                  text,
  latency_ms                  int
);

create index if not exists idx_aeo_obs_cycle on aeo_response_observations (cycle_id);
create index if not exists idx_aeo_obs_prompt_engine
  on aeo_response_observations (prompt_id, engine_id);
create index if not exists idx_aeo_obs_observed_at on aeo_response_observations (observed_at desc);

-- ----------------------------------------------------------------------
-- 5. aeo_citation_pools — the 10 third-party citation pools we track
-- ----------------------------------------------------------------------
create table if not exists aeo_citation_pools (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  primary_domain  text not null,
  also_known_as   text[],
  category        text not null check (category in (
                    'database_authority','general_authority','vfx_trade',
                    'craft_trade','industry_press','craft_forum','community',
                    'credit_database','sound_trade'
                  )),
  tier            int check (tier between 1 and 5),
  active          boolean not null default true,
  created_at      timestamptz not null default now()
);

insert into aeo_citation_pools (name, primary_domain, also_known_as, category, tier) values
  ('IMDb Pro',                  'pro.imdb.com',         array['IMDb','IMDb Pro','imdb.com'],                  'database_authority', 5),
  ('Wikipedia',                 'en.wikipedia.org',     array['Wikipedia','wikipedia.org'],                   'general_authority',  5),
  ('fxguide',                   'fxguide.com',          array['fxguide','fxphd','fxphd.com'],                 'vfx_trade',          1),
  ('American Cinematographer',  'theasc.com',           array['ASC','American Cinematographer','ascmag.com'], 'craft_trade',        1),
  ('Variety',                   'variety.com',          array['Variety'],                                     'industry_press',     3),
  ('Hollywood Reporter',        'hollywoodreporter.com',array['Hollywood Reporter','THR'],                    'industry_press',     3),
  ('RogerDeakins forum',        'rogerdeakins.com',     array['Roger Deakins forum','rogerdeakins.com'],      'craft_forum',        2),
  ('Letterboxd',                'letterboxd.com',       array['Letterboxd'],                                  'community',          2),
  ('Cinematography Database',   'cinematographydb.com', array['Cinematography Database','cinematographydb'], 'credit_database',    4),
  ('Production Sound Mixers Guild','local695.com',      array['Local 695','PSMG','AMPS'],                     'sound_trade',        4)
on conflict do nothing;

-- ----------------------------------------------------------------------
-- 6. aeo_citation_scores — Princeton-style per-citation metrics
-- ----------------------------------------------------------------------
create table if not exists aeo_citation_scores (
  id                       uuid primary key default gen_random_uuid(),
  observation_id           uuid not null references aeo_response_observations(id) on delete cascade,
  cited_url                text not null,
  cited_domain             text not null,
  -- Either this is a CineCanon page (own_url) or a third-party pool match.
  is_cinecanon             boolean not null default false,
  pool_id                  uuid references aeo_citation_pools(id) on delete set null,
  -- Princeton metrics
  impression_score         numeric(6,4),
  citation_recall          numeric(6,4),
  citation_precision       numeric(6,4),
  judge_score              int check (judge_score in (0, 1, 2)),
  judge_rationale          text,
  judge_model              text,
  -- The actual position in the response, for reproducibility
  position_in_response     int,
  attributed_sentences     text[],
  created_at               timestamptz not null default now()
);

create index if not exists idx_aeo_scores_obs on aeo_citation_scores (observation_id);
create index if not exists idx_aeo_scores_cinecanon
  on aeo_citation_scores (is_cinecanon) where is_cinecanon = true;
create index if not exists idx_aeo_scores_pool on aeo_citation_scores (pool_id) where pool_id is not null;
create index if not exists idx_aeo_scores_url on aeo_citation_scores (cited_url);

-- ----------------------------------------------------------------------
-- 7. aeo_daily_metrics — aggregated daily metrics with CIs
-- ----------------------------------------------------------------------
create table if not exists aeo_daily_metrics (
  id                  uuid primary key default gen_random_uuid(),
  metric_date         date not null,
  engine_id           uuid references aeo_engines(id) on delete cascade,
  scope               text not null check (scope in ('cinecanon','pool','aggregate')),
  pool_id             uuid references aeo_citation_pools(id) on delete cascade,
  topical_cluster     text,
  page_url            text,
  -- Aggregated metrics
  precision_mean      numeric(6,4),
  precision_ci_lo     numeric(6,4),
  precision_ci_hi     numeric(6,4),
  impression_mean     numeric(6,4),
  impression_ci_lo    numeric(6,4),
  impression_ci_hi    numeric(6,4),
  recall_mean         numeric(6,4),
  recall_ci_lo        numeric(6,4),
  recall_ci_hi        numeric(6,4),
  share_of_answer     numeric(6,4),
  n_observations      int not null,
  computed_at         timestamptz not null default now()
);

create index if not exists idx_aeo_daily_date on aeo_daily_metrics (metric_date desc);
create index if not exists idx_aeo_daily_page on aeo_daily_metrics (page_url) where page_url is not null;
create unique index if not exists uq_aeo_daily_dim
  on aeo_daily_metrics (metric_date, engine_id, scope, coalesce(pool_id, '00000000-0000-0000-0000-000000000000'::uuid), coalesce(topical_cluster, ''), coalesce(page_url, ''));

-- ----------------------------------------------------------------------
-- 8. aeo_judge_cache — Citation Precision judge results (30-day TTL)
-- ----------------------------------------------------------------------
create table if not exists aeo_judge_cache (
  id              uuid primary key default gen_random_uuid(),
  -- Cache key components — same (source, claim) returns same score
  source_url      text not null,
  source_hash     text not null,  -- sha256 of source content at fetch time
  claim_text      text not null,
  claim_hash      text not null,  -- sha256 of claim
  judge_model     text not null,
  judge_score     int not null check (judge_score in (0, 1, 2)),
  judge_rationale text,
  specific_issues text[],
  cached_at       timestamptz not null default now(),
  expires_at      timestamptz not null default (now() + interval '30 days')
);

create unique index if not exists uq_aeo_judge_cache_key
  on aeo_judge_cache (source_hash, claim_hash, judge_model);
create index if not exists idx_aeo_judge_expires on aeo_judge_cache (expires_at);

-- ----------------------------------------------------------------------
-- 9. aeo_interventions — content optimizer's applied changes
-- ----------------------------------------------------------------------
create table if not exists aeo_interventions (
  id                  uuid primary key default gen_random_uuid(),
  page_url            text not null,
  intervention_type   text not null check (intervention_type in (
                        'quotation_addition','concept_linking','statistics_addition',
                        'fluency_rewrite','cite_sources','claim_review_emit'
                      )),
  github_pr_number    int,
  github_pr_url       text,
  rationale           text,
  predicted_lift      numeric(5,3),
  pre_precision_mean  numeric(6,4),
  pre_impression_mean numeric(6,4),
  pre_recall_mean     numeric(6,4),
  pre_n               int,
  drafted_at          timestamptz not null default now(),
  merged_at           timestamptz,
  decision            text check (decision in ('booked','reverted','inconclusive','pending')),
  decided_at          timestamptz,
  post_precision_mean numeric(6,4),
  post_impression_mean numeric(6,4),
  post_n              int,
  reverted_pr_number  int
);

create index if not exists idx_aeo_interventions_page on aeo_interventions (page_url);
create index if not exists idx_aeo_interventions_pending
  on aeo_interventions (drafted_at desc) where decision = 'pending' or decision is null;

-- ----------------------------------------------------------------------
-- 10. aeo_earned_media_targets — outreach briefs
-- ----------------------------------------------------------------------
create table if not exists aeo_earned_media_targets (
  id                              uuid primary key default gen_random_uuid(),
  source_url                      text not null,
  source_domain                   text not null,
  pool_id                         uuid references aeo_citation_pools(id) on delete set null,
  discovery_method                text not null check (discovery_method in (
                                    'competitor_citation_spike','cluster_lift','manual'
                                  )),
  topical_cluster                 text,
  observed_competitor_mentions    int default 0,
  observed_cinecanon_mentions     int default 0,
  outreach_brief                  text,
  status                          text not null default 'discovered' check (status in (
                                    'discovered','brief_drafted','sent','placed','declined','expired'
                                  )),
  placement_observed_in_ai        boolean default false,
  discovered_at                   timestamptz not null default now(),
  sent_at                         timestamptz,
  placed_at                       timestamptz
);

create index if not exists idx_aeo_earned_status on aeo_earned_media_targets (status);

-- ----------------------------------------------------------------------
-- 11. aeo_schema_validations — daily entity-graph-curator spot checks
-- ----------------------------------------------------------------------
create table if not exists aeo_schema_validations (
  id                  uuid primary key default gen_random_uuid(),
  page_url            text not null,
  bot_ua              text not null,
  validation_date     date not null default current_date,
  ssr_ok              boolean not null,
  rendered_text_bytes int,
  json_ld_blocks      int,
  claim_review_blocks int,
  schema_errors       text[],
  same_as_gaps        text[],
  checked_at          timestamptz not null default now()
);

create index if not exists idx_aeo_schema_date on aeo_schema_validations (validation_date desc);
create index if not exists idx_aeo_schema_failures
  on aeo_schema_validations (page_url) where ssr_ok = false or array_length(schema_errors, 1) > 0;

-- ----------------------------------------------------------------------
-- 12. aeo_cycle_decisions — carry-overs and intent statements
-- ----------------------------------------------------------------------
create table if not exists aeo_cycle_decisions (
  id              uuid primary key default gen_random_uuid(),
  cycle_id        uuid not null references aeo_cycles(id) on delete cascade,
  decision_type   text not null check (decision_type in (
                    'carry_over','skip','override','focus_change'
                  )),
  decision_text   text not null,
  created_at      timestamptz not null default now()
);

-- ----------------------------------------------------------------------
-- VIEWS — aggregations the agents read
-- ----------------------------------------------------------------------

-- Citation Precision per CineCanon page × engine (last 7 days)
create or replace view aeo_precision_by_page_7d as
select
  s.cited_url as page_url,
  e.code as engine_code,
  count(*) as n,
  avg(s.citation_precision) as precision_mean,
  stddev_samp(s.citation_precision) as precision_stddev
from aeo_citation_scores s
join aeo_response_observations o on o.id = s.observation_id
join aeo_engines e on e.id = o.engine_id
where s.is_cinecanon = true
  and o.observed_at > now() - interval '7 days'
  and s.citation_precision is not null
group by s.cited_url, e.code;

-- Share of answer per pool × topical cluster (last 7 days)
create or replace view aeo_pool_share_7d as
select
  pool.name as pool_name,
  pool.tier as pool_tier,
  p.topical_cluster,
  e.code as engine_code,
  count(*) filter (where s.pool_id is not null) as pool_citations,
  count(*) filter (where s.is_cinecanon = true) as cinecanon_citations,
  count(*) as total_citations
from aeo_citation_scores s
join aeo_response_observations o on o.id = s.observation_id
join aeo_prompts p on p.id = o.prompt_id
join aeo_engines e on e.id = o.engine_id
left join aeo_citation_pools pool on pool.id = s.pool_id
where o.observed_at > now() - interval '7 days'
group by pool.name, pool.tier, p.topical_cluster, e.code;
