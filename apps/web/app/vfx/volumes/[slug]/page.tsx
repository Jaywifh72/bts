import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getVpVolumeBySlug, listProductionsForVpVolume } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  let v: Awaited<ReturnType<typeof getVpVolumeBySlug>> = null;
  try { v = await getVpVolumeBySlug(db, slug); } catch { /* table missing */ }
  if (!v) return { title: 'LED volume' };
  return {
    title: `${v.name} — LED volume`,
    description: v.summary
      ?? `${v.name}${v.facility_name ? ` at ${v.facility_name}` : ''} — virtual production LED volume operated by ${v.operator ?? 'an unspecified operator'}.`,
    alternates: { canonical: `${siteUrl()}/vfx/volumes/${v.slug}` },
  };
}

export default async function VpVolumeDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  // Defensive against missing 0078 schema on prod.
  let v: Awaited<ReturnType<typeof getVpVolumeBySlug>> = null;
  type ProductionRow = Awaited<ReturnType<typeof listProductionsForVpVolume>>[number];
  let productions: ProductionRow[] = [];
  try {
    v = await getVpVolumeBySlug(db, slug);
    if (v) {
      const rows = await listProductionsForVpVolume(db, v.id, 200);
      productions = [...rows];
    }
  } catch (err) {
    console.warn('[vp_volumes] detail query failed (table missing?)', err);
  }
  if (!v) notFound();

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Place',
          '@id': absoluteUrl(`/vfx/volumes/${v.slug}`),
          name: v.name,
          address: v.city || v.country ? {
            '@type': 'PostalAddress',
            addressLocality: v.city ?? undefined,
            addressCountry: v.country ?? undefined,
          } : undefined,
          url: v.website_url ?? undefined,
        }}
      />

      <PageHero
        eyebrow="VFX · volume"
        title={v.name}
        accent="purple"
        description={v.summary
          ?? `${v.name}${v.facility_name ? ` at ${v.facility_name}` : ''} — credited on ${v.production_count} production${v.production_count === 1 ? '' : 's'}.`}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Productions" value={v.production_count} />
            <PageHeroStat label="LED pitch" value={v.led_pitch_mm ? `${Number(v.led_pitch_mm)} mm` : '—'} />
            <PageHeroStat label="Wall (w×h)" value={v.wall_width_m && v.wall_height_m ? `${Number(v.wall_width_m)}×${Number(v.wall_height_m)}m` : '—'} />
            <PageHeroStat label="Year built" value={v.completion_year ?? '—'} />
          </div>
        }
      />

      <section className="mb-8">
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Tech stack</h2>
        <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="text-zinc-500">Operator</dt><dd className="text-zinc-200">{v.operator ?? '—'}</dd></div>
          <div><dt className="text-zinc-500">Facility</dt><dd className="text-zinc-200">{v.facility_name ?? '—'}</dd></div>
          <div><dt className="text-zinc-500">Location</dt><dd className="text-zinc-200">{[v.city, v.country].filter(Boolean).join(', ') || '—'}</dd></div>
          <div><dt className="text-zinc-500">LED brand</dt><dd className="text-zinc-200">{v.led_brand ?? '—'}</dd></div>
          <div><dt className="text-zinc-500">Ceiling</dt><dd className="text-zinc-200">
            {v.ceiling_present
              ? (v.ceiling_height_m ? `Yes (${Number(v.ceiling_height_m)} m)` : 'Yes')
              : 'No'}
          </dd></div>
          <div><dt className="text-zinc-500">Tracking</dt><dd className="text-zinc-200">{v.tracking_system ?? '—'}</dd></div>
          <div><dt className="text-zinc-500">Render engine</dt><dd className="text-zinc-200">{v.render_engine ?? '—'}</dd></div>
          <div><dt className="text-zinc-500">Color pipeline</dt><dd className="text-zinc-200">{v.color_pipeline ?? '—'}</dd></div>
          <div><dt className="text-zinc-500">Atmos-capable</dt><dd className="text-zinc-200">{v.atmos_capable ? 'Yes' : 'No'}</dd></div>
        </dl>
        {v.website_url && (
          <p className="mt-3 text-sm">
            <a href={v.website_url} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300">
              {v.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')} <span aria-hidden="true">↗</span>
            </a>
          </p>
        )}
      </section>

      <section className="mb-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-zinc-100">
            Shot here
            <span className="ml-2 font-sans text-xs font-normal text-zinc-500">
              ({productions.length} production{productions.length === 1 ? '' : 's'})
            </span>
          </h2>
          <Link href="/vfx/volumes" className="text-xs text-zinc-400 hover:text-amber-400">
            All volumes →
          </Link>
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
