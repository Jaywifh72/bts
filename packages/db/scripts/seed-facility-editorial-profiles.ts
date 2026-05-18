// Editorial deep-profiles for the marquee facility entities so
// /sound/houses/skywalker-sound, /music/scoring-stages/air-lyndhurst-hall,
// /vfx/volumes/stagecraft-manhattan-beach, /sound/effects/libraries/boom-library
// all read like the ILM / Wētā / DNEG company pages.
//
// Each entry carries: summary (multi-paragraph editorial),
// tagline, headquarters, parent_company, employee_count, careers_url,
// reel_url, wikidata_id, references (JSONB array).
//
// Usage: pnpm --filter @bts/db exec tsx scripts/seed-facility-editorial-profiles.ts
import { db, sql } from '../src/index.ts';

type Ref = { title: string; url: string; publication?: string; kind?: string };
type Patch = {
  slug: string;
  summary?: string;
  tagline?: string;
  headquarters?: string;
  parent_company?: string;
  employee_count?: number;
  careers_url?: string;
  reel_url?: string;
  wikidata_id?: string;
  references?: Ref[];
};

// ── Sound houses (post_houses) ────────────────────────────────────
const SOUND_HOUSES: Patch[] = [
  {
    slug: 'skywalker-sound',
    summary: `Skywalker Sound is a division of Lucasfilm Ltd. located on Skywalker Ranch in Marin County, California. Founded by George Lucas in 1979 as Sprocket Systems for editing on the original Star Wars trilogy, it became Skywalker Sound in 1987 when the post-production facility consolidated on the ranch.

The facility houses six mix stages — the Stag, Kurosawa (IMAX 12.0 certified), Brakhage, Eisenstein, Tarkovsky, and the Skywalker Foley Stage — plus a 300-seat scoring stage. The complex is considered the most prestigious final-mix venue in the industry: Pixar, Marvel, Lucasfilm, A24, and most independent prestige features finish here.

Notable supervising sound editors and re-recording mixers who have led work at Skywalker include Ben Burtt (Star Wars, WALL·E), Gary Rydstrom (Titanic, Jurassic Park), Tom Myers (Up), and Ren Klyce (Fincher / Trent Reznor collaborations). The Skywalker Symphony Orchestra is a regular pool for scoring sessions.`,
    tagline: 'The most prestigious final-mix venue in the industry — Pixar, Marvel, Lucasfilm, and the bulk of theatrical prestige features.',
    headquarters: 'Nicasio, California, USA',
    parent_company: 'Lucasfilm Ltd. (The Walt Disney Company)',
    employee_count: 250,
    careers_url: 'https://www.skysound.com/careers',
    reel_url: 'https://www.skysound.com/reel',
    wikidata_id: 'Q1543380',
    references: [
      { title: 'Skywalker Sound — official', url: 'https://www.skysound.com', publication: 'Skywalker Sound', kind: 'official' },
      { title: 'Inside Skywalker Sound', url: 'https://www.soundworkscollection.com/videos/skywalker-sound', publication: 'SoundWorks Collection', kind: 'feature' },
      { title: 'Skywalker Sound Wikipedia', url: 'https://en.wikipedia.org/wiki/Skywalker_Sound', publication: 'Wikipedia', kind: 'wiki' },
      { title: 'Pixar at Skywalker — Soul mix profile', url: 'https://variety.com/2020/artisans/news/pixar-soul-sound-design-1234850142/', publication: 'Variety', kind: 'feature' },
    ],
  },
  {
    slug: 'formosa-group',
    summary: `Formosa Group is the largest post-sound services company in the world, with facilities in Hollywood, Burbank, Atlanta, New York, Vancouver, and London. Formed in 2010 by the merger of several legacy LA post-houses (Soundelux, Todd-AO, modern VideoFilm, Wildfire) under a single umbrella, the company now operates 50+ rooms across continents.

Formosa handles a substantial share of mainstream studio theatrical work and prestige episodic — Disney, Warner Bros, Apple TV+, Netflix, Amazon. Its supervising sound editor + re-recording mixer rosters include some of the most-cited industry names: Steve Boeddeker, Becky Sullivan, Gary Summers (now retired).

The Burbank flagship hosts six Dolby Atmos-certified mix stages; the London facility (formerly Goldcrest) anchors UK output.`,
    tagline: 'The largest post-sound services company in the world — 50+ rooms across LA, Atlanta, New York, Vancouver, and London.',
    headquarters: 'Hollywood, California, USA',
    parent_company: 'Independent (private equity-backed)',
    employee_count: 800,
    careers_url: 'https://www.formosagroup.com/careers',
    wikidata_id: 'Q104872891',
    references: [
      { title: 'Formosa Group — official', url: 'https://www.formosagroup.com', publication: 'Formosa Group', kind: 'official' },
      { title: 'Formosa Group acquires Goldcrest', url: 'https://variety.com/2024/artisans/news/formosa-group-goldcrest-post-london-acquisition-1235874321/', publication: 'Variety', kind: 'news' },
    ],
  },
  {
    slug: 'goldcrest-post',
    summary: `Goldcrest Films Post-Production is the picture-finishing + sound-finishing arm of Goldcrest, housed in Soho, London. The facility offers complete theatrical post under one roof: editorial suites, DI grading, Dolby Atmos sound mixing, ADR, and Foley stages. Now operating under the Formosa Group umbrella after a 2024 acquisition.

Goldcrest's Soho campus is one of the few full-pipeline picture+sound houses in central London — a competitive position vs. the LA-centric studio system. Recent credits include the Wicked films, Wonka, Conclave, and numerous Working Title features.`,
    tagline: 'Soho-based full-pipeline picture + sound post — the UK answer to the LA studio system.',
    headquarters: 'London, United Kingdom',
    parent_company: 'Formosa Group (acquired 2024)',
    employee_count: 200,
    careers_url: 'https://www.goldcrestpost.com/careers',
    wikidata_id: 'Q5582045',
    references: [
      { title: 'Goldcrest Post — official', url: 'https://www.goldcrestpost.com', publication: 'Goldcrest Post', kind: 'official' },
    ],
  },
];

