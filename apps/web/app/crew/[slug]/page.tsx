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
} from '@bts/db';
import { FilmographyTable } from '@/components/people/FilmographyTable';
import { EquipmentUsedTable } from '@/components/people/EquipmentUsedTable';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { JsonLd, buildPersonJsonLd } from '@/lib/jsonLd';
import { profileUrl } from '@/lib/tmdb-image';

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  // Don't pre-render 11k crew pages — let Next render on-demand for the long
  // tail. The handful of curated profiles are still warm via the homepage.
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const person = await getPersonBySlug(db, params.slug);
  if (!person) return {};
  return {
    title: person.display_name,
    description: person.biography ?? undefined,
    openGraph: {
      title: person.display_name,
      description: person.biography ?? undefined,
      type: 'profile',
    },
  };
}

export default async function CrewDetailPage({ params }: Props) {
  const [person, filmography, equipment, collaborators] = await Promise.all([
    getPersonBySlug(db, params.slug),
    getPersonFilmography(db, params.slug),
    getEquipmentUsedByPerson(db, params.slug),
    getCollaboratorsForPerson(db, params.slug, 12),
  ]);
  if (!person) notFound();

  const primaryRole = filmography[0]?.role_name ?? null;
  const photo = profileUrl(person.profile_path, 'w185');
  const initials = person.display_name
    .split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

  const jsonLd = buildPersonJsonLd({
    slug: person.slug,
    name: person.display_name,
    primaryRole,
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <article>
        <header className="mb-8 flex gap-5">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-800">
            {photo ? (
              <Image src={photo} alt="" fill sizes="96px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-2xl font-medium text-zinc-500">
                {initials || '?'}
              </div>
            )}
          </div>
          <div className="flex-1">
            <p className="text-xs uppercase tracking-widest text-zinc-500">Crew</p>
            <h1 className="mt-1 font-serif text-4xl text-zinc-50">{person.display_name}</h1>
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
          </div>
        </header>

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
              {collaborators.map((c) => {
                const cPhoto = profileUrl(c.profile_path, 'w185');
                const cInitials = c.display_name
                  .split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
                return (
                  <Link
                    key={c.slug}
                    href={`/crew/${c.slug}`}
                    className="group flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-600 transition-colors"
                  >
                    <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                      {cPhoto ? (
                        <Image src={cPhoto} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-xs font-medium text-zinc-500">
                          {cInitials || '?'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-zinc-100 group-hover:text-amber-400">
                        {c.display_name}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {c.primary_role ?? '—'} · {c.shared_productions} shared
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
