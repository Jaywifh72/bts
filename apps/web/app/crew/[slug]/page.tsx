import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db, listPeople, getPersonBySlug, getPersonFilmography, getEquipmentUsedByPerson } from '@bts/db';
import { FilmographyTable } from '@/components/people/FilmographyTable';
import { EquipmentUsedTable } from '@/components/people/EquipmentUsedTable';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { JsonLd, buildPersonJsonLd } from '@/lib/jsonLd';

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  const rows = await listPeople(db);
  return rows.map((r) => ({ slug: r.slug }));
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
  const [person, filmography, equipment] = await Promise.all([
    getPersonBySlug(db, params.slug),
    getPersonFilmography(db, params.slug),
    getEquipmentUsedByPerson(db, params.slug),
  ]);
  if (!person) notFound();

  // Use the most-credited role as jobTitle (first row in filmography is most recent;
  // simpler: just take first role from the list).
  const primaryRole = filmography[0]?.role_name ?? null;

  const jsonLd = buildPersonJsonLd({
    slug: person.slug,
    name: person.display_name,
    primaryRole,
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <article>
        <header className="mb-8">
          <p className="text-xs uppercase tracking-widest text-zinc-500">Crew</p>
          <h1 className="mt-1 font-serif text-4xl text-zinc-50">{person.display_name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-sm text-zinc-400">
            {person.nationality && <span>{person.nationality}</span>}
            {person.birth_year && <span>{person.birth_year}{person.death_year ? `–${person.death_year}` : ''}</span>}
          </div>
          {person.biography && (
            <p className="mt-3 max-w-2xl text-zinc-400">{person.biography}</p>
          )}
          {person.imdb_id && (
            <a
              href={`https://www.imdb.com/name/${person.imdb_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-xs text-amber-400 hover:underline"
            >
              IMDb ↗
            </a>
          )}
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
      </article>
    </>
  );
}
