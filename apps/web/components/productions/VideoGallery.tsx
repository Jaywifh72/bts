'use client';

import { useState } from 'react';
import { SectionHeader } from '@/components/ui/SectionHeader';
import type { ProductionVideo } from '@bts/db';

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

function formatViews(count: number | null): string {
  if (count === null) return '';
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M views`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(0)}K views`;
  return `${count} views`;
}

/** Decode common HTML entities returned by YouTube/Vimeo titles. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

interface VideoCardProps {
  video: ProductionVideo;
}

function VideoCard({ video }: VideoCardProps) {
  return (
    <a
      href={video.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col overflow-hidden rounded border border-zinc-800 bg-zinc-900 hover:border-zinc-600 transition-colors"
    >
      {/* 16:9 thumbnail */}
      <div className="relative aspect-video w-full bg-zinc-950">
        {video.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnail_url}
            alt={decodeEntities(video.title)}
            referrerPolicy="no-referrer"
            loading="lazy"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <span className="text-2xl text-zinc-700">▶</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-1.5 p-2">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-zinc-200">
          {decodeEntities(video.title)}
        </p>
        <span className="inline-block self-start rounded bg-zinc-950 px-1.5 py-0.5 text-[10px] text-amber-500 border border-zinc-800">
          {CATEGORY_LABELS[video.category] ?? video.category}
        </span>
        <p className="mt-auto text-[10px] text-zinc-500">
          {[
            video.channel_name,
            formatDuration(video.duration_seconds),
            formatViews(video.view_count),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </div>
    </a>
  );
}

interface VideoGalleryProps {
  videos: ProductionVideo[];
}

export function VideoGallery({ videos }: VideoGalleryProps) {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  if (videos.length === 0) return null;

  // Build category tab list (only categories that have at least one video)
  const categoryCounts = new Map<string, number>();
  for (const v of videos) {
    categoryCounts.set(v.category, (categoryCounts.get(v.category) ?? 0) + 1);
  }

  const visibleVideos =
    activeCategory === 'all'
      ? videos
      : videos.filter((v) => v.category === activeCategory);

  return (
    <div className="mt-8">
      <SectionHeader label="Production" heading="Videos" />

      {/* Category filter tabs */}
      <div className="mb-4 flex flex-wrap gap-1.5">
        <button
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
          .sort(([, a], [, b]) => b - a)
          .map(([cat, count]) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                activeCategory === cat
                  ? 'bg-amber-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              {CATEGORY_LABELS[cat] ?? cat} ({count})
            </button>
          ))}
      </div>

      {/* 3-column thumbnail grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visibleVideos.map((v) => (
          <VideoCard key={`${v.source}:${v.external_id}`} video={v} />
        ))}
      </div>
    </div>
  );
}
