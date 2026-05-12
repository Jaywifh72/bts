// Editorial seed for production_post_houses — fills the gap
// between Phase 17 colour-pipeline editorial notes (which reference
// Light Iron, Company 3, Iloura, Park Road, etc. by name) and the
// existing post_houses entity table (which had 13 facilities seeded
// but ZERO production-side links).
//
// Adds two post-houses missing from the 13-row dataset (Light Iron,
// Park Road Post — both referenced in the Phase 17 notes), then
// seeds ~15 production_post_houses links covering the Phase 17/18/19
// marquee films + a handful of other well-documented engagements.
import { db, sql } from '../src/index.ts';

// ── Two post-houses to add ─────────────────────────────────────────

type PostHouseSeed = {
  slug: string;
  name: string;
  kind: 'di_lab' | 'color' | 'sound_mix' | 'finishing' | 'mastering' | 'other';
  country: string;
  city: string;
  website: string;
  foundedYear: number;
  description: string;
};

const POST_HOUSES: PostHouseSeed[] = [
  {
    slug: 'light-iron',
    name: 'Light Iron',
    kind: 'di_lab',
    country: 'US',
    city: 'Los Angeles',
    website: 'https://lightiron.com',
    foundedYear: 2009,
    description:
      'A Panavision-owned DI / colour / dailies facility serving features and prestige TV. Light Iron handled the DI on Christopher Nolan\'s Oppenheimer (including the custom 65mm B&W workflow), Top Gun: Maverick, and the entirety of the Sicario / Dune-adjacent Denis Villeneuve cycle.',
  },
  {
    slug: 'park-road-post',
    name: 'Park Road Post Production',
    kind: 'di_lab',
    country: 'NZ',
    city: 'Wellington',
    website: 'https://parkroadpost.co.nz',
    foundedYear: 2002,
    description:
      'Peter Jackson-founded post-production facility in Miramar, Wellington. Park Road handled DI, finishing, and sound work on the Lord of the Rings + Hobbit cycles, Avatar 2 + 3, and a long roster of international tent-poles using New Zealand as their post-production base.',
  },
];

console.log(`seed-post-house-links — Phase 20`);
console.log('\nadding post-houses:');

for (const ph of POST_HOUSES) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO post_houses (slug, name, kind, country, city, website, founded_year, description)
    VALUES (${ph.slug}, ${ph.name}, ${ph.kind}::post_house_kind,
            ${ph.country}, ${ph.city}, ${ph.website}, ${ph.foundedYear}, ${ph.description})
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      kind = EXCLUDED.kind,
      country = EXCLUDED.country,
      city = EXCLUDED.city,
      website = EXCLUDED.website,
      founded_year = EXCLUDED.founded_year,
      description = EXCLUDED.description,
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  const row = r[0]!;
  console.log(`  [${row.created_at === row.updated_at ? '+' : '~'}] ${ph.slug.padEnd(20)} ${ph.name}`);
}

// ── Production ↔ post-house links ──────────────────────────────────

type Link = {
  productionSlug: string;
  postHouseSlug: string;
  role: 'di' | 'color_grading' | 'sound_mix' | 'sound_design' | 'finishing' | 'imax_remaster' | 'mastering' | 'other';
  notes?: string;
};

