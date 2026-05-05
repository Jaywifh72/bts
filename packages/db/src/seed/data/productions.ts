import { eq } from 'drizzle-orm';
import {
  productions, productionFormats, productionStudios, studios,
} from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

type FormatSeed = {
  label?: string;
  aspectRatio: string;
  acquisitionFormat: string;
  colorSpace?: string;
  frameRate?: number;
  isPrimary?: boolean;
};

type StudioLinkSeed = {
  slug: string;
  role: 'production_company' | 'distributor' | 'financier' | 'network' | 'co_production';
};

type ProductionSeed = {
  slug: string;
  title: string;
  type: 'feature' | 'series' | 'episode' | 'short' | 'special' | 'documentary';
  releaseYear?: number;
  imdbId?: string;
  tmdbId?: number;
  studios: StudioLinkSeed[];
  formats: FormatSeed[];
};

export const productionsData: ProductionSeed[] = [
  {
    slug: 'dune-part-two-2024', title: 'Dune: Part Two', type: 'feature', releaseYear: 2024,
    imdbId: 'tt15239678', tmdbId: 693134,
    studios: [
      { slug: 'warner-bros', role: 'distributor' },
      { slug: 'legendary',   role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW 4.5K LF Open Gate',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical 2D' },
      { aspectRatio: '1.43:1', acquisitionFormat: 'ARRIRAW Mini LF (post-converted)',
        colorSpace: 'DCI-P3', frameRate: 24, label: 'IMAX sequences' },
    ],
  },
  {
    slug: 'oppenheimer-2023', title: 'Oppenheimer', type: 'feature', releaseYear: 2023,
    tmdbId: 872585,
    studios: [{ slug: 'universal', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.20:1', acquisitionFormat: 'IMAX 65mm 15-perf', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'IMAX 65mm color' },
      { aspectRatio: '1.43:1', acquisitionFormat: 'IMAX 70mm B&W (Kodak custom stock)', colorSpace: 'DCI-P3', frameRate: 24, label: 'IMAX 70mm B&W sequences' },
      { aspectRatio: '2.20:1', acquisitionFormat: 'Panavision 65mm 5-perf', colorSpace: 'DCI-P3', frameRate: 24, label: '65mm 5-perf supplementary' },
    ],
  },
  {
    slug: 'the-brutalist-2024', title: 'The Brutalist', type: 'feature', releaseYear: 2024,
    tmdbId: 549509,
    studios: [{ slug: 'a24', role: 'production_company' }, { slug: 'focus-features', role: 'distributor' }],
    formats: [
      { aspectRatio: '1.66:1', acquisitionFormat: 'VistaVision 8-perf 35mm', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'poor-things-2023', title: 'Poor Things', type: 'feature', releaseYear: 2023,
    tmdbId: 792307,
    studios: [{ slug: 'searchlight', role: 'distributor' }],
    formats: [
      { aspectRatio: '1.66:1', acquisitionFormat: 'ARRIRAW Mini LF', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'killers-of-the-flower-moon-2023', title: 'Killers of the Flower Moon', type: 'feature', releaseYear: 2023,
    tmdbId: 466420,
    studios: [
      { slug: 'apple-tv-plus', role: 'distributor' },
      { slug: 'plan-b', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA 65', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Digital primary' },
      { aspectRatio: '2.39:1', acquisitionFormat: 'Kodak 35mm + 16mm (selected sequences)', colorSpace: 'DCI-P3', frameRate: 24, label: 'Film sequences' },
    ],
  },
  {
    slug: 'the-batman-2022', title: 'The Batman', type: 'feature', releaseYear: 2022,
    tmdbId: 414906,
    studios: [{ slug: 'warner-bros', role: 'distributor' }],
    formats: [
      { aspectRatio: '1.85:1', acquisitionFormat: 'ARRIRAW ALEXA LF', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'the-northman-2022', title: 'The Northman', type: 'feature', releaseYear: 2022,
    tmdbId: 639933,
    studios: [{ slug: 'universal', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA Mini LF', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: '1917-2019', title: '1917', type: 'feature', releaseYear: 2019,
    tmdbId: 530915,
    studios: [{ slug: 'universal', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA Mini LF', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'blade-runner-2049-2017', title: 'Blade Runner 2049', type: 'feature', releaseYear: 2017,
    tmdbId: 335984,
    studios: [{ slug: 'warner-bros', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA XT', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'mad-max-fury-road-2015', title: 'Mad Max: Fury Road', type: 'feature', releaseYear: 2015,
    tmdbId: 76341,
    studios: [{ slug: 'warner-bros', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA M', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'the-revenant-2015', title: 'The Revenant', type: 'feature', releaseYear: 2015,
    tmdbId: 281957,
    studios: [{ slug: 'searchlight', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA 65', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'gravity-2013', title: 'Gravity', type: 'feature', releaseYear: 2013,
    tmdbId: 49047,
    studios: [{ slug: 'warner-bros', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'dunkirk-2017', title: 'Dunkirk', type: 'feature', releaseYear: 2017,
    tmdbId: 374720,
    studios: [{ slug: 'warner-bros', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.20:1', acquisitionFormat: 'IMAX 65mm 15-perf', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'IMAX 65mm' },
      { aspectRatio: '2.20:1', acquisitionFormat: 'Panavision 65mm 5-perf', colorSpace: 'DCI-P3', frameRate: 24, label: '65mm 5-perf supplementary' },
    ],
  },
  {
    slug: 'skyfall-2012', title: 'Skyfall', type: 'feature', releaseYear: 2012,
    tmdbId: 37724,
    studios: [{ slug: 'sony-pictures', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'children-of-men-2006', title: 'Children of Men', type: 'feature', releaseYear: 2006,
    tmdbId: 9693,
    studios: [{ slug: 'universal', role: 'distributor' }],
    formats: [
      { aspectRatio: '1.85:1', acquisitionFormat: 'Kodak 35mm 4-perf', colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },

  // ===== Classic Era =====
  {
    slug: 'lawrence-of-arabia-1962', title: 'Lawrence of Arabia', type: 'feature', releaseYear: 1962,
    imdbId: 'tt0056172', tmdbId: 947,
    studios: [
      { slug: 'columbia-pictures', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.20:1', acquisitionFormat: 'Super Panavision 70 (65mm 5-perf)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical 70mm' },
    ],
  },
  {
    slug: 'the-godfather-1972', title: 'The Godfather', type: 'feature', releaseYear: 1972,
    imdbId: 'tt0068646', tmdbId: 238,
    studios: [
      { slug: 'paramount', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '1.78:1', acquisitionFormat: 'Kodak 35mm 4-perf anamorphic (Panavision)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'barry-lyndon-1975', title: 'Barry Lyndon', type: 'feature', releaseYear: 1975,
    imdbId: 'tt0072684', tmdbId: 3175,
    studios: [
      { slug: 'warner-bros', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '1.66:1', acquisitionFormat: 'Kodak 35mm 4-perf (Zeiss f/0.7 NASA lenses)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'apocalypse-now-1979', title: 'Apocalypse Now', type: 'feature', releaseYear: 1979,
    imdbId: 'tt0078788', tmdbId: 28,
    studios: [
      { slug: 'united-artists', role: 'distributor' },
      { slug: 'zoetrope', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'Kodak 35mm 4-perf anamorphic (Panavision)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'days-of-heaven-1978', title: 'Days of Heaven', type: 'feature', releaseYear: 1978,
    imdbId: 'tt0077405', tmdbId: 16642,
    studios: [
      { slug: 'paramount', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '1.85:1', acquisitionFormat: 'Kodak 35mm 4-perf (Panavision spherical)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'blade-runner-1982', title: 'Blade Runner', type: 'feature', releaseYear: 1982,
    imdbId: 'tt0083658', tmdbId: 78,
    studios: [
      { slug: 'warner-bros', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'Kodak 35mm 4-perf anamorphic (Panavision)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },

  // ===== 1990s =====
  {
    slug: 'schindlers-list-1993', title: "Schindler's List", type: 'feature', releaseYear: 1993,
    imdbId: 'tt0108052', tmdbId: 424,
    studios: [
      { slug: 'universal', role: 'distributor' },
      { slug: 'amblin', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '1.85:1', acquisitionFormat: 'Kodak 35mm 4-perf B&W (Agfa for color sequences)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },

  // ===== 2000s =====
  {
    slug: 'collateral-2004', title: 'Collateral', type: 'feature', releaseYear: 2004,
    imdbId: 'tt0408134', tmdbId: 1538,
    studios: [
      { slug: 'paramount', role: 'distributor' },
      { slug: 'dreamworks', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'Sony HDW-F900 HD video (primary)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Digital primary' },
      { aspectRatio: '2.39:1', acquisitionFormat: 'Kodak Vision 500T 35mm (selected sequences)',
        colorSpace: 'Rec.709', frameRate: 24, label: 'Film sequences' },
    ],
  },
  {
    slug: 'no-country-for-old-men-2007', title: 'No Country for Old Men', type: 'feature', releaseYear: 2007,
    imdbId: 'tt0477348', tmdbId: 6977,
    studios: [
      { slug: 'miramax', role: 'production_company' },
      { slug: 'lionsgate', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'Kodak 35mm 4-perf anamorphic (Panavision)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'there-will-be-blood-2007', title: 'There Will Be Blood', type: 'feature', releaseYear: 2007,
    imdbId: 'tt0469494', tmdbId: 7345,
    studios: [
      { slug: 'paramount', role: 'distributor' },
      { slug: 'miramax', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'Kodak 35mm 4-perf anamorphic (Panavision)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'the-dark-knight-2008', title: 'The Dark Knight', type: 'feature', releaseYear: 2008,
    imdbId: 'tt0468569', tmdbId: 155,
    studios: [
      { slug: 'warner-bros', role: 'distributor' },
      { slug: 'syncopy', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'Kodak 35mm 4-perf (Panavision spherical)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical 35mm' },
      { aspectRatio: '1.43:1', acquisitionFormat: 'IMAX 65mm 15-perf (Panavision lenses)',
        colorSpace: 'Rec.709', frameRate: 24, label: 'IMAX sequences' },
    ],
  },

  // ===== 2010s =====
  {
    slug: 'inception-2010', title: 'Inception', type: 'feature', releaseYear: 2010,
    imdbId: 'tt1375666', tmdbId: 27205,
    studios: [
      { slug: 'warner-bros', role: 'distributor' },
      { slug: 'syncopy', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'Kodak 35mm 4-perf anamorphic (Panavision)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical 35mm' },
      { aspectRatio: '1.43:1', acquisitionFormat: 'IMAX 65mm 15-perf',
        colorSpace: 'Rec.709', frameRate: 24, label: 'IMAX sequences' },
    ],
  },
  {
    slug: 'the-social-network-2010', title: 'The Social Network', type: 'feature', releaseYear: 2010,
    imdbId: 'tt1285016', tmdbId: 37799,
    studios: [
      { slug: 'columbia-pictures', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'RED One MX (primary)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Digital primary' },
    ],
  },
  {
    slug: 'birdman-2014', title: 'Birdman or (The Unexpected Virtue of Ignorance)', type: 'feature', releaseYear: 2014,
    imdbId: 'tt2562232', tmdbId: 194662,
    studios: [
      { slug: 'searchlight', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '1.85:1', acquisitionFormat: 'ARRIRAW ALEXA M',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'ex-machina-2014', title: 'Ex Machina', type: 'feature', releaseYear: 2014,
    imdbId: 'tt0470752', tmdbId: 264660,
    studios: [
      { slug: 'a24', role: 'distributor' },
      { slug: 'film4', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'carol-2015', title: 'Carol', type: 'feature', releaseYear: 2015,
    imdbId: 'tt2402927', tmdbId: 258480,
    studios: [
      { slug: 'weinstein-company', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '1.33:1', acquisitionFormat: 'Kodak Super 16mm 3-perf (16mm blown up to 35mm)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical (Super 16)' },
    ],
  },
  {
    slug: 'son-of-saul-2015', title: 'Son of Saul', type: 'feature', releaseYear: 2015,
    imdbId: 'tt3808342', tmdbId: 336050,
    studios: [
      { slug: 'sony-pictures-classics', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '1.33:1', acquisitionFormat: 'Kodak 35mm 4-perf (1.37 Academy ratio)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'moonlight-2016', title: 'Moonlight', type: 'feature', releaseYear: 2016,
    imdbId: 'tt4975722', tmdbId: 376867,
    studios: [
      { slug: 'a24', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA Mini',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'la-la-land-2016', title: 'La La Land', type: 'feature', releaseYear: 2016,
    imdbId: 'tt3783958', tmdbId: 313369,
    studios: [
      { slug: 'lionsgate', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.55:1', acquisitionFormat: 'Kodak 35mm 4-perf anamorphic (Panavision)',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'CinemaScope 2.55:1' },
    ],
  },
  {
    slug: 'arrival-2016', title: 'Arrival', type: 'feature', releaseYear: 2016,
    imdbId: 'tt2543164', tmdbId: 329865,
    studios: [
      { slug: 'paramount', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'cold-war-2018', title: 'Cold War', type: 'feature', releaseYear: 2018,
    imdbId: 'tt6543652', tmdbId: 440298,
    studios: [
      { slug: 'amazon-studios', role: 'distributor' },
      { slug: 'mk2', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '1.37:1', acquisitionFormat: 'Kodak 35mm 4-perf B&W (1.37 Academy ratio)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'first-man-2018', title: 'First Man', type: 'feature', releaseYear: 2018,
    imdbId: 'tt3501590', tmdbId: 369972,
    studios: [
      { slug: 'universal', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '1.78:1', acquisitionFormat: 'Kodak Super 16mm (home / training sequences)',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Super 16 sequences' },
      { aspectRatio: '2.39:1', acquisitionFormat: 'Kodak 35mm 4-perf anamorphic',
        colorSpace: 'DCI-P3', frameRate: 24, label: '35mm anamorphic' },
      { aspectRatio: '1.43:1', acquisitionFormat: 'IMAX 65mm 15-perf (Moon sequences)',
        colorSpace: 'DCI-P3', frameRate: 24, label: 'IMAX Moon sequences' },
    ],
  },
  {
    slug: 'the-favourite-2018', title: 'The Favourite', type: 'feature', releaseYear: 2018,
    imdbId: 'tt5765446', tmdbId: 375262,
    studios: [
      { slug: 'searchlight', role: 'distributor' },
      { slug: 'film4', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '1.37:1', acquisitionFormat: 'Kodak 35mm 4-perf (1.37 Academy ratio, fish-eye lenses)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'midsommar-2019', title: 'Midsommar', type: 'feature', releaseYear: 2019,
    imdbId: 'tt8772262', tmdbId: 530385,
    studios: [
      { slug: 'a24', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA Mini',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'once-upon-a-time-in-hollywood-2019', title: 'Once Upon a Time in Hollywood', type: 'feature', releaseYear: 2019,
    imdbId: 'tt7131622', tmdbId: 466272,
    studios: [
      { slug: 'columbia-pictures', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'Kodak 35mm 4-perf anamorphic (Panavision)',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'portrait-of-a-lady-on-fire-2019', title: 'Portrait of a Lady on Fire', type: 'feature', releaseYear: 2019,
    imdbId: 'tt8613070', tmdbId: 531428,
    studios: [
      { slug: 'neon', role: 'distributor' },
      { slug: 'mk2', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '1.37:1', acquisitionFormat: 'ARRIRAW ALEXA Mini LF (1.37 frame)',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'the-lighthouse-2019', title: 'The Lighthouse', type: 'feature', releaseYear: 2019,
    imdbId: 'tt7984734', tmdbId: 503919,
    studios: [
      { slug: 'a24', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '1.19:1', acquisitionFormat: 'Kodak Double-X 5222 35mm (1.19:1 near-square)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical (near-square B&W)' },
    ],
  },
  {
    slug: 'joker-2019', title: 'Joker', type: 'feature', releaseYear: 2019,
    imdbId: 'tt7286456', tmdbId: 475557,
    studios: [
      { slug: 'warner-bros', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA LF',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'marriage-story-2019', title: 'Marriage Story', type: 'feature', releaseYear: 2019,
    imdbId: 'tt7653254', tmdbId: 492188,
    studios: [
      { slug: 'netflix', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '1.85:1', acquisitionFormat: 'Kodak 35mm 4-perf',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical / Netflix' },
    ],
  },

  // ===== 2020–2024 =====
  {
    slug: 'mank-2020', title: 'Mank', type: 'feature', releaseYear: 2020,
    imdbId: 'tt10616338', tmdbId: 614560,
    studios: [
      { slug: 'netflix', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '1.37:1', acquisitionFormat: 'ARRIRAW ALEXA LF (B&W grade, Academy ratio)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Netflix (B&W)' },
    ],
  },
  {
    slug: 'the-power-of-the-dog-2021', title: 'The Power of the Dog', type: 'feature', releaseYear: 2021,
    imdbId: 'tt10294840', tmdbId: 600583,
    studios: [
      { slug: 'netflix', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA LF',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical / Netflix' },
    ],
  },
  {
    slug: 'nightmare-alley-2021', title: 'Nightmare Alley', type: 'feature', releaseYear: 2021,
    imdbId: 'tt7740496', tmdbId: 597208,
    studios: [
      { slug: 'searchlight', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA 65',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'spencer-2021', title: 'Spencer', type: 'feature', releaseYear: 2021,
    imdbId: 'tt12536294', tmdbId: 716612,
    studios: [
      { slug: 'neon', role: 'distributor' },
      { slug: 'topic-studios', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '1.66:1', acquisitionFormat: 'ARRIRAW ALEXA Mini LF',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'babylon-2022', title: 'Babylon', type: 'feature', releaseYear: 2022,
    imdbId: 'tt10640346', tmdbId: 615777,
    studios: [
      { slug: 'paramount', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA 65',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'elvis-2022', title: 'Elvis', type: 'feature', releaseYear: 2022,
    imdbId: 'tt3704428', tmdbId: 614934,
    studios: [
      { slug: 'warner-bros', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA 65 (primary)',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical primary' },
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA Mini LF (handheld / concert sequences)',
        colorSpace: 'DCI-P3', frameRate: 24, label: 'Concert sequences' },
    ],
  },
  {
    slug: 'tar-2022', title: 'Tár', type: 'feature', releaseYear: 2022,
    imdbId: 'tt14444726', tmdbId: 817758,
    studios: [
      { slug: 'universal', role: 'distributor' },
      { slug: 'focus-features', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA 65 (primary)',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical primary' },
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA Mini LF (intimate scenes)',
        colorSpace: 'DCI-P3', frameRate: 24, label: 'Mini LF supplementary' },
    ],
  },
  {
    slug: 'all-quiet-on-the-western-front-2022', title: 'All Quiet on the Western Front', type: 'feature', releaseYear: 2022,
    imdbId: 'tt1016150', tmdbId: 49046,
    studios: [
      { slug: 'netflix', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA 65 (primary)',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Primary large format' },
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA Mini LF',
        colorSpace: 'DCI-P3', frameRate: 24, label: 'Supplementary / handheld' },
    ],
  },
  {
    slug: 'the-substance-2024', title: 'The Substance', type: 'feature', releaseYear: 2024,
    imdbId: 'tt17526714', tmdbId: 933260,
    studios: [
      { slug: 'mubi', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA Mini LF',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'anora-2024', title: 'Anora', type: 'feature', releaseYear: 2024,
    imdbId: 'tt28607951', tmdbId: 1064213,
    studios: [
      { slug: 'neon', role: 'distributor' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'Kodak 35mm 4-perf anamorphic (Lomo lenses, push +1)',
        colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical (35mm anamorphic)' },
    ],
  },
  {
    slug: 'conclave-2024', title: 'Conclave', type: 'feature', releaseYear: 2024,
    imdbId: 'tt20215234', tmdbId: 974576,
    studios: [
      { slug: 'focus-features', role: 'distributor' },
      { slug: 'black-label-media', role: 'production_company' },
    ],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'RED V-RAPTOR 8K VV',
        colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
];

export async function seedProductions(db: SeedDb) {
  for (const p of productionsData) {
    // 1. Upsert the production itself
    const [{ id: prodId }] = await db.insert(productions)
      .values({
        slug: p.slug, title: p.title, type: p.type,
        releaseYear: p.releaseYear ?? null,
        imdbId: p.imdbId ?? null,
        tmdbId: p.tmdbId ?? null,
      })
      .onConflictDoUpdate({
        target: productions.slug,
        set: {
          title: p.title, type: p.type,
          releaseYear: p.releaseYear ?? null,
          imdbId: p.imdbId ?? null,
          tmdbId: p.tmdbId ?? null,
          updatedAt: new Date(),
        },
      })
      .returning({ id: productions.id });

    // 2. Replace all formats for this production (idempotent via delete+insert)
    await db.delete(productionFormats).where(eq(productionFormats.productionId, prodId));
    if (p.formats.length > 0) {
      await db.insert(productionFormats).values(p.formats.map((f) => ({
        productionId: prodId,
        label: f.label ?? null,
        aspectRatio: f.aspectRatio,
        acquisitionFormat: f.acquisitionFormat,
        colorSpace: f.colorSpace ?? null,
        frameRate: f.frameRate ? f.frameRate.toString() : null,  // numeric -> string for drizzle
        isPrimary: f.isPrimary ?? false,
      })));
    }

    // 3. Replace all studio links for this production
    await db.delete(productionStudios).where(eq(productionStudios.productionId, prodId));
    for (const link of p.studios) {
      const [studio] = await db.select({ id: studios.id })
        .from(studios)
        .where(eq(studios.slug, link.slug));
      if (!studio?.id) throw new Error(`unknown studio slug: ${link.slug} for production ${p.slug}`);
      await db.insert(productionStudios).values({
        productionId: prodId,
        studioId: studio.id,
        role: link.role,
      });
    }
  }
}
