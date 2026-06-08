'use client';

import Link from 'next/link';
import { useEffect } from 'react';

/**
 * Segment-level error boundary for /admin/seo and its sub-routes.
 *
 * Admin pages are operator-only — surface the full error.message and stack
 * even in production so we can diagnose without redeploying. The parent
 * (authenticated) boundary already does this; this layer adds context-
 * specific recovery actions (re-check GSC, view audit, etc.).
 */
export default function SeoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the browser console so it surfaces in Vercel function logs +
    // local dev. Server-thrown errors are stringified into `error` before
    // reaching this client boundary.
    console.error('[admin/seo] segment error', error);
  }, [error]);

  const isGscError = /gsc|search.?console|googleapi|oauth|token|quota|403|401|503/i.test(
    error.message ?? '',
  );

  return (
    <div className="flex flex-col items-start gap-4 py-12">
      <p className="text-xs uppercase tracking-widest text-zinc-500">SEO · Error</p>
      <h1 className="font-serif text-3xl text-zinc-50">
        {isGscError ? 'Google Search Console call failed' : 'SEO admin view crashed'}
      </h1>
      <p className="max-w-prose text-zinc-300">
        {error.message ?? 'An unexpected error occurred.'}
      </p>
      {error.digest && (
        <p className="font-mono text-[11px] text-zinc-600">ref: {error.digest}</p>
      )}

      {isGscError && (
        <div className="max-w-prose rounded border border-amber-900/40 bg-amber-950/10 p-4 text-sm text-amber-200">
          <p className="font-serif text-amber-300">Common causes</p>
          <ul className="ml-5 mt-2 list-disc space-y-1 text-zinc-300 text-xs">
            <li>OAuth refresh token expired or revoked — regenerate at <a href="https://developers.google.com/oauthplayground/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">OAuth Playground</a> and update <code>GSC_REFRESH_TOKEN</code> in Vercel.</li>
            <li>GSC quota throttled — wait 60s and retry.</li>
            <li>The verified property doesn&apos;t match <code>GSC_SITE_URL</code> — the audit/inspect tools below still work; the home dashboard needs this env var to match a property your OAuth identity owns.</li>
          </ul>
        </div>
      )}

      {error.stack && (
        <pre className="max-w-full overflow-x-auto rounded border border-zinc-800 bg-zinc-900/40 p-3 font-mono text-[11px] text-zinc-500">
          {error.stack}
        </pre>
      )}

      <div className="flex flex-wrap gap-4">
        <button onClick={reset} className="text-sm text-amber-400 hover:underline">
          Try again
        </button>
        <Link href="/admin/seo/audit?run=1&cwv=0" className="text-sm text-amber-400 hover:underline">
          Run on-page audit (no GSC) →
        </Link>
        <Link href="/admin/seo/inspect" className="text-sm text-amber-400 hover:underline">
          URL Inspector →
        </Link>
        <Link href="/admin/seo/links?run=1" className="text-sm text-amber-400 hover:underline">
          Link scan →
        </Link>
        <Link href="/admin/seo/duplicates?run=1" className="text-sm text-amber-400 hover:underline">
          Duplicate scan →
        </Link>
        <Link href="/admin" className="text-sm text-zinc-500 hover:underline">
          Admin home
        </Link>
      </div>
    </div>
  );
}