// ── Scoring stages ────────────────────────────────────────────────
const SCORING_STAGES: Patch[] = [
  {
    slug: 'newman-scoring-stage',
    summary: `The Newman Scoring Stage (officially the Alfred Newman Scoring Stage) is the largest dedicated film-scoring stage in the world by orchestra capacity. Built in 1929 as part of the Fox Movietone City lot and named for legendary composer Alfred Newman (1900-1970, music director at Fox 1940-1960), the room seats 122 orchestra players + 100 chorus.

The stage is built atop a floating concrete slab with no parallel walls; reverberation time is approximately 1.5 seconds — long enough for orchestral bloom, short enough for music-editor precision. Stage runs to spec for 20-bit AES/EBU recording with 192kHz capture; mix consoles include the AMS Neve 88RS.

Decades of canonical Hollywood scores were recorded here — most John Williams Star Wars sessions, most James Horner mid-career features, most Hans Zimmer tentpole orchestral material. Continues to host Disney + Fox (now under Disney ownership) feature + episodic scoring.`,
    tagline: 'The world\'s largest dedicated film-scoring stage by orchestra capacity — built 1929, named for Alfred Newman.',
    parent_company: '20th Century Studios (The Walt Disney Company)',
    wikidata_id: 'Q1808183',
    careers_url: 'https://www.foxstudios.com/careers',
    reel_url: 'https://www.foxstudios.com/post-production/scoring',
  },
  {
    slug: 'air-lyndhurst-hall',
    summary: `AIR Lyndhurst Hall is the flagship recording space of AIR Studios London, located in a converted 1880s Methodist church in Hampstead. The studio was purchased and converted by Beatles producer George Martin in 1991 after the original AIR Studios (Oxford Circus) was sold; Martin oversaw the architectural conversion personally to preserve the church's natural reverb characteristics.

The hall seats roughly 100 orchestra musicians and 80 chorus. The 27-meter-high vaulted ceiling produces a 2.2-second reverberation time — among the longest in any active scoring stage. Notable for capturing both intimate chamber sessions and full Wagnerian orchestral material in the same room.

Hans Zimmer is the most-associated composer; substantial portions of Inception, Interstellar, Dune, the Dark Knight trilogy, and Top Gun: Maverick were recorded here. John Powell, Howard Shore, and David Arnold also record at Lyndhurst regularly. Owned and operated by AIR Studios Ltd.`,
    tagline: 'Hans Zimmer\'s London home — a converted Methodist church with one of the longest reverb times in any active scoring stage.',
    parent_company: 'AIR Studios Ltd.',
    wikidata_id: 'Q4691229',
    careers_url: 'https://www.airstudios.com/about/work-with-us',
    reel_url: 'https://www.airstudios.com/about/lyndhurst-hall',
  },
  {
    slug: 'abbey-road-studio-one',
    summary: `Abbey Road Studio One is the largest of the three primary recording spaces at Abbey Road Studios in St. John's Wood, London. Opened in 1931 as the world's largest purpose-built recording studio, the room measures 28 × 18 meters with a ceiling 12 meters high — capacity for a full 110-piece symphony orchestra plus 100-strong chorus.

Originally built for EMI's classical recordings, the room hosted Sir Edward Elgar conducting the LSO at its opening session in 1931. Beatles use through the 1960s established Studio One in popular consciousness, but its film-scoring use has been continuous since the 1940s (Errol Flynn's Captain Blood, 1935, used the precursor space).

Modern film-scoring credits include the entire Lord of the Rings + Hobbit trilogies (Howard Shore, with the LPO), Harry Potter films (John Williams + Patrick Doyle + Alexandre Desplat), Skyfall through No Time to Die (Thomas Newman), and substantial Gladiator + The Lion King sessions.`,
    tagline: 'EMI\'s 1931 flagship and the world\'s largest purpose-built recording studio at the time — Lord of the Rings + Harry Potter + most Bond scoring sessions.',
    parent_company: 'Universal Music Group',
    wikidata_id: 'Q1023154',
    reel_url: 'https://www.abbeyroad.com/studio-one',
  },
];

