// Reverses scripts/seed-aeo-sample-claims.ts.
//
// Deletes only the rows tagged with the aeo-seed-* slug prefix, so the
// real editorial corpus (if any) is untouched.
//
// Usage:
//   pnpm --filter @bts/db exec tsx scripts/purge-aeo-sample-claims.ts

import 'dotenv/config';
import { db, sql } from '../src/index.ts';

const counts: Record<string, number> = {};

const claimSources = await db.execute<{ n: number }>(sql`
  WITH d AS (
    DELETE FROM claim_sources
    WHERE claim_id IN (SELECT id FROM claims WHERE slug LIKE 'aeo-seed-%')
    RETURNING 1
  )
  SELECT COUNT(*)::int AS n FROM d
`);
counts.claim_sources = claimSources[0]?.n ?? 0;

const claimEntities = await db.execute<{ n: number }>(sql`
  WITH d AS (
    DELETE FROM claim_entities
    WHERE claim_id IN (SELECT id FROM claims WHERE slug LIKE 'aeo-seed-%')
    RETURNING 1
  )
  SELECT COUNT(*)::int AS n FROM d
`);
counts.claim_entities = claimEntities[0]?.n ?? 0;

const claims = await db.execute<{ n: number }>(sql`
  WITH d AS (
    DELETE FROM claims WHERE slug LIKE 'aeo-seed-%' RETURNING 1
  )
  SELECT COUNT(*)::int AS n FROM d
`);
counts.claims = claims[0]?.n ?? 0;

const sources = await db.execute<{ n: number }>(sql`
  WITH d AS (
    DELETE FROM sources WHERE slug LIKE 'aeo-seed-source-%' RETURNING 1
  )
  SELECT COUNT(*)::int AS n FROM d
`);
counts.sources = sources[0]?.n ?? 0;

console.log('[+] aeo sample claims purge complete', counts);
process.exit(0);
