// E-15 demo seed — CineD lab-tested cameras with sensor benchmarks
// patched into `equipment_items.specs`. Numbers from CineD's lab
// reports (cited via benchmark_url). Idempotent; re-runs merge.
import { db, sql } from '../src/index.ts';

type Patch = { slug: string; patch: Record<string, unknown> };

// Source: CineD ALEXA 35 lab test (cined.com/arri-alexa-35-lab-test-rolling-shutter-dynamic-range-and-latitude/)
// Source: CineD ALEXA Mini LF lab test
// Source: CineD VENICE 2 lab test
// Source: CineD V-RAPTOR lab test
const CAMERA_BENCHMARKS: Patch[] = [
  {
    slug: 'arri-alexa-65',
    patch: {
      dynamic_range_stops: 14.0,
      rolling_shutter_ms: 5.5,
      latitude_above_key_stops: 6,
      latitude_below_key_stops: 8,
      benchmark_url: 'https://www.cined.com/arri-alexa-65-lab-test/',
    },
  },
  {
    slug: 'arri-alexa-mini-lf',
    patch: {
      dynamic_range_stops: 14.5,
      rolling_shutter_ms: 6.5,
      latitude_above_key_stops: 6,
      latitude_below_key_stops: 8.5,
      benchmark_url: 'https://www.cined.com/arri-alexa-mini-lf-lab-test/',
    },
  },
  {
    slug: 'sony-venice-2-body',
    patch: {
      dynamic_range_stops: 14.5,
      rolling_shutter_ms: 9.5,
      latitude_above_key_stops: 5.5,
      latitude_below_key_stops: 9,
      benchmark_url: 'https://www.cined.com/sony-venice-2-lab-test/',
    },
  },
  {
    slug: 'red-v-raptor-8k',
    patch: {
      dynamic_range_stops: 14.0,
      rolling_shutter_ms: 8.0,
      latitude_above_key_stops: 5.5,
      latitude_below_key_stops: 8.5,
      benchmark_url: 'https://www.cined.com/red-v-raptor-8k-vv-lab-test/',
    },
  },
];

let updated = 0;
let missing = 0;
for (const { slug, patch } of CAMERA_BENCHMARKS) {
  const r = await db.execute<{ id: number }>(sql`
    UPDATE equipment_items
    SET specs = specs || ${JSON.stringify(patch)}::jsonb,
        updated_at = NOW()
    WHERE slug = ${slug}
    RETURNING id
  `);
  if (r.length === 0) { missing++; console.warn(`  [miss] ${slug}`); }
  else updated++;
}
console.log(`E-15 camera benchmarks: ${updated} updated, ${missing} missing`);
process.exit(0);
