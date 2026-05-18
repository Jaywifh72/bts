import { db } from '../src/db.ts';
import { sql } from 'drizzle-orm';

type Beat = {
  timecode: string;       // display
  timecode_s?: number;    // seconds from cue/scene start
  duration_s?: number;
  beat_kind?: string;
  label: string;
  notes?: string;
};

type Walkthrough = {
  slug: string;
  production_slug: string;
  kind: 'edit-scene' | 'music-cue' | 'vfx-shot';
  headline: string;
  scene_label?: string;
  lead_credit?: string;
  lead_person_slug?: string;
  duration_s?: number;
  summary?: string;
  body?: string;
  tags?: string[];
  references?: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  beats: Beat[];
};

const WALKTHROUGHS: Walkthrough[] = [
  // ---------- Edit walkthroughs ----------
  {
    slug: 'oppenheimer-trinity-edit',
    production_slug: 'oppenheimer',
    kind: 'edit-scene',
    headline: 'Trinity countdown — the silence cut',
    scene_label: 'Trinity test, ~01:54 into picture',
    lead_credit: 'Jennifer Lame (editor)',
    duration_s: 320,
    summary: 'Lame builds tension by stretching the countdown across parallel cuts to bunker faces, then holds picture-only silence after detonation — Göransson’s score absent until the shockwave hits. The cut from light to silence is one of the year’s most-discussed edits.',
    tags: ['parallel action', 'silence cut', 'sound design as edit'],
    beats: [
      { timecode: '00:00', timecode_s: 0, beat_kind: 'cue-in', label: 'Hand on detonator switch — close-up' },
      { timecode: '00:18', timecode_s: 18, beat_kind: 'cut', label: 'Wide on Trinity tower silhouette' },
      { timecode: '00:42', timecode_s: 42, beat_kind: 'cut', label: 'Cross-cut to bunker — Kistiakowsky face' },
      { timecode: '01:07', timecode_s: 67, beat_kind: 'cut', label: 'Oppenheimer profile under welder glass' },
      { timecode: '01:55', timecode_s: 115, beat_kind: 'cut', label: 'Detonation flash — full white frame', notes: 'Picture cuts to white but track drops to room tone only.' },
      { timecode: '02:18', timecode_s: 138, beat_kind: 'cut', label: 'Hold on Oppenheimer’s face — eyes adjusting' },
      { timecode: '03:32', timecode_s: 212, beat_kind: 'cue-in', label: 'Shockwave hits — score and roar return together' },
    ],
  },
  {
    slug: 'apocalypse-now-helicopter-attack-edit',
    production_slug: 'apocalypse-now',
    kind: 'edit-scene',
    headline: 'Ride of the Valkyries — assault edit',
    scene_label: 'Helicopter assault on the village',
    lead_credit: 'Walter Murch (editor / sound designer)',
    duration_s: 540,
    summary: 'Murch synchronises picture cuts to Wagner’s phrasing rather than the picture’s own action, so the helicopters move on the music’s beats. The result is the textbook example of contrapuntal sound design.',
    tags: ['music sync', 'contrapuntal sound', 'parallel action'],
    beats: [
      { timecode: '00:00', timecode_s: 0, beat_kind: 'cue-in', label: 'Loudspeaker test — Valkyries begins' },
      { timecode: '00:32', timecode_s: 32, beat_kind: 'cut', label: 'POV from cockpit — village in the distance' },
      { timecode: '01:18', timecode_s: 78, beat_kind: 'cut', label: 'Cut to villagers on the school steps' },
      { timecode: '02:45', timecode_s: 165, beat_kind: 'cut', label: 'First rocket — picture lands on downbeat of brass entry' },
      { timecode: '04:20', timecode_s: 260, beat_kind: 'cut', label: 'Kilgore in cabin — "Smell that gasoline?"' },
      { timecode: '07:50', timecode_s: 470, beat_kind: 'cue-out', label: 'Music recedes as surf shot returns' },
    ],
  },

  // ---------- Music cue guides ----------
  {
    slug: 'oppenheimer-cue-day-one',
    production_slug: 'oppenheimer',
    kind: 'music-cue',
    headline: 'Day One — entrance map',
    scene_label: 'Cue 1M01, opening',
    lead_credit: 'Ludwig Göransson (composer)',
    duration_s: 165,
    summary: 'A textbook example of Göransson’s string-led layering. The cue grows by adding violin desks rather than dynamics; every 12 bars a new section enters. The percussion never resolves — the build is the message.',
    tags: ['string layering', 'unresolved build', 'minimalism'],
    beats: [
      { timecode: '00:00', timecode_s: 0, beat_kind: 'cue-in', label: 'Solo violin — A minor pulse' },
      { timecode: '00:18', timecode_s: 18, label: 'Violas enter on offset rhythm' },
      { timecode: '00:42', timecode_s: 42, label: 'Cellos add ostinato — pulse doubles' },
      { timecode: '01:05', timecode_s: 65, label: 'Brass cluster — first dissonance' },
      { timecode: '01:38', timecode_s: 98, label: 'Percussion enters — taiko + processed metal' },
      { timecode: '02:25', timecode_s: 145, beat_kind: 'cue-out', label: 'Strings cut, leaving only the pulse' },
    ],
  },
  {
    slug: 'interstellar-cue-no-time-for-caution',
    production_slug: 'interstellar',
    kind: 'music-cue',
    headline: 'No Time For Caution — the docking cue',
    scene_label: 'Cue ~01:50 into picture',
    lead_credit: 'Hans Zimmer (composer)',
    duration_s: 220,
    summary: 'Zimmer’s organ-led docking cue — built around the Cor Anglais organ at Temple Church, London — is famous for two long crescendos punctuated by a silence drop on the docking impact. The organ stops were chosen for upper-harmonic content that survives a Dolby Atmos LFE channel.',
    tags: ['organ', 'silence drop', 'tempo metric modulation'],
    beats: [
      { timecode: '00:00', timecode_s: 0, beat_kind: 'cue-in', label: 'Single organ pedal — low D' },
      { timecode: '00:24', timecode_s: 24, label: 'Right-hand manual enters — chromatic ascent' },
      { timecode: '01:02', timecode_s: 62, label: 'First crescendo peak — full reed stops' },
      { timecode: '01:18', timecode_s: 78, beat_kind: 'cue-out', label: 'SILENCE on docking impact (~2s)' },
      { timecode: '01:20', timecode_s: 80, beat_kind: 'cue-in', label: 'Strings return — tempo halves' },
      { timecode: '03:30', timecode_s: 210, label: 'Second crescendo — organ returns full' },
    ],
  },

  // ---------- VFX shot breakdowns ----------
  {
    slug: 'the-dark-knight-truck-flip',
    production_slug: 'the-dark-knight',
    kind: 'vfx-shot',
    headline: 'Truck flip — practical front, CG cleanup',
    scene_label: 'Chase sequence, ~01:18 into picture',
    lead_credit: 'Chris Corbould (SFX) + Nick Davis (VFX)',
    duration_s: 8,
    summary: 'A real 18-wheeler was rigged with a nitrogen cannon under the cab and flipped end-over-end on LaSalle Street, Chicago. The street had been pre-dressed and street furniture replaced with breakaways. VFX cleanup removed the cannon’s pneumatic mast and added a few sparks; everything you see hitting the ground is real metal.',
    tags: ['practical effect', 'nitrogen cannon', 'cleanup VFX'],
    beats: [
      { timecode: '00:00', timecode_s: 0, beat_kind: 'practical-element', label: 'Truck cab enters frame — driven by stunt driver, ejected at last second' },
      { timecode: '00:01', timecode_s: 1, beat_kind: 'practical-element', label: 'Nitrogen cannon fires — pivot at front axle' },
      { timecode: '00:03', timecode_s: 3, beat_kind: 'cg-element', label: 'Pneumatic mast paint-out (replaced with asphalt + sparks)' },
      { timecode: '00:04', timecode_s: 4, beat_kind: 'practical-element', label: 'Trailer arcs over — real momentum carries it' },
      { timecode: '00:06', timecode_s: 6, beat_kind: 'cg-element', label: 'Spark / debris augmentation on landing' },
      { timecode: '00:07', timecode_s: 7, beat_kind: 'practical-element', label: 'Final crash — real impact (no CG)' },
    ],
    references: [
      { title: 'IMAX guide to The Dark Knight stunts', url: 'https://www.empireonline.com/movies/features/dark-knight-stunts/', publication: 'Empire' },
    ],
  },
  {
    slug: 'blade-runner-2049-las-vegas-vista',
    production_slug: 'blade-runner-2049',
    kind: 'vfx-shot',
    headline: 'Las Vegas vista — sandstorm plate + CG city',
    scene_label: '"Welcome to Las Vegas" reveal',
    lead_credit: 'John Nelson (VFX supervisor) — Double Negative',
    duration_s: 15,
    summary: 'Practical sodium-vapor lit dust plates shot in Hungary form the foundation. The collapsed casinos and statuary are CG, lit with HDR captures from on-set dust simulations. Every monumental sculpture was modelled from sketches by PD Dennis Gassner.',
    tags: ['dust simulation', 'sodium-vapor key', 'matte painting CG'],
    beats: [
      { timecode: '00:00', timecode_s: 0, beat_kind: 'practical-element', label: 'Sodium-vapor dust plate (Hungary) — sole key light' },
      { timecode: '00:02', timecode_s: 2, beat_kind: 'cg-element', label: 'Las Vegas skyline matte (DNeg)' },
      { timecode: '00:04', timecode_s: 4, beat_kind: 'cg-element', label: 'Foreground sculptural figures (CG)' },
      { timecode: '00:06', timecode_s: 6, beat_kind: 'cg-element', label: 'Atmospheric haze pass (Houdini sim)' },
      { timecode: '00:09', timecode_s: 9, beat_kind: 'comp-layer', label: 'K silhouette plate composited in' },
      { timecode: '00:12', timecode_s: 12, beat_kind: 'comp-layer', label: 'Final grade — pushed orange channel for sodium look' },
    ],
  },
];

