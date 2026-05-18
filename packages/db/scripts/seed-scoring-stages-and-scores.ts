// Seed for the 0073/0074 score_works + music_cues tables.
//
// Two passes:
//   1. Seed the canonical scoring stages (Newman, Eastwood, Sony, AIR,
//      Abbey Road, Synchron, Skywalker, Galaxy). Idempotent on slug.
//   2. Seed score_works + a handful of flagship music_cues for the
//      curated films we already have deep-dive seeds for. Each insert
//      uses INSERT ... SELECT FROM productions/people WHERE slug = ...
//      so missing rows quietly no-op instead of erroring — that way
//      this script can run before all the underlying composer rows
//      exist, and we just re-run it later when they do.
//
// Idempotent: every insert uses ON CONFLICT DO NOTHING / DO UPDATE so
// re-running refreshes editorial fields without duplicating rows.
//
// Usage: pnpm --filter @bts/db tsx scripts/seed-scoring-stages-and-scores.ts
import { db, sql } from '../src/index.ts';

// ─────────────────────────────────────────────────────────────────
// 1. Scoring stages
// ─────────────────────────────────────────────────────────────────

type StageSeed = {
  slug: string;
  name: string;
  facility_name: string | null;
  city: string;
  country: string;
  capacity_orchestra: number | null;
  capacity_chorus: number | null;
  website: string | null;
  notes: string;
};

const STAGES: StageSeed[] = [
  {
    slug: 'newman-scoring-stage',
    name: 'Newman Scoring Stage',
    facility_name: '20th Century Studios (Fox Lot)',
    city: 'Los Angeles', country: 'US',
    capacity_orchestra: 122, capacity_chorus: 100,
    website: 'https://www.foxstudios.com/post-production/scoring',
    notes: 'Largest dedicated scoring stage in the world by orchestra capacity. Built 1929; rebuilt in the 1990s. Industry-standard for large-ensemble feature scores.',
  },
  {
    slug: 'eastwood-scoring-stage',
    name: 'Eastwood Scoring Stage',
    facility_name: 'Warner Bros. Studios',
    city: 'Burbank', country: 'US',
    capacity_orchestra: 100, capacity_chorus: 80,
    website: 'https://www.warnerbros.com/studio-tour/post-production-services',
    notes: 'Named for Clint Eastwood in 2000. Continuously used since the 1930s. Hosts a Studio Symphony Orchestra and many tentpole scores.',
  },
  {
    slug: 'sony-scoring-stage',
    name: 'Sony Pictures Scoring Stage',
    facility_name: 'Sony Pictures Studios',
    city: 'Culver City', country: 'US',
    capacity_orchestra: 110, capacity_chorus: 80,
    website: 'https://www.sonypicturespost.com',
    notes: 'Formerly the MGM Scoring Stage (1929). Rebuilt and renamed under Sony in 1990. Wide-bay layout favored for action scores.',
  },
  {
    slug: 'abbey-road-studio-one',
    name: 'Abbey Road Studio One',
    facility_name: 'Abbey Road Studios',
    city: 'London', country: 'GB',
    capacity_orchestra: 110, capacity_chorus: 100,
    website: 'https://www.abbeyroad.com/studio-one',
    notes: 'EMI-era studio opened 1931. The largest purpose-built recording studio in the world at the time. Standard for British scoring sessions; LSO regular.',
  },
  {
    slug: 'air-lyndhurst-hall',
    name: 'AIR Lyndhurst Hall',
    facility_name: 'AIR Studios',
    city: 'London', country: 'GB',
    capacity_orchestra: 100, capacity_chorus: 80,
    website: 'https://www.airstudios.com/about/lyndhurst-hall',
    notes: 'Converted Methodist church in Hampstead. Acquired by George Martin in 1991. Preferred London room for Hans Zimmer, John Powell, and many contemporary feature scores.',
  },
  {
    slug: 'synchron-stage-vienna',
    name: 'Synchron Stage Vienna',
    facility_name: 'Synchron Stage',
    city: 'Vienna', country: 'AT',
    capacity_orchestra: 130, capacity_chorus: 60,
    website: 'https://www.synchronstage.com',
    notes: 'Former Rosenhügel Filmstudios scoring stage, reopened 2014 by Vienna Symphonic Library. Home to the Synchron Stage Orchestra.',
  },
  {
    slug: 'skywalker-scoring-stage',
    name: 'Skywalker Scoring Stage',
    facility_name: 'Skywalker Sound',
    city: 'Nicasio', country: 'US',
    capacity_orchestra: 130, capacity_chorus: 80,
    website: 'https://www.skysound.com/services/scoring',
    notes: 'Opened 1987 on the Skywalker Ranch. Hosts Skywalker Symphony Orchestra. Notable for game scoring and indie features alongside Lucasfilm productions.',
  },
  {
    slug: 'galaxy-studios-jupiter',
    name: 'Jupiter Hall',
    facility_name: 'Galaxy Studios',
    city: 'Mol', country: 'BE',
    capacity_orchestra: 80, capacity_chorus: 60,
    website: 'https://www.galaxystudios.com',
    notes: 'Floating-room construction (room-in-room isolation). Early Dolby Atmos reference facility. Used for European-recorded scores.',
  },
];

