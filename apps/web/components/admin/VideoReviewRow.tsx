'use client';

import { useTransition } from 'react';
import type { VideoForReview, VideoCategory } from '@bts/db';
import {
  approveAction,
  rejectAction,
  resetToPendingAction,
  recategorizeAction,
} from '../../app/admin/(authenticated)/videos/actions';

const CATEGORIES: VideoCategory[] = [
  'vfx_breakdown', 'compositing', 'making_of', 'behind_the_scenes',
  'director_interview', 'dp_interview', 'production_design',
  'stunts', 'sound', 'music', 'other',
];

function scoreColor(score: number): string {
  if (score >= 0.65) return 'text-emerald-400';
  if (score >= 0.4) return 'text-amber-400';
  return 'text-red-400';
}

function statusBadge(status: 'pending' | 'published' | 'rejected'): string {
  if (status === 'published') return 'bg-emerald-900/60 text-emerald-300';
  if (status === 'rejected') return 'bg-red-900/60 text-red-300';
  return 'bg-zinc-800 text-zinc-300';
}

function fmtDuration(seconds: number | null): string {
  if (!seconds) return '—';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function VideoReviewRow({ video }: { video: VideoForReview }) {
  const [pending, startTransition] = useTransition();
  const score = parseFloat(video.confidence_score);
  const slug = video.production_slug;

  const onApprove = () =>
    startTransition(() => {
      approveAction(video.id, slug);
    });

  const onReject = () =>
    startTransition(() => {
      rejectAction(video.id, slug);
    });

  const onResetPending = () =>
    startTransition(() => {
      resetToPendingAction(video.id, slug);
    });

  const onRecategorize = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.currentTarget.value as VideoCategory;
    if (value === video.category) return;
    startTransition(() => {
      recategorizeAction(video.id, value, slug);
    });
  };

  return (
    <div
      className={`grid grid-cols-[112px_1fr_auto] gap-4 rounded border border-zinc-800 bg-zinc-900/40 p-3 transition ${
        pending ? 'opacity-50' : 'hover:border-zinc-700'
      }`}
    >
      {/* Thumbnail */}
      <a
        href={video.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        title="Open on source site"
      >
        {video.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail_url}
            alt=""
            className="aspect-video w-full rounded object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded bg-zinc-800 text-xs text-zinc-500">
            no thumb
          </div>
        )}
      </a>

      {/* Title + meta */}
      <div className="min-w-0">
        <a
          href={video.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block truncate font-medium text-zinc-100 hover:text-amber-400"
        >
          {video.title}
        </a>
        <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
          <span className="rounded bg-zinc-800 px-1.5 py-0.5 uppercase">
            {video.source}
          </span>
          <span>{video.channel_name ?? 'unknown channel'}</span>
          <span>·</span>
          <span>{fmtDuration(video.duration_seconds)}</span>
          <span>·</span>
          <span className={scoreColor(score)}>
            {score.toFixed(2)}
          </span>
          <span>·</span>
          <span className={`rounded px-1.5 py-0.5 ${statusBadge(video.status)}`}>
            {video.status}
          </span>
          {video.category_locked && (
            <span title="Category locked by operator" className="text-amber-500">
              🔒
            </span>
          )}
        </div>
        <div className="mt-1 truncate text-xs text-zinc-600">
          → {video.production_title}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col items-end gap-2">
        <select
          value={video.category}
          onChange={onRecategorize}
          disabled={pending}
          className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {video.status !== 'published' && (
            <button
              type="button"
              onClick={onApprove}
              disabled={pending}
              className="rounded bg-emerald-700 px-2 py-1 text-xs text-zinc-100 hover:bg-emerald-600 disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {video.status !== 'rejected' && (
            <button
              type="button"
              onClick={onReject}
              disabled={pending}
              className="rounded bg-red-800 px-2 py-1 text-xs text-zinc-100 hover:bg-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          )}
          {video.status !== 'pending' && (
            <button
              type="button"
              onClick={onResetPending}
              disabled={pending}
              className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Reset
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
