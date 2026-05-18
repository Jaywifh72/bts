import 'dotenv/config';
import { db, sql } from '@bts/db';
import { searchSoundtrackReleaseGroup, getReleaseGroupReleases, getReleaseDetail } from './client.ts';

/**
 * Populate music_cues from MusicBrainz soundtrack release tracklists.
 *
 * Strategy:
 *   1. For every score_works row missing a meaningful cue catalog
 *      (cues < cue_count_estimate, or zero cues), look up the
 *      corresponding film soundtrack on MusicBrainz.
 *   2. Pull the first release's tracklist.
 *   3. Insert each track as a music_cues row with a slugified title,
 *      track_number, runtime_seconds. Editorial fields (cue_function,
 *      listening_notes) stay null — to be filled by curators.
 *
 * Idempotent: ON CONFLICT (score_work_id, slug) DO NOTHING. Re-running
 * doesn't overwrite curator-edited rows.
 *
 * Throttled to ≤ 1 req/sec by the client.
 */

export type CuesIngestStats = {
  score_works_considered: number;
  score_works_matched: number;
  score_works_skipped: number;
  cues_inserted: number;
  cues_skipped: number;
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export async function ingestCuesFromMusicBrainz(
  opts: { limit?: number; refresh?: boolean } = {},
): Promise<CuesIngestStats> {
  const stats: CuesIngestStats = {
    score_works_considered: 0, score_works_matched: 0, score_works_skipped: 0,
    cues_inserted: 0, cues_skipped: 0,
  };

  // Candidate score_works: prefer ones with NO cues yet, then ones
  // below their cue_count_estimate. --refresh re-pulls everything.
  const candidates = await db.execute<{
    score_work_id: number;
    production_title: string;
    release_year: number | null;
    composer_name: string;
    existing_cue_count: number;
  }>(sql`
    SELECT sw.id  AS score_work_id,
           p.title AS production_title,
           p.release_year,
           c.display_name AS composer_name,
           (SELECT COUNT(*)::int FROM music_cues mc WHERE mc.score_work_id = sw.id) AS existing_cue_count
    FROM score_works sw
    JOIN productions p ON p.id = sw.production_id
    JOIN people c ON c.id = sw.composer_person_id
    ${opts.refresh
      ? sql``
      : sql`WHERE NOT EXISTS (SELECT 1 FROM music_cues mc WHERE mc.score_work_id = sw.id)`}
    ORDER BY p.popularity DESC NULLS LAST
    ${opts.limit ? sql`LIMIT ${opts.limit}` : sql``}
  `);

  console.log(`musicbrainz:cues — ${candidates.length} score_works to consider`);

  for (const sw of candidates) {
    stats.score_works_considered++;
    try {
      const rg = await searchSoundtrackReleaseGroup(sw.production_title, sw.release_year);
      if (!rg) {
        stats.score_works_skipped++;
        console.log(`  [-] no MB release-group: ${sw.production_title}`);
        continue;
      }
      const releases = await getReleaseGroupReleases(rg.id);
      if (releases.length === 0) {
        stats.score_works_skipped++;
        console.log(`  [-] no releases under MBID ${rg.id}: ${sw.production_title}`);
        continue;
      }
      // MB returns releases in arbitrary order. Prefer the earliest dated
      // release (usually the official OST album, not a deluxe reissue with
      // bonus material). Fall back to first if no dates are set.
      const sortedReleases = [...releases].sort((a, b) => {
        const da = a.date ?? '9999'; const db = b.date ?? '9999';
        return da.localeCompare(db);
      });
      // Now fetch the chosen release's tracklist. Walk releases until one
      // returns tracks — some have no media attached.
      let release = null as Awaited<ReturnType<typeof getReleaseDetail>>;
      let tracks: NonNullable<NonNullable<typeof release>['media']>[number]['tracks'] = [];
      for (const candidate of sortedReleases.slice(0, 3)) {
        release = await getReleaseDetail(candidate.id);
        tracks = release?.media?.flatMap((m) => m.tracks ?? []) ?? [];
        if (tracks.length > 0) break;
      }
      if (tracks.length === 0 || !release) {
        stats.score_works_skipped++;
        console.log(`  [-] no tracklist on any release for ${sw.production_title}`);
        continue;
      }
      stats.score_works_matched++;

      // Stash the release label on score_works if empty.
      const label = release['label-info']?.[0]?.label?.name;
      if (label) {
        await db.execute(sql`
          UPDATE score_works
          SET release_label = COALESCE(NULLIF(release_label, ''), ${label}),
              updated_at = NOW()
          WHERE id = ${sw.score_work_id}
        `);
      }

      // Insert tracks. Skip ones with parenthetical descriptions like
      // "(performed by …)" — those are licensed song appearances, not
      // composer cues.
      for (const t of tracks) {
        // Skip if title looks like a non-score appearance.
        const lower = t.title.toLowerCase();
        if (/performed by|recorded by|featuring/.test(lower)) {
          stats.cues_skipped++;
          continue;
        }
        const cueSlug = slugify(t.title) || `track-${t.position}`;
        const runtimeSeconds = t.length ? Math.round(t.length / 1000) : null;
        await db.execute(sql`
          INSERT INTO music_cues (
            score_work_id, slug, title, track_number, runtime_seconds,
            cue_function, data_tier
          ) VALUES (
            ${sw.score_work_id}, ${cueSlug}, ${t.title}, ${t.position}, ${runtimeSeconds},
            'underscore', 'imported'
          )
          ON CONFLICT (score_work_id, slug) DO NOTHING
        `);
        stats.cues_inserted++;
      }
      console.log(`  [+] ${tracks.length} cues for ${sw.production_title}`);
    } catch (err) {
      stats.score_works_skipped++;
      console.error(`  [!] failed: ${sw.production_title} — ${err}`);
    }
  }

  console.log(`musicbrainz:cues complete — ${JSON.stringify(stats)}`);
  return stats;
}

// Direct-execution entry point.
if (import.meta.url === `file://${process.argv[1]}`) {
  const limit = process.argv.includes('--limit')
    ? Number(process.argv[process.argv.indexOf('--limit') + 1])
    : undefined;
  const refresh = process.argv.includes('--refresh');
  ingestCuesFromMusicBrainz({ limit, refresh }).then((stats) => {
    console.log(JSON.stringify(stats, null, 2));
    process.exit(0);
  });
}
