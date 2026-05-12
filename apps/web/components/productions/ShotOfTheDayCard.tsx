'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';

type Shot = {
  production_slug: string;
  scene_slug: string | null;
  production_title: string;
  caption: string | null;
  image_url: string;
  palette: string[] | null;
};

/**
 * Wraps the homepage's Shot-of-the-Day card with a client-side
 * onError fallback. When the image source 404s (TMDb sometimes
 * rotates backdrop paths out from under us), we hide the whole
 * block rather than render a broken-image placeholder. The
 * `getShotOfTheDay` query rotates daily so a tomorrow's shot may
 * be reachable even if today's isn't.
 */
export function ShotOfTheDayCard({ shot, todayKey }: { shot: Shot; todayKey: string }) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  return (
    <div className="mb-12">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="font-serif text-xl text-zinc-50">Shot of the day</h2>
        <p className="text-xs text-zinc-500">{todayKey}</p>
      </div>
      <Link
        href={`/films/${shot.production_slug}${shot.scene_slug ? `#scene-${shot.scene_slug}` : ''}`}
        className="group block overflow-hidden rounded border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-600"
      >
        <div className="relative aspect-[21/9] w-full">
          <Image
            src={shot.image_url}
            alt={shot.caption ?? `Shot from ${shot.production_title}`}
            fill
            sizes="(max-width: 1280px) 100vw, 1280px"
            className="object-cover"
            priority
            referrerPolicy="no-referrer"
            // Keyframes can hot-link to publisher CDNs not in remotePatterns.
            unoptimized
            onError={() => setHidden(true)}
          />
        </div>
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-serif text-lg text-zinc-100 group-hover:text-amber-400">
              {shot.production_title}
            </p>
            {shot.caption && (
              <p className="mt-0.5 truncate text-sm text-zinc-500">{shot.caption}</p>
            )}
          </div>
          {shot.palette && shot.palette.length > 0 && (
            <div className="flex h-4 w-32 shrink-0 overflow-hidden rounded" aria-hidden>
              {shot.palette.map((hex, i) => (
                <span
                  key={`${hex}-${i}`}
                  className="flex-1"
                  style={{ backgroundColor: hex }}
                />
              ))}
            </div>
          )}
        </div>
      </Link>
    </div>
  );
}