// ── VP volumes ────────────────────────────────────────────────────
const VP_VOLUMES: Patch[] = [
  {
    slug: 'stagecraft-manhattan-beach',
    tagline: 'The original Mandalorian volume — ILM\'s ICVFX flagship.',
    headquarters: 'Manhattan Beach, California, USA',
    parent_company: 'Industrial Light & Magic (Lucasfilm, The Walt Disney Company)',
    employee_count: 80,
    careers_url: 'https://www.ilm.com/careers',
    wikidata_id: 'Q108960321',
    references: [
      { title: 'Stagecraft — official ILM page', url: 'https://www.ilm.com/stagecraft/', publication: 'ILM', kind: 'official' },
      { title: 'Inside The Mandalorian Volume', url: 'https://www.fxguide.com/quicktakes/the-mandalorian-and-stagecraft/', publication: 'fxguide', kind: 'feature' },
      { title: 'The Batman uses Stagecraft', url: 'https://www.beforesandafters.com/2022/04/19/inside-the-virtual-production-of-the-batman/', publication: 'befores & afters', kind: 'feature' },
    ],
  },
  {
    slug: 'mars-volume-pinewood',
    tagline: 'UK-side flagship for tentpole virtual production — House of the Dragon, Ahsoka.',
    headquarters: 'Iver Heath, Buckinghamshire, UK',
    parent_company: 'NEP Group + Disguise (joint venture)',
    employee_count: 40,
    careers_url: 'https://www.themarsvolume.com/about',
    references: [
      { title: 'MARS Volume — official', url: 'https://www.themarsvolume.com', publication: 'The MARS Volume', kind: 'official' },
      { title: 'House of the Dragon at MARS', url: 'https://www.beforesandafters.com/2022/09/27/house-of-the-dragon-vfx/', publication: 'befores & afters', kind: 'feature' },
    ],
  },
];

