import { NextResponse } from 'next/server';
import { db, getShotOfTheDay } from '@bts/db';
import { absoluteUrl } from '@/lib/site';

/**
 * E-49 — daily-rotating "shot of the day" endpoint.
 *
 * Same day → same shot. Hash on today's UTC date so the value flips
 * at midnight UTC for everyone, regardless of viewer timezone. Cached
 * at the edge for 24 hours; cron not strictly required since the cache
 * key incorporates the date.
 */
export const runtime = 'nodejs';
export const revalidate = 3600;

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function GET() {
  const shot = await getShotOfTheDay(db, todayKey());
  if (!shot) {
    return NextResponse.json(
      { error: 'no_keyframes', detail: 'No production keyframes are seeded yet.' },
      { status: 404 },
    );
  }
  return NextResponse.json(
    {
      day: todayKey(),
      production: {
        slug: shot.production_slug,
        title: shot.production_title,
        url: absoluteUrl(`/films/${shot.production_slug}`),
      },
      image_url: shot.image_url,
      caption: shot.caption,
      palette: shot.palette,
      scene_slug: shot.scene_slug,
      scene_title: shot.scene_title,
    },
    {
      headers: {
        'Cache-Control': 's-maxage=86400, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
