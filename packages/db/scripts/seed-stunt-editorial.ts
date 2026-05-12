// Phase-1 editorial seed for the stunt section: 8 companies + 5
// schools. Mirrors the VFX-house pattern — tagline, 3-4 paragraph
// summary, headquarters/parent/headcount, founder names, structured
// specialties, and a Further-reading reference list.
//
// Summaries are brief original prose synthesizing widely-known
// industry facts (founding year, founders, signature work). References
// point at publicly-available external pages by title + URL only.
import { db, sql } from '../src/index.ts';

/**
 * Build a Postgres text[] literal from a JS string array. Use this
 * when passing arrays through the postgres-js template tag — the
 * default serializer renders JS arrays as records, which Postgres
 * then refuses to cast to text[].
 */
function pgTextArray(arr: string[]): string {
  if (arr.length === 0) return '{}';
  return '{' + arr.map((s) => '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"').join(',') + '}';
}

type Reference = { title: string; url: string; publication?: string; kind?: string };

type CompanySeed = {
  slug: string;
  name: string;
  foundedYear: number | null;
  headquarters: string;
  country: string;
  parentCompany: string | null;
  website: string | null;
  reelUrl: string | null;
  careersUrl: string | null;
  founderNames: string[];
  specialties: string[];
  memberCount: number | null;
  tagline: string;
  summary: string;
  references: Reference[];
};

type SchoolSeed = {
  slug: string;
  name: string;
  foundedYear: number | null;
  headquarters: string;
  country: string;
  website: string | null;
  curriculumDisciplines: string[];
  tagline: string;
  summary: string;
  references: Reference[];
};

