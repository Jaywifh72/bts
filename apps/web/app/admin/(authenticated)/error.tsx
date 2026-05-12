'use client';

import Link from 'next/link';

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Admin pages are operator-only — full error.message detail is always
  // appropriate here (no anonymous viewers).
  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <p className="text-xs uppercase tracking-widest text-zinc-500">Admin · Error</p>
      <h1 className="font-serif text-3xl text-zinc-50">Admin view crashed</h1>
      <p className="max-w-prose text-zinc-300">
        {error.message ?? 'An unexpected error occurred.'}
      </p>
      {error.digest && (
        <p className="font-mono text-[11px] text-zinc-600">ref: {error.digest}</p>
      )}
      {error.stack && (
        <pre className="max-w-full overflow-x-auto rounded border border-zinc-800 bg-zinc-900/40 p-3 font-mono text-[11px] text-zinc-500">
          {error.stack}
        </pre>
      )}
      <div className="flex gap-4">
        <button onClick={reset} className="text-sm text-amber-400 hover:underline">
          Try again
        </button>
        <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
          Admin home
        </Link>
      </div>
    </div>
  );
}
