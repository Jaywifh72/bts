import Link from 'next/link';

interface PersonCardProps {
  slug: string;
  displayName: string;
  nationality: string | null;
  primaryRole: string | null;
}

export function PersonCard({ slug, displayName, nationality, primaryRole }: PersonCardProps) {
  return (
    <Link
      href={`/crew/${slug}`}
      className="block rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-600 transition-colors"
    >
      <h2 className="font-serif text-lg text-zinc-50">{displayName}</h2>
      <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-500">
        {primaryRole && <span className="text-zinc-400">{primaryRole}</span>}
        {nationality && <span>{nationality}</span>}
      </div>
    </Link>
  );
}
