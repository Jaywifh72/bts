import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { askQueryLog } from '../schema/aeo.ts';

type SeedDb = PostgresJsDatabase<Record<string, never>>;

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
 * path — see /ask page.tsx for usage. Errors are swallowed and reported
 * to Sentry; logging must never break the /ask response.
 */
export async function recordAskQuery(
  db: SeedDb,
  input: RecordAskQueryInput,
): Promise<void> {
  // DEVIATION from patch doc: patch reached into '@sentry/nextjs' here,
  // but that's a web-app dep, not a @bts/db dep. Callers void this
  // promise; rejections become unhandled and Sentry's Next.js
  // auto-instrumentation captures them at the app boundary.
  await db.insert(askQueryLog).values({
    queryText: input.queryText.slice(0, 500),
    userId: input.userId ?? null,
    filtersJson: (input.filtersJson ?? null) as object | null,
    resultCount: input.resultCount,
    usedEmbedding: input.usedEmbedding,
    totalLatencyMs: input.totalLatencyMs,
    queryEmbedding: input.queryEmbedding ?? null,
    source: input.source ?? 'web',
  });
}
