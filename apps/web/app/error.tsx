'use client';

import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="text-xs uppercase tracking-widest text-zinc-500">Error</p>
      <h1 className="font-serif text-4xl text-zinc-50">Something went wrong</h1>
      <p className="text-zinc-400">
        {error.message ?? 'An unexpected error occurred.'}
      </p>
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="text-sm text-amber-400 hover:underline"
        >
          Try again
        </button>
        <Link href="/" className="text-sm text-zinc-500 hover:underline">
          Home
        </Link>
      </div>
    </div>
  );
}
