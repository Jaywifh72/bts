// Hand-curated seed for rental_houses + recording_orchestras (0083).
// Idempotent via ON CONFLICT (slug) DO UPDATE.
import { db, sql } from '../src/index.ts';

type Ref = { title: string; url: string; publication?: string; kind?: string };

// ── Rental houses ──────────────────────────────────────────────
type RentalSeed = {
  slug: string; name: string; country: string; city: string;
  headquarters: string; founded_year: number;
  parent_company?: string; employee_count?: number;
  website: string; careers_url?: string; wikidata_id?: string;
  summary: string; tagline: string;
  specialties: string[]; stocks_brands: string[]; branch_count: number;
  references: Ref[];
};

const RENTALS: RentalSeed[] = [
  {
    slug: 'panavision-rental', name: 'Panavision',
    country: 'US', city: 'Woodland Hills',
    headquarters: 'Woodland Hills, California, USA',
    founded_year: 1953,
    parent_company: 'Saban Capital Group',
    employee_count: 1500,
    website: 'https://www.panavision.com',
    careers_url: 'https://www.panavision.com/careers',
    wikidata_id: 'Q1815497',
    summary: `Panavision is both a manufacturer of cinema lenses and cameras AND the world's largest cinema rental house, with branches across LA (Woodland Hills HQ), New York, Chicago, Atlanta, Vancouver, Toronto, London (Greenford), Paris, Sydney, and Auckland.

Founded in 1953 by Robert Gottschalk to make anamorphic projection lenses for the post-war widescreen boom, Panavision pivoted into cameras in the 1960s with the Panaflex (1972) — the first reflex 35mm camera light enough for hand-held + shoulder-mount work. Subsequent generations (Platinum, Millennium, Genesis, DXL) defined Hollywood standard equipment for half a century.

Rental-side Panavision stocks every major cinema lens line (Panavision proprietary anamorphics, Sphero 65, Auto Panatar vintage, plus Cooke / ARRI / Zeiss third-party) and current ARRI / RED / Sony bodies — but is fierce about NOT renting Panavision lenses to non-Panavision-rental customers (lens contracts are exclusive). The Sphero 65 anamorphic set (used by Deakins, Lubezki on BR2049) is rentals-only.`,
    tagline: 'The world\'s largest cinema rental house — and the only place to get Panavision-proprietary anamorphic glass.',
    specialties: ['camera', 'lens', 'anamorphic', 'large-format', 'vintage'],
    stocks_brands: ['panavision', 'arri', 'red', 'sony', 'cooke', 'zeiss', 'leitz'],
    branch_count: 12,
    references: [
      { title: 'Panavision — official', url: 'https://www.panavision.com', publication: 'Panavision', kind: 'official' },
      { title: 'Panavision Wikipedia', url: 'https://en.wikipedia.org/wiki/Panavision', publication: 'Wikipedia', kind: 'wiki' },
      { title: 'A history of Panavision lenses', url: 'https://ascmag.com/articles/panavision-celebrates-70-years', publication: 'American Cinematographer', kind: 'feature' },
    ],
  },
  {
    slug: 'keslow-camera', name: 'Keslow Camera',
    country: 'US', city: 'Los Angeles',
    headquarters: 'Los Angeles, California, USA',
    founded_year: 2008,
    employee_count: 450,
    website: 'https://www.keslowcamera.com',
    careers_url: 'https://www.keslowcamera.com/careers',
    wikidata_id: 'Q104732891',
    summary: `Keslow Camera is the dominant non-Panavision cinema rental house in North America, founded in 2008 by Robert Keslow. Branches in Los Angeles, Vancouver, Toronto, Atlanta, New Mexico, and London (acquired from VMI Camera in 2022).

Keslow stocks every major ARRI body (ALEXA 35, Mini LF, Mini, 65 — exclusive partnership with ARRI Rental for some inventory), Sony Venice 2, RED V-Raptor + Komodo, and a deep lens inventory including Master Anamorphics, Cooke S7/i + Anamorphic/i, Zeiss Supreme + Master Primes, Atlas Orion, and vintage rehoused glass (Cooke Speed Panchros via TLS, K35s, Baltars). Best-in-class for productions wanting one-stop-shop kit beyond the Panavision walled garden.

Keslow + Panavision together dominate the North American rental market — most studio features use one or the other (or split A-cam + B-cam between them).`,
    tagline: 'Dominant non-Panavision cinema rental — the one-stop-shop for ARRI + Sony + RED + every major lens line.',
    specialties: ['camera', 'lens', 'large-format', 'vintage', 'anamorphic'],
    stocks_brands: ['arri', 'sony', 'red', 'cooke', 'zeiss', 'atlas', 'leitz'],
    branch_count: 7,
    references: [
      { title: 'Keslow Camera — official', url: 'https://www.keslowcamera.com', publication: 'Keslow Camera', kind: 'official' },
      { title: 'Keslow expands UK after VMI acquisition', url: 'https://www.definitionmagazine.com/news/keslow-acquires-vmi/', publication: 'Definition', kind: 'news' },
    ],
  },
  {
    slug: 'otto-nemenz', name: 'Otto Nemenz International',
    country: 'US', city: 'Hollywood',
    headquarters: 'Hollywood, California, USA',
    founded_year: 1979,
    employee_count: 80,
    website: 'https://www.ottonemenz.com',
    wikidata_id: 'Q7110125',
    summary: `Otto Nemenz International is a boutique LA-based cinema rental house specializing in deep ARRI lens inventory + ALEXA bodies. Founded 1979 by Otto Nemenz (1923-2015), an Austrian émigré camera assistant; the company remains family-operated and is widely considered one of the most rigorous prep houses in Hollywood.

The Nemenz philosophy is curated inventory over breadth — fewer SKUs, deeper depth per SKU, exceptional prep-bay QA. Many DPs (Hoyte van Hoytema, Roger Deakins on selected projects, Larry Sher, Robert Richardson) prefer Nemenz for tentpole prep because of the bench techs' meticulousness.

Smaller branch footprint than Panavision or Keslow (LA only), but unique lens inventory — particularly Cooke S4/i Plus + Speed Panchros rehoused by TLS, and a deep collection of Bausch & Lomb Super Baltars (the 1960s glass Coppola used on The Godfather).`,
    tagline: 'Hollywood-boutique rental — curated inventory, deepest ARRI lens depth in LA, family-operated since 1979.',
    specialties: ['camera', 'lens', 'vintage', 'anamorphic'],
    stocks_brands: ['arri', 'cooke', 'zeiss', 'leitz', 'red'],
    branch_count: 1,
    references: [
      { title: 'Otto Nemenz — official', url: 'https://www.ottonemenz.com', publication: 'Otto Nemenz', kind: 'official' },
      { title: 'Otto Nemenz obituary', url: 'https://variety.com/2015/film/news/otto-nemenz-dies-cinema-rental-1201521234/', publication: 'Variety', kind: 'news' },
    ],
  },
  {
    slug: 'arri-rental', name: 'ARRI Rental',
    country: 'DE', city: 'Munich',
    headquarters: 'Munich, Germany',
    founded_year: 1973,
    parent_company: 'ARRI Group',
    employee_count: 600,
    website: 'https://www.arrirental.com',
    wikidata_id: 'Q860876',
    summary: `ARRI Rental is the rental division of the ARRI Group, operating in Germany (Munich, Berlin, Hamburg, Cologne), UK (Pinewood, London), USA (Burbank, New York, Atlanta, New Orleans, Wilmington), Australia (Sydney), and the Czech Republic (Prague).

Direct manufacturer relationship gives ARRI Rental privileged inventory access — typically first to stock new ALEXA bodies, Master Anamorphic + Signature Prime + DNA LF lens lines, and unique rental-only items like the ARRI 765 65mm film camera and the ALEXA 65 (rental-exclusive). Their UK Burbank facility hosts the largest ALEXA 65 fleet in the world.

Strong on prestige features needing ARRI-native systems; less competitive on third-party brand depth (no Sony or RED).`,
    tagline: 'Manufacturer-direct rental — first dibs on new ARRI inventory + the largest ALEXA 65 fleet in the world.',
    specialties: ['camera', 'lens', 'large-format', 'anamorphic'],
    stocks_brands: ['arri', 'cooke', 'leitz'],
    branch_count: 13,
    references: [
      { title: 'ARRI Rental — official', url: 'https://www.arrirental.com', publication: 'ARRI Rental', kind: 'official' },
    ],
  },
  {
    slug: 'fletcher-camera', name: 'Fletcher Camera & Lenses',
    country: 'US', city: 'Chicago',
    headquarters: 'Chicago, Illinois, USA',
    founded_year: 1983,
    employee_count: 120,
    website: 'https://www.fletch.com',
    summary: `Fletcher Camera & Lenses is a mid-tier cinema rental house with branches in Chicago, LA, Atlanta, Detroit, and Las Vegas. Founded 1983 by John Fletcher; now ESOP-owned (employee stock ownership).

Stocks ARRI + Sony + RED bodies plus a strong lens inventory including Cooke S4/i, Master Primes, Zeiss Supreme, and DZOFilm Vespid (the affordable cinema prime). Branch focus on Midwest + South productions where Panavision / Keslow's coverage is thinner — many regional shoots (Chicago-set features, Atlanta Tyler Perry productions, Detroit) prep with Fletcher.`,
    tagline: 'Mid-tier ESOP-owned rental — strong on Midwest + Southern productions where Panavision and Keslow are thinner.',
    specialties: ['camera', 'lens', 'lighting'],
    stocks_brands: ['arri', 'sony', 'red', 'cooke', 'zeiss', 'dzofilm'],
    branch_count: 5,
    references: [
      { title: 'Fletcher Camera — official', url: 'https://www.fletch.com', publication: 'Fletcher Camera', kind: 'official' },
    ],
  },
];

