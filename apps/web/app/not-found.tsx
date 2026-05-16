import Link from 'next/link';
import type { Metadata } from 'next';
import { CineCanonMark } from '@/components/brand/CineCanonMark';

export const metadata: Metadata = { title: 'Not Found' };

export default function NotFound() {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <CineCanonMark size={80} title="" className="mb-2" />
      <p className="text-xs uppercase tracking-widest text-zinc-500">404</p>
      <h1 className="font-serif text-4xl text-zinc-50">Not Found</h1>
      <p className="text-zinc-400">This page does not exist in the archive.</p>
      <Link href="/films" className="text-sm text-amber-400 hover:underline">
        ← Back to Films
      </Link>
    </div>
  );
}
