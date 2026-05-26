// Google Search Console client.
//
// Self-healing: callers don't need to know the exact GSC property identifier
// (sc-domain:cinecanon.com vs https://www.cinecanon.com/ vs ...). The client
// auto-discovers via sites.list and picks the cinecanon.com property the
// configured identity owns. GSC_SITE_URL is honored as an override when set
// AND when it matches a discoverable property; otherwise we fall back.
//
// Two auth paths supported. OAuth refresh-token is preferred (what's actually
// configured today). Service-account JWT is the fallback.
//
// ---- OAuth path (preferred) ----------------------------------------------
//
// Required env vars in Vercel:
//   GSC_OAUTH_CLIENT_ID       — from Google Cloud Console OAuth credentials
//   GSC_OAUTH_CLIENT_SECRET   — paired secret
//   GSC_REFRESH_TOKEN         — exchanged via OAuth 2.0 Playground while
//                               signed in as the property owner. Long-lived
//                               (does not expire unless revoked or 6mo idle).
//
// Optional:
//   GSC_SITE_URL              — if you want to pin to a specific property
//                               (otherwise auto-detected from sites.list).
//                               Domain properties are `sc-domain:cinecanon.com`;
//                               URL-prefix properties are `https://www.cinecanon.com/`
//                               (trailing slash matters for URL-prefix).
//
// ---- Service-account path (fallback) -------------------------------------
//
// Required env vars in Vercel:
//   GSC_SERVICE_ACCOUNT_EMAIL — @...iam.gserviceaccount.com address
//   GSC_SERVICE_ACCOUNT_KEY   — the entire `private_key` value (keep \n escapes)
//
// The service account must be added as a verified user on the GSC property.
//
// ---- API surface ---------------------------------------------------------
//
// Read-only. No mutation. Callable per admin request; results are not cached
// at this layer (rely on Vercel's HTTP cache headers if needed).

import { google, type searchconsole_v1 } from 'googleapis';

const ENV_SITE = (process.env.GSC_SITE_URL ?? '').trim();
const SITE_PATTERN = /cinecanon\.com/i;

export type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscReport = {
  site: string;
  /** Whether the site identifier came from GSC_SITE_URL or auto-discovery. */
  siteOrigin: 'env' | 'auto-discovered';
  startDate: string;
  endDate: string;
  totals: { clicks: number; impressions: number; ctr: number; position: number };
  topQueries: GscRow[];
  topPages: GscRow[];
  topCountries: GscRow[];
  byDay: GscRow[];
};

type AuthMode = 'oauth' | 'service-account' | 'none';

export function gscAuthMode(): AuthMode {
  if (process.env.GSC_REFRESH_TOKEN
      && process.env.GSC_OAUTH_CLIENT_ID
      && process.env.GSC_OAUTH_CLIENT_SECRET) {
    return 'oauth';
  }
  if (process.env.GSC_SERVICE_ACCOUNT_EMAIL && process.env.GSC_SERVICE_ACCOUNT_KEY) {
    return 'service-account';
  }
  return 'none';
}

export function isGscConfigured(): boolean {
  return gscAuthMode() !== 'none';
}

export type SiteEntry = { siteUrl: string; permissionLevel: string };

/**
 * Lists every Search Console property the configured identity has access to.
 * Used both as a diagnostic (when the operator is debugging) and by
 * resolveSiteUrl() to auto-discover the right property.
 */
export async function listGscSites(): Promise<{ ok: true; sites: SiteEntry[] } | { ok: false; error: string }> {
  if (!isGscConfigured()) return { ok: false, error: 'GSC not configured' };
  try {
    const sc = getClient();
    const res = await sc.sites.list();
    const sites = (res.data.siteEntry ?? []).map((s) => ({
      siteUrl: s.siteUrl ?? '',
      permissionLevel: s.permissionLevel ?? '',
    }));
    return { ok: true, sites };
  } catch (err) {
    return { ok: false, error: gscErrorMessage(err) };
  }
}

/**
 * Resolve which siteUrl identifier to use for searchanalytics queries.
 *
 * Strategy:
 *   1. If GSC_SITE_URL is set AND matches a property listed by sites.list,
 *      use it (operator override wins when valid).
 *   2. Otherwise pick the highest-priority cinecanon.com property the
 *      identity can access. Priority: sc-domain (Domain property) > https://www
 *      > https:// > http://. Within ties, prefer siteOwner > siteFullUser >
 *      siteRestrictedUser.
 *   3. If no cinecanon.com property is visible, return an error explaining what
 *      sites the identity CAN see so the operator can fix it.
 *
 * Returns the resolved siteUrl and where it came from.
 */
export async function resolveSiteUrl(): Promise<
  | { ok: true; siteUrl: string; origin: 'env' | 'auto-discovered'; allSites: SiteEntry[] }
  | { ok: false; error: string; allSites: SiteEntry[] }
