import 'dotenv/config';
import { scrapeArtOfVfx } from './scrapers/art-of-vfx.ts';
import { scrapeBeforesAndAfters } from './scrapers/befores-and-afters.ts';
import { loadRawBreakdowns } from './import/transform.ts';
import { upsertBreakdown } from './import/upsert.ts';
import { discoverVideos, rescorePending } from './discovery/run.ts';
import { reclassifyVideos } from './discovery/reclassify.ts';
import { importTmdbMovies, enrichExistingMovies } from './tmdb/import.ts';
import { importTmdbCredits } from './tmdb/credits.ts';
import { enrichPersons } from './tmdb/persons.ts';
import { enrichReleaseDates } from './tmdb/release-dates.ts';
import { backfillAwardsFromWikidata } from './wikidata/awards.ts';
import { resolveProductionWikidataIds, resolvePersonWikidataIds } from './wikidata/resolve.ts';
import { backfillEducationFromWikidata } from './wikidata/education.ts';
import { ingestFeed } from './rss/ingest.ts';
import { FEEDS } from './rss/feeds.ts';
import { archivePendingSources } from './wayback/archive.ts';
import { checkSourceHealth } from './wayback/health.ts';
import { embedProductions, embedPeople } from './embeddings/run.ts';
import { extractKeyFramePalettes } from './embeddings/palette.ts';
import { extractKeyFramePhashes } from './embeddings/phash.ts';
import { extractKeyFrameVisualEmbeddings } from './embeddings/visual.ts';
import { postNewlyCurated } from './social/post.ts';
import { draftNewsletter } from './newsletter/draft.ts';
import { ingestStudio } from './vfx-studios/ingest.ts';
import { STUDIOS } from './vfx-studios/studios.ts';
import { ingestCuesFromMusicBrainz } from './musicbrainz/cues.ts';

const [, , command, ...args] = process.argv;
const slugFlag = args.find((_, i) => args[i - 1] === '--slug');