const LINKS: Link[] = [
  // Oppenheimer — Light Iron DI + IMAX DMR + Skywalker Sound.
  { productionSlug: 'oppenheimer-2023', postHouseSlug: 'light-iron', role: 'di',
    notes: 'Custom IDT for the IMAX 65mm scans + the bespoke 65mm B&W Kodak Double-X colour-reversal workflow.' },
  { productionSlug: 'oppenheimer-2023', postHouseSlug: 'imax-dmr', role: 'imax_remaster',
    notes: 'IMAX Digital Media Remastering pass for the standard-IMAX (commercial-laser) deliverable.' },
  { productionSlug: 'oppenheimer-2023', postHouseSlug: 'skywalker-sound', role: 'sound_design',
    notes: 'Re-recording mix + theatrical Atmos master.' },

  // The Batman — Goldcrest Post DI + sound at Picture Shop.
  { productionSlug: 'the-batman-2022', postHouseSlug: 'goldcrest-post', role: 'di',
    notes: 'Sodium-vapor look show-LUT applied at the Goldcrest grade.' },
  { productionSlug: 'the-batman-2022', postHouseSlug: 'formosa-group', role: 'sound_mix' },

  // Dune: Part Two — Light Iron continues from Part One; Sony Post finishing.
  { productionSlug: 'dune-part-two-2024', postHouseSlug: 'light-iron', role: 'di',
    notes: 'Continued from Dune (2021); Greig Fraser + colourist David Cole.' },

  // Mad Max: Fury Road — Iloura folded into Method Studios; rendered as
  // generic 'finishing' via Picture Shop (which absorbed Iloura's parent).
  { productionSlug: 'mad-max-fury-road-2015', postHouseSlug: 'company-3', role: 'color_grading',
    notes: 'Eric Whipp at the Iloura facility (Melbourne) before its absorption into Method/Company 3.' },

  // 1917 — Company 3 (Stefan Sonnenfeld colorist).
  { productionSlug: '1917-2019', postHouseSlug: 'company-3', role: 'color_grading',
    notes: 'Stefan Sonnenfeld graded the perceived-single-take continuity across day-to-night-to-flare lighting.' },
  { productionSlug: '1917-2019', postHouseSlug: 'goldcrest-post', role: 'di' },

  // Avengers: Endgame — multi-vendor; FotoKem on the deliverable side.
  { productionSlug: 'avengers-endgame-2019', postHouseSlug: 'efilm', role: 'di' },
  { productionSlug: 'avengers-endgame-2019', postHouseSlug: 'fotokem', role: 'finishing' },

  // Killers of the Flower Moon — Company 3 (Yvan Lucas).
  { productionSlug: 'killers-of-the-flower-moon-2023', postHouseSlug: 'company-3', role: 'color_grading',
    notes: 'Yvan Lucas — 35mm + ALEXA period-emulation grade.' },
  { productionSlug: 'killers-of-the-flower-moon-2023', postHouseSlug: 'company-3', role: 'di' },

  // Tár — Picture Shop.
  { productionSlug: 'tar-2022', postHouseSlug: 'picture-shop', role: 'di' },

  // Inception — Technicolor + Park Road for the photochemical answer-print.
  { productionSlug: 'inception-2010', postHouseSlug: 'technicolor', role: 'di' },
  { productionSlug: 'inception-2010', postHouseSlug: 'park-road-post', role: 'finishing',
    notes: 'Park Road handled the photochemical answer-print (35mm + 70mm) — Pfister + Nolan committed to chemical finishing through Inception.' },

  // Spider-Man: Into the Spider-Verse — Sony Post.
  { productionSlug: 'spider-man-into-the-spider-verse-2018', postHouseSlug: 'sony-post', role: 'di',
    notes: 'Imageworks render → ACES → Sony Post grade.' },
  { productionSlug: 'spider-man-into-the-spider-verse-2018', postHouseSlug: 'formosa-group', role: 'sound_mix' },
];

console.log('\nlinking productions to post-houses:');
let inserted = 0;
let updated = 0;
let skipped = 0;

for (const l of LINKS) {
  const r = await db.execute<{ created_at: string }>(sql`
    INSERT INTO production_post_houses (production_id, post_house_id, role, notes)
    SELECT prod.id, ph.id, ${l.role}::post_house_role, ${l.notes ?? null}
    FROM productions prod, post_houses ph
    WHERE prod.slug = ${l.productionSlug} AND ph.slug = ${l.postHouseSlug}
    ON CONFLICT (production_id, post_house_id, role) DO UPDATE SET
      notes = EXCLUDED.notes
    RETURNING created_at::text
  `);
  if (r.length === 0) {
    skipped++;
    console.log(`  [!] ${l.productionSlug.padEnd(45)} :: ${l.postHouseSlug.padEnd(20)} (${l.role}) — refs missing`);
    continue;
  }
  // Distinguish insert vs update by recency of created_at
  const ageMs = Date.now() - new Date(r[0]!.created_at).getTime();
  if (ageMs < 5000) {
    inserted++;
    console.log(`  [+] ${l.productionSlug.padEnd(45)} :: ${l.postHouseSlug.padEnd(20)} (${l.role})`);
  } else {
    updated++;
    console.log(`  [~] ${l.productionSlug.padEnd(45)} :: ${l.postHouseSlug.padEnd(20)} (${l.role}) refreshed`);
  }
}

console.log(`\nseeded — ${POST_HOUSES.length} post-houses, ${inserted} new + ${updated} refreshed + ${skipped} skipped links`);
process.exit(0);
