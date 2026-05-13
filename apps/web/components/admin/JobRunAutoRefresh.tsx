'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Live-job auto-refresh helper for the job-run detail page.
 *
 * Replaces the older `<meta httpEquiv="refresh">` approach which forced
 * a hard browser navigation every 3s. That pinned the operator to the
 * page — any link click would compete with the in-flight reload, so
 * clicking "Back to ingest" or any other nav element behaved as if the
 * browser was busy. By calling `router.refresh()` instead, Next.js
 * silently re-fetches the RSC payload for this route and replaces the
 * server-rendered tree in place. The page never unloads, no navigation
 * is in flight, and any link is clickable instantly.
 *
 * Re-renders the page every `intervalMs` (default 3s) while mounted.
 * The parent server component is responsible for only mounting this
 * when the job is in a live state — once the run finalises, this
 * component should be unmounted so we stop hammering the DB.
 */
export function JobRunAutoRefresh({ intervalMs = 3000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    // Only refresh while the document is visible — saves DB queries when
    // the operator has the tab in the background.
    const tick = () => {
      if (document.visibilityState === 'visible') router.refresh();
    };
    const handle = setInterval(tick, intervalMs);
    return () => clearInterval(handle);
  }, [router, intervalMs]);

  return null;
}
