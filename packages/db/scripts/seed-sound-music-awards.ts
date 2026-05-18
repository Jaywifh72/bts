// Hand-curated seed for MPSE Golden Reel, CAS, ACE Eddie, SCL — the
// society awards that power the new sound-design / dialogue-adr /
// music-editing / score / editing / music-supervision craft pages.
//
// Sources: each org's public winners page (oscars.org analog). Only
// flagship category winners 2018-2024 — full archives can be scraped
// later. Each row uses INSERT...SELECT FROM productions WHERE slug = ...
// so missing films no-op silently.
//
// Usage: pnpm --filter @bts/db exec tsx scripts/seed-sound-music-awards.ts
import { db, sql } from '../src/index.ts';

type AwardSeed = {
  production_slug: string;
  award_org: string;        // award_org_enum value
  category: string;
  year: number;
  is_winner: boolean;
  // Optional recipient (lookup by slug). Most society sound/music awards
  // credit individuals; we attach to whichever side has the slug.
  recipient_person_slug?: string | null;
  source_url?: string | null;
};

const AWARDS: AwardSeed[] = [
  // ── MPSE Golden Reel (Motion Picture Sound Editors) ──────────────
  // Winners only; categories simplified to "Sound Effects & Foley" /
  // "Dialogue & ADR" / "Music Editing" (their actual names with the
  // year-specific prefixes removed).
  {
    production_slug: 'dune-2021',
    award_org: 'mpse_golden_reel',
    category: 'Sound Effects & Foley — Feature',
    year: 2022, is_winner: true,
    source_url: 'https://mpse.org/golden-reel-awards/',
  },
  {
    production_slug: 'dune-part-two-2024',
    award_org: 'mpse_golden_reel',
    category: 'Sound Effects & Foley — Feature',
    year: 2025, is_winner: true,
    source_url: 'https://mpse.org/golden-reel-awards/',
  },
  {
    production_slug: 'top-gun-maverick-2022',
    award_org: 'mpse_golden_reel',
    category: 'Sound Effects & Foley — Feature',
    year: 2023, is_winner: true,
    source_url: 'https://mpse.org/golden-reel-awards/',
  },
  {
    production_slug: 'oppenheimer-2023',
    award_org: 'mpse_golden_reel',
    category: 'Dialogue & ADR — Feature',
    year: 2024, is_winner: true,
    source_url: 'https://mpse.org/golden-reel-awards/',
  },
  {
    production_slug: 'all-quiet-on-the-western-front-2022',
    award_org: 'mpse_golden_reel',
    category: 'Sound Effects & Foley — Feature',
    year: 2023, is_winner: false,
    source_url: 'https://mpse.org/golden-reel-awards/',
  },
  {
    production_slug: 'the-brutalist-2024',
    award_org: 'mpse_golden_reel',
    category: 'Music Editing — Feature',
    year: 2025, is_winner: true,
    source_url: 'https://mpse.org/golden-reel-awards/',
  },

  // ── CAS Awards (Cinema Audio Society — sound mixing) ─────────────
  {
    production_slug: 'dune-part-two-2024',
    award_org: 'cas_award',
    category: 'Outstanding Production Mixing — Live Action Feature',
    year: 2025, is_winner: true,
    source_url: 'https://cinemaaudiosociety.org/awards/',
  },
  {
    production_slug: 'oppenheimer-2023',
    award_org: 'cas_award',
    category: 'Outstanding Production Mixing — Live Action Feature',
    year: 2024, is_winner: true,
    source_url: 'https://cinemaaudiosociety.org/awards/',
  },
  {
    production_slug: 'top-gun-maverick-2022',
    award_org: 'cas_award',
    category: 'Outstanding Production Mixing — Live Action Feature',
    year: 2023, is_winner: true,
    source_url: 'https://cinemaaudiosociety.org/awards/',
  },
  {
    production_slug: 'dune-2021',
    award_org: 'cas_award',
    category: 'Outstanding Production Mixing — Live Action Feature',
    year: 2022, is_winner: true,
    source_url: 'https://cinemaaudiosociety.org/awards/',
  },

  // ── ACE Eddie (American Cinema Editors) ──────────────────────────
  {
    production_slug: 'oppenheimer-2023',
    award_org: 'ace_eddie',
    category: 'Best Edited Feature Film (Dramatic)',
    year: 2024, is_winner: true,
    source_url: 'https://americancinemaeditors.com/eddie-awards/',
  },
  {
    production_slug: 'everything-everywhere-all-at-once-2022',
    award_org: 'ace_eddie',
    category: 'Best Edited Feature Film (Comedy)',
    year: 2023, is_winner: true,
    source_url: 'https://americancinemaeditors.com/eddie-awards/',
  },
  {
    production_slug: 'parasite-2019',
    award_org: 'ace_eddie',
    category: 'Best Edited Feature Film (Dramatic)',
    year: 2020, is_winner: false,
    source_url: 'https://americancinemaeditors.com/eddie-awards/',
  },
  {
    production_slug: 'the-brutalist-2024',
    award_org: 'ace_eddie',
    category: 'Best Edited Feature Film (Dramatic)',
    year: 2025, is_winner: false,
    source_url: 'https://americancinemaeditors.com/eddie-awards/',
  },

  // ── SCL Awards (Society of Composers & Lyricists) ────────────────
  {
    production_slug: 'oppenheimer-2023',
    award_org: 'scl_award',
    category: 'Outstanding Original Score for a Studio Film',
    year: 2024, is_winner: true,
    recipient_person_slug: 'ludwig-goransson',
    source_url: 'https://thescl.com/scl-awards/',
  },
  {
    production_slug: 'the-brutalist-2024',
    award_org: 'scl_award',
    category: 'Outstanding Original Score for an Independent Film',
    year: 2025, is_winner: true,
    recipient_person_slug: 'daniel-blumberg',
    source_url: 'https://thescl.com/scl-awards/',
  },
  {
    production_slug: 'killers-of-the-flower-moon-2023',
    award_org: 'scl_award',
    category: 'Outstanding Original Score for a Studio Film',
    year: 2024, is_winner: false,
    recipient_person_slug: 'robbie-robertson',
    source_url: 'https://thescl.com/scl-awards/',
  },
  {
    production_slug: 'all-quiet-on-the-western-front-2022',
    award_org: 'scl_award',
    category: 'Outstanding Original Score for a Studio Film',
    year: 2023, is_winner: true,
    recipient_person_slug: 'volker-bertelmann',
    source_url: 'https://thescl.com/scl-awards/',
  },

  // ── HPA Awards (Hollywood Professional Association) ──────────────
  // Re-recording mixing / sound design recognition.
  {
    production_slug: 'dune-part-two-2024',
    award_org: 'hpa_award',
    category: 'Outstanding Sound — Feature Film',
    year: 2024, is_winner: true,
    source_url: 'https://hpaonline.com/hpa-awards/',
  },
  {
    production_slug: 'oppenheimer-2023',
    award_org: 'hpa_award',
    category: 'Outstanding Sound — Feature Film',
    year: 2023, is_winner: true,
    source_url: 'https://hpaonline.com/hpa-awards/',
  },

  // ── ASCAP Film Music ─────────────────────────────────────────────
  {
    production_slug: 'oppenheimer-2023',
    award_org: 'ascap_film_award',
    category: 'Top Box Office Films',
    year: 2024, is_winner: true,
    recipient_person_slug: 'ludwig-goransson',
    source_url: 'https://www.ascap.com/film-tv-awards',
  },
];

let attempted = 0;
let inserted = 0;

for (const a of AWARDS) {
  attempted++;
  const result = await db.execute(sql`
    INSERT INTO production_awards (
      production_id, award_org, category, year, is_winner,
      recipient_person_id, source_url
    )
    SELECT p.id,
           ${a.award_org}::award_org_enum,
           ${a.category}, ${a.year}, ${a.is_winner},
           ${a.recipient_person_slug ? sql`(SELECT id FROM people WHERE slug = ${a.recipient_person_slug} LIMIT 1)` : sql`NULL`},
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

console.log(`[+] production_awards: ${inserted}/${attempted} rows upserted (others no-op'd on missing production)`);
process.exit(0);
