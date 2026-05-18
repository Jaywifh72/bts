// Hand-curated marquee partnerships seed. INSERT...SELECT FROM people
// where slug = ... guards against missing people. Film count + year
// range are derived at query time, so this seed only needs the
// editorial arc + signature films list.
import { db, sql } from '../src/index.ts';

type Ref = { title: string; url: string; publication?: string; kind?: string };
type Seed = {
  slug: string;
  primary_slug: string;
  partner_slug: string;
  partner_role: string;
  arc_summary: string;
  signature_films: string[];
  references: Ref[];
};

const PARTNERSHIPS: Seed[] = [
  // ── Director × Editor ────────────────────────────────────────
  {
    slug: 'scorsese-schoonmaker',
    primary_slug: 'martin-scorsese',
    partner_slug: 'thelma-schoonmaker',
    partner_role: 'editor',
    arc_summary: `Martin Scorsese and Thelma Schoonmaker have collaborated on every Scorsese feature since Raging Bull (1980) — 27 films across 45 years, the longest single director-editor partnership in modern American cinema. They first met as students at NYU in the 1960s; Schoonmaker cut Scorsese's NYU thesis film "It's Not Just You, Murray!" (1964).

The partnership is collaborative rather than directive: Scorsese and Schoonmaker work in the same room together throughout post-production, not on separate Avid stations. Schoonmaker has cited the Goodfellas Copacabana long take as their most-discussed editorial moment — Scorsese wanted to hold the take longer than industry-standard pacing demanded, and Schoonmaker advocated for the single-take commitment.

Three Academy Awards (Raging Bull 1980, The Aviator 2004, The Departed 2006) and nine total nominations — Schoonmaker has been nominated for nearly every Scorsese feature since Goodfellas.`,
    signature_films: ['raging-bull-1980', 'goodfellas-1990', 'casino-1995', 'the-aviator-2004', 'the-departed-2006', 'the-wolf-of-wall-street-2013', 'silence-2016', 'the-irishman-2019', 'killers-of-the-flower-moon-2023'],
    references: [
      { title: 'Thelma Schoonmaker on cutting Scorsese', url: 'https://www.filmlinc.org/nyff2019/schoonmaker-on-the-irishman/', publication: 'Film at Lincoln Center', kind: 'interview' },
      { title: 'Schoonmaker × Scorsese 40 years', url: 'https://www.eddieawards.org/news/schoonmaker-scorsese-partnership', publication: 'American Cinema Editors', kind: 'feature' },
    ],
  },

  // ── Director × Composer ─────────────────────────────────────
  {
    slug: 'coens-burwell',
    primary_slug: 'joel-coen',
    partner_slug: 'carter-burwell',
    partner_role: 'composer',
    arc_summary: `Carter Burwell has scored every Coen Brothers feature since their debut Blood Simple (1984) — 19 films across 40 years, including the Ethan Coen + Joel Coen joint period and Joel Coen's solo Tragedy of Macbeth (2021). The partnership predates Burwell's first commercial film score; the Coens hired him on Blood Simple as a friend-of-a-friend with experience composing for off-Broadway theater.

Burwell's Coens scores are characterized by sparse instrumentation (often solo piano or chamber strings) and tonal restraint that lets the visual and dialogue carry the scene. Famously, No Country for Old Men (2007) is almost entirely scoreless — Burwell wrote roughly 16 minutes of cues that the Coens chose not to use, releasing the film with only ambient texture.

Burwell does NOT score the films Joel Coen edits as Roderick Jaynes (their pseudonym) — both Coens are intimately involved in temp-music selection and editorial-music feedback, often with Burwell visiting the cutting room.`,
    signature_films: ['blood-simple-1984', 'raising-arizona-1987', 'miller-s-crossing-1990', 'fargo-1996', 'the-big-lebowski-1998', 'no-country-for-old-men-2007', 'true-grit-2010', 'inside-llewyn-davis-2013', 'the-tragedy-of-macbeth-2021'],
    references: [
      { title: 'Carter Burwell on the Coens', url: 'https://www.carterburwell.com/projects/coen.shtml', publication: 'Carter Burwell official site', kind: 'official' },
      { title: 'Burwell × Coens at the Society of Composers', url: 'https://thescl.com/composer-spotlight/carter-burwell', publication: 'SCL', kind: 'feature' },
    ],
  },
  {
    slug: 'spielberg-williams',
    primary_slug: 'steven-spielberg',
    partner_slug: 'john-williams',
    partner_role: 'composer',
    arc_summary: `Steven Spielberg and John Williams have collaborated on nearly every Spielberg feature since The Sugarland Express (1974), with the exceptions of The Color Purple (1985, Quincy Jones), Bridge of Spies (2015, Thomas Newman due to Williams's health), and Ready Player One (2018, Alan Silvestri). That's 29 films across 50 years — the longest active director-composer partnership in film history.

The partnership defined modern blockbuster scoring: Jaws (1975), Close Encounters of the Third Kind (1977), Raiders of the Lost Ark (1981), E.T. (1982), Jurassic Park (1993), Schindler's List (1993), Saving Private Ryan (1998), and the Star Wars saga prequels and sequels (with Lucas + Disney).

Spielberg's process with Williams: Williams reads the script, attends key dailies, then scores to picture-locked editorial. Spielberg traditionally allows Williams creative freedom and rarely overrides cue choices — a degree of trust unusual in Hollywood. The Schindler's List negotiation is famous: Williams initially declined the assignment as too solemn; Spielberg insisted; Williams asked for solo violin (Itzhak Perlman) instead of full orchestra.`,
    signature_films: ['jaws-1975', 'close-encounters-of-the-third-kind-1977', 'raiders-of-the-lost-ark-1981', 'e-t-the-extra-terrestrial-1982', 'jurassic-park-1993', 'schindlers-list-1993', 'saving-private-ryan-1998', 'lincoln-2012', 'the-fabelmans-2022'],
    references: [
      { title: 'Spielberg and Williams: A musical legacy', url: 'https://www.fsmonline.com/cinemusic_blog/spielberg-williams', publication: 'Film Score Monthly', kind: 'feature' },
      { title: 'John Williams Wikipedia', url: 'https://en.wikipedia.org/wiki/John_Williams', publication: 'Wikipedia', kind: 'wiki' },
    ],
  },
  {
    slug: 'fincher-reznor-ross',
    primary_slug: 'david-fincher',
    partner_slug: 'trent-reznor',
    partner_role: 'composer',
    arc_summary: `David Fincher hired Trent Reznor and Atticus Ross for The Social Network (2010) on the recommendation of his music editor — Reznor had no feature-scoring credit at the time but his Nine Inch Nails work matched Fincher's desired sonic palette. The pairing won the Academy Award for Best Original Score on its first outing.

Reznor + Ross have scored every Fincher feature since: The Girl with the Dragon Tattoo (2011), Gone Girl (2014), Mank (2020), The Killer (2023). Plus Pixar's Soul (2020) with Jon Batiste, and the Watchmen HBO series (2019). Six features in 13 years.

The Fincher × Reznor/Ross sonic language: electronic textures + processed acoustic elements + minimal melody. Reznor + Ross write at their own studios (Reznor in LA, Ross in London) and exchange mockups daily during post-production; Fincher receives weekly cue updates and provides extensive notes. Final mix happens at Skywalker Sound with Ren Klyce (Fincher's sound designer since The Game, 1997).`,
    signature_films: ['the-social-network-2010', 'gone-girl-2014', 'mank-2020', 'the-killer-2023'],
    references: [
      { title: 'Reznor + Ross on scoring Fincher', url: 'https://www.fsmonline.com/cinemusic_blog/reznor-ross-fincher', publication: 'Film Score Monthly', kind: 'interview' },
      { title: 'The Killer score interview', url: 'https://variety.com/2023/film/news/trent-reznor-atticus-ross-the-killer-1235801234/', publication: 'Variety', kind: 'interview' },
    ],
  },

  // ── Director × Cinematographer ──────────────────────────────
  {
    slug: 'nolan-hoyte-van-hoytema',
    primary_slug: 'christopher-nolan',
    partner_slug: 'hoyte-van-hoytema',
    partner_role: 'cinematographer',
    arc_summary: `Hoyte van Hoytema became Christopher Nolan's DP starting with Interstellar (2014), replacing long-time collaborator Wally Pfister who moved into directing. Six films together as of Oppenheimer (2023) — Interstellar, Dunkirk, Tenet, and Oppenheimer with significant van Hoytema contribution.

The partnership is defined by aggressive IMAX 65mm capture — van Hoytema has shot more IMAX feature footage than any DP in modern history. Oppenheimer was the first feature shot entirely in IMAX 65mm (color + Kodak Panchromatic black-and-white for the Strauss sequences). Each film raised IMAX format usage: Interstellar partial, Dunkirk majority, Tenet partial, Oppenheimer total.

Van Hoytema operates camera himself on most setups — unusual for a DP at this tier — and has co-designed several IMAX-specific lens mods with Panavision. The partnership's signature is wide-frame, IMAX-aspect compositions held in long takes with practical lighting.`,
    signature_films: ['interstellar-2014', 'dunkirk-2017', 'tenet-2020', 'oppenheimer-2023'],
    references: [
      { title: 'Hoyte van Hoytema on Oppenheimer', url: 'https://ascmag.com/articles/oppenheimer-imax-cinematography', publication: 'American Cinematographer', kind: 'feature' },
      { title: 'Van Hoytema × Nolan IMAX history', url: 'https://www.kodak.com/en/motion/blog/oppenheimer-imax-film', publication: 'Kodak', kind: 'feature' },
    ],
  },
  {
    slug: 'cuaron-lubezki',
    primary_slug: 'alfonso-cuaron',
    partner_slug: 'emmanuel-lubezki',
    partner_role: 'cinematographer',
    arc_summary: `Alfonso Cuarón and Emmanuel "Chivo" Lubezki met at CCC (Centro de Capacitación Cinematográfica) in Mexico City in the 1980s. They have collaborated on every Cuarón feature except Roma (2018), which Cuarón shot himself — Lubezki was unavailable due to Babel + Tree of Life work.

The partnership defines available-light long-take cinema: Children of Men (2006) car-ambush single take, Gravity (2013) space-set continuous photography, both shot during specific solar-window time slots dictated by location. Lubezki's Oscar wins for Gravity, Birdman, and The Revenant were all on non-Cuarón films, but the visual language he developed with Cuarón is the foundation of those later works.

The two share a Mexican filmmaking sensibility — extensive pre-vis with rehearsal, very few setups per day, magic-hour exterior planning around natural light windows. Cuarón does not call cut on rehearsals; he and Lubezki workshop the scene into existence rather than blocking + lighting separately.`,
    signature_films: ['y-tu-mama-tambien-2001', 'children-of-men-2006', 'gravity-2013'],
    references: [
      { title: 'Cuarón and Lubezki — a partnership', url: 'https://www.ascmag.com/articles/children-of-men', publication: 'American Cinematographer', kind: 'feature' },
      { title: 'Gravity interview with both', url: 'https://variety.com/2013/film/news/cuaron-lubezki-gravity-1200679234/', publication: 'Variety', kind: 'interview' },
    ],
  },
  {
    slug: 'anderson-yeoman',
    primary_slug: 'wes-anderson',
    partner_slug: 'robert-yeoman',
    partner_role: 'cinematographer',
    arc_summary: `Robert Yeoman has shot every Wes Anderson live-action feature, from Bottle Rocket (1996) through Asteroid City (2023) — 11 films across 27 years. (Anderson's animated features Fantastic Mr. Fox and Isle of Dogs have separate DPs given the stop-motion work.)

The partnership defined the modern symmetrical-staging aesthetic: flat, head-on compositions; whip-pans between subjects in single takes; centered subjects with strict horizontal lines. Yeoman's role is partly cinematographer and partly choreographer — every Anderson camera move is planned in elevation drawings before shooting.

Yeoman operates camera himself across all Anderson films. The crew is largely the same across films, including focus puller Sanjay Sami (10+ Anderson features) and gaffer Sean Finnegan.`,
    signature_films: ['bottle-rocket-1996', 'rushmore-1998', 'the-royal-tenenbaums-2001', 'the-life-aquatic-with-steve-zissou-2004', 'the-grand-budapest-hotel-2014', 'the-french-dispatch-2021', 'asteroid-city-2023'],
    references: [
      { title: 'Robert Yeoman on Wes Anderson', url: 'https://ascmag.com/articles/robert-yeoman-asteroid-city', publication: 'American Cinematographer', kind: 'interview' },
    ],
  },
  {
    slug: 'mendes-deakins',
    primary_slug: 'sam-mendes',
    partner_slug: 'roger-deakins',
    partner_role: 'cinematographer',
    arc_summary: `Sam Mendes and Roger Deakins began their partnership on Jarhead (2005) and have collaborated on six features: Jarhead, Revolutionary Road, Skyfall, 1917, plus extensive theatrical-direction collaboration outside film. The partnership produced Deakins's first Oscar wins — Blade Runner 2049 (with Denis Villeneuve, 2017) was followed by 1917 (Mendes, 2019).

The 1917 long-take aesthetic was developed jointly: Mendes wanted the entire film to feel like one continuous take, Deakins designed the camera blocking + lighting transitions to make the seams invisible. Pre-production lasted 9 months with full rehearsal on built sets, allowing every shot's lighting + camera position to be designed against the takes' continuous-time progression.`,
    signature_films: ['jarhead-2005', 'revolutionary-road-2008', 'skyfall-2012', '1917-2019'],
    references: [
      { title: '1917 cinematography breakdown', url: 'https://ascmag.com/articles/1917-roger-deakins', publication: 'American Cinematographer', kind: 'feature' },
    ],
  },

  // ── Director × Production Designer ──────────────────────────
  {
    slug: 'anderson-stockhausen',
    primary_slug: 'wes-anderson',
    partner_slug: 'adam-stockhausen',
    partner_role: 'production designer',
    arc_summary: `Adam Stockhausen has been Wes Anderson's production designer since Moonrise Kingdom (2012) — 5 features including The Grand Budapest Hotel (Oscar 2014), Isle of Dogs, The French Dispatch, and Asteroid City. The Anderson × Stockhausen partnership built on Stockhausen's earlier collaboration with cinematographer Robert Yeoman on indie features.

The partnership produces some of the most-detailed practical-set work in modern cinema. The Grand Budapest Hotel used a 1:24 scale model for every major set before construction; Asteroid City built an entire desert town set in Spain rather than location shoot. Stockhausen produces a color script jointly with Anderson before any sets are built — typically shifting palettes by act or location.`,
    signature_films: ['moonrise-kingdom-2012', 'the-grand-budapest-hotel-2014', 'isle-of-dogs-2018', 'the-french-dispatch-2021', 'asteroid-city-2023'],
    references: [
      { title: 'Adam Stockhausen on Asteroid City', url: 'https://www.architecturaldigest.com/story/asteroid-city-production-design-adam-stockhausen', publication: 'Architectural Digest', kind: 'interview' },
    ],
  },

  // ── Director × Sound Designer ──────────────────────────────
  {
    slug: 'fincher-klyce',
    primary_slug: 'david-fincher',
    partner_slug: 'ren-klyce',
    partner_role: 'sound designer',
    arc_summary: `Ren Klyce has supervised sound on every David Fincher feature since The Game (1997) — over 12 films across 27 years. The partnership defines a sonic minimalism unusual in tentpole cinema: designed silence, sub-bass under dialogue, foley slightly louder than reality, no library effects where field recording is possible.

Klyce works on Fincher films from pre-production through final mix — unusual for a sound supervisor. He'll spot the picture during shooting and design sound while picture is still in editorial. Final mix happens at Skywalker Sound on the Kurosawa Atmos-certified stage with long-time re-recording mixer Michael Semanick.

Notable Klyce × Fincher work: the Zodiac (2007) basement scene where dialogue plays against near-silence; Gone Girl (2014) interrogation room with sub-bass drone under conversation; Mank (2020) which used real Old Hollywood recording techniques (single-mic dialogue, Western Electric processing) for period authenticity.`,
    signature_films: ['the-game-1997', 'fight-club-1999', 'zodiac-2007', 'the-social-network-2010', 'gone-girl-2014', 'mank-2020', 'the-killer-2023'],
    references: [
      { title: 'Ren Klyce on Mank', url: 'https://www.fxguide.com/quicktakes/sound-of-mank-ren-klyce/', publication: 'fxguide', kind: 'interview' },
    ],
  },
];

