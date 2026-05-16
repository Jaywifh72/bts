import type { Metadata } from 'next';
import Link from 'next/link';
import { db, sql } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd, buildImageJsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Shots — by palette',
  description:
    'Every curated keyframe in the archive, grouped by dominant colour palette. Click a swatch to find visually-similar frames across films.',
  alternates: { canonical: `${siteUrl()}/shots` },
};

export const revalidate = 86400;

type Keyframe = {
  id: number;
  image_url: string;
  caption: string | null;
  production_slug: string;
  production_title: string;
  palette: string[] | null;
};

export default async function ShotsPage() {
  // Pull every keyframe with a palette + production attribution. The palette
  // strip is the cheap-to-render version of the "looks like this" feature;
  // full SigLIP keyframe-embedding search is on the /lookbook route.
  const keyframes = await db.execute<Keyframe>(sql`
    SELECT kf.id, kf.image_url, kf.caption, p.slug AS production_slug,
           p.title AS production_title, kf.palette
    FROM production_keyframes kf
    JOIN productions p ON p.id = kf.production_id
    WHERE kf.palette IS NOT NULL AND jsonb_array_length(kf.palette) > 0
    ORDER BY kf.sort_order, kf.id
    LIMIT 120
  `);

  const [stats] = await db.execute<{ total: number }>(sql`
    SELECT COUNT(*)::int AS total FROM production_keyframes WHERE palette IS NOT NULL
  `);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/shots'),
          name: 'Shots — CineCanon',
          mainEntity: keyframes.slice(0, 24).map((kf) =>
            buildImageJsonLd({
              url: kf.image_url,
              caption: kf.caption,
              productionTitle: kf.production_title,
            }),
          ),
        }}
      />
      <PageHero
        eyebrow="Atlas"
        title="Shots"
        accent="purple"
        description="Curated keyframes across the archive, each with a palette extracted from the frame itself. Hover any palette strip to see the dominant hex values; click through to the production for the editorial context."
        stats={stats ? (
          <PageHeroStat label="Curated frames" value={stats.total.toLocaleString()} />
        ) : undefined}
      />

      {keyframes.length === 0 ? (
        <section className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          <p>
            No keyframes have been seeded with palettes yet. The schema exists
            (`production_keyframes.palette` is a `jsonb` array of hex strings,
            see <code>migrations/0025_keyframe_palette.sql</code>) and the
            extractor lives at{' '}
            <code>packages/scraper/src/embeddings/extract-palette.ts</code> —
            it just hasn&apos;t been run on the curated dossiers yet.
          </p>
          <p className="mt-3">
            Once frames are seeded, this page renders the grid. See{' '}
            <Link href="/methodology" className="text-amber-400 hover:underline">methodology</Link> for the keyframe pipeline.
          </p>
        </section>
      ) : (
        <section className="mb-12">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {keyframes.map((kf) => (
              <li key={kf.id}>
                <Link
                  href={`/films/${kf.production_slug}`}
                  className="group block overflow-hidden rounded border border-zinc-800 bg-zinc-900"
                >
                  <div className="relative aspect-video w-full bg-zinc-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={kf.image_url}
                      alt={kf.caption ?? `Shot from ${kf.production_title}`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  </div>
                  {kf.palette && kf.palette.length > 0 && (
                    <div className="flex h-3 w-full overflow-hidden" aria-hidden>
                      {kf.palette.map((hex, i) => (
                        <span
                          key={`${kf.id}-${i}`}
                          className="flex-1"
                          style={{ backgroundColor: hex }}
                          title={hex}
                        />
                      ))}
                    </div>
                  )}
                  <div className="p-2">
                    <p className="truncate text-xs text-zinc-300 group-hover:text-amber-400">
                      {kf.production_title}
                    </p>
                    {kf.caption && (
                      <p className="mt-0.5 truncate text-[10px] text-zinc-500">
                        {kf.caption}
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <aside className="mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-400">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-300">
          Reverse-search by reference still
        </p>
        For visual-similarity search (upload a frame and find shots that
        share the same palette / composition / light), use{' '}
        <Link href="/lookbook" className="text-amber-400 hover:underline">/lookbook</Link>.
      </aside>
    </>
  );
}