function numberFlag(name: string): number | undefined {
  const idx = args.findIndex((a) => a === `--${name}`);
  if (idx === -1) return undefined;
  const raw = args[idx + 1];
  const n = raw ? Number(raw) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

async function main() {
  async function importVfx() {
    console.log('import:vfx — loading raw breakdowns...');
    const breakdowns = await loadRawBreakdowns();
    console.log(`  Found ${breakdowns.length} breakdown files`);
    for (const b of breakdowns) {
      await upsertBreakdown(b);
    }
    console.log('import:vfx done');
  }

  switch (command) {
    case 'scrape:artofvfx':
      console.log('scrape:artofvfx starting...');
      await scrapeArtOfVfx(slugFlag);
      break;
    case 'scrape:beforesandafters':
      console.log('scrape:beforesandafters starting...');
      await scrapeBeforesAndAfters(slugFlag);
      break;
    case 'import:vfx':
      await importVfx();
      break;
    case 'discover:videos': {
      const isPending = args.includes('--pending');
      if (isPending) {
        await rescorePending();
      } else {
        await discoverVideos(slugFlag);
      }
      break;
    }
    case 'reclassify:videos':
      await reclassifyVideos();
      break;
    case 'tmdb:import':
      await importTmdbMovies({
        limit: numberFlag('limit'),
        minVoteCount: numberFlag('min-votes'),
        startPage: numberFlag('start-page'),
      });
      break;
    case 'tmdb:enrich':
      await enrichExistingMovies({
        force: args.includes('--force'),
        refresh: args.includes('--refresh'),
      });
      break;
    case 'tmdb:credits':
      await importTmdbCredits({ limit: numberFlag('limit') });
      break;
    case 'tmdb:persons':
      await enrichPersons({
        limit: numberFlag('limit'),
        refresh: args.includes('--refresh'),
      });
      break;
    case 'tmdb:release-dates':
      await enrichReleaseDates({
        limit: numberFlag('limit'),
        refresh: args.includes('--refresh'),
      });
      break;
    case 'wikidata:resolve':
      // Default to productions; pass --target=people to switch.
      if (args.includes('--target=people')) {
        await resolvePersonWikidataIds({ limit: numberFlag('limit') });
      } else {
        await resolveProductionWikidataIds({ limit: numberFlag('limit') });
      }
      break;
    case 'wikidata:awards':
      await backfillAwardsFromWikidata({
        limit: numberFlag('limit'),
        refresh: args.includes('--refresh'),
      });
      break;
    case 'wikidata:education':
      await backfillEducationFromWikidata({
        limit: numberFlag('limit'),
        refresh: args.includes('--refresh'),
      });
      break;
    case 'wayback:archive':
      await archivePendingSources({ limit: numberFlag('limit') });
      break;
    case 'sources:health':
      await checkSourceHealth({
        limit: numberFlag('limit'),
        staleAfterDays: numberFlag('stale-days'),
      });
      break;
    case 'embed:productions':
      await embedProductions({ limit: numberFlag('limit'), refresh: args.includes('--refresh') });
      break;
    case 'embed:people':
      await embedPeople({ limit: numberFlag('limit'), refresh: args.includes('--refresh') });
      break;
    case 'palette:extract':
      await extractKeyFramePalettes({ limit: numberFlag('limit'), refresh: args.includes('--refresh') });
      break;
    case 'phash:extract':
      await extractKeyFramePhashes({ limit: numberFlag('limit'), refresh: args.includes('--refresh') });
      break;
    case 'embed:visual':
      await extractKeyFrameVisualEmbeddings({ limit: numberFlag('limit'), refresh: args.includes('--refresh') });
      break;
    case 'social:post':
      await postNewlyCurated({ dryRun: args.includes('--dry-run'), limit: numberFlag('limit') });
      break;
    case 'newsletter:draft':
      await draftNewsletter({ sinceDays: numberFlag('since-days') ?? 7, dryRun: args.includes('--dry-run') });
      break;
    case 'vfx-studios:ingest': {
      const houseArg = args.find((a, i) => args[i - 1] === '--house');
      if (!houseArg) {
        for (const cfg of Object.values(STUDIOS)) {
          await ingestStudio(cfg);
        }
      } else {
        const cfg = STUDIOS[houseArg];
        if (!cfg) {
          console.error(`Unknown studio: ${houseArg}. Known: ${Object.keys(STUDIOS).join(', ')}`);
          process.exit(1);
        }
        await ingestStudio(cfg);
      }
      break;
    }
    case 'musicbrainz:cues':
      await ingestCuesFromMusicBrainz({
        limit: numberFlag('limit'),
        refresh: args.includes('--refresh'),
      });
      break;
    case 'rss:ingest': {
      const feedArg = args.find((a, i) => args[i - 1] === '--feed');
      if (!feedArg) {
        // No --feed: run them all sequentially.
        for (const cfg of Object.values(FEEDS)) {
          await ingestFeed(cfg);
        }
      } else {
        const cfg = FEEDS[feedArg];
        if (!cfg) {
          console.error(`Unknown feed: ${feedArg}. Known: ${Object.keys(FEEDS).join(', ')}`);
          process.exit(1);
        }
        await ingestFeed(cfg);
      }
      break;
    }
    case 'run':
      console.log('run: scrape:artofvfx → scrape:beforesandafters → import:vfx → discover:videos');
      await scrapeArtOfVfx(slugFlag);
      await scrapeBeforesAndAfters(slugFlag);
      await importVfx();
      try {
        await discoverVideos(slugFlag);
      } catch (e) {
        console.error('discover:videos failed:', e instanceof Error ? e.message : String(e));
      }
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: tsx src/cli.ts <scrape:artofvfx|scrape:beforesandafters|import:vfx|discover:videos|tmdb:import|tmdb:enrich|tmdb:credits|tmdb:persons|tmdb:release-dates|wikidata:resolve|wikidata:awards|rss:ingest|wayback:archive|run> [--slug <slug>] [--feed <id>] [--target=people] [--pending] [--limit N] [--min-votes N] [--start-page N] [--force] [--refresh]');
      process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
