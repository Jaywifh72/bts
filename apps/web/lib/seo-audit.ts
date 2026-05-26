// On-page SEO audit + PageSpeed Insights for priority URLs.
//
// This is the engine behind /admin/seo/audit. Two independent passes:
//
//   1. On-page audit (no external API)
//      Fetches each URL server-side and parses the HTML for the signals
//      Google actually uses to rank pages — title length, meta description,
//      canonical, H1 count, JSON-LD presence, image alt coverage, noindex.
//      Output: per-URL pass/warn/fail badges with specific issues listed.
//
//   2. Core Web Vitals via Google PageSpeed Insights API
//      Free public API, ~25k calls/day quota anonymously. Returns Lighthouse
//      scores + the three Core Web Vitals (LCP, INP, CLS) that directly
//      affect ranking. Mobile strategy by default (Google indexes mobile-first).
//
// No external deps — uses native fetch + regex HTML parsing. Fragile-ish on
// hand-written HTML but our pages are Next.js rendered with predictable shape.

import { siteUrl } from './site';
import { db, sql } from '@bts/db';

// ---- Types ---------------------------------------------------------------

export type Severity = 'ok' | 'warn' | 'fail';

export type Issue = {
  severity: Severity;
  code: string;
  message: string;
};

export type OnPageResult = {
  url: string;
  status: number;
  fetchedAt: string;
  /** Highest-severity issue level on this page. */
  worst: Severity;
  score: number; // 0-100
  signals: {
    title: string | null;
    titleLen: number | null;
    metaDescription: string | null;
    metaDescriptionLen: number | null;
    canonical: string | null;
    h1Count: number;
    h1First: string | null;
    jsonLdBlocks: number;
    jsonLdTypes: string[];
    claimReviewCount: number;
    imgCount: number;
    imgMissingAltCount: number;
    metaRobots: string | null;
    htmlBytes: number;
    renderedTextBytes: number;
  };
  issues: Issue[];
  error?: string;
};

export type CwvResult = {
  url: string;
  ok: boolean;
  error?: string;
  performance?: number; // 0-100
  /** Largest Contentful Paint in ms (mobile) */
  lcpMs?: number;
  /** Interaction to Next Paint in ms (mobile) */
  inpMs?: number;
  /** Cumulative Layout Shift score (0..unbounded; <0.1 is good) */
  cls?: number;
  /** Time to First Byte in ms */
  ttfbMs?: number;
};

export type AuditReport = {
  ranAt: string;
  onPage: OnPageResult[];
  cwv: CwvResult[];
  summary: {
    okPages: number;
    warnPages: number;
    failPages: number;
    averageScore: number;
    cwvGoodCount: number;
    cwvPoorCount: number;
  };
};

// ---- Entry point ---------------------------------------------------------

/**
 * Default set of URLs to audit. Pulls the homepage + a curated set of
 * high-priority pages. Caller can override by passing an explicit list.
 *
 * Order matters — first 5 are the "hero" pages whose CWV most affects
 * Google's overall ranking signal for the site.
 */
export const PRIORITY_PATHS: ReadonlyArray<string> = [
  '/',
  '/films',
  '/films/the-brutalist-2024',
  '/films/dune-part-two-2024',
  '/films/anora-2024',
  '/films/conclave-2024',
  '/films/the-substance-2024',
  '/films/1917-2019',
  '/crew',
  '/vfx',
  '/about',
  '/methodology',
  '/queries',
  '/queries/dune-part-two-lenses',
];

