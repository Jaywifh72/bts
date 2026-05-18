import { db, sql } from '../src/index.ts';

type Ref = { title: string; url: string; publication?: string; kind?: string };

type SpecialtySeed = {
  slug: string; name: string;
  country: string; city: string; headquarters: string;
  founded_year: number;
  parent_company?: string; employee_count?: number;
  website: string; careers_url?: string; reel_url?: string;
  wikidata_id?: string;
  summary: string; tagline: string;
  specialties: string[]; founders: string[];
  references: Ref[];
};

// ── Makeup effects houses ────────────────────────────────────────
const MAKEUP_HOUSES: SpecialtySeed[] = [
  {
    slug: 'knb-efx', name: 'KNB EFX Group',
    country: 'US', city: 'Van Nuys',
    headquarters: 'Van Nuys, California, USA',
    founded_year: 1988,
    employee_count: 80,
    website: 'https://www.knbefx.com',
    wikidata_id: 'Q3216770',
    summary: `KNB EFX Group is the most-credited practical makeup effects house in modern film + television. Founded in 1988 by Robert Kurtzman, Greg Nicotero, and Howard Berger (the K, N, and B of the name), the shop has built creatures, prosthetics, gore effects, and aging makeup for over 800 productions.

Greg Nicotero exited as the lead creative director when he became showrunner of AMC's The Walking Dead in 2010; KNB has produced all on-screen practical effects across the show's eleven-season run, plus all spinoffs. Other tentpole credits include the Pirates of the Caribbean franchise (Davy Jones tentacles + crew, before VFX takeover), the Quentin Tarantino filmography from Kill Bill forward, every Sam Raimi feature since the original Evil Dead trilogy, Pan's Labyrinth (the Pale Man + Faun), and recent prestige TV (Pachinko, Severance).

KNB famously combines silicone prosthetics with the Pros-Aide adhesive system. The shop's prosthetic process — life cast → sculpting in Roma clay → molding in stone → silicone or foam latex pour → on-set application by a 3-5 person team per actor — set the modern industry standard.`,
    tagline: 'The most-credited practical makeup effects house in modern film — KNB built Davy Jones, the Pale Man, every Walking Dead zombie.',
    specialties: ['prosthetics', 'creature design', 'aging makeup', 'gore effects', 'animatronics'],
    founders: ['Robert Kurtzman', 'Greg Nicotero', 'Howard Berger'],
    references: [
      { title: 'KNB EFX — official', url: 'https://www.knbefx.com', publication: 'KNB EFX', kind: 'official' },
      { title: 'KNB EFX Wikipedia', url: 'https://en.wikipedia.org/wiki/KNB_EFX_Group', publication: 'Wikipedia', kind: 'wiki' },
      { title: 'Inside KNB EFX', url: 'https://www.makeupartistmagazine.com/knb-efx-group/', publication: 'Make-Up Artist Magazine', kind: 'feature' },
    ],
  },
  {
    slug: 'legacy-effects', name: 'Legacy Effects',
    country: 'US', city: 'San Fernando',
    headquarters: 'San Fernando, California, USA',
    founded_year: 2008,
    employee_count: 120,
    website: 'https://www.legacyefx.com',
    wikidata_id: 'Q6515727',
    summary: `Legacy Effects is the successor to Stan Winston Studio, formed in 2008 by Winston's senior team after his death: Shane Mahan, John Rosengrant, Lindsay MacGowan, and Lon Lucini. The shop continues Stan Winston's practical-effects lineage — animatronic creatures, robotic suits, prosthetic makeup, and large-scale puppetry.

Most-cited recent credits include the Iron Man suits across the MCU (every Mark variant, from the original Mark I cave-built suit through Endgame), the dinosaurs in Jurassic World (recreating Winston's T-Rex from Jurassic Park), Apes in the Planet of the Apes reboot trilogy (mocap reference + practical apes), Pacific Rim Kaiju suits, and the snowtrooper armor for The Mandalorian.

Legacy is unique in combining practical animatronic build with on-set hybrid VFX work — many of their builds are designed knowing post-VFX will extend or composite them, so the rig comes with witness markers + chrome ball capture built in.`,
    tagline: 'The Stan Winston Studio successor — the Iron Man suits, Jurassic World dinosaurs, Pacific Rim Kaiju.',
    parent_company: 'Independent',
    specialties: ['animatronics', 'prosthetics', 'creature design', 'robotic suits', 'practical / VFX hybrid'],
    founders: ['Shane Mahan', 'John Rosengrant', 'Lindsay MacGowan', 'Lon Lucini'],
    references: [
      { title: 'Legacy Effects — official', url: 'https://www.legacyefx.com', publication: 'Legacy Effects', kind: 'official' },
      { title: 'Stan Winston Studio history', url: 'https://www.stanwinstonschool.com/blog/stan-winston-studio-history', publication: 'Stan Winston School', kind: 'feature' },
    ],
  },
  {
    slug: 'spectral-motion', name: 'Spectral Motion',
    country: 'US', city: 'Glendale',
    headquarters: 'Glendale, California, USA',
    founded_year: 1994,
    employee_count: 35,
    website: 'https://www.spectralmotion.com',
    summary: `Spectral Motion is a boutique creature + makeup effects shop founded by Mike Elizalde in 1994. The shop is best known for its long-running collaboration with Guillermo del Toro — every del Toro feature from Mimic (1997) through The Shape of Water (2017) carries Spectral creature work, including Hellboy + Hellboy II's Abe Sapien suits, Pan's Labyrinth's Faun (co-built with KNB), and the Amphibian Man in The Shape of Water (worn by Doug Jones across all those films).

Smaller-scale than KNB or Legacy but unmatched in suit performer build — Spectral's foam-latex + silicone hybrid suits are designed around specific performers (typically Doug Jones), with internal armatures shaped to the wearer's skeletal proportions.`,
    tagline: 'Guillermo del Toro\'s creature shop — Abe Sapien, the Faun, the Amphibian Man, every del Toro creature since Mimic.',
    specialties: ['creature design', 'suit performer fabrication', 'prosthetics', 'animatronics'],
    founders: ['Mike Elizalde'],
    references: [
      { title: 'Spectral Motion — official', url: 'https://www.spectralmotion.com', publication: 'Spectral Motion', kind: 'official' },
    ],
  },
  {
    slug: 'tom-savini-studios', name: 'Tom Savini Studios',
    country: 'US', city: 'Pittsburgh',
    headquarters: 'Pittsburgh, Pennsylvania, USA',
    founded_year: 1985,
    employee_count: 15,
    website: 'https://www.tomsavinishop.com',
    wikidata_id: 'Q7818373',
    summary: `Tom Savini Studios is the boutique shop of George Romero's longtime makeup effects collaborator Tom Savini. Founded in 1985, the shop continues to operate alongside the Tom Savini Special Make-Up Effects Program at the Douglas Education Center — Savini's training school for the next generation of practical-effects artists.

Savini's iconic credits date to the late 1970s/early 1980s zombie + slasher renaissance: Dawn of the Dead (1978) zombies, Friday the 13th (1980) kill effects, Day of the Dead (1985) Bub the zombie. The modern shop produces effects for indie horror + Pittsburgh-area productions while serving primarily as the lab for Savini's teaching program.`,
    tagline: 'George Romero\'s zombie shop since Dawn of the Dead (1978) — and the lab for Savini\'s practical effects training school.',
    specialties: ['gore effects', 'zombie makeup', 'horror prosthetics', 'training program'],
    founders: ['Tom Savini'],
    references: [
      { title: 'Tom Savini Studios — official', url: 'https://www.tomsavinishop.com', publication: 'Tom Savini Studios', kind: 'official' },
      { title: 'Tom Savini Wikipedia', url: 'https://en.wikipedia.org/wiki/Tom_Savini', publication: 'Wikipedia', kind: 'wiki' },
    ],
  },
];

