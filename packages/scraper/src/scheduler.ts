import 'dotenv/config';
import cron from 'node-cron';
import { scrapeArtOfVfx } from './scrapers/art-of-vfx.ts';
import { scrapeBeforesAndAfters } from './scrapers/befores-and-afters.ts';
import { loadRawBreakdowns } from './import/transform.ts';
import { upsertBreakdown } from './import/upsert.ts';
import { discoverVideos } from './discovery/run.ts';

const schedule = process.env.SCRAPER_CRON ?? '0 3 * * 1'; // Monday 3AM

console.log(`Scraper scheduler started. Cron: ${schedule}`);

cron.schedule(schedule, async () => {
  console.log(`[${new Date().toISOString()}] Starting scheduled scrape run`);
  try {
    await scrapeArtOfVfx();
  } catch (e) {
    console.error('scrape:artofvfx failed:', e instanceof Error ? e.message : String(e));
  }
  try {
    await scrapeBeforesAndAfters();
  } catch (e) {
    console.error('scrape:beforesandafters failed:', e instanceof Error ? e.message : String(e));
  }
  try {
    const breakdowns = await loadRawBreakdowns();
    for (const b of breakdowns) {
      await upsertBreakdown(b).catch((err: unknown) => {
        console.error(`upsert failed for ${b.production_slug}:`, err instanceof Error ? err.message : String(err));
      });
    }
  } catch (e) {
    console.error('import:vfx failed:', e instanceof Error ? e.message : String(e));
  }
  try {
    await discoverVideos();
  } catch (e) {
    console.error('discover:videos failed:', e instanceof Error ? e.message : String(e));
  }
  console.log(`[${new Date().toISOString()}] Scheduled run complete`);
});