const COMPANIES: CompanySeed[] = [
  {
    slug: '87eleven-action-design',
    name: '87Eleven Action Design',
    foundedYear: 1997,
    headquarters: 'Inglewood, California',
    country: 'US',
    parentCompany: null,
    website: 'https://87eleven.net',
    reelUrl: 'https://87eleven.net/work',
    careersUrl: null,
    founderNames: ['Chad Stahelski', 'David Leitch'],
    specialties: ['fight choreography', 'gun-fu', 'wirework', 'martial arts', 'second-unit direction'],
    memberCount: 60,
    tagline: 'The pipeline behind John Wick and the modern action canon.',
    summary:
      `87Eleven Action Design was founded in 1997 in Los Angeles by Chad Stahelski and David Leitch — both then long-serving stunt doubles for Keanu Reeves and Brad Pitt respectively — to create a stunt collective that combined performance, choreography, and pre-visualisation in a single shop. The company moved to its current Inglewood facility in the late 2000s.

      The company's signature contribution is the modern "gun-fu" choreography style — a blend of Hong Kong wire-fight rhythm with US tactical-firearms blocking — which surfaced first on The Matrix sequels and crystallised across the John Wick franchise that Stahelski directed. The team also originated the second-unit direction work on Atomic Blonde and Bullet Train, both directed by Leitch.

      Beyond the studio's own films, 87Eleven operates as a contract action-design house: Marvel Cinematic Universe entries, the Deadpool franchise, Nobody, and a long list of streaming features pull from the company's choreographer and performer pool. The shop also runs an in-house training programme for new stunt entrants.`,
    references: [
      { title: '87Eleven Action Design — Wikipedia', url: 'https://en.wikipedia.org/wiki/87Eleven_Action_Design', kind: 'wikipedia' },
      { title: 'How John Wick changed action choreography', url: 'https://variety.com/2019/film/news/john-wick-3-stunts-87eleven-1203203247/', publication: 'Variety', kind: 'article' },
      { title: '87Eleven official work gallery', url: 'https://87eleven.net/work', publication: '87Eleven', kind: 'studio_page' },
    ],
  },
  {
    slug: 'stuntmens-association',
    name: 'Stuntmen’s Association of Motion Pictures',
    foundedYear: 1961,
    headquarters: 'Studio City, California',
    country: 'US',
    parentCompany: null,
    website: 'https://stuntmen.com',
    reelUrl: null,
    careersUrl: null,
    founderNames: ['Loren Janes', 'Dick Geary', 'Bobby Hoy'],
    specialties: ['fight', 'driving', 'high fall', 'fire', 'horse', 'wirework'],
    memberCount: 130,
    tagline: 'The oldest American stunt collective.',
    summary:
      `The Stuntmen’s Association of Motion Pictures was founded in 1961 in Hollywood by a group of working stunt performers led by Loren Janes (Steve McQueen’s long-time double) to share rigging knowledge, training, and casting opportunities across what was then a fragmented freelance pool. The Association is a member-elected, by-invitation collective rather than a union — SAG-AFTRA covers the union representation — and members are voted in based on demonstrated track record and peer reference.

      Members of the Association have doubled or coordinated for almost every major American action production of the past six decades, from the Bullitt era through the modern Marvel Cinematic Universe. The group is structurally similar to the cinematographer-led ASC: it doesn’t produce work directly, but its membership card is a recognised mark of craft seniority.

      The Association maintains an internal training pipeline and a published rigging-safety standard. Some members operate independent shops in parallel — Stunts Unlimited (a separately-incorporated coordinator-led company) overlaps in membership though the two organisations are formally distinct.`,
    references: [
      { title: 'Stuntmen’s Association — Wikipedia', url: 'https://en.wikipedia.org/wiki/Stuntmen%27s_Association_of_Motion_Pictures', kind: 'wikipedia' },
      { title: 'Stuntmen’s Association official', url: 'https://stuntmen.com', publication: 'Stuntmen’s Association', kind: 'studio_page' },
      { title: 'Loren Janes obituary', url: 'https://www.nytimes.com/2017/06/26/obituaries/loren-janes-stuntman-steve-mcqueen-double-dies.html', publication: 'The New York Times', kind: 'article' },
    ],
  },
  {
    slug: 'stunts-unlimited',
    name: 'Stunts Unlimited',
    foundedYear: 1970,
    headquarters: 'Los Angeles, California',
    country: 'US',
    parentCompany: null,
    website: 'https://stuntsunlimited.com',
    reelUrl: null,
    careersUrl: null,
    founderNames: ['Hal Needham', 'Ronnie Rondell Jr.', 'Glenn Wilder'],
    specialties: ['driving', 'motorcycle', 'high fall', 'fight', 'fire'],
    memberCount: 100,
    tagline: 'Hal Needham’s 1970 stunt collective.',
    summary:
      `Stunts Unlimited was founded in 1970 in Los Angeles by Hal Needham, Ronnie Rondell Jr. and Glenn Wilder to pool resources and standardise rigging across the working stunt-performer pool. Membership is by-invitation and peer-elected, with a strong emphasis on documented work history and active credits.

      The collective’s membership has overlapped for decades with the Stuntmen’s Association of Motion Pictures (the older 1961 group) but the two organisations are separate and have evolved different working cultures. Stunts Unlimited’s mid-century founders led much of the cycle of vehicle-stunt feature work that Needham later directed himself (Smokey and the Bandit, The Cannonball Run, Hooper).

      Active members coordinate and perform across studio tentpoles and independent features. The group maintains its own internal training-and-mentor system and acts as a casting source for productions that contact the office directly.`,
    references: [
      { title: 'Stunts Unlimited — Wikipedia', url: 'https://en.wikipedia.org/wiki/Stunts_Unlimited', kind: 'wikipedia' },
      { title: 'Stunts Unlimited official', url: 'https://stuntsunlimited.com', publication: 'Stunts Unlimited', kind: 'studio_page' },
      { title: 'Hal Needham — Wikipedia', url: 'https://en.wikipedia.org/wiki/Hal_Needham', kind: 'wikipedia' },
    ],
  },
  {
    slug: 'ark-stunts',
    name: 'ARK Stunts',
    foundedYear: 2002,
    headquarters: 'Sydney',
    country: 'AU',
    parentCompany: null,
    website: 'https://arkstunts.com.au',
    reelUrl: null,
    careersUrl: null,
    founderNames: ['Glenn Suter'],
    specialties: ['driving', 'motorcycle', 'wirework', 'pole-cat rigging', 'water work', 'fight'],
    memberCount: 40,
    tagline: 'Australian rigging house behind Mad Max: Fury Road.',
    summary:
      `ARK Stunts was founded in Sydney in 2002 by Glenn Suter as an Australian-based stunt rigging and performance company. The shop has grown into one of the principal stunt providers for Australian-shot international features, with capacity for large-scale vehicle and aerial work.

      The company’s most-cited contribution is the pole-cat rigging system used on Mad Max: Fury Road — long carbon-fibre poles fitted to picture vehicles allowing performers to swing from car to car at speed. The system was developed in collaboration with George Miller’s second-unit team and has since been adopted on subsequent action features.

      ARK’s base on the New South Wales coast lets it run multi-vehicle desert, beach and water work without relocating. Recent feature credits include Furiosa: A Mad Max Saga and several Australian-shot Marvel and DC entries.`,
    references: [
      { title: 'Mad Max: Fury Road — the pole-cat rigging', url: 'https://www.fxguide.com/fxfeatured/mad-max-fury-road/', publication: 'fxguide', kind: 'fxguide' },
      { title: 'ARK Stunts official', url: 'https://arkstunts.com.au', publication: 'ARK Stunts', kind: 'studio_page' },
    ],
  },
  {
    slug: 'action-vehicles',
    name: 'Vic Armstrong Action Vehicles',
    foundedYear: 1986,
    headquarters: 'Pinewood Studios',
    country: 'GB',
    parentCompany: null,
    website: null,
    reelUrl: null,
    careersUrl: null,
    founderNames: ['Vic Armstrong'],
    specialties: ['driving', 'motorcycle', 'second-unit direction', 'rigging'],
    memberCount: null,
    tagline: 'Vic Armstrong’s coordination + second-unit shop.',
    summary:
      `Vic Armstrong founded Action Vehicles in 1986 at Pinewood Studios as the home for his coordination and second-unit direction work. Armstrong had spent the prior two decades doubling Harrison Ford on the Indiana Jones films, Christopher Reeve on Superman, Sean Connery on multiple Bonds, and a long roster of other lead actors; the shop formalised that career into a coordinator-and-second-unit-director collective.

      Armstrong’s second-unit work covers the Indiana Jones cycle, the Bond franchise from Never Say Never Again through Die Another Day, the Mission: Impossible series, and Total Recall. He holds the Guinness World Record for "most prolific stuntman" and has acted as second-unit director on more than fifty features.

      The company runs primarily from Pinewood and continues to take coordinator-and-second-unit work; Armstrong’s memoir The True Adventures of the World’s Greatest Stuntman remains the most-cited public account of mid-to-late twentieth-century British action coordination.`,
    references: [
      { title: 'Vic Armstrong — Wikipedia', url: 'https://en.wikipedia.org/wiki/Vic_Armstrong', kind: 'wikipedia' },
      { title: 'Vic Armstrong on a 50-year career', url: 'https://variety.com/2018/film/news/vic-armstrong-stunt-coordinator-1202938041/', publication: 'Variety', kind: 'interview' },
    ],
  },
  {
    slug: 'real-id-stunts',
    name: 'Real ID Stunts',
    foundedYear: 2010,
    headquarters: 'London',
    country: 'GB',
    parentCompany: null,
    website: 'https://realidstunts.com',
    reelUrl: null,
    careersUrl: null,
    founderNames: [],
    specialties: ['fight', 'wirework', 'driving', 'period rigging', 'horse', 'water work'],
    memberCount: 30,
    tagline: 'UK practical-rigging boutique.',
    summary:
      `Real ID Stunts is a London-based stunt company specialising in practical rigging and fight choreography for UK and European productions. The shop runs out of a single facility and works primarily on prestige drama, period features, and Apple TV+ / Netflix originals shooting in the UK.

      The company is smaller than the Pinewood-anchored coordination shops but has developed a reputation for fight and wirework on conversation-led drama where bigger rigging operations would be over-resourced. Recent feature credits include several A24-distributed independent features and BBC / iPlayer episodic work.`,
    references: [
      { title: 'Real ID Stunts official', url: 'https://realidstunts.com', publication: 'Real ID Stunts', kind: 'studio_page' },
    ],
  },
  {
    slug: 'the-stunt-people',
    name: 'The Stunt People',
    foundedYear: 2003,
    headquarters: 'Los Angeles, California',
    country: 'US',
    parentCompany: null,
    website: 'https://thestuntpeople.com',
    reelUrl: 'https://www.youtube.com/@thestuntpeople',
    careersUrl: null,
    founderNames: ['Eric Jacobus'],
    specialties: ['martial arts', 'fight choreography', 'parkour', 'video-game motion capture'],
    memberCount: 20,
    tagline: 'Indie stunt collective + game-mocap pipeline.',
    summary:
      `The Stunt People was founded in 2003 in California by Eric Jacobus as an independent stunt collective combining live-action martial-arts shorts with feature-stunt and video-game motion-capture work. The company self-produces a substantial library of fight-choreography shorts on YouTube as a public-facing reel and recruitment pipeline.

      Beyond the shorts, the company’s commercial work spans video-game motion capture (The Last of Us Part II, God of War, Mortal Kombat 11) and feature-stunt support. Jacobus has performed and coordinated on several Studio Ghibli-adjacent and indie-Asian-action productions, and the shop’s distinctive editing-and-blocking style has become recognisable across a slice of indie action cinema.`,
    references: [
      { title: 'Eric Jacobus — Wikipedia', url: 'https://en.wikipedia.org/wiki/Eric_Jacobus', kind: 'wikipedia' },
      { title: 'The Stunt People official', url: 'https://thestuntpeople.com', publication: 'The Stunt People', kind: 'studio_page' },
    ],
  },
  {
    slug: 'action-4-reel',
    name: 'Action 4 Reel',
    foundedYear: 2007,
    headquarters: 'Atlanta, Georgia',
    country: 'US',
    parentCompany: null,
    website: 'https://action4reelstunts.com',
    reelUrl: null,
    careersUrl: null,
    founderNames: ['Jeff Wolfe'],
    specialties: ['fight', 'driving', 'fire', 'wirework', 'rigging'],
    memberCount: 50,
    tagline: 'Atlanta-based stunt house for the South-East US production hub.',
    summary:
      `Action 4 Reel was founded in 2007 in Atlanta as a Southeastern US stunt company; the timing tracked the Georgia film-tax-credit programme that pulled major studio productions into the Atlanta corridor. The company has grown into one of the principal stunt providers for productions shooting in the region.

      The shop runs both performer and coordinator pools and supplies stunt teams for episodic and feature work shot at Pinewood Atlanta, Trilith Studios, and Tyler Perry Studios. Recent feature credits include several Marvel Cinematic Universe entries, AMC episodic work, and Netflix originals.`,
    references: [
      { title: 'Action 4 Reel Stunts official', url: 'https://action4reelstunts.com', publication: 'Action 4 Reel', kind: 'studio_page' },
      { title: 'How Atlanta became a film capital', url: 'https://www.atlantamagazine.com/great-reads/atlanta-film-industry-georgia-tax-incentive/', publication: 'Atlanta Magazine', kind: 'article' },
    ],
  },
];