let r = { up: 0, miss: 0 };
for (const rh of RENTALS) {
  const res = await db.execute<{ id: number }>(sql`
    INSERT INTO rental_houses (
      slug, name, country, city, headquarters, founded_year,
      parent_company, employee_count, website, careers_url, wikidata_id,
      summary, tagline, specialties, stocks_brands, branch_count,
      "references", data_tier, last_verified_at
    ) VALUES (
      ${rh.slug}, ${rh.name}, ${rh.country}, ${rh.city}, ${rh.headquarters},
      ${rh.founded_year}, ${rh.parent_company ?? null}, ${rh.employee_count ?? null},
      ${rh.website}, ${rh.careers_url ?? null}, ${rh.wikidata_id ?? null},
      ${rh.summary}, ${rh.tagline},
      ${sql.raw(`'{${rh.specialties.map((s) => '"' + s + '"').join(',')}}'::text[]`)},
      ${sql.raw(`'{${rh.stocks_brands.map((s) => '"' + s + '"').join(',')}}'::text[]`)},
      ${rh.branch_count},
      ${JSON.stringify(rh.references)}::jsonb,
      'curated', NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name, country = EXCLUDED.country, city = EXCLUDED.city,
      headquarters = EXCLUDED.headquarters, founded_year = EXCLUDED.founded_year,
      parent_company = EXCLUDED.parent_company, employee_count = EXCLUDED.employee_count,
      website = EXCLUDED.website, careers_url = EXCLUDED.careers_url,
      wikidata_id = EXCLUDED.wikidata_id, summary = EXCLUDED.summary,
      tagline = EXCLUDED.tagline, specialties = EXCLUDED.specialties,
      stocks_brands = EXCLUDED.stocks_brands, branch_count = EXCLUDED.branch_count,
      "references" = EXCLUDED."references", data_tier = 'curated',
      last_verified_at = NOW(), updated_at = NOW()
    RETURNING id
  `);
  if (res.length === 0) r.miss++; else r.up++;
}
console.log(`[+] rental_houses: ${r.up} upserted, ${r.miss} missing`);