for (const s of STAGES) {
  await db.execute(sql`
    INSERT INTO scoring_stages (
      slug, name, facility_name, country, city,
      capacity_orchestra, capacity_chorus, website, notes,
      data_tier, last_verified_at
    ) VALUES (
      ${s.slug}, ${s.name}, ${s.facility_name}, ${s.country}, ${s.city},
      ${s.capacity_orchestra}, ${s.capacity_chorus}, ${s.website}, ${s.notes},
      'curated', NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      facility_name = EXCLUDED.facility_name,
      country = EXCLUDED.country,
      city = EXCLUDED.city,
      capacity_orchestra = EXCLUDED.capacity_orchestra,
      capacity_chorus = EXCLUDED.capacity_chorus,
      website = EXCLUDED.website,
      notes = EXCLUDED.notes,
      data_tier = 'curated',
      last_verified_at = NOW(),
      updated_at = NOW()
  `);
}
console.log(`[+] scoring_stages: ${STAGES.length} rows upserted`);

// ─────────────────────────────────────────────────────────────────
// 2. score_works (per-(production, composer)) + production_scoring_stages
// ─────────────────────────────────────────────────────────────────
//
// Each entry references composers by slug. If the composer isn't in
// `people` yet, the INSERT silently selects zero rows and the work
// is skipped — re-run once the composer lands.

type ScoreSeed = {
  production_slug: string;
  composer_slug: string;
  scoring_stage_slug: string | null;
  recording_orchestra: string | null;
  recording_location: string | null;
  themes_summary: string | null;
  summary: string;
  cue_count_estimate: number | null;
  release_label: string | null;
};

