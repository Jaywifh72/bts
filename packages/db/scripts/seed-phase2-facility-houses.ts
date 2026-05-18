import { db } from '../src/db.ts';
import { sql } from 'drizzle-orm';

type Row = {
  slug: string; name: string;
  country?: string; city?: string; headquarters?: string;
  founded_year?: number; parent_company?: string; employee_count?: number;
  website?: string; careers_url?: string; reel_url?: string;
  summary?: string; tagline?: string;
  specialties?: string[]; founders?: string[];
  references?: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  room_count?: number;
};

const COSTUME: Row[] = [
  {
    slug: 'western-costume-company', name: 'Western Costume Company',
    country: 'USA', city: 'North Hollywood', headquarters: 'North Hollywood, CA',
    founded_year: 1912, website: 'https://westerncostume.com',
    summary: 'The oldest costume house in Hollywood. Five million pieces across a city-block warehouse. Designers rent, alter, and build with their cutters and breakdown artists. Every period drama with Western Costume’s label sewn into the linings.',
    tagline: 'Hollywood’s oldest costume rental and fabrication house.',
    specialties: ['period costume rental', 'breakdown / aging', 'tailoring + cutters'],
    references: [
      { title: 'Western Costume Company — history', url: 'https://en.wikipedia.org/wiki/Western_Costume_Company', publication: 'Wikipedia' },
    ],
  },
  {
    slug: 'cosprop', name: 'Cosprop',
    country: 'UK', city: 'London', headquarters: 'London, UK',
    founded_year: 1965, website: 'https://www.cosprop.com',
    summary: 'London’s gold standard for period rental. Sandy Powell, Jacqueline Durran, Jenny Beavan all build on Cosprop’s stock. Specialised workrooms for menswear, military, and ecclesiastical.',
    tagline: 'London period costume hire + bespoke workrooms.',
    specialties: ['period rental', '18th–20th century', 'military / ecclesiastical'],
  },
  {
    slug: 'tirelli-costumi', name: 'Tirelli Costumi',
    country: 'Italy', city: 'Rome', headquarters: 'Rome, Italy',
    founded_year: 1964,
    summary: 'Italian house known for opera, Visconti, and decades of Oscar-nominated period work. Holds historical garments dating to the 18th century.',
    tagline: 'Italian master of cinema and opera period dress.',
    specialties: ['period dress', 'opera', 'historical archives'],
  },
  {
    slug: 'angels-costumes', name: 'Angels Costumes',
    country: 'UK', city: 'London', headquarters: 'London, UK',
    founded_year: 1840, website: 'https://www.angels.uk.com',
    summary: 'The oldest costume hire house in the world. Eight miles of hanging stock across north London. From Doctor Who supporting cast to The Crown leads.',
    tagline: 'The oldest costume hire in the world (est. 1840).',
    specialties: ['period rental', 'film + TV breadth'],
  },
];

const SUPERVISION: Row[] = [
  {
    slug: 'format-entertainment', name: 'Format Entertainment',
    country: 'USA', city: 'Los Angeles', headquarters: 'Los Angeles, CA',
    website: 'https://formatentertainment.net',
    summary: 'Founded by Maggie Phillips, Format placed the needle drops in Atlanta, Master of None, Tár, and Beef. Reputation for curated taste rather than catalog-style placements.',
    tagline: 'Curated-taste music supervision for prestige film + TV.',
    specialties: ['needle-drop curation', 'A24 / FX titles', 'clearance'],
  },
  {
    slug: 'bonfire-music', name: 'Bonfire Music',
    country: 'USA', city: 'Los Angeles', headquarters: 'Los Angeles, CA',
    summary: 'Boutique supervision agency known for trailer placements, indie features, and director-driven needle drops.',
    tagline: 'Boutique supervision — features and trailers.',
    specialties: ['feature placements', 'trailers'],
  },
  {
    slug: 'loudhouse-music-supervision', name: 'Loudhouse',
    country: 'UK', city: 'London', headquarters: 'London, UK',
    summary: 'UK supervision agency working across film, TV drama, and ads. Strong reputation for clearing tricky vintage masters.',
    tagline: 'UK supervision across film, drama, and ad work.',
    specialties: ['UK / European clearance', 'TV drama', 'commercials'],
  },
  {
    slug: 'manners-mcdade', name: 'Manners McDade',
    country: 'UK', city: 'London', headquarters: 'London, UK',
    website: 'https://mannersmcdade.co.uk',
    summary: 'Composer agency + supervision house. Represents Jóhann Jóhannsson’s estate, Hildur Guðnadóttir, and others; also supervises sync placements.',
    tagline: 'Composer agency + music supervision (Jóhannsson, Guðnadóttir).',
    specialties: ['composer representation', 'sync supervision'],
  },
];

