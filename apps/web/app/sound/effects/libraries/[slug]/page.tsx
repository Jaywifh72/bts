import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getSoundLibraryBySlug, listProductionsForSoundLibrary } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { FacilityProfile } from '@/components/facility/FacilityProfile';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const revalidate = 86400;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const lib = await getSoundLibraryBySlug(db, slug);
  if (!lib) return { title: 'Sound library' };
  return {
    title: `${lib.name} — sound library`,
    description: lib.summary
      ?? `${lib.name}${lib.publisher ? ` (${lib.publisher})` : ''} — third-party SFX library credited on ${lib.production_count} production${lib.production_count === 1 ? '' : 's'}.`,
    alternates: { canonical: `${siteUrl()}/sound/effects/libraries/${lib.slug}` },
  };
}

export default async function SoundLibraryDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const lib = await getSoundLibraryBySlug(db, slug);
  if (!lib) notFound();

  const productions = await listProductionsForSoundLibrary(db, lib.id, 200);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': absoluteUrl(`/sound/effects/libraries/${lib.slug}`),
          name: lib.name,
          url: lib.website_url ?? undefined,
          foundingDate: lib.founded_year?.toString(),
        }}
      />

      <PageHero
        eyebrow="Sound · library"
        title={lib.name}
        accent="blue"
        description={lib.summary
          ?? `${lib.name}${lib.publisher ? ` (${lib.publisher})` : ''} — credited on ${lib.production_count} production${lib.production_count === 1 ? '' : 's'}.`}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Production credits" value={lib.production_count} />
            <PageHeroStat label="Publisher" value={lib.publisher ?? '—'} />
            <PageHeroStat label="Country" value={lib.country ?? '—'} />
            <PageHeroStat label="Founded" value={lib.founded_year ?? '—'} />
          </div>
        }
      />

      <FacilityProfile
        summary={lib.summary}
        tagline={lib.tagline}
        headquarters={lib.headquarters}
        parent_company={lib.parent_company}
        employee_count={lib.employee_count}
        website_url={lib.website_url}
        wikidata_id={lib.wikidata_id}
        references={lib.references}
        curated_by={lib.curated_by}
        curated_by_url={lib.curated_by_url}
        last_verified_at={lib.last_verified_at}
      />

      {lib.website_url && (
        <p className="mb-6 text-sm">
          <a href={lib.website_url} target="_blank" rel="noopener noreferrer"
             className="text-amber-400 hover:text-amber-300">
            {lib.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')} <span aria-hidden="true">↗</span>
          </a>
        </p>
      )}

      {lib.specialties && lib.specialties.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Specialties</h2>
          <ul className="flex flex-wrap gap-1.5">
            {lib.specialties.map((s) => (
              <li key={s} className="rounded border border-zinc-700 bg-zinc-900/40 px-2 py-0.5 text-xs text-zinc-300">
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-zinc-100">
            Credited on
            <span className="ml-2 font-sans text-xs font-normal text-zinc-500">
              ({productions.length} production{productions.length === 1 ? '' : 's'})
            </span>
          </h2>
          <Link href="/sound/effects/libraries" className="text-xs text-zinc-400 hover:text-amber-400">
            All libraries →
          </Link>
        </div>
        {productions.length === 0 ? (
          <p className="text-sm text-zinc-500">No production credits attached yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {productions.map((p) => (
              <li key={p.slug}
                  className="flex flex-wrap items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <span className="font-mono text-xs text-zinc-500">{p.release_year ?? '—'}</span>
                <Link href={`/films/${p.slug}`} className="text-zinc-200 hover:text-amber-400">{p.title}</Link>
                {p.credited_use && (
                  <span className="text-xs text-zinc-400">— {p.credited_use}</span>
                )}
                {p.credited_in && (
                  <span className="ml-auto text-[10px] uppercase tracking-wide text-zinc-500">
                    {p.credited_in}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
