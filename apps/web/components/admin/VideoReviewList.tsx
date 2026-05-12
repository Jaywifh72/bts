'use client';

import { useMemo, useState, useTransition } from 'react';
import type { VideoForReview } from '@bts/db';
import { VideoReviewRow } from './VideoReviewRow';
import {
  bulkApproveAction,
  bulkRejectAction,
  bulkResetAction,
} from '../../app/admin/(authenticated)/videos/actions';

type Props = {
  videos: VideoForReview[];
};

export function VideoReviewList({ videos }: Props) {
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [pending, startTransition] = useTransition();

  const allOnPage = useMemo(() => videos.map((v) => v.id), [videos]);
  const allChecked = allOnPage.length > 0 && allOnPage.every((id) => selected.has(id));

  function toggleOne(id: number, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(allOnPage) : new Set());
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const ids = useMemo(() => Array.from(selected), [selected]);

  function bulkApprove() {
    if (ids.length === 0) return;
    if (!confirm(`Approve ${ids.length} ${ids.length === 1 ? 'video' : 'videos'}?`)) return;
    startTransition(async () => {
      await bulkApproveAction(ids);
      clearSelection();
    });
  }

  function bulkReject() {
    if (ids.length === 0) return;
    if (!confirm(`Reject ${ids.length} ${ids.length === 1 ? 'video' : 'videos'}? Their categories will be locked.`)) return;
    startTransition(async () => {
      await bulkRejectAction(ids);
      clearSelection();
    });
  }

  function bulkReset() {
    if (ids.length === 0) return;
    if (!confirm(`Reset ${ids.length} ${ids.length === 1 ? 'video' : 'videos'} to pending?`)) return;
    startTransition(async () => {
      await bulkResetAction(ids);
      clearSelection();
    });
  }

  return (
    <>
      {/* Select-all bar. Always rendered above the rows. */}
      <div className="mb-2 flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2 text-xs text-zinc-400">
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={allChecked}
            onChange={(e) => toggleAll(e.currentTarget.checked)}
            aria-label="Select all videos on this page"
            className="h-4 w-4 cursor-pointer accent-amber-500"
          />
          <span>Select all on page ({allOnPage.length})</span>
        </label>
        <span className="text-zinc-600">·</span>
        <span>{selected.size} selected</span>
      </div>

      <div className="space-y-2">
        {videos.map((v) => (
          <VideoReviewRow
            key={v.id}
            video={v}
            checked={selected.has(v.id)}
            onToggle={toggleOne}
          />
        ))}
      </div>

      {/* Sticky bulk-action bar appears once at least one row is selected. */}
      {selected.size > 0 && (
        <div
          role="region"
          aria-label="Bulk actions"
          className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center justify-between gap-3 rounded border border-amber-600/60 bg-zinc-900/95 p-3 shadow-lg backdrop-blur"
        >
          <div className="text-sm text-zinc-200">
            {selected.size} selected
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={bulkApprove}
              disabled={pending}
              className="rounded bg-emerald-700 px-3 py-1.5 text-sm text-zinc-100 hover:bg-emerald-600 disabled:opacity-50"
            >
              Approve {selected.size}
            </button>
            <button
              type="button"
              onClick={bulkReject}
              disabled={pending}
              className="rounded bg-red-800 px-3 py-1.5 text-sm text-zinc-100 hover:bg-red-700 disabled:opacity-50"
            >
              Reject {selected.size}
            </button>
            <button
              type="button"
              onClick={bulkReset}
              disabled={pending}
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
            >
              Reset to pending
            </button>
            <button
              type="button"
              onClick={clearSelection}
              disabled={pending}
              className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 hover:bg-zinc-800 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </>
  );
}
