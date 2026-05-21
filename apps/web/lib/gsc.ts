// Google Search Console client.
//
// Returns top queries, landing pages, and aggregate impressions/clicks for the
// site over a given window. The client is null when env vars are missing —
// callers should render an empty/instructions state in that case rather than
// throwing.
//
// Setup (one-time, owner action):
//   1. Verify cinecanon.com in Google Search Console:
//      https://search.google.com/search-console/welcome
//   2. Create a Google Cloud service account with "Search Console API" enabled.
//   3. Add the service account email as a "Full" user in GSC (Settings →
//      Users and permissions → Add user).
//   4. Download the service-account JSON key.
//   5. Add as GH/Vercel env vars:
//        GSC_SERVICE_ACCOUNT_EMAIL   (the @...iam.gserviceaccount.com address)
//        GSC_SERVICE_ACCOUNT_KEY     (the entire `private_key` value — keep \n escapes)
//        GSC_SITE_URL               (e.g. https://www.cinecanon.com/  — trailing slash matters)
//
// Read-only API. No mutation surface. CC-BY 4.0 attribution boundary doesn't
// apply — this is internal admin data only.

import { google, type searchconsole_v1 } from 'googleapis';

const GSC_SITE = process.env.GSC_SITE_URL ?? 'https://www.cinecanon.com/';

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

export function isGscConfigured(): boolean {
  return Boolean(
    process.env.GSC_SERVICE_ACCOUNT_EMAIL &&
    process.env.GSC_SERVICE_ACCOUNT_KEY,
  );
}

function getClient(): searchconsole_v1.Searchconsole {
  const email = process.env.GSC_SERVICE_ACCOUNT_EMAIL!;
  const key = (process.env.GSC_SERVICE_ACCOUNT_KEY ?? '').replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({
    email,
    key,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
  return google.searchconsole({ version: 'v1', auth });
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
