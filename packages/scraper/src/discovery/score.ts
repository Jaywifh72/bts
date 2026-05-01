import Fuse from 'fuse.js';
import {
  YOUTUBE_AUTHORITY_CHANNELS,
  VIMEO_AUTHORITY_CHANNELS,
} from './channels.ts';

interface VideoCandidate {
  source: 'youtube' | 'vimeo';
  title: string;
  description: string;
  channelId: string | null;
  durationSeconds: number | null;
  viewCount: number | null;
  publishedAt: string | null;
}

interface ProductionContext {
  title: string;
  releaseYear: number | null;
}

/**
 * Keyword lists used to award the keyword-match signal.
 * All categories share a single flat list for scoring — category assignment
 * is a separate step (categorise.ts).
 */
const RELEVANCE_KEYWORDS = [
  'breakdown', 'vfx', 'visual effects', 'cgi', 'making of', 'making-of',
  'behind the scenes', 'bts', 'cinematography', 'production design',
  'compositing', 'nuke', 'director', 'featurette', 'on set',
];

/**
 * Compute confidence score for a video candidate against a production.
 *
 * Signals and weights:
 *  0.30 — film title in video title (exact substring = 0.30; fuzzy = 0.15)
 *  0.10 — release year in video title or description
 *  0.25 — channel on authority list
 *  0.20 — relevance keyword in video title
 *  0.10 — duration between 90s and 1800s (30 min)
 *  0.05 — view count ≥ 10,000
 *
 * Maximum possible score = 1.00
 */
export function scoreVideo(
  candidate: VideoCandidate,
  production: ProductionContext,
): number {
  let score = 0;

  // Signal 1: film title in video title (0.30)
  const lowerTitle = candidate.title.toLowerCase();
  const lowerProductionTitle = production.title.toLowerCase();

  if (lowerTitle.includes(lowerProductionTitle)) {
    score += 0.30;
  } else {
    // Fuzzy match via fuse.js
    const fuse = new Fuse([candidate.title], {
      threshold: 0.3,
      includeScore: true,
    });
    const results = fuse.search(production.title);
    if (results.length > 0) {
      score += 0.15;
    }
  }

  // Signal 2: release year in title or description (0.10)
  if (production.releaseYear !== null) {
    const yearStr = String(production.releaseYear);
    if (
      candidate.title.includes(yearStr) ||
      candidate.description.includes(yearStr)
    ) {
      score += 0.10;
    }
  }

  // Signal 3: channel on authority list (0.25)
  if (candidate.channelId) {
    const authorityMap =
      candidate.source === 'youtube'
        ? YOUTUBE_AUTHORITY_CHANNELS
        : VIMEO_AUTHORITY_CHANNELS;
    if (candidate.channelId in authorityMap) {
      score += 0.25;
    }
  }

  // Signal 4: relevance keyword in video title (0.20)
  if (RELEVANCE_KEYWORDS.some((kw) => lowerTitle.includes(kw))) {
    score += 0.20;
  }

  // Signal 5: duration 90s–1800s (0.10)
  if (
    candidate.durationSeconds !== null &&
    candidate.durationSeconds >= 90 &&
    candidate.durationSeconds <= 1800
  ) {
    score += 0.10;
  }

  // Signal 6: view count ≥ 10,000 (0.05)
  if (candidate.viewCount !== null && candidate.viewCount >= 10_000) {
    score += 0.05;
  }

  return Math.min(score, 1.0);
}