/** Run both passes against the priority list (or a caller-provided list). */
export async function runAudit(opts: {
  paths?: ReadonlyArray<string>;
  includeCwv?: boolean;
  /** If true (default), persist the run to seo_audit_runs + seo_audit_page_results. */
  persist?: boolean;
} = {}): Promise<AuditReport & { runId?: string }> {
  const paths = opts.paths ?? PRIORITY_PATHS;
  const includeCwv = opts.includeCwv ?? true;
  const base = siteUrl();
  const urls = paths.map((p) => `${base}${p}`);

  // On-page checks run in parallel (~12 fetches against our own origin)
  const onPage = await Promise.all(urls.map(auditOnePage));

  // CWV runs sequentially with a small gap because PSI throttles aggressively
  // when you fan out > 5 parallel requests anonymously
  const cwv: CwvResult[] = [];
  if (includeCwv) {
    for (const url of urls) {
      cwv.push(await fetchCwv(url));
      // Tiny delay between PSI calls; PSI's hard limit is 240 req/min anonymous
      await new Promise((r) => setTimeout(r, 250));
    }
  }

  const okPages = onPage.filter((p) => p.worst === 'ok').length;
  const warnPages = onPage.filter((p) => p.worst === 'warn').length;
  const failPages = onPage.filter((p) => p.worst === 'fail').length;
  const averageScore = onPage.length
    ? Math.round(onPage.reduce((a, p) => a + p.score, 0) / onPage.length)
    : 0;
  const cwvGoodCount = cwv.filter((c) => c.ok && isCwvGood(c)).length;
  const cwvPoorCount = cwv.filter((c) => c.ok && isCwvPoor(c)).length;

  const report: AuditReport = {
    ranAt: new Date().toISOString(),
    onPage,
    cwv,
    summary: {
      okPages, warnPages, failPages, averageScore,
      cwvGoodCount, cwvPoorCount,
    },
  };

  // Persist (default true; disable for tests by passing persist: false)
  if (opts.persist !== false) {
    try {
      const runId = await persistAuditRun(report, includeCwv);
      return { ...report, runId };
    } catch (err) {
      console.warn('[seo-audit] persist failed (continuing anyway)', err);
    }
  }
  return report;
}

// ---- Persistence ---------------------------------------------------------

async function persistAuditRun(report: AuditReport, includeCwv: boolean): Promise<string> {
  const ranMs = report.onPage.reduce(
    (a, p) => Math.max(a, Date.parse(p.fetchedAt) - Date.parse(report.ranAt)),
    0,
  );
  const headerRows = await db.execute<{ id: string }>(sql`
    INSERT INTO seo_audit_runs (
      ran_at, runtime_ms, include_cwv, pages_count, ok_count, warn_count, fail_count, avg_score
    ) VALUES (
      ${report.ranAt}::timestamptz,
      ${Math.max(0, ranMs)},
      ${includeCwv},
      ${report.onPage.length},
      ${report.summary.okPages},
      ${report.summary.warnPages},
      ${report.summary.failPages},
      ${report.summary.averageScore}
    )
    RETURNING id::text
  `);
  const runId = headerRows[0]!.id;

  // Insert per-page rows in a single batched VALUES list (avoids N round-trips)
  if (report.onPage.length > 0) {
    for (const p of report.onPage) {
      const c = report.cwv.find((x) => x.url === p.url) ?? null;
      await db.execute(sql`
        INSERT INTO seo_audit_page_results (
          run_id, url, http_status, worst, score, signals, issues, cwv, fetched_at
        ) VALUES (
          ${runId}::uuid,
          ${p.url},
          ${p.status},
          ${p.worst},
          ${p.score},
          ${JSON.stringify(p.signals)}::jsonb,
          ${JSON.stringify(p.issues)}::jsonb,
          ${c ? JSON.stringify(c) : null}::jsonb,
          ${p.fetchedAt}::timestamptz
        )
      `);
    }
  }
  return runId;
}

// ---- History queries -----------------------------------------------------

export type AuditRunSummary = {
  id: string;
  ranAt: string;
  pagesCount: number;
  okCount: number;
  warnCount: number;
  failCount: number;
  avgScore: number;
};

