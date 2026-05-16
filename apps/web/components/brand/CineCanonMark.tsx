/**
 * CineCanon brand mark — the C-in-C ligature.
 *
 * Source of truth: /CineCanon-Images/01_brand_mark.svg.
 *
 * Hard rules (per brand brief):
 *   1. Never recolour, rotate, restyle, add shadows/gradients/outlines.
 *      The mark is locked vector; props deliberately don't expose colour
 *      knobs. If a use case seems to need a variant, ask the brand owner.
 *   2. Minimum size 16px. Below that, don't render.
 *   3. This is NOT the same thing as the 100% confidence glyph — even
 *      though both share the outer paper-C ring. The inner amber of the
 *      brand mark is a *C* (open on the right); the inner amber of the
 *      100% confidence glyph is a *complete ring*. Different vectors.
 *
 * The wordmark text "CineCanon" is rendered as DOM text by the caller
 * (e.g. TopNav, Footer), not bundled into this component. That keeps
 * the mark a pure vector and lets the wordmark inherit page typography.
 */

interface CineCanonMarkProps {
  /**
   * Rendered size in CSS pixels (square). Common values:
   *   16  — favicon (verified scale-test minimum)
   *   24  — inline body text, footer
   *   28  — header alongside serif wordmark
   *   32–40 — standalone header
   *   80+ — splash / 404 / hero
   */
  size?: number;
  className?: string;
  /**
   * Override the accessible name. Defaults to "CineCanon", which is
   * correct for header / footer / favicon. Set to "" if the mark is
   * decorative because the surrounding DOM already says CineCanon.
   */
  title?: string;
}

export function CineCanonMark({ size = 32, className, title = 'CineCanon' }: CineCanonMarkProps) {
  if (size < 16) return null;
  const decorative = title === '';
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 400"
      width={size}
      height={size}
      role={decorative ? 'presentation' : 'img'}
      aria-label={decorative ? undefined : title}
      aria-hidden={decorative || undefined}
      className={className}
    >
      {!decorative && <title>{title}</title>}
      {/* Outer paper-white C — radii 160..120, horizontal bite on the right */}
      <path
        d="M 359.687 190.000 A 160 160 0 1 0 359.687 210.000 L 319.583 210.000 A 120 120 0 1 1 319.583 190.000 Z"
        fill="var(--cc-paper)"
      />
      {/* Inner amber C — radii 100..80, scaled-in version of the outer C */}
      <path
        d="M 299.820 194.000 A 100 100 0 1 0 299.820 206.000 L 279.775 206.000 A 80 80 0 1 1 279.775 194.000 Z"
        fill="var(--cc-amber)"
      />
    </svg>
  );
}
