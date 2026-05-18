import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listVpVolumes } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Virtual production volumes',
  description:
    'LED-volume / ICVFX stages used in feature + episodic production — Stagecraft (ILM), MARS (Pinewood), Volume 51 (Disney), Lux Machina (Trilith), and the rest. With pitch, dimensions, tracking + render engine.',
  alternates: { canonical: `${siteUrl()}/vfx/volumes` },
};

// New table 0078 — keep dynamic until schema applied on prod.
export const dynamic = 'force-dynamic';

export default async function VpVolumesPage() {
  const volumes = await listVpVolumes(db, { withCreditsOnly: false, limit: 200 });
  const totalCredits = volumes.reduce((s, v) => s + v.production_count, 0);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/vfx/volumes'),
          name: 'Virtual production volumes — CineCanon',
        }}
      />
      <PageHero
        eyebrow="VFX · virtual production"
        title="LED volumes"
        accent="purple"
        description="Virtual production / ICVFX stages used in feature + episodic. The roster Disney, ILM, NEP, Lux Machina, and Sky operate — with the technical specs (LED pitch, wall dimensions, tracking system, render engine, color pipeline) the working pros consult."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Volumes catalogued" value={volumes.length} />
            <PageHeroStat label="Production credits" value={totalCredits} />
            <PageHeroStat label="Operators" value={new Set(volumes.map((v) => v.operator)).size} />
          </div>
        }
      />

      <nav aria-label="VFX sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/vfx" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">← VFX hub</Link>
        <Link href="/vfx/volumes" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">LED volumes</Link>
        <Link href="/awards/craft/visual-effects" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">VFX awards</Link>
      </nav>

      {volumes.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          No LED volumes catalogued yet. The seed lands once migration 0078 is applied
          on the production Neon DB.
        </div>
      ) : (
        <div
          tabIndex={0}
          role="region"
          aria-label="LED volumes ranked by credit count"
          className="overflow-x-auto rounded border border-zinc-800 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-zinc-950"
        >
          <table className="w-full text-sm">
            <thead className="border-b border-zinc-800 bg-zinc-900/60 text-[10px] uppercase tracking-wide text-zinc-300">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-normal">Volume</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Operator</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">LED</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Wall (w×h)</th>
                <th scope="col" className="px-3 py-2 text-left font-normal">Tracking + Render</th>
                <th scope="col" className="px-3 py-2 text-right font-normal">Productions</th>
              </tr>
            </thead>
            <tbody>
              {volumes.map((v) => (
                <tr key={v.slug} className="border-b border-zinc-900 hover:bg-zinc-900/40">
                  <td className="px-3 py-2">
                    <Link href={`/vfx/volumes/${v.slug}`} className="font-medium text-zinc-100 hover:text-amber-400">
                      {v.name}
                    </Link>
                    {v.city && <div className="text-[11px] text-zinc-500">{v.city}{v.country ? `, ${v.country}` : ''}</div>}
                  </td>
                  <td className="px-3 py-2 text-zinc-300">{v.operator ?? '—'}</td>
                  <td className="px-3 py-2 text-zinc-400">
                    {v.led_brand ? (
                      <>
                        {v.led_brand.replace(/ROE Visual /, 'ROE ').replace(/Visual /, '')}
                        {v.led_pitch_mm && <span className="ml-1 text-[10px] text-zinc-500">({Number(v.led_pitch_mm)}mm)</span>}
                      </>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-xs text-zinc-400">
                    {v.wall_width_m && v.wall_height_m
                      ? `${Number(v.wall_width_m)}×${Number(v.wall_height_m)}m`
                      : '—'}
                    {v.ceiling_present && <span className="ml-1 text-[10px] text-amber-400/70">+ceil</span>}
                  </td>
                  <td className="px-3 py-2 text-zinc-400 text-xs">
                    {v.tracking_system && <div>{v.tracking_system}</div>}
                    {v.render_engine && <div className="text-zinc-500">{v.render_engine}</div>}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-amber-400">{v.production_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-zinc-500">
        Spec sources: operator datasheets, fxguide deep-dives, befores & afters articles,
        manufacturer ROE / Mo-Sys / Stype product pages. Pitch + wall dimensions reflect
        the most commonly-credited configuration; some volumes are reconfigurable.
      </p>
    </>
  );
}
