/**
 * Minimal MusicBrainz Web Service v2 client.
 *
 * Rate limits: MusicBrainz allows 1 req/sec per IP for anonymous use.
 * The required User-Agent header (with contact info) is enforced —
 * requests without it are silently throttled even harder.
 *
 * Docs: https://musicbrainz.org/doc/MusicBrainz_API
 */

const BASE = 'https://musicbrainz.org/ws/2';
const UA = process.env.MUSICBRAINZ_USER_AGENT
  ?? 'CineCanon/1.0 (https://www.cinecanon.com; ops@cinecanon.com)';

// Single-flight throttle: hold a Promise that resolves 1.1s after the
// previous request completed. Guarantees ≤ 0.9 req/s under the cap.
let nextSlot: Promise<void> = Promise.resolve();

async function throttle(): Promise<void> {
  const wait = nextSlot;
  nextSlot = wait.then(() => new Promise((r) => setTimeout(r, 1100)));
  return wait;
}

async function fetchMb<T>(path: string, query: Record<string, string>): Promise<T | null> {
  await throttle();
  const qs = new URLSearchParams({ fmt: 'json', ...query });
  const url = `${BASE}${path}?${qs.toString()}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': UA, Accept: 'application/json' },
  });
  if (res.status === 503 || res.status === 429) {
    // Rate-limited despite our throttle — back off 5s and retry once.
    await new Promise((r) => setTimeout(r, 5000));
    const retry = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
    if (!retry.ok) return null;
    return retry.json() as Promise<T>;
  }
  if (!res.ok) return null;
  return res.json() as Promise<T>;
}

// ── Release-group search (for a film soundtrack) ───────────────────

export type MbReleaseGroup = {
  id: string;                                        // MBID
  title: string;
  'first-release-date'?: string;
  'primary-type'?: string;
  'secondary-types'?: string[];
  'artist-credit'?: { name: string; artist: { id: string; name: string } }[];
};

export async function searchSoundtrackReleaseGroup(
  filmTitle: string,
  year?: number | null,
): Promise<MbReleaseGroup | null> {
  // Lucene-style query: title:"X" AND secondarytype:soundtrack
  // Optionally constrain by release year ±1.
  const parts = [`releasegroup:"${filmTitle.replace(/"/g, '')}"`, 'secondarytype:soundtrack'];
  if (year) parts.push(`firstreleasedate:[${year - 1}-01 TO ${year + 1}-12]`);
  const q = parts.join(' AND ');
  const json = await fetchMb<{ 'release-groups': MbReleaseGroup[] }>('/release-group', {
    query: q, limit: '5',
  });
  if (!json || json['release-groups'].length === 0) return null;
  // Prefer the exact-title match closest to the requested year.
  const exact = json['release-groups'].find(
    (rg) => rg.title.toLowerCase() === filmTitle.toLowerCase(),
  );
  return exact ?? json['release-groups'][0] ?? null;
}

// ── Release group detail: tracklist + labels ───────────────────────

export type MbRelease = {
  id: string;
  title: string;
  date?: string;
  country?: string;
  'label-info'?: { label?: { id: string; name: string }; 'catalog-number'?: string }[];
  media?: {
    'track-count': number;
    tracks: {
      position: number;
      title: string;
      length?: number;             // milliseconds
      recording?: { id: string; title: string };
    }[];
  }[];
};

export async function getReleaseGroupDetail(
  releaseGroupId: string,
): Promise<{ releases: MbRelease[] } | null> {
  return fetchMb<{ releases: MbRelease[] }>(`/release-group/${releaseGroupId}`, {
    inc: 'releases+labels+media+recordings+artist-credits',
  });
}

export async function getReleaseDetail(releaseId: string): Promise<MbRelease | null> {
  return fetchMb<MbRelease>(`/release/${releaseId}`, {
    inc: 'recordings+labels+artist-credits',
  });
}
