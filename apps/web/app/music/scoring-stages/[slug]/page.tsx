import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getScoringStageBySlug, listProductionsForScoringStage } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const revalidate = 86400;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const stage = await getScoringStageBySlug(db, slug);
  if (!stage) return { title: 'Scoring stage' };
  return {
    title: `${stage.name} — scoring stage`,
    description: stage.notes
      ?? `Film scores recorded at ${stage.name}${stage.facility_name ? ` (${stage.facility_name})` : ''}${stage.city ? `, ${stage.city}${stage.country ? ', ' + stage.country : ''}` : ''}.`,
    alternates: { canonical: `${siteUrl()}/music/scoring-stages/${stage.slug}` },
  };
}

export default async function ScoringStageDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const stage = await getScoringStageBySlug(db, slug);
  if (!stage) notFound();

  const productions = await listProductionsForScoringStage(db, stage.id, 300);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Place',
          '@id': absoluteUrl(`/music/scoring-stages/${stage.slug}`),
          name: stage.name,
          address: stage.city || stage.country ? {
            '@type': 'PostalAddress',
            addressLocality: stage.city ?? undefined,
            addressCountry: stage.country ?? undefined,
          } : undefined,
          url: stage.website ?? undefined,
        }}
      />

      <PageHero
        eyebrow="Music · scoring stage"
        title={stage.name}
        accent="amber"
        description={stage.notes ?? `${stage.name}${stage.facility_name ? ` at ${stage.facility_name}` : ''} — credited on ${stage.production_count} film score${stage.production_count === 1 ? '' : 's'} in the archive.`}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Score credits" value={stage.production_count} />
            <PageHeroStat label="Orchestra seats" value={stage.capacity_orchestra ?? '—'} />
            <PageHeroStat label="Chorus seats" value={stage.capacity_chorus ?? '—'} />
            <PageHeroStat label="Location" value={[stage.city, stage.country].filter(Boolean).join(', ') || '—'} />
          </div>
        }
      />

      {(stage.facility_name || stage.website) && (
        <p className="mb-6 text-sm text-zinc-400">
          {stage.facility_name && <span>{stage.facility_name}</span>}
          {stage.facility_name && stage.website && <span className="mx-2 text-zinc-600">·</span>}
          {stage.website && (
            <a href={stage.website} target="_blank" rel="noopener noreferrer"
               className="text-amber-400 hover:text-amber-300">
              {stage.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} <span aria-hidden="true">↗</span>
            </a>
          )}
        </p>
      )}

      <section className="mb-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-zinc-100">
            Scored here
            <span className="ml-2 font-sans text-xs font-normal text-zinc-500">
              ({productions.length} production{productions.length === 1 ? '' : 's'})
            </span>
          </h2>
          <Link href="/music/scoring-stages" className="text-xs text-zinc-400 hover:text-amber-400">
            All scoring stages →
          </Link>
        </div>
        {productions.length === 0 ? (
          <p className="text-sm text-zinc-500">No film-score credits attached yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {productions.map((p) => (
              <li key={p.slug}
                  className="flex flex-wrap items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <span className="font-mono text-xs text-zinc-500">{p.release_year ?? '—'}</span>
                <Link href={`/films/${p.slug}`} className="text-zinc-200 hover:text-amber-400">
                  {p.title}
                </Link>
                {p.notes && (
                  <span className="ml-2 text-xs text-zinc-500">— {p.notes}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-zinc-500">
        Score awards live on{' '}
        <Link href="/awards/craft/score" className="text-amber-400 hover:text-amber-300">/awards/craft/score</Link>.
      </p>
    </>
  );
}
