'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import type { Correction, CorrectionStatus } from '@bts/db';
import { setCorrectionStatusAction } from '../../app/admin/(authenticated)/corrections/actions';

const STATUS_BADGE: Record<CorrectionStatus, string> = {
  open: 'bg-amber-900/50 text-amber-300 border-amber-700/50',
  triaged: 'bg-blue-900/50 text-blue-300 border-blue-700/50',
  resolved: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/50',
  dismissed: 'bg-zinc-800 text-zinc-500 border-zinc-700',
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    + ' '
    + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export function CorrectionRow({ correction }: { correction: Correction }) {
  const [pending, startTransition] = useTransition();

  function setStatus(status: CorrectionStatus) {
    startTransition(async () => {
      await setCorrectionStatusAction(correction.id, status);
    });
  }

  return (
    <li
      className={`rounded border border-zinc-800 bg-zinc-900/40 p-4 ${pending ? 'opacity-50' : ''}`}
    >
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-2 text-sm">
            {correction.production_slug && correction.production_title ? (
              <Link
                href={`/films/${correction.production_slug}`}
                className="font-medium text-zinc-100 hover:text-amber-400"
              >
                {correction.production_title}
              </Link>
            ) : (
              <span className="font-mono text-xs text-zinc-500">{correction.page_url}</span>
            )}
            <span
              className={`rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-wide ${STATUS_BADGE[correction.status]}`}
            >
              {correction.status}
            </span>
          </div>
          <div className="mt-1 text-xs text-zinc-600">
            {fmtDate(correction.created_at)}
            {correction.email && (
              <>
                <span className="mx-1 text-zinc-700">·</span>
                <a href={`mailto:${correction.email}`} className="hover:text-amber-400">
                  {correction.email}
                </a>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-1 text-xs">
          {correction.status !== 'triaged' && (
            <button
              type="button"
              onClick={() => setStatus('triaged')}
              disabled={pending}
              className="rounded border border-blue-700/50 bg-blue-900/30 px-2 py-1 text-blue-300 hover:bg-blue-900/50 disabled:opacity-50"
            >
              Triage
            </button>
          )}
          {correction.status !== 'resolved' && (
            <button
              type="button"
              onClick={() => setStatus('resolved')}
              disabled={pending}
              className="rounded border border-emerald-700/50 bg-emerald-900/30 px-2 py-1 text-emerald-300 hover:bg-emerald-900/50 disabled:opacity-50"
            >
              Resolved
            </button>
          )}
          {correction.status !== 'dismissed' && (
            <button
              type="button"
              onClick={() => setStatus('dismissed')}
              disabled={pending}
              className="rounded border border-zinc-700 bg-zinc-800 px-2 py-1 text-zinc-400 hover:bg-zinc-700 disabled:opacity-50"
            >
              Dismiss
            </button>
          )}
          {correction.status !== 'open' && (
            <button
              type="button"
              onClick={() => setStatus('open')}
              disabled={pending}
              className="rounded border border-amber-700/50 px-2 py-1 text-amber-400 hover:bg-amber-900/30 disabled:opacity-50"
            >
              Reopen
            </button>
          )}
        </div>
      </header>
      <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{correction.message}</p>
    </li>
  );
}
