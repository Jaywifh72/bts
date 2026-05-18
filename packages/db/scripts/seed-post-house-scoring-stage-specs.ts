// Format-cert + day-rate seed for the canonical sound houses and
// scoring stages working pros book against.
//
// Sources: Dolby's certified-facility list (dolby.com/professional/
// certified-facilities), IMAX HQ partner roster, manufacturer day-rate
// estimates from Pinewood/Sony/Newman rate cards (public + tribal).
import { db, sql } from '../src/index.ts';

type SoundHousePatch = {
  slug: string;
  atmos_certified?: boolean;
  dolby_premier_certified?: boolean;
  imax_certified?: boolean;
  mix_room_count?: number;
  hdr_grading?: boolean;
  spec_notes?: string;
};

const SOUND_HOUSES: SoundHousePatch[] = [
  {
    slug: 'skywalker-sound',
    atmos_certified: true, dolby_premier_certified: true, imax_certified: true,
    mix_room_count: 6,
    spec_notes: 'Tech HQ at Skywalker Ranch. Multiple Atmos + Premier rooms, IMAX 12.0 cert on Kurosawa stage. Industry-standard for tentpole final mix.',
  },
  {
    slug: 'formosa-group',
    atmos_certified: true, dolby_premier_certified: true,
    mix_room_count: 12,
    spec_notes: 'LA + UK locations. Acquired several heritage rooms (Todd-AO, Soundelux). Dominant in TV episodic + many studio features.',
  },
  {
    slug: 'goldcrest-post',
    atmos_certified: true, dolby_premier_certified: true,
    mix_room_count: 4, hdr_grading: true,
    spec_notes: 'UK flagship — picture + sound under one roof. London Soho. Atmos certified for theatrical + Atmos-music mixing.',
  },
  {
    slug: 'warner-bros-post',
    atmos_certified: true, dolby_premier_certified: true, imax_certified: true,
    mix_room_count: 8,
    spec_notes: 'Lot-based, Burbank. Eastwood stage scoring + multiple Atmos final mix rooms. IMAX cert on Theater 1.',
  },
  {
    slug: 'e2-sound',
    atmos_certified: true,
    mix_room_count: 2,
    spec_notes: 'E² Sound — Erik Aadahl + Ethan Van der Ryn (Edge of Tomorrow, Dune, A Quiet Place). Boutique design house.',
  },
];

let updatedSh = 0; let missingSh = 0;
for (const p of SOUND_HOUSES) {
  const { slug, ...patch } = p;
  const set = Object.entries(patch)
    .map(([k, v]) => sql.raw(`${k} = ${typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v}`));
  if (set.length === 0) continue;
  const setSql = sql.join(set, sql`, `);
  const r = await db.execute<{ id: number }>(sql`
    UPDATE post_houses SET ${setSql}, updated_at = NOW()
    WHERE slug = ${slug}
    RETURNING id
  `);
  if (r.length === 0) { missingSh++; console.warn(`  [miss] ${slug}`); }
  else updatedSh++;
}
console.log(`post_houses spec patches: ${updatedSh} updated, ${missingSh} missing`);

// ── Scoring stages day rates + format ──────────────────────────────
type StagePatch = {
  slug: string;
  day_rate_usd_min?: number;
  day_rate_usd_max?: number;
  atmos_capable?: boolean;
  year_opened?: number;
  console?: string;
  primary_mic_chain?: string;
};

const STAGES: StagePatch[] = [
  {
    slug: 'newman-scoring-stage',
    day_rate_usd_min: 12000, day_rate_usd_max: 18000,
    atmos_capable: true, year_opened: 1930,
    console: 'AMS Neve 88RS',
    primary_mic_chain: 'Decca Tree (Neumann M50) + section spots',
  },
  {
    slug: 'eastwood-scoring-stage',
    day_rate_usd_min: 10000, day_rate_usd_max: 15000,
    atmos_capable: true, year_opened: 1935,
    console: 'AMS Neve 88RS / Genesys Black',
    primary_mic_chain: 'Decca Tree + spot mics + LR ambient',
  },
  {
    slug: 'sony-scoring-stage',
    day_rate_usd_min: 11000, day_rate_usd_max: 16000,
    atmos_capable: true, year_opened: 1930,
    console: 'AMS Neve 88RS',
    primary_mic_chain: 'Decca Tree (Schoeps + Neumann M50) + spots',
  },
  {
    slug: 'abbey-road-studio-one',
    day_rate_usd_min: 9000, day_rate_usd_max: 14000,
    atmos_capable: true, year_opened: 1931,
    console: 'Neve 88RS',
    primary_mic_chain: 'Decca Tree (Neumann M50) + spots + ambient pair (Earthworks)',
  },
  {
    slug: 'air-lyndhurst-hall',
    day_rate_usd_min: 9000, day_rate_usd_max: 13000,
    atmos_capable: true, year_opened: 1991,
    console: 'AMS Neve 88RS',
    primary_mic_chain: 'Decca Tree + spots + ambient pair',
  },
  {
    slug: 'synchron-stage-vienna',
    day_rate_usd_min: 8000, day_rate_usd_max: 12000,
    atmos_capable: true, year_opened: 2014,
    console: 'Stagetec Aurus / Neve 88RS',
    primary_mic_chain: 'Decca Tree (Schoeps) + ambient height + ambient surround (Atmos-native capture)',
  },
  {
    slug: 'skywalker-scoring-stage',
    day_rate_usd_min: 9500, day_rate_usd_max: 14000,
    atmos_capable: true, year_opened: 1987,
    console: 'Neve 88R',
    primary_mic_chain: 'Decca Tree + spots',
  },
  {
    slug: 'galaxy-studios-jupiter',
    day_rate_usd_min: 6000, day_rate_usd_max: 9000,
    atmos_capable: true, year_opened: 1989,
    console: 'AMS Neve Genesys',
    primary_mic_chain: 'Decca Tree + ambient pair (immersive-natively configured)',
  },
];

let updatedSt = 0; let missingSt = 0;
for (const p of STAGES) {
  const { slug, ...patch } = p;
  const set = Object.entries(patch)
    .map(([k, v]) => sql.raw(`${k} = ${typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v}`));
  if (set.length === 0) continue;
  const setSql = sql.join(set, sql`, `);
  const r = await db.execute<{ id: number }>(sql`
    UPDATE scoring_stages SET ${setSql}, updated_at = NOW()
    WHERE slug = ${slug}
    RETURNING id
  `);
  if (r.length === 0) { missingSt++; console.warn(`  [miss] ${slug}`); }
  else updatedSt++;
}
console.log(`scoring_stages spec patches: ${updatedSt} updated, ${missingSt} missing`);

process.exit(0);
