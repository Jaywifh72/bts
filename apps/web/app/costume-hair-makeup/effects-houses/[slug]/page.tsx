import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getMakeupEffectsHouseBySlug, listProductionsForMakeupHouse } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { FacilityProfile } from '@/components/facility/FacilityProfile';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  let h: Awaited<ReturnType<typeof getMakeupEffectsHouseBySlug>> = null;
  try { h = await getMakeupEffectsHouseBySlug(db, slug); } catch { /* */ }
  if (!h) return { title: 'Makeup effects house' };
  return {
    title: `${h.name} — makeup effects house`,
    description: h.summary ?? h.tagline ?? `${h.name} — practical effects + creature shop.`,
    alternates: { canonical: `${siteUrl()}/costume-hair-makeup/effects-houses/${h.slug}` },
  };
}

export default async function MakeupEffectsHouseDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  let h: Awaited<ReturnType<typeof getMakeupEffectsHouseBySlug>> = null;
  type ProductionRow = Awaited<ReturnType<typeof listProductionsForMakeupHouse>>[number];
  let productions: ProductionRow[] = [];
  try {
    h = await getMakeupEffectsHouseBySlug(db, slug);
    if (h) productions = [...(await listProductionsForMakeupHouse(db, h.id, 200))];
  } catch (err) {
    console.warn('[makeup_effects_houses] detail query failed', err);
  }
  if (!h) notFound();

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'Organization',
        '@id': absoluteUrl(`/costume-hair-makeup/effects-houses/${h.slug}`),
        name: h.name, url: h.website ?? undefined,
        foundingDate: h.founded_year?.toString(),
      }} />

      <PageHero
        eyebrow="Makeup · effects house"
        title={h.name}
        accent="amber"
        description={h.tagline ?? h.summary?.split('\n')[0] ?? `${h.name} — practical effects fabrication shop.`}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Production credits" value={h.production_count} />
            <PageHeroStat label="Founded" value={h.founded_year ?? '—'} />
            <PageHeroStat label="Headcount" value={h.employee_count ? `~${h.employee_count}` : '—'} />
            <PageHeroStat label="Location" value={[h.city, h.country].filter(Boolean).join(', ') || '—'} />
          </div>
        }
      />

      {((h.founders?.length ?? 0) > 0 || (h.specialties?.length ?? 0) > 0) && (
        <section className="mb-6">
          {h.founders && h.founders.length > 0 && (
            <div className="mb-2">
              <h2 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Founders</h2>
              <p className="text-sm text-zinc-300">{h.founders.join(', ')}</p>
            </div>
          )}
          {h.specialties && h.specialties.length > 0 && (
            <div>
              <h2 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Specialties</h2>
              <ul className="flex flex-wrap gap-1.5">
                {h.specialties.map((s) => (
                  <li key={s} className="rounded border border-zinc-700 bg-zinc-900/40 px-2 py-0.5 text-xs text-zinc-300">{s}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <FacilityProfile
        summary={h.summary} tagline={h.tagline}
        headquarters={h.headquarters} parent_company={h.parent_company}
        employee_count={h.employee_count}
        website={h.website} careers_url={h.careers_url} reel_url={h.reel_url}
        wikidata_id={h.wikidata_id} references={h.references}
        curated_by={h.curated_by} curated_by_url={h.curated_by_url}
        last_verified_at={h.last_verified_at}
      />

      <section className="mb-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-zinc-100">
            Credited on
            <span className="ml-2 font-sans text-xs font-normal text-zinc-500">
              ({productions.length} production{productions.length === 1 ? '' : 's'})
            </span>
          </h2>
          <Link href="/costume-hair-makeup/effects-houses" className="text-xs text-zinc-400 hover:text-amber-400">All effects houses →</Link>
        </div>
        {productions.length === 0 ? (
          <p className="text-sm text-zinc-500">No production credits attached yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {productions.map((p) => (
              <li key={p.slug} className="flex flex-wrap items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <span className="font-mono text-xs text-zinc-500">{p.release_year ?? '—'}</span>
                <Link href={`/films/${p.slug}`} className="text-zinc-200 hover:text-amber-400">{p.title}</Link>
                {p.credited_use && <span className="text-xs text-zinc-400">— {p.credited_use}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
