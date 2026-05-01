import 'dotenv/config';

const API_KEY = process.env.YOUTUBE_API_KEY;
const BASE = 'https://www.googleapis.com/youtube/v3';

export interface YouTubeVideo {
  source: 'youtube';
  externalId: string;
  url: string;
  title: string;
  description: string;
  channelId: string;
  channelName: string;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  publishedAt: string | null;
}

/** Parse ISO 8601 duration (e.g. PT4M13S) to seconds */
function parseDuration(iso: string): number | null {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return null;
  const h = parseInt(m[1] ?? '0', 10);
  const min = parseInt(m[2] ?? '0', 10);
  const s = parseInt(m[3] ?? '0', 10);
  return h * 3600 + min * 60 + s;
}

/**
 * Search YouTube for a given query string and return up to maxResults videos
 * enriched with duration and view count.
 */
export async function searchYouTube(
  query: string,
  maxResults = 10,
): Promise<YouTubeVideo[]> {
  if (!API_KEY) {
    console.warn('YOUTUBE_API_KEY not set — skipping YouTube search');
    return [];
  }

  // Step 1: search.list — costs 100 quota units
  const searchUrl = new URL(`${BASE}/search`);
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('maxResults', String(maxResults));
  searchUrl.searchParams.set('key', API_KEY);

  const searchRes = await fetch(searchUrl.toString());
  if (!searchRes.ok) {
    console.error(`YouTube search failed (${searchRes.status}): ${query}`);
    return [];
  }
  const searchData = await searchRes.json() as {
    items?: Array<{
      id: { videoId: string };
      snippet: {
        title: string;
        description: string;
        channelId: string;
        channelTitle: string;
        thumbnails?: { medium?: { url: string } };
        publishedAt: string;
      };
    }>;
  };

  const items = searchData.items ?? [];
  if (items.length === 0) return [];

  const videoIds = items.map((i) => i.id.videoId).join(',');

  // Step 2: videos.list to get contentDetails + statistics — costs 1 unit
  const detailUrl = new URL(`${BASE}/videos`);
  detailUrl.searchParams.set('part', 'contentDetails,statistics');
  detailUrl.searchParams.set('id', videoIds);
  detailUrl.searchParams.set('key', API_KEY);

  const detailRes = await fetch(detailUrl.toString());
  const detailData = detailRes.ok
    ? await detailRes.json() as {
        items?: Array<{
          id: string;
          contentDetails: { duration: string };
          statistics: { viewCount?: string };
        }>;
      }
    : { items: [] };

  const detailMap = new Map(
    (detailData.items ?? []).map((d) => [d.id, d]),
  );

  return items.map((item): YouTubeVideo => {
    const detail = detailMap.get(item.id.videoId);
    return {
      source: 'youtube',
      externalId: item.id.videoId,
      url: `https://www.youtube.com/watch?v=${item.id.videoId}`,
      title: item.snippet.title,
      description: item.snippet.description,
      channelId: item.snippet.channelId,
      channelName: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails?.medium?.url ?? null,
      durationSeconds: detail ? parseDuration(detail.contentDetails.duration) : null,
      viewCount: detail?.statistics.viewCount
        ? parseInt(detail.statistics.viewCount, 10)
        : null,
      publishedAt: item.snippet.publishedAt?.split('T')[0] ?? null,
    };
  });
}
