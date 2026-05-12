import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'VFX house not found' };

export default function VfxNotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="text-xs uppercase tracking-widest text-zinc-500">404 · VFX</p>
      <h1 className="font-serif text-4xl text-zinc-50">No VFX house at this slug</h1>
      <p className="max-w-prose text-zinc-400">
        Either this VFX house hasn&apos;t been added to the archive yet or the
        slug has been changed (M&A churn is constant in the VFX industry).
      </p>
      <div className="flex gap-4">
        <Link href="/vfx" className="text-sm text-amber-400 hover:underline">
          ← Back to VFX
        </Link>
        <Link href="/search" className="text-sm text-zinc-500 hover:underline">
          Try Search
        </Link>
      </div>
    </div>
  );
}
