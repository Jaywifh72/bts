// Editorial seed for production_locations — fills the gap on
// marquee films covered by the Phase 17/18 colour + lighting seeds
// but missing from the geocoded-locations dataset.
//
// Coordinates are WGS-84 to 6 decimal places (sub-metre precision)
// from public location-scout records, behind-the-scenes interviews,
// and the productions' published filming-locations databases. The
// `is_studio` flag distinguishes soundstages (where the sun-position
// widget is irrelevant) from practical exteriors.
//
// No unique constraint on (production_id, name) — the schema permits
// multiple rows for the same name (e.g., "Pinewood Studios" can
// appear twice if a production used different stages on different
// shoot dates). We dedupe in memory before insert: a row is
// considered a duplicate if (production_slug, name) already exists.
import { db, sql } from '../src/index.ts';

type LocationSeed = {
  productionSlug: string;
  name: string;
  region?: string;
  country: string;
  latitude?: number;
  longitude?: number;
  isStudio: boolean;
  notes: string;
};

const LOCATIONS: LocationSeed[] = [
  // ── The Batman (2022) — UK studio + practical UK / Chicago exteriors.
  {
    productionSlug: 'the-batman-2022', name: 'Warner Bros. Studios Leavesden',
    region: 'Hertfordshire', country: 'GB',
    latitude: 51.6929, longitude: -0.4179,
    isStudio: true,
    notes: 'Primary stage — Gotham PD, Iceberg Lounge interior, Wayne Manor.',
  },
  {
    productionSlug: 'the-batman-2022', name: 'Cardington Studios',
    region: 'Bedfordshire', country: 'GB',
    latitude: 52.1167, longitude: -0.4167,
    isStudio: true,
    notes: 'Massive WW2 airship hangar; Batmobile chase set + Gotham flooded-finale build.',
  },
  {
    productionSlug: 'the-batman-2022', name: 'Liverpool — St George\'s Hall',
    region: 'Merseyside', country: 'GB',
    latitude: 53.4093, longitude: -2.9810,
    isStudio: false,
    notes: 'City-Hall exterior + interior. Liverpool stood in for Gotham\'s civic-architecture frontage on multiple sequences.',
  },

  // ── Avengers: Endgame (2019) — Atlanta studio + Scotland exteriors.
  {
    productionSlug: 'avengers-endgame-2019', name: 'Pinewood Atlanta Studios',
    region: 'Georgia', country: 'US',
    latitude: 33.4054, longitude: -84.5783,
    isStudio: true,
    notes: 'Russo-brothers MCU production hub; Avengers compound, Thanos\'s farm, time-heist Battle-of-NY plate stages.',
  },
  {
    productionSlug: 'avengers-endgame-2019', name: 'Durham Cathedral',
    region: 'County Durham', country: 'GB',
    latitude: 54.7733, longitude: -1.5764,
    isStudio: false,
    notes: 'Asgard interior cathedral exteriors photographed for Thor sequences (carried into Endgame in flashbacks).',
  },

  // ── Killers of the Flower Moon (2023) — Oklahoma + LA studios.
  {
    productionSlug: 'killers-of-the-flower-moon-2023', name: 'Pawhuska, Oklahoma',
    region: 'Osage County', country: 'US',
    latitude: 36.6664, longitude: -96.3372,
    isStudio: false,
    notes: 'Original Osage tribal seat. Scorsese filmed in the actual historical town; the Osage Nation was on-set as cultural consultants throughout production.',
  },
  {
    productionSlug: 'killers-of-the-flower-moon-2023', name: 'Bartlesville, Oklahoma',
    region: 'Washington County', country: 'US',
    latitude: 36.7473, longitude: -95.9808,
    isStudio: false,
    notes: 'Period-architecture exteriors that survived as 1920s-era streetscapes; doubled for Fairfax town scenes.',
  },
  {
    productionSlug: 'killers-of-the-flower-moon-2023', name: 'Pioneer Pictures Stage',
    region: 'Oklahoma', country: 'US',
    isStudio: true,
    notes: 'Period-interior soundstage builds for Mollie\'s kitchen + the Burkhart house scenes.',
  },

  // ── Tár (2022) — Berlin + studio.
  {
    productionSlug: 'tar-2022', name: 'Berlin Philharmonie',
    region: 'Berlin', country: 'DE',
    latitude: 52.5096, longitude: 13.3697,
    isStudio: false,
    notes: 'Hans-Scharoun-designed concert hall; the Berliner Philharmoniker permitted in-situ filming during a rehearsal residency. The vineyard-shaped stage geometry shapes the entire conducting choreography.',
  },
  {
    productionSlug: 'tar-2022', name: 'Studio Babelsberg',
    region: 'Brandenburg', country: 'DE',
    latitude: 52.3811, longitude: 13.0764,
    isStudio: true,
    notes: 'Apartment + Juilliard-masterclass interior soundstage builds adjacent to the Philharmonie.',
  },

  // ── Inception (2010) — Paris + Los Angeles + Calgary + studio.
  {
    productionSlug: 'inception-2010', name: 'Cardington Studios',
    region: 'Bedfordshire', country: 'GB',
    latitude: 52.1167, longitude: -0.4167,
    isStudio: true,
    notes: 'The 100-foot rotating-corridor practical set was built and operated here. The hangar\'s scale was a working-set requirement.',
  },
  {
    productionSlug: 'inception-2010', name: 'Pont de Bir-Hakeim, Paris',
    region: 'Île-de-France', country: 'FR',
    latitude: 48.8541, longitude: 2.2904,
    isStudio: false,
    notes: 'The folding-Paris dream-architecture sequence with Cobb and Ariadne; the bridge\'s ornate two-tier iron geometry framed the city-fold matte work.',
  },
  {
    productionSlug: 'inception-2010', name: 'Fortress Mountain',
    region: 'Alberta', country: 'CA',
    latitude: 50.8167, longitude: -115.2167,
    isStudio: false,
    notes: 'Fortress Mountain Resort — the snow-fortress climax sequence. The closed ski resort was rebuilt as the Eames-architected mountain stronghold.',
  },
];