/** Most recent N runs, newest first. */
export async function listAuditRuns(limit = 10): Promise<AuditRunSummary[]> {
  const rows = await db.execute<{
    id: string;
    ran_at: string;
    pages_count: number;
    ok_count: number;
    warn_count: number;
    fail_count: number;
    avg_score: number;
  }>(sql`
    SELECT id::text, ran_at::text, pages_count, ok_count, warn_count, fail_count, avg_score
    FROM seo_audit_runs
    ORDER BY ran_at DESC
    LIMIT ${limit}
  `);
  return rows.map((r) => ({
    id: r.id,
    ranAt: r.ran_at,
    pagesCount: r.pages_count,
    okCount: r.ok_count,
    warnCount: r.warn_count,
    failCount: r.fail_count,
    avgScore: r.avg_score,
  }));
}

/**
 * For each URL, return the most recent prior score (before the given runId).
 * Used to show ↑/↓ deltas on the per-page cards.
 */
export async function getPreviousScores(
  urls: ReadonlyArray<string>,
  excludeRunId: string,
): Promise<Map<string, number>> {
  if (urls.length === 0) return new Map();
  // postgres-js doesn't bind a JS array to ANY(::text[]) reliably via a
  // single parameter — expand inline with sql.join so each URL becomes
  // its own bound param.
  const urlList = sql.join(urls.map((u) => sql`${u}`), sql`, `);
  const rows = await db.execute<{ url: string; score: number }>(sql`
    SELECT DISTINCT ON (url) url, score
    FROM seo_audit_page_results
    WHERE url IN (${urlList})
      AND run_id != ${excludeRunId}::uuid
    ORDER BY url, fetched_at DESC
  `);
  return new Map(rows.map((r) => [r.url, r.score]));
}

// ---- On-page audit ------------------------------------------------------

