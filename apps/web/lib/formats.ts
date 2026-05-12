/**
 * T4-4 — canonical taxonomy for "Shot on this format" pages.
 *
 * The `production_formats.acquisition_format` column is free text in v1
 * (per the data-layer spec — promotion to a lookup table is deferred to
 * sub-project 4). Until that lands we bridge from a small hand-maintained
 * taxonomy of canonical format slugs to ILIKE-pattern matchers that
 * cover the seeded variants (e.g. "ARRIRAW ALEXA 65" and "ARRIRAW ALEXA
 * 65 (primary)" both fold into the same `arri-alexa-65` slug).
 */

export type FormatTaxonomyEntry = {
  slug: string;
  label: string;
  /** One-line editorial description shown on the format page. */
  description: string;
  /** Postgres ILIKE patterns. Production matches if ANY pattern hits. */
  patterns: string[];
};

export const FORMAT_TAXONOMY: readonly FormatTaxonomyEntry[] = [
  {
    slug: 'imax-65mm',
    label: 'IMAX 65mm 15-perf',
    description:
      'The largest commonly-shot film format — 65mm running horizontally through the gate, 15-perforation frame. Rare cameras, prohibitive cost, unmatched negative real estate. Used by Nolan (Oppenheimer, Dunkirk, Tenet), Joe Wright, and a handful of others as a signature acquisition format.',
    patterns: ['%IMAX 65mm%', '%IMAX 70mm%', '%IMAX 1.43%'],
  },
  {
    slug: 'panavision-65mm',
    label: 'Panavision 65mm 5-perf',
    description:
      '5-perf 65mm photographed vertically, projected as 70mm release prints. Used historically (Lawrence of Arabia, 2001) and revived by Tarantino (The Hateful Eight in Ultra Panavision 70) and PTA (The Master).',
    patterns: ['%Panavision 65mm%', '%Super Panavision 70%', '%Ultra Panavision 70%'],
  },
  {
    slug: 'arri-alexa-65',
    label: 'ARRI ALEXA 65',
    description:
      'ARRI’s large-format digital flagship — a 65.4 × 24.2mm sensor (54.12mm image circle on the 16:9 crop). Co-rented exclusively through ARRI Rental. Lubezki on The Revenant, Fraser on Dune, Roger Deakins on 1917.',
    patterns: ['%ALEXA 65%'],
  },
  {
    slug: 'arri-alexa-mini-lf',
    label: 'ARRI ALEXA Mini LF',
    description:
      'Compact full-frame digital body. The de facto modern workhorse for tentpoles since 2019 — Mando-mount and weight-friendly enough for handheld and Steadicam, with a 4.5K LF Open Gate sensor.',
    patterns: ['%ALEXA Mini LF%', '%Mini LF%'],
  },
  {
    slug: 'arri-alexa-lf',
    label: 'ARRI ALEXA LF',
    description:
      'Full-frame predecessor to the Mini LF. Same 36.7 × 25.54mm sensor, larger body, internal motorized ND.',
    patterns: ['%ALEXA LF%'],
  },
  {
    slug: 'kodak-35mm-anamorphic',
    label: '35mm anamorphic',
    description:
      '4-perf 35mm with anamorphic glass squeezing a wider aspect onto the negative. The classic Hollywood widescreen lookup — Panavision Sphero / G-Series / T-Series, Cooke Anamorphic /i, Hawk V-Lite.',
    patterns: ['%35mm 4-perf anamorphic%', '%35mm 4-perf (Panavision anamorphic)%'],
  },
  {
    slug: 'kodak-35mm-spherical',
    label: '35mm spherical',
    description:
      '4-perf 35mm with non-anamorphic (spherical) lenses. Smaller image area than 65mm but the format that defined post-1953 cinema.',
    patterns: ['%35mm 4-perf (Panavision spherical)%', '%35mm 4-perf (1.37%'],
  },
  {
    slug: 'kodak-super16',
    label: 'Super 16mm',
    description:
      '16mm with the soundtrack area reclaimed for picture, giving a near-1.78 native ratio. Affordable, portable, characterful grain; favored for documentary, indie features, and "homemade" sequences in larger productions.',
    patterns: ['%Super 16mm%', '%Super-16%'],
  },
  {
    slug: 'vistavision',
    label: 'VistaVision (8-perf 35mm horizontal)',
    description:
      '35mm running horizontally with an 8-perf gate, doubling the image area of vertical 4-perf 35mm. Used historically by Hitchcock and revived by The Brutalist and Mission: Impossible plate units.',
    patterns: ['%VistaVision%', '%8-perf%'],
  },
] as const;

export function getFormatBySlug(slug: string): FormatTaxonomyEntry | undefined {
  return FORMAT_TAXONOMY.find((f) => f.slug === slug);
}