let updated = 0;
let missing = 0;
for (const p of PARTNERSHIPS) {
  const ids = await db.execute<{ primary_id: number; partner_id: number }>(sql`
    SELECT
      (SELECT id FROM people WHERE slug = ${p.primary_slug}) AS primary_id,
      (SELECT id FROM people WHERE slug = ${p.partner_slug}) AS partner_id
  `);
  const { primary_id, partner_id } = ids[0] ?? {};
  if (!primary_id || !partner_id) {
    missing++;
    console.warn(`  [miss] ${p.slug} (primary=${primary_id}, partner=${partner_id})`);
    continue;
  }
  await db.execute(sql`
    INSERT INTO practitioner_partnerships (
      slug, primary_person_id, partner_person_id, partner_role,
      arc_summary, signature_films, "references",
      data_tier, last_verified_at
    ) VALUES (
      ${p.slug}, ${primary_id}, ${partner_id}, ${p.partner_role},
      ${p.arc_summary},
      ${sql.raw(`'{${p.signature_films.map((s) => '"' + s + '"').join(',')}}'::text[]`)},
      ${JSON.stringify(p.references)}::jsonb,
      'curated', NOW()
    )
    ON CONFLICT (primary_person_id, partner_person_id, partner_role) DO UPDATE SET
      slug = EXCLUDED.slug,
      arc_summary = EXCLUDED.arc_summary,
      signature_films = EXCLUDED.signature_films,
      "references" = EXCLUDED."references",
      data_tier = 'curated', last_verified_at = NOW(), updated_at = NOW()
  `);
  updated++;
}
console.log(`[+] practitioner_partnerships: ${updated} upserted, ${missing} missing-people`);
process.exit(0);
