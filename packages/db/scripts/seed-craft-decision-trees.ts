import { db } from '../src/db.ts';
import { sql } from 'drizzle-orm';

type Option = {
  slug: string; label: string; summary?: string;
  when_to_choose?: string[]; pros?: string[]; cons?: string[];
  cost_band?: 'low'|'medium'|'high'|'tentpole';
  complexity_band?: 'low'|'medium'|'high'|'expert-only';
  example_films?: string[];
};

type Tree = {
  slug: string; craft: string; title: string; question: string;
  summary?: string; decision_factors?: string[];
  references?: Array<{ title: string; url: string; publication?: string; kind?: string }>;
  options: Option[];
};

const TREES: Tree[] = [
  {
    slug: 'anamorphic-vs-spherical',
    craft: 'cinematography',
    title: 'Anamorphic vs spherical',
    question: 'When should I shoot anamorphic instead of spherical?',
    summary: 'Anamorphic squeezes a wider aspect onto the sensor and brings signature character — oval bokeh, horizontal flares, falloff in the corners. Spherical is sharper edge-to-edge, smaller, lighter, faster, and cheaper. The choice is mostly about character vs. discipline, not resolution.',
    decision_factors: ['target aspect ratio', 'lens character', 'lighting load', 'budget', 'close-focus distance', 'crew familiarity'],
    references: [
      { title: 'ASC: Anamorphic primer', url: 'https://theasc.com/articles/anamorphic-primer', publication: 'American Cinematographer' },
    ],
    options: [
      {
        slug: 'anamorphic', label: 'Anamorphic',
        summary: '2x or 1.3x squeeze that delivers 2.39:1 with the lens character cinema has trained audiences to read as "film".',
        when_to_choose: ['2.39:1 target with a "cinematic" lens signature', 'directors who want oval bokeh + horizontal flares as language', 'large-format bodies that can carry the extra glass'],
        pros: ['Signature out-of-focus character', 'Horizontal flares', 'Wider field with shallow DOF'],
        cons: ['Slower glass (more light needed)', 'Heavier, larger', 'Close-focus penalty', 'Anamorphic mumps on long lenses'],
        cost_band: 'high', complexity_band: 'high',
        example_films: ['the-batman', 'no-time-to-die', 'killers-of-the-flower-moon'],
      },
      {
        slug: 'spherical', label: 'Spherical',
        summary: 'Standard cinema primes. Sharper across the frame, lighter, faster — and modern wide-aspect crops give you 2.39 without the squeeze.',
        when_to_choose: ['Run-and-gun coverage', 'Tight close-focus needs (handheld, Steadicam)', 'Limited lighting package', 'Director wants neutral / observational tone'],
        pros: ['Faster stops, lighter rig', 'Cheaper rentals', 'Sharper corners', 'Easier VFX integration'],
        cons: ['Cropping to 2.39 throws away resolution', 'No anamorphic character'],
        cost_band: 'medium', complexity_band: 'low',
        example_films: ['oppenheimer', 'the-social-network'],
      },
    ],
  },

  {
    slug: 'practical-fire-vs-cg-fire',
    craft: 'vfx',
    title: 'Practical fire vs CGI fire',
    question: 'When to burn it for real vs simulate it?',
    summary: 'Practical fire still reads better at full-frame, especially when actors interact with it. CGI fire wins for safety-impossible shots, scale beyond what a permit allows, and clean integration with other digital elements. The hybrid (practical core + CG augmentation) is the modern default.',
    decision_factors: ['actor proximity', 'scale', 'permit / insurance', 'reset cost per take', 'lensing (long vs wide)'],
    references: [
      { title: 'fxguide: pyro pipelines', url: 'https://www.fxguide.com/fxfeatured/pyro-pipelines/', publication: 'fxguide' },
    ],
    options: [
      {
        slug: 'practical', label: 'Practical burn',
        summary: 'Real fire bars, propane rigs, gel fuel. SFX coordinator drives; CG cleans up rigging.',
        when_to_choose: ['Hero shot with actor in frame', 'Wide lens / full body', 'You can afford reset time between takes'],
        pros: ['Photographic truth', 'Real interactive lighting on cast', 'Cheaper than full CG hero fire'],
        cons: ['Limited number of takes', 'Safety perimeter restricts blocking', 'Scale capped by permits'],
        cost_band: 'high', complexity_band: 'high',
        example_films: ['oppenheimer'],
      },
      {
        slug: 'cg-fire', label: 'CG fire',
        summary: 'Houdini / Embergen pyro sims composited in. Add practical interactive light on plates when possible.',
        when_to_choose: ['Scale impossible to permit (city block burning)', 'Actors must be inside the flame envelope', 'Repeating takes for performance'],
        pros: ['Infinite scale', 'Re-time, re-light in post', 'No safety perimeter'],
        cons: ['Render-farm cost', 'Reads "soft" without good interactive plates', 'Long iteration cycles'],
        cost_band: 'tentpole', complexity_band: 'expert-only',
        example_films: ['blade-runner-2049', 'civil-war-2024'],
      },
      {
        slug: 'hybrid', label: 'Hybrid (practical core + CG aug)',
        summary: 'Real flame as the lighting and reference, CG extends scale and removes rigging. The current industry default for big fire shots.',
        when_to_choose: ['You need photographic truth + scale beyond what is permitable'],
        pros: ['Best of both', 'Cast performance grounded in real heat / light', 'Scale flexible in post'],
        cons: ['Two budgets', 'Coord between SFX and VFX must be tight'],
        cost_band: 'tentpole', complexity_band: 'expert-only',
        example_films: ['mad-max-fury-road'],
      },
    ],
  },

  {
    slug: 'orchestra-vs-samples',
    craft: 'music',
    title: 'Full orchestra vs sampled mockup',
    question: 'When does the score need a live orchestra vs samples?',
    summary: 'A real orchestra brings ensemble timbre and a soloist energy that samples still cannot fake on a hero cue. Samples win for speed, revisions, and budgets that cannot afford a scoring stage. Most modern scores are layered: a live string section sweetened with sample brass and percussion.',
    decision_factors: ['budget', 'turnaround', 'cue exposure (foreground vs underscore)', 'composer voice', 'temp expectations'],
    references: [
      { title: 'Scoring stage economics 101', url: 'https://variety.com/2021/film/news/scoring-stages-pandemic-1234922934/', publication: 'Variety' },
    ],
    options: [
      {
        slug: 'live-orchestra', label: 'Live orchestra at a scoring stage',
        summary: 'AIR, Abbey Road, Sony, Newman, Eastwood, Synchron. Conductor + contractor. Three-hour sessions, ~70-90 pieces typical for hero cues.',
        when_to_choose: ['Tentpole release', 'Hero theme exposed for >60s', 'Director or composer with score-as-character intent'],
        pros: ['Ensemble timbre', 'Soloist expressiveness', 'Marketing asset (BTS, soundtrack release)'],
        cons: ['$25-60k per session', 'AFM session rates locked', 'Revisions expensive after session'],
        cost_band: 'tentpole', complexity_band: 'high',
        example_films: ['dune-part-two', 'oppenheimer'],
      },
      {
        slug: 'hybrid-stems', label: 'Hybrid (live stems + samples)',
        summary: 'Record only the elements that samples cannot fake (strings, brass solo, vocal soloist); fill with high-end sample libraries.',
        when_to_choose: ['Mid-budget feature', 'Most cues are underscore; only a handful are exposed'],
        pros: ['Half the stage cost', 'Real strings for the moments that matter', 'Faster iteration on remaining cues'],
        cons: ['Mixing live + samples needs a careful engineer', 'Tonal mismatches if poorly cued'],
        cost_band: 'high', complexity_band: 'medium',
        example_films: [],
      },
      {
        slug: 'all-samples', label: 'Sampled mockup only',
        summary: 'Spitfire, VSL, Cinesamples, Hans Zimmer Strings, etc. Composer + assistant mix in the box.',
        when_to_choose: ['Indie / streaming feature with tight budget', 'Documentary / series with weekly turnaround', 'Composer voice is already synth-forward'],
        pros: ['Cheap', 'Infinite revisions', 'Fast turnaround'],
        cons: ['Sample exposure becomes obvious on solo lines', 'No real soloist character'],
        cost_band: 'low', complexity_band: 'low',
        example_films: [],
      },
    ],
  },

  {
    slug: 'wire-rig-vs-decelerator',
    craft: 'stunts',
    title: 'Wire rig vs decelerator vs airbag',
    question: 'For a high fall, when do I rig wire descent vs decelerator vs airbag landing?',
    summary: 'High falls have three primary recovery methods: wire descent (controlled rate, repeatable, but visible rigging), decelerator (free-fall feel, single take per setup), and airbag (stunt-performer staple for falls up to ~30m, but limits blocking to a target zone). Choice depends on shot length, framing, performer comfort, and how visible the rigging will be on camera.',
    decision_factors: ['fall height', 'on-camera framing (wide vs tight)', 'performer experience', 'reset time between takes', 'visibility of rigging'],
    references: [
      { title: 'SAG-AFTRA stunt safety bulletins', url: 'https://www.sagaftra.org/safety', publication: 'SAG-AFTRA' },
    ],
    options: [
      {
        slug: 'wire-rig', label: 'Wire descent rig',
        summary: 'Performer rigged on cable with a controlled descent device (typically a magnetic or hydraulic brake). Repeatable, controllable speed.',
        when_to_choose: ['Long descent in a single take', 'Performer must hit a mark mid-fall', 'Director wants a slow-motion-feeling free fall'],
        pros: ['Highly repeatable', 'Speed controllable', 'Safe for inexperienced performers'],
        cons: ['Wire paint-out cost in post', 'Limits performer body language', 'Setup time per shot'],
        cost_band: 'high', complexity_band: 'high',
        example_films: ['mission-impossible-fallout'],
      },
      {
        slug: 'decelerator', label: 'Decelerator',
        summary: 'Single-cable system that allows free fall until the device engages near the landing point. Reads as real free-fall on camera.',
        when_to_choose: ['Short hero fall (5-15m)', 'You need free-fall body dynamics on screen', 'Single take is acceptable'],
        pros: ['Reads as true free-fall', 'Minimal paint-out (single cable)', 'Fast reset between performers'],
        cons: ['Single take per setup', 'Specialised rigger required', 'Performer commitment needed'],
        cost_band: 'high', complexity_band: 'expert-only',
        example_films: [],
      },
      {
        slug: 'airbag', label: 'Airbag landing',
        summary: 'Stacked airbag system rated for the fall height. Performer leaves a platform and lands in the bag, then transition cut.',
        when_to_choose: ['Falls up to ~30m', 'Director will cut on impact (transition to ground-level plate)', 'Repeatable takes needed'],
        pros: ['Cheap and well-understood', 'Many takes per setup', 'Performer comfort'],
        cons: ['Landing must be a single fixed target', 'Hides the bottom of the fall behind a cut', 'Bag visible in wide frames'],
        cost_band: 'medium', complexity_band: 'medium',
        example_films: [],
      },
    ],
  },

  {
    slug: 'prosthetic-vs-digital-aging',
    craft: 'mu-hair',
    title: 'Prosthetic aging vs digital de-aging',
    question: 'When to age (or de-age) an actor practically vs in VFX?',
    summary: 'Practical aging holds up at any frame size and lets the actor work with the face on the day. Digital de-aging is essentially mandatory when the script demands the actor look 30 years younger across an entire performance — but it is still tentpole-only money. The Whale and A Different Man stake out the practical end; The Irishman and Indiana Jones 5 mark the digital end.',
    decision_factors: ['scope (one scene vs whole film)', 'frame size (tight close-ups vs wide)', 'actor comfort with prosthetics', 'budget'],
    references: [],
    options: [
      {
        slug: 'prosthetic', label: 'Practical prosthetic',
        summary: 'Sculpted appliances (foam latex, silicone) designed and applied by a special-makeup-effects department. Hours-long application; on-day performance.',
        when_to_choose: ['Single character with major transformation', 'Tight close-up framing throughout', 'Actor wants the face to drive performance'],
        pros: ['Reads at any frame size', 'Real interactive light', 'Actor performance grounded in physical change'],
        cons: ['Multi-hour application time per day', 'Risk of seams in extreme close-up', 'Less flexible in post'],
        cost_band: 'high', complexity_band: 'expert-only',
        example_films: ['the-whale', 'a-different-man'],
      },
      {
        slug: 'digital-de-aging', label: 'Digital de-aging (VFX)',
        summary: 'Per-shot facial replacement / reshaping in VFX. Multiple vendors offer it; quality has caught up to real for medium-distance shots but tight close-ups still reveal the seam.',
        when_to_choose: ['Entire performance requires age shift', 'Actor must look 20-40 years younger across hours of screen time', 'Tentpole budget available'],
        pros: ['No application time', 'Actor performs unimpeded', 'Per-shot dial-in in post'],
        cons: ['Tentpole-only cost', 'Long iteration cycles', 'Tight close-ups still risk uncanny valley'],
        cost_band: 'tentpole', complexity_band: 'expert-only',
        example_films: ['the-irishman', 'indiana-jones-and-the-dial-of-destiny'],
      },
    ],
  },
];

