import Link from 'next/link';
import { SectionHeader } from '@/components/ui/SectionHeader';

type FilmographyRow = {
  production_slug: string;
  release_year: number | null;
  primary_aspect_ratio: string | null;
};

type Collaborator = {
  slug: string;
  display_name: string;
  primary_role: string | null;
  shared_productions: number;
};

/**
 * Returns the most frequent value in `values`, ignoring null/undefined.
 * Ties broken by lexicographic order so the result is stable across renders.
 */
function mode(values: Array<string | null | undefined>): string | null {
  const counts = new Map<string, number>();
  for (const v of values) {
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  if (counts.size === 0) return null;
  let bestKey: string | null = null;
  let bestCount = -1;
  for (const [k, n] of counts) {
    if (n > bestCount || (n === bestCount && bestKey !== null && k < bestKey)) {
      bestKey = k;
      bestCount = n;
    }
  }
  return bestKey;
}

/**
 * T3-2 — career stats panel. Computed client-side from filmography rows
 * and collaborators we already load for the crew page (no extra query).
 *
 * The "primary aspect ratio" stat is intentionally a count of *productions*,
 * not credits — a DP credited as both DP and 2nd-unit DP on the same film
 * shouldn't have that aspect ratio counted twice.
 */
export function CareerStats({
  filmography,
  collaborators,
}: {
  filmography: readonly FilmographyRow[];
  collaborators: readonly Collaborator[];
}) {
  // Dedupe filmography rows to one entry per production.
  const byProduction = new Map<string, FilmographyRow>();
  for (const r of filmography) {
    if (!byProduction.has(r.production_slug)) byProduction.set(r.production_slug, r);
  }
  const productions = Array.from(byProduction.values());

  if (productions.length === 0) return null;

  const totalCredits = filmography.length;
  const totalProductions = productions.length;

  const years = productions
    .map((p) => p.release_year)
    .filter((y): y is number => typeof y === 'number');
  const earliest = years.length > 0 ? Math.min(...years) : null;
  const latest = years.length > 0 ? Math.max(...years) : null;
  const decadeSet = new Set(years.map((y) => Math.floor(y / 10) * 10));
  const decadeCount = decadeSet.size;

  const topAspectRatio = mode(productions.map((p) => p.primary_aspect_ratio));
  const aspectRatioCount = topAspectRatio
    ? productions.filter((p) => p.primary_aspect_ratio === topAspectRatio).length
    : 0;

  const top = collaborators[0] ?? null;

  // Each card is hidden if the underlying stat is missing — avoids "—" filler
  // on rows where, e.g., we don't know any release years yet.
  const cards: Array<{ label: string; value: React.ReactNode; hint?: string }> = [];

  cards.push({
    label: 'Credits',
    value: <span className="font-mono text-2xl text-zinc-100">{totalCredits}</span>,
    hint:
      totalProductions !== totalCredits
        ? `across ${totalProductions} ${totalProductions === 1 ? 'production' : 'productions'}`
        : totalProductions === 1
          ? '1 production'
          : `${totalProductions} productions`,
  });

  if (earliest !== null && latest !== null) {
    const span = latest - earliest;
    cards.push({
      label: 'Active',
      value: (
        <span className="font-mono text-2xl text-zinc-100">
          {earliest === latest ? earliest : `${earliest}–${latest}`}
        </span>
      ),
      hint:
        decadeCount > 1
          ? `${decadeCount} ${decadeCount === 1 ? 'decade' : 'decades'}`
          : `${span === 0 ? '<1 year' : `${span} ${span === 1 ? 'year' : 'years'}`}`,
    });
  }

  if (topAspectRatio) {
    cards.push({
      label: 'Most-used aspect',
      value: <span className="font-mono text-2xl text-zinc-100">{topAspectRatio}</span>,
      hint: `${aspectRatioCount} of ${totalProductions} ${totalProductions === 1 ? 'production' : 'productions'}`,
    });
  }

  if (top) {
    cards.push({
      label: 'Top collaborator',
      value: (
        <Link href={`/crew/${top.slug}`} className="text-lg text-zinc-100 hover:text-amber-400">
          {top.display_name}
        </Link>
      ),
      hint: `${top.shared_productions} shared${top.primary_role ? ` · ${top.primary_role}` : ''}`,
    });
  }

  return (
    <div className="mb-8">
      <SectionHeader label="Career" heading="Stats" />
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-3"
          >
            <dt className="text-xs uppercase tracking-wide text-zinc-500">{c.label}</dt>
            <dd className="mt-1 leading-tight">{c.value}</dd>
            {c.hint && <dd className="mt-0.5 text-xs text-zinc-500">{c.hint}</dd>}
          </div>
        ))}
      </dl>
    </div>
  );
}
