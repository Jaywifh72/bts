// Retention sweep for ask_query_log — purge rows older than 180 days.
//
// Referenced by the comment on the table in migration 0092 and by the
// /ask logging contract. Designed to run nightly (Hermes cron or a
// GitHub Actions schedule). Safe to invoke ad-hoc:
//
//   pnpm --filter @bts/db exec tsx scripts/retention/ask_query_log.ts
//
// Optional env overrides:
//   ASK_LOG_RETENTION_DAYS  — number of days to retain (default 180)
//   DRY_RUN                 — '1' to count without deleting

import 'dotenv/config';
import { db, sql } from '../../src/index.ts';

const DAYS = Number(process.env.ASK_LOG_RETENTION_DAYS ?? 180);
const DRY_RUN = process.env.DRY_RUN === '1';

if (!Number.isFinite(DAYS) || DAYS <= 0 || DAYS > 365 * 5) {
  throw new Error(`ASK_LOG_RETENTION_DAYS out of range: ${DAYS}`);
}

const cutoff = await db.execute<{ cutoff: string }>(sql`
  SELECT (NOW() - (${DAYS} || ' days')::interval)::text AS cutoff
`);
console.log(`[i] retention=${DAYS}d cutoff=${cutoff[0]!.cutoff}`);

const toDelete = await db.execute<{ n: number }>(sql`
  SELECT COUNT(*)::int AS n
  FROM ask_query_log
  WHERE observed_at < NOW() - (${DAYS} || ' days')::interval
`);
const n = toDelete[0]!.n;
console.log(`[i] rows older than ${DAYS}d: ${n}`);

if (n === 0) {
  console.log('[+] nothing to purge');
  process.exit(0);
}

if (DRY_RUN) {
  console.log('[dry-run] not deleting');
  process.exit(0);
}

const deleted = await db.execute<{ id: string }>(sql`
  DELETE FROM ask_query_log
  WHERE observed_at < NOW() - (${DAYS} || ' days')::interval
  RETURNING id
`);
console.log(`[+] purged ${deleted.length} rows`);
process.exit(0);
