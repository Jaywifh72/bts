import Link from 'next/link';
import type { KeyFrame } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';

/**
 * T2-7: hand-curated key frames per production. Distinct from MediaGallery
 * which auto-pulls TMDb backdrops — this is editorial. Uses a plain <img>
 * (not next/image) because curators paste arbitrary external URLs and
 * configuring `next.config` allowlists per host doesn't scale.
 */
export function KeyFramesGallery({
  frames,
  slug,
}: {
  frames: readonly KeyFrame[];
  slug: string;
}) {
  if (frames.length === 0) return null;
  return (
    <section className="mt-8">
      <SectionHeader label="Key frames" heading="Curated stills" />
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {frames.map((kf) => (
          <figure
            key={kf.id}
            className="overflow-hidden rounded border border-zinc-800 bg-zinc-900"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={kf.image_url}
              alt={kf.caption ?? `Key frame from ${slug}`}
              loading="lazy"
              className="aspect-video w-full object-cover"
              referrerPolicy="no-referrer"
            />
            {(kf.caption || kf.scene_slug || (kf.palette && kf.palette.length > 0)) && (
              <figcaption className="border-t border-zinc-800 px-3 py-2 text-xs text-zinc-400">
                {/* E-29 — palette strip; renders above text caption when present. */}
                {kf.palette && kf.palette.length > 0 && (
                  <div className="mb-1 flex h-3 w-full overflow-hidden rounded" aria-label={`Color palette: ${kf.palette.join(', ')}`}>
                    {kf.palette.map((hex, i) => (
                      <span
                        key={`${hex}-${i}`}
                        className="flex-1"
                        style={{ backgroundColor: hex }}
                        title={hex}
                      />
                    ))}
                  </div>
                )}
                {kf.caption}
                {kf.caption && kf.scene_slug && <span className="text-zinc-600"> · </span>}
                {kf.scene_slug && (
                  <Link
                    href={`/films/${slug}#scene-${kf.scene_slug}`}
                    className="text-zinc-300 hover:text-amber-400"
                  >
                    {kf.scene_title ?? kf.scene_slug}
                  </Link>
                )}
              </figcaption>
            )}
          </figure>
        ))}
      </div>
    </section>
  );
}
