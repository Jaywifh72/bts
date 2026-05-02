import Image from 'next/image';
import type { TmdbMedia } from '@/lib/tmdb';

/**
 * Renders TMDb-sourced backdrops in a horizontal scroll strip. Returns null
 * when there are no backdrops so the parent layout doesn't reserve space.
 */
export function MediaGallery({ media }: { media: TmdbMedia }) {
  if (!media.backdrops || media.backdrops.length === 0) return null;

  return (
    <section className="-mx-4 mb-8 sm:-mx-6 lg:-mx-8">
      <div className="flex gap-3 overflow-x-auto px-4 pb-3 sm:px-6 lg:px-8">
        {media.backdrops.slice(0, 8).map((src, i) => (
          <div
            key={i}
            className="relative aspect-[16/9] w-72 shrink-0 overflow-hidden rounded border border-zinc-800"
          >
            <Image
              src={src}
              alt=""
              fill
              sizes="288px"
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </section>
  );
}
