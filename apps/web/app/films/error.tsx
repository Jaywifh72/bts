'use client';

import Link from 'next/link';

export default function FilmsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV !== 'production';
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="text-xs uppercase tracking-widest text-zinc-500">Films · Error</p>
      <h1 className="font-serif text-3xl text-zinc-50">Couldn&apos;t load this view</h1>
      <p className="max-w-prose text-zinc-400">
        {isDev
          ? (error.message ?? 'An unexpected error occurred.')
          : 'The films archive is temporarily unavailable. The operator has been notified.'}
      </p>
      {error.digest && (
        <p className="font-mono text-[11px] text-zinc-600">ref: {error.digest}</p>
      )}
      <div className="flex gap-4">
        <button onClick={reset} className="text-sm text-amber-400 hover:underline">
          Try again
        </button>
        <Link href="/films" className="text-sm text-zinc-500 hover:underline">
          Back to Films
        </Link>
      </div>
    </div>
  );
}
