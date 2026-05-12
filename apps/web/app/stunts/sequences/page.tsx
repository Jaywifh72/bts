import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listStuntSequences } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const metadata: Metadata = {
  title: 'Stunt sequences',
  description:
    'Sequence-level rigging detail across curated productions: pole-cats, decelerators, vehicle modifications, named coordinators, and the safety bulletins observed.',
};

function discipline(d: string) {
  return d.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function StuntSequencesIndex() {
  const sequences = await listStuntSequences(db);

  // Group by production for visual organisation.
  type Group = { slug: string; title: string; year: number | null; rows: typeof sequences };
  const byProduction = new Map<string, Group>();
  for (const s of sequences) {
    const g = byProduction.get(s.production_slug) ?? {
      slug: s.production_slug,
      title: s.production_title,
      year: s.production_release_year,
      rows: [] as typeof sequences,
    };
    g.rows.push(s);
    byProduction.set(s.production_slug, g);
  }
  const groups = [...byProduction.values()].sort(
    (a, b) => (b.year ?? 0) - (a.year ?? 0) || a.title.localeCompare(b.title),
  );

  const allDisciplines = new Set<string>();
  for (const s of sequences) for (const d of s.discipline_tags) allDisciplines.add(d);

  return (
    <>
      <div className="relative mb-12 overflow-hidden border-b border-zinc-800 pb-10">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-red-950/40 via-zinc-950/0 to-transparent"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-red-500/80">
            <Link href="/stunts" className="hover:text-amber-400">Stunts</Link>
            <span className="mx-2 text-zinc-600">·</span>
            Sequences
          </p>
          <h1 className="mt-2 font-serif text-5xl text-zinc-50 leading-none">Set-pieces</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            Sequence-level rigging detail. The pole-cat poles, the decelerator manufacturers, the
            picture-car modifications, the named coordinators, and the SAG-AFTRA safety bulletins observed
            on set. Each entry ties back to the film page where the work appears.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
            <Stat label="Sequences" value={sequences.length} />
            <Stat label="Productions" value={groups.length} />
            <Stat label="Disciplines" value={allDisciplines.size} />
            <Stat
              label="Total run time"
              value={`${sequences.reduce((sum, s) => sum + (s.screen_minutes ? Number(s.screen_minutes) : 0), 0).toFixed(1)} min`}
            />
          </div>
        </div>
      </div>

      {groups.map((g) => (
        <section key={g.slug} className="mb-12">
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-serif text-xl text-zinc-100">
              <Link href={`/films/${g.slug}`} className="hover:text-amber-400">
                {g.title}
              </Link>
              {g.year && <span className="ml-2 text-sm text-zinc-500">{g.year}</span>}
            </h2>
            <span className="text-xs text-zinc-500">
              {g.rows.length} sequence{g.rows.length === 1 ? '' : 's'}
            </span>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {g.rows.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/stunts/sequences/${s.production_slug}/${s.slug}`}
                  className="group flex h-full flex-col rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-red-900/50 transition-colors"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="font-serif text-sm text-zinc-100 group-hover:text-amber-400">
                      {s.name}
                    </h3>
                    {s.screen_minutes && (
                      <span className="font-mono text-xs text-zinc-500">
                        {Number(s.screen_minutes).toFixed(1)} min
                      </span>
                    )}
                  </div>
                  {s.description && (
                    <p className="mt-1 line-clamp-3 text-xs text-zinc-400">{s.description}</p>
                  )}
                  {s.discipline_tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {s.discipline_tags.slice(0, 4).map((d) => (
                        <span
                          key={d}
                          className="rounded border border-red-900/40 bg-red-950/30 px-1.5 py-0.5 text-[10px] text-red-200/90"
                        >
                          {discipline(d)}
                        </span>
                      ))}
                      {s.discipline_tags.length > 4 && (
                        <span className="text-[10px] text-zinc-600">+{s.discipline_tags.length - 4}</span>
                      )}
                    </div>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <div className="font-serif text-2xl text-zinc-50">{value}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}
