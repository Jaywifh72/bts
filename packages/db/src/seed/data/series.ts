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
  { slug: 'arricam-lt-st',      manufacturerSlug: 'arri', name: 'ARRICAM LT/ST (35mm film)', category: 'camera_body', yearIntroduced: 2000 },
  { slug: 'arri-416',           manufacturerSlug: 'arri', name: 'ARRI 416 (Super 16mm)', category: 'camera_body', yearIntroduced: 2006 },
  // Panavision film cameras
  { slug: 'panavision-system-65',    manufacturerSlug: 'panavision', name: 'Panavision Panaflex System 65', category: 'camera_body' },
  { slug: 'panavision-millennium-xl', manufacturerSlug: 'panavision', name: 'Panavision Millennium XL2', category: 'camera_body', yearIntroduced: 2004 },
  // IMAX
  { slug: 'imax-film-camera',   manufacturerSlug: 'imax', name: 'IMAX 65mm Film Cameras', category: 'camera_body' },
  // RED / Sony / Mitchell
  { slug: 'red-camera-family',  manufacturerSlug: 'red-digital-cinema', name: 'RED Camera family', category: 'camera_body', yearIntroduced: 2007 },
  { slug: 'sony-venice-family', manufacturerSlug: 'sony-cinema', name: 'Sony VENICE family', category: 'camera_body', yearIntroduced: 2017 },
  { slug: 'sony-hdw-f900',      manufacturerSlug: 'sony-cinema', name: 'Sony HDW-F900 CineAlta', category: 'camera_body', yearIntroduced: 2000 },
  { slug: 'mitchell-bncr',      manufacturerSlug: 'mitchell', name: 'Mitchell BNCR', category: 'camera_body' },
  // Panavision anamorphic / spherical lens lines
  { slug: 'panavision-c-series', manufacturerSlug: 'panavision', name: 'Panavision C-Series Anamorphic', category: 'lens_set' },
  { slug: 'panavision-e-series', manufacturerSlug: 'panavision', name: 'Panavision E-Series Anamorphic', category: 'lens_set' },
  { slug: 'panavision-h-series', manufacturerSlug: 'panavision', name: 'Panavision H-Series LF Anamorphic', category: 'lens_set' },
  { slug: 'ultra-panavision-70', manufacturerSlug: 'panavision', name: 'Ultra Panavision 70', category: 'lens_set' },
  { slug: 'panavision-ultra-panatar', manufacturerSlug: 'panavision', name: 'Panavision Ultra Panatar', category: 'lens_set' },
  { slug: 'panavision-va',       manufacturerSlug: 'panavision', name: 'Panavision VA Spherical', category: 'lens_set' },
  { slug: 'panavision-super-speed', manufacturerSlug: 'panavision', name: 'Panavision Ultra High Speed (Super Speed)', category: 'lens_set' },
  // Zeiss additional
  { slug: 'zeiss-ultra-prime',   manufacturerSlug: 'zeiss', name: 'Zeiss Ultra Prime', category: 'lens_set', yearIntroduced: 1998 },
  { slug: 'zeiss-super-speed',   manufacturerSlug: 'zeiss', name: 'Zeiss Super Speed (B/MKII/MKIII)', category: 'lens_set' },
  { slug: 'zeiss-planar-f07',    manufacturerSlug: 'zeiss', name: 'Zeiss Planar 50mm f/0.7', category: 'lens_set' },
  // Vantage Hawk
  { slug: 'hawk-v-lite',         manufacturerSlug: 'vantage', name: 'Hawk V-Lite Anamorphic', category: 'lens_set' },
  // Angenieux
  { slug: 'angenieux-optimo-anamorphic', manufacturerSlug: 'angenieux', name: 'Angénieux Optimo Anamorphic', category: 'lens_set' },
  // Vintage / specialty
  { slug: 'bausch-lomb-baltar',  manufacturerSlug: 'bausch-lomb', name: 'Bausch & Lomb Baltar', category: 'lens_set' },
  { slug: 'lomo-round-front',    manufacturerSlug: 'lomo', name: 'LOMO Round Front Anamorphic', category: 'lens_set' },
  // Leitz
  { slug: 'leitz-summilux-c',    manufacturerSlug: 'leitz-cine', name: 'Leitz Summilux-C', category: 'lens_set', yearIntroduced: 2012 },
  { slug: 'leitz-thalia',        manufacturerSlug: 'leitz-cine', name: 'Leitz Thalia (Large Format)', category: 'lens_set', yearIntroduced: 2017 },
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
