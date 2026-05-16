import { societies } from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

/**
 * E-20 v1 — Cinematography society catalog.
 *
 * The codes here mirror what's already in `people.member_societies` (a
 * curated text[] populated alongside DP biographies). Each entry holds
 * the canonical metadata needed for a society detail page; members are
 * resolved at query time by `people.member_societies @> ARRAY[code]`.
 *
 * Note: 'CBE' appears in some DP seed rows (e.g. Roger Deakins). It's
 * an Order of the British Empire honour, *not* a cinematography
 * society, so it's deliberately not catalogued here. The text[] entry
 * stays on the people row for record-keeping; it just won't link to
 * a /societies/[slug] page.
 *
 * Sort order: ASC and BSC lead because they're the two most-cited in
 * cinematographer signatures; the rest follow alphabetically by code.
 */

type SocietySeed = {
  slug: string;
  code: string;
  name: string;
  fullName: string;
  country?: string;
  foundedYear?: number;
  website?: string;
  wikipediaUrl?: string;
  description?: string;
  sortOrder: number;
};

export const societiesData: SocietySeed[] = [
  {
    slug: 'asc',
    code: 'ASC',
    name: 'ASC',
    fullName: 'American Society of Cinematographers',
    country: 'US',
    foundedYear: 1919,
    website: 'https://theasc.com',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/American_Society_of_Cinematographers',
    description:
      'Honorary professional society for U.S. directors of photography. Membership is by invitation and is among the most-recognised credentials in cinematography. Publishes American Cinematographer magazine and presents the annual ASC Awards.',
    sortOrder: 1,
  },
  {
    slug: 'bsc',
    code: 'BSC',
    name: 'BSC',
    fullName: 'British Society of Cinematographers',
    country: 'GB',
    foundedYear: 1949,
    website: 'https://bscine.com',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/British_Society_of_Cinematographers',
    description:
      'Honorary professional society for UK-based directors of photography. Membership is by invitation. Presents the annual BSC Awards.',
    sortOrder: 2,
  },
  {
    slug: 'afc',
    code: 'AFC',
    name: 'AFC',
    fullName: 'Association Française des Directeurs de la Photographie Cinématographique',
    country: 'FR',
    foundedYear: 1991,
    website: 'https://afcinema.com',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Association_fran%C3%A7aise_des_directeurs_de_la_photographie_cin%C3%A9matographique',
    description:
      'French association of directors of photography. Publishes Lettre AFC and hosts the AFC Micro Salon equipment expo each year in Paris.',
    sortOrder: 3,
  },
  {
    slug: 'acs',
    code: 'ACS',
    name: 'ACS',
    fullName: 'Australian Cinematographers Society',
    country: 'AU',
    foundedYear: 1958,
    website: 'https://cinematographer.org.au',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Australian_Cinematographers_Society',
    description:
      'Australian society for cinematographers and camera professionals. Presents the annual ACS Awards across feature, documentary, and short-form categories.',
    sortOrder: 4,
  },
  {
    slug: 'csc',
    code: 'CSC',
    name: 'CSC',
    fullName: 'Canadian Society of Cinematographers',
    country: 'CA',
    foundedYear: 1957,
    website: 'https://csc.ca',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Canadian_Society_of_Cinematographers',
    description:
      'Canadian professional society for directors of photography. Presents the annual CSC Awards and publishes Canadian Cinematographer magazine.',
    sortOrder: 5,
  },
  {
    slug: 'aic',
    code: 'AIC',
    name: 'AIC',
    fullName: 'Associazione Italiana Autori della Fotografia Cinematografica',
    country: 'IT',
    foundedYear: 1950,
    website: 'https://aicine.it',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Italian_Society_of_Cinematographers',
    description:
      'Italian society of authors of cinematographic photography. One of the older European cinematography organisations.',
    sortOrder: 6,
  },
  {
    slug: 'bvk',
    code: 'BVK',
    name: 'BVK',
    fullName: 'Berufsverband Kinematografie',
    country: 'DE',
    foundedYear: 1971,
    website: 'https://bvkamera.org',
    wikipediaUrl: 'https://de.wikipedia.org/wiki/Berufsverband_Kinematografie',
    description:
      'German professional association of cinematographers. Members credit their work with the BVK post-nominal.',
    sortOrder: 7,
  },
  {
    slug: 'dff',
    code: 'DFF',
    name: 'DFF',
    fullName: 'Danish Society of Cinematographers',
    country: 'DK',
    foundedYear: 2001,
    website: 'https://dff.dk',
    description:
      'Danish society of cinematographers (Danske Filmfotografer). Founded to represent feature DPs working in the Danish film industry.',
    sortOrder: 8,
  },
  {
    slug: 'fsf',
    code: 'FSF',
    name: 'FSF',
    fullName: 'Föreningen Sveriges Filmfotografer',
    country: 'SE',
    foundedYear: 1955,
    website: 'https://fsf.se',
    wikipediaUrl: 'https://sv.wikipedia.org/wiki/F%C3%B6reningen_Sveriges_Filmfotografer',
    description:
      'Swedish association of cinematographers. Recognised within Scandinavia and increasingly cited internationally as Swedish DPs (Linus Sandgren, Hoyte van Hoytema by adoption) work on major productions.',
    sortOrder: 9,
  },
  {
    slug: 'hksc',
    code: 'HKSC',
    name: 'HKSC',
    fullName: 'Hong Kong Society of Cinematographers',
    country: 'HK',
    foundedYear: 1989,
    description:
      'Professional society representing Hong Kong cinematographers. Members include working DPs in Hong Kong and Greater China cinema.',
    sortOrder: 10,
  },
  {
    slug: 'isc',
    code: 'ISC',
    name: 'ISC',
    fullName: 'Indian Society of Cinematographers',
    country: 'IN',
    foundedYear: 2014,
    website: 'https://indiancinematographers.com',
    description:
      'Indian society of cinematographers, formed to represent DPs working in the Indian film industries (Hindi, Tamil, Telugu, Bengali, Malayalam, and others).',
    sortOrder: 11,
  },
  {
    slug: 'nsc',
    code: 'NSC',
    name: 'NSC',
    fullName: 'Netherlands Society of Cinematographers',
    country: 'NL',
    foundedYear: 1996,
    website: 'https://nsc-cinematographers.nl',
    description:
      'Society representing Dutch directors of photography. Members credit their work with the NSC post-nominal.',
    sortOrder: 12,
  },
  {
    slug: 'amc',
    code: 'AMC',
    name: 'AMC',
    fullName: 'Mexican Society of Cinematographers',
    country: 'MX',
    foundedYear: 2009,
    website: 'https://amc.org.mx',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Mexican_Society_of_Cinematographers',
    description:
      'Asociación Mexicana de Cinefotógrafos. Represents working Mexican directors of photography on both domestic productions and international features.',
    sortOrder: 13,
  },
  {
    slug: 'aco',
    code: 'ACO',
    name: 'ACO',
    fullName: 'Association of Camera Operators',
    country: 'US',
    foundedYear: 1979,
    website: 'https://camop.com',
    description:
      'U.S. society for camera operators (the role distinct from director of photography). Maintains a directory of working operators.',
    sortOrder: 14,
  },
  {
    slug: 'sbc',
    code: 'SBC',
    name: 'SBC',
    fullName: 'Société Belge des Chefs Opérateurs',
    country: 'BE',
    foundedYear: 2002,
    website: 'https://sbcine.be',
    description:
      'Belgian society of cinematographers. Represents Belgian DPs and camera-department heads working in feature and documentary.',
    sortOrder: 15,
  },
];

export async function seedSocieties(db: SeedDb): Promise<void> {
  // Idempotent insert: ON CONFLICT update so re-running seed picks up
  // description/sort-order tweaks without manual cleanup.
  for (const s of societiesData) {
    await db
      .insert(societies)
      .values({
        slug: s.slug,
        code: s.code,
        name: s.name,
        fullName: s.fullName,
        country: s.country,
        foundedYear: s.foundedYear,
        website: s.website,
        wikipediaUrl: s.wikipediaUrl,
        description: s.description,
        sortOrder: s.sortOrder,
      })
      .onConflictDoUpdate({
        target: societies.slug,
        set: {
          name: s.name,
          fullName: s.fullName,
          country: s.country,
          foundedYear: s.foundedYear,
          website: s.website,
          wikipediaUrl: s.wikipediaUrl,
          description: s.description,
          sortOrder: s.sortOrder,
          updatedAt: new Date(),
        },
      });
  }
  console.log(`  societies: ${societiesData.length} rows`);
}
