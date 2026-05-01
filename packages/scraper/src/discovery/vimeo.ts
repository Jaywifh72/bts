import 'dotenv/config';

const ACCESS_TOKEN = process.env.VIMEO_ACCESS_TOKEN;
const BASE = 'https://api.vimeo.com';

/** Minimum ms between Vimeo API calls to stay under 60 calls/minute */
const RATE_LIMIT_DELAY_MS = 1_100; // 60 calls/min = 1s/call; 1.1s gives headroom

export interface VimeoVideo {
  source: 'vimeo';
  externalId: string;
  url: string;
  title: string;
  description: string;
  channelId: string | null;
  channelName: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  publishedAt: string | null;
}

let _lastCallAt = 0;

async function rateLimitedFetch(url: string, headers: Record<string, string>): Promise<Response> {
  const now = Date.now();
  const elapsed = now - _lastCallAt;
  if (elapsed < RATE_LIMIT_DELAY_MS) {
    await new Promise((r) => setTimeout(r, RATE_LIMIT_DELAY_MS - elapsed));
  }
  _lastCallAt = Date.now();
  return fetch(url, { headers });
}

/**
 * Search Vimeo for a given query string and return up to maxResults videos.
 *
 * IMPORTANT: Vimeo does not support quoted-phrase search. Quotes are stripped
 * from the query string before sending. Query terms are plain keywords.
 */
export async function searchVimeo(
  query: string,
  maxResults = 10,
): Promise<VimeoVideo[]> {
  if (!ACCESS_TOKEN) {
    console.warn('VIMEO_ACCESS_TOKEN not set — skipping Vimeo search');
    return [];
  }

  // Strip quotes — Vimeo doesn't support quoted-phrase search
  const keywords = query.replace(/"/g, '');

  const url = new URL(`${BASE}/videos`);
  url.searchParams.set('query', keywords);
  url.searchParams.set('per_page', String(maxResults));
  url.searchParams.set('fields', [
    'uri', 'name', 'description', 'duration', 'stats.plays',
    'created_time', 'user', 'pictures',
  ].join(','));

  const res = await rateLimitedFetch(url.toString(), {
    Authorization: `Bearer ${ACCESS_TOKEN}`,
    Accept: 'application/json',
  });

  if (!res.ok) {
    console.error(`Vimeo search failed (${res.status}): ${keywords}`);
    return [];
  }

  const data = await res.json() as {
    data?: Array<{
      uri: string;
      name: string;
      description: string | null;
      duration: number;
      stats?: { plays?: number | null };
      created_time: string;
      user?: { uri: string; name: string } | null;
      pictures?: { sizes?: Array<{ width: number; link: string }> } | null;
    }>;
  };

  return (data.data ?? []).map((item): VimeoVideo => {
    const videoId = item.uri.replace('/videos/', '');
    const userId = item.user?.uri?.replace('/users/', '') ?? null;

    // Pick a medium-sized thumbnail (prefer ~640px wide)
    const thumbs = item.pictures?.sizes ?? [];
    const thumb =
      thumbs.find((s) => s.width >= 640) ??
      thumbs[thumbs.length - 1] ??
      null;

    return {
      source: 'vimeo',
      externalId: videoId,
      url: `https://vimeo.com/${videoId}`,
      title: item.name,
      description: item.description ?? '',
      channelId: userId,
      channelName: item.user?.name ?? null,
      thumbnailUrl: thumb?.link ?? null,
      durationSeconds: item.duration,
      viewCount: item.stats?.plays ?? null,
      publishedAt: item.created_time.split('T')[0] ?? null,
    };
  });
}
