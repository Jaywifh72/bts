import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Gear item not found' };

export default function GearItemNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="text-xs uppercase tracking-widest text-zinc-500">404 · Gear</p>
      <h1 className="font-serif text-4xl text-zinc-50">No gear item at this slug</h1>
      <p className="max-w-prose text-zinc-400">
        This specific item hasn&apos;t been catalogued (yet). Try the series or
        manufacturer index, or use search.
      </p>
      <div className="flex gap-4">
        <Link href="/gear" className="text-sm text-amber-400 hover:underline">
          ← Back to Gear
        </Link>
        <Link href="/search" className="text-sm text-zinc-500 hover:underline">
          Try Search
        </Link>
      </div>
    </div>
  );
}
