import type { ProductionReleaseDate } from '@bts/db';
import { headers } from 'next/headers';
import { SectionHeader } from '@/components/ui/SectionHeader';

const TYPE_LABEL: Record<number, string> = {
  1: 'Premiere',
  2: 'Theatrical (limited)',
  3: 'Theatrical',
  4: 'Digital',
  5: 'Physical',
  6: 'TV',
};

const COUNTRY_NAME = new Intl.DisplayNames(['en'], { type: 'region' });

function fmtDate(iso: string): string {
  // 'YYYY-MM-DD' → '1 Mar 2024'. Cheap, locale-stable.
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  const monthName = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1];
  return `${d} ${monthName} ${y}`;
}

/** Heuristic user-region detection for D5 region-first ordering.
 *
 *   1. Edge / CDN geo header (`x-vercel-ip-country`) — most accurate.
 *   2. `Accept-Language` primary locale region (e.g. "en-GB" → "GB").
 *
 * Returns `null` when neither is informative; caller then renders the
 * flat date-sorted list without a pinned region.
 */
async function detectUserRegion(): Promise<string | null> {
  const h = await headers();
  const geo = h.get('x-vercel-ip-country') ?? h.get('cf-ipcountry');
  if (geo && /^[A-Z]{2}$/.test(geo)) return geo;
  const al = h.get('accept-language') ?? '';
  const m = al.match(/[a-z]{2,3}-([A-Z]{2})/);
  return m ? m[1]! : null;
}

function ReleaseRow({ r }: { r: ProductionReleaseDate }) {
  let countryName = r.country;
  try {
    countryName = COUNTRY_NAME.of(r.country) ?? r.country;
  } catch { /* invalid ISO; fall back */ }
  return (
    <li className="flex items-baseline justify-between gap-3">
      <span className="text-zinc-300">
        <span className="inline-block w-9 font-mono text-xs uppercase text-zinc-400">{r.country}</span>
        {countryName}
      </span>
      <span className="text-xs text-zinc-400">
        <time dateTime={r.date}>{fmtDate(r.date)}</time>
        {r.type !== 3 && (
          <span className="ml-1 text-zinc-500">· {TYPE_LABEL[r.type]?.toLowerCase()}</span>
        )}
        {r.certification && <span className="ml-1 text-zinc-500">· {r.certification}</span>}
      </span>
    </li>
  );
}

/**
 * Earliest theatrical (or premiere) date per country, region-first.
 *
 * UX-audit D5: a Tokyo-based DP looking up Dune 2's Japan release shouldn't
 * have to scan 50 country rows. We sniff the user's region from CDN headers
 * + Accept-Language, pin that row at the top, and collapse "Other regions
 * (47)" into a <details> the visitor opens on demand.
 */
export async function ReleaseDates({ rows }: { rows: ProductionReleaseDate[] }) {
  if (rows.length === 0) return null;

  // Pick one row per country: prefer theatrical (3) > premiere (1) > theatrical_limited (2) > digital (4).
  const PREF_ORDER: Record<number, number> = { 3: 0, 1: 1, 2: 2, 4: 3, 5: 4, 6: 5 };
  const byCountry = new Map<string, ProductionReleaseDate>();
  for (const r of rows) {
    const existing = byCountry.get(r.country);
    if (!existing) {
      byCountry.set(r.country, r);
      continue;
    }
    const a = PREF_ORDER[r.type] ?? 99;
    const b = PREF_ORDER[existing.type] ?? 99;
    if (a < b || (a === b && r.date < existing.date)) {
      byCountry.set(r.country, r);
    }
  }

  const collapsed = Array.from(byCountry.values()).sort((a, b) => a.date.localeCompare(b.date));
  const userRegion = await detectUserRegion();
  const pinned = userRegion ? collapsed.find((r) => r.country === userRegion) : undefined;
  const others = pinned ? collapsed.filter((r) => r.country !== pinned.country) : collapsed;

  return (
    <div className="mt-6">
      <SectionHeader label="Distribution" heading="Release dates by region" />

      {pinned && (
        <ul className="mt-2 rounded border border-amber-700/40 bg-amber-950/10 p-3">
          <p className="mb-2 text-[10px] uppercase tracking-widest text-amber-300">
            Your region
          </p>
          <ReleaseRow r={pinned} />
        </ul>
      )}

      <details className="mt-4 group" {...(pinned ? {} : { open: true })}>
        <summary className="cursor-pointer text-sm text-zinc-300 hover:text-amber-400">
          {pinned ? `Other regions (${others.length})` : `All regions (${others.length})`}
          <span aria-hidden="true" className="ml-1 text-zinc-500 group-open:hidden">▸</span>
          <span aria-hidden="true" className="ml-1 text-zinc-500 hidden group-open:inline">▾</span>
        </summary>
        <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          {others.map((r) => <ReleaseRow key={r.country} r={r} />)}
        </ul>
      </details>

      <p className="mt-2 text-xs text-zinc-400">
        Earliest theatrical or premiere date per country. Source: TMDb.
      </p>
    </div>
  );
}