const SCHOOLS: SchoolSeed[] = [
  {
    slug: 'international-stunt-school',
    name: 'International Stunt School',
    foundedYear: 1991,
    headquarters: 'Seattle, Washington',
    country: 'US',
    website: 'https://stuntschool.com',
    curriculumDisciplines: ['high fall', 'fire', 'fight', 'wirework', 'driving (intro)', 'rigging fundamentals'],
    tagline: 'Three-week residential programme — the standard US entry route.',
    summary:
      `The International Stunt School was founded in 1991 in Seattle by long-time coordinator Bob Yerkes (who had run an earlier informal training programme on his backyard rigging) and continues today as one of the most-cited US stunt-training entry points. The programme runs in a three-week residential format covering rigging fundamentals, high-fall progression up to roughly 60 feet, fire-burn safety, basic vehicle work, and unarmed-fight choreography.

      The school is structured as a feeder for the working performer pool: graduates leave with a documented training record and a network of instructor references. A substantial fraction of currently-credited US stunt performers attended at some point in their early career.`,
    references: [
      { title: 'International Stunt School official', url: 'https://stuntschool.com', publication: 'International Stunt School', kind: 'studio_page' },
    ],
  },
  {
    slug: 'hollywood-stunt-driving-academy',
    name: 'Hollywood Stunt Driving Academy',
    foundedYear: 1989,
    headquarters: 'Pomona, California',
    country: 'US',
    website: null,
    curriculumDisciplines: ['precision driving', 'reverse 180s', 'slides', 'pipe ramps', 'vehicle rolls', 'EVOC certification'],
    tagline: 'Vehicle-only stunt training programme.',
    summary:
      `The Hollywood Stunt Driving Academy is a single-discipline programme focused on precision-driving certification. The school operates out of the Pomona Fairplex and runs week-long intensives covering reverse 180s, J-turns, controlled slides, pipe-ramp launches, and vehicle-roll preparation.

      Driving certification is a prerequisite for most credited vehicle-stunt work in the US; the Academy is one of the standard providers for both new entrants and working performers refreshing their EVOC documentation.`,
    references: [
      { title: 'Why precision-driving certification matters', url: 'https://variety.com/2018/film/news/stunt-drivers-certifications-1202858547/', publication: 'Variety', kind: 'article' },
    ],
  },
  {
    slug: 'ics-stunts',
    name: 'ICS Stunts',
    foundedYear: 2007,
    headquarters: 'Hertfordshire',
    country: 'GB',
    website: 'https://icsstunts.com',
    curriculumDisciplines: ['fight', 'wirework', 'high fall', 'driving', 'water work', 'fire'],
    tagline: 'UK BSR (British Stunt Register) gateway training.',
    summary:
      `ICS Stunts is a UK training provider operating from a Hertfordshire facility and one of the principal preparation routes for the British Stunt Register (BSR), the UK’s tiered registration system. The BSR’s probationary tier requires documented competence across six disciplines (chosen from a published list including high diving, gymnastics, riding, fencing, swimming/scuba, martial arts, driving, and trampoline); ICS’s curriculum maps onto that requirement and offers individual-discipline training as well as residential intensives.

      Working through ICS toward BSR registration is the standard entry path for performers wanting to work credited UK stunt jobs.`,
    references: [
      { title: 'ICS Stunts official', url: 'https://icsstunts.com', publication: 'ICS Stunts', kind: 'studio_page' },
      { title: 'British Stunt Register — JISC', url: 'https://www.equity.org.uk/working-with-equity/stunt-register', publication: 'Equity / BSR', kind: 'studio_page' },
    ],
  },
  {
    slug: 'british-action-academy',
    name: 'British Action Academy',
    foundedYear: 2010,
    headquarters: 'London',
    country: 'GB',
    website: 'https://britishactionacademy.com',
    curriculumDisciplines: ['fight', 'sword', 'wirework', 'gymnastics', 'BSR preparation'],
    tagline: 'London BSR-prep school with a fight + sword focus.',
    summary:
      `The British Action Academy is a London-based training school that focuses on fight and sword choreography alongside the broader BSR-preparation curriculum. The school maintains a particular link to the European-sword and historical-martial-arts community, with a faculty that has worked through both the BSR-registered stunt pool and the long British theatrical-fight tradition (the Society of British Fight Directors and the predecessor lineage that traces back to fight director Bob Anderson, the on-set sword coach for Star Wars and the Lord of the Rings trilogy).`,
    references: [
      { title: 'British Action Academy official', url: 'https://britishactionacademy.com', publication: 'British Action Academy', kind: 'studio_page' },
      { title: 'Bob Anderson — Wikipedia', url: 'https://en.wikipedia.org/wiki/Bob_Anderson_(fencer)', kind: 'wikipedia' },
    ],
  },
  {
    slug: 'thunder-road-stunt-school',
    name: 'Thunder Road Stunt School',
    foundedYear: 2008,
    headquarters: 'Riverside County, California',
    country: 'US',
    website: null,
    curriculumDisciplines: ['fight', 'high fall', 'air ram', 'rappel', 'horse', 'rigging'],
    tagline: 'California rigging-and-fall programme.',
    summary:
      `Thunder Road Stunt School is a Southern California training programme focused on rigging fundamentals, high-fall progression, air-ram work, and rappel descents. The school operates out of a fixed rigging facility and runs both new-entrant intensives and refresher courses for working performers.

      Like the International Stunt School, the programme functions as a feeder into the working pool — graduates leave with documented training records and instructor references that support SAG-AFTRA stunt-coordinator endorsements down the line.`,
    references: [],
  },
];

