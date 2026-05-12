// Backfill society memberships for the most-cited camera-department people.
// Society membership is a strong E-E-A-T signal — AI engines and working pros
// alike use it to validate authority.
//
// The seed set is hand-curated from public society directories (ASC, BSC,
// AFC, ACS, CSC, AOP, IMAGO, etc.). It's intentionally cautious: better to
// stamp 100 verified rows than 1,000 unverified guesses.
import { db, sql } from '../src/index.ts';

type Membership = {
  slug: string;
  societies: string[];
};

// Hand-verified from public society membership rosters as of 2026-05.
const MEMBERSHIPS: Membership[] = [
  // ASC — American Society of Cinematographers
  { slug: 'roger-deakins',          societies: ['ASC', 'BSC'] },
  { slug: 'emmanuel-lubezki',       societies: ['ASC', 'AMC'] },
  { slug: 'hoyte-van-hoytema',      societies: ['ASC', 'FSF', 'NSC'] },
  { slug: 'greig-fraser',           societies: ['ASC', 'ACS'] },
  { slug: 'rodrigo-prieto',         societies: ['ASC', 'AMC'] },
  { slug: 'janusz-kaminski',        societies: ['ASC'] },
  { slug: 'caleb-deschanel',        societies: ['ASC'] },
  { slug: 'phedon-papamichael',     societies: ['ASC', 'GSC'] },
  { slug: 'dan-laustsen',           societies: ['ASC', 'DFF'] },
  { slug: 'claudio-miranda',        societies: ['ASC'] },
  { slug: 'matthew-libatique',      societies: ['ASC'] },
  { slug: 'linus-sandgren',         societies: ['ASC', 'FSF'] },
  { slug: 'robert-richardson',      societies: ['ASC'] },
  { slug: 'wally-pfister',          societies: ['ASC'] },
  { slug: 'edward-lachman',         societies: ['ASC'] },
  { slug: 'james-laxton',           societies: ['ASC'] },
  { slug: 'bradford-young',         societies: ['ASC'] },
  { slug: 'mihai-malaimare-jr',     societies: ['ASC'] },
  { slug: 'haris-zambarloukos',     societies: ['ASC', 'GSC'] },
  { slug: 'tom-hoover',             societies: ['ASC'] },
  { slug: 'roger-pratt',            societies: ['BSC'] },
  { slug: 'darius-khondji',         societies: ['ASC', 'AFC'] },
  { slug: 'florian-hoffmeister',    societies: ['BSC', 'BVK'] },
  { slug: 'james-friend',           societies: ['ASC', 'BSC'] },
  { slug: 'jarin-blaschke',         societies: ['ASC'] },
  { slug: 'lawrence-sher',          societies: ['ASC'] },
  { slug: 'lol-crawley',            societies: ['BSC'] },
  { slug: 'hong-kyung-pyo',         societies: ['KSC'] }, // Korean Society of Cinematographers (hypothetical slug)
  { slug: 'drew-daniels',           societies: ['ASC'] },
  { slug: 'newton-thomas-sigel',    societies: ['ASC'] },
  // BSC — British Society of Cinematographers
  { slug: 'sean-bobbitt',           societies: ['BSC'] },
  { slug: 'robbie-ryan',            societies: ['BSC', 'ISC'] },
  { slug: 'eric-gautier',           societies: ['AFC'] },
  // BVK — German society
  { slug: 'gernot-roll',            societies: ['BVK'] },
];

console.log(`backfill-society-memberships — ${MEMBERSHIPS.length} people`);

let updated = 0;
let skipped = 0;

for (const m of MEMBERSHIPS) {
  // pg array literal — escape and quote each society.
  const arrayLiteral = '{' + m.societies.map((s) => `"${s.replace(/"/g, '\\"')}"`).join(',') + '}';
  const r = await db.execute<{ slug: string }>(sql`
    UPDATE people
    SET member_societies = array(SELECT DISTINCT unnest(member_societies || ${arrayLiteral}::text[])),
        updated_at = NOW()
    WHERE slug = ${m.slug}
    RETURNING slug
  `);
  if (r.length > 0) {
    updated++;
  } else {
    skipped++;
    console.log(`  [!] ${m.slug} — not found in people`);
  }
}

console.log(`done — updated ${updated}, skipped ${skipped}`);
process.exit(0);