// ── Title sequence houses ───────────────────────────────────────
const TITLE_HOUSES: SpecialtySeed[] = [
  {
    slug: 'imaginary-forces', name: 'Imaginary Forces',
    country: 'US', city: 'Hollywood',
    headquarters: 'Hollywood, California, USA',
    founded_year: 1996,
    employee_count: 80,
    website: 'https://www.imaginaryforces.com',
    careers_url: 'https://www.imaginaryforces.com/careers',
    reel_url: 'https://www.imaginaryforces.com/work',
    wikidata_id: 'Q6005203',
    summary: `Imaginary Forces is the most-cited title sequence design house in modern film + episodic. Founded in 1996 by Peter Frankfurt, Chip Houghton, and Kyle Cooper (Cooper exited in 2003 to found Prologue), the shop has produced opening titles for Mad Men, Boardwalk Empire, Game of Thrones (Season 1 only), Stranger Things, The Boys, and over a thousand films and series.

Karin Fong joined as a creative director in the early 2000s and is widely considered the field's defining contemporary voice — her Mad Men titles (2007, 2008 Emmy-winning) reset what a TV opening could be. Her recent work includes Severance (Apple TV+, with the kinetic vortex sequence) and the Spider-Man: No Way Home end-credit titles.

The shop also produces broadcast graphics, brand identity for film franchises (the Marvel logo evolution work), and motion-design support for VFX-heavy features.`,
    tagline: 'The most-credited title sequence house in modern film + episodic — Mad Men, Stranger Things, Severance, the modern Spider-Man title cards.',
    parent_company: 'Independent',
    specialties: ['main-title sequence', 'main-on-end credits', 'broadcast graphics', 'motion graphics', 'brand identity'],
    founders: ['Peter Frankfurt', 'Chip Houghton', 'Kyle Cooper'],
    references: [
      { title: 'Imaginary Forces — official', url: 'https://www.imaginaryforces.com', publication: 'Imaginary Forces', kind: 'official' },
      { title: 'Imaginary Forces on Art of the Title', url: 'https://www.artofthetitle.com/studio/imaginary-forces/', publication: 'Art of the Title', kind: 'feature' },
    ],
  },
  {
    slug: 'prologue-films', name: 'Prologue Films',
    country: 'US', city: 'Venice',
    headquarters: 'Venice, California, USA',
    founded_year: 2003,
    employee_count: 50,
    website: 'https://prologue.com',
    careers_url: 'https://prologue.com/careers',
    reel_url: 'https://prologue.com/work',
    wikidata_id: 'Q22282413',
    summary: `Prologue Films was founded in 2003 by Kyle Cooper, the title designer behind Se7en's groundbreaking 1995 sequence (made while at Imaginary Forces). Prologue produces title sequences, VFX, and motion design for film, TV, advertising, and game cinematics.

Cooper-era Prologue credits include the Iron Man trilogy main titles (with the Mark II rotating armor reveal), the Avengers and MCU title cards through Avengers: Endgame, the True Detective Season 1 sequence (with Jonathan Glazer as director), Spider-Man: Far From Home, John Wick titles, and the Walking Dead opening (continued from Imaginary Forces).

Distinctive Prologue style: heavy texture work, type-as-character emphasis, layered media (live-action plates + 3D + photographic), often dark + brutalist.`,
    tagline: 'Kyle Cooper\'s post-Imaginary-Forces studio — True Detective Season 1, MCU title cards through Endgame, John Wick.',
    parent_company: 'Independent',
    specialties: ['main-title sequence', 'feature film titles', 'motion graphics', 'live action / 3D hybrid'],
    founders: ['Kyle Cooper'],
    references: [
      { title: 'Prologue Films — official', url: 'https://prologue.com', publication: 'Prologue Films', kind: 'official' },
      { title: 'Kyle Cooper interview', url: 'https://www.artofthetitle.com/designer/kyle-cooper/', publication: 'Art of the Title', kind: 'interview' },
    ],
  },
  {
    slug: 'mill-plus', name: 'Mill+',
    country: 'GB', city: 'London',
    headquarters: 'London, United Kingdom',
    founded_year: 2014,
    parent_company: 'Technicolor Creative Studios',
    employee_count: 200,
    website: 'https://www.themill.com/mill-plus',
    summary: `Mill+ is the title sequence + motion design division of The Mill (the broader Technicolor-owned VFX house). Founded as a Mill subsidiary in 2014, Mill+ produces title sequences, brand films, music videos, and game cinematics across The Mill's London / New York / LA / Berlin / Chicago / Shanghai footprint.

Recent credits include the Black Mirror title sequences (Netflix), several Mr. Robot title cards, brand work for Apple + Adidas, and feature title sequences for indie + mid-tier releases. Less prolific in feature titles than Imaginary Forces or Prologue but stronger on hybrid live-action / motion graphics work.`,
    tagline: 'The Mill\'s motion design division — Black Mirror titles, Mr. Robot, brand work for Apple + Adidas.',
    specialties: ['motion graphics', 'title sequences', 'brand films', 'game cinematics', 'live action / motion hybrid'],
    founders: ['The Mill creative directorate'],
    references: [
      { title: 'Mill+ — official', url: 'https://www.themill.com/mill-plus', publication: 'The Mill', kind: 'official' },
    ],
  },
];