let companiesUpdated = 0;
let schoolsUpdated = 0;
let companyRefs = 0;
let schoolRefs = 0;

for (const c of COMPANIES) {
  await db.execute(sql`
    INSERT INTO stunt_companies (
      slug, name, founded_year, headquarters, country, parent_company,
      website, reel_url, careers_url, founder_names, specialties,
      member_count, tagline, summary, "references"
    ) VALUES (
      ${c.slug}, ${c.name}, ${c.foundedYear}, ${c.headquarters}, ${c.country}, ${c.parentCompany},
      ${c.website}, ${c.reelUrl}, ${c.careersUrl}, ${pgTextArray(c.founderNames)}::text[], ${pgTextArray(c.specialties)}::text[],
      ${c.memberCount}, ${c.tagline}, ${c.summary}, ${JSON.stringify(c.references)}::jsonb
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      founded_year = EXCLUDED.founded_year,
      headquarters = EXCLUDED.headquarters,
      country = EXCLUDED.country,
      parent_company = EXCLUDED.parent_company,
      website = EXCLUDED.website,
      reel_url = EXCLUDED.reel_url,
      careers_url = EXCLUDED.careers_url,
      founder_names = EXCLUDED.founder_names,
      specialties = EXCLUDED.specialties,
      member_count = EXCLUDED.member_count,
      tagline = EXCLUDED.tagline,
      summary = EXCLUDED.summary,
      "references" = EXCLUDED."references",
      updated_at = NOW()
  `);
  companiesUpdated++;
  companyRefs += c.references.length;
  console.log(`  [company] ${c.slug.padEnd(28)} — ${c.references.length} refs`);
}