const SCORES: ScoreSeed[] = [
  {
    production_slug: 'blade-runner-2049-2017',
    composer_slug: 'hans-zimmer',
    scoring_stage_slug: 'air-lyndhurst-hall',
    recording_orchestra: 'AIR Lyndhurst session musicians',
    recording_location: 'AIR Lyndhurst Hall, London',
    themes_summary: 'Built around CS-80-style analog synth pads and immense low-end sub-bass drones — referencing Vangelis\'s 1982 original without quoting it. Co-composed with Benjamin Wallfisch after Jóhann Jóhannsson exited the production.',
    summary: 'Score replaced late in post — Jóhannsson\'s original recordings were scrapped after a creative pivot. Zimmer + Wallfisch produced the released score in roughly eight weeks.',
    cue_count_estimate: 24,
    release_label: 'Epic Records / Alcon Sleeping Giant',
  },
  {
    production_slug: 'blade-runner-2049-2017',
    composer_slug: 'benjamin-wallfisch',
    scoring_stage_slug: 'air-lyndhurst-hall',
    recording_orchestra: 'AIR Lyndhurst session musicians',
    recording_location: 'AIR Lyndhurst Hall, London',
    themes_summary: null,
    summary: 'Co-composer credit with Hans Zimmer; previously composed Hidden Figures (2016) and IT (2017).',
    cue_count_estimate: 24,
    release_label: 'Epic Records / Alcon Sleeping Giant',
  },
  {
    production_slug: 'gravity-2013',
    composer_slug: 'steven-price',
    scoring_stage_slug: 'abbey-road-studio-one',
    recording_orchestra: 'London Voices + session orchestra',
    recording_location: 'Abbey Road Studio One, London',
    themes_summary: 'Choral and orchestral palette designed to substitute for the absence of diegetic sound in vacuum. Long cresendos timed to picture; spatial mix designed for surround playback.',
    summary: 'Won Academy Award for Best Original Score (2014). Notable for using music as the primary sonic content in space scenes where dialogue and effects are intentionally absent.',
    cue_count_estimate: 18,
    release_label: 'WaterTower Music',
  },
  {
    production_slug: 'no-country-for-old-men-2007',
    composer_slug: 'carter-burwell',
    scoring_stage_slug: null,
    recording_orchestra: null,
    recording_location: 'Limited score; mostly sparse cues and ambience',
    themes_summary: 'Almost entirely score-free as a directorial choice. Burwell credited but cues are minimal — the few that exist are textural, sub-audible, and avoid melody.',
    summary: 'A rare contemporary feature with almost no score at all. The few music cues are deliberately atonal and texture-led. Coen / Burwell collaboration since Blood Simple (1984).',
    cue_count_estimate: 6,
    release_label: 'Lakeshore Records',
  },
  {
    production_slug: 'the-revenant-2015',
    composer_slug: 'ryuichi-sakamoto',
    scoring_stage_slug: null,
    recording_orchestra: null,
    recording_location: 'Composed remotely while Sakamoto was undergoing cancer treatment',
    themes_summary: 'String-led with electronic textures. Co-composed with Alva Noto (Carsten Nicolai) and Bryce Dessner. Three composers worked semi-independently; final cuts assembled by the director and music editor.',
    summary: 'Sakamoto returned to film scoring for this after a years-long hiatus during cancer treatment. The three-composer approach was unusual; controversial Globe nomination exclusion (deemed ineligible) drew industry attention.',
    cue_count_estimate: 23,
    release_label: 'Milan Records',
  },
  {
    production_slug: 'parasite-2019',
    composer_slug: 'jung-jae-il',
    scoring_stage_slug: null,
    recording_orchestra: 'Bucheon Philharmonic Orchestra',
    recording_location: 'South Korea',
    themes_summary: 'Baroque chamber-orchestra textures (\'The Belt of Faith\' uses harpsichord and strings) deliberately at odds with the contemporary setting. Period-music feel underscores the class-tension through-line.',
    summary: 'Long-time Bong Joon Ho collaborator. Score notable for its Baroque feel against contemporary picture; \'The Belt of Faith\' became a viral cue post-release.',
    cue_count_estimate: 15,
    release_label: 'Sacem / Barunson',
  },
  {
    production_slug: 'the-brutalist-2024',
    composer_slug: 'daniel-blumberg',
    scoring_stage_slug: null,
    recording_orchestra: 'Various session players (UK + Hungary)',
    recording_location: 'Multiple studios; some Hungarian sessions tied to production location',
    themes_summary: 'Brass-forward, minimalist palette aligned with the brutalist-architecture subject. Pre-existing chamber and orchestral works repurposed for picture in addition to original cues.',
    summary: 'Won Academy Award for Best Original Score (2025). Blumberg\'s first feature score; previously known as singer-songwriter (Yuck, Hebronix).',
    cue_count_estimate: 19,
    release_label: 'Milan Records',
  },
  {
    production_slug: 'top-gun-maverick-2022',
    composer_slug: 'hans-zimmer',
    scoring_stage_slug: 'air-lyndhurst-hall',
    recording_orchestra: 'AIR Lyndhurst session musicians',
    recording_location: 'AIR Lyndhurst Hall, London',
    themes_summary: 'Anchored by Harold Faltermeyer\'s 1986 themes — \'Top Gun Anthem\' and the synth motif — re-orchestrated for full ensemble and re-recorded. New cues by Zimmer + Lorne Balfe with Lady Gaga\'s \'Hold My Hand\' as the lead song.',
    summary: 'Score credits shared with Harold Faltermeyer (original themes), Lorne Balfe, and Lady Gaga. Re-recording of the original Top Gun themes was a deliberate franchise-continuity choice.',
    cue_count_estimate: 22,
    release_label: 'Interscope Records',
  },

  // ── Phase 2 — widely-cited contemporary scores ───────────────────────
  // The INSERT below uses SELECT FROM productions/people WHERE slug = ...
  // so entries here will silently no-op when the underlying film/composer
  // hasn't been ingested yet. Re-runs pick them up automatically when they land.

  // Hans Zimmer canon
  {
    production_slug: 'dune-part-two-2024',
    composer_slug: 'hans-zimmer',
    scoring_stage_slug: 'synchron-stage-vienna',
    recording_orchestra: 'Vienna Synchron Stage Orchestra + soloists',
    recording_location: 'Synchron Stage Vienna + AIR Lyndhurst',
    themes_summary: 'Expansion of the Dune (2021) palette — duduk, throat-singing, processed strings. New themes for Chani, the Bene Gesserit, and the Fremen worm rituals layered atop the existing Atreides material.',
    summary: 'Synthesizer-led with extensive orchestral processing. Zimmer eschewed Wagnerian leitmotif in favor of textural palettes per faction.',
    cue_count_estimate: 22,
    release_label: 'WaterTower Music',
  },
  {
    production_slug: 'dune-2021',
    composer_slug: 'hans-zimmer',
    scoring_stage_slug: 'synchron-stage-vienna',
    recording_orchestra: 'Vienna Synchron Stage Orchestra + soloists',
    recording_location: 'Various; primary sessions at Synchron and London',
    themes_summary: 'Dedicated entirely to Dune — Zimmer turned down Tenet to focus on it. Voiced through synth + processed female vocals + custom-built instruments (gigantic horns, didgeridoo).',
    summary: 'Academy Award winner for Best Original Score (2022). Notable for inventing new instruments rather than using stock orchestra.',
    cue_count_estimate: 22,
    release_label: 'WaterTower Music',
  },
  {
    production_slug: 'interstellar-2014',
    composer_slug: 'hans-zimmer',
    scoring_stage_slug: 'air-lyndhurst-hall',
    recording_orchestra: '4-organ ensemble + chamber strings',
    recording_location: 'Temple Church London (organ) + AIR Lyndhurst (orchestra)',
    themes_summary: 'Built around the Harrison & Harrison organ at Temple Church — director Nolan had Zimmer write a piece blind to brief, then revealed the father-child theme. Cues integrated the organ throughout.',
    summary: 'Process famously inverted: theme written before plot was revealed. \'Mountains\' / \'No Time For Caution\' became reference cues.',
    cue_count_estimate: 23,
    release_label: 'WaterTower Music',
  },
  {
    production_slug: 'inception-2010',
    composer_slug: 'hans-zimmer',
    scoring_stage_slug: 'air-lyndhurst-hall',
    recording_orchestra: 'AIR Lyndhurst session musicians + Johnny Marr (guitar)',
    recording_location: 'AIR Lyndhurst Hall + remote sessions',
    themes_summary: 'Brass-heavy with the famous slowed-down quote of Édith Piaf\'s \'Non, je ne regrette rien\' used as the in-world kick cue.',
    summary: 'Brass blat — the BRAAAM became one of the most-imitated cues of the 2010s. \'Time\' (end credits) is the most-streamed score cue of the decade.',
    cue_count_estimate: 12,
    release_label: 'WaterTower Music',
  },

  // Ludwig Göransson
  {
    production_slug: 'oppenheimer-2023',
    composer_slug: 'ludwig-goransson',
    scoring_stage_slug: 'sony-scoring-stage',
    recording_orchestra: 'Hollywood Studio Symphony + violin soloist Roman Simovic',
    recording_location: 'Sony Scoring Stage + remote violin sessions',
    themes_summary: 'String-led throughout — solo violin foregrounded for Oppenheimer\'s interior. Driving meter changes meant to evoke fission instability.',
    summary: 'Academy Award winner for Best Original Score (2024). Composed and recorded with Nolan\'s usual short-deadline approach.',
    cue_count_estimate: 24,
    release_label: 'Back Lot Music',
  },
  {
    production_slug: 'tenet-2020',
    composer_slug: 'ludwig-goransson',
    scoring_stage_slug: null,
    recording_orchestra: 'Various sessions; pandemic-era remote recording',
    recording_location: 'Multiple; recorded across COVID lockdowns',
    themes_summary: 'Electronic + processed orchestra. Recordings of orchestral material played backward to embed the film\'s inversion concept sonically.',
    summary: 'Hans Zimmer originally attached; passed to focus on Dune. Göransson\'s breakout feature-score credit.',
    cue_count_estimate: 18,
    release_label: 'WaterTower Music',
  },

  // Reznor + Ross
  {
    production_slug: 'the-social-network-2010',
    composer_slug: 'trent-reznor',
    scoring_stage_slug: null,
    recording_orchestra: null,
    recording_location: 'Reznor/Ross home studios',
    themes_summary: 'Electronic, minimal, anxious — \'Hand Covers Bruise\' became the sonic identity. Co-composed with Atticus Ross.',
    summary: 'Academy Award winner for Best Original Score (2011). First feature score collaboration for Reznor/Ross.',
    cue_count_estimate: 19,
    release_label: 'Null Corporation',
  },
  {
    production_slug: 'the-social-network-2010',
    composer_slug: 'atticus-ross',
    scoring_stage_slug: null,
    recording_orchestra: null,
    recording_location: 'Reznor/Ross home studios',
    themes_summary: null,
    summary: 'Co-composer with Trent Reznor. Long-time NIN collaborator.',
    cue_count_estimate: 19,
    release_label: 'Null Corporation',
  },
  {
    production_slug: 'soul-2020',
    composer_slug: 'trent-reznor',
    scoring_stage_slug: null,
    recording_orchestra: null,
    recording_location: 'Reznor/Ross studios + Jon Batiste sessions',
    themes_summary: 'Two-composer split: Reznor/Ross wrote the abstract \'Great Beyond\' material; Jon Batiste wrote the jazz cues for the New York scenes.',
    summary: 'Academy Award winner for Best Original Score (2021). Pixar\'s first jazz-anchored feature.',
    cue_count_estimate: 20,
    release_label: 'Walt Disney Records',
  },

  // Hildur Guðnadóttir
  {
    production_slug: 'joker-2019',
    composer_slug: 'hildur-gudnadottir',
    scoring_stage_slug: 'synchron-stage-vienna',
    recording_orchestra: 'Solo cello + orchestral overlay',
    recording_location: 'Synchron Stage Vienna + Berlin sessions',
    themes_summary: 'Cello-led — Guðnadóttir\'s own instrument. \'Bathroom Dance\' written to picture before the scene was complete; Phoenix improvised dance to it during the take.',
    summary: 'Academy Award winner for Best Original Score (2020). First solo female winner in the category.',
    cue_count_estimate: 18,
    release_label: 'WaterTower Music',
  },
  {
    production_slug: 'tar-2022',
    composer_slug: 'hildur-gudnadottir',
    scoring_stage_slug: null,
    recording_orchestra: 'Mahler\'s Fifth (existing concert recording) + original cues',
    recording_location: 'Various',
    themes_summary: 'Original cues function as connective tissue between Mahler\'s Fifth — the symphony the protagonist conducts. Sparse and tonally restrained.',
    summary: 'Cate Blanchett character performs the Mahler in-film; Guðnadóttir\'s additional cues had to coexist with that recording.',
    cue_count_estimate: 10,
    release_label: 'Deutsche Grammophon',
  },

  // Jóhann Jóhannsson
  {
    production_slug: 'arrival-2016',
    composer_slug: 'johann-johannsson',
    scoring_stage_slug: null,
    recording_orchestra: 'Theatre of Voices choir + chamber orchestra',
    recording_location: 'Multiple sessions Iceland + Copenhagen',
    themes_summary: 'Voice-led — Theatre of Voices choir performs deconstructed, breath-emphasizing vocal textures meant to evoke the aliens\' nonlinear language. Max Richter\'s \'On the Nature of Daylight\' bookends the film (licensed, not composed).',
    summary: 'Among the most-influential scores of the decade. Notably DID NOT use the licensed Max Richter cue that opens and closes the film.',
    cue_count_estimate: 16,
    release_label: 'Deutsche Grammophon',
  },
  {
    production_slug: 'sicario-2015',
    composer_slug: 'johann-johannsson',
    scoring_stage_slug: null,
    recording_orchestra: 'Low-brass ensemble + strings + electronic textures',
    recording_location: 'Various',
    themes_summary: 'Aggressive sub-bass percussion — \'The Beast\' became one of the most-quoted action cues of the 2010s. Ostinato-driven; very low harmonic rhythm.',
    summary: 'Academy Award nominee. Defined the action-score palette for half a decade after.',
    cue_count_estimate: 12,
    release_label: 'Varèse Sarabande',
  },

  // Alexandre Desplat
  {
    production_slug: 'the-shape-of-water-2017',
    composer_slug: 'alexandre-desplat',
    scoring_stage_slug: 'air-lyndhurst-hall',
    recording_orchestra: 'London Symphony Orchestra',
    recording_location: 'AIR Lyndhurst Hall, London',
    themes_summary: 'Accordion-led waltz at the core — Desplat tied to the underwater + period setting. French-Hollywood crossover sensibility throughout.',
    summary: 'Academy Award winner for Best Original Score (2018).',
    cue_count_estimate: 22,
    release_label: 'Decca Records',
  },
  {
    production_slug: 'the-grand-budapest-hotel-2014',
    composer_slug: 'alexandre-desplat',
    scoring_stage_slug: null,
    recording_orchestra: 'Balalaika ensemble + small orchestra',
    recording_location: 'Berlin + Paris sessions',
    themes_summary: 'Balalaika-led with cimbalom textures — Mitteleuropa orchestration for the fictional setting. Theme stated minimally and repeated with varied instrumentation.',
    summary: 'Academy Award winner for Best Original Score (2015).',
    cue_count_estimate: 28,
    release_label: 'ABKCO Records',
  },

  // Mica Levi
  {
    production_slug: 'under-the-skin-2013',
    composer_slug: 'mica-levi',
    scoring_stage_slug: null,
    recording_orchestra: 'Microtonal strings + processed textures',
    recording_location: 'London',
    themes_summary: 'Microtonal — pitches slide between standard tunings, evoking the alien protagonist\'s sensorium. \'Love\' became the breakthrough cue.',
    summary: 'Levi\'s first feature score. Studied composition at Guildhall; toured as Micachu.',
    cue_count_estimate: 12,
    release_label: 'Milan Records',
  },
  {
    production_slug: 'jackie-2016',
    composer_slug: 'mica-levi',
    scoring_stage_slug: null,
    recording_orchestra: 'Small string ensemble',
    recording_location: 'London',
    themes_summary: 'Strings only — microtonal slides between pitches evoke grief\'s ambiguity. Cues sit close to dissonance throughout.',
    summary: 'Academy Award nominee. Cited as one of the most distinctive contemporary score voices.',
    cue_count_estimate: 14,
    release_label: 'Milan Records',
  },

  // Volker Bertelmann (Hauschka)
  {
    production_slug: 'all-quiet-on-the-western-front-2022',
    composer_slug: 'volker-bertelmann',
    scoring_stage_slug: null,
    recording_orchestra: 'Harmonium + prepared piano + strings',
    recording_location: 'Berlin',
    themes_summary: 'Three-note motif (E-D#-E) repeated through the film — Bertelmann\'s minimalist signature. Harmonium and prepared-piano timbres dominate.',
    summary: 'Academy Award winner for Best Original Score (2023).',
    cue_count_estimate: 18,
    release_label: 'Netflix Music',
  },

  // Michael Giacchino
  {
    production_slug: 'the-batman-2022',
    composer_slug: 'michael-giacchino',
    scoring_stage_slug: 'eastwood-scoring-stage',
    recording_orchestra: 'Warner Bros. Studio Symphony Orchestra',
    recording_location: 'Eastwood Scoring Stage, Burbank',
    themes_summary: 'Slow-build orchestral with choral overlay. The Batman / Riddler theme uses identical pitch material — only orchestration differs.',
    summary: 'Giacchino at his most restrained — chose minor ostinati over fanfares as a deliberate Batman-revisionist choice.',
    cue_count_estimate: 26,
    release_label: 'WaterTower Music',
  },

  // Carter Burwell (Coens regular + In Bruges)
  {
    production_slug: 'the-banshees-of-inisherin-2022',
    composer_slug: 'carter-burwell',
    scoring_stage_slug: null,
    recording_orchestra: 'Irish folk ensemble + small string orchestra',
    recording_location: 'Ireland + London sessions',
    themes_summary: 'Lullaby-style theme rooted in Irish folk modes. McDonagh × Burwell collaboration (their third feature).',
    summary: 'Academy Award nominee. Folk-instrument scoring against picaresque comedy.',
    cue_count_estimate: 16,
    release_label: 'Hollywood Records',
  },

  // Newer flagship scores worth indexing
  {
    production_slug: 'killers-of-the-flower-moon-2023',
    composer_slug: 'robbie-robertson',
    scoring_stage_slug: null,
    recording_orchestra: 'Various roots ensembles + electric blues',
    recording_location: 'LA + multiple',
    themes_summary: 'Robertson\'s final score before his death. Blues + Indigenous-music textures meant to ground the period setting without museum-piece formality.',
    summary: 'Posthumous release. Long-time Scorsese collaborator (The Last Waltz, 1978).',
    cue_count_estimate: 24,
    release_label: 'Apple Music / Paramount',
  },
  {
    production_slug: 'past-lives-2023',
    composer_slug: 'christopher-bear',
    scoring_stage_slug: null,
    recording_orchestra: 'Small chamber ensemble + electronic',
    recording_location: 'Various',
    themes_summary: 'Two-composer collaboration with Daniel Rossen (Grizzly Bear). Restrained piano + strings; never quite arrives at full statement.',
    summary: 'Christopher Bear + Daniel Rossen of Grizzly Bear — their first feature score together.',
    cue_count_estimate: 14,
    release_label: 'A24 Music',
  },
  {
    production_slug: 'aftersun-2022',
    composer_slug: 'oliver-coates',
    scoring_stage_slug: null,
    recording_orchestra: 'Cello (Coates) + electronic textures',
    recording_location: 'London',
    themes_summary: 'Cello-led with processed electronic ambience. Sparse — the licensed needle drops (Queen, Aphex Twin) carry as much emotional weight as the score.',
    summary: 'Coates is also a frequent collaborator with Mica Levi and Radiohead.',
    cue_count_estimate: 8,
    release_label: 'A24 Music',
  },
];

