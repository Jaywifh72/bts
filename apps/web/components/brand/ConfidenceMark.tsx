/**
 * Confidence-grade glyph — a 0/25/50/75/100 visual cue that appears
 * next to a specific claim, citation, table cell, or spec value to
 * communicate sourcing strength.
 *
 * Hard rules (per brand brief):
 *   - Only meaningful alongside a specific claim. Never decorative.
 *   - `subject` prop is REQUIRED — it's what the glyph is grading.
 *     The accessible label is "${subject}: ${tier}", so SR users get
 *     the same information sighted users get from the glyph + tooltip.
 *   - This is NOT the CineCanon logo. Level 100 (complete amber ring)
 *     deliberately looks different from the brand mark (amber C with
 *     a notch). Never substitute one for the other.
 *
 * Source SVGs: /CineCanon-Images/02..06_confidence_*.svg.
 */

import {
  CONFIDENCE_OUTER_PATH,
  CONFIDENCE_INNER_PATHS,
  CONFIDENCE_INNER_FILL_RULE,
  CONFIDENCE_LABELS,
  type ConfidenceLevel,
} from './confidence-paths';

interface ConfidenceMarkProps {
  level: ConfidenceLevel;
  /**
   * What this glyph is grading. Required — drives the accessible label.
   * Examples: "Camera body", "Director credit", "TMDB poster path",
   * "Citation rigor".
   */
  subject: string;
  /**
   * Size preset.
   *   body   = 14px (inline in body copy)
   *   inline = 16px (default — inline next to a label)
   *   cell   = 20px (table cells, spec sheets)
   *   hero   = 28px (rollup badges, headers)
   */
  size?: 'body' | 'inline' | 'cell' | 'hero';
  /**
   * Optional override for the tooltip text. Defaults to the canonical
   * tier label ('No source yet', 'Single source', etc.). If you have
   * extra context (e.g. "3 sources: ASC Magazine, Cinematographer's
   * Notebook, AC Mag") pass it here.
   */
  title?: string;
  className?: string;
}

const SIZE_PX: Record<NonNullable<ConfidenceMarkProps['size']>, number> = {
  body: 14,
  inline: 16,
  cell: 20,
  hero: 28,
};

export function ConfidenceMark({
  level,
  subject,
  size = 'inline',
  title,
  className,
}: ConfidenceMarkProps) {
  const px = SIZE_PX[size];
  const tier = CONFIDENCE_LABELS[level];
  const tooltip = title ?? tier;
  const innerPath = CONFIDENCE_INNER_PATHS[level];
  const fillRule = CONFIDENCE_INNER_FILL_RULE[level];

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width={px}
      height={px}
      role="img"
      aria-label={`${subject}: ${tier}`}
      className={className}
      // Vertical-centre on x-height so it sits politely in body copy.
      // 0.125em pulls a 16px glyph down ~2px relative to its baseline.
      style={{ verticalAlign: '-0.125em', flexShrink: 0 }}
    >
      <title>{tooltip}</title>
      <path d={CONFIDENCE_OUTER_PATH} fill="var(--cc-paper)" />
      {innerPath && <path d={innerPath} fill="var(--cc-amber)" fillRule={fillRule} />}
    </svg>
  );
}
