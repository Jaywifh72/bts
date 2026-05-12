'use client';

import Link from 'next/link';
import { useTransition } from 'react';
import type { VideoAnnotationReviewStatus, VideoTimestampAnnotation } from '@bts/db';
import { setVideoTimestampAnnotationStatusAction } from '../../app/admin/(authenticated)/video-timestamps/actions';

const STATUSES: VideoAnnotationReviewStatus[] = ['pending', 'reviewed', 'rejected'];

function label(value: string): string {
  return value.replace(/_/g, ' ');
}

function formatTimestamp(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function timestampUrl(url: string, seconds: number): string {
  const separator = url.includes('?') ? '&' : '?';
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return `${url}${separator}t=${seconds}s`;
  }
  return `${url}#t=${seconds}`;
}

export function VideoTimestampAnnotationRow({
  annotation,
}: {
  annotation: VideoTimestampAnnotation;
}) {
  const [pending, startTransition] = useTransition();

  function setStatus(status: VideoAnnotationReviewStatus) {
    startTransition(async () => {
      await setVideoTimestampAnnotationStatusAction(annotation.id, status);
    });
  }

  return (
    <li className={`border border-zinc-800 bg-zinc-900/40 p-4 ${pending ? 'opacity-50' : ''}`}>
      <div className="flex flex-wrap items-start gap-4">
        {annotation.thumbnail_url && (
          <a
            href={timestampUrl(annotation.video_url, annotation.start_seconds)}
            target="_blank"
            rel="noopener noreferrer"
            className="relative block w-40 shrink-0 overflow-hidden bg-zinc-950"
          >
            <img
              src={annotation.thumbnail_url}
              alt=""
              className="aspect-video w-full object-cover opacity-90"
              loading="lazy"
            />
          </a>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-wide text-zinc-600">
            <span>{label(annotation.annotation_type)}</span>
            <span>{label(annotation.review_status)}</span>
            <span className="font-mono">
              {formatTimestamp(annotation.start_seconds)}
              {annotation.end_seconds !== null ? `-${formatTimestamp(annotation.end_seconds)}` : ''}
            </span>
          </div>
          <p className="mt-2 text-sm text-zinc-200">{annotation.label}</p>
          {annotation.note && (
            <p className="mt-1 text-xs text-zinc-500">{annotation.note}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
            <Link href={`/films/${annotation.production_slug}`} className="text-amber-400 hover:underline">
              {annotation.production_title}
            </Link>
            <a
              href={timestampUrl(annotation.video_url, annotation.start_seconds)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline"
            >
              {annotation.video_title}
            </a>
            {annotation.claim_statement && (
              <span className="max-w-xl truncate">{annotation.claim_statement}</span>
            )}
            {annotation.evidence_item_id && (
              <span>evidence #{annotation.evidence_item_id}</span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1 text-xs">
        {STATUSES.filter((status) => status !== annotation.review_status).map((status) => (
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