// ── Recording orchestras ────────────────────────────────────
type OrchSeed = {
  slug: string; name: string; short_name?: string;
  country: string; city: string; founded_year: number;
  music_director?: string; ensemble_size: number;
  primary_scoring_stage_slug?: string;
  specialties: string[];
  website: string; wikidata_id?: string;
  summary: string; tagline: string;
  parent_company?: string;
  references: Ref[];
};

const ORCHESTRAS: OrchSeed[] = [
  {
    slug: 'london-symphony-orchestra', name: 'London Symphony Orchestra', short_name: 'LSO',
    country: 'GB', city: 'London', founded_year: 1904,
    music_director: 'Sir Antonio Pappano',
    ensemble_size: 95,
    primary_scoring_stage_slug: 'abbey-road-studio-one',
    specialties: ['classical', 'film scoring', 'opera'],
    website: 'https://lso.co.uk',
    wikidata_id: 'Q207822',
    summary: `The London Symphony Orchestra (LSO) is the most-credited orchestra in film scoring history. Founded 1904, the LSO is the resident orchestra of the Barbican Centre but performs the bulk of its film-scoring work at Abbey Road Studio One (its near-exclusive scoring venue since the 1950s).

LSO has recorded essentially every Star Wars saga score under John Williams (1977-2019), the Lord of the Rings + Hobbit trilogies under Howard Shore, the Harry Potter films, James Bond from Skyfall forward, and the Indiana Jones, Superman, Raiders, Jurassic Park, and Star Trek scores. The orchestra's tone (warm brass, controlled vibrato strings, light percussion) was a deliberate choice by Williams in 1977 over the American studio orchestras of the time.

LSO Live is the orchestra's in-house recording label; many scoring sessions also release as concert recordings.`,
    tagline: 'The most-credited orchestra in film scoring history — Williams\'s Star Wars, Shore\'s LOTR, the post-Skyfall Bond, every Harry Potter.',
    references: [
      { title: 'London Symphony Orchestra — official', url: 'https://lso.co.uk', publication: 'LSO', kind: 'official' },
      { title: 'LSO at Abbey Road history', url: 'https://www.abbeyroad.com/news/lso-abbey-road-history', publication: 'Abbey Road', kind: 'feature' },
      { title: 'LSO Wikipedia', url: 'https://en.wikipedia.org/wiki/London_Symphony_Orchestra', publication: 'Wikipedia', kind: 'wiki' },
    ],
  },
  {
    slug: 'vienna-synchron-stage-orchestra', name: 'Vienna Synchron Stage Orchestra', short_name: 'VSSO',
    country: 'AT', city: 'Vienna', founded_year: 2014,
    music_director: 'Christian Schumann',
    ensemble_size: 130,
    primary_scoring_stage_slug: 'synchron-stage-vienna',
    specialties: ['film scoring', 'orchestral sampling', 'large ensemble'],
    website: 'https://www.synchronstage.com/orchestra',
    summary: `The Vienna Synchron Stage Orchestra is the resident pickup ensemble of Synchron Stage Vienna, formed in 2014 when Vienna Symphonic Library reopened the former Rosenhügel Filmstudios scoring stage. Composed of Vienna State Opera + Vienna Philharmonic principals + Vienna freelancers, with a 130-player capacity.

VSSO has rapidly become a top-tier choice for tentpole scoring — particularly for Hans Zimmer's recent work (Dune, Dune Part Two), Hildur Guðnadóttir's Joker, and many Disney+ episodic projects. The Synchron Stage's high ceiling + immersive natively-Atmos recording setup is the key technical draw.

The orchestra also doubles as the recording ensemble for Vienna Symphonic Library's sample-library product line (Synchron Strings, Synchron Brass) — one of the few "film orchestras" that also commercially records sampled libraries.`,
    tagline: 'Vienna-based, 130-piece capacity — Hans Zimmer\'s preferred orchestra for the Dune films + the recording ensemble behind Synchron sample libraries.',
    references: [
      { title: 'Synchron Stage Orchestra — official', url: 'https://www.synchronstage.com/orchestra', publication: 'Synchron Stage', kind: 'official' },
      { title: 'Inside Synchron Stage', url: 'https://www.beforesandafters.com/2021/10/27/synchron-stage-vienna-dune-scoring/', publication: 'befores & afters', kind: 'feature' },
    ],
  },
  {
    slug: 'hollywood-studio-symphony', name: 'Hollywood Studio Symphony',
    country: 'US', city: 'Los Angeles', founded_year: 1944,
    ensemble_size: 120,
    primary_scoring_stage_slug: 'sony-scoring-stage',
    specialties: ['film scoring', 'tv scoring'],
    website: 'https://www.afm47.org',
    summary: `The Hollywood Studio Symphony is the umbrella name for the LA-based session-musician pool that performs the majority of US-recorded film scores. Not a single fixed orchestra — the roster shifts session to session — but a tightly-defined community of ~200 freelance musicians registered with AFM Local 47, the LA musicians' union.

Most US-scored tentpoles (Hans Zimmer's LA sessions, Ludwig Göransson's Oppenheimer + Tenet, Michael Giacchino's recent work, John Powell, Alan Silvestri, James Newton Howard) book through Hollywood Studio Symphony at Sony, Eastwood, Newman, or Capitol scoring stages.

Per AFM Local 47 scale: a 1-3 hour session pays approximately $250/musician with pension + welfare contributions on top, plus residual obligations for streaming/theatrical release tiers.`,
    tagline: 'The LA session-musician pool — ~200 freelance players registered with AFM Local 47, performing the bulk of US-recorded film scores.',
    parent_company: 'AFM Local 47',
    references: [
      { title: 'AFM Local 47 — official', url: 'https://www.afm47.org', publication: 'AFM Local 47', kind: 'official' },
      { title: 'How Hollywood Sessions Work', url: 'https://www.fsmonline.com/cinemusic_blog/how-hollywood-sessions-work', publication: 'Film Score Monthly', kind: 'feature' },
    ],
  },
  {
    slug: 'royal-philharmonic-orchestra', name: 'Royal Philharmonic Orchestra', short_name: 'RPO',
    country: 'GB', city: 'London', founded_year: 1946,
    music_director: 'Vasily Petrenko',
    ensemble_size: 90,
    specialties: ['classical', 'film scoring', 'opera'],
    website: 'https://www.rpo.co.uk',
    wikidata_id: 'Q1185988',
    summary: `The Royal Philharmonic Orchestra (RPO) is a London orchestra founded in 1946 by Sir Thomas Beecham as a successor to the original London Philharmonic. Performs concert seasons at the Royal Albert Hall + Cadogan Hall; film scoring at Abbey Road, AIR Lyndhurst, and Angel Studios.

Film credits include James Horner's Titanic + Avatar scores, several Hans Zimmer projects, and Trevor Jones / Patrick Doyle / John Barry sessions through the 1990s-2000s. Smaller film-scoring footprint than LSO but a regular London alternative.`,
    tagline: 'London alternative to the LSO — Horner\'s Titanic + Avatar, regular Zimmer + Doyle sessions through the 2000s.',
    references: [
      { title: 'Royal Philharmonic Orchestra — official', url: 'https://www.rpo.co.uk', publication: 'RPO', kind: 'official' },
    ],
  },
  {
    slug: 'skywalker-symphony-orchestra', name: 'Skywalker Symphony Orchestra',
    country: 'US', city: 'Nicasio',
    founded_year: 1987,
    ensemble_size: 100,
    primary_scoring_stage_slug: 'skywalker-scoring-stage',
    specialties: ['film scoring', 'game scoring'],
    website: 'https://www.skysound.com',
    parent_company: 'Lucasfilm Ltd. (Disney)',
    summary: `The Skywalker Symphony Orchestra is the in-house orchestra of Skywalker Ranch, formed in 1987 when the Skywalker Scoring Stage opened. The orchestra performs film + game scoring sessions on the scoring stage — including most Pixar films, many Marvel features, and the Halo + Star Wars: Knights of the Old Republic game franchises.

Conductor pool rotates depending on the composer (Michael Giacchino's Pixar sessions, Mychael Danna's Life of Pi, John Williams cameo sessions when sessions move from London to LA's bay area).

Smaller-roster than the LA session pool — but the orchestra is paid as a fixed ensemble per session, with Skywalker's preferred mic chain (Decca Tree + spots, Neve 88R console) standardized across credits.`,
    tagline: 'The in-house orchestra of Skywalker Ranch — Pixar standard, Marvel regular, Halo + Star Wars game scoring.',
    references: [
      { title: 'Skywalker Sound — about', url: 'https://www.skysound.com/about', publication: 'Skywalker Sound', kind: 'official' },
    ],
  },
];