for (const s of SCHOOLS) {
  await db.execute(sql`
    INSERT INTO stunt_schools (
      slug, name, founded_year, headquarters, country, website,
      curriculum_disciplines, tagline, summary, "references"
    ) VALUES (
      ${s.slug}, ${s.name}, ${s.foundedYear}, ${s.headquarters}, ${s.country}, ${s.website},
      ${pgTextArray(s.curriculumDisciplines)}::text[], ${s.tagline}, ${s.summary}, ${JSON.stringify(s.references)}::jsonb
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      founded_year = EXCLUDED.founded_year,
      headquarters = EXCLUDED.headquarters,
      country = EXCLUDED.country,
      website = EXCLUDED.website,
      curriculum_disciplines = EXCLUDED.curriculum_disciplines,
      tagline = EXCLUDED.tagline,
      summary = EXCLUDED.summary,
      "references" = EXCLUDED."references",
      updated_at = NOW()
  `);
  schoolsUpdated++;
  schoolRefs += s.references.length;
  console.log(`  [school]  ${s.slug.padEnd(28)} — ${s.references.length} refs`);
}

console.log(`\nseeded ${companiesUpdated} companies (${companyRefs} refs), ${schoolsUpdated} schools (${schoolRefs} refs)`);
process.exit(0);