> {
  const probe = await listGscSites();
  if (!probe.ok) {
    return { ok: false, error: probe.error, allSites: [] };
  }
  const sites = probe.sites;

  // 1. Honor env override if it matches a visible property.
  if (ENV_SITE) {
    const hit = sites.find((s) => s.siteUrl === ENV_SITE);
    if (hit) return { ok: true, siteUrl: hit.siteUrl, origin: 'env', allSites: sites };
    // If env is set but doesn't match, fall through to auto-discover but log it.
    console.warn(
      `[gsc] GSC_SITE_URL="${ENV_SITE}" doesn't match any property the identity owns. ` +
      `Falling back to auto-discovery.`,
    );
  }

  // 2. Auto-discover the right cinecanon.com property.
  const cinecanonSites = sites.filter((s) => SITE_PATTERN.test(s.siteUrl));
  if (cinecanonSites.length === 0) {
    return {
      ok: false,
      error: sites.length === 0
        ? 'The configured identity has no GSC properties at all. Add it as a user on the property in Search Console → Settings → Users and permissions.'
        : `The configured identity has access to ${sites.length} property/properties, but none match cinecanon.com. Visible: ${sites.map((s) => s.siteUrl).join(', ')}.`,
      allSites: sites,
    };
  }

  // Rank: prefer sc-domain (Domain property — covers all subdomains), then
  // www, then bare https, then http. Within rank, prefer higher permission.
  const rank = (siteUrl: string): number => {
    if (siteUrl.startsWith('sc-domain:')) return 0;
    if (siteUrl.startsWith('https://www.')) return 1;
    if (siteUrl.startsWith('https://')) return 2;
    if (siteUrl.startsWith('http://')) return 3;
    return 4;
  };
  const permRank = (p: string): number => {
    if (p === 'siteOwner') return 0;
    if (p === 'siteFullUser') return 1;
    if (p === 'siteRestrictedUser') return 2;
    return 3;
  };
  cinecanonSites.sort((a, b) => {
    const r = rank(a.siteUrl) - rank(b.siteUrl);
    if (r !== 0) return r;
    return permRank(a.permissionLevel) - permRank(b.permissionLevel);
  });

  return {
    ok: true,
    siteUrl: cinecanonSites[0]!.siteUrl,
    origin: 'auto-discovered',
    allSites: sites,
  };
}

/** Pulls the most useful one-liner out of a googleapis error. */
export function gscErrorMessage(err: unknown): string {
  if (!err) return 'unknown error';
  if (typeof err === 'string') return err;
  // googleapis errors have .response.data.error.message
  const anyErr = err as Record<string, unknown>;
  const resp = anyErr.response as Record<string, unknown> | undefined;
  const data = resp?.data as Record<string, unknown> | undefined;
  const errObj = data?.error as Record<string, unknown> | undefined;
  if (errObj && typeof errObj.message === 'string') {
    const code = errObj.code ?? resp?.status;
    return code ? `${code}: ${errObj.message}` : String(errObj.message);
  }
  if (anyErr.message && typeof anyErr.message === 'string') return anyErr.message;
  return JSON.stringify(err).slice(0, 300);
}

function getClient(): searchconsole_v1.Searchconsole {
  const mode = gscAuthMode();
  if (mode === 'oauth') {
    // Positional-arg form is the most-documented signature; works across
    // recent google-auth-library versions.
    const oauth2 = new google.auth.OAuth2(
      process.env.GSC_OAUTH_CLIENT_ID!,
      process.env.GSC_OAUTH_CLIENT_SECRET!,
    );
    oauth2.setCredentials({ refresh_token: process.env.GSC_REFRESH_TOKEN! });
    // googleapis will exchange refresh → access on first request and cache it.
    return google.searchconsole({ version: 'v1', auth: oauth2 });
  }
  if (mode === 'service-account') {
    const email = process.env.GSC_SERVICE_ACCOUNT_EMAIL!;
    const key = (process.env.GSC_SERVICE_ACCOUNT_KEY ?? '').replace(/\\n/g, '\n');
    const auth = new google.auth.JWT({
      email,
      key,
      scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
    });
    return google.searchconsole({ version: 'v1', auth });
  }
  throw new Error('GSC not configured');
}

export async function fetchGscReport(opts: { days?: number } = {}): Promise<
  { ok: true; report: GscReport } | { ok: false; error: string; sites: SiteEntry[] }
> {
  if (!isGscConfigured()) {
    return { ok: false, error: 'GSC not configured', sites: [] };
  }

  const resolved = await resolveSiteUrl();
  if (!resolved.ok) {
    return { ok: false, error: resolved.error, sites: resolved.allSites };
  }

  const sc = getClient();
  const days = clamp(opts.days ?? 28, 1, 90);
  const today = new Date();
  // GSC has a 2-3 day data lag — end the window 3 days ago for stable numbers.
  const end = isoDate(addDays(today, -3));
  const start = isoDate(addDays(today, -3 - days));

  const fetch = async (dimensions: string[], rowLimit: number): Promise<GscRow[]> => {
    const res = await sc.searchanalytics.query({
      siteUrl: resolved.siteUrl,
      requestBody: { startDate: start, endDate: end, dimensions, rowLimit },
    });
    return (res.data.rows ?? []).map((r) => ({
      keys: r.keys ?? [],
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }));
  };

  try {
    const [topQueries, topPages, topCountries, byDay] = await Promise.all([
      fetch(['query'], 50),
      fetch(['page'], 50),
      fetch(['country'], 25),
      fetch(['date'], 90),
    ]);

    const totals = byDay.reduce(
      (acc, r) => {
        acc.clicks += r.clicks;
        acc.impressions += r.impressions;
        return acc;
      },
      { clicks: 0, impressions: 0, ctr: 0, position: 0 },
    );
    totals.ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
    totals.position = byDay.length > 0
      ? byDay.reduce((a, r) => a + r.position, 0) / byDay.length
      : 0;

    return {
      ok: true,
      report: {
        site: resolved.siteUrl,
        siteOrigin: resolved.origin,
        startDate: start,
        endDate: end,
        totals,
        topQueries,
        topPages,
        topCountries,
        byDay,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: gscErrorMessage(err),
      sites: resolved.allSites,
    };
  }
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
function addDays(d: Date, days: number): Date {
  const r = new Date(d);
  r.setUTCDate(r.getUTCDate() + days);
  return r;
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
