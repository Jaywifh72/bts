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
  composerName?: string,
): Promise<MbReleaseGroup | null> {
  // Lucene-style query: title:"X" AND secondarytype:soundtrack.
  // Constrain by release year ±1 when known. We fetch 10 candidates
  // so the post-filter ranking has enough to chew on — soundtrack
  // titles often look like "X: Original Motion Picture Soundtrack",
  // "X (Music From the Motion Picture)", "X Vol. 1", etc.
  //
  // When the composer is known, ADD an artist clause: 'artist:"X"'.
  // This is decisive for generic-title films like "Soul" (Pixar) —
  // without the artist constraint, MB returns 1000+ random "Soul"
  // releases and the correct OST falls below the limit.
  const parts = [`releasegroup:"${filmTitle.replace(/"/g, '')}"`, 'secondarytype:soundtrack'];
  if (year) parts.push(`firstreleasedate:[${year - 1}-01 TO ${year + 1}-12]`);
  if (composerName) parts.push(`artist:"${composerName.replace(/"/g, '')}"`);
  const q = parts.join(' AND ');
  let json = await fetchMb<{ 'release-groups': MbReleaseGroup[] }>('/release-group', {
    query: q, limit: '10',
  });

  // Fallback: if artist-constrained search returned zero, try without
  // the artist clause. Composer may be credited under a stage name
  // ('Mica Levi' vs 'Micachu') or a co-composer credit.
  if (composerName && (!json || json['release-groups'].length === 0)) {
    const q2 = parts.filter((p) => !p.startsWith('artist:')).join(' AND ');
    json = await fetchMb<{ 'release-groups': MbReleaseGroup[] }>('/release-group', {
      query: q2, limit: '10',
    });
  }

  if (!json || json['release-groups'].length === 0) return null;

  const titleLc = filmTitle.toLowerCase();
  const composerLc = composerName?.toLowerCase();

  // Score each candidate. Higher = better.
  function score(rg: MbReleaseGroup): number {
    let s = 0;
    const rgTitle = rg.title.toLowerCase();
    // Title contains the film name as a prefix/word.
    if (rgTitle === titleLc) s += 100;
    else if (rgTitle.startsWith(titleLc)) s += 60;
    else if (rgTitle.includes(titleLc)) s += 30;
    // Composer in artist-credit (decisive — eliminates wrong-film matches
    // like "Gravity Falls Main Title Theme" by Brad Breeck).
    if (composerLc && rg['artist-credit']?.some((a) => a.name.toLowerCase().includes(composerLc))) {
      s += 80;
    }
    // BOOST full-album release-group titles. These are the OST / soundtrack
    // album we want, not the promo singles.
    if (/original motion picture soundtrack|music from the motion picture|music inspired by/.test(rgTitle)) s += 80;
    if (/^soundtrack$|^score$|complete score/.test(rgTitle)) s += 40;
    // PENALIZE promo singles — '(from "X")', 'Theme from X', 'X (Single)',
    // 'Main Title', solo-track release groups. These usually have one track.
    if (/\(from ["']/.test(rgTitle)) s -= 80;
    if (/\b(single|ep|promo|theme from|main title)\b/.test(rgTitle)) s -= 50;
    // Penalize compilation / various-artist titles.
    if (rg.title.toLowerCase().includes('various')) s -= 50;
    if (rg['artist-credit']?.some((a) => a.name.toLowerCase() === 'various artists')) s -= 30;
    return s;
  }

  const ranked = [...json['release-groups']].sort((a, b) => score(b) - score(a));
  const top = ranked[0];
  // Only accept matches with a non-negative score. If the best we can do
  // is "Gravity Falls" (zero score for Gravity-the-film + composer
  // mismatch = negative), reject the whole search.
  if (!top || score(top) < 30) return null;
  return top;
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

/**
 * List the releases under a release group. Only `releases` is a valid
 * include for this endpoint — media / recordings are fetched per release.
 */
export async function getReleaseGroupReleases(
  releaseGroupId: string,
): Promise<MbRelease[]> {
  const json = await fetchMb<{ releases: MbRelease[] }>(`/release-group/${releaseGroupId}`, {
    inc: 'releases',
  });
  return json?.releases ?? [];
}

/**
 * Get a single release's tracklist + label info. media+recordings together
 * give us position/title/length per track.
 */
export async function getReleaseDetail(releaseId: string): Promise<MbRelease | null> {
  return fetchMb<MbRelease>(`/release/${releaseId}`, {
    inc: 'recordings+labels+artist-credits+media',
  });
}
