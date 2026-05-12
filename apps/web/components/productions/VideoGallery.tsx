'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { ProductionVideo, VideoTimestampAnnotation } from '@bts/db';

const CATEGORY_LABELS: Record<string, string> = {
  vfx_breakdown: 'VFX Breakdown',
  compositing: 'Compositing',
  making_of: 'Making Of',
  behind_the_scenes: 'Behind the Scenes',
  director_interview: 'Director Interview',
  dp_interview: 'DP Interview',
  production_design: 'Production Design',
  stunts: 'Stunts',
  sound: 'Sound',
  music: 'Music',
  other: 'Other',
};

function formatDuration(seconds: number | null): string {
  if (seconds === null) return '';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatTimestamp(seconds: number): string {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function formatViews(count: number | null): string {
  if (count === null) return '';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`;
  return `${count} views`;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function timestampUrl(url: string, seconds: number): string {
  const separator = url.includes('?') ? '&' : '?';
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return `${url}${separator}t=${seconds}s`;
  }
  return `${url}#t=${seconds}`;
}

function annotationLabel(type: string): string {
  return type.replace(/_/g, ' ');
}

function VideoCard({
  video,
  timestamps,
}: {
  video: ProductionVideo;
  timestamps: readonly VideoTimestampAnnotation[];
}) {
  const claims = timestamps.filter((t) => t.claim_statement);
  const gearMentions = timestamps.filter((t) => t.annotation_type === 'visible_gear').length;
  const vfxMentions = timestamps.filter((t) => t.annotation_type === 'vfx_before_after').length;

  return (
    <article className="flex flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-600">
      <a href={video.url} target="_blank" rel="noopener noreferrer" className="block">
        <div className="relative aspect-video w-full bg-zinc-950">
          {video.thumbnail_url ? (
            <Image
              src={video.thumbnail_url}
              alt={decodeEntities(video.title)}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover"
              referrerPolicy="no-referrer"
              // External video CDNs occasionally serve from non-allow-listed
              // hosts (vimeo-source variants, custom CDNs); unoptimized keeps
              // the original URL when Next/Image's optimizer would 404.
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <span className="text-xs uppercase tracking-wide text-zinc-700">Play</span>
            </div>
          )}
        </div>
      </a>

      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <a href={video.url} target="_blank" rel="noopener noreferrer" className="hover:text-amber-400">
          <p className="line-clamp-2 text-xs font-medium leading-snug text-zinc-200">
            {decodeEntities(video.title)}
          </p>
        </a>
        <span
          className={`inline-block self-start rounded px-1.5 py-0.5 text-[10px] border ${
            video.category === 'stunts'
              ? 'bg-red-950/40 text-red-300 border-red-900/60'
              : 'bg-zinc-950 text-amber-500 border-zinc-800'
          }`}
        >
          {CATEGORY_LABELS[video.category] ?? video.category}
        </span>
        <p className="mt-auto text-[10px] text-zinc-500">
          {[
            video.channel_name,
            formatDuration(video.duration_seconds),
            formatViews(video.view_count),
          ]
            .filter(Boolean)
            .join(' / ')}
        </p>

        {timestamps.length > 0 && (
          <div className="mt-2 border-t border-zinc-800 pt-2">
            <div className="mb-2 flex flex-wrap gap-1.5 text-[10px] uppercase tracking-wide">
              <span className="rounded border border-indigo-700/60 bg-indigo-950/35 px-1.5 py-0.5 text-indigo-300">
                {timestamps.length} timestamp{timestamps.length === 1 ? '' : 's'}
              </span>
              {claims.length > 0 && (
                <span className="rounded border border-emerald-700/60 bg-emerald-950/35 px-1.5 py-0.5 text-emerald-300">
                  {claims.length} claim{claims.length === 1 ? '' : 's'}
                </span>
              )}
              {gearMentions > 0 && (
                <span className="rounded border border-cyan-700/60 bg-cyan-950/35 px-1.5 py-0.5 text-cyan-300">
                  gear visible
                </span>
              )}
              {vfxMentions > 0 && (
                <span className="rounded border border-violet-700/60 bg-violet-950/35 px-1.5 py-0.5 text-violet-300">
                  VFX shown
                </span>
              )}
            </div>
            <ol className="space-y-2">
              {timestamps.slice(0, 4).map((timestamp) => (
                <li key={timestamp.id} className="border-l border-zinc-800 pl-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <a
                      href={timestampUrl(video.url, timestamp.start_seconds)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono text-xs text-amber-400 hover:underline"
                    >
                      {formatTimestamp(timestamp.start_seconds)}
                      {timestamp.end_seconds !== null ? `-${formatTimestamp(timestamp.end_seconds)}` : ''}
                    </a>
                    <span className="text-[10px] uppercase tracking-wide text-zinc-600">
                      {annotationLabel(timestamp.annotation_type)}
                    </span>
                    {timestamp.evidence_item_id && (
                      <span className="text-[10px] uppercase tracking-wide text-indigo-300">
                        evidence
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-xs text-zinc-300">
                    {timestamp.label}
                  </p>
                  {timestamp.claim_statement && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-zinc-500">
                      Claim: {timestamp.claim_statement}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            {timestamps.length > 4 && (
              <p className="mt-2 text-[11px] text-zinc-600">
                +{timestamps.length - 4} more annotated moments
              </p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export function VideoGallery({
  videos,
  timestamps,
}: {
  videos: ProductionVideo[];
  timestamps: readonly VideoTimestampAnnotation[];
}) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (videos.length === 0) return null;

  const categoryCounts = new Map<string, number>();
  for (const v of videos) {
    categoryCounts.set(v.category, (categoryCounts.get(v.category) ?? 0) + 1);
  }

  // Memoised — `timestamps` is stable across renders for a given film,
  // so the bucketing only needs to run when the prop changes.
  const timestampsByVideo = useMemo(() => {
    return timestamps.reduce<Record<number, VideoTimestampAnnotation[]>>((acc, timestamp) => {
      (acc[timestamp.video_id] ??= []).push(timestamp);
      return acc;
    }, {});
  }, [timestamps]);

  const visibleVideos =
    activeCategory === 'all'
      ? videos
      : videos.filter((v) => v.category === activeCategory);

  return (
    <div className="mt-8">
      <SectionHeader label="Production" heading="Videos" />
      {timestamps.length > 0 && (
        <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
          Reviewed BTS annotations mark where gear, VFX, lighting, or claim evidence appears in the source videos.
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`rounded px-3 py-1 text-xs transition-colors ${
            activeCategory === 'all'
              ? 'bg-amber-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
          }`}
        >
          All ({videos.length})
        </button>
        {[...categoryCounts.entries()]
          .sort(([a], [b]) => {
            // Surface 'stunts' first when present — the most
            // under-documented department in working cinema, given
            // pride of place in the filter row.
            if (a === 'stunts') return -1;
            if (b === 'stunts') return 1;
            return (categoryCounts.get(b) ?? 0) - (categoryCounts.get(a) ?? 0);
          })
          .map(([cat, count]) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                activeCategory === cat
                  ? cat === 'stunts'
                    ? 'bg-red-700 text-white'
                    : 'bg-amber-600 text-white'
                  : cat === 'stunts'
                    ? 'border border-red-900/50 bg-red-950/30 text-red-300 hover:bg-red-950/50'
                    : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat} ({count})
            </button>
          ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleVideos.map((v) => (
          <VideoCard
            key={`${v.source}:${v.external_id}`}
            video={v}
            timestamps={timestampsByVideo[v.id] ?? []}
          />
        ))}
      </div>
    </div>
  );
}
