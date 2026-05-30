import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import {
  db,
  listPeople,
  getPersonBySlug,
  getPersonFilmography,
  getEquipmentUsedByPerson,
  getCollaboratorsForPerson,
  getKnownForByPerson,
  getAwardsForPerson,
  getStyleProfileForPerson,
  listPartnershipsForPerson,
  getScoreWorksForComposer,
  getStuntContextForPerson,
  getStuntLineage,
  getDoublingHistoryForPerson,
  getDoublingHistoryForActor,

  getStuntPersonReel,
  getClaimsBundleForEntity,
} from '@bts/db';
import { FilmographyTable } from '@/components/people/FilmographyTable';
import { EquipmentUsedTable } from '@/components/people/EquipmentUsedTable';
import { CareerStats } from '@/components/people/CareerStats';
import { StyleProfile } from '@/components/people/StyleProfile';
import { PartnershipsList } from '@/components/people/PartnershipsList';
import { PersonAvatar } from '@/components/people/PersonAvatar';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EntityProvenanceFooter } from '@/components/ui/EntityProvenanceFooter';
import { EntityClaimsList } from '@/components/ui/EntityClaimsList';
import { JsonLd, buildPersonJsonLd } from '@/lib/jsonLd';
import { profileUrl, posterUrl } from '@/lib/tmdb-image';
import { pickPrimaryRole } from '@/lib/primary-role';
import { orgLabel } from '@/lib/award-labels';
import { BookmarkButton } from '@/components/ui/BookmarkButton';

interface Props { params: Promise<{ slug: string }> }

// QA — crew detail pages change slowly; daily revalidation is plenty.
export const revalidate = 86400;

// Next.js 16 / Turbopack production builds error with "Page changed
// from static to dynamic at runtime" when generateStaticParams() returns
// [] AND the route reads headers/cookies (safeAuth does). Declaring the
// route explicitly dynamic avoids the static-tree → dynamic-runtime
// mismatch. Pages still cache for 24h per `revalidate` above.
export const dynamic = 'force-dynamic';

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const person = await getPersonBySlug(db, params.slug);
  if (!person) return {};
  // E-39 — oEmbed autodiscovery (matches the films/[slug] pattern).
  const pageUrl = `/crew/${person.slug}`;

  // SEO — thin-content gate. ~12k crew pages exist (TMDb-imported), most
  // with no biography and a tiny credit count. Google's Helpful Content
  // classifier treats this as "scaled content abuse" and dilutes the
  // domain. Noindex any page that doesn't yet meet the editorial bar.
  //
  // Rule: index when EITHER a hand-written biography exists OR the person
  // has accumulated meaningful credits (≥3 filmography rows). Follow stays
  // true so internal links continue to flow PageRank to richer pages.
  const filmography = await getPersonFilmography(db, params.slug).catch(() => []);
  const hasBio = !!person.biography && person.biography.trim().length >= 80;
  const hasCredits = filmography.length >= 3;
  const isIndexable = hasBio || hasCredits;

  return {
    title: person.display_name,
    description: person.biography ?? undefined,
    robots: isIndexable ? undefined : { index: false, follow: true },
    openGraph: {
      title: person.display_name,
      description: person.biography ?? undefined,
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title: person.display_name,
      description: person.biography ?? undefined,
    },
    alternates: {
      canonical: pageUrl,
      types: {
        'application/json+oembed': `/oembed?url=${encodeURIComponent(pageUrl)}`,
      },
    },
  };
}

