import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listWalkthroughs } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Walkthroughs',
  description:
    'Beat-by-beat breakdowns of edits, music cues, and VFX shots — pinned to the production, cited, and confidence-graded.',
  alternates: { canonical: `${siteUrl()}/walkthroughs` },
};

export const revalidate = 3600;

const KIND_LABELS: Record<string, string> = {
  'edit-scene': 'Edit walkthroughs',
  'music-cue': 'Cue listening guides',
  'vfx-shot': 'VFX shot breakdowns',
};

function fmtDuration(s: number | null): string {
  if (!s) return '—';
  const m = Math.floor(s / 60);
  const r = s % 60;
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r}s`;
}

export default async function WalkthroughsIndexPage() {
  const walkthroughs = await listWalkthroughs(db, { limit: 500 });
  const byKind = new Map<string, typeof walkthroughs>();
  for (const w of walkthroughs) {
    const bucket = byKind.get(w.kind) ?? [];
    bucket.push(w);
    byKind.set(w.kind, bucket);
  }
  const kinds = Array.from(byKind.keys()).sort();

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/walkthroughs'),
          name: 'Walkthroughs — CineCanon',
          description:
            'Edit, music-cue, and VFX-shot beat-by-beat breakdowns across the curated CineCanon archive.',
        }}
      />
      <PageHero
        eyebrow="Craft · walkthroughs"
        title="Walkthroughs"
        accent="blue"
        description="Pick any scene, cue, or VFX shot from the curated archive and read it beat-by-beat — timecoded, credit-chained, and cited."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Walkthroughs" value={walkthroughs.length} />
            <PageHeroStat label="Kinds" value={kinds.length} />
            <PageHeroStat
              label="Most recent"
              value={walkthroughs[0]?.release_year ?? 0}
            />
          </div>
        }
      />

      {kinds.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No walkthroughs published yet. Check back as the editorial backlog ships.
        </p>
      ) : (
        kinds.map((kind) => (
          <section key={kind} className="mb-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">
                {KIND_LABELS[kind] ?? kind}
              </h2>
              <span className="text-xs text-zinc-500">
                {byKind.get(kind)!.length} entry
                {byKind.get(kind)!.length === 1 ? '' : 'ies'}
              </span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byKind.get(kind)!.map((w) => (
                <li key={w.slug}>
                  <Link
                    href={`/walkthroughs/${w.slug}`}
                    className="group block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60"
                  >
                    <p className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
                      {w.headline}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {w.production_title}
                      {w.release_year ? ` (${w.release_year})` : ''}
                      {w.scene_label ? ` · ${w.scene_label}` : ''}
                    </p>
                    <p className="mt-1 text-[10px] uppercase tracking-wide text-zinc-500">
                      {fmtDuration(w.duration_s)}
                      {w.lead_name ? ` · ${w.lead_name}` : ''}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
