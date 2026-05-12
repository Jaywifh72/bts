import type { ProductionReleaseDate } from '@bts/db';
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

/**
 * Shows the earliest theatrical (or premiere) date per country, sorted by
 * date. The full TMDb response often has 5+ entries per country (premiere,
 * limited theatrical, wide theatrical, digital, physical) and showing all of
 * them buries the signal — most readers want "when did this open in DE / JP /
 * BR." Power users can still see the rest by hitting TMDb directly.
 */
export function ReleaseDates({ rows }: { rows: ProductionReleaseDate[] }) {
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

  return (
    <div className="mt-6">
      <SectionHeader label="Distribution" heading="Release dates by region" />
      <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {collapsed.map((r) => {
          let countryName = r.country;
          try {
            countryName = COUNTRY_NAME.of(r.country) ?? r.country;
          } catch { /* invalid ISO code; fall back to raw */ }
          return (
            <li key={r.country} className="flex items-baseline justify-between gap-3">
              <span className="text-zinc-300">
                <span className="inline-block w-9 font-mono text-xs uppercase text-zinc-500">{r.country}</span>
                {countryName}
              </span>
              <span className="text-xs text-zinc-500">
                {fmtDate(r.date)}
                {r.type !== 3 && (
                  <span className="ml-1 text-zinc-600">· {TYPE_LABEL[r.type]?.toLowerCase()}</span>
                )}
                {r.certification && <span className="ml-1 text-zinc-600">· {r.certification}</span>}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-zinc-600">
        Earliest theatrical or premiere date per country. Source: TMDb.
      </p>
    </div>
  );
}
