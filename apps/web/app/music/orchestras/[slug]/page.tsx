import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getRecordingOrchestraBySlug, listScoresForOrchestra } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { FacilityProfile } from '@/components/facility/FacilityProfile';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  let o: Awaited<ReturnType<typeof getRecordingOrchestraBySlug>> = null;
  try { o = await getRecordingOrchestraBySlug(db, slug); } catch { /* missing */ }
  if (!o) return { title: 'Recording orchestra' };
  return {
    title: `${o.name}${o.short_name ? ` (${o.short_name})` : ''} — recording orchestra`,
    description: o.summary ?? o.tagline ?? `${o.name} — ${o.city}-based ensemble credited on ${o.score_count} film score${o.score_count === 1 ? '' : 's'}.`,
    alternates: { canonical: `${siteUrl()}/music/orchestras/${o.slug}` },
  };
}

export default async function OrchestraDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  let o: Awaited<ReturnType<typeof getRecordingOrchestraBySlug>> = null;
  type ScoreRow = Awaited<ReturnType<typeof listScoresForOrchestra>>[number];
  let scores: ScoreRow[] = [];
  try {
    o = await getRecordingOrchestraBySlug(db, slug);
    if (o) {
      const rows = await listScoresForOrchestra(db, o.id, 200);
      scores = [...rows];
    }
  } catch (err) {
    console.warn('[orchestras] detail query failed', err);
  }
  if (!o) notFound();

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'MusicGroup',
        '@id': absoluteUrl(`/music/orchestras/${o.slug}`),
        name: o.name, alternateName: o.short_name ?? undefined,
        foundingDate: o.founded_year?.toString(),
        url: o.website ?? undefined,
        address: o.city || o.country ? {
          '@type': 'PostalAddress',
          addressLocality: o.city ?? undefined,
          addressCountry: o.country ?? undefined,
        } : undefined,
      }} />

      <PageHero
        eyebrow="Music · orchestra"
        title={o.name}
        accent="amber"
        description={o.tagline ?? o.summary?.split('\n')[0] ?? `${o.name} — ${[o.city, o.country].filter(Boolean).join(', ') || 'orchestra'}.`}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Score credits" value={o.score_count} />
            <PageHeroStat label="Ensemble size" value={o.ensemble_size ?? '—'} />
            <PageHeroStat label="Founded" value={o.founded_year ?? '—'} />
            <PageHeroStat label="Location" value={[o.city, o.country].filter(Boolean).join(', ') || '—'} />
          </div>
        }
      />

      {(o.music_director || o.primary_stage_slug) && (
        <section className="mb-6">
          <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
            {o.music_director && (
              <div><dt className="text-zinc-500">Music director</dt><dd className="text-zinc-200">{o.music_director}</dd></div>
            )}
            {o.primary_stage_slug && (
              <div>
                <dt className="text-zinc-500">Primary scoring stage</dt>
                <dd>
                  <Link href={`/music/scoring-stages/${o.primary_stage_slug}`} className="text-amber-400 hover:text-amber-300">
                    {o.primary_stage_name}
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <FacilityProfile
        summary={o.summary} tagline={o.tagline}
        parent_company={o.parent_company}
        website={o.website} careers_url={o.careers_url}
        wikidata_id={o.wikidata_id}
        references={o.references}
        curated_by={o.curated_by} curated_by_url={o.curated_by_url}
        last_verified_at={o.last_verified_at}
      />

      <section className="mb-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-zinc-100">
            Scored
            <span className="ml-2 font-sans text-xs font-normal text-zinc-500">
              ({scores.length} score{scores.length === 1 ? '' : 's'})
            </span>
          </h2>
          <Link href="/music/orchestras" className="text-xs text-zinc-400 hover:text-amber-400">All orchestras →</Link>
        </div>
        {scores.length === 0 ? (
          <p className="text-sm text-zinc-500">No score credits attached yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {scores.map((s) => (
              <li key={`${s.production_slug}-${s.composer_slug}`} className="flex flex-wrap items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <span className="font-mono text-xs text-zinc-500">{s.release_year ?? '—'}</span>
                <Link href={`/films/${s.production_slug}`} className="text-zinc-200 hover:text-amber-400">{s.production_title}</Link>
                <span className="text-zinc-600">·</span>
                <Link href={`/crew/${s.composer_slug}`} className="text-xs text-amber-400 hover:text-amber-300">{s.composer_name}</Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
