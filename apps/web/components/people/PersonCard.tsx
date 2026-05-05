import Link from 'next/link';
import Image from 'next/image';
import { profileUrl } from '@/lib/tmdb-image';

interface PersonCardProps {
  slug: string;
  displayName: string;
  primaryRole: string | null;
  nationality: string | null;
  birthYear?: number | null;
  profilePath?: string | null;
  creditCount?: number;
}

export function PersonCard({
  slug,
  displayName,
  primaryRole,
  nationality,
  birthYear,
  profilePath,
  creditCount,
}: PersonCardProps) {
  const photo = profileUrl(profilePath, 'w185');
  const initials = displayName
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <Link
      href={`/crew/${slug}`}
      className="group flex gap-3 rounded border border-zinc-800 bg-zinc-900 p-3 hover:border-zinc-600 transition-colors"
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-800">
        {photo ? (
          <Image
            src={photo}
            alt=""
            fill
            sizes="56px"
            className="object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs font-medium text-zinc-500">
            {initials || '?'}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-zinc-100">{displayName}</div>
        <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-zinc-500">
          {primaryRole && <span>{primaryRole}</span>}
          {primaryRole && nationality && <span>·</span>}
          {nationality && <span>{nationality}</span>}
          {birthYear ? (
            <>
              <span>·</span>
              <span>b. {birthYear}</span>
            </>
          ) : null}
        </div>
        {typeof creditCount === 'number' && creditCount > 0 && (
          <div className="mt-0.5 text-xs text-zinc-600">
            {creditCount} {creditCount === 1 ? 'credit' : 'credits'}
          </div>
        )}
      </div>
    </Link>
  );
}
