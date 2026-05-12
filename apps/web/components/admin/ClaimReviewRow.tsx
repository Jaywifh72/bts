'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import type { ClaimReviewRow as ClaimReview, ClaimStatus } from '@bts/db';
import { ClaimConfidenceBadge } from '@/components/ui/ClaimConfidenceBadge';
import { ClaimStatusBadge } from '@/components/ui/ClaimStatusBadge';
import { setClaimStatusAction } from '../../app/admin/(authenticated)/claims/actions';

const NEXT_STATUSES: ClaimStatus[] = [
  'candidate',
  'needs_source',
  'sourced',
  'reviewed',
  'verified',
  'disputed',
  'rejected',
];

function claimTypeLabel(type: string): string {
  return type.replace(/_/g, ' ');
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function ClaimReviewRow({ claim }: { claim: ClaimReview }) {
  const [pending, startTransition] = useTransition();

  function setStatus(status: ClaimStatus) {
    startTransition(async () => {
      await setClaimStatusAction(claim.id, status, claim.production_slug);
    });
  }

  return (
    <li className={`border border-zinc-800 bg-zinc-900/40 p-4 ${pending ? 'opacity-50' : ''}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wide text-zinc-600">
              {claimTypeLabel(claim.claim_type)}
            </span>
            <ClaimStatusBadge status={claim.status} />
            <ClaimConfidenceBadge confidence={claim.confidence} />
            <span className="text-xs text-zinc-600">
              {claim.source_count} source{claim.source_count === 1 ? '' : 's'}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-200">{claim.statement}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
            {claim.production_slug && claim.production_title && (
              <Link
                href={`/films/${claim.production_slug}`}
                className="text-amber-400 hover:underline"
              >
                {claim.production_title}
              </Link>
            )}
            <span>Updated {formatDate(claim.updated_at)}</span>
            {claim.last_verified_at && <span>Verified {formatDate(claim.last_verified_at)}</span>}
          </div>
        </div>
      </header>

      <div className="mt-3 flex flex-wrap gap-1 text-xs">
        {NEXT_STATUSES.filter((status) => status !== claim.status).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatus(status)}
            disabled={pending}
            className="rounded border border-zinc-700 px-2 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
          >
            {status.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
    </li>
  );
}