export default async function CrewDetailPage(props: Props) {
  const params = await props.params;
  const [person, filmography, equipment, collaborators, knownFor, awards, scoreWorks] = await Promise.all([
    getPersonBySlug(db, params.slug),
    getPersonFilmography(db, params.slug),
    getEquipmentUsedByPerson(db, params.slug),
    getCollaboratorsForPerson(db, params.slug, 12),
    getKnownForByPerson(db, params.slug, 4),
    getAwardsForPerson(db, params.slug),
    // Composer-side score works. Empty for non-composers; the render
    // path below hides the section entirely when zero rows.
    getScoreWorksForComposer(db, params.slug),
  ]);
  // Style profile — migration 0085. Defensive against missing table on prod.
  let styleProfile: Awaited<ReturnType<typeof getStyleProfileForPerson>> = null;
  try { styleProfile = await getStyleProfileForPerson(db, params.slug); } catch { /* table missing */ }
  // Partnerships — migration 0086. Same defensive guard.
  type PartnershipRow = Awaited<ReturnType<typeof listPartnershipsForPerson>>[number];
  let partnerships: PartnershipRow[] = [];
  try {
    const rows = await listPartnershipsForPerson(db, params.slug);
    partnerships = [...rows];
  } catch { /* table missing */ }
  if (!person) notFound();
  // F2 — fetch the polymorphic claims bundle for this person.
  const claimsBundle = await getClaimsBundleForEntity(db, 'person', person.id, person.slug);

  // Resolve stunt-section relations for the stunt block. Only triggers
  // a roundtrip when at least one of the slug arrays is populated.
  const hasStuntData =
    (person.stunt_disciplines?.length ?? 0) > 0 ||
    (person.doubles_for?.length ?? 0) > 0 ||
    (person.training_school_slugs?.length ?? 0) > 0 ||
    person.stunt_company_slug != null ||
    person.performer_union != null ||
    person.height_cm != null ||
    person.weight_kg != null;
  // Phase-8 doubling history runs for every crew page (not gated
  // on hasStuntData) since the *actor* side of a doubling — the
  // person being doubled — won't have stunt fields populated but
  // still benefits from showing "doubled by X on these films".
  const [stuntContext, stuntLineage, doublingAsDoubler, doublingAsDoubled, stuntReel] =
    await Promise.all([
      hasStuntData
        ? getStuntContextForPerson(
            db,
            person.doubles_for ?? [],
            person.training_school_slugs ?? [],
            person.stunt_company_slug ?? null,
          )
        : Promise.resolve(null),
      hasStuntData
        ? getStuntLineage(db, person.slug, person.mentor_person_slugs ?? [])
        : Promise.resolve(null),
      getDoublingHistoryForPerson(db, person.slug),
      getDoublingHistoryForActor(db, person.slug),
      // Phase 21 — pull stunt-related videos + keyframes from every
      // production this person has stunt credits on. Self-empties
      // for non-stunt people, so calling unconditionally is safe.
      getStuntPersonReel(db, person.slug),
    ]);

  const primaryRole = pickPrimaryRole(filmography);

  const jsonLd = buildPersonJsonLd({
    slug: person.slug,
    name: person.display_name,
    primaryRole,
    // E-41 — schema.org expansion.
    birthYear: person.birth_year,
    deathYear: person.death_year,
    nationality: person.nationality,
    imdbId: person.imdb_id,
    tmdbPersonId: person.tmdb_person_id,
    wikidataId: person.wikidata_id,
    alumniOf: person.film_schools ?? undefined,
    memberOf: person.member_societies ?? undefined,
    awards: awards.map((a) => ({
      name: `${
        a.award_org === 'academy_awards' ? 'Academy Award' :
        a.award_org === 'bafta' ? 'BAFTA' :
        a.award_org === 'asc_award' ? 'ASC Award' :
        a.award_org
      } — ${a.category}`,
      year: a.year,
      isWinner: a.is_winner,
    })),
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <article>
        <header className="mb-8 flex gap-5">
          <PersonAvatar
            slug={person.slug}
            displayName={person.display_name}
            profilePath={person.profile_path}
            size="xl"
          />
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Crew</p>
            <div className="mt-1 flex items-baseline gap-3">
              <h1 className="font-serif text-4xl text-zinc-50">{person.display_name}</h1>
              <BookmarkButton
                kind="crew"
                slug={person.slug}
                title={person.display_name}
                subtitle={primaryRole ?? undefined}
                href={`/crew/${person.slug}`}
              />
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-zinc-400">
              {primaryRole && <span>{primaryRole}</span>}
              {primaryRole && person.nationality && <span className="text-zinc-600">·</span>}
              {person.nationality && <span>{person.nationality}</span>}
              {person.birth_year && (
                <>
                  <span className="text-zinc-600">·</span>
                  <span>{person.birth_year}{person.death_year ? `–${person.death_year}` : ''}</span>
                </>
              )}
            </div>
            {person.biography && (
              <p className="mt-3 max-w-2xl text-sm text-zinc-400">{person.biography}</p>
            )}
            <div className="mt-2 flex flex-wrap gap-3 text-xs text-zinc-500">
              {person.imdb_id && (
                <a
                  href={`https://www.imdb.com/name/${person.imdb_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400"
                >
                  IMDb ↗
                </a>
              )}
              {person.tmdb_person_id && (
                <a
                  href={`https://www.themoviedb.org/person/${person.tmdb_person_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400"
                >
                  TMDb ↗
                </a>
              )}
              {person.wikidata_id && (
                <a
                  href={`https://www.wikidata.org/wiki/${person.wikidata_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400"
                >
                  Wikidata ↗
                </a>
              )}
            </div>
            {person.aliases && person.aliases.length > 0 && (
              <div className="mt-1 text-xs text-zinc-600">
                Also known as: {person.aliases.slice(0, 3).join(', ')}
                {person.aliases.length > 3 && ` (+${person.aliases.length - 3} more)`}
              </div>
            )}
            {/* E-25 — alumni-of from Wikidata P69. */}
            {person.film_schools && person.film_schools.length > 0 && (
              <div className="mt-1 text-xs text-zinc-600">
                Educated at: {person.film_schools.slice(0, 3).join('; ')}
                {person.film_schools.length > 3 && ` (+${person.film_schools.length - 3} more)`}
              </div>
            )}
            {person.member_societies && person.member_societies.length > 0 && (
              <div className="mt-1 text-xs text-zinc-600">
                Member of: {person.member_societies.join(', ')}
              </div>
            )}
          </div>
        </header>

        {/* Stunt section — surfaces phase-2 fields (disciplines, union,
            doubles-for, training, primary company affiliation). Only
            renders when at least one stunt field is populated. */}
        {hasStuntData && (
          <section className="mb-8 rounded border border-red-900/40 bg-red-950/10 p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-red-400/80">Stunts</p>
              <Link href="/stunts/people" className="text-[10px] uppercase tracking-wide text-zinc-500 hover:text-amber-400">
                All performers →
              </Link>
            </div>

            {/* Vitals row — union + height + weight where curated */}
            {(person.performer_union || person.height_cm != null || person.weight_kg != null) && (
              <div className="mb-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {person.performer_union && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500">Union</span>
                    <span className="ml-2 text-zinc-200">{person.performer_union}</span>
                  </div>
                )}
                {person.height_cm != null && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500">Height</span>
                    <span className="ml-2 font-mono text-zinc-200">
                      {person.height_cm} cm
                      <span className="ml-1 text-zinc-500">
                        ({Math.floor(person.height_cm / 30.48)}&apos;{Math.round((person.height_cm / 2.54) % 12)}&quot;)
                      </span>
                    </span>
                  </div>
                )}
                {person.weight_kg != null && (
                  <div>
                    <span className="text-[10px] uppercase tracking-wide text-zinc-500">Weight</span>
                    <span className="ml-2 font-mono text-zinc-200">
                      {Number(person.weight_kg).toFixed(0)} kg
                      <span className="ml-1 text-zinc-500">
                        ({Math.round(Number(person.weight_kg) * 2.20462)} lb)
                      </span>
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Disciplines */}
            {(person.stunt_disciplines?.length ?? 0) > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">Disciplines</p>
                <div className="flex flex-wrap gap-1.5">
                  {person.stunt_disciplines.map((d: string) => (
                    <span
                      key={d}
                      className="rounded border border-red-900/40 bg-red-950/30 px-2 py-0.5 text-xs text-red-200/90"
                    >
                      {d.replace(/_/g, ' ')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Doubles-for + primary company + training schools — three-column */}
            <div className="grid gap-4 sm:grid-cols-3">
              {(person.doubles_for?.length ?? 0) > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">Doubles for</p>
                  <ul className="space-y-1 text-sm">
                    {person.doubles_for.map((slug: string) => {
                      const known = stuntContext?.doubles.find((d) => d.slug === slug);
                      return (
                        <li key={slug}>
                          {known ? (
                            <Link
                              href={`/crew/${known.slug}`}
                              className="text-zinc-200 hover:text-amber-400"
                            >
                              {known.display_name}
                            </Link>
                          ) : (
                            <span className="text-zinc-300 capitalize">{slug.replace(/-/g, ' ')}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {stuntContext?.company && (
                <div>
                  <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">Primary affiliation</p>
                  <Link
                    href={`/stunts/companies/${stuntContext.company.slug}`}
                    className="text-sm text-zinc-200 hover:text-amber-400"
                  >
                    {stuntContext.company.name}
                  </Link>
                </div>
              )}

              {(stuntContext?.schools.length ?? 0) > 0 && (
                <div>
                  <p className="mb-1.5 text-[10px] uppercase tracking-wide text-zinc-500">Training</p>
                  <ul className="space-y-1 text-sm">
                    {stuntContext!.schools.map((s) => (
                      <li key={s.slug}>
                        <Link
                          href={`/stunts/schools/${s.slug}`}
                          className="text-zinc-200 hover:text-amber-400"
                        >
                          {s.name}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Phase-4 lineage — mentors (forward) and protégés
                (inverse). Self-hides when both are empty so we never
                render an awkward "no lineage" panel for performers
                outside the documented chains. */}
            {((stuntLineage?.mentors.length ?? 0) > 0 ||
              (stuntLineage?.protégés.length ?? 0) > 0) && (
              <div className="mt-5 border-t border-red-900/30 pt-4">
                <div className="mb-2 flex items-baseline justify-between gap-2">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-red-400/80">Lineage</p>
                  <Link
                    href="/stunts/lineage"
                    className="text-[10px] uppercase tracking-wide text-zinc-500 hover:text-amber-400"
                  >
                    Full graph →
                  </Link>
                </div>
                <p className="mb-3 max-w-2xl text-xs text-zinc-500">
                  Stunt coordination is overwhelmingly an apprentice
                  craft — picked up on second-unit floors, not in
                  schools. The line of working coordinators that
                  brought this performer up, and the next generation
                  they brought up themselves.
                </p>

                <div className="grid gap-5 sm:grid-cols-2">
                  {(stuntLineage?.mentors.length ?? 0) > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">
                        Mentors
                      </p>
                      <ul className="space-y-2">
                        {stuntLineage!.mentors.map((m) => (
                            <li key={m.slug}>
                              <Link
                                href={`/crew/${m.slug}`}
                                className="group flex items-center gap-3 rounded p-1 hover:bg-red-950/20"
                              >
                                <PersonAvatar
                                  slug={m.slug}
                                  displayName={m.display_name}
                                  profilePath={m.profile_path}
                                  size="sm"
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm text-zinc-100 group-hover:text-amber-400">
                                    {m.display_name}
                                  </span>
                                  {m.primary_role && (
                                    <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                                      {m.primary_role}
                                    </span>
                                  )}
                                </span>
                              </Link>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}

                  {(stuntLineage?.protégés.length ?? 0) > 0 && (
                    <div>
                      <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">
                        Protégés
                      </p>
                      <ul className="space-y-2">
                        {stuntLineage!.protégés.map((p) => (
                            <li key={p.slug}>
                              <Link
                                href={`/crew/${p.slug}`}
                                className="group flex items-center gap-3 rounded p-1 hover:bg-red-950/20"
                              >
                                <PersonAvatar
                                  slug={p.slug}
                                  displayName={p.display_name}
                                  profilePath={p.profile_path}
                                  size="sm"
                                />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm text-zinc-100 group-hover:text-amber-400">
                                    {p.display_name}
                                  </span>
                                  {p.primary_role && (
                                    <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
                                      {p.primary_role}
                                    </span>
                                  )}
                                </span>
                              </Link>
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Phase-8 doubling history — productions where this person
            served as someone's stunt double. */}
        {doublingAsDoubler.length > 0 && (
          <section className="mb-8 rounded border border-red-900/40 bg-red-950/10 p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-red-400/80">
                Doubling history
              </p>
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                {doublingAsDoubler.length} {doublingAsDoubler.length === 1 ? 'credit' : 'credits'}
              </span>
            </div>
            <p className="mb-4 max-w-2xl text-xs text-zinc-500">
              Productions where {person.display_name.split(' ')[0]} served as
              the credited stunt double for a named actor. The kind
              tag distinguishes a primary lead-actor double from
              fight-/driver-/aerial-specific work.
            </p>
            <ul className="space-y-2">
              {doublingAsDoubler.map((d) => (
                <li
                  key={d.id}
                  className="rounded border border-zinc-800 bg-zinc-900/60 p-3"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-[10px] text-zinc-500">
                      {d.release_year ?? '—'}
                    </span>
                    <Link
                      href={`/films/${d.production_slug}`}
                      className="font-serif text-sm text-zinc-100 hover:text-amber-400"
                    >
                      {d.production_title}
                    </Link>
                    <span className="rounded border border-red-900/40 bg-red-950/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-200/90">
                      {d.kind.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    Doubled{' '}
                    <Link
                      href={`/crew/${d.doubled_slug}`}
                      className="text-zinc-200 hover:text-amber-400"
                    >
                      {d.doubled_name}
                    </Link>
                    {d.character_name && <span className="text-zinc-500"> as {d.character_name}</span>}
                  </div>
                  {d.notes && (
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">{d.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Phase-8 — inverse: when an actor's crew page is viewed,
            surface the stuntpeople who've doubled them. */}
        {doublingAsDoubled.length > 0 && (
          <section className="mb-8 rounded border border-red-900/40 bg-red-950/10 p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-red-400/80">
                Doubled by
              </p>
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                {doublingAsDoubled.length} {doublingAsDoubled.length === 1 ? 'credit' : 'credits'}
              </span>
            </div>
            <p className="mb-4 max-w-2xl text-xs text-zinc-500">
              Stuntpeople who have served as {person.display_name.split(' ')[0]}'s
              double on screen, with the production and the kind of doubling work.
            </p>
            <ul className="space-y-2">
              {doublingAsDoubled.map((d) => (
                <li
                  key={d.id}
                  className="rounded border border-zinc-800 bg-zinc-900/60 p-3"
                >
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-[10px] text-zinc-500">
                      {d.release_year ?? '—'}
                    </span>
                    <Link
                      href={`/films/${d.production_slug}`}
                      className="font-serif text-sm text-zinc-100 hover:text-amber-400"
                    >
                      {d.production_title}
                    </Link>
                    <span className="rounded border border-red-900/40 bg-red-950/30 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-red-200/90">
                      {d.kind.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-zinc-400">
                    Doubled by{' '}
                    <Link
                      href={`/crew/${d.doubler_slug}`}
                      className="text-zinc-200 hover:text-amber-400"
                    >
                      {d.doubler_name}
                    </Link>
                    {d.character_name && <span className="text-zinc-500"> · {d.character_name}</span>}
                  </div>
                  {d.notes && (
                    <p className="mt-1 text-xs leading-relaxed text-zinc-500">{d.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Phase 21 — Selected work reel: stunt-related videos +
            keyframes from every production this person has stunt
            credits on. Self-hides when nothing is available so
            non-stunt people aren't penalised. */}
        {(stuntReel.videos.length > 0 || stuntReel.keyframes.length > 0) && (
          <section className="mb-8 rounded border border-red-900/40 bg-red-950/10 p-5">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.2em] text-red-400/80">
                Selected work
              </p>
              <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                {stuntReel.videos.length} video{stuntReel.videos.length === 1 ? '' : 's'}
                {stuntReel.keyframes.length > 0 &&
                  ` · ${stuntReel.keyframes.length} image${stuntReel.keyframes.length === 1 ? '' : 's'}`}
              </span>
            </div>
            <p className="mb-4 max-w-2xl text-xs text-zinc-500">
              Stunt-categorised videos and curated key frames from
              productions where {person.display_name.split(' ')[0]} has a
              stunt credit. Pulled across {' '}
              <span className="font-mono text-zinc-400">crew_assignments</span>,{' '}
              <span className="font-mono text-zinc-400">stunt_sequence_credits</span>, and{' '}
              <span className="font-mono text-zinc-400">stunt_doubling_credits</span> — the
              same data that drives this person&apos;s filmography rows above.
            </p>

            {stuntReel.videos.length > 0 && (
              <div className="mb-4">
                <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">
                  Videos
                </p>
                <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stuntReel.videos.map((v) => (
                    <li
                      key={v.id}
                      className="overflow-hidden rounded border border-zinc-800 bg-zinc-900/60 hover:border-red-900/50 transition-colors"
                    >
                      <a href={v.url} target="_blank" rel="noopener noreferrer" className="block">
                        <div className="relative aspect-video w-full bg-zinc-950">
                          {v.thumbnail_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            (<img
                              src={v.thumbnail_url}
                              alt={v.title}
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />)
                          ) : null}
                        </div>
                        <div className="p-2">
                          <p className="line-clamp-2 text-xs leading-snug text-zinc-200">
                            {v.title}
                          </p>
                          <div className="mt-1 flex items-baseline justify-between gap-2 text-[10px] uppercase tracking-wide text-zinc-500">
                            <span className="truncate">{v.production_title}</span>
                            <span
                              className={`shrink-0 rounded px-1 ${
                                v.category === 'stunts'
                                  ? 'bg-red-950/40 text-red-300'
                                  : 'bg-zinc-800 text-amber-400'
                              }`}
                            >
                              {v.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                        </div>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {stuntReel.keyframes.length > 0 && (
              <div>
                <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-500">
                  Key frames
                </p>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {stuntReel.keyframes.map((k) => (
                    <li key={k.id}>
                      <Link
                        href={`/films/${k.production_slug}`}
                        className="group block overflow-hidden rounded border border-zinc-800 hover:border-red-900/50"
                      >
                        <div className="relative aspect-[16/9] w-full bg-zinc-950">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={k.image_url}
                            alt={k.caption ?? `Frame from ${k.production_title}`}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="border-t border-zinc-800 bg-zinc-900/60 px-2 py-1.5">
                          <p className="truncate text-[10px] uppercase tracking-wide text-zinc-500 group-hover:text-amber-400">
                            {k.production_title}
                          </p>
                          {k.caption && (
                            <p className="mt-0.5 line-clamp-1 text-[11px] text-zinc-400">
                              {k.caption}
                            </p>
                          )}
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* T3-2 — Career stats panel. Computed from filmography + collaborators. */}
        <CareerStats filmography={filmography} collaborators={collaborators} />

        {/* "Learn from the greats" style profile — migration 0085. Renders
            philosophy, signature techniques, tools of choice, tells, process
            notes, influences, career arc, sourced references. Self-hides
            when no profile exists for this person. */}
        <StyleProfile profile={styleProfile} />

        {/* Long-term partnerships — migration 0086. */}
        <PartnershipsList partnerships={partnerships} currentSlug={params.slug} />

        {/* T3-5 — awards this person has won or been nominated for, joined
            back to the production they're for. Self-hides when none. */}
        {awards.length > 0 && (
          <div className="mb-8">
            <SectionHeader
              label="Recognition"
              heading={`Awards (${awards.filter((a) => a.is_winner).length} won, ${awards.length} total)`}
            />
            <ul className="mt-2 space-y-1.5 text-sm">
              {awards.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline gap-x-2">
                  <span
                    className={`font-mono text-xs ${a.is_winner ? 'text-amber-400' : 'text-zinc-500'}`}
                    title={a.is_winner ? 'Won' : 'Nominated'}
                  >
                    {a.is_winner ? 'WON' : 'NOM'}
                  </span>
                  <span className="text-zinc-300">{orgLabel(a.award_org)}</span>
                  <span className="text-zinc-500">·</span>
                  <span className="text-zinc-200">{a.category}</span>
                  <span className="text-zinc-500">·</span>
                  <span className="font-mono text-xs text-zinc-500">{a.year}</span>
                  <span className="text-zinc-600">→</span>
                  <Link
                    href={`/films/${a.production_slug}`}
                    className="text-zinc-300 hover:text-amber-400"
                  >
                    {a.production_title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Composer dossier — score works credited to this person. Hidden
            when no rows (i.e. for non-composers). One row per scored
            film with composer-credit; links to the score deep-dive. */}
        {scoreWorks.length > 0 && (
          <div className="mb-8">
            <SectionHeader
              label="Score works"
              heading={`Scored ${scoreWorks.length} film${scoreWorks.length === 1 ? '' : 's'}`}
            />
            <ul className="mt-2 space-y-1.5 text-sm">
              {scoreWorks.map((sw) => (
                <li key={sw.production_slug} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono text-xs text-zinc-500">{sw.release_year ?? '—'}</span>
                  <Link
                    href={`/films/${sw.production_slug}`}
                    className="text-zinc-200 hover:text-amber-400"
                  >
                    {sw.production_title}
                  </Link>
                  {sw.scoring_stage_slug && (
                    <>
                      <span className="text-zinc-500">·</span>
                      <Link
                        href={`/music/scoring-stages/${sw.scoring_stage_slug}`}
                        className="text-xs text-zinc-400 hover:text-amber-400"
                      >
                        {sw.scoring_stage_name}
                      </Link>
                    </>
                  )}
                  {sw.recording_orchestra && (
                    <span className="text-xs text-zinc-500">— {sw.recording_orchestra}</span>
                  )}
                  <Link
                    href={`/music/scores/${sw.production_slug}`}
                    className="ml-auto text-[10px] uppercase tracking-wide text-amber-400/70 hover:text-amber-400"
                  >
                    score →
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* T3-3 — Known for highlight (top-rated productions) */}
        {knownFor.length > 0 && (
          <div className="mb-8">
            <SectionHeader label="Highlights" heading="Known for" />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {knownFor.map((k) => {
                const poster = posterUrl(k.poster_path, 'w185');
                return (
                  <Link
                    key={k.slug}
                    href={`/films/${k.slug}`}
                    className="group flex gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-600 transition-colors"
                  >
                    <div
                      className="relative shrink-0 overflow-hidden rounded bg-zinc-950"
                      style={{ width: 56, aspectRatio: '2/3' }}
                    >
                      {poster && (
                        <Image src={poster} unoptimized alt="" fill sizes="56px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="line-clamp-2 text-sm font-medium text-zinc-100 group-hover:text-amber-400">
                        {k.title}
                      </div>
                      <div className="mt-0.5 text-xs text-zinc-500">
                        {k.release_year ?? '—'}
                      </div>
                      <div className="mt-1 text-xs text-zinc-500">{k.role_name}</div>
                      {k.vote_average && (
                        <div className="mt-1 text-xs text-amber-400">
                          ★ {Number(k.vote_average).toFixed(1)}
                        </div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <SectionHeader label="Career" heading="Filmography" />
        <FilmographyTable rows={filmography} />

        {equipment.length > 0 && (
          <div id="equipment" className="mt-10 scroll-mt-6">
            <SectionHeader label="Loadout" heading="Equipment used" />
            <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-500">
              Cameras, lenses, and lighting attributed to scenes on productions
              this person crewed in a camera-department role. Counts aggregate
              across all such productions.
            </p>
            <EquipmentUsedTable rows={equipment} />
          </div>
        )}

        {collaborators.length > 0 && (
          <div id="collaborators" className="mt-10 scroll-mt-6">
            <SectionHeader label="Network" heading="Frequent collaborators" />
            <p className="-mt-2 mb-3 max-w-2xl text-xs text-zinc-500">
              People who have worked on the most productions alongside {person.display_name}.
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {collaborators.map((c) => (
                <Link
                  key={c.slug}
                  href={`/crew/${c.slug}`}
                  className="group flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-600 transition-colors"
                >
                  <PersonAvatar
                    slug={c.slug}
                    displayName={c.display_name}
                    profilePath={c.profile_path}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm text-zinc-100 group-hover:text-amber-400">
                      {c.display_name}
                    </div>
                    <div className="text-xs text-zinc-500">
                      {c.primary_role ?? '—'} · {c.shared_productions} shared
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
        <EntityClaimsList
          claims={claimsBundle.claims}
          sourcesByClaimId={claimsBundle.sourcesByClaimId}
          evidenceByClaimId={claimsBundle.evidenceByClaimId}
          eyebrow="Claims"
          heading="Source-backed facts about this person"
          anchorId="claims"
        />
        <div className="mt-12 border-t border-zinc-800 pt-6">
          <EntityProvenanceFooter
            entitySlug={person.slug}
            pageUrl={`/crew/${person.slug}`}
            lastVerifiedAt={person.last_verified_at}
            dataTier={person.data_tier}
            curatedBy={person.curated_by}
            curatedByUrl={person.curated_by_url}
            lastCuratedReview={person.last_curated_review}
          />
        </div>
      </article>
    </>
  );
}
