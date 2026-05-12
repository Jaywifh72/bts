import 'dotenv/config';
import { db, sql } from '@bts/db';
import { sparql, qidFromUri } from './client.ts';

/**
 * E-01: backfill `production_awards` from Wikidata.
 *
 * Strategy: for each production with a wikidata_id, fetch its
 * `award_received` (P166) and `nominated_for` (P1411) statements. Each
 * statement's value is an Award Q-entity that we map to our
 * `(award_org_enum, category)` pair via a hand-curated whitelist.
 *
 * We deliberately constrain to the whitelist (rather than ingesting every
 * award on every Wikidata page) so the public site doesn't surface
 * obscure honors that pollute the AwardsList. The set covers the awards
 * a working DP / VFX sup actually cites: Oscars, BAFTAs, ASC/BSC/AFC/ACS
 * /CSC awards, Cannes, Venice, Berlin, Spirit, Critics Choice, Golden
 * Globes, VES.
 *
 * Year is read from the P585 (point in time) qualifier when present;
 * absent that, we leave it null and skip the row (year is NOT NULL on
 * the table).
 */

/**
 * Whitelist of Wikidata Q-entities that map to our award_org_enum + a
 * canonical category string. Add to this map as you discover new IDs.
 * Verify QIDs at https://www.wikidata.org/wiki/Q<n>.
 *
 * Convention: keys here are the Award entity (e.g. "Academy Award for
 * Best Cinematography"), not the ceremony.
 *
 * **Data-quality caveat:** Wikidata's P166 is sometimes used loosely —
 * a film page may list a category as "received" when it was actually
 * only nominated. We trust Wikidata as a baseline and let the
 * corrections queue (T7-4) handle individual challenges. Also, some
 * categories have multiple QIDs over time (e.g. pre-2024 vs post-2024
 * Academy taxonomy shifts) — extend the map when the gap surfaces.
 */
