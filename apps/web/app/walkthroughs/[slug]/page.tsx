import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getWalkthroughBySlug } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

const KIND_LABELS: Record<string, string> = {
  'edit-scene': 'Edit walkthrough',
  'music-cue': 'Cue listening guide',
  'vfx-shot': 'VFX shot breakdown',
};

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  let w: Awaited<ReturnType<typeof getWalkthroughBySlug>> = null;
  try { w = await getWalkthroughBySlug(db, slug); } catch {}
  if (!w) return { title: 'Walkthrough' };
  return {
    title: `${w.headline} — ${w.production_title}`,
    description: w.summary?.split('\n\n')[0]?.slice(0, 160) ?? `${KIND_LABELS[w.kind] ?? w.kind} on ${w.production_title}.`,
    alternates: { canonical: `${siteUrl()}/walkthroughs/${slug}` },
  };
}

function fmtDuration(s: number | null): string {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`;
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let w: Awaited<ReturnType<typeof getWalkthroughBySlug>> = null;
  try { w = await getWalkthroughBySlug(db, slug); } catch (e) { console.warn(e); }
  if (!w) notFound();

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', '@id': absoluteUrl(`/walkthroughs/${slug}`), headline: w.headline }} />

      <PageHero
        eyebrow={KIND_LABELS[w.kind] ?? w.kind}
        title={w.headline}
        accent="amber"
        description={`${w.production_title}${w.release_year ? ` (${w.release_year})` : ''}${w.scene_label ? ` — ${w.scene_label}` : ''}`}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Scene length" value={fmtDuration(w.duration_s)} />
            <PageHeroStat label="Beats" value={w.beats.length} />
            <PageHeroStat label="Lead" value={w.lead_credit ?? '—'} />
            <PageHeroStat label="Tags" value={w.tags.length} />
          </div>
        }
      />

      <nav aria-label="Walkthrough links" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href={`/films/${w.production_slug}`} className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          {w.production_title} →
        </Link>
        {w.lead_slug && (
          <Link href={`/crew/${w.lead_slug}`} className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
            {w.lead_name} →
          </Link>
        )}
      </nav>

      {w.summary && (
        <section className="mb-8 max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-300">
          {w.summary.split(/\n\n+/).map((para, i) => (<p key={i}>{para}</p>))}
        </section>
      )}

      {w.body && (
        <section className="mb-10 max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-300">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Editorial</h2>
          {w.body.split(/\n\n+/).map((para, i) => (<p key={i}>{para}</p>))}
        </section>
      )}

      <section className="mb-12">
        <h2 className="mb-3 font-serif text-xl text-zinc-100">
          Beat-by-beat
          <span className="ml-2 font-sans text-xs font-normal text-zinc-500">({w.beats.length})</span>
        </h2>
        {w.beats.length === 0 ? (
          <p className="text-sm text-zinc-500">Beats not yet annotated.</p>
        ) : (
          <ol className="space-y-2">
            {w.beats.map((b, i) => (
              <li key={i} className="grid grid-cols-[6rem_1fr] gap-3 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <span className="font-mono text-xs text-amber-400">{b.timecode}</span>
                <div>
                  <div className="flex flex-wrap items-baseline gap-2">
                    {b.beat_kind && (
                      <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-zinc-500">{b.beat_kind}</span>
                    )}
                    <span className="text-sm text-zinc-100">{b.label}</span>
                  </div>
                  {b.notes && <p className="mt-1 text-xs leading-relaxed text-zinc-400">{b.notes}</p>}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      {w.tags.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Tags</h2>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {w.tags.map((t) => (
              <span key={t} className="rounded border border-zinc-700 bg-zinc-900/40 px-2 py-0.5 text-zinc-300">{t}</span>
            ))}
          </div>
        </section>
      )}

      {w.references.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">References</h2>
          <ul className="space-y-1.5 text-sm">
            {w.references.map((r, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-amber-400">{r.title}</a>
                {r.publication && <span className="text-xs text-zinc-500">— {r.publication}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
