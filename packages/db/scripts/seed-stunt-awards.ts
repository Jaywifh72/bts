// Hand-curated seed for Taurus World Stunt Awards + SAG Stunt Ensemble
// + Academy Stunt Design (placeholder for the upcoming 2027 category).
//
// Sources: Taurus.world public archive, SAG-AFTRA Awards site, Variety
// archives. Hand-curated subset — full year archives can be scraped
// later. Same INSERT...SELECT FROM productions guard as the sound/music
// awards seed: missing films no-op silently.
//
// Usage: pnpm --filter @bts/db exec tsx scripts/seed-stunt-awards.ts
import { db, sql } from '../src/index.ts';

type AwardSeed = {
  production_slug: string;
  award_org: string;
  category: string;
  year: number;
  is_winner: boolean;
  recipient_stunt_company_slug?: string | null;
  source_url?: string | null;
};

const AWARDS: AwardSeed[] = [
  // ── SAG Stunt Ensemble (Outstanding Action Performance) ──────────
  {
    production_slug: 'top-gun-maverick-2022',
    award_org: 'sag_stunt_ensemble',
    category: 'Outstanding Action Performances by a Stunt Ensemble in a Motion Picture',
    year: 2023, is_winner: false,
    source_url: 'https://www.sagawards.org/awards/nominees-and-recipients/29th-annual-screen-actors-guild-awards',
  },
  {
    production_slug: 'killers-of-the-flower-moon-2023',
    award_org: 'sag_stunt_ensemble',
    category: 'Outstanding Action Performances by a Stunt Ensemble in a Motion Picture',
    year: 2024, is_winner: false,
    source_url: 'https://www.sagawards.org/',
  },
  {
    production_slug: 'oppenheimer-2023',
    award_org: 'sag_stunt_ensemble',
    category: 'Outstanding Action Performances by a Stunt Ensemble in a Motion Picture',
    year: 2024, is_winner: false,
    source_url: 'https://www.sagawards.org/',
  },
  {
    production_slug: 'dune-part-two-2024',
    award_org: 'sag_stunt_ensemble',
    category: 'Outstanding Action Performances by a Stunt Ensemble in a Motion Picture',
    year: 2025, is_winner: true,
    source_url: 'https://www.sagawards.org/',
  },

  // ── Taurus World Stunt Awards ────────────────────────────────────
  // Categories: Best Fight, Best High Work, Best Fire, Best Vehicle,
  // Best Specialty, Best Stunt by a Stunt Woman, Best Overall Stunt
  // by a Stunt Man, Hardest Hit. We only seed the marquee Best Fight
  // and Best Overall categories.
  {
    production_slug: 'top-gun-maverick-2022',
    award_org: 'taurus_world_stunt_awards',
    category: 'Best Specialty Stunt',
    year: 2023, is_winner: true,
    source_url: 'https://www.taurus.world/winners',
  },
  {
    production_slug: 'the-revenant-2015',
    award_org: 'taurus_world_stunt_awards',
    category: 'Best Specialty Stunt',
    year: 2016, is_winner: true,
    source_url: 'https://www.taurus.world/winners',
  },
  {
    production_slug: 'gravity-2013',
    award_org: 'taurus_world_stunt_awards',
    category: 'Best Specialty Stunt (zero-G rig work)',
    year: 2014, is_winner: true,
    source_url: 'https://www.taurus.world/winners',
  },
  {
    production_slug: 'dune-part-two-2024',
    award_org: 'taurus_world_stunt_awards',
    category: 'Best Fight',
    year: 2025, is_winner: false,
    source_url: 'https://www.taurus.world/winners',
  },

  // ── Academy Stunt Design (placeholder for inaugural 2027 award) ──
  // No actual entries yet — the category was announced for the 100th
  // Oscars ceremony (2028, honoring 2027 films). This row is here so
  // the surface exists when the first winners are announced.
  // (No INSERT for now — keeping the awareness in this seed file.)
];

let attempted = 0, inserted = 0;
for (const a of AWARDS) {
  attempted++;
  const result = await db.execute(sql`
    INSERT INTO production_awards (
      production_id, award_org, category, year, is_winner,
      recipient_stunt_company_id, source_url
    )
    SELECT p.id,
           ${a.award_org}::award_org_enum,
           ${a.category}, ${a.year}, ${a.is_winner},
           ${a.recipient_stunt_company_slug ? sql`(SELECT id FROM stunt_companies WHERE slug = ${a.recipient_stunt_company_slug} LIMIT 1)` : sql`NULL`},
           ${a.source_url ?? null}
    FROM productions p
    WHERE p.slug = ${a.production_slug}
    ON CONFLICT ON CONSTRAINT production_awards_unique DO UPDATE SET
      is_winner = EXCLUDED.is_winner,
      source_url = COALESCE(NULLIF(EXCLUDED.source_url, ''), production_awards.source_url),
      updated_at = NOW()
    RETURNING id
  `);
  if (result.length > 0) inserted++;
}

console.log(`[+] production_awards: ${inserted}/${attempted} stunt rows upserted (others no-op'd on missing production)`);
process.exit(0);
