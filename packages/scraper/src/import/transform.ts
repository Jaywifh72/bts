import fs from 'node:fs/promises';
import path from 'node:path';
import { RawVfxBreakdownSchema, type RawVfxBreakdown } from '../scrapers/types.ts';

const RAW_DIR = new URL('../../../data/vfx-raw/', import.meta.url).pathname;

export async function loadRawBreakdowns(): Promise<RawVfxBreakdown[]> {
  const results: RawVfxBreakdown[] = [];

  const files = await fs.readdir(RAW_DIR).catch(() => [] as string[]);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const filePath = path.join(RAW_DIR, file);
    try {
      const raw = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      const parsed = RawVfxBreakdownSchema.safeParse(raw);
      if (parsed.success) {
        results.push(parsed.data);
      } else {
        console.warn(`  Skipping invalid JSON: ${file}`, parsed.error.issues[0]?.message);
      }
    } catch (err) {
      console.warn(`  Could not read ${file}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Prefer artofvfx over beforesandafters for the same production:
  // Sort so artofvfx entries come last (they win on upsert)
  results.sort((a, b) => {
    if (a.source === b.source) return 0;
    return a.source === 'artofvfx' ? 1 : -1;
  });

  return results;
}
