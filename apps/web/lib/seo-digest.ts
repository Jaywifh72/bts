// Weekly SEO/AEO digest — data gathering.
//
// Pulls last-7-day data from GSC + the aeo_* tables, builds week-over-week
// deltas, and returns a structured Digest. Pure data only — rendering is in
// seo-digest-markdown.ts.

import { db, sql } from '@bts/db';
import { fetchGscReport, isGscConfigured } from './gsc';

export type DigestNumber = {
  current: number;
  previous: number;
  delta: number;
  deltaPct: number | null;
};

export type DigestTopRow = {
  key: string;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

export type DigestEngineOutcome = {
  code: string;
  ok: number;
  fail: number;
};

export type DigestDomainHit = { domain: string; hits: number; isCinecanon: boolean };

export type DigestOpenAlert = {
  number: number;
  title: string;
  url: string;
  age_hours: number;
};

export type Digest = {
  generatedAt: string;
  windowLabel: string;
  /** YYYY-MM-DD inclusive */
  thisWeekStart: string;
  thisWeekEnd: string;
  lastWeekStart: string;
  lastWeekEnd: string;

  gsc:
    | { ok: false; reason: string }
    | {
        ok: true;
        site: string;
        clicks: DigestNumber;
        impressions: DigestNumber;
        ctr: DigestNumber;
        position: DigestNumber;
        topQueries: DigestTopRow[];
        topPages: DigestTopRow[];
      };

  aeo: {
    cyclesThisWeek: number;
    cyclesOk: number;
    cyclesPartial: number;
    cyclesFailed: number;
    observationsThisWeek: number;
    observationsLastWeek: number;
    totalCitationsThisWeek: number;
    totalCitationsLastWeek: number;
    cinecanonCitationsThisWeek: number;
    cinecanonCitationsLastWeek: number;
    topDomains: DigestDomainHit[];
    perEngine: DigestEngineOutcome[];
    estCostUsd: number;
  };

  alerts: DigestOpenAlert[];
};

// ----------------------------------------------------------------------

const MS_PER_DAY = 24 * 3600 * 1000;

export async function buildDigest(): Promise<Digest> {
  const now = new Date();
  // Anchor "this week" to end YESTERDAY so the most recent cycle is captured.
  const thisWeekEnd = isoDate(addDays(now, -1));
  const thisWeekStart = isoDate(addDays(now, -7));
  const lastWeekEnd = isoDate(addDays(now, -8));
  const lastWeekStart = isoDate(addDays(now, -14));

  const [gsc, aeo, alerts] = await Promise.all([
    gatherGsc(thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd),
    gatherAeo(thisWeekStart, thisWeekEnd, lastWeekStart, lastWeekEnd),
    gatherAlerts(),
  ]);

  const windowLabel = `${thisWeekStart} → ${thisWeekEnd}`;

  return {
    generatedAt: now.toISOString(),
    windowLabel,
    thisWeekStart, thisWeekEnd,
    lastWeekStart, lastWeekEnd,
    gsc,
    aeo,
    alerts,
  };
}

// ---- GSC -------------------------------------------------------------

async function gatherGsc(
  thisStart: string, thisEnd: string,
  lastStart: string, lastEnd: string,
): Promise<Digest['gsc']> {
  if (!isGscConfigured()) {
    return { ok: false, reason: 'GSC env vars not set' };
  }
  // fetchGscReport uses a fixed lookback. For digest we need explicit windows,
  // so we call it twice with different `days`. Anchoring: the report uses
  // today - 3d as the end (Google's data lag), so the windows here are
  // approximate but consistent week-over-week.
  const [thisReport, lastReport] = await Promise.all([
    fetchGscReport({ days: 7 }),
    fetchGscReport({ days: 14 }), // covers last 14d; we'll subtract this-week numbers
  ]);

  if (!thisReport.ok) return { ok: false, reason: thisReport.error };
  if (!lastReport.ok) return { ok: false, reason: lastReport.error };

  const t = thisReport.report.totals;
  const lAll = lastReport.report.totals;

  // last-week totals = (last 14d totals) − (last 7d totals)
  const lastClicks = Math.max(0, lAll.clicks - t.clicks);
  const lastImpr = Math.max(0, lAll.impressions - t.impressions);
  const lastCtr = lastImpr > 0 ? lastClicks / lastImpr : 0;
  // average position is rolled over the whole window; we don't have a clean
  // 7d-vs-7d split without a custom query. Approximate by reusing 14d avg.
  const lastPos = lAll.position;

  return {
    ok: true,
    site: thisReport.report.site,
    clicks: numberDelta(t.clicks, lastClicks),
    impressions: numberDelta(t.impressions, lastImpr),
    ctr: numberDelta(t.ctr * 100, lastCtr * 100),
    // For position lower is better — we still report raw values, the renderer
    // flips the +/- semantics.
    position: numberDelta(t.position, lastPos),
    topQueries: thisReport.report.topQueries.slice(0, 10).map((r) => ({
      key: r.keys[0] ?? '—',
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    })),
    topPages: thisReport.report.topPages.slice(0, 10).map((r) => ({
      key: r.keys[0] ?? '—',
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: r.ctr,
      position: r.position,
    })),
  };
}

// ---- AEO -------------------------------------------------------------

async function gatherAeo(
  thisStart: string, thisEnd: string,
  lastStart: string, lastEnd: string,
): Promise<Digest['aeo']> {
  const cycleStats = await db.execute<{
    ok: number; partial: number; failed: number; total: number;
    cost_cents: number | null;
  }>(sql`
    SELECT
      COUNT(*) FILTER (WHERE status = 'succeeded')::int AS ok,
      COUNT(*) FILTER (WHERE status = 'partial')::int   AS partial,
      COUNT(*) FILTER (WHERE status = 'failed')::int    AS failed,
      COUNT(*)::int                                     AS total,
      SUM(total_cost_cents)::int                        AS cost_cents
    FROM aeo_cycles
    WHERE ran_on >= ${thisStart}::date AND ran_on <= ${thisEnd}::date
  `);
  const cs = cycleStats[0] ?? { ok: 0, partial: 0, failed: 0, total: 0, cost_cents: 0 };

  const obsThis = await scalarInt(sql`
    SELECT COUNT(*)::int FROM aeo_response_observations
    WHERE observed_at::date BETWEEN ${thisStart}::date AND ${thisEnd}::date
  `);
  const obsLast = await scalarInt(sql`
    SELECT COUNT(*)::int FROM aeo_response_observations
    WHERE observed_at::date BETWEEN ${lastStart}::date AND ${lastEnd}::date
  `);

  const citAggThis = await db.execute<{ total: number; cinecanon: number }>(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_cinecanon = true)::int AS cinecanon
    FROM aeo_citation_scores s
    JOIN aeo_response_observations o ON o.id = s.observation_id
    WHERE o.observed_at::date BETWEEN ${thisStart}::date AND ${thisEnd}::date
  `);
  const citThis = citAggThis[0] ?? { total: 0, cinecanon: 0 };

  const citAggLast = await db.execute<{ total: number; cinecanon: number }>(sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE is_cinecanon = true)::int AS cinecanon
    FROM aeo_citation_scores s
    JOIN aeo_response_observations o ON o.id = s.observation_id
    WHERE o.observed_at::date BETWEEN ${lastStart}::date AND ${lastEnd}::date
  `);
  const citLast = citAggLast[0] ?? { total: 0, cinecanon: 0 };

  const topDomains = await db.execute<{ cited_domain: string; hits: number; is_cinecanon: boolean }>(sql`
    SELECT s.cited_domain, COUNT(*)::int AS hits, BOOL_OR(s.is_cinecanon) AS is_cinecanon
    FROM aeo_citation_scores s
    JOIN aeo_response_observations o ON o.id = s.observation_id
    WHERE o.observed_at::date BETWEEN ${thisStart}::date AND ${thisEnd}::date
    GROUP BY s.cited_domain
    ORDER BY hits DESC
    LIMIT 15
  `);

  // Per-engine outcome from observation count (success = observation written;
  // failure = error_code is non-null)
  const perEngine = await db.execute<{ code: string; ok: number; fail: number }>(sql`
    SELECT
      e.code,
      COUNT(*) FILTER (WHERE o.error_code IS NULL)::int AS ok,
      COUNT(*) FILTER (WHERE o.error_code IS NOT NULL)::int AS fail
    FROM aeo_response_observations o
    JOIN aeo_engines e ON e.id = o.engine_id
    WHERE o.observed_at::date BETWEEN ${thisStart}::date AND ${thisEnd}::date
    GROUP BY e.code
    ORDER BY ok DESC
  `);

  return {
    cyclesThisWeek: cs.total,
    cyclesOk: cs.ok,
    cyclesPartial: cs.partial,
    cyclesFailed: cs.failed,
    observationsThisWeek: obsThis,
    observationsLastWeek: obsLast,
    totalCitationsThisWeek: citThis.total,
    totalCitationsLastWeek: citLast.total,
    cinecanonCitationsThisWeek: citThis.cinecanon,
    cinecanonCitationsLastWeek: citLast.cinecanon,
    topDomains: topDomains.map((d) => ({
      domain: d.cited_domain,
      hits: d.hits,
      isCinecanon: d.is_cinecanon,
    })),
    perEngine: perEngine.map((e) => ({ code: e.code, ok: e.ok, fail: e.fail })),
    estCostUsd: (cs.cost_cents ?? 0) / 100,
  };
}

// ---- GitHub alerts ---------------------------------------------------

async function gatherAlerts(): Promise<DigestOpenAlert[]> {
  // No GH API call from the server-side digest (Vercel doesn't carry a GH
  // token by default and we don't want to add one for this). The cron workflow
  // can append open-issue info itself before posting. Return empty here.
  return [];
}

// ---- Helpers --------------------------------------------------------

function numberDelta(curr: number, prev: number): DigestNumber {
  const delta = curr - prev;
  const deltaPct = prev !== 0 ? (delta / prev) * 100 : (curr === 0 ? 0 : null);
  return { current: curr, previous: prev, delta, deltaPct };
}

async function scalarInt(query: ReturnType<typeof sql>): Promise<number> {
  const rows = await db.execute<{ count: number }>(query);
  return rows[0]?.count ?? 0;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * MS_PER_DAY);
}
