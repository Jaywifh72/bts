import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Crew member not found' };

export default function CrewNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="text-xs uppercase tracking-widest text-zinc-500">404 · Crew</p>
      <h1 className="font-serif text-4xl text-zinc-50">No crew member at this slug</h1>
      <p className="max-w-prose text-zinc-400">
        Either this person hasn&apos;t been added to the archive yet or the slug
        has been changed. Try search, or browse the crew index.
      </p>
      <div className="flex gap-4">
        <Link href="/crew" className="text-sm text-amber-400 hover:underline">
          ← Back to Crew
        </Link>
        <Link href="/search" className="text-sm text-zinc-500 hover:underline">
          Try Search
        </Link>
      </div>
    </div>
  );
}