const AWARD_MAP: Record<string, { org: string; category: string }> = {
  // Academy Awards (Oscars)
  Q102427: { org: 'academy_awards', category: 'Best Cinematography' },
  Q103916: { org: 'academy_awards', category: 'Best Director' },
  Q19020:  { org: 'academy_awards', category: 'Best Picture' },
  Q277759: { org: 'academy_awards', category: 'Best Visual Effects' },
  Q107390: { org: 'academy_awards', category: 'Best Production Design' },
  Q109110: { org: 'academy_awards', category: 'Best Film Editing' },
  Q108171: { org: 'academy_awards', category: 'Best Sound' },
  Q109094: { org: 'academy_awards', category: 'Best Sound Editing' },
  Q109099: { org: 'academy_awards', category: 'Best Sound Mixing' },
  Q107394: { org: 'academy_awards', category: 'Best Costume Design' },
  Q107366: { org: 'academy_awards', category: 'Best Makeup and Hairstyling' },
  Q103618: { org: 'academy_awards', category: 'Best Original Score' },
  Q112243: { org: 'academy_awards', category: 'Best Original Song' },
  Q106800: { org: 'academy_awards', category: 'Best Animated Feature' },
  Q105304: { org: 'academy_awards', category: 'Best International Feature Film' },
  Q111332: { org: 'academy_awards', category: 'Best Documentary Feature' },
  Q107258: { org: 'academy_awards', category: 'Best Adapted Screenplay' },
  Q41417:  { org: 'academy_awards', category: 'Best Original Screenplay' },

  // BAFTA
  Q1011547: { org: 'bafta', category: 'Best Cinematography' },
  Q951529:  { org: 'bafta', category: 'Best Film' },
  Q1364556: { org: 'bafta', category: 'Best Director' },
  Q820494:  { org: 'bafta', category: 'Best Special Visual Effects' },
  Q787145:  { org: 'bafta', category: 'Best Editing' },
  Q508166:  { org: 'bafta', category: 'Best Production Design' },
  Q787104:  { org: 'bafta', category: 'Best Costume Design' },
  Q739633:  { org: 'bafta', category: 'Best Sound' },
  Q787098:  { org: 'bafta', category: 'Best Original Music' },

  // ASC Award (American Society of Cinematographers)
  Q4807068: { org: 'asc_award', category: 'Outstanding Achievement in Theatrical Releases' },
  Q297362:  { org: 'asc_award', category: 'Lifetime Achievement Award' },

  // BSC Award (British Society of Cinematographers)
  Q4836236: { org: 'bsc_award', category: 'Best Cinematography in a Theatrical Feature Film' },

  // CSC Award (Canadian Society of Cinematographers)
  Q65056831: { org: 'csc_award', category: 'Best Cinematography in Theatrical Feature' },

  // Cannes Film Festival
  Q179808: { org: 'cannes', category: 'Palme d\'Or' },
  Q189680: { org: 'cannes', category: 'Grand Prix' },
  Q2022640: { org: 'cannes', category: 'Best Director' },
  Q1196379: { org: 'cannes', category: 'Vulcan Award (technical)' },
  Q775091:  { org: 'cannes', category: 'Caméra d\'Or' },
  Q17354954: { org: 'cannes', category: 'Un Certain Regard Award' },

  // Venice
  Q193533:  { org: 'venice', category: 'Golden Lion' },
  Q615991:  { org: 'venice', category: 'Silver Lion (Best Director)' },
  Q49025:   { org: 'venice', category: 'Volpi Cup' },
  Q2089923: { org: 'venice', category: 'Volpi Cup for Best Actor' },
  Q2089918: { org: 'venice', category: 'Volpi Cup for Best Actress' },
  Q1060024: { org: 'venice', category: 'Marcello Mastroianni Award' },

  // Berlin
  Q166981: { org: 'berlin', category: 'Golden Bear' },
  Q706031: { org: 'berlin', category: 'Silver Bear for Best Director' },
  Q1266608: { org: 'berlin', category: 'Silver Bear for Outstanding Artistic Contribution' },

  // Critics Choice
  Q3056924: { org: 'critics_choice', category: 'Best Cinematography' },
  Q3056922: { org: 'critics_choice', category: 'Best Picture' },
  Q922263:  { org: 'critics_choice', category: 'Best Director' },
  Q3275695: { org: 'critics_choice', category: 'Best Editing' },
  Q3225371: { org: 'critics_choice', category: 'Best Production Design' },
  Q24261882: { org: 'critics_choice', category: 'Best Visual Effects' },

  // Golden Globes
  Q197577:  { org: 'golden_globes', category: 'Best Motion Picture – Drama' },
  Q197578:  { org: 'golden_globes', category: 'Best Motion Picture – Musical or Comedy' },
  Q1075820: { org: 'golden_globes', category: 'Best Director' },
  Q1422140: { org: 'golden_globes', category: 'Best Original Score' },
  Q1472235: { org: 'golden_globes', category: 'Best Original Song' },

  // Independent Spirit Awards
  Q3473168: { org: 'spirit_awards', category: 'Best Cinematography' },
  Q3473167: { org: 'spirit_awards', category: 'Best Feature' },
  Q2295041: { org: 'spirit_awards', category: 'Best Director' },
  Q16565637: { org: 'spirit_awards', category: 'Best Editing' },
  Q1170500: { org: 'spirit_awards', category: 'Best First Feature' },
  Q3910543: { org: 'spirit_awards', category: 'John Cassavetes Award' },

  // VES Awards (Visual Effects Society)
  Q85813361: { org: 'ves_award', category: 'Outstanding Visual Effects in a Photoreal Feature' },
  Q7936547:  { org: 'ves_award', category: 'Outstanding Visual Effects in an Animated Feature' },
  Q48861416: { org: 'ves_award', category: 'Outstanding Created Environment in a Photoreal Feature' },
  Q86754098: { org: 'ves_award', category: 'Outstanding Effects Simulations in a Photoreal Feature' },
};

const WHITELIST_QIDS = Object.keys(AWARD_MAP);

export type AwardsBackfillStats = {
  attempted: number;
  inserted: number;
  skipped: number;
  errors: number;
};

/**
 * Two queries (UNION'd in SPARQL). For each award in our whitelist:
 *   - P166 statement → won
 *   - P1411 statement → nominated only (no win)
 *
 * We capture the P585 (point in time) qualifier on whichever statement
 * is present. JS-side aggregation collapses duplicate bindings into one
 * row per (award, year), preferring is_winner=true.
 */
function buildAwardsQuery(wikidataId: string): string {
  const values = WHITELIST_QIDS.map((q) => `wd:${q}`).join(' ');
  return `
    SELECT ?award ?isWin ?year WHERE {
      VALUES ?award { ${values} }
      {
        wd:${wikidataId} p:P166 ?stmt .
        ?stmt ps:P166 ?award .
        BIND(true AS ?isWin)
        OPTIONAL { ?stmt pq:P585 ?yearDate. BIND(YEAR(?yearDate) AS ?year) }
      } UNION {
        wd:${wikidataId} p:P1411 ?stmt .
        ?stmt ps:P1411 ?award .
        BIND(false AS ?isWin)
        OPTIONAL { ?stmt pq:P585 ?yearDate. BIND(YEAR(?yearDate) AS ?year) }
      }
    }
  `;
}

