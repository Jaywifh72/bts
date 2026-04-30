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
  studios: StudioLinkSeed[];
  formats: FormatSeed[];
};

export const productionsData: ProductionSeed[] = [
  {
    slug: 'dune-part-two-2024', title: 'Dune: Part Two', type: 'feature', releaseYear: 2024,
    imdbId: 'tt15239678',
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
    studios: [{ slug: 'universal', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.20:1', acquisitionFormat: 'IMAX 65mm 15-perf', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'IMAX 65mm color' },
      { aspectRatio: '1.43:1', acquisitionFormat: 'IMAX 70mm B&W (Kodak custom stock)', colorSpace: 'DCI-P3', frameRate: 24, label: 'IMAX 70mm B&W sequences' },
      { aspectRatio: '2.20:1', acquisitionFormat: 'Panavision 65mm 5-perf', colorSpace: 'DCI-P3', frameRate: 24, label: '65mm 5-perf supplementary' },
    ],
  },
  {
    slug: 'the-brutalist-2024', title: 'The Brutalist', type: 'feature', releaseYear: 2024,
    studios: [{ slug: 'a24', role: 'production_company' }, { slug: 'focus-features', role: 'distributor' }],
    formats: [
      { aspectRatio: '1.66:1', acquisitionFormat: 'VistaVision 8-perf 35mm', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'poor-things-2023', title: 'Poor Things', type: 'feature', releaseYear: 2023,
    studios: [{ slug: 'searchlight', role: 'distributor' }],
    formats: [
      { aspectRatio: '1.66:1', acquisitionFormat: 'ARRIRAW Mini LF', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'killers-of-the-flower-moon-2023', title: 'Killers of the Flower Moon', type: 'feature', releaseYear: 2023,
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
    studios: [{ slug: 'warner-bros', role: 'distributor' }],
    formats: [
      { aspectRatio: '1.85:1', acquisitionFormat: 'ARRIRAW ALEXA LF', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'the-northman-2022', title: 'The Northman', type: 'feature', releaseYear: 2022,
    studios: [{ slug: 'universal', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA Mini LF', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: '1917-2019', title: '1917', type: 'feature', releaseYear: 2019,
    studios: [{ slug: 'universal', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA Mini LF', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'blade-runner-2049-2017', title: 'Blade Runner 2049', type: 'feature', releaseYear: 2017,
    studios: [{ slug: 'warner-bros', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA XT', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'mad-max-fury-road-2015', title: 'Mad Max: Fury Road', type: 'feature', releaseYear: 2015,
    studios: [{ slug: 'warner-bros', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA M', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'the-revenant-2015', title: 'The Revenant', type: 'feature', releaseYear: 2015,
    studios: [{ slug: 'searchlight', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA 65', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'gravity-2013', title: 'Gravity', type: 'feature', releaseYear: 2013,
    studios: [{ slug: 'warner-bros', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'dunkirk-2017', title: 'Dunkirk', type: 'feature', releaseYear: 2017,
    studios: [{ slug: 'warner-bros', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.20:1', acquisitionFormat: 'IMAX 65mm 15-perf', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'IMAX 65mm' },
      { aspectRatio: '2.20:1', acquisitionFormat: 'Panavision 65mm 5-perf', colorSpace: 'DCI-P3', frameRate: 24, label: '65mm 5-perf supplementary' },
    ],
  },
  {
    slug: 'skyfall-2012', title: 'Skyfall', type: 'feature', releaseYear: 2012,
    studios: [{ slug: 'sony-pictures', role: 'distributor' }],
    formats: [
      { aspectRatio: '2.39:1', acquisitionFormat: 'ARRIRAW ALEXA', colorSpace: 'DCI-P3', frameRate: 24, isPrimary: true, label: 'Theatrical' },
    ],
  },
  {
    slug: 'children-of-men-2006', title: 'Children of Men', type: 'feature', releaseYear: 2006,
    studios: [{ slug: 'universal', role: 'distributor' }],
    formats: [
      { aspectRatio: '1.85:1', acquisitionFormat: 'Kodak 35mm 4-perf', colorSpace: 'Rec.709', frameRate: 24, isPrimary: true, label: 'Theatrical' },
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
      })
      .onConflictDoUpdate({
        target: productions.slug,
        set: {
          title: p.title, type: p.type,
          releaseYear: p.releaseYear ?? null,
          imdbId: p.imdbId ?? null,
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
