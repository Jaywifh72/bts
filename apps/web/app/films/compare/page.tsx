import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { db, getProductionsForComparison, getSharedCollaboratorsAcrossFilms } from '@bts/db';
import { posterUrl } from '@/lib/tmdb-image';
import { PageHero } from '@/components/ui/PageHero';

export const metadata: Metadata = {
  title: 'Compare films',
  description: 'Side-by-side comparison for up to four productions — format, aspect, crew, runtime, depth.',
};

type Props = {
  searchParams: Promise<{ items?: string }>;
};

const MAX = 4;

export default async function CompareFilmsPage(props: Props) {
  const searchParams = await props.searchParams;
  const slugs = (searchParams.items ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX);

  if (slugs.length === 0) {
    return (
      <>
        <PageHero
          eyebrow="Tools"
          title="Compare films"
          description="Pass two to four film slugs in the URL to see them side by side. Open /films, check the boxes on 2–4 cards, and follow the drawer's Compare button."
        />
        <p className="text-sm text-zinc-500">
          Example:{' '}
          <Link
            href="/films/compare?items=dune-part-two-2024,oppenheimer-2023"
            className="text-amber-400 hover:underline"
          >
            Dune: Part Two vs Oppenheimer
          </Link>
        </p>
      </>
    );
  }

  const [rows, sharedCrew] = await Promise.all([
    getProductionsForComparison(db, slugs),
    getSharedCollaboratorsAcrossFilms(db, slugs),
  ]);

  if (rows.length === 0) {
    return (
      <>
        <PageHero eyebrow="Tools" title="Compare films" />
        <p className="text-sm text-zinc-400">
          None of <code className="text-zinc-300">{slugs.join(', ')}</code> matched. Check the slugs.
        </p>
      </>
    );
  }

  // Preserve URL order so the columns line up with what the user selected.
  const byslug = new Map(rows.map((r) => [r.slug, r]));
  const ordered = slugs.map((s) => byslug.get(s)).filter(Boolean) as typeof rows;

  const ROWS: Array<{ label: string; render: (r: (typeof rows)[number]) => React.ReactNode }> = [
    { label: 'Year', render: (r) => r.release_year ?? '—' },
    { label: 'Type', render: (r) => r.type },
    {
      label: 'Director',
      render: (r) =>
        r.director_slug && r.director_name ? (
          <Link href={`/crew/${r.director_slug}`} className="text-amber-400 hover:underline">
            {r.director_name}
          </Link>
        ) : (
          r.director_name ?? '—'
        ),
    },
    {
      label: 'DP',
      render: (r) =>
        r.primary_dp_slug && r.primary_dp_name ? (
          <Link href={`/crew/${r.primary_dp_slug}`} className="text-amber-400 hover:underline">
            {r.primary_dp_name}
          </Link>
        ) : (
          r.primary_dp_name ?? '—'
        ),
    },
    { label: 'Aspect', render: (r) => r.primary_aspect_ratio ?? '—' },
    { label: 'Format', render: (r) => r.primary_acquisition_format ?? '—' },
    { label: 'Runtime', render: (r) => (r.runtime_minutes ? `${Math.floor(r.runtime_minutes / 60)}h ${r.runtime_minutes % 60}m` : '—') },
    { label: 'Genres', render: (r) => (r.genres ?? []).join(', ') || '—' },
    { label: 'Rating', render: (r) => (r.vote_average ? Number(r.vote_average).toFixed(1) : '—') },
    { label: 'Tier', render: (r) => r.data_tier },
  ];

  return (
    <>
      <PageHero
        eyebrow="Tools"
        title="Compare films"
        description={`Side-by-side: ${ordered.map((r) => r.title).join(' · ')}.`}
        actions={
          <Link href="/films" className="text-xs text-zinc-500 hover:text-amber-400">
            ← Back to films
          </Link>
        }
      />

      {/* Poster row */}
      <div
        className="mb-4 grid gap-3"
        style={{ gridTemplateColumns: `120px repeat(${ordered.length}, minmax(0, 1fr))` }}
      >
        <div />
        {ordered.map((r) => {
          const poster = posterUrl(r.poster_path, 'w185');
          return (
            <div key={r.slug} className="space-y-2">
              <Link
                href={`/films/${r.slug}`}
                className="block overflow-hidden rounded border border-zinc-800 bg-zinc-950 hover:border-amber-700/60"
              >
                <div className="relative aspect-[2/3]">
                  {poster && (
                    <Image src={poster} unoptimized alt={`${r.title} poster`} fill sizes="240px" className="object-cover" />
                  )}
                </div>
              </Link>
              <Link href={`/films/${r.slug}`} className="block">
                <h2 className="font-serif text-sm text-zinc-100 hover:text-amber-400 line-clamp-2">{r.title}</h2>
              </Link>
            </div>
          );
        })}
      </div>

      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="w-full text-sm">
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.label} className={i % 2 ? 'bg-zinc-900/30' : ''}>
                <th className="w-[120px] px-3 py-2 text-left text-[10px] font-normal uppercase tracking-wide text-zinc-500">
                  {row.label}
                </th>
                {ordered.map((r) => (
                  <td key={r.slug} className="px-3 py-2 align-top text-zinc-300">
                    {row.render(r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* UX-audit E4: shared-collaborator panel. Surfaces people who crewed
          on 2+ of the compared films — the most-requested cross-cut on a
          DP-vs-DP / decade-vs-decade comparison. */}
      <section className="mt-10">
        <h2 className="mb-3 font-serif text-xl text-zinc-100">
          Shared collaborators
          <span className="ml-2 text-sm font-normal text-zinc-400">({sharedCrew.length})</span>
        </h2>
        {sharedCrew.length === 0 ? (
          <p className="text-sm text-zinc-400">
            No crew people credited on 2 or more of these productions.
          </p>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label="Shared collaborators"
            className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-normal">Person</th>
                  <th scope="col" className="px-3 py-2 text-left font-normal">Primary role</th>
                  <th scope="col" className="px-3 py-2 text-left font-normal">Shared on</th>
                  <th scope="col" className="px-3 py-2 text-right font-normal">Films</th>
                </tr>
              </thead>
              <tbody>
                {sharedCrew.map((c) => (
                  <tr key={c.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                    <td className="px-3 py-2">
                      <Link href={`/crew/${c.slug}`} className="text-zinc-100 hover:text-amber-400">
                        {c.display_name}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {c.primary_role ?? <span className="text-zinc-500">—</span>}
                    </td>
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      {c.shared_slugs.join(' · ')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-400">
                      {c.shared_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
