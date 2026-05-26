// Google Search Console client.
//
// Returns top queries, landing pages, and aggregate impressions/clicks for the
// site over a given window. The client is null when env vars are missing —
// callers should render an empty/instructions state in that case rather than
// throwing.
//
// Two auth paths supported. The OAuth refresh-token flow is preferred because
// it's what the operator configured (May 2026). Service-account JWT auth is
// kept as a fallback so we can swap back without code changes.
//
// ---- OAuth path (preferred) ----------------------------------------------
//
// Required env vars in Vercel:
//   GSC_OAUTH_CLIENT_ID       — from Google Cloud Console OAuth credentials
//   GSC_OAUTH_CLIENT_SECRET   — paired secret
//   GSC_REFRESH_TOKEN         — exchanged once via OAuth 2.0 Playground while
//                               signed in as the property owner. Long-lived
//                               (does not expire unless revoked or 6mo idle).
//   GSC_SITE_URL              — the property identifier. For Domain
//                               properties use `sc-domain:cinecanon.com`
//                               (not the URL — Domain properties are
//                               identified by the `sc-domain:` prefix).
//
// ---- Service-account path (fallback) -------------------------------------
//
// Required env vars in Vercel:
//   GSC_SERVICE_ACCOUNT_EMAIL — @...iam.gserviceaccount.com address
//   GSC_SERVICE_ACCOUNT_KEY   — the entire `private_key` value (keep \n escapes)
//   GSC_SITE_URL              — same as above
//
// The service account must be added as a verified user on the GSC property.
//
// ---- API surface ---------------------------------------------------------
//
// Read-only. No mutation. Callable per admin request; results are not cached
// at this layer (rely on Vercel's HTTP cache headers if needed).

import { google, type searchconsole_v1 } from 'googleapis';

const GSC_SITE = process.env.GSC_SITE_URL ?? 'sc-domain:cinecanon.com';

export type GscRow = {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
};

export type GscReport = {
  site: string;
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

function getClient(): searchconsole_v1.Searchconsole {
  const mode = gscAuthMode();
  if (mode === 'oauth') {
    const oauth2 = new google.auth.OAuth2({
      clientId: process.env.GSC_OAUTH_CLIENT_ID!,
      clientSecret: process.env.GSC_OAUTH_CLIENT_SECRET!,
    });
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

export async function fetchGscReport(opts: { days?: number } = {}): Promise<GscReport | null> {
  if (!isGscConfigured()) return null;
  const sc = getClient();
  const days = clamp(opts.days ?? 28, 1, 90);
  const today = new Date();
  // GSC has a 2-3 day data lag — end the window 3 days ago for stable numbers.
  const end = isoDate(addDays(today, -3));
  const start = isoDate(addDays(today, -3 - days));

  const fetch = async (dimensions: string[], rowLimit: number): Promise<GscRow[]> => {
    const res = await sc.searchanalytics.query({
      siteUrl: GSC_SITE,
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
    site: GSC_SITE,
    startDate: start,
    endDate: end,
    totals,
    topQueries,
    topPages,
    topCountries,
    byDay,
  };
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