const ADR: Row[] = [
  {
    slug: 'margarita-mix', name: 'Margarita Mix',
    country: 'USA', city: 'Los Angeles', headquarters: 'Los Angeles, CA',
    founded_year: 1979, website: 'https://www.margaritamix.com',
    summary: 'One of the longest-running ADR + commercial mix houses in LA. ADR sessions for hundreds of features and series.',
    tagline: 'LA ADR + commercial mix institution since 1979.',
    specialties: ['ADR', 'commercial mix', 'voiceover'],
    room_count: 8,
  },
  {
    slug: 'larson-studios', name: 'Larson Studios',
    country: 'USA', city: 'Hollywood', headquarters: 'Hollywood, CA',
    founded_year: 1976, website: 'https://www.larsonstudios.com',
    summary: 'High-volume ADR house serving the streaming era. Episodic ADR for major series across networks and streamers.',
    tagline: 'Hollywood ADR house powering episodic streaming workflows.',
    specialties: ['episodic ADR', 'loop group', 'foreign-language dub'],
  },
  {
    slug: 'goldcrest-post-london-adr', name: 'Goldcrest Post (London ADR)',
    country: 'UK', city: 'London', headquarters: 'London, UK',
    website: 'https://www.goldcrestfilms.com/post-production',
    summary: 'Goldcrest’s London ADR rooms host UK casts and visiting US productions. Notable for picture-locked sessions on prestige limited series.',
    tagline: 'London ADR rooms for UK + US-visiting productions.',
    specialties: ['UK cast ADR', 'limited series'],
  },
  {
    slug: 'audiomotion-loop-group', name: 'Audiomotion Loop Group',
    country: 'UK', city: 'London',
    summary: 'London-based loop-group provider; rosters of voice talent for crowd walla, background, and small-part recasting.',
    tagline: 'London loop-group rosters for walla, background, and recasts.',
    specialties: ['loop group', 'walla', 'small-part recast'],
  },
];

async function upsert(table: string, rows: Row[]) {
  const arr = (xs?: string[]) =>
    `{${(xs ?? []).map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;

  for (const r of rows) {
    const refsJson = JSON.stringify(r.references ?? []);
    const extraCol = table === 'adr_studios' ? ', room_count' : '';
    const extraVal = table === 'adr_studios' ? sql`, ${r.room_count ?? null}` : sql``;
    const extraUpd = table === 'adr_studios' ? sql`, room_count = EXCLUDED.room_count` : sql``;
    const t = sql.raw(table);

    await db.execute(sql`
      INSERT INTO ${t}
        (slug, name, country, city, headquarters, founded_year, parent_company,
         employee_count, website, careers_url, reel_url, summary, tagline,
         specialties, founders, "references", data_tier, last_curated_review${sql.raw(extraCol)})
      VALUES (${r.slug}, ${r.name}, ${r.country ?? null}, ${r.city ?? null},
              ${r.headquarters ?? null}, ${r.founded_year ?? null},
              ${r.parent_company ?? null}, ${r.employee_count ?? null},
              ${r.website ?? null}, ${r.careers_url ?? null}, ${r.reel_url ?? null},
              ${r.summary ?? null}, ${r.tagline ?? null},
              ${sql.raw(`'${arr(r.specialties)}'`)}::text[],
              ${sql.raw(`'${arr(r.founders)}'`)}::text[],
              ${refsJson}::jsonb, 'curated', now()${extraVal})
      ON CONFLICT (slug) DO UPDATE SET
        name = EXCLUDED.name,
        country = EXCLUDED.country,
        city = EXCLUDED.city,
        headquarters = EXCLUDED.headquarters,
        founded_year = EXCLUDED.founded_year,
        parent_company = EXCLUDED.parent_company,
        employee_count = EXCLUDED.employee_count,
        website = EXCLUDED.website,
        careers_url = EXCLUDED.careers_url,
        reel_url = EXCLUDED.reel_url,
        summary = EXCLUDED.summary,
        tagline = EXCLUDED.tagline,
        specialties = EXCLUDED.specialties,
        founders = EXCLUDED.founders,
        "references" = EXCLUDED."references",
        data_tier = EXCLUDED.data_tier,
        last_curated_review = now(),
        updated_at = now()${extraUpd}
    `);
  }
  console.log(`[phase2] seeded ${rows.length} into ${table}`);
}

async function seed() {
  await upsert('costume_construction_houses', COSTUME);
  await upsert('music_supervision_agencies', SUPERVISION);
  await upsert('adr_studios', ADR);
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
