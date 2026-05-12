import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Film not found' };

export default function FilmNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="text-xs uppercase tracking-widest text-zinc-500">404 · Films</p>
      <h1 className="font-serif text-4xl text-zinc-50">No film at this slug</h1>
      <p className="max-w-prose text-zinc-400">
        The film you&apos;re looking for either hasn&apos;t been ingested yet or has
        been merged into another entry. Browse the archive index to find what you
        need.
      </p>
      <div className="flex gap-4">
        <Link href="/films" className="text-sm text-amber-400 hover:underline">
          ← Back to Films
        </Link>
        <Link href="/search" className="text-sm text-zinc-500 hover:underline">
          Try Search
        </Link>
      </div>
    </div>
  );
}
