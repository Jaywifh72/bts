import type { Metadata } from 'next';
import Link from 'next/link';
import { db, getPersonBySlug, getSharedProductionsAcrossPeople } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { PersonAvatar } from '@/components/people/PersonAvatar';

export const metadata: Metadata = {
  title: 'Compare people',
  description: 'Side-by-side comparison for up to four people in the archive.',
};

type Props = {
  searchParams: Promise<{ items?: string }>;
};

const MAX = 4;

export default async function CompareCrewPage(props: Props) {
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
          title="Compare people"
          description="Pass two to four crew slugs in the URL to see them side by side. Open /crew, check the boxes on 2–4 cards, and follow the drawer's Compare button."
        />
      </>
    );
  }

  const [peopleRaw, shared] = await Promise.all([
    Promise.all(slugs.map((s) => getPersonBySlug(db, s))),
    getSharedProductionsAcrossPeople(db, slugs),
  ]);
  const people = peopleRaw.filter((p): p is NonNullable<typeof p> => Boolean(p));

  if (people.length === 0) {
    return (
      <>
        <PageHero eyebrow="Tools" title="Compare people" />
        <p className="text-sm text-zinc-400">
          None of <code className="text-zinc-300">{slugs.join(', ')}</code> matched.
        </p>
      </>
    );
  }

  const ROWS: Array<{ label: string; render: (p: (typeof people)[number]) => React.ReactNode }> = [
    { label: 'Born',         render: (p) => p.birth_year ?? '—' },
    { label: 'Died',         render: (p) => p.death_year ?? '—' },
    { label: 'Nationality',  render: (p) => p.nationality ?? '—' },
    { label: 'Societies',    render: (p) => (p.member_societies?.length ? p.member_societies.join(', ') : '—') },
    { label: 'Schools',      render: (p) => (p.film_schools?.length ? p.film_schools.join(', ') : '—') },
    { label: 'Aliases',      render: (p) => (p.aliases?.length ? p.aliases.join(', ') : '—') },
    { label: 'Stunt disc.',  render: (p) => (p.stunt_disciplines?.length ? p.stunt_disciplines.join(', ') : '—') },
    { label: 'Height',       render: (p) => (p.height_cm ? `${p.height_cm} cm` : '—') },
    { label: 'Union',        render: (p) => p.performer_union ?? '—' },
    { label: 'Doubles for',  render: (p) => (p.doubles_for?.length ? p.doubles_for.join(', ') : '—') },
  ];

  return (
    <>
      <PageHero
        eyebrow="Tools"
        title="Compare people"
        description={`Side-by-side: ${people.map((p) => p.display_name).join(' · ')}.`}
        actions={
          <Link href="/crew" className="text-xs text-zinc-500 hover:text-amber-400">
            ← Back to crew
          </Link>
        }
      />

      <div
        className="mb-4 grid gap-3"
        style={{ gridTemplateColumns: `120px repeat(${people.length}, minmax(0, 1fr))` }}
      >
        <div />
        {people.map((p) => (
          <div key={p.slug} className="space-y-2 text-center">
            <Link href={`/crew/${p.slug}`} className="inline-block">
              <PersonAvatar slug={p.slug} displayName={p.display_name} profilePath={p.profile_path} size="lg" />
            </Link>
            <Link href={`/crew/${p.slug}`} className="block">
              <h2 className="font-serif text-sm text-zinc-100 hover:text-amber-400 line-clamp-2">
                {p.display_name}
              </h2>
            </Link>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded border border-zinc-800">
        <table className="w-full text-sm">
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={row.label} className={i % 2 ? 'bg-zinc-900/30' : ''}>
                <th className="w-[120px] px-3 py-2 text-left text-[10px] font-normal uppercase tracking-wide text-zinc-500">
                  {row.label}
                </th>
                {people.map((p) => (
                  <td key={p.slug} className="px-3 py-2 align-top text-zinc-300">
                    {row.render(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 font-serif text-xl text-zinc-100">
          Shared productions
          <span className="ml-2 text-sm font-normal text-zinc-400">({shared.length})</span>
        </h2>
        {shared.length === 0 ? (
          <p className="text-sm text-zinc-400">
            None of these people are credited on any of the same productions in the curated archive.
          </p>
        ) : (
          <div
            tabIndex={0}
            role="region"
            aria-label="Shared productions"
            className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
          >
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
                <tr>
                  <th scope="col" className="px-3 py-2 text-left font-normal">Title</th>
                  <th scope="col" className="px-3 py-2 text-left font-normal">Year</th>
                  <th scope="col" className="px-3 py-2 text-left font-normal">Crewed by</th>
                  <th scope="col" className="px-3 py-2 text-right font-normal">Count</th>
                </tr>
              </thead>
              <tbody>
                {shared.map((s) => (
                  <tr key={s.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                    <td className="px-3 py-2">
                      <Link href={`/films/${s.slug}`} className="text-zinc-100 hover:text-amber-400">
                        {s.title}
                      </Link>
                    </td>
                    <td className="px-3 py-2 font-mono tabular-nums text-zinc-400">{s.release_year ?? '—'}</td>
                    <td className="px-3 py-2 text-xs text-zinc-400">
                      {s.shared_person_slugs.join(' · ')}
                    </td>
                    <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-400">
                      {s.shared_count}
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
