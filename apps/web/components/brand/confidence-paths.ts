/**
 * Confidence-glyph SVG path data, extracted from the five
 * 02..06_confidence_*.svg source files in /CineCanon-Images.
 *
 * Geometry contract (do NOT modify without updating /CineCanon-Images
 * source SVGs in lockstep):
 *
 * - viewBox = 0 0 400 400, centred at (200, 200)
 * - Outer paper-white C ring: r=160..120 with a horizontal bite from
 *   x=319.583 to x=400. Shared by every level (and the brand mark).
 * - Inner amber arc: r=100..80, drawn progressively as level rises.
 *
 * Each entry is the inner-amber `<path d="…">` value. Level 0 has no
 * inner amber (`null`).
 */

export type ConfidenceLevel = 0 | 25 | 50 | 75 | 100;

export const CONFIDENCE_OUTER_PATH =
  'M 359.687 190.000 A 160 160 0 1 0 359.687 210.000 L 319.583 210.000 A 120 120 0 1 1 319.583 190.000 Z';

export const CONFIDENCE_INNER_PATHS: Record<ConfidenceLevel, string | null> = {
  0: null,
  25: 'M 129.289 270.711 A 100 100 0 0 1 129.289 129.289 L 143.431 143.431 A 80 80 0 0 0 143.431 256.569 Z',
  50: 'M 200.000 300.000 A 100 100 0 0 1 200.000 100.000 L 200.000 120.000 A 80 80 0 0 0 200.000 280.000 Z',
  75: 'M 270.711 270.711 A 100 100 0 1 1 270.711 129.289 L 256.569 143.431 A 80 80 0 1 0 256.569 256.569 Z',
  100: 'M 100 200 A 100 100 0 1 0 300 200 A 100 100 0 1 0 100 200 Z M 120 200 A 80 80 0 1 1 280 200 A 80 80 0 1 1 120 200 Z',
};

/** evenodd is required for level 100 — the ring uses a subpath cutout. */
export const CONFIDENCE_INNER_FILL_RULE: Record<ConfidenceLevel, 'nonzero' | 'evenodd'> = {
  0: 'nonzero',
  25: 'nonzero',
  50: 'nonzero',
  75: 'nonzero',
  100: 'evenodd',
};

export const CONFIDENCE_LABELS: Record<ConfidenceLevel, string> = {
  0: 'No source yet',
  25: 'Single source',
  50: 'Two corroborating sources',
  75: 'Three or more corroborating sources',
  100: 'Primary / first-party verified',
};

/**
 * Map an existing 0-100 numeric score (e.g. CitationRigorData.score)
 * onto the five-step glyph. The boundaries match the tier ladder in
 * CitationRigorBadge.tsx so the glyph never disagrees with the label.
 */
export function confidenceLevelFromScore(score: number): ConfidenceLevel {
  if (score >= 90) return 100;
  if (score >= 70) return 75;
  if (score >= 50) return 50;
  if (score >= 25) return 25;
  return 0;
}
