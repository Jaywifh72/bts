// Phase-2 editorial seed for the stunt section: 15 marquee
// performers and coordinators. Idempotent — uses ON CONFLICT (slug)
// DO UPDATE so existing TMDb-imported rows get enriched without
// being overwritten where Studio Pro doesn't have richer data.
//
// Bios are brief original prose synthesizing widely-known industry
// facts (which actor a performer doubled for, signature productions,
// founding role at a stunt company). Facts aren't copyrightable.
// `doubles_for` arrays use canonical actor slugs even when the actor
// isn't yet in `people` — the page resolves and links only existing rows.
import { db, sql } from '../src/index.ts';

function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

type PerformerSeed = {
  slug: string;
  displayName: string;
  bio: string;
  nationality: string;          // ISO 3166-1 alpha-2
  birthYear?: number;
  deathYear?: number;
  stuntDisciplines: string[];
  performerUnion: string | null;
  doublesFor: string[];         // actor slugs
  stuntCompanySlug: string | null;
  trainingSchoolSlugs: string[];
  aliases?: string[];
};

const PERFORMERS: PerformerSeed[] = [
  {
    slug: 'vic-armstrong',
    displayName: 'Vic Armstrong',
    bio:
      `Vic Armstrong is a British stunt coordinator and second-unit director with credits across more than 250 features, holding the Guinness World Record for "most prolific stuntman". He doubled Harrison Ford on the original Indiana Jones trilogy, Christopher Reeve on the original Superman cycle, Sean Connery on multiple Bond entries, and a long roster of other lead actors before transitioning to coordinator and second-unit director work in the 1980s. He runs Action Vehicles out of Pinewood Studios and remains an active second-unit director on tentpole features.`,
    nationality: 'GB',
    birthYear: 1946,
    stuntDisciplines: ['driving', 'horse', 'wirework', 'fight', 'second-unit direction'],
    performerUnion: 'BSR',
    doublesFor: ['harrison-ford', 'christopher-reeve', 'sean-connery', 'arnold-schwarzenegger'],
    stuntCompanySlug: 'action-vehicles',
    trainingSchoolSlugs: [],
  },
  {
    slug: 'andy-armstrong',
    displayName: 'Andy Armstrong',
    bio:
      `Andy Armstrong is a British stunt coordinator and second-unit director — Vic Armstrong's younger brother — with feature credits running through Spider-Man (2002), Eraser, Charlie's Angels, Total Recall, Thor and the Marvel Cinematic Universe pipeline. He has worked extensively as a second-unit director on action-heavy features and shares with Vic a multi-decade career bridging the 1970s practical-stunt tradition into modern hybrid practical-and-digital work.`,
    nationality: 'GB',
    birthYear: 1956,
    stuntDisciplines: ['driving', 'wirework', 'fight', 'second-unit direction', 'fire'],
    performerUnion: 'BSR',
    doublesFor: [],
    stuntCompanySlug: null,
    trainingSchoolSlugs: [],
  },
  {
    slug: 'wade-eastwood',
    displayName: 'Wade Eastwood',
    bio:
      `Wade Eastwood is a British-Australian stunt coordinator and second-unit director who has been the lead stunt coordinator on the Mission: Impossible franchise from Rogue Nation (2015) onward, working closely with Tom Cruise on the practical sequences that define the series. His feature credits also include Ferrari (2023), Skyfall, Edge of Tomorrow, Ready Player One, and Transformers: Age of Extinction. Eastwood's coordination style is built around Cruise's preference for in-camera practical action — the helicopter mid-air work, the Burj Khalifa climb, and the HALO jump in Fallout were all coordinated under his command.`,
    nationality: 'GB',
    birthYear: 1968,
    stuntDisciplines: ['aerial', 'driving', 'motorcycle', 'wirework', 'second-unit direction'],
    performerUnion: 'BSR',
    doublesFor: ['tom-cruise'],
    stuntCompanySlug: null,
    trainingSchoolSlugs: [],
  },
  {
    slug: 'chad-stahelski',
    displayName: 'Chad Stahelski',
    bio:
      `Chad Stahelski began his career as Brandon Lee's stunt double on The Crow (1994), then doubled Keanu Reeves on the original Matrix trilogy and the bulk of Reeves's subsequent feature work. He co-founded 87Eleven Action Design with David Leitch in 1997 to formalise the choreography pipeline they had developed on The Matrix. Stahelski moved into directing with John Wick (2014) and has helmed the four-feature franchise to date; the films built the modern "gun-fu" aesthetic into a franchise template that 87Eleven has subsequently exported across Marvel, Deadpool, and a long list of streaming features.`,
    nationality: 'US',
    birthYear: 1968,
    stuntDisciplines: ['fight', 'gun-fu', 'wirework', 'martial arts', 'second-unit direction'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['keanu-reeves', 'brandon-lee'],
    stuntCompanySlug: '87eleven-action-design',
    trainingSchoolSlugs: [],
  },
  {
    slug: 'david-leitch',
    displayName: 'David Leitch',
    bio:
      `David Leitch was Brad Pitt's long-running stunt double on Fight Club, Mr. & Mrs. Smith, Ocean's Eleven and the Bourne films before co-founding 87Eleven Action Design with Chad Stahelski in 1997. Leitch co-directed John Wick uncredited and then moved into solo direction with Atomic Blonde, Deadpool 2, Hobbs & Shaw, Bullet Train, and The Fall Guy. His direction style preserves the choreographer's bias toward long-take action coverage; second-unit work on the projects he doesn't direct continues to flow through 87Eleven.`,
    nationality: 'US',
    birthYear: 1975,
    stuntDisciplines: ['fight', 'wirework', 'driving', 'second-unit direction'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['brad-pitt', 'matt-damon'],
    stuntCompanySlug: '87eleven-action-design',
    trainingSchoolSlugs: [],
  },
  {
    slug: 'jeannie-epper',
    displayName: 'Jeannie Epper',
    bio:
      `Jeannie Epper was a pioneering American stunt performer who doubled Lynda Carter on the 1970s Wonder Woman television series and worked across more than 100 features and series including Romancing the Stone, Kill Bill, and the X-Files. She came from the Epper family of stunt performers (her father John Epper was a working coordinator from the 1940s) and remained one of the most-credited female stunt performers in the industry through her career. Epper received the Taurus Lifetime Achievement Award in 2007 and was the subject of the documentary Double Dare. She passed in 2024.`,
    nationality: 'US',
    birthYear: 1941,
    deathYear: 2024,
    stuntDisciplines: ['fight', 'horse', 'driving', 'high fall', 'wirework'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['lynda-carter', 'kathleen-turner'],
    stuntCompanySlug: 'stuntmens-association',
    trainingSchoolSlugs: [],
  },
  {
    slug: 'spiro-razatos',
    displayName: 'Spiro Razatos',
    bio:
      `Spiro Razatos is an American second-unit director and stunt coordinator best known for the Fast & Furious franchise, which he has coordinated continuously from Fast Five (2011) through the most recent entries. His earlier credits include the original Captain America: The Winter Soldier (where the bridge fight and DC chase were second-unit work under his command), Bad Boys II, and a long list of Universal and Sony tentpoles. Razatos's coordination style emphasises practical vehicle work — the steel-cable tow rigs and ramp-launched cars that define the Fast franchise's identity.`,
    nationality: 'US',
    birthYear: 1956,
    stuntDisciplines: ['driving', 'motorcycle', 'second-unit direction', 'rigging'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: [],
    stuntCompanySlug: 'stunts-unlimited',
    trainingSchoolSlugs: [],
  },
  {
    slug: 'tanoai-reed',
    displayName: 'Tanoai Reed',
    bio:
      `Tanoai Reed has been Dwayne Johnson's primary stunt double for over two decades — from The Scorpion King (2002) through Black Adam, the Jumanji and Jungle Cruise franchises, and the Fast saga. The two are first cousins through Johnson's Samoan family side, and Reed's work has spanned almost every project Johnson has fronted. His non-Johnson credits include the Marvel Cinematic Universe and Spirit Award-recognised independent action work. Reed has won multiple Taurus World Stunt Awards.`,
    nationality: 'US',
    birthYear: 1974,
    stuntDisciplines: ['fight', 'wirework', 'driving', 'high fall', 'fire'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['dwayne-johnson'],
    stuntCompanySlug: null,
    trainingSchoolSlugs: [],
  },
  {
    slug: 'zoe-bell',
    displayName: 'Zoë Bell',
    bio:
      `Zoë Bell is a New Zealand stunt performer who came to wider attention as Lucy Lawless's double on Xena: Warrior Princess and broke out doubling Uma Thurman across both volumes of Quentin Tarantino's Kill Bill. She subsequently performed her own stunts on the lead role in Tarantino's Death Proof and has worked on Once Upon a Time in Hollywood, Inglourious Basterds, and a long list of independent action features. Bell trained originally through New Zealand's stunt-performer pool and has since coordinated and performed across the US, NZ and Australia.`,
    nationality: 'NZ',
    birthYear: 1978,
    stuntDisciplines: ['fight', 'wirework', 'driving', 'high fall', 'sword'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['uma-thurman', 'lucy-lawless'],
    stuntCompanySlug: null,
    trainingSchoolSlugs: [],
  },
  {
    slug: 'heidi-moneymaker',
    displayName: 'Heidi Moneymaker',
    bio:
      `Heidi Moneymaker doubled Scarlett Johansson across the Marvel Cinematic Universe through the Black Widow solo feature, with additional credits including Captain Marvel, Avengers: Infinity War / Endgame, Lucy and a long roster of independent features. A former NCAA gymnast (UCLA), her transition into stunt work in the early 2000s established a fitness-first physical preparation pipeline that became a recognisable approach across the modern Marvel coordination pool.`,
    nationality: 'US',
    birthYear: 1979,
    stuntDisciplines: ['fight', 'gymnastics', 'wirework', 'martial arts'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['scarlett-johansson'],
    stuntCompanySlug: '87eleven-action-design',
    trainingSchoolSlugs: [],
  },
  {
    slug: 'casey-oneill',
    displayName: 'Casey O\'Neill',
    bio:
      `Casey O'Neill is a stunt coordinator and second-unit director with credits across the recent Mission: Impossible cycle, the John Wick franchise (where he coordinated alongside 87Eleven's house team), No Time to Die, and several Marvel Cinematic Universe entries. He worked extensively under Vic Armstrong before stepping into lead-coordination roles in the late 2010s.`,
    nationality: 'US',
    stuntDisciplines: ['fight', 'driving', 'wirework', 'second-unit direction'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: [],
    stuntCompanySlug: null,
    trainingSchoolSlugs: [],
  },
  {
    slug: 'eunice-huthart',
    displayName: 'Eunice Huthart',
    bio:
      `Eunice Huthart is a British stunt performer and coordinator who doubled Angelina Jolie across the Lara Croft: Tomb Raider films, Mr. & Mrs. Smith, Wanted, Salt, and Maleficent, and continues to coordinate UK-shot productions. Her career began through the British Stunt Register's discipline-tested entry route and she has held the role of stunt coordinator on multiple BAFTA-recognised features including Atonement and several Bond entries.`,
    nationality: 'GB',
    birthYear: 1968,
    stuntDisciplines: ['fight', 'wirework', 'driving', 'high fall'],
    performerUnion: 'BSR',
    doublesFor: ['angelina-jolie'],
    stuntCompanySlug: null,
    trainingSchoolSlugs: ['ics-stunts'],
  },
  {
    slug: 'glenn-wilder',
    displayName: 'Glenn Wilder',
    bio:
      `Glenn Wilder was an American stunt performer and coordinator who co-founded Stunts Unlimited with Hal Needham and Ronnie Rondell Jr. in 1970. He worked on more than 200 features across a four-decade career — Logan's Run, Magnum Force, Smokey and the Bandit, the Cannonball Run series, and recurring credits across Burt Reynolds and Clint Eastwood pictures of the 1970s and 1980s. He passed in 2010.`,
    nationality: 'US',
    birthYear: 1933,
    deathYear: 2010,
    stuntDisciplines: ['driving', 'high fall', 'fight', 'fire'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['burt-reynolds'],
    stuntCompanySlug: 'stunts-unlimited',
    trainingSchoolSlugs: [],
  },
  {
    slug: 'hal-needham',
    displayName: 'Hal Needham',
    bio:
      `Hal Needham was an American stuntman, coordinator and director who doubled Burt Reynolds across most of Reynolds's lead-actor career and co-founded Stunts Unlimited in 1970. Needham transitioned from coordinator into directing with Smokey and the Bandit (1977) and continued through Hooper, The Cannonball Run, and Stroker Ace. He received an Academy Honorary Award in 2012 for contributions to the stunt-coordinator profession. He passed in 2013.`,
    nationality: 'US',
    birthYear: 1931,
    deathYear: 2013,
    stuntDisciplines: ['driving', 'high fall', 'fight', 'fire'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: ['burt-reynolds'],
    stuntCompanySlug: 'stunts-unlimited',
    trainingSchoolSlugs: [],
  },
  {
    slug: 'mike-massa',
    displayName: 'Mike Massa',
    bio:
      `Mike Massa is an American stunt coordinator and second-unit director with credits across Mad Max: Fury Road (where he worked alongside Guy Norris on the convoy and pole-cat sequences), the Marvel Cinematic Universe pipeline, and several Christopher Nolan features. His coordination style sits at the crossover between practical vehicle work and the safety pipelines that modern productions require for high-rigging sequences.`,
    nationality: 'US',
    stuntDisciplines: ['driving', 'wirework', 'rigging', 'second-unit direction'],
    performerUnion: 'SAG-AFTRA',
    doublesFor: [],
    stuntCompanySlug: null,
    trainingSchoolSlugs: [],
  },
];

let inserted = 0;
let updated = 0;

for (const p of PERFORMERS) {
  const r = await db.execute<{ id: number; created_at: string; updated_at: string }>(sql`
    INSERT INTO people (
      slug, display_name, country, bio, birth_date, death_date,
      stunt_disciplines, performer_union, doubles_for,
      stunt_company_slug, training_school_slugs, aliases
    ) VALUES (
      ${p.slug}, ${p.displayName}, ${p.nationality}, ${p.bio},
      ${p.birthYear ? `${p.birthYear}-01-01` : null}::date,
      ${p.deathYear ? `${p.deathYear}-01-01` : null}::date,
      ${pgTextArray(p.stuntDisciplines)}::text[],
      ${p.performerUnion},
      ${pgTextArray(p.doublesFor)}::text[],
      ${p.stuntCompanySlug},
      ${pgTextArray(p.trainingSchoolSlugs)}::text[],
      ${pgTextArray(p.aliases ?? [])}::text[]
    )
    ON CONFLICT (slug) DO UPDATE SET
      display_name = EXCLUDED.display_name,
      country = COALESCE(people.country, EXCLUDED.country),
      bio = EXCLUDED.bio,
      birth_date = COALESCE(people.birth_date, EXCLUDED.birth_date),
      death_date = COALESCE(people.death_date, EXCLUDED.death_date),
      stunt_disciplines = EXCLUDED.stunt_disciplines,
      performer_union = EXCLUDED.performer_union,
      doubles_for = EXCLUDED.doubles_for,
      stunt_company_slug = EXCLUDED.stunt_company_slug,
      training_school_slugs = EXCLUDED.training_school_slugs,
      updated_at = NOW()
    RETURNING id, created_at::text, updated_at::text
  `);
  const row = r[0]!;
  if (row.created_at === row.updated_at) {
    inserted++;
    console.log(`  [+] ${p.slug.padEnd(28)} — new row`);
  } else {
    updated++;
    console.log(`  [~] ${p.slug.padEnd(28)} — enriched existing row`);
  }
}

console.log(`\nseeded ${PERFORMERS.length} performers — ${inserted} new, ${updated} enriched`);
process.exit(0);
