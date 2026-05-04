import 'dotenv/config';
import { scrapeArtOfVfx } from './scrapers/art-of-vfx.ts';
import { scrapeBeforesAndAfters } from './scrapers/befores-and-afters.ts';
import { loadRawBreakdowns } from './import/transform.ts';
import { upsertBreakdown } from './import/upsert.ts';
import { discoverVideos, rescorePending } from './discovery/run.ts';
import { importTmdbMovies, enrichExistingMovies } from './tmdb/import.ts';
import { importTmdbCredits } from './tmdb/credits.ts';

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
    case 'tmdb:import':
      await importTmdbMovies({
        limit: numberFlag('limit'),
        minVoteCount: numberFlag('min-votes'),
        startPage: numberFlag('start-page'),
      });
      break;
    case 'tmdb:enrich':
      await enrichExistingMovies();
      break;
    case 'tmdb:credits':
      await importTmdbCredits({ limit: numberFlag('limit') });
      break;
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
      console.error('Usage: tsx src/cli.ts <scrape:artofvfx|scrape:beforesandafters|import:vfx|discover:videos|tmdb:import|tmdb:enrich|tmdb:credits|run> [--slug <slug>] [--pending] [--limit N] [--min-votes N] [--start-page N]');
      process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
