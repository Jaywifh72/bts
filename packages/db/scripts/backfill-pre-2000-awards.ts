// Pre-2000 awards backfill. The original ingest path missed Oscars and
// ASC awards for canonical cinematography titles before 2000 (Apocalypse
// Now, Days of Heaven, Barry Lyndon, etc.). This script seeds the
// Cinematography wins + Best Picture wins + a small set of ASC awards.
//
// Idempotent via the production_awards UNIQUE constraint (NULLS NOT
// DISTINCT post-0050). Re-runs are safe.
import { db, sql } from '../src/index.ts';

type AwardSeed = {
  slug: string;
  award_org: 'academy_awards' | 'asc_award' | 'bafta' | 'cannes' | 'golden_globes';
  category: string;
  year: number;
  is_winner: boolean;
  source_url: string;
};

const AWARDS: AwardSeed[] = [
  // Apocalypse Now (1979)
  { slug: 'apocalypse-now-1979', award_org: 'academy_awards', category: 'Best Cinematography', year: 1980, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1980' },
  { slug: 'apocalypse-now-1979', award_org: 'academy_awards', category: 'Best Picture', year: 1980, is_winner: false, source_url: 'https://www.oscars.org/oscars/ceremonies/1980' },
  { slug: 'apocalypse-now-1979', award_org: 'academy_awards', category: 'Best Director', year: 1980, is_winner: false, source_url: 'https://www.oscars.org/oscars/ceremonies/1980' },
  { slug: 'apocalypse-now-1979', award_org: 'cannes', category: "Palme d'Or", year: 1979, is_winner: true, source_url: 'https://www.festival-cannes.com/en/1979' },

  // Days of Heaven (1978)
  { slug: 'days-of-heaven-1978', award_org: 'academy_awards', category: 'Best Cinematography', year: 1979, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1979' },

  // Barry Lyndon (1975)
  { slug: 'barry-lyndon-1975', award_org: 'academy_awards', category: 'Best Cinematography', year: 1976, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1976' },
  { slug: 'barry-lyndon-1975', award_org: 'academy_awards', category: 'Best Production Design', year: 1976, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1976' },
  { slug: 'barry-lyndon-1975', award_org: 'academy_awards', category: 'Best Costume Design', year: 1976, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1976' },
  { slug: 'barry-lyndon-1975', award_org: 'academy_awards', category: 'Best Adapted Score', year: 1976, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1976' },

  // Lawrence of Arabia (1962)
  { slug: 'lawrence-of-arabia-1962', award_org: 'academy_awards', category: 'Best Cinematography', year: 1963, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1963' },
  { slug: 'lawrence-of-arabia-1962', award_org: 'academy_awards', category: 'Best Picture', year: 1963, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1963' },
  { slug: 'lawrence-of-arabia-1962', award_org: 'academy_awards', category: 'Best Director', year: 1963, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1963' },

  // The Godfather (1972)
  { slug: 'the-godfather-1972', award_org: 'academy_awards', category: 'Best Picture', year: 1973, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1973' },
  { slug: 'the-godfather-1972', award_org: 'academy_awards', category: 'Best Adapted Screenplay', year: 1973, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1973' },
  { slug: 'the-godfather-1972', award_org: 'academy_awards', category: 'Best Actor', year: 1973, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1973' },

  // Schindler's List (1993)
  { slug: 'schindlers-list-1993', award_org: 'academy_awards', category: 'Best Cinematography', year: 1994, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1994' },
  { slug: 'schindlers-list-1993', award_org: 'academy_awards', category: 'Best Picture', year: 1994, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1994' },
  { slug: 'schindlers-list-1993', award_org: 'academy_awards', category: 'Best Director', year: 1994, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1994' },

  // Goodfellas (1990)
  { slug: 'goodfellas-1990', award_org: 'academy_awards', category: 'Best Supporting Actor', year: 1991, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1991' },
  { slug: 'goodfellas-1990', award_org: 'academy_awards', category: 'Best Picture', year: 1991, is_winner: false, source_url: 'https://www.oscars.org/oscars/ceremonies/1991' },

  // 2001: A Space Odyssey (1968)
  { slug: '2001-a-space-odyssey-1968', award_org: 'academy_awards', category: 'Best Visual Effects', year: 1969, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1969' },
  { slug: '2001-a-space-odyssey-1968', award_org: 'academy_awards', category: 'Best Director', year: 1969, is_winner: false, source_url: 'https://www.oscars.org/oscars/ceremonies/1969' },

  // Citizen Kane (1941)
  { slug: 'citizen-kane-1941', award_org: 'academy_awards', category: 'Best Original Screenplay', year: 1942, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1942' },
  { slug: 'citizen-kane-1941', award_org: 'academy_awards', category: 'Best Cinematography', year: 1942, is_winner: false, source_url: 'https://www.oscars.org/oscars/ceremonies/1942' },

  // The Conformist (1970) — Vittorio Storaro's first major work; pre-ASC Award era
  { slug: 'the-conformist-1970', award_org: 'academy_awards', category: 'Best Adapted Screenplay', year: 1972, is_winner: false, source_url: 'https://www.oscars.org/oscars/ceremonies/1972' },

  // Raging Bull (1980) — Chapman ASC nominee
  { slug: 'raging-bull-1980', award_org: 'academy_awards', category: 'Best Cinematography', year: 1981, is_winner: false, source_url: 'https://www.oscars.org/oscars/ceremonies/1981' },
  { slug: 'raging-bull-1980', award_org: 'academy_awards', category: 'Best Actor', year: 1981, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1981' },
  { slug: 'raging-bull-1980', award_org: 'academy_awards', category: 'Best Film Editing', year: 1981, is_winner: true, source_url: 'https://www.oscars.org/oscars/ceremonies/1981' },
];

console.log(`backfill-pre-2000-awards — ${AWARDS.length} award rows`);
let inserted = 0;
let updated = 0;
let skipped = 0;
for (const a of AWARDS) {
  try {
    const r = await db.execute<{ created_at: string; updated_at: string }>(sql`
      INSERT INTO production_awards (production_id, award_org, category, year, is_winner, source_url)
      SELECT prod.id, ${a.award_org}::award_org_enum, ${a.category}, ${a.year}, ${a.is_winner}, ${a.source_url}
      FROM productions prod WHERE prod.slug = ${a.slug}
      ON CONFLICT ON CONSTRAINT production_awards_unique DO UPDATE SET
        is_winner = EXCLUDED.is_winner,
        source_url = EXCLUDED.source_url,
        updated_at = NOW()
      RETURNING created_at::text, updated_at::text
    `);
    if (r.length === 0) {
      skipped++;
      console.log(`  [!] ${a.slug} — production not found`);
    } else if (r[0]!.created_at === r[0]!.updated_at) {
      inserted++;
    } else {
      updated++;
    }
  } catch (e) {
    console.error(`  [✗] ${a.slug} ${a.category}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
console.log(`done — inserted ${inserted}, updated ${updated}, skipped ${skipped}`);
process.exit(0);
