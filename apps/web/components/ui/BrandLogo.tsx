'use client';

import { useState } from 'react';
import { BrandMark } from './BrandMark';

interface BrandLogoProps {
  slug: string;
  /** Brand's canonical website URL, used to derive the favicon domain. */
  website: string | null;
  /** Display name — used for the typographic fallback. */
  name: string;
  /** Tile size; mirrors BrandMark.Size. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_PX: Record<NonNullable<BrandLogoProps['size']>, { tile: string; img: number }> = {
  sm: { tile: 'h-12 w-20', img: 32 },
  md: { tile: 'h-16 w-24', img: 48 },
  lg: { tile: 'h-20 w-28', img: 64 },
};

/**
 * Extracts the host from a website URL (with or without protocol).
 * Returns null when the input doesn't parse as a URL — caller falls
 * back to the typographic mark in that case.
 */
function extractDomain(website: string | null): string | null {
  if (!website) return null;
  try {
    const u = new URL(website.startsWith('http') ? website : `https://${website}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

/**
 * Hot-links each brand's mark via Google's favicon service. At
 * request time Google serves the brand's own favicon (from their
 * canonical website) at the requested size — no redistribution from
 * us. On image load failure we render the typographic <BrandMark>
 * as fallback, so the tile is never empty.
 *
 * `referrerPolicy="no-referrer"` keeps Google from receiving our
 * page URL on the favicon request; `loading="lazy"` defers the
 * fetch until the tile scrolls near the viewport.
 */
export function BrandLogo({ slug, website, name, size = 'md', className = '' }: BrandLogoProps) {
  const [failed, setFailed] = useState(false);
  const domain = extractDomain(website);
  const sizeCls = SIZE_PX[size];

  // No website on file or earlier image error → typographic mark.
  if (!domain || failed) {
    return <BrandMark slug={slug} fallbackText={name} size={size} className={className} />;
  }

  // Google's s2/favicons endpoint snaps to powers of two; ask for 2×
  // the rendered size so high-DPI displays stay sharp.
  const sz = sizeCls.img * 2;
  const src = `https://www.google.com/s2/favicons?sz=${sz}&domain=${encodeURIComponent(domain)}`;

  return (
    <div
      aria-hidden
      className={[
        'inline-flex items-center justify-center overflow-hidden rounded',
        'border border-zinc-800 bg-gradient-to-br from-zinc-900 to-zinc-950',
        'shadow-inner',
        sizeCls.tile,
        className,
      ].join(' ')}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={sizeCls.img}
        height={sizeCls.img}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="object-contain"
        style={{ width: sizeCls.img, height: sizeCls.img }}
      />
    </div>
  );
}
