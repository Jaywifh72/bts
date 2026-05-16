import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import {
  db,
  listStuntCompanies,
  listStuntSchools,
  getStuntsArchiveStats,
  getTopDoubledActors,
  listFeaturedSequences,
  listRiggingTechniques,
  listSafetyBulletins,
} from '@bts/db';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { PersonAvatar } from '@/components/people/PersonAvatar';
import { posterUrl } from '@/lib/tmdb-image';

export const metadata: Metadata = {
  title: 'Stunts',
  description:
    'Stunt coordinators, performers, schools and the companies that run modern action choreography. The most under-documented department in working cinema, catalogued.',
};

// QA — stunts roster is slow-moving; daily revalidate.
export const revalidate = 86400;

export default async function StuntsIndexPage() {
  const [companies, schools, stats, topDoubled, featuredSequences, allRigging, allBulletins] = await Promise.all([
    listStuntCompanies(db),
    listStuntSchools(db),
    getStuntsArchiveStats(db),
    getTopDoubledActors(db, 8),
    listFeaturedSequences(db, 6),
    listRiggingTechniques(db),
    listSafetyBulletins(db),
  ]);
  const totalDoublings = topDoubled.reduce((acc, r) => acc + r.doubling_count, 0);

  return (
    <>
      <PageHero
        eyebrow="Archive"
        title="Stunts"
        accent="red"
        description={
          'The most under-documented department in working cinema. ' +
          'CineCanon catalogues the coordinators, performers, companies and ' +
          'schools that move the camera through action — with cited references ' +
          'and a long-running editorial commitment to the craft.'
        }
        stats={
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4 lg:grid-cols-7">
            <PageHeroStat label="Companies" value={stats.companies.toLocaleString()} />
            <PageHeroStat label="Schools" value={stats.schools.toLocaleString()} />
            <PageHeroStat label="Coordinators" value={stats.coordinators.toLocaleString()} />
            <PageHeroStat label="Sequences" value={stats.sequences.toLocaleString()} />
            <PageHeroStat label="Doublings" value={totalDoublings.toLocaleString()} />
            <PageHeroStat label="Rigs" value={allRigging.length.toLocaleString()} />
            <PageHeroStat label="Bulletins" value={allBulletins.length.toLocaleString()} />
          </div>
        }
        actions={
          <>
            <Link href="/stunts/people" className="text-amber-400 hover:underline">
              Browse all performers + coordinators →
            </Link>
            <Link href="/stunts/sequences" className="text-amber-400 hover:underline">
              Browse sequence-level rigging detail →
            </Link>
            <Link href="/stunts/lineage" className="text-amber-400 hover:underline">
              Mentor → protégé lineage graph →
            </Link>
            <Link href="/stunts/rigging" className="text-amber-400 hover:underline">
              Rigging glossary →
            </Link>
            <Link href="/stunts/safety" className="text-amber-400 hover:underline">
              SAG-AFTRA safety bulletins →
            </Link>
          </>
        }
      />

      {/* UX-audit second pass — Marquee sequences leads (working
          coordinator entry point); doubled-actors panel is moved below
          as a "by-the-way" curiosity. */}
      {featuredSequences.length > 0 && (
        <section className="mb-14">
          <SectionHeader
            label="Featured"
            heading="Marquee sequences"
          />
          <p className="-mt-2 mb-5 max-w-2xl text-xs text-zinc-500">
            The deepest-credited sequences in the archive — rigging
            breakdown, safety bulletin observance, and the doubler /
            coordinator credits all rendered on the detail page.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {featuredSequences.map((s) => {
              const poster = posterUrl(s.production_poster_path, 'w154');
              return (
                <li key={`${s.production_slug}/${s.slug}`}>
                  <Link
                    href={`/stunts/sequences/${s.production_slug}/${s.slug}`}
                    className="group flex h-full gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-red-900/50 hover:bg-red-950/10 transition-colors"
                  >
                    <span className="block h-20 w-14 shrink-0 overflow-hidden rounded border border-zinc-800 bg-zinc-900">
                      {poster ? (
                        <Image
                          src={poster}
                          alt={s.production_title}
                          width={56}
                          height={80}
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                        {s.production_title}
                        {s.production_release_year && ` · ${s.production_release_year}`}
                      </span>
                      <span className="mt-0.5 block font-serif text-sm text-zinc-100 group-hover:text-amber-400">
                        {s.name}
                      </span>
                      <span className="mt-1 block text-[10px] uppercase tracking-wide text-zinc-500">
                        {s.credit_count > 0 && (
                          <span className="font-mono text-amber-500/70">
                            {s.credit_count} credit{s.credit_count === 1 ? '' : 's'}
                          </span>
                        )}
                        {s.discipline_tags.length > 0 && (
                          <span className="ml-2 text-zinc-500">
                            {s.discipline_tags.slice(0, 3).join(' · ')}
                          </span>
                        )}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Most-doubled actors — moved below sequences (working coord
          entry point). This panel is curiosity / cross-cut material,
          not a primary navigation surface. */}
      {topDoubled.length > 0 && (
        <section className="mb-14">
          <SectionHeader
            label="Cross-cut"
            heading="Most-doubled actors"
          />
          <p className="-mt-2 mb-5 max-w-2xl text-xs text-zinc-500">
            Actors with the deepest documented stunt-doubling
            coverage in the archive. Each row links to the actor's
            crew page where their full doubling-by history renders.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {topDoubled.map((row) => (
                <li key={row.actor_slug}>
                  <Link
                    href={`/crew/${row.actor_slug}`}
                    className="group flex h-full gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-red-900/50 hover:bg-red-950/10 transition-colors"
                  >
                    <PersonAvatar
                      slug={row.actor_slug}
                      displayName={row.actor_name}
                      profilePath={row.actor_profile_path}
                      size="md"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-serif text-sm text-zinc-100 group-hover:text-amber-400">
                        {row.actor_name}
                      </span>
                      <span className="block truncate text-[11px] text-zinc-500">
                        Doubled by{' '}
                        <span className="text-zinc-300">{row.primary_doubler_name}</span>
                      </span>
                      <span className="mt-0.5 inline-flex items-baseline gap-1 text-[10px] uppercase tracking-wide">
                        <span className="font-mono text-amber-500/80">
                          {row.doubling_count}
                        </span>
                        <span className="text-zinc-500">
                          {row.doubling_count === 1 ? 'film' : 'films'}
                        </span>
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </section>
      )}

      {/* Section: companies */}
      <section className="mb-14">
        <SectionHeader
          label="Stunt companies"
          heading={`${companies.length} ${companies.length === 1 ? 'company' : 'companies'}`}
        />
        <p className="-mt-2 mb-5 max-w-2xl text-xs text-zinc-500">
          Coordination and performer collectives — both peer-elected
          historic associations and modern boutique action-design shops.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((c) => (
            <Link
              key={c.slug}
              href={`/stunts/companies/${c.slug}`}
              className="group flex gap-4 rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-red-900/50 transition-colors"
            >
              <BrandLogo
                slug={c.slug}
                website={c.website}
                name={c.name}
                size="md"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-base text-zinc-50 group-hover:text-amber-400">
                  {c.name}
                </h2>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                  {c.headquarters ?? c.country ?? ''}
                  {c.founded_year ? ` · Est. ${c.founded_year}` : ''}
                </p>
                {c.tagline && (
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{c.tagline}</p>
                )}
                {c.specialties.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {c.specialties.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300"
                      >
                        {s}
                      </span>
                    ))}
                    {c.specialties.length > 4 && (
                      <span className="text-[10px] text-zinc-600">
                        +{c.specialties.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Section: schools */}
      <section className="mb-14">
        <SectionHeader
          label="Training"
          heading={`${schools.length} ${schools.length === 1 ? 'school' : 'schools'}`}
        />
        <p className="-mt-2 mb-5 max-w-2xl text-xs text-zinc-500">
          The training pipelines that feed the working stunt-performer
          pool — high-fall progression, precision driving, and BSR /
          SAG-AFTRA preparation.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schools.map((s) => (
            <Link
              key={s.slug}
              href={`/stunts/schools/${s.slug}`}
              className="group flex gap-4 rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-amber-900/50 transition-colors"
            >
              <BrandLogo
                slug={s.slug}
                website={s.website}
                name={s.name}
                size="md"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <h2 className="font-serif text-base text-zinc-50 group-hover:text-amber-400">
                  {s.name}
                </h2>
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                  {s.headquarters ?? s.country ?? ''}
                  {s.founded_year ? ` · Est. ${s.founded_year}` : ''}
                </p>
                {s.tagline && (
                  <p className="mt-1 line-clamp-2 text-xs text-zinc-400">{s.tagline}</p>
                )}
                {s.curriculum_disciplines.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.curriculum_disciplines.slice(0, 4).map((d) => (
                      <span
                        key={d}
                        className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-300"
                      >
                        {d}
                      </span>
                    ))}
                    {s.curriculum_disciplines.length > 4 && (
                      <span className="text-[10px] text-zinc-600">
                        +{s.curriculum_disciplines.length - 4}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Editorial summary — what's in the archive today, plus a
          plain pointer to the editorial gap (people-side dedup +
          more sequences) for transparency. */}
      <aside className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          What's in here
        </p>
        Companies + member rosters · stunt-people with doubling
        history and lineage · sequence-level rigging breakdown
        cross-linked to a {allRigging.length}-entry rigging glossary
        · {allBulletins.length} indexed SAG-AFTRA Safety Bulletins ·
        every production page surfaces its stunt department where
        the archive has it.
      </aside>
    </>
  );
}