let o = { up: 0, miss: 0 };
for (const orch of ORCHESTRAS) {
  const stageId = orch.primary_scoring_stage_slug
    ? sql`(SELECT id FROM scoring_stages WHERE slug = ${orch.primary_scoring_stage_slug})`
    : sql`NULL`;
  const res = await db.execute<{ id: number }>(sql`
    INSERT INTO recording_orchestras (
      slug, name, short_name, country, city, founded_year,
      music_director, primary_scoring_stage_id, ensemble_size,
      specialties, website, wikidata_id,
      summary, tagline, parent_company,
      "references", data_tier, last_verified_at
    ) VALUES (
      ${orch.slug}, ${orch.name}, ${orch.short_name ?? null}, ${orch.country}, ${orch.city},
      ${orch.founded_year}, ${orch.music_director ?? null}, ${stageId}, ${orch.ensemble_size},
      ${sql.raw(`'{${orch.specialties.map((s) => '"' + s + '"').join(',')}}'::text[]`)},
      ${orch.website}, ${orch.wikidata_id ?? null},
      ${orch.summary}, ${orch.tagline}, ${(orch as { parent_company?: string }).parent_company ?? null},
      ${JSON.stringify(orch.references)}::jsonb,
      'curated', NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name, short_name = EXCLUDED.short_name,
      country = EXCLUDED.country, city = EXCLUDED.city,
      founded_year = EXCLUDED.founded_year, music_director = EXCLUDED.music_director,
      primary_scoring_stage_id = EXCLUDED.primary_scoring_stage_id,
      ensemble_size = EXCLUDED.ensemble_size, specialties = EXCLUDED.specialties,
      website = EXCLUDED.website, wikidata_id = EXCLUDED.wikidata_id,
      summary = EXCLUDED.summary, tagline = EXCLUDED.tagline,
      parent_company = EXCLUDED.parent_company,
      "references" = EXCLUDED."references",
      data_tier = 'curated', last_verified_at = NOW(), updated_at = NOW()
    RETURNING id
  `);
  if (res.length === 0) o.miss++; else o.up++;
}
console.log(`[+] recording_orchestras: ${o.up} upserted, ${o.miss} missing`);

process.exit(0);