for (const sc of SCORES) {
  await db.execute(sql`
    INSERT INTO score_works (
      production_id, composer_person_id, scoring_stage_id,
      recording_orchestra, recording_location,
      themes_summary, summary, cue_count_estimate, release_label,
      data_tier, last_verified_at
    )
    SELECT p.id, c.id, ss.id,
           ${sc.recording_orchestra}, ${sc.recording_location},
           ${sc.themes_summary}, ${sc.summary}, ${sc.cue_count_estimate}, ${sc.release_label},
           'curated', NOW()
    FROM productions p
    CROSS JOIN people c
    LEFT JOIN scoring_stages ss ON ss.slug = ${sc.scoring_stage_slug}
    WHERE p.slug = ${sc.production_slug}
      AND c.slug = ${sc.composer_slug}
    ON CONFLICT (production_id, composer_person_id) DO UPDATE SET
      scoring_stage_id     = EXCLUDED.scoring_stage_id,
      recording_orchestra  = EXCLUDED.recording_orchestra,
      recording_location   = EXCLUDED.recording_location,
      themes_summary       = EXCLUDED.themes_summary,
      summary              = EXCLUDED.summary,
      cue_count_estimate   = EXCLUDED.cue_count_estimate,
      release_label        = EXCLUDED.release_label,
      data_tier            = 'curated',
      last_verified_at     = NOW(),
      updated_at           = NOW()
  `);
  // Also wire production_scoring_stages so the existing /films/[slug]
  // scoring-stage block and the scoring-stage detail page light up.
  if (sc.scoring_stage_slug) {
    await db.execute(sql`
      INSERT INTO production_scoring_stages (production_id, scoring_stage_id, sort_order)
      SELECT p.id, ss.id, 0
      FROM productions p, scoring_stages ss
      WHERE p.slug = ${sc.production_slug}
        AND ss.slug = ${sc.scoring_stage_slug}
      ON CONFLICT (production_id, scoring_stage_id) DO NOTHING
    `);
  }
}
console.log(`[+] score_works: ${SCORES.length} rows attempted (missing composers no-op silently)`);

