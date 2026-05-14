import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listStuntPeople } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PersonAvatar } from '@/components/people/PersonAvatar';

export const metadata: Metadata = {
  title: 'Stunt performers + coordinators',
  description:
    'Stunt performers and coordinators with curated disciplines, doubling history, training credentials, and primary company affiliations.',
};

const UNION_LABELS: Record<string, string> = {
  'SAG-AFTRA': 'SAG-AFTRA',
  'BSR': 'British Stunt Register',
  'BECTU': 'BECTU',
  'ACTRA': 'ACTRA',
};

function discipline(d: string) {
  return d
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="font-serif text-2xl text-zinc-50">{value.toLocaleString()}</div>
      <div className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

export default async function StuntPeopleIndexPage() {
  const people = await listStuntPeople(db);

  // Bucket: those with primary stunt-coordinator credentials vs. those
  // who appear in the dataset as performers / doubles only. Coordinators
  // appear at the top with a distinct treatment because their pages
  // tend to carry the deepest editorial context.
  const coordinators = people.filter((p) => /Coordinator|2nd Unit Director/i.test(p.primary_role ?? '') || (p.stunt_disciplines ?? []).includes('second-unit direction'));
  const performers = people.filter((p) => !coordinators.includes(p));

  // Aggregate stats.
  const allDisciplines = new Set<string>();
  for (const p of people) for (const d of p.stunt_disciplines ?? []) allDisciplines.add(d);
  const unionCount = new Set(people.map((p) => p.performer_union).filter(Boolean)).size;
  // Phase 12 — total documented doubling credits across the roster.
  const totalDoublings = people.reduce((acc, p) => acc + (p.doubling_credit_count ?? 0), 0);

  return (
    <>
      {/* Hero — red-accented, mirrors /stunts but tilted toward people. */}
      <div className="relative mb-12 overflow-hidden border-b border-zinc-800 pb-10">
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-red-950/40 via-zinc-950/0 to-transparent"
        />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-red-500/80">
            <Link href="/stunts" className="hover:text-amber-400">Stunts</Link>
            <span className="mx-2 text-zinc-600">·</span>
            People
          </p>
          <h1 className="mt-2 font-serif text-5xl text-zinc-50 leading-none">Performers + Coordinators</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            The stunt people behind the action — coordinators who lead
            a film&apos;s second unit, performers who double a single actor
            for a generation, riggers and safety officers whose names
            rarely make the trade press. Curated with disciplines,
            doubling history, union credentials, and primary company
            affiliations.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
            <Stat label="People" value={people.length} />
            <Stat label="Coordinators" value={coordinators.length} />
            <Stat label="Performers" value={performers.length} />
            <Stat label="Doubling credits" value={totalDoublings} />
            <Stat label="Disciplines" value={allDisciplines.size} />
          </div>
        </div>
      </div>

      {/* Coordinators */}
      {coordinators.length > 0 && (
        <section className="mb-14">
          <SectionHeader
            label="Leadership"
            heading={`${coordinators.length} coordinator${coordinators.length === 1 ? '' : 's'} + 2nd-unit directors`}
          />
          <p className="-mt-2 mb-5 max-w-2xl text-xs text-zinc-500">
            Working stunt coordinators and 2nd-unit directors. Click
            through for filmography, doubling history, and editorial
            biography.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {coordinators.map((p) => (
              <PersonCard key={p.slug} person={p} />
            ))}
          </ul>
        </section>
      )}

      {/* Performers */}
      {performers.length > 0 && (
        <section className="mb-14">
          <SectionHeader
            label="Performers"
            heading={`${performers.length} performer${performers.length === 1 ? '' : 's'}`}
          />
          <p className="-mt-2 mb-5 max-w-2xl text-xs text-zinc-500">
            Working stunt performers and doubles. Each profile lists
            the actor or actors they regularly double for, the
            disciplines they&apos;re registered in, and their primary
            company affiliation.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {performers.map((p) => (
              <PersonCard key={p.slug} person={p} />
            ))}
          </ul>
        </section>
      )}

      {/* Roadmap notice */}
      <aside className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          What's next
        </p>
        Phase 3 introduces the sequence-level rigging detail layer —
        named coordinator + performer + rig data tied to the films
        you already see elsewhere on CineCanon. Phase 4 ships the
        lineage graph (who taught whom) on each performer's page.
      </aside>
    </>
  );
}

function PersonCard({ person }: { person: Awaited<ReturnType<typeof listStuntPeople>>[number] }) {
  const visibleDisciplines = (person.stunt_disciplines ?? []).slice(0, 3);
  const extra = (person.stunt_disciplines ?? []).length - visibleDisciplines.length;
  const unionShort = person.performer_union
    ? UNION_LABELS[person.performer_union] ?? person.performer_union
    : null;

  return (
    <li>
      <Link
        href={`/crew/${person.slug}`}
        className="group flex h-full gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-red-900/50 transition-colors"
      >
        <PersonAvatar
          slug={person.slug}
          displayName={person.display_name}
          profilePath={person.profile_path}
          size="md"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="line-clamp-1 font-serif text-base text-zinc-100 group-hover:text-amber-400">
              {person.display_name}
            </span>
            {unionShort && (
              <span className="shrink-0 rounded border border-zinc-800 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-zinc-500">
                {unionShort}
              </span>
            )}
          </div>
          {person.primary_role && (
            <p className="mt-0.5 text-xs text-zinc-400">{person.primary_role}</p>
          )}

          {/* Phase 8/9/12 — primary doubled actor with the production
              count, sourced from stunt_doubling_credits rather than
              the legacy doubles_for text array. Falls back to the
              text array when the relational data isn't seeded yet. */}
          {person.top_doubled_name ? (
            <p className="mt-1 truncate text-[11px] text-zinc-300">
              <span className="text-zinc-500">Doubles</span>{' '}
              <span className="text-zinc-100">{person.top_doubled_name}</span>
              {person.top_doubled_count > 1 && (
                <span className="ml-1 font-mono text-[10px] text-amber-500/80">
                  ×{person.top_doubled_count}
                </span>
              )}
              {person.doubling_credit_count > person.top_doubled_count && (
                <span className="ml-1 text-zinc-500">
                  +{person.doubling_credit_count - person.top_doubled_count} other
                </span>
              )}
            </p>
          ) : (
            person.doubles_for.length > 0 && (
              <p className="mt-1 truncate text-[11px] text-zinc-500">
                Doubles for {person.doubles_for.slice(0, 3).join(', ').replace(/-/g, ' ')}
              </p>
            )
          )}

          {/* Phase 8 — primary company affiliation from
              stunt_company_members. Surfaces as a compact link
              under the doubling line. */}
          {person.primary_company_name && (
            <p className="mt-0.5 truncate text-[10px] text-zinc-500">
              <span className="uppercase tracking-wide">Member</span>{' '}
              <span className="text-zinc-300">{person.primary_company_name}</span>
              {person.member_company_slugs.length > 1 && (
                <span className="ml-1 text-zinc-600">
                  +{person.member_company_slugs.length - 1}
                </span>
              )}
            </p>
          )}

          {visibleDisciplines.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {visibleDisciplines.map((d) => (
                <span
                  key={d}
                  className="rounded bg-red-950/30 border border-red-900/40 px-1.5 py-0.5 text-[10px] text-red-200/90"
                >
                  {discipline(d)}
                </span>
              ))}
              {extra > 0 && (
                <span className="text-[10px] text-zinc-600">+{extra}</span>
              )}
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}