export async function backfillAwardsFromWikidata(
  opts: { limit?: number; refresh?: boolean } = {},
): Promise<AwardsBackfillStats> {
  const stats: AwardsBackfillStats = { attempted: 0, inserted: 0, skipped: 0, errors: 0 };

  // Default: only target productions with a wikidata_id and no awards yet.
  // `--refresh` re-runs against everything.
  const filterClause = opts.refresh
    ? sql`p.wikidata_id IS NOT NULL`
    : sql`p.wikidata_id IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM production_awards a WHERE a.production_id = p.id)`;
  const limitClause = opts.limit ? sql`LIMIT ${opts.limit}` : sql``;

  const targets = await db.execute<{
    id: number;
    wikidata_id: string;
    title: string;
    release_year: number | null;
  }>(sql`
    SELECT id, wikidata_id, title, release_year FROM productions p
    WHERE ${filterClause}
    ORDER BY popularity DESC NULLS LAST, id
    ${limitClause}
  `);

  console.log(`wikidata:awards — ${targets.length} productions to scan (refresh=${!!opts.refresh})`);

  for (const row of targets) {
    stats.attempted++;
    try {
      const result = await sparql(buildAwardsQuery(row.wikidata_id));

      // Aggregate: collapse duplicates into one row per (award, year),
      // preferring is_winner=true so a film that *won* doesn't end up
      // with a stray nominee row from the OPTIONAL nominated-for path.
      type Agg = { mapping: { org: string; category: string }; year: number; isWinner: boolean };
      const agg = new Map<string, Agg>();
      for (const b of result.results.bindings) {
        const awardUri = b.award?.value;
        if (!awardUri) continue;
        const awardQid = qidFromUri(awardUri);
        if (!awardQid) continue;
        const mapping = AWARD_MAP[awardQid];
        if (!mapping) continue;

        const yearStr = b.year?.value;
        let year = yearStr ? Number(yearStr) : null;
        // Fallback: ceremony year ≈ release_year + 1 for Oscars/BAFTA.
        // Cannes/Venice/Berlin would prefer release_year, but if the
        // qualifier is set we use it directly; the fallback only fires
        // when Wikidata didn't mark a year. Acceptable lossage.
        if (year === null && row.release_year) year = row.release_year + 1;
        if (year === null) continue;

        const isWinner = b.isWin?.value === 'true';
        const key = `${awardQid}|${year}`;
        const existing = agg.get(key);
        if (!existing || (isWinner && !existing.isWinner)) {
          agg.set(key, { mapping, year, isWinner });
        }
      }

      let inserted = 0;
      for (const a of agg.values()) {
        // Manual upsert — Postgres' default unique-with-NULL doesn't
        // dedupe across NULL recipient_person_id rows. Look first.
        const [existing] = await db.execute<{ id: number; is_winner: boolean }>(sql`
          SELECT id, is_winner FROM production_awards
          WHERE production_id = ${row.id}
            AND award_org = ${a.mapping.org}::award_org_enum
            AND category = ${a.mapping.category}
            AND year = ${a.year}
            AND recipient_person_id IS NULL
          LIMIT 1
        `);

        if (existing) {
          // Promote nominee → winner only; never demote.
          if (a.isWinner && !existing.is_winner) {
            await db.execute(sql`
              UPDATE production_awards
              SET is_winner = true, source_url = ${`https://www.wikidata.org/wiki/${row.wikidata_id}`}, updated_at = NOW()
              WHERE id = ${existing.id}
            `);
            inserted++;
          }
          continue;
        }

        await db.execute(sql`
          INSERT INTO production_awards (
            production_id, award_org, category, year, is_winner, source_url
          ) VALUES (
            ${row.id},
            ${a.mapping.org}::award_org_enum,
            ${a.mapping.category},
            ${a.year},
            ${a.isWinner},
            ${`https://www.wikidata.org/wiki/${row.wikidata_id}`}
          )
        `);
        inserted++;
      }
      if (inserted > 0) stats.inserted += inserted;
      else stats.skipped++;
    } catch (e) {
      stats.errors++;
      console.error(
        `  ${row.title} (wd=${row.wikidata_id}): ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  console.log(
    `wikidata:awards done — attempted=${stats.attempted} inserted=${stats.inserted} skipped=${stats.skipped} errors=${stats.errors}`,
  );
  return stats;
}
