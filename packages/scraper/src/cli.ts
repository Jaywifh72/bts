import 'dotenv/config';
import { scrapeArtOfVfx } from './scrapers/art-of-vfx.ts';
import { scrapeBeforesAndAfters } from './scrapers/befores-and-afters.ts';
import { loadRawBreakdowns } from './import/transform.ts';
import { upsertBreakdown } from './import/upsert.ts';

const [, , command, ...args] = process.argv;
const slugFlag = args.find((_, i) => args[i - 1] === '--slug');

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
    case 'run':
      console.log('run: scrape:artofvfx → scrape:beforesandafters → import:vfx');
      await scrapeArtOfVfx(slugFlag);
      await scrapeBeforesAndAfters(slugFlag);
      await importVfx();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Usage: tsx src/cli.ts <scrape:artofvfx|scrape:beforesandafters|import:vfx|run> [--slug <production-slug>]');
      process.exit(1);
  }
}

main().catch((err) => { console.error(err); process.exit(1); });