async function seed() {
  for (const t of TREES) {
    const refsJson = JSON.stringify(t.references ?? []);
    const factorsLit = `{${(t.decision_factors ?? []).map(f => `"${f.replace(/"/g, '\\"')}"`).join(',')}}`;
    const inserted = await db.execute<{ id: number }>(sql`
      INSERT INTO craft_decision_trees
        (slug, craft, title, question, summary, decision_factors, "references", data_tier, last_curated_review)
      VALUES (${t.slug}, ${t.craft}, ${t.title}, ${t.question}, ${t.summary ?? null},
              ${sql.raw(`'${factorsLit}'`)}::text[], ${refsJson}::jsonb, 'curated', now())
      ON CONFLICT (slug) DO UPDATE SET
        craft = EXCLUDED.craft,
        title = EXCLUDED.title,
        question = EXCLUDED.question,
        summary = EXCLUDED.summary,
        decision_factors = EXCLUDED.decision_factors,
        "references" = EXCLUDED."references",
        data_tier = EXCLUDED.data_tier,
        last_curated_review = now(),
        updated_at = now()
      RETURNING id
    `);
    const treeId = inserted[0]?.id;
    if (!treeId) {
      console.warn(`[decisions] skip ${t.slug}, no id returned`);
      continue;
    }

    let order = 0;
    for (const o of t.options) {
      const arr = (xs: string[]) => `{${xs.map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;
      await db.execute(sql`
        INSERT INTO craft_decision_options
          (tree_id, slug, label, summary, when_to_choose, pros, cons,
           cost_band, complexity_band, example_films, sort_order)
        VALUES (${treeId}, ${o.slug}, ${o.label}, ${o.summary ?? null},
                ${sql.raw(`'${arr(o.when_to_choose ?? [])}'`)}::text[],
                ${sql.raw(`'${arr(o.pros ?? [])}'`)}::text[],
                ${sql.raw(`'${arr(o.cons ?? [])}'`)}::text[],
                ${o.cost_band ?? null}, ${o.complexity_band ?? null},
                ${sql.raw(`'${arr(o.example_films ?? [])}'`)}::text[],
                ${order++})
        ON CONFLICT (tree_id, slug) DO UPDATE SET
          label = EXCLUDED.label,
          summary = EXCLUDED.summary,
          when_to_choose = EXCLUDED.when_to_choose,
          pros = EXCLUDED.pros,
          cons = EXCLUDED.cons,
          cost_band = EXCLUDED.cost_band,
          complexity_band = EXCLUDED.complexity_band,
          example_films = EXCLUDED.example_films,
          sort_order = EXCLUDED.sort_order
      `);
    }
    console.log(`[decisions] seeded ${t.slug} (${t.options.length} options)`);
  }
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