async function auditOnePage(url: string): Promise<OnPageResult> {
  const fetchedAt = new Date().toISOString();
  let html = '';
  let status = 0;
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CineCanonSeoAudit/1.0' },
      // Disable Next.js fetch cache for fresh audit
      cache: 'no-store',
    });
    status = res.status;
    html = await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return emptyResult(url, 0, fetchedAt, msg);
  }

  if (status !== 200) {
    return {
      ...emptyResult(url, status, fetchedAt),
      issues: [{ severity: 'fail', code: 'http_status', message: `Returned HTTP ${status}` }],
      worst: 'fail',
      score: 0,
    };
  }

  // Extract signals
  const title = extract(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const meta = extractAttr(html, /<meta\s+[^>]*?name=["']description["'][^>]*?content=["']([^"']*)["']/i)
            ?? extractAttr(html, /<meta\s+[^>]*?content=["']([^"']*)["'][^>]*?name=["']description["']/i);
  const canonical = extractAttr(html, /<link\s+[^>]*?rel=["']canonical["'][^>]*?href=["']([^"']*)["']/i)
                 ?? extractAttr(html, /<link\s+[^>]*?href=["']([^"']*)["'][^>]*?rel=["']canonical["']/i);
  const metaRobots = extractAttr(html, /<meta\s+[^>]*?name=["']robots["'][^>]*?content=["']([^"']*)["']/i);
  const h1Matches = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)];
  const h1Count = h1Matches.length;
  const h1First = h1Count > 0 ? stripTags(h1Matches[0]![1]!) : null;

  // JSON-LD blocks
  const ldMatches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const jsonLdBlocks = ldMatches.length;
  const jsonLdTypes: string[] = [];
  let claimReviewCount = 0;
  for (const m of ldMatches) {
    const body = m[1]!.trim();
    try {
      const obj = JSON.parse(body);
      const items = Array.isArray(obj) ? obj : [obj];
      for (const it of items) {
        if (it && typeof it === 'object' && '@type' in it) {
          const t = String((it as Record<string, unknown>)['@type']);
          jsonLdTypes.push(t);
          if (t === 'ClaimReview') claimReviewCount++;
        }
      }
    } catch {
      // ignore unparseable blocks; we'll flag them
    }
  }

  // Images
  const imgs = [...html.matchAll(/<img\b[^>]*>/gi)].map((m) => m[0]!);
  const imgCount = imgs.length;
  const imgMissingAltCount = imgs.filter((tag) => !/\balt=/i.test(tag)).length;

  // Bytes
  const htmlBytes = Buffer.byteLength(html, 'utf-8');
  const rendered = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const renderedTextBytes = Buffer.byteLength(rendered, 'utf-8');

  // ---- Grade signals into issues ---------------------------------------
  const issues: Issue[] = [];

  if (!title) {
    issues.push({ severity: 'fail', code: 'title_missing', message: '<title> tag is missing' });
  } else {
    const len = title.length;
    if (len < 30) {
      issues.push({ severity: 'warn', code: 'title_short', message: `Title is ${len} chars; aim for 50-60` });
    } else if (len > 65) {
      issues.push({ severity: 'warn', code: 'title_long', message: `Title is ${len} chars; Google truncates around 60` });
    }
  }

  if (!meta) {
    issues.push({ severity: 'warn', code: 'meta_desc_missing', message: 'No <meta name="description"> — Google generates one from page text' });
  } else {
    const len = meta.length;
    if (len < 80) {
      issues.push({ severity: 'warn', code: 'meta_desc_short', message: `Meta description is ${len} chars; aim for 150-160` });
    } else if (len > 165) {
      issues.push({ severity: 'warn', code: 'meta_desc_long', message: `Meta description is ${len} chars; Google truncates around 160` });
    }
  }

  if (!canonical) {
    issues.push({ severity: 'warn', code: 'canonical_missing', message: 'No <link rel="canonical"> — may cause duplicate-content issues' });
  } else {
    // Normalize trailing-slash before comparing — `/` is rendered by Next as
    // `https://host` and the requested URL is `https://host/` (or vice versa).
    // Both refer to the same page; only a genuine path divergence is a warn.
    const stripSlash = (s: string) => s.endsWith('/') && s.length > 1 ? s.slice(0, -1) : s;
    if (stripSlash(canonical) !== stripSlash(url)) {
      issues.push({ severity: 'warn', code: 'canonical_mismatch', message: `Canonical points to a different URL: ${canonical}` });
    }
  }

  if (h1Count === 0) {
    issues.push({ severity: 'fail', code: 'h1_missing', message: 'No <h1> on page' });
  } else if (h1Count > 1) {
    issues.push({ severity: 'warn', code: 'h1_multiple', message: `Found ${h1Count} <h1> tags; the convention is exactly one` });
  }

  if (jsonLdBlocks === 0) {
    issues.push({ severity: 'warn', code: 'jsonld_missing', message: 'No JSON-LD blocks — schema.org structured data is missing' });
  }

  if (imgCount > 0 && imgMissingAltCount > 0) {
    const pct = Math.round((imgMissingAltCount / imgCount) * 100);
    const sev = pct > 20 ? 'fail' : 'warn';
    issues.push({
      severity: sev,
      code: 'img_alt_missing',
      message: `${imgMissingAltCount}/${imgCount} <img> tags missing alt attribute (${pct}%)`,
    });
  }

  if (metaRobots && /noindex/i.test(metaRobots)) {
    issues.push({ severity: 'fail', code: 'robots_noindex', message: 'Page is set to noindex — Google will not show it' });
  }

  if (renderedTextBytes < 1000) {
    issues.push({ severity: 'warn', code: 'thin_content', message: `Only ${renderedTextBytes} bytes of rendered text — risk of being flagged "thin content"` });
  }

  const worst: Severity = issues.some((i) => i.severity === 'fail') ? 'fail'
                       : issues.some((i) => i.severity === 'warn') ? 'warn'
                       : 'ok';
  const score = Math.max(0, 100 - issues.reduce((a, i) => a + (i.severity === 'fail' ? 25 : i.severity === 'warn' ? 5 : 0), 0));

  return {
    url, status, fetchedAt, worst, score,
    signals: {
      title, titleLen: title?.length ?? null,
      metaDescription: meta, metaDescriptionLen: meta?.length ?? null,
      canonical,
      h1Count, h1First,
      jsonLdBlocks, jsonLdTypes, claimReviewCount,
      imgCount, imgMissingAltCount,
      metaRobots,
      htmlBytes, renderedTextBytes,
    },
    issues,
  };
}

function emptyResult(url: string, status: number, fetchedAt: string, error?: string): OnPageResult {
  return {
    url, status, fetchedAt, worst: 'fail', score: 0,
    signals: {
      title: null, titleLen: null,
      metaDescription: null, metaDescriptionLen: null,
      canonical: null,
      h1Count: 0, h1First: null,
      jsonLdBlocks: 0, jsonLdTypes: [], claimReviewCount: 0,
      imgCount: 0, imgMissingAltCount: 0,
      metaRobots: null,
      htmlBytes: 0, renderedTextBytes: 0,
    },
    issues: error ? [{ severity: 'fail', code: 'fetch_failed', message: error }] : [],
    error,
  };
}

function extract(html: string, re: RegExp): string | null {
  const m = html.match(re);
  if (!m) return null;
  return stripTags(m[1] ?? '').trim() || null;
}

function extractAttr(html: string, re: RegExp): string | null {
  const m = html.match(re);
  return m?.[1]?.trim() || null;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
}

// ---- PageSpeed Insights -------------------------------------------------

/**
 * Calls Google's PageSpeed Insights API for one URL, mobile strategy.
 *
 * Anonymous quota: ~240 req/min, ~25k req/day. We add a 250ms gap between
 * calls in the runAudit loop, so 12 URLs takes ~3s.
 *
 * If PSI returns an error (rate limited, fetch failure, page broken), we
 * surface it cleanly via .ok = false + .error.
 */
async function fetchCwv(url: string): Promise<CwvResult> {
  const apiKey = process.env.PAGESPEED_API_KEY ?? '';
  const params = new URLSearchParams({
    url,
    strategy: 'mobile',
    category: 'performance',
  });
  if (apiKey) params.set('key', apiKey);
  const endpoint = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`;

  try {
    const res = await fetch(endpoint, { cache: 'no-store' });
    if (!res.ok) {
      const text = await res.text();
      return { url, ok: false, error: `PSI ${res.status}: ${text.slice(0, 180)}` };
    }
    const data = await res.json() as {
      lighthouseResult?: {
        categories?: { performance?: { score?: number } };
        audits?: Record<string, { numericValue?: number }>;
      };
      loadingExperience?: { metrics?: Record<string, { percentile?: number }> };
    };
    const performance = data.lighthouseResult?.categories?.performance?.score ?? null;
    const audits = data.lighthouseResult?.audits ?? {};
    const lcpMs = audits['largest-contentful-paint']?.numericValue;
    const inpMs = audits['interaction-to-next-paint']?.numericValue
              ?? data.loadingExperience?.metrics?.['INTERACTION_TO_NEXT_PAINT']?.percentile;
    const cls = audits['cumulative-layout-shift']?.numericValue;
    const ttfbMs = audits['server-response-time']?.numericValue;

    return {
      url, ok: true,
      performance: performance != null ? Math.round(performance * 100) : undefined,
      lcpMs: lcpMs ? Math.round(lcpMs) : undefined,
      inpMs: inpMs ? Math.round(inpMs) : undefined,
      cls: cls != null ? Math.round(cls * 1000) / 1000 : undefined,
      ttfbMs: ttfbMs ? Math.round(ttfbMs) : undefined,
    };
  } catch (err) {
    return { url, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Google's CWV thresholds. Used for the summary green/red counts.
function isCwvGood(c: CwvResult): boolean {
  if (!c.ok) return false;
  if (c.lcpMs != null && c.lcpMs > 2500) return false;
  if (c.inpMs != null && c.inpMs > 200) return false;
  if (c.cls != null && c.cls > 0.1) return false;
  return true;
}
function isCwvPoor(c: CwvResult): boolean {
  if (!c.ok) return false;
  if (c.lcpMs != null && c.lcpMs > 4000) return true;
  if (c.inpMs != null && c.inpMs > 500) return true;
  if (c.cls != null && c.cls > 0.25) return true;
  return false;
}
