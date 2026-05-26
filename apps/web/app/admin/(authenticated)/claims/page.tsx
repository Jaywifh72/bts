import type { Metadata } from 'next';
import Link from 'next/link';
import {
  db,
  listClaimsForReview,
  countClaimsForReview,
  type ClaimStatus,
  type ClaimType,
} from '@bts/db';
import { ClaimReviewRow } from '@/components/admin/ClaimReviewRow';
import { Pagination } from '@/components/ui/Pagination';
import { getClaimReviewReadiness } from '@/lib/claimreview-readiness';
import { bulkPromoteEligibleClaimsAction } from './actions';

export const metadata: Metadata = {
  title: 'Claims Review',
  robots: { index: false, follow: false },
};

const PAGE_SIZE = 50;

const STATUSES: (ClaimStatus | 'all')[] = [
  'needs_source',
  'candidate',
  'sourced',
  'reviewed',
  'verified',
  'disputed',
  'deprecated',
  'rejected',
  'all',
];

const CLAIM_TYPES: (ClaimType | 'all')[] = [
  'all',
  'production_camera',
  'production_lens',
  'production_filter',
  'production_format',
  'production_lighting',
  'production_color_pipeline',
  'production_post_house',
  'production_vfx_house',
  'production_vfx_sequence',
  'scene_camera',
  'scene_lens',
  'scene_lighting',
  'scene_vfx',
  'scene_location',
  'gear_spec',
  'person_credit',
  'video_evidence',
  'general_bts_fact',
];

type Props = {
  searchParams: Promise<{
    status?: string;
    claimType?: string;
    page?: string;
  }>;
};

function parseStatus(value: string | undefined): ClaimStatus | 'all' {
  if (value && (STATUSES as string[]).includes(value)) return value as ClaimStatus | 'all';
  return 'needs_source';
}

function parseClaimType(value: string | undefined): ClaimType | 'all' {
  if (value && (CLAIM_TYPES as string[]).includes(value)) return value as ClaimType | 'all';
  return 'all';
}

function buildHref(params: URLSearchParams, next: Record<string, string | number | null>): string {
  const merged = new URLSearchParams(params);
  for (const [key, value] of Object.entries(next)) {
    if (value === null || value === '' || value === 'all') merged.delete(key);
    else merged.set(key, String(value));
  }
  const qs = merged.toString();
  return qs ? `/admin/claims?${qs}` : '/admin/claims';
}

function label(value: string): string {
  return value.replace(/_/g, ' ');
}

export default async function AdminClaimsPage(props: Props) {
  const searchParams = await props.searchParams;
  const status = parseStatus(searchParams.status);
  const claimType = parseClaimType(searchParams.claimType);
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10) || 1);

  const [claims, total, readiness] = await Promise.all([
    listClaimsForReview(db, {
      status,
      claimType,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countClaimsForReview(db, { status, claimType }),
    getClaimReviewReadiness(),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const baseParams = new URLSearchParams();
  if (status !== 'needs_source') baseParams.set('status', status);
  if (claimType !== 'all') baseParams.set('claimType', claimType);

  return (
    <div>
      <section
        className="mb-4 rounded border-2 p-4"
        style={{
          borderColor: readiness.emittableTotal > 0 ? '#10b98166' : '#92400e66',
          background: readiness.emittableTotal > 0 ? '#10b98111' : '#92400e11',
        }}
      >
        <p className="text-[10px] uppercase tracking-widest text-zinc-400">ClaimReview readiness</p>
        <p className="mt-1 font-serif text-xl text-zinc-50">
          <span style={{ color: readiness.emittableTotal > 0 ? '#10b981' : '#f59e0b' }}>
            {readiness.emittableTotal.toLocaleString()}
          </span>{' '}
          claims currently emit Schema.org ClaimReview
          {readiness.oneStepAway > 0 && (
            <>
              {' '}·{' '}
              <span className="text-amber-300">{readiness.oneStepAway.toLocaleString()}</span> one step away
            </>
          )}
        </p>
        {readiness.oneStepAway > 0 && (
          <>
            <p className="mt-2 text-xs text-zinc-400">
              Have a citation + primary-like confidence but status is still <code>candidate</code> or{' '}
              <code>needs_source</code>. Promote to <code>sourced</code> to unlock ClaimReview emission.
            </p>
            <form action={bulkPromoteEligibleClaimsAction} className="mt-3">
              <button
                type="submit"
                className="rounded border border-amber-700/60 bg-amber-600/20 px-3 py-1 text-xs font-serif text-amber-300 hover:border-amber-500 hover:bg-amber-600/30"
              >
                Promote all {readiness.oneStepAway.toLocaleString()} eligible claims to sourced →
              </button>
            </form>
          </>
        )}
        {readiness.topProductionsAwaitingPromotion.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">Top productions awaiting promotion</p>
            <ul className="mt-1 flex flex-wrap gap-2 text-xs">
              {readiness.topProductionsAwaitingPromotion.map((p) => (
                <li key={p.slug}>
                  <a href={`/films/${p.slug}`} target="_blank" rel="noopener noreferrer" className="rounded border border-zinc-700 px-2 py-0.5 text-zinc-300 hover:border-amber-500 hover:text-amber-400">
                    {p.title} <span className="text-zinc-500">({p.awaiting})</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <header className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="font-serif text-2xl">Claims Review</h1>
        <div className="text-sm text-zinc-500">
          {total.toLocaleString()} {status === 'all' ? '' : label(status)} claim{total === 1 ? '' : 's'}
        </div>
      </header>

      <nav
        aria-label="Filter claims by status"
        className="mb-3 flex flex-wrap gap-2 border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
      >
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={buildHref(baseParams, { status: s, page: null })}
            className={`rounded px-2 py-1 ${
              status === s ? 'bg-amber-600 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {label(s)}
          </Link>
        ))}
      </nav>

      <nav
        aria-label="Filter claims by type"
        className="mb-6 flex flex-wrap gap-2 border border-zinc-800 bg-zinc-900/40 p-2 text-xs"
      >
        {CLAIM_TYPES.map((type) => (
          <Link
            key={type}
            href={buildHref(baseParams, { claimType: type, page: null })}
            className={`rounded px-2 py-1 ${
              claimType === type ? 'bg-zinc-200 text-zinc-950' : 'text-zinc-400 hover:bg-zinc-800'
            }`}
          >
            {label(type)}
          </Link>
        ))}
      </nav>

      {claims.length === 0 ? (
        <div className="border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
          No claims match these filters.
        </div>
      ) : (
        <ul className="space-y-3">
          {claims.map((claim) => (
            <ClaimReviewRow key={claim.id} claim={claim} />
          ))}
        </ul>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        ariaLabel="Claims pagination"
        buildHref={(p) => buildHref(baseParams, { page: p })}
      />
    </div>
  );
}