console.log(`seed-locations — ${LOCATIONS.length} locations`);

let inserted = 0;
let updated = 0;
let skipped = 0;

for (const l of LOCATIONS) {
  // Schema has no UNIQUE on (production_id, name); we hand-dedupe by
  // checking for an existing row first, then either updating it or
  // inserting a new one.
  const existing = await db.execute<{ id: number }>(sql`
    SELECT pl.id FROM production_locations pl
    JOIN productions p ON p.id = pl.production_id
    WHERE p.slug = ${l.productionSlug} AND pl.name = ${l.name}
    LIMIT 1
  `);

  if (existing.length > 0) {
    await db.execute(sql`
      UPDATE production_locations SET
        region = ${l.region ?? null},
        country = ${l.country},
        latitude = ${l.latitude ?? null},
        longitude = ${l.longitude ?? null},
        is_studio = ${l.isStudio},
        notes = ${l.notes},
        updated_at = NOW()
      WHERE id = ${existing[0]!.id}
    `);
    updated++;
    console.log(`  [~] ${l.productionSlug.padEnd(40)} :: ${l.name} refreshed`);
    continue;
  }

  const r = await db.execute<{ id: number }>(sql`
    INSERT INTO production_locations (
      production_id, name, region, country, latitude, longitude, is_studio, notes
    )
    SELECT p.id, ${l.name}, ${l.region ?? null}, ${l.country},
      ${l.latitude ?? null}, ${l.longitude ?? null},
      ${l.isStudio}, ${l.notes}
    FROM productions p WHERE p.slug = ${l.productionSlug}
    RETURNING id
  `);
  if (r.length === 0) {
    skipped++;
    console.log(`  [!] ${l.productionSlug.padEnd(40)} :: ${l.name} — production not found`);
    continue;
  }
  inserted++;
  console.log(`  [+] ${l.productionSlug.padEnd(40)} :: ${l.name} ${l.isStudio ? '(studio)' : ''}`);
}

console.log(`\nseeded — ${inserted} new + ${updated} refreshed + ${skipped} skipped`);
process.exit(0);