// ─────────────────────────────────────────────────────────────────
// 2b. Sound libraries
// ─────────────────────────────────────────────────────────────────
// Canonical third-party SFX library catalog. Production credits attach
// later via end-credits scrape or editorial deep-dives; this pass just
// gets the entity rows seeded so the /sound/effects/libraries surface
// has something to show.

type SoundLibSeed = {
  slug: string;
  name: string;
  publisher: string;
  country: string;
  founded_year: number | null;
  website_url: string | null;
  specialties: string[];
  summary: string;
};

const SOUND_LIBRARIES: SoundLibSeed[] = [
  {
    slug: 'boom-library',
    name: 'BOOM Library',
    publisher: 'BOOM Library GmbH',
    country: 'DE', founded_year: 2010,
    website_url: 'https://www.boomlibrary.com',
    specialties: ['weapons', 'vehicles', 'creatures', 'cinematic textures'],
    summary: 'Berlin-based premium SFX library publisher. Known for cinematic-tier weapons, vehicles, and creature design libraries widely credited on tentpole features.',
  },
  {
    slug: 'pro-sound-effects',
    name: 'Pro Sound Effects',
    publisher: 'Pro Sound Effects',
    country: 'US', founded_year: 2004,
    website_url: 'https://www.prosoundeffects.com',
    specialties: ['ambience', 'foley', 'general', 'archival NBC + ABC libraries'],
    summary: 'Distributor + publisher carrying the NBC News, ABC News, and Hollywood Edge archives plus original recordings. One of the largest commercial SFX catalogs available to post houses.',
  },
  {
    slug: 'a-sound-effect',
    name: 'A Sound Effect',
    publisher: 'Independent SFX Marketplace',
    country: 'DK', founded_year: 2013,
    website_url: 'https://www.asoundeffect.com',
    specialties: ['independent publishers', 'curated bundles', 'niche material'],
    summary: 'Marketplace + editorial platform for independent SFX publishers — aggregates dozens of small libraries. Behind the popular Soundlister directory of post-sound talent.',
  },
  {
    slug: 'sound-ideas',
    name: 'Sound Ideas',
    publisher: 'Sound Ideas Inc.',
    country: 'CA', founded_year: 1978,
    website_url: 'https://www.sound-ideas.com',
    specialties: ['general', 'archival broadcast', 'Hanna-Barbera + Series 6000'],
    summary: 'Canadian publisher; the Series 6000 + Series 7000 libraries date to the 1980s-90s and are credited on hundreds of films from the analog era forward.',
  },
  {
    slug: 'soundly',
    name: 'Soundly',
    publisher: 'Soundly ApS',
    country: 'DK', founded_year: 2017,
    website_url: 'https://getsoundly.com',
    specialties: ['cloud-native catalog', 'tagged metadata', 'streaming workflow'],
    summary: 'Subscription + free catalog; cloud-native macOS-first app. Widely adopted by indie + commercial sound designers for fast search across publisher libraries.',
  },
  {
    slug: 'krotos',
    name: 'Krotos Audio',
    publisher: 'Krotos Ltd.',
    country: 'GB', founded_year: 2014,
    website_url: 'https://www.krotosaudio.com',
    specialties: ['creature design', 'weapons', 'plugins (Reformer)'],
    summary: 'Edinburgh-based publisher; known for the Reformer real-time SFX plugin in addition to traditional libraries. Frequent credit on horror + creature features.',
  },
  {
    slug: 'tonsturm',
    name: 'Tonsturm',
    publisher: 'Tonsturm',
    country: 'DE', founded_year: 2008,
    website_url: 'https://www.tonsturm.com',
    specialties: ['cinematic risers + impacts', 'designed sound', 'whoosh'],
    summary: 'Hamburg-based publisher; designed-sound libraries (risers, impacts, whooshes) widely credited on trailer + tentpole picture work.',
  },
];

