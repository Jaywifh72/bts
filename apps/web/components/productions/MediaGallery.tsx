import Image from 'next/image';
import { backdropUrl } from '@/lib/tmdb-image';

/**
 * Renders TMDb backdrops in a horizontal scroll strip. Returns null when
 * there are too few backdrops to make a meaningful gallery — avoiding the
 * "5 dark placeholder rectangles" visual regression we used to ship.
 *
 * Caller passes raw TMDb file paths (the canonical relative paths cached
 * on productions.backdrop_path); we build the CDN URL here.
 */
export function MediaGallery({
  backdropPaths,
  minItems = 2,
}: {
  backdropPaths: string[];
  minItems?: number;
}) {
  // Drop dupes (same path repeated) and falsy values defensively
  const unique = Array.from(new Set(backdropPaths.filter(Boolean)));
  if (unique.length < minItems) return null;

  return (
    <section className="-mx-4 mb-8 sm:-mx-6 lg:-mx-8">
      <div className="flex gap-3 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
        {unique.slice(0, 8).map((path, i) => {
          const src = backdropUrl(path, 'w780');
          if (!src) return null;
          return (
            <div
              key={path}
              className="relative aspect-[16/9] w-72 shrink-0 overflow-hidden rounded border border-zinc-800"
            >
              <Image src={src} alt="" fill sizes="288px" className="object-cover" loading={i < 2 ? 'eager' : 'lazy'} />
            </div>
          );
        })}
      </div>
    </section>
  );
}