async function applyMakeup(seeds: SpecialtySeed[]) {
  let up = 0;
  for (const h of seeds) {
    await db.execute(sql`
      INSERT INTO makeup_effects_houses (
        slug, name, country, city, headquarters, founded_year,
        parent_company, employee_count, website, careers_url, reel_url, wikidata_id,
        summary, tagline, specialties, founders, "references",
        data_tier, last_verified_at
      ) VALUES (
        ${h.slug}, ${h.name}, ${h.country}, ${h.city}, ${h.headquarters}, ${h.founded_year},
        ${h.parent_company ?? null}, ${h.employee_count ?? null},
        ${h.website}, ${h.careers_url ?? null}, ${h.reel_url ?? null}, ${h.wikidata_id ?? null},
        ${h.summary}, ${h.tagline},
        ${sql.raw(`'{${h.specialties.map((s) => '"' + s.replace(/"/g, '\\"') + '"').join(',')}}'::text[]`)},
        ${sql.raw(`'{${h.founders.map((s) => '"' + s.replace(/"/g, '\\"') + '"').join(',')}}'::text[]`)},
        ${JSON.stringify(h.references)}::jsonb,
        'curated', NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, country = EXCLUDED.country, city = EXCLUDED.city,
        headquarters = EXCLUDED.headquarters, founded_year = EXCLUDED.founded_year,
        parent_company = EXCLUDED.parent_company, employee_count = EXCLUDED.employee_count,
        website = EXCLUDED.website, careers_url = EXCLUDED.careers_url,
        reel_url = EXCLUDED.reel_url, wikidata_id = EXCLUDED.wikidata_id,
        summary = EXCLUDED.summary, tagline = EXCLUDED.tagline,
        specialties = EXCLUDED.specialties, founders = EXCLUDED.founders,
        "references" = EXCLUDED."references", data_tier = 'curated',
        last_verified_at = NOW(), updated_at = NOW()
    `);
    up++;
  }
  return up;
}

async function applyTitle(seeds: SpecialtySeed[]) {
  let up = 0;
  for (const h of seeds) {
    await db.execute(sql`
      INSERT INTO title_sequence_houses (
        slug, name, country, city, headquarters, founded_year,
        parent_company, employee_count, website, careers_url, reel_url, wikidata_id,
        summary, tagline, specialties, founders, "references",
        data_tier, last_verified_at
      ) VALUES (
        ${h.slug}, ${h.name}, ${h.country}, ${h.city}, ${h.headquarters}, ${h.founded_year},
        ${h.parent_company ?? null}, ${h.employee_count ?? null},
        ${h.website}, ${h.careers_url ?? null}, ${h.reel_url ?? null}, ${h.wikidata_id ?? null},
        ${h.summary}, ${h.tagline},
        ${sql.raw(`'{${h.specialties.map((s) => '"' + s.replace(/"/g, '\\"') + '"').join(',')}}'::text[]`)},
        ${sql.raw(`'{${h.founders.map((s) => '"' + s.replace(/"/g, '\\"') + '"').join(',')}}'::text[]`)},
        ${JSON.stringify(h.references)}::jsonb,
        'curated', NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name, country = EXCLUDED.country, city = EXCLUDED.city,
        headquarters = EXCLUDED.headquarters, founded_year = EXCLUDED.founded_year,
        parent_company = EXCLUDED.parent_company, employee_count = EXCLUDED.employee_count,
        website = EXCLUDED.website, careers_url = EXCLUDED.careers_url,
        reel_url = EXCLUDED.reel_url, wikidata_id = EXCLUDED.wikidata_id,
        summary = EXCLUDED.summary, tagline = EXCLUDED.tagline,
        specialties = EXCLUDED.specialties, founders = EXCLUDED.founders,
        "references" = EXCLUDED."references", data_tier = 'curated',
        last_verified_at = NOW(), updated_at = NOW()
    `);
    up++;
  }
  return up;
}

const m = await applyMakeup(MAKEUP_HOUSES);
console.log(`[+] makeup_effects_houses: ${m} upserted`);
const t = await applyTitle(TITLE_HOUSES);
console.log(`[+] title_sequence_houses: ${t} upserted`);
process.exit(0);
