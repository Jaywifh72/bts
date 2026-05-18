# Patch: `/ask` query logging

**Files touched:**
- `apps/web/app/ask/page.tsx` (one new import + one fire-and-forget call)
- `packages/db/src/queries/askLog.ts` (new file)
- `packages/db/migrations/0092_ask_query_log.sql` (in `patches/`)

The /ask route currently calls `extractFilters` + `searchProductionsCombined` and renders results, but doesn't persist anything about the query. The prompt-curator needs a log to ingest. This patch is the minimum addition: a non-blocking insert that captures the query, the interpreted filters, the result count, and the OpenAI embedding (when one was already fetched — no extra cost).

---

## New file — `packages/db/src/queries/askLog.ts`

```ts
import type { Database } from '../db';
import { askQueryLog } from '../schema/aeo';

export interface RecordAskQueryInput {
  queryText: string;
  userId?: string | null;
  filtersJson?: unknown;
  resultCount: number;
  usedEmbedding: boolean;
  totalLatencyMs: number;
  queryEmbedding?: number[] | null;
  source?: 'web' | 'api' | 'test';
}

/**
 * Fire-and-forget insert. Callers should NOT await this in the request
 * path — see /ask page.tsx for usage. Errors are swallowed and logged
 * to Sentry; we never want logging to break the /ask response.
 */
export async function recordAskQuery(
  db: Database,
  input: RecordAskQueryInput,
): Promise<void> {
  try {
    await db.insert(askQueryLog).values({
      queryText: input.queryText.slice(0, 500),  // hard cap matches input maxLength
      userId: input.userId ?? null,
      filtersJson: input.filtersJson as object | undefined,
      resultCount: input.resultCount,
      usedEmbedding: input.usedEmbedding,
      totalLatencyMs: input.totalLatencyMs,
      queryEmbedding: input.queryEmbedding ?? null,
      source: input.source ?? 'web',
    });
  } catch (err) {
    // Don't throw — logging must never fail user-facing /ask requests.
    // Sentry will pick this up via the sentry-nextjs auto-instrumentation.
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(err, {
      tags: { surface: 'ask_query_log' },
      extra: { queryText: input.queryText.slice(0, 100) },
    });
  }
}
```

## Add to `packages/db/src/schema/aeo.ts`

(This file will be created with the rest of the AEO observatory schema — see
`patches/aeo-schema-drizzle.ts`. Adding the `askQueryLog` table definition there:)

```ts
import { pgTable, uuid, text, jsonb, boolean, integer, timestamp, vector, index } from 'drizzle-orm/pg-core';

export const askQueryLog = pgTable('ask_query_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  queryText: text('query_text').notNull(),
  userId: text('user_id'),  // FK omitted in TS layer; SQL has it
  filtersJson: jsonb('filters_json'),
  resultCount: integer('result_count'),
  usedEmbedding: boolean('used_embedding').notNull().default(false),
  totalLatencyMs: integer('total_latency_ms'),
  queryEmbedding: vector('query_embedding', { dimensions: 1536 }),
  source: text('source').notNull().default('web'),
  assignedCluster: text('assigned_cluster'),
  promotedToPromptId: uuid('promoted_to_prompt_id'),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  observedIdx: index('idx_ask_query_log_observed').on(t.observedAt),
  clusterIdx: index('idx_ask_query_log_cluster').on(t.assignedCluster),
}));
```

## Patch — `apps/web/app/ask/page.tsx`

The single change in `AskPage`. The query-handling block becomes:

```tsx
// At top of file, add the import:
import { recordAskQuery } from '@bts/db';

// ...inside the `if (query) { ... }` block, alongside the existing logic:

export default async function AskPage(props: Props) {
  const searchParams = await props.searchParams;
  const query = searchParams.q?.trim() ?? '';
  const omit = parseOmit(searchParams.omit);
  const key = process.env.OPENAI_API_KEY;

  const startTime = Date.now();  // ADD
  let filters: SearchFilters | null = null;
  let results: Awaited<ReturnType<typeof searchProductionsCombined>> = [];
  let errorMsg: string | null = null;
  let queryEmbedding: number[] | null = null;  // HOIST so we can log it

  if (query) {
    if (!key) {
      errorMsg = 'OPENAI_API_KEY not set on the server.';
    } else {
      try {
        filters = await extractFilters(query);
        if (omit.has('director'))       filters = { ...filters, director: null };
        if (omit.has('dp'))             filters = { ...filters, dp: null };
        if (omit.has('year'))           filters = { ...filters, year_min: null, year_max: null };
        if (omit.has('aspect_ratio'))   filters = { ...filters, aspect_ratio: null };
        if (omit.has('format_keyword')) filters = { ...filters, format_keyword: null };
        if (omit.has('themes'))         filters = { ...filters, themes: '' };
        if (filters.themes.trim()) {
          queryEmbedding = await embedThemes(filters.themes, key);  // re-use existing
        }
        results = await searchProductionsCombined(db, filters, queryEmbedding, filters.limit);
      } catch (e) {
        errorMsg =
          e instanceof MissingApiKeyError
            ? 'OpenAI key not set.'
            : e instanceof Error
              ? e.message
              : String(e);
      }
    }

    // ADD: fire-and-forget log. Never await — must not block the response.
    // The embedding is reused if already computed for themes; otherwise null
    // (the prompt-curator will compute one during nightly ingestion).
    void recordAskQuery(db, {
      queryText: query,
      filtersJson: filters ?? undefined,
      resultCount: results.length,
      usedEmbedding: queryEmbedding !== null,
      totalLatencyMs: Date.now() - startTime,
      queryEmbedding,
      source: 'web',
    });
  }

  return ( /* ... rest of JSX unchanged ... */ );
}
```

## Why this design

**Fire-and-forget (`void` not `await`).** The /ask response must never block on the log write. If Postgres is slow, the user still sees results.

**No PII.** Anonymous users get no identifier in the log. Authenticated users get their `user_id` only if the route ever gains an auth boundary (it doesn't today).

**Reuse the embedding when free.** `extractFilters` already calls OpenAI for theme extraction; if `filters.themes` was non-empty, an embedding was already fetched and cached locally. We persist it so the prompt-curator doesn't re-fetch.

**Cap query length.** Matches the existing `maxLength={500}` on the input field. Defensive in case future API callers ignore the cap.

**Sentry-first error handling.** Don't print to console; the existing Sentry integration is the right channel.

## Verification

After deploy:

```sql
-- Should grow as users hit /ask
select count(*) from ask_query_log where observed_at > now() - interval '1 day';

-- Top patterns surface immediately
select substring(query_text, 1, 80) as q, count(*) as n
from ask_query_log
where observed_at > now() - interval '7 days'
group by 1 order by 2 desc limit 20;
```

The prompt-curator's nightly job picks up from here.