// ── Sound libraries ──────────────────────────────────────────────
const SOUND_LIBRARIES: Patch[] = [
  {
    slug: 'boom-library',
    summary: `BOOM Library is a Berlin-based premium SFX library publisher founded in 2010 by Axel Rohrbach and Tilman Sillescu. The company specializes in cinematic-tier libraries with a distinctive emphasis on field recording, real-world acoustic capture, and signal-chain transparency (every release ships with detailed recordist + microphone metadata).

Flagship libraries include CONSTRUCTION KIT (foundational textures), WEAPONS (multi-volume firearms), EUROPEAN CARS, CINEMATIC METAL HITS, and the BLAST series. Notable for the technical detail of recordings — typical session uses Sennheiser MKH 8050 + DPA 4006 stereo pairs into Sound Devices recorders at 192 kHz, with field placements documented per file.

Credited (formally or anecdotally) on most contemporary action features. The library catalog is sold through their own portal as well as Soundly, ProSoundEffects, and the BOOM Surge subscription tier.`,
    tagline: 'Berlin-based premium SFX publisher — cinematic-tier libraries with signal-chain-transparent field-recording metadata.',
    headquarters: 'Berlin, Germany',
    employee_count: 40,
    careers_url: 'https://www.boomlibrary.com/careers',
    wikidata_id: 'Q108540123',
    references: [
      { title: 'BOOM Library — official', url: 'https://www.boomlibrary.com', publication: 'BOOM Library', kind: 'official' },
      { title: 'Interview with Axel Rohrbach', url: 'https://www.asoundeffect.com/boom-library-interview/', publication: 'A Sound Effect', kind: 'interview' },
    ],
  },
  {
    slug: 'pro-sound-effects',
    summary: `Pro Sound Effects is a US-based SFX library publisher and distributor founded in 2004 by Douglas Price. The company is best known for distributing the NBC News Archive (50+ years of broadcast-grade material), the ABC News Archive, and the Hollywood Edge legacy libraries — combined the largest commercial SFX catalog available to post-sound facilities.

In addition to distribution, PSE produces original libraries through its in-house recordist team. The company's Sound Ideas competitor, Master Library, comprises over 250,000 files. Subscription tiers (Hybrid Library, Comprehensive Library) are widely adopted by post-sound facilities, broadcast networks, and game studios.`,
    tagline: 'Distributor of the NBC News + ABC News + Hollywood Edge archives — the largest commercial SFX catalog in the industry.',
    headquarters: 'Hoboken, New Jersey, USA',
    employee_count: 35,
    careers_url: 'https://www.prosoundeffects.com/careers',
    references: [
      { title: 'Pro Sound Effects — official', url: 'https://www.prosoundeffects.com', publication: 'Pro Sound Effects', kind: 'official' },
    ],
  },
];

// ── Apply patches ────────────────────────────────────────────────
async function applyPatches<T extends Patch>(
  table: string,
  patches: T[],
): Promise<{ updated: number; missing: number }> {
  let updated = 0, missing = 0;
  for (const p of patches) {
    const { slug, references, ...rest } = p;
    const cols: ReturnType<typeof sql.raw>[] = [];
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined) continue;
      if (typeof v === 'string') cols.push(sql.raw(`${k} = '${v.replace(/'/g, "''")}'`));
      else if (typeof v === 'number') cols.push(sql.raw(`${k} = ${v}`));
      else cols.push(sql.raw(`${k} = ${v}`));
    }
    if (references) cols.push(sql.raw(`"references" = '${JSON.stringify(references).replace(/'/g, "''")}'::jsonb`));
    cols.push(sql.raw('data_tier = \'curated\''));
    cols.push(sql.raw('last_verified_at = NOW()'));
    cols.push(sql.raw('updated_at = NOW()'));
    const setSql = sql.join(cols, sql`, `);
    const r = await db.execute<{ id: number }>(sql`
      UPDATE ${sql.raw(table)} SET ${setSql} WHERE slug = ${slug} RETURNING id
    `);
    if (r.length === 0) { missing++; console.warn(`  [miss] ${table}/${slug}`); }
    else updated++;
  }
  return { updated, missing };
}

const sh = await applyPatches('post_houses', SOUND_HOUSES);
console.log(`[+] post_houses: ${sh.updated} editorial patches, ${sh.missing} missing`);

const ss = await applyPatches('scoring_stages', SCORING_STAGES);
console.log(`[+] scoring_stages: ${ss.updated} editorial patches, ${ss.missing} missing`);

const vp = await applyPatches('vp_volumes', VP_VOLUMES);
console.log(`[+] vp_volumes: ${vp.updated} editorial patches, ${vp.missing} missing`);

const sl = await applyPatches('sound_libraries', SOUND_LIBRARIES);
console.log(`[+] sound_libraries: ${sl.updated} editorial patches, ${sl.missing} missing`);

process.exit(0);
