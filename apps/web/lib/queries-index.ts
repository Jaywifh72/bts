/**
 * Canonical "killer queries" list shared by `/queries` (full index) and the
 * homepage rail. Single source of truth so the rail can't drift from the
 * actual query pages — UX-audit G9.
 *
 * To add a new killer query: add an entry here, then create a matching
 * `app/queries/<slug>/page.tsx`. The homepage shows the first three.
 */
export type KillerQuery = {
  slug: string;
  title: string;
  description: string;
  crossCuts: string[];
};

export const KILLER_QUERIES: KillerQuery[] = [
  {
    slug: 'alexa65-sphero',
    title: 'ALEXA 65 + Panavision Sphero anamorphic',
    description:
      'Every theatrical feature shot on the ARRI ALEXA 65 with Panavision Sphero anamorphic lenses, sorted by Director of Photography.',
    crossCuts: ['Camera body', 'Lens series', 'DP attribution'],
  },
  {
    slug: 'dune-part-two-lenses',
    title: 'Greig Fraser’s lenses on Dune: Part Two',
    description:
      'Every lens series Greig Fraser specified on Dune: Part Two (2024), with the gear-detail page link and the scenes each lens covers.',
    crossCuts: ['DP', 'Production', 'Lens series', 'Per-scene equipment'],
  },
  {
    slug: 'magic-hour-2023',
    title: 'Magic-hour exterior lighting (2023 features)',
    description:
      'All 2023 productions with at least one curated exterior magic-hour scene, with the lighting plot per scene.',
    crossCuts: ['Year', 'Scene metadata', 'Lighting setup'],
  },
];
