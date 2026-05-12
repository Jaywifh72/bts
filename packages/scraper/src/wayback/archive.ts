import 'dotenv/config';
import { db, sql } from '@bts/db';

/**
 * E-46 — push every source URL we cite into the Wayback Machine and
 * record the resulting snapshot URL on `sources.archive_url`. Defends
 * against link rot before it bites.
 *
 * Wayback's `/save/<url>` endpoint accepts both GET and POST. On
 * success it issues a 302 to the new snapshot at `/web/<ts>/<url>`,
 * which we capture from the `Location` header (manual redirect mode).
 * On rate-limit we get 429 + a `Retry-After`. On a transient 5xx we
 * back off and retry.
 *
 * Throttle: 6 seconds spacing (~10 req/min). Wayback's docs cite ~15
 * req/min as the soft cap; 10 is conservative and survives spike load.
 */

const SAVE_BASE = 'https://web.archive.org/save/';
const USER_AGENT = 'StudioProBot/1.0 (cinema-tech reference; archival job)';
const MIN_SPACING_MS = 6000;
const MAX_RETRIES = 3;

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

const RETRY_STATUSES = new Set([429, 500, 502, 503, 504]);

/**
 * Submits a URL to Wayback and returns the snapshot URL or null when
 * Wayback couldn't save it (e.g. robots-blocked, malformed URL,
 * permanent error).
 */
async function saveToWayback(url: string): Promise<string | null> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    await throttle();
    let res: Response;
    try {
      res = await fetch(SAVE_BASE + encodeURI(url), {
        method: 'GET',
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'text/html, */*',
        },
        redirect: 'manual',
      });
    } catch (e) {
      if (attempt === MAX_RETRIES) throw e;
      await new Promise((r) => setTimeout(r, 2 ** attempt * 2000));
      continue;
    }

    // Happy path: 302 with the snapshot URL in Location.
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (loc) {
        return loc.startsWith('http') ? loc : `https://web.archive.org${loc}`;
      }
    }

    // Some saves return 200 with Content-Location header pointing at /web/<ts>/<url>.
    if (res.status === 200) {
      const cl = res.headers.get('content-location');
      if (cl) {
        return cl.startsWith('http') ? cl : `https://web.archive.org${cl}`;
      }
      // Fallback: scan body for the canonical archived URL pattern.
      const body = await res.text().catch(() => '');
      const m = /https:\/\/web\.archive\.org\/web\/\d+\/[^"'\s]+/.exec(body);
      if (m) return m[0];
      return null;
    }

    if (RETRY_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
      const retryAfter = res.headers.get('retry-after');
      const backoff = retryAfter ? Number(retryAfter) * 1000 : 2 ** attempt * 5000;
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }

    // Permanent failures (4xx other than 429): give up on this URL,
    // don't fail the batch.
    return null;
  }
  return null;
}

export type ArchiveStats = {
  attempted: number;
  archived: number;
  failed: number;
};

export async function archivePendingSources(
  opts: { limit?: number } = {},
): Promise<ArchiveStats> {
  const stats: ArchiveStats = { attempted: 0, archived: 0, failed: 0 };
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  const targets = await db.execute<{ id: number; url: string; title: string }>(sql`
    SELECT id, url, title FROM sources
    WHERE url IS NOT NULL AND archive_url IS NULL
    ORDER BY id
    ${limitClause}
  `);

  console.log(`wayback:archive — ${targets.length} pending source URLs`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const archiveUrl = await saveToWayback(row.url);
      if (!archiveUrl) {
        stats.failed++;
        console.warn(`  [skip] ${row.title.slice(0, 60)}`);
        continue;
      }
      await db.execute(sql`
        UPDATE sources SET archive_url = ${archiveUrl}, updated_at = NOW()
        WHERE id = ${row.id}
      `);
      stats.archived++;
    } catch (e) {
      stats.failed++;
      console.error(
        `  [error] ${row.title.slice(0, 60)}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.log(
    `wayback:archive done — attempted=${stats.attempted} archived=${stats.archived} failed=${stats.failed}`,
  );
  return stats;
}
