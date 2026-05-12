'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import type { EvidenceReviewRow as EvidenceReview, EvidenceReviewStatus } from '@bts/db';
import { EvidenceGallery } from '@/components/ui/EvidenceGallery';
import { setEvidenceReviewStatusAction } from '../../app/admin/(authenticated)/evidence/actions';

const STATUSES: EvidenceReviewStatus[] = ['pending', 'reviewed', 'rejected'];

function label(value: string): string {
  return value.replace(/_/g, ' ');
}

export function EvidenceReviewRow({ evidence }: { evidence: EvidenceReview }) {
  const [pending, startTransition] = useTransition();

  function setStatus(status: EvidenceReviewStatus) {
    startTransition(async () => {
      await setEvidenceReviewStatusAction(evidence.id, status, evidence.production_slug);
    });
  }

  return (
    <li className={`border border-zinc-800 bg-zinc-900/40 p-4 ${pending ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-600">
            <span>{label(evidence.kind)}</span>
            <span>{label(evidence.review_status)}</span>
            {evidence.timestamp_seconds !== null && (
              <span className="font-mono">
                {Math.floor(evidence.timestamp_seconds / 60)}:{String(evidence.timestamp_seconds % 60).padStart(2, '0')}
              </span>
            )}
            {evidence.page_number !== null && (
              <span className="font-mono">p. {evidence.page_number}</span>
            )}
          </div>
          <p className="mt-2 text-sm text-zinc-200">{evidence.caption ?? evidence.claim_statement}</p>
          <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
            {evidence.production_slug && evidence.production_title && (
              <Link href={`/films/${evidence.production_slug}`} className="text-amber-400 hover:underline">
                {evidence.production_title}
              </Link>
            )}
            <span>{evidence.claim_statement}</span>
          </div>
          <EvidenceGallery evidence={[evidence]} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1 text-xs">
        {STATUSES.filter((status) => status !== evidence.review_status).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setStatus(status)}
            disabled={pending}
            className="rounded border border-zinc-700 px-2 py-1 text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
          >
            {label(status)}
          </button>
        ))}
      </div>
    </li>
  );
}
