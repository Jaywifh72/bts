/**
 * UX-audit G1 — accessible abbreviation. Renders `<abbr title="…">` with
 * a subtle dotted underline so sighted users can hover for the expansion
 * and screen-reader users hear the title attribute (where supported).
 *
 *   <Abbr title="Director of Photography">DP</Abbr>
 *   <Abbr title="Academy Colour Encoding System">ACES</Abbr>
 *
 * Convention: expand each acronym on its first occurrence per page. Avoid
 * wrapping every instance — that creates dotted-underline noise on dense
 * tables. Editorial copy is the right surface.
 */
export function Abbr({ title, children }: { title: string; children: string }) {
  return (
    <abbr
      title={title}
      className="cursor-help underline decoration-zinc-600 decoration-dotted underline-offset-2"
    >
      {children}
    </abbr>
  );
}

/** Common cinematic-craft acronym dictionary — shared so call sites don't
 *  have to retype the expansion. */
export const CINE_ABBR = {
  DP:    'Director of Photography',
  VFX:   'Visual Effects',
  BAFTA: 'British Academy Film Award',
  VES:   'Visual Effects Society',
  SAG:   'Screen Actors Guild',
  ASC:   'American Society of Cinematographers',
  CDL:   'Color Decision List (ASC standard)',
  ACES:  'Academy Colour Encoding System',
  IDT:   'Input Device Transform (ACES)',
  ODT:   'Output Device Transform (ACES)',
  RRT:   'Reference Rendering Transform (ACES)',
  CSC:   'Canadian Society of Cinematographers',
  BSC:   'British Society of Cinematographers',
  TMDb:  'The Movie Database',
} as const;
