import 'dotenv/config';
import { db, sql } from '@bts/db';

/**
 * E-47 — weekly link-rot monitor. Walks `sources` ordered by
 * `last_checked_at NULLS FIRST` so brand-new rows always get checked
 * before older ones get re-checked. Records the HTTP status (or 0 for
 * network failure) and timestamp on every probe.
 *
 * HEAD over GET to keep bandwidth down — the goal is health, not
 * content. A few sites reject HEAD with 405; we fall back to GET in
 * that case before giving up.
 *
 * Throttle: 1.5s spacing — enough to be polite but fast enough to
 * cover ~2k sources in an hour. No per-host concurrency cap; sources
 * are spread across many hosts so a single host won't be hammered.
 */

const MIN_SPACING_MS = 1500;
const TIMEOUT_MS = 15000;
const USER_AGENT = 'CineCanonBot/1.0 (link-health-check)';

let _lastStartedAt = 0;
let _inflight: Promise<unknown> = Promise.resolve();

async function throttle(): Promise<void> {
  const wait = _inflight.then(async () => {
    const elapsed = Date.now() - _lastStartedAt;
    if (elapsed < MIN_SPACING_MS) {
      await new Promise((r) => setTimeout(r, MIN_SPACING_MS - elapsed));
    }
    _lastStartedAt = Date.now();
  });
  _inflight = wait;
  await wait;
}

async function probe(url: string): Promise<number> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    let res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
      redirect: 'follow',
      signal: ctrl.signal,
    });
    // 405 Method Not Allowed → retry with GET.
    if (res.status === 405) {
      res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': USER_AGENT, Accept: '*/*' },
        redirect: 'follow',
        signal: ctrl.signal,
      });
    }
    return res.status;
  } catch {
    return 0; // Network error / abort.
  } finally {
    clearTimeout(timer);
  }
}

export type HealthStats = {
  attempted: number;
  alive: number;
  rotted: number;
  errors: number;
};

export async function checkSourceHealth(
  opts: { limit?: number; staleAfterDays?: number } = {},
): Promise<HealthStats> {
  const stats: HealthStats = { attempted: 0, alive: 0, rotted: 0, errors: 0 };
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;
  const staleAfter = opts.staleAfterDays ?? 7;

  // Defence in depth: even though staleAfter is typed `number | undefined`
  // and is only set by trusted internal callers, the SQL fragment uses
  // sql.raw() (necessary because INTERVAL literal syntax doesn't accept a
  // bind parameter for the unit). Validate that the value is a positive
  // finite integer so a malformed caller can't ever inject SQL.
  if (!Number.isFinite(staleAfter) || staleAfter < 0 || !Number.isInteger(staleAfter)) {
    throw new Error(`checkSourceHealth: staleAfterDays must be a non-negative integer, got ${staleAfter}`);
  }

  // Pick: never-checked rows first, then anything older than the
  // staleness threshold. Recently-checked rows skip until they age out.
  // INTERVAL '1 day' * <int> binds the integer as a parameter rather than
  // splicing it into the literal — strictly safer than the previous
  // sql.raw(String(staleAfter)) pattern.
  const targets = await db.execute<{ id: number; url: string }>(sql`
    SELECT id, url FROM sources
    WHERE url IS NOT NULL
      AND (last_checked_at IS NULL OR last_checked_at < NOW() - INTERVAL '1 day' * ${staleAfter})
    ORDER BY last_checked_at NULLS FIRST, id
    ${limitClause}
  `);

  console.log(`source-health — ${targets.length} sources to probe (stale > ${staleAfter}d)`);

  for (const row of targets) {
    stats.attempted++;
    await throttle();
    const status = await probe(row.url);
    await db.execute(sql`
      UPDATE sources
      SET last_checked_at = NOW(), last_status = ${status}, updated_at = NOW()
      WHERE id = ${row.id}
    `);
    if (status >= 200 && status < 400) stats.alive++;
    else if (status === 0) stats.errors++;
    else stats.rotted++;
  }

  console.log(
    `source-health done — attempted=${stats.attempted} alive=${stats.alive} rotted=${stats.rotted} errors=${stats.errors}`,
  );
  return stats;
}