async function seed() {
  const arr = (xs?: string[]) =>
    `{${(xs ?? []).map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;

  for (const w of WALKTHROUGHS) {
    const prods = await db.execute<{ id: number }>(sql`
      SELECT id FROM productions WHERE slug = ${w.production_slug} LIMIT 1
    `);
    const productionId = prods[0]?.id;
    if (!productionId) {
      console.warn(`[walkthroughs] skip ${w.slug} — production "${w.production_slug}" not found`);
      continue;
    }

    let leadPersonId: number | null = null;
    if (w.lead_person_slug) {
      const lp = await db.execute<{ id: number }>(sql`
        SELECT id FROM people WHERE slug = ${w.lead_person_slug} LIMIT 1
      `);
      leadPersonId = lp[0]?.id ?? null;
    }

    const refsJson = JSON.stringify(w.references ?? []);

    const ins = await db.execute<{ id: number }>(sql`
      INSERT INTO annotated_walkthroughs
        (slug, production_id, kind, headline, scene_label, lead_credit,
         lead_person_id, duration_s, summary, body, tags, "references",
         data_tier, last_curated_review)
      VALUES (${w.slug}, ${productionId}, ${w.kind}, ${w.headline},
              ${w.scene_label ?? null}, ${w.lead_credit ?? null},
              ${leadPersonId}, ${w.duration_s ?? null},
              ${w.summary ?? null}, ${w.body ?? null},
              ${sql.raw(`'${arr(w.tags)}'`)}::text[],
              ${refsJson}::jsonb, 'curated', now())
      ON CONFLICT (slug) DO UPDATE SET
        production_id = EXCLUDED.production_id,
        kind = EXCLUDED.kind,
        headline = EXCLUDED.headline,
        scene_label = EXCLUDED.scene_label,
        lead_credit = EXCLUDED.lead_credit,
        lead_person_id = EXCLUDED.lead_person_id,
        duration_s = EXCLUDED.duration_s,
        summary = EXCLUDED.summary,
        body = EXCLUDED.body,
        tags = EXCLUDED.tags,
        "references" = EXCLUDED."references",
        data_tier = EXCLUDED.data_tier,
        last_curated_review = now(),
        updated_at = now()
      RETURNING id
    `);
    const walkthroughId = ins[0]?.id;
    if (!walkthroughId) continue;

    // Clear and re-insert beats so re-running the seed stays clean.
    await db.execute(sql`DELETE FROM walkthrough_beats WHERE walkthrough_id = ${walkthroughId}`);

    let order = 0;
    for (const b of w.beats) {
      await db.execute(sql`
        INSERT INTO walkthrough_beats
          (walkthrough_id, timecode, timecode_s, duration_s, beat_kind, label, notes, sort_order)
        VALUES (${walkthroughId}, ${b.timecode},
                ${b.timecode_s ?? null}, ${b.duration_s ?? null},
                ${b.beat_kind ?? null}, ${b.label}, ${b.notes ?? null}, ${order++})
      `);
    }
    console.log(`[walkthroughs] seeded ${w.slug} (${w.beats.length} beats)`);
  }
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
