import { eq } from 'drizzle-orm';
import { scenes, productions } from '../../schema/index.ts';
import type { SeedDb } from '../run.ts';

type SceneSeed = {
  productionSlug: string;
  slug: string;
  title: string;
  sceneNumber?: string;
  synopsis?: string;
  positionInRuntimeSeconds?: number;
  interiorExterior?: 'int' | 'ext' | 'int_ext';
  timeOfDay?: 'dawn' | 'day' | 'dusk' | 'night' | 'magic_hour';
  location?: string;
};

export const scenesData: SceneSeed[] = [
  // ===== Dune: Part Two (3 scenes) =====
  { productionSlug: 'dune-part-two-2024', slug: 'arrakis-walking-sequence',
    title: 'Arrakis Walking Sequence', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Wadi Rum, Jordan' },
  { productionSlug: 'dune-part-two-2024', slug: 'sandworm-ride',
    title: 'Sandworm Ride', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Abu Dhabi' },
  { productionSlug: 'dune-part-two-2024', slug: 'imax-bw-arena',
    title: 'IMAX B&W Arena Sequence', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Abu Dhabi (IR-converted ALEXA)' },

  // ===== Oppenheimer (3 scenes) =====
  { productionSlug: 'oppenheimer-2023', slug: 'trinity-test',
    title: 'Trinity Test', interiorExterior: 'ext', timeOfDay: 'dawn',
    location: 'Los Alamos (re-creation, NM)' },
  { productionSlug: 'oppenheimer-2023', slug: 'fission-visions',
    title: 'Fission Visions (B&W)', interiorExterior: 'int', timeOfDay: 'night',
    location: 'IMAX 70mm B&W (Kodak custom stock)' },
  { productionSlug: 'oppenheimer-2023', slug: 'lab-meeting',
    title: 'Los Alamos Laboratory Meeting', interiorExterior: 'int', timeOfDay: 'day',
    location: 'Los Alamos (re-creation, NM)' },

  // ===== The Brutalist (2 scenes) =====
  { productionSlug: 'the-brutalist-2024', slug: 'arrival-at-ellis-island',
    title: 'Arrival at Ellis Island', interiorExterior: 'ext', timeOfDay: 'dawn',
    location: 'Ellis Island (re-creation)' },
  { productionSlug: 'the-brutalist-2024', slug: 'institute-construction',
    title: 'The Institute under Construction', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Pennsylvania' },

  // ===== Poor Things (3 scenes; one magic-hour exterior for Q3) =====
  { productionSlug: 'poor-things-2023', slug: 'lisbon-tile-rooftops',
    title: 'Lisbon Tile Rooftops', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'Lisbon (set re-creation, Hungary)' },
  { productionSlug: 'poor-things-2023', slug: 'paris-brothel-interior',
    title: 'Paris Brothel Interior', interiorExterior: 'int', timeOfDay: 'night' },
  { productionSlug: 'poor-things-2023', slug: 'baxter-house-interior',
    title: 'Godwin Baxter\'s House', interiorExterior: 'int', timeOfDay: 'day' },

  // ===== Killers of the Flower Moon (3 scenes; magic-hour exterior for Q3) =====
  { productionSlug: 'killers-of-the-flower-moon-2023', slug: 'osage-prairie-dawn',
    title: 'Osage Prairie at Dawn', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'Pawhuska, Oklahoma' },
  { productionSlug: 'killers-of-the-flower-moon-2023', slug: 'oil-strike',
    title: 'The Oil Strike', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Pawhuska, Oklahoma' },
  { productionSlug: 'killers-of-the-flower-moon-2023', slug: 'mollie-kitchen',
    title: 'Mollie\'s Kitchen', interiorExterior: 'int', timeOfDay: 'day' },

  // ===== The Batman (3 scenes) =====
  { productionSlug: 'the-batman-2022', slug: 'opening-rooftop',
    title: 'Opening Rooftop Surveillance', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Gotham (London exteriors)' },
  { productionSlug: 'the-batman-2022', slug: 'iceberg-lounge-club',
    title: 'Iceberg Lounge', interiorExterior: 'int', timeOfDay: 'night' },
  { productionSlug: 'the-batman-2022', slug: 'batmobile-chase',
    title: 'Batmobile Highway Chase', interiorExterior: 'ext', timeOfDay: 'night' },

  // ===== The Northman (2 scenes) =====
  { productionSlug: 'the-northman-2022', slug: 'volcano-duel',
    title: 'Volcano Duel', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Iceland' },
  { productionSlug: 'the-northman-2022', slug: 'hofgardr-feast',
    title: 'Feast at Hofgardr', interiorExterior: 'int', timeOfDay: 'night' },

  // ===== 1917 (2 scenes including the trench-to-poppy-field oner) =====
  { productionSlug: '1917-2019', slug: 'trench-to-poppy-field-oner',
    title: 'Trench to Poppy Field Oner', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'Salisbury Plain, UK' },
  { productionSlug: '1917-2019', slug: 'flare-night-running',
    title: 'Flare Night Running', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Govan, UK (set)' },

  // ===== Blade Runner 2049 (3 scenes) =====
  { productionSlug: 'blade-runner-2049-2017', slug: 'las-vegas-orange',
    title: 'Las Vegas Orange Storm', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Hungary (sound stage with VFX)' },
  { productionSlug: 'blade-runner-2049-2017', slug: 'sea-wall-confrontation',
    title: 'Sea Wall Confrontation', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'Budapest (set with VFX)' },
  { productionSlug: 'blade-runner-2049-2017', slug: 'wallace-corp-interior',
    title: 'Wallace Corporation Interior', interiorExterior: 'int', timeOfDay: 'day' },

  // ===== Mad Max: Fury Road (2 scenes) =====
  { productionSlug: 'mad-max-fury-road-2015', slug: 'opening-chase',
    title: 'Opening Chase', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Namibia (Namib Desert)' },
  { productionSlug: 'mad-max-fury-road-2015', slug: 'sandstorm',
    title: 'Sandstorm', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Namib Desert' },

  // ===== The Revenant (3 scenes; bear attack + glacial wakeup) =====
  { productionSlug: 'the-revenant-2015', slug: 'bear-attack',
    title: 'Grizzly Bear Attack', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'British Columbia' },
  { productionSlug: 'the-revenant-2015', slug: 'glacial-rebirth',
    title: 'Glacial Rebirth', interiorExterior: 'ext', timeOfDay: 'magic_hour',
    location: 'British Columbia' },
  { productionSlug: 'the-revenant-2015', slug: 'fitzgerald-final-fight',
    title: 'Fitzgerald Final Fight', interiorExterior: 'ext', timeOfDay: 'day' },

  // ===== Gravity (2 scenes) =====
  { productionSlug: 'gravity-2013', slug: 'space-debris-strike',
    title: 'Space Debris Strike', interiorExterior: 'ext', timeOfDay: 'day' },
  { productionSlug: 'gravity-2013', slug: 'iss-interior',
    title: 'ISS Interior Refuge', interiorExterior: 'int', timeOfDay: 'day' },

  // ===== Dunkirk (2 scenes) =====
  { productionSlug: 'dunkirk-2017', slug: 'mole-aerial',
    title: 'The Mole — Aerial', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Dunkirk Beach, France' },
  { productionSlug: 'dunkirk-2017', slug: 'spitfire-cockpit',
    title: 'Spitfire Cockpit', interiorExterior: 'int', timeOfDay: 'day' },

  // ===== Skyfall (2 scenes) =====
  { productionSlug: 'skyfall-2012', slug: 'shanghai-skyline-fight',
    title: 'Shanghai Skyline Fight', interiorExterior: 'int', timeOfDay: 'night',
    location: 'Shanghai (sound stage with LED backdrop)' },
  { productionSlug: 'skyfall-2012', slug: 'skyfall-estate-final',
    title: 'Skyfall Estate Final Stand', interiorExterior: 'ext', timeOfDay: 'night',
    location: 'Glen Coe, Scotland' },

  // ===== Children of Men (2 scenes) =====
  { productionSlug: 'children-of-men-2006', slug: 'cafe-explosion',
    title: 'Café Explosion', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'London' },
  { productionSlug: 'children-of-men-2006', slug: 'bexhill-final-oner',
    title: 'Bexhill Final Oner', interiorExterior: 'ext', timeOfDay: 'day',
    location: 'Bexhill (set)' },
];

export async function seedScenes(db: SeedDb) {
  for (const s of scenesData) {
    const [{ id: prodId }] = await db.select({ id: productions.id })
      .from(productions)
      .where(eq(productions.slug, s.productionSlug));
    if (!prodId) throw new Error(`unknown production slug: ${s.productionSlug}`);
    await db.insert(scenes)
      .values({
        productionId: prodId,
        slug: s.slug,
        title: s.title,
        sceneNumber: s.sceneNumber ?? null,
        synopsis: s.synopsis ?? null,
        positionInRuntimeSeconds: s.positionInRuntimeSeconds ?? null,
        interiorExterior: s.interiorExterior ?? null,
        timeOfDay: s.timeOfDay ?? null,
        location: s.location ?? null,
      })
      .onConflictDoUpdate({
        target: [scenes.productionId, scenes.slug],
        set: {
          title: s.title,
          sceneNumber: s.sceneNumber ?? null,
          synopsis: s.synopsis ?? null,
          positionInRuntimeSeconds: s.positionInRuntimeSeconds ?? null,
          interiorExterior: s.interiorExterior ?? null,
          timeOfDay: s.timeOfDay ?? null,
          location: s.location ?? null,
          updatedAt: new Date(),
        },
      });
  }
}
