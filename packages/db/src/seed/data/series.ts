import { eq } from 'drizzle-orm';
import { equipmentSeries, equipmentManufacturers } from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

type SeriesSeed = {
  slug: string; manufacturerSlug: string; name: string;
  category: 'lens_set' | 'camera_body' | 'lighting_fixture' | 'filter' | 'recorder' | 'mount' | 'accessory';
  yearIntroduced?: number; yearDiscontinued?: number;
};

export const seriesData: SeriesSeed[] = [
  // ARRI cameras
  { slug: 'arri-alexa-family',  manufacturerSlug: 'arri', name: 'ARRI ALEXA family',  category: 'camera_body', yearIntroduced: 2010 },
  { slug: 'arri-alexa-mini-lf-series', manufacturerSlug: 'arri', name: 'ARRI ALEXA Mini LF', category: 'camera_body', yearIntroduced: 2019 },
  { slug: 'arri-alexa-65-series', manufacturerSlug: 'arri', name: 'ARRI ALEXA 65', category: 'camera_body', yearIntroduced: 2014 },
  // ARRI lighting
  { slug: 'arri-skypanel',      manufacturerSlug: 'arri', name: 'ARRI SkyPanel',     category: 'lighting_fixture', yearIntroduced: 2014 },
  { slug: 'arri-orbiter',       manufacturerSlug: 'arri', name: 'ARRI Orbiter',      category: 'lighting_fixture', yearIntroduced: 2019 },
  // ARRI Rental custom
  { slug: 'arri-rental-dna-lf-vintage', manufacturerSlug: 'arri-rental', name: 'ARRI Rental DNA LF Vintage Primes', category: 'lens_set', yearIntroduced: 2019 },
  // Cooke
  { slug: 'cooke-s7i-ff-plus',  manufacturerSlug: 'cooke', name: 'Cooke S7/i Full Frame Plus', category: 'lens_set', yearIntroduced: 2018 },
  { slug: 'cooke-s4i',          manufacturerSlug: 'cooke', name: 'Cooke S4/i',                category: 'lens_set', yearIntroduced: 2008 },
  { slug: 'cooke-anamorphic-i', manufacturerSlug: 'cooke', name: 'Cooke Anamorphic /i',       category: 'lens_set', yearIntroduced: 2010 },
  // Panavision
  { slug: 'panavision-sphero-anamorphic', manufacturerSlug: 'panavision', name: 'Panavision Sphero T-Series Anamorphic', category: 'lens_set' },
  { slug: 'panavision-t-series', manufacturerSlug: 'panavision', name: 'Panavision T-Series Anamorphic', category: 'lens_set' },
  { slug: 'panavision-primo',    manufacturerSlug: 'panavision', name: 'Panavision Primo', category: 'lens_set' },
  // Zeiss
  { slug: 'zeiss-master-prime',     manufacturerSlug: 'zeiss', name: 'Zeiss Master Prime',     category: 'lens_set', yearIntroduced: 2005 },
  { slug: 'zeiss-master-anamorphic',manufacturerSlug: 'zeiss', name: 'Zeiss Master Anamorphic',category: 'lens_set' },
  { slug: 'zeiss-supreme-prime',    manufacturerSlug: 'zeiss', name: 'Zeiss Supreme Prime',    category: 'lens_set', yearIntroduced: 2018 },
  { slug: 'zeiss-supreme-prime-radiance', manufacturerSlug: 'zeiss', name: 'Zeiss Supreme Prime Radiance', category: 'lens_set' },
  // Atlas
  { slug: 'atlas-orion-anamorphic', manufacturerSlug: 'atlas-lens', name: 'Atlas Orion Anamorphic', category: 'lens_set' },
  // Tiffen
  { slug: 'tiffen-black-pro-mist', manufacturerSlug: 'tiffen', name: 'Tiffen Black Pro-Mist', category: 'filter' },
  { slug: 'tiffen-irnd',           manufacturerSlug: 'tiffen', name: 'Tiffen IRND',           category: 'filter' },
];

export async function seedSeries(db: SeedDb) {
  for (const s of seriesData) {
    const [mf] = await db.select({ id: equipmentManufacturers.id })
      .from(equipmentManufacturers)
      .where(eq(equipmentManufacturers.slug, s.manufacturerSlug));
    if (!mf?.id) throw new Error(`unknown manufacturer slug: ${s.manufacturerSlug}`);
    await db.insert(equipmentSeries)
      .values({
        slug: s.slug, name: s.name, category: s.category,
        manufacturerId: mf.id,
        yearIntroduced: s.yearIntroduced ?? null,
        yearDiscontinued: s.yearDiscontinued ?? null,
      })
      .onConflictDoUpdate({
        target: equipmentSeries.slug,
        set: {
          name: s.name, category: s.category, manufacturerId: mf.id,
          yearIntroduced: s.yearIntroduced ?? null,
          yearDiscontinued: s.yearDiscontinued ?? null,
          updatedAt: new Date(),
        },
      });
  }
}
