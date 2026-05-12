import 'dotenv/config';
import { db, sql } from '@bts/db';
import { searchYouTube, type YouTubeVideo } from './youtube.ts';
import { searchVimeo, type VimeoVideo } from './vimeo.ts';
import { scoreVideo } from './score.ts';
import { categoriseVideo } from './categorise.ts';
import { upsertVideos, type ScoredVideo } from './upsert.ts';

type AnyVideo = YouTubeVideo | VimeoVideo;

type ProductionRow = {
  id: number;
  slug: string;
  title: string;
  release_year: number | null;
};

/**
 * Query templates. The placeholder [title] and [year] are replaced per production.
 * Quotes are used verbatim for YouTube; stripped for Vimeo.
 */
const QUERY_TEMPLATES = [
  '"[title] [year] vfx breakdown"',
  '"[title] [year] visual effects"',
  '"[title] [year] making of"',
  '"[title] [year] behind the scenes"',
  '"[title] [year] cinematography"',
  '"[title] [year] production design"',
  // Stunt-specific search terms — without these, stunt content
  // surfaces only when a generic BTS query happens to return it,
  // which is unreliable for stunt-heavy productions.
  '"[title] [year] stunt coordinator"',
  '"[title] [year] fight choreography"',
];

function buildQuery(template: string, title: string, year: number | null): string {
  return template
    .replace('[title]', title)
    .replace('[year]', year !== null ? String(year) : '');
}

async function loadProductions(slugFilter?: string): Promise<ProductionRow[]> {
  if (slugFilter) {
    return db.execute<ProductionRow>(sql`
      SELECT id, slug, title, release_year FROM productions WHERE slug = ${slugFilter}
    `);
  }
  return db.execute<ProductionRow>(sql`
    SELECT id, slug, title, release_year FROM productions ORDER BY release_year DESC, title
  `);
}

/**
 * Run video discovery for one or all productions.
 *
 * @param slugFilter  Optional production slug — runs for that production only.
 */
export async function discoverVideos(slugFilter?: string): Promise<void> {
  const productions = await loadProductions(slugFilter);
  console.log(`discover:videos — ${productions.length} production(s)`);

  for (const production of productions) {
    console.log(`  [${production.slug}] searching...`);

    // Build all 6 query strings for this production
    const queries = QUERY_TEMPLATES.map((t) =>
      buildQuery(t, production.title, production.release_year),
    );

    // Run all queries against both APIs, collect results
    const rawResults: AnyVideo[] = [];
    for (const query of queries) {
      const [ytResults, vmResults] = await Promise.all([
        searchYouTube(query, 10).catch((e) => {
          console.error(`  YouTube error: ${e instanceof Error ? e.message : String(e)}`);
          return [] as YouTubeVideo[];
        }),
        searchVimeo(query, 10).catch((e) => {
          console.error(`  Vimeo error: ${e instanceof Error ? e.message : String(e)}`);
          return [] as VimeoVideo[];
        }),
      ]);
      rawResults.push(...ytResults, ...vmResults);
    }

    // Deduplicate by (source, externalId)
    const seen = new Set<string>();
    const candidates = rawResults.filter((v) => {
      const key = `${v.source}:${v.externalId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    console.log(`  [${production.slug}] ${candidates.length} candidates after dedup`);

    // Score, categorise, and collect for upsert
    const scored: ScoredVideo[] = candidates.map((v) => {
      const confidenceScore = scoreVideo(
        {
          source: v.source,
          title: v.title,
          description: v.description,
          channelId: v.channelId,
          durationSeconds: v.durationSeconds,
          viewCount: v.viewCount,
          publishedAt: v.publishedAt,
        },
        { title: production.title, releaseYear: production.release_year },
      );

      const category = categoriseVideo({
        source: v.source,
        channelId: v.channelId,
        title: v.title,
      });

      return {
        productionId: production.id,
        source: v.source,
        externalId: v.externalId,
        url: v.url,
        title: v.title,
        channelName: v.channelName,
        channelId: v.channelId,
        thumbnailUrl: v.thumbnailUrl,
        durationSeconds: v.durationSeconds,
        viewCount: v.viewCount,
        publishedAt: v.publishedAt,
        category,
        confidenceScore,
      };
    });

    await upsertVideos(scored);
  }

  console.log('discover:videos complete');
}

/**
 * Re-score all existing pending rows (e.g. after tuning weights).
 * Reads pending rows from the DB, re-runs scoring, updates confidence_score and status.
 */
export async function rescorePending(): Promise<void> {
  console.log('discover:videos --pending — re-scoring pending rows...');

  const pendingRows = await db.execute<{
    id: number;
    production_title: string;
    release_year: number | null;
    source: 'youtube' | 'vimeo';
    external_id: string;
    title: string;
    channel_id: string | null;
    duration_seconds: number | null;
    view_count: number | null;
  }>(sql`
    SELECT
      pv.id, p.title AS production_title, p.release_year,
      pv.source, pv.external_id, pv.title,
      pv.channel_id, pv.duration_seconds, pv.view_count
    FROM production_videos pv
    JOIN productions p ON p.id = pv.production_id
    WHERE pv.status = 'pending'
  `);

  console.log(`  ${pendingRows.length} pending rows to re-score`);
  let upgraded = 0;

  for (const row of pendingRows) {
    const newScore = scoreVideo(
      {
        source: row.source,
        title: row.title,
        description: '',
        channelId: row.channel_id,
        durationSeconds: row.duration_seconds,
        viewCount: row.view_count,
        publishedAt: null,
      },
      { title: row.production_title, releaseYear: row.release_year },
    );

    const newStatus = newScore >= 0.65 ? 'published' : 'pending';
    await db.execute(sql`
      UPDATE production_videos
      SET confidence_score = ${newScore.toFixed(3)},
          status = CASE
            WHEN status = 'rejected' THEN 'rejected'
            WHEN status = 'published' THEN 'published'
            ELSE ${newStatus}
          END,
          updated_at = NOW()
      WHERE id = ${row.id}
    `);
    if (newStatus === 'published') upgraded++;
  }

  console.log(`  Re-scored ${pendingRows.length} rows, ${upgraded} upgraded to published`);
}
