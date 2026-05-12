// E-17 — ECA (Emerging Cinematographer Awards) recipient seed.
// ICG Local 600's annual award identifying camera-dept professionals
// transitioning into DP roles. We tie recipients to a notable
// production they later shot when the production is in Studio Pro's
// curated set. Source: ICG Magazine ECA archives + ICG press
// releases.
import { db, sql } from '../src/index.ts';

type Recipient = {
  personSlug: string;
  year: number;
  category: string;
  productionSlug?: string;
  shortFilm?: string;
};

const RECIPIENTS: Recipient[] = [
  {
    personSlug: 'pawel-pogorzelski',
    year: 2014,
    category: 'Emerging Cinematographer Award',
    productionSlug: 'midsommar-2019',
    shortFilm: 'The Strange Ones',
  },
];

let inserted = 0;
let skipped = 0;
for (const r of RECIPIENTS) {
  const [person] = await db.execute<{ id: number }>(sql`
    SELECT id FROM people WHERE slug = ${r.personSlug}
  `);
  if (!person) {
    console.warn(`  [miss] person ${r.personSlug}`);
    skipped++;
    continue;
  }
  let productionId: number | null = null;
  if (r.productionSlug) {
    const [prod] = await db.execute<{ id: number }>(sql`
      SELECT id FROM productions WHERE slug = ${r.productionSlug}
    `);
    if (prod) productionId = prod.id;
  }
  if (productionId === null) {
    console.warn(`  [miss] production ${r.productionSlug ?? '(none)'} — ECA needs a production_id, skipping`);
    skipped++;
    continue;
  }
  await db.execute(sql`
    INSERT INTO production_awards (production_id, award_org, category, year, is_winner, recipient_person_id, source_url)
    VALUES (${productionId}, 'eca'::award_org_enum, ${r.category}, ${r.year}, true, ${person.id},
            ${'https://www.icgmagazine.com/eca/' + r.year})
    ON CONFLICT (production_id, award_org, category, year, recipient_person_id) DO NOTHING
  `);
  inserted++;
  console.log(`  [ok] ECA ${r.year} → ${r.personSlug} (later shot ${r.productionSlug})`);
}
console.log(`E-17 ECA seed: ${inserted} inserted, ${skipped} skipped`);
process.exit(0);