// Build a Postgres text[] literal: '{"weapons","vehicles"}'. drizzle's
// sql template flattens JS arrays into a parenthesized parameter list
// (for IN clauses), not into a single text[] value — so we serialize
// manually and cast.
function pgTextArray(items: string[]): string {
  if (items.length === 0) return '{}';
  return '{' + items.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

for (const sl of SOUND_LIBRARIES) {
  const specialtiesLit = pgTextArray(sl.specialties);
  await db.execute(sql`
    INSERT INTO sound_libraries (
      slug, name, publisher, country, founded_year, website_url,
      specialties, summary, data_tier, last_verified_at
    ) VALUES (
      ${sl.slug}, ${sl.name}, ${sl.publisher}, ${sl.country}, ${sl.founded_year}, ${sl.website_url},
      ${specialtiesLit}::text[], ${sl.summary}, 'curated', NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      publisher = EXCLUDED.publisher,
      country = EXCLUDED.country,
      founded_year = EXCLUDED.founded_year,
      website_url = EXCLUDED.website_url,
      specialties = EXCLUDED.specialties,
      summary = EXCLUDED.summary,
      data_tier = 'curated',
      last_verified_at = NOW(),
      updated_at = NOW()
  `);
}
console.log(`[+] sound_libraries: ${SOUND_LIBRARIES.length} rows upserted`);

// ─────────────────────────────────────────────────────────────────
// 3. Flagship music cues
// ─────────────────────────────────────────────────────────────────

type CueSeed = {
  production_slug: string;
  composer_slug: string;
  slug: string;
  title: string;
  track_number: number;
  runtime_seconds: number;
  scene_label: string | null;
  scene_minute: number | null;
  cue_function: string;
  instrumentation_summary: string | null;
  listening_notes: string;
  notable_for: string;
};

const CUES: CueSeed[] = [
  {
    production_slug: 'blade-runner-2049-2017',
    composer_slug: 'hans-zimmer',
    slug: '2049',
    title: '2049',
    track_number: 1, runtime_seconds: 130,
    scene_label: 'Opening — K\'s flight to the protein farm',
    scene_minute: 1, cue_function: 'main_title',
    instrumentation_summary: 'Sub-bass drones (CS-80-style), pad textures, low brass swells. No percussion.',
    listening_notes: 'Opens with a single sustained low frequency that establishes the film\'s spatial palette before any image. The pad chord that enters at 0:42 is the closest the score comes to a stated theme; it returns transformed across the runtime.',
    notable_for: 'Established the sonic identity of the entire score in 90 seconds — quoted in dozens of subsequent score-design tutorials.',
  },
  {
    production_slug: 'gravity-2013',
    composer_slug: 'steven-price',
    slug: 'gravity',
    title: 'Gravity',
    track_number: 18, runtime_seconds: 408,
    scene_label: 'End sequence — Stone\'s return to Earth',
    scene_minute: 80, cue_function: 'emotional_beat',
    instrumentation_summary: 'Full orchestra + London Voices choir, building over 6+ minutes to a sustained tutti climax.',
    listening_notes: 'The cue starts as an exposed solo voice and builds across all six minutes — Price let the orchestra play long enough for the music to physically embody the gravitational pull the title invokes. Mixed natively for 5.1 with surrounds carrying the choir.',
    notable_for: 'The cue that won Price the Oscar. Cited as a modern example of single-build orchestral structure (no internal release).',
  },
  {
    production_slug: 'parasite-2019',
    composer_slug: 'jung-jae-il',
    slug: 'belt-of-faith',
    title: 'The Belt of Faith',
    track_number: 9, runtime_seconds: 217,
    scene_label: 'Kim family con sequence — orchestrated infiltration of the Park house',
    scene_minute: 45, cue_function: 'montage',
    instrumentation_summary: 'Harpsichord lead, string ensemble (vln/vla/vc), Baroque period feel.',
    listening_notes: 'Baroque chamber sensibility against a contemporary class-tension picture — the period-music association makes the Kim family\'s infiltration feel courtly, almost ceremonial. The harpsichord choice was specifically against the modernist look of the Park house.',
    notable_for: 'Became a viral cue on streaming after the film\'s release; widely cited as one of the most recognizable contemporary score cues.',
  },
  {
    production_slug: 'top-gun-maverick-2022',
    composer_slug: 'hans-zimmer',
    slug: 'top-gun-anthem',
    title: 'Top Gun Anthem',
    track_number: 1, runtime_seconds: 217,
    scene_label: 'Opening title sequence — carrier deck operations',
    scene_minute: 1, cue_function: 'main_title',
    instrumentation_summary: 'Faltermeyer\'s 1986 synth + electric guitar lead, re-orchestrated for full session ensemble. Steve Stevens reprises the original guitar solo.',
    listening_notes: 'Re-recording of Harold Faltermeyer\'s 1986 theme using the original guitar performance approach. Steve Stevens (original guitarist) returned. Mixed to match the original 1986 carrier-deck sequence — a deliberate franchise-continuity choice.',
    notable_for: 'The clearest example of franchise-music re-recording in a recent tentpole; the sonic continuity was foregrounded in the marketing.',
  },
  {
    production_slug: 'the-brutalist-2024',
    composer_slug: 'daniel-blumberg',
    slug: 'overture',
    title: 'Overture',
    track_number: 1, runtime_seconds: 261,
    scene_label: 'Opening — film begins in widescreen with title sequence',
    scene_minute: 0, cue_function: 'main_title',
    instrumentation_summary: 'Brass-led ensemble with electronic underpinning. Minimalist repetition pattern.',
    listening_notes: 'Establishes the brass-forward palette that recurs across the film. Repetitive cellular figure inspired by the modular nature of brutalist architecture — small structural units reused across larger forms.',
    notable_for: 'First cue in Blumberg\'s first feature score (Academy Award winner, 2025). Cited in interviews as the piece that sold László\'s journey to the director.',
  },
  {
    production_slug: 'the-revenant-2015',
    composer_slug: 'ryuichi-sakamoto',
    slug: 'the-revenant-main-theme',
    title: 'The Revenant Main Theme',
    track_number: 1, runtime_seconds: 226,
    scene_label: 'Opening and recurring across the film',
    scene_minute: 0, cue_function: 'theme_intro',
    instrumentation_summary: 'String ensemble with sustained electronic textures (Alva Noto contribution). Slow harmonic rhythm.',
    listening_notes: 'Sakamoto\'s string writing carries the film\'s emotional weight; Alva Noto\'s electronic layer provides the cold, industrial-feeling counter-texture that mirrors the visual emphasis on natural-light hostility.',
    notable_for: 'Co-composed cue showcasing the three-composer collaborative approach that defined the film\'s score. Globe disqualification controversy centered on this hybrid composition method.',
  },
];

for (const c of CUES) {
  await db.execute(sql`
    INSERT INTO music_cues (
      score_work_id, slug, title, track_number, runtime_seconds,
      scene_label, scene_minute, cue_function,
      instrumentation_summary, listening_notes, notable_for,
      is_flagship, data_tier
    )
    SELECT sw.id, ${c.slug}, ${c.title}, ${c.track_number}, ${c.runtime_seconds},
           ${c.scene_label}, ${c.scene_minute}, ${c.cue_function}::music_cue_function_enum,
           ${c.instrumentation_summary}, ${c.listening_notes}, ${c.notable_for},
           TRUE, 'curated'
    FROM score_works sw
    JOIN productions p ON p.id = sw.production_id
    JOIN people pe ON pe.id = sw.composer_person_id
    WHERE p.slug = ${c.production_slug}
      AND pe.slug = ${c.composer_slug}
    ON CONFLICT (score_work_id, slug) DO UPDATE SET
      title = EXCLUDED.title,
      track_number = EXCLUDED.track_number,
      runtime_seconds = EXCLUDED.runtime_seconds,
      scene_label = EXCLUDED.scene_label,
      scene_minute = EXCLUDED.scene_minute,
      cue_function = EXCLUDED.cue_function,
      instrumentation_summary = EXCLUDED.instrumentation_summary,
      listening_notes = EXCLUDED.listening_notes,
      notable_for = EXCLUDED.notable_for,
      is_flagship = TRUE,
      data_tier = 'curated',
      updated_at = NOW()
  `);
}
console.log(`[+] music_cues: ${CUES.length} flagship cues attempted`);

process.exit(0);
