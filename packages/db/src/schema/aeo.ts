// AEO observatory (CineCanon-Sentinel) — migration 0091/0092
//
// These tables are written primarily by Hermes-side agents that live
// outside this repo. Drizzle definitions here exist so any in-app
// reader (e.g. /admin/(authenticated)/aeo/* in a future phase, or the
// /ask logging insert in queries/askLog.ts) can use the typed query
// builder. Schema is the source of truth; see migrations 0091/0092.

import {
  pgTable,
  uuid,
  text,
  jsonb,
  boolean,
  integer,
  bigint,
  timestamp,
  date,
  numeric,
  vector,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

export const aeoEngines = pgTable('aeo_engines', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique(),
  displayName: text('display_name').notNull(),
  vendor: text('vendor').notNull(),
  apiEndpoint: text('api_endpoint'),
  active: boolean('active').notNull().default(true),
  costPer1kQueriesCents: integer('cost_per_1k_queries_cents'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aeoPrompts = pgTable(
  'aeo_prompts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    promptText: text('prompt_text').notNull(),
    language: text('language').notNull().default('en'),
    funnelStage: text('funnel_stage').notNull(),
    buyerPersona: text('buyer_persona').notNull(),
    topicalCluster: text('topical_cluster').notNull(),
    expectedSourceUrl: text('expected_source_url'),
    textEmbedding: vector('text_embedding', { dimensions: 1536 }),
    notes: text('notes'),
    source: text('source').notNull().default('curated'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deprecatedOn: date('deprecated_on'),
  },
  (t) => ({
    clusterIdx: index('idx_aeo_prompts_cluster').on(t.topicalCluster),
  }),
);

export const aeoCycles = pgTable('aeo_cycles', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleNumber: bigint('cycle_number', { mode: 'number' }).notNull().unique(),
  ranOn: date('ran_on').notNull(),
  focusTag: text('focus_tag'),
  intentStatement: text('intent_statement'),
  totalCostCents: integer('total_cost_cents'),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  status: text('status').notNull().default('running'),
});

export const aeoResponseObservations = pgTable(
  'aeo_response_observations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    cycleId: uuid('cycle_id').notNull(),
    promptId: uuid('prompt_id').notNull(),
    engineId: uuid('engine_id').notNull(),
    sampleIndex: integer('sample_index').notNull(),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
    rawResponseJson: jsonb('raw_response_json'),
    responseText: text('response_text'),
    citationsJson: jsonb('citations_json'),
    totalWordsInResponse: integer('total_words_in_response'),
    aiOverviewPresent: boolean('ai_overview_present'),
    rawResponseTokenCostCents: integer('raw_response_token_cost_cents'),
    vendorRequestId: text('vendor_request_id'),
    errorCode: text('error_code'),
    latencyMs: integer('latency_ms'),
  },
  (t) => ({
    cycleIdx: index('idx_aeo_obs_cycle').on(t.cycleId),
    promptEngineIdx: index('idx_aeo_obs_prompt_engine').on(t.promptId, t.engineId),
  }),
);

export const aeoCitationPools = pgTable('aeo_citation_pools', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  primaryDomain: text('primary_domain').notNull(),
  alsoKnownAs: text('also_known_as').array(),
  category: text('category').notNull(),
  tier: integer('tier'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aeoCitationScores = pgTable(
  'aeo_citation_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    observationId: uuid('observation_id').notNull(),
    citedUrl: text('cited_url').notNull(),
    citedDomain: text('cited_domain').notNull(),
    isCinecanon: boolean('is_cinecanon').notNull().default(false),
    poolId: uuid('pool_id'),
    impressionScore: numeric('impression_score', { precision: 6, scale: 4 }),
    citationRecall: numeric('citation_recall', { precision: 6, scale: 4 }),
    citationPrecision: numeric('citation_precision', { precision: 6, scale: 4 }),
    judgeScore: integer('judge_score'),
    judgeRationale: text('judge_rationale'),
    judgeModel: text('judge_model'),
    positionInResponse: integer('position_in_response'),
    attributedSentences: text('attributed_sentences').array(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    obsIdx: index('idx_aeo_scores_obs').on(t.observationId),
    urlIdx: index('idx_aeo_scores_url').on(t.citedUrl),
  }),
);

export const aeoDailyMetrics = pgTable('aeo_daily_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  metricDate: date('metric_date').notNull(),
  engineId: uuid('engine_id'),
  scope: text('scope').notNull(),
  poolId: uuid('pool_id'),
  topicalCluster: text('topical_cluster'),
  pageUrl: text('page_url'),
  precisionMean: numeric('precision_mean', { precision: 6, scale: 4 }),
  precisionCiLo: numeric('precision_ci_lo', { precision: 6, scale: 4 }),
  precisionCiHi: numeric('precision_ci_hi', { precision: 6, scale: 4 }),
  impressionMean: numeric('impression_mean', { precision: 6, scale: 4 }),
  impressionCiLo: numeric('impression_ci_lo', { precision: 6, scale: 4 }),
  impressionCiHi: numeric('impression_ci_hi', { precision: 6, scale: 4 }),
  recallMean: numeric('recall_mean', { precision: 6, scale: 4 }),
  recallCiLo: numeric('recall_ci_lo', { precision: 6, scale: 4 }),
  recallCiHi: numeric('recall_ci_hi', { precision: 6, scale: 4 }),
  shareOfAnswer: numeric('share_of_answer', { precision: 6, scale: 4 }),
  nObservations: integer('n_observations').notNull(),
  computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
});

export const aeoJudgeCache = pgTable(
  'aeo_judge_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourceUrl: text('source_url').notNull(),
    sourceHash: text('source_hash').notNull(),
    claimText: text('claim_text').notNull(),
    claimHash: text('claim_hash').notNull(),
    judgeModel: text('judge_model').notNull(),
    judgeScore: integer('judge_score').notNull(),
    judgeRationale: text('judge_rationale'),
    specificIssues: text('specific_issues').array(),
    cachedAt: timestamp('cached_at', { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (t) => ({
    keyIdx: uniqueIndex('uq_aeo_judge_cache_key').on(t.sourceHash, t.claimHash, t.judgeModel),
  }),
);

export const aeoInterventions = pgTable('aeo_interventions', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageUrl: text('page_url').notNull(),
  interventionType: text('intervention_type').notNull(),
  githubPrNumber: integer('github_pr_number'),
  githubPrUrl: text('github_pr_url'),
  rationale: text('rationale'),
  predictedLift: numeric('predicted_lift', { precision: 5, scale: 3 }),
  prePrecisionMean: numeric('pre_precision_mean', { precision: 6, scale: 4 }),
  preImpressionMean: numeric('pre_impression_mean', { precision: 6, scale: 4 }),
  preRecallMean: numeric('pre_recall_mean', { precision: 6, scale: 4 }),
  preN: integer('pre_n'),
  draftedAt: timestamp('drafted_at', { withTimezone: true }).notNull().defaultNow(),
  mergedAt: timestamp('merged_at', { withTimezone: true }),
  decision: text('decision'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  postPrecisionMean: numeric('post_precision_mean', { precision: 6, scale: 4 }),
  postImpressionMean: numeric('post_impression_mean', { precision: 6, scale: 4 }),
  postN: integer('post_n'),
  revertedPrNumber: integer('reverted_pr_number'),
});

export const aeoEarnedMediaTargets = pgTable('aeo_earned_media_targets', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceUrl: text('source_url').notNull(),
  sourceDomain: text('source_domain').notNull(),
  poolId: uuid('pool_id'),
  discoveryMethod: text('discovery_method').notNull(),
  topicalCluster: text('topical_cluster'),
  observedCompetitorMentions: integer('observed_competitor_mentions').default(0),
  observedCinecanonMentions: integer('observed_cinecanon_mentions').default(0),
  outreachBrief: text('outreach_brief'),
  status: text('status').notNull().default('discovered'),
  placementObservedInAi: boolean('placement_observed_in_ai').default(false),
  discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  placedAt: timestamp('placed_at', { withTimezone: true }),
});

export const aeoSchemaValidations = pgTable('aeo_schema_validations', {
  id: uuid('id').primaryKey().defaultRandom(),
  pageUrl: text('page_url').notNull(),
  botUa: text('bot_ua').notNull(),
  validationDate: date('validation_date').notNull(),
  ssrOk: boolean('ssr_ok').notNull(),
  renderedTextBytes: integer('rendered_text_bytes'),
  jsonLdBlocks: integer('json_ld_blocks'),
  claimReviewBlocks: integer('claim_review_blocks'),
  schemaErrors: text('schema_errors').array(),
  sameAsGaps: text('same_as_gaps').array(),
  checkedAt: timestamp('checked_at', { withTimezone: true }).notNull().defaultNow(),
});

// ask_query_log — migration 0092. Fire-and-forget log of /ask queries
// for the prompt-curator flywheel. See queries/askLog.ts.
export const askQueryLog = pgTable(
  'ask_query_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    queryText: text('query_text').notNull(),
    userId: uuid('user_id'),
    filtersJson: jsonb('filters_json'),
    resultCount: integer('result_count'),
    usedEmbedding: boolean('used_embedding').notNull().default(false),
    totalLatencyMs: integer('total_latency_ms'),
    queryEmbedding: vector('query_embedding', { dimensions: 1536 }),
    source: text('source').notNull().default('web'),
    assignedCluster: text('assigned_cluster'),
    promotedToPromptId: uuid('promoted_to_prompt_id'),
    observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    observedIdx: index('idx_ask_query_log_observed').on(t.observedAt),
    clusterIdx: index('idx_ask_query_log_cluster').on(t.assignedCluster),
  }),
);

export const aeoCycleDecisions = pgTable('aeo_cycle_decisions', {
  id: uuid('id').primaryKey().defaultRandom(),
  cycleId: uuid('cycle_id').notNull(),
  decisionType: text('decision_type').notNull(),
  decisionText: text('decision_text').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
