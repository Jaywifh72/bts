import Image from 'next/image';
import { profileUrl } from '@/lib/tmdb-image';

/**
 * Single render-path for a person's photo. When TMDb has a profile_path
 * the headshot loads; when it doesn't (~68% of crew, per the image-
 * coverage audit), we fall back to a deterministic colored avatar
 * derived from the person's slug. Every person ends up with a "proper
 * image" — either their real photo or a stable generated tile.
 *
 * Colors are chosen from a small palette of muted, dark-theme-friendly
 * gradients. The slug is hashed to pick a palette index, so the same
 * person always gets the same tile across page loads + cards + lists.
 */

const PALETTES: Array<{ from: string; to: string; text: string }> = [
  { from: '#1e293b', to: '#0f172a', text: '#cbd5e1' }, // slate
  { from: '#1f2937', to: '#111827', text: '#d1d5db' }, // gray
  { from: '#374151', to: '#1f2937', text: '#e5e7eb' }, // gray-warm
  { from: '#3f3f46', to: '#27272a', text: '#e4e4e7' }, // zinc
  { from: '#44403c', to: '#292524', text: '#e7e5e4' }, // stone
  { from: '#451a03', to: '#1c1917', text: '#fde68a' }, // amber-dark
  { from: '#1e1b4b', to: '#0c0a09', text: '#c7d2fe' }, // indigo-dark
  { from: '#164e63', to: '#0c4a6e', text: '#a5f3fc' }, // cyan-dark
  { from: '#365314', to: '#1a2e05', text: '#bef264' }, // lime-dark
  { from: '#7c2d12', to: '#431407', text: '#fed7aa' }, // orange-dark
];

function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = ((h << 5) - h + slug.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg' | 'xl', { wrap: string; text: string; px: number }> = {
  sm: { wrap: 'h-10 w-10', text: 'text-[11px]', px: 40 },
  md: { wrap: 'h-14 w-14', text: 'text-sm',     px: 56 },
  lg: { wrap: 'h-20 w-20', text: 'text-lg',     px: 80 },
  xl: { wrap: 'h-24 w-24', text: 'text-xl',     px: 96 },
};

export function PersonAvatar({
  slug,
  displayName,
  profilePath,
  size = 'md',
  shape = 'circle',
  className = '',
}: {
  slug: string;
  displayName: string;
  profilePath?: string | null;
  size?: keyof typeof SIZE_CLASSES;
  shape?: 'circle' | 'rounded';
  className?: string;
}) {
  const photo = profileUrl(profilePath, size === 'xl' ? 'w185' : 'w185');
  const sz = SIZE_CLASSES[size];
  const radius = shape === 'circle' ? 'rounded-full' : 'rounded';
  const wrapCls = `relative shrink-0 overflow-hidden ${sz.wrap} ${radius} ${className}`;

  if (photo) {
    return (
      <div className={wrapCls}>
        <Image
          src={photo}
          // Used both as a standalone hero (size=xl on /crew/[slug]) and
          // in compact lists where adjacent text already names the
          // person. Setting the alt to the display name covers the
          // hero case; in the list-row case it's a mild redundancy at
          // worst, which a11y guidance prefers over silent images.
          alt={displayName}
          fill
          sizes={`${sz.px}px`}
          className="object-cover"
        />
      </div>
    );
  }

  // Deterministic fallback: slug hashed into the palette index.
  const p = PALETTES[hashSlug(slug) % PALETTES.length]!;
  return (
    <div
      className={`${wrapCls} flex items-center justify-center font-medium`}
      style={{
        background: `linear-gradient(135deg, ${p.from} 0%, ${p.to} 100%)`,
        color: p.text,
      }}
      aria-hidden
    >
      <span className={sz.text} style={{ letterSpacing: '0.05em' }}>
        {initials(displayName)}
      </span>
    </div>
  );
}
