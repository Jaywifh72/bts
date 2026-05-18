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

  // Group by production so multi-composer films (Reznor/Ross, Zimmer/
  // Wallfisch) yield ONE MusicBrainz lookup, with the resulting cues
  // inserted under both score_works rows. The aggregated row includes
  // all composers so the search can use either to disambiguate.
  const groups = await db.execute<{
    production_id: number;
    production_title: string;
    release_year: number | null;
    score_work_ids: number[];
    composer_names: string[];
  }>(sql`
    SELECT p.id   AS production_id,
           p.title AS production_title,
           p.release_year,
           array_agg(sw.id ORDER BY sw.id) AS score_work_ids,
           array_agg(c.display_name ORDER BY sw.id) AS composer_names
    FROM score_works sw
    JOIN productions p ON p.id = sw.production_id
    JOIN people c ON c.id = sw.composer_person_id
    ${opts.refresh
      ? sql``
      : sql`WHERE NOT EXISTS (SELECT 1 FROM music_cues mc WHERE mc.score_work_id = sw.id)`}
    GROUP BY p.id, p.title, p.release_year, p.popularity
    ORDER BY p.popularity DESC NULLS LAST
    ${opts.limit ? sql`LIMIT ${opts.limit}` : sql``}
  `);

  console.log(`musicbrainz:cues — ${groups.length} productions to consider`);

  for (const grp of groups) {
    // postgres-js flattens single-element arrays into scalars; coerce
    // back so subsequent .length / ANY() calls work uniformly.
    const rawIds = (grp as unknown as { score_work_ids: number[] | number }).score_work_ids;
    const swIds: number[] = Array.isArray(rawIds) ? rawIds : [rawIds];
    const composerNames = Array.isArray(grp.composer_names)
      ? grp.composer_names
      : [grp.composer_names as unknown as string];
    stats.score_works_considered += swIds.length;
    try {
      // Use the FIRST composer name for search ranking — composers in the
      // same score share the artist-credit on the release in MB.
      const rg = await searchSoundtrackReleaseGroup(
        grp.production_title, grp.release_year, composerNames[0],
      );
      if (!rg) {
        stats.score_works_skipped += swIds.length;
        console.log(`  [-] no MB release-group: ${grp.production_title}`);
        continue;
      }
      const releases = await getReleaseGroupReleases(rg.id);
      if (releases.length === 0) {
        stats.score_works_skipped += swIds.length;
        console.log(`  [-] no releases under MBID ${rg.id}: ${grp.production_title}`);
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
        stats.score_works_skipped += swIds.length;
        console.log(`  [-] no tracklist on any release for ${grp.production_title}`);
        continue;
      }
      stats.score_works_matched += swIds.length;

      // Stash the release label on all score_works for this production.
      const label = release['label-info']?.[0]?.label?.name;
      // Update each score_work label individually — drizzle-orm doesn't
      // bind JS arrays to PG bigint[] reliably across drivers, so we
      // avoid the array path entirely.
      if (label) {
        for (const swId of swIds) {
          await db.execute(sql`
            UPDATE score_works
            SET release_label = COALESCE(NULLIF(release_label, ''), ${label}),
                updated_at = NOW()
            WHERE id = ${swId}
          `);
        }
      }

      // Insert tracks under EACH score_work for this production. Skip
      // titles with "(performed by …)" — those are licensed song
      // appearances, not composer cues.
      for (const t of tracks) {
        const lower = t.title.toLowerCase();
        if (/performed by|recorded by|featuring/.test(lower)) {
          stats.cues_skipped += swIds.length;
          continue;
        }
        const cueSlug = slugify(t.title) || `track-${t.position}`;
        const runtimeSeconds = t.length ? Math.round(t.length / 1000) : null;
        for (const swId of swIds) {
          await db.execute(sql`
            INSERT INTO music_cues (
              score_work_id, slug, title, track_number, runtime_seconds,
              cue_function, data_tier
            ) VALUES (
              ${swId}, ${cueSlug}, ${t.title}, ${t.position}, ${runtimeSeconds},
              'underscore', 'imported'
            )
            ON CONFLICT (score_work_id, slug) DO NOTHING
          `);
          stats.cues_inserted++;
        }
      }
      console.log(`  [+] ${tracks.length} cues × ${swIds.length} composer(s) for ${grp.production_title}`);
    } catch (err) {
      stats.score_works_skipped += swIds.length;
      console.error(`  [!] failed: ${grp.production_title} — ${err}`);
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
