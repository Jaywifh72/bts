import Link from 'next/link';
import { redirect } from 'next/navigation';
import { unstable_cache } from 'next/cache';
import {
  db,
  countClaimsForReview,
  countEvidenceForReview,
  countOpenCorrections,
  countSourceHealthWarnings,
  countVideoTimestampAnnotationsForReview,
} from '@bts/db';
import { safeAuth } from '@/lib/safe-auth';

/**
 * Cache the admin nav badge counts for 30s. Every admin sub-page is
 * marked dynamic via its own `export const dynamic = 'force-dynamic'`,
 * so without this cache the 5 count queries fire on every request.
 *
 * Tagged so server actions that change these counters (e.g. closing a
 * correction) can revalidate immediately with revalidateTag().
 */
const getAdminBadgeCounts = unstable_cache(
  async () => {
    const [
      openCorrections,
      claimsNeedingSources,
      evidencePending,
      timestampPending,
      sourceHealthWarnings,
    ] = await Promise.all([
      countOpenCorrections(db),
      countClaimsForReview(db, { status: 'needs_source' }),
      countEvidenceForReview(db, 'pending'),
      countVideoTimestampAnnotationsForReview(db, { status: 'pending' }),
      countSourceHealthWarnings(db),
    ]);
    return { openCorrections, claimsNeedingSources, evidencePending, timestampPending, sourceHealthWarnings };
  },
  ['admin-badge-counts'],
  { revalidate: 30, tags: ['admin-badge-counts'] },
);

/**
 * Layout for protected admin pages. The login page sits outside this route
 * group so it isn't wrapped by the admin chrome / logout button.
 */
export default async function AdminAuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Role guard — only admin / super_user reach the admin chrome.
  // Anything else (no session, or a standard/premium user) goes back
  // to /signin with the original path preserved.
  const session = await safeAuth();
  const role = session?.user?.role;
  if (!session?.user) redirect('/signin?callbackUrl=/admin');
  if (role !== 'admin' && role !== 'super_user') redirect('/');

  const {
    openCorrections,
    claimsNeedingSources,
    evidencePending,
    timestampPending,
    sourceHealthWarnings,
  } = await getAdminBadgeCounts();

  return (
    <div className="-mx-6 -my-8">
      <div className="border-b border-amber-900/40 bg-zinc-900/60">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          {/* Horizontal-scroll the link row on narrow viewports so 12+
              admin links + logout don't wrap into stacked-line chaos. */}
          <div className="flex flex-1 items-center gap-4 overflow-x-auto sm:gap-6 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            <span className="shrink-0 rounded bg-amber-600 px-2 py-0.5 text-xs font-bold text-zinc-950">
              ADMIN
            </span>
            <Link
              href="/admin/ingest"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Ingest
            </Link>
            <Link
              href="/admin/curate"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Curate
            </Link>
            <Link
              href="/admin/health"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Health
            </Link>
            <Link
              href="/admin/audit"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Audit
            </Link>
            <Link
              href="/admin/media"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Media
            </Link>
            <Link
              href="/admin/claims"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Claims
              {claimsNeedingSources > 0 && (
                <span className="ml-1 inline-block rounded-full bg-amber-600 px-1.5 text-[10px] font-bold text-zinc-950">
                  {claimsNeedingSources}
                </span>
              )}
            </Link>
            <Link
              href="/admin/videos"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Videos
            </Link>
            <Link
              href="/admin/evidence"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Evidence
              {evidencePending > 0 && (
                <span className="ml-1 inline-block rounded-full bg-amber-600 px-1.5 text-[10px] font-bold text-zinc-950">
                  {evidencePending}
                </span>
              )}
            </Link>
            <Link
              href="/admin/video-timestamps"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Timestamps
              {timestampPending > 0 && (
                <span className="ml-1 inline-block rounded-full bg-amber-600 px-1.5 text-[10px] font-bold text-zinc-950">
                  {timestampPending}
                </span>
              )}
            </Link>
            <Link
              href="/admin/keyframes"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Key frames
            </Link>
            <Link
              href="/admin/sources"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Sources
              {sourceHealthWarnings > 0 && (
                <span className="ml-1 inline-block rounded-full bg-amber-600 px-1.5 text-[10px] font-bold text-zinc-950">
                  {sourceHealthWarnings}
                </span>
              )}
            </Link>
            {role === 'admin' && (
              <Link
                href="/admin/users"
                className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
              >
                Users
              </Link>
            )}
            <Link
              href="/admin/corrections"
              className="shrink-0 whitespace-nowrap text-sm text-zinc-300 hover:text-zinc-50"
            >
              Corrections
              {openCorrections > 0 && (
                <span className="ml-1 inline-block rounded-full bg-amber-600 px-1.5 text-[10px] font-bold text-zinc-950">
                  {openCorrections}
                </span>
              )}
            </Link>
            <Link href="/" className="shrink-0 whitespace-nowrap text-sm text-zinc-500 hover:text-zinc-300">
              ← Back to site
            </Link>
          </div>
          <Link
            href="/account"
            className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300"
          >
            Account
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-screen-2xl px-6 py-6">{children}</div>
    </div>
  );
}
