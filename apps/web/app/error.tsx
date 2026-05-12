'use client';

import Link from 'next/link';

/**
 * Root error boundary.
 *
 * SECURITY: raw `error.message` can include connection strings, table
 * names, parameter values, or stack trace fragments. We only render it
 * in development. In production we surface the opaque `error.digest` so
 * the operator can grep server logs.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isDev = process.env.NODE_ENV !== 'production';
  return (
    <div className="flex flex-col items-start gap-4 py-16">
      <p className="text-xs uppercase tracking-widest text-zinc-500">Error</p>
      <h1 className="font-serif text-4xl text-zinc-50">Something went wrong</h1>
      <p className="text-zinc-400">
        {isDev
          ? (error.message ?? 'An unexpected error occurred.')
          : 'An unexpected error occurred. The operator has been notified.'}
      </p>
      {error.digest && (
        <p className="font-mono text-[11px] text-zinc-600">
          ref: {error.digest}
        </p>
      )}
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
