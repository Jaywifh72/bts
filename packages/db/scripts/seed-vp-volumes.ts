// VP volume catalog seed — Stagecraft, MARS, Volume 51, etc.
// Idempotent — UPDATE on slug conflict.
//
// Usage: pnpm --filter @bts/db exec tsx scripts/seed-vp-volumes.ts
import { db, sql } from '../src/index.ts';

type VolumeSeed = {
  slug: string;
  name: string;
  facility_name: string | null;
  operator: string;
  country: string;
  city: string;
  led_brand: string | null;
  led_pitch_mm: number | null;
  wall_width_m: number | null;
  wall_height_m: number | null;
  ceiling_present: boolean;
  ceiling_height_m: number | null;
  tracking_system: string | null;
  render_engine: string | null;
  color_pipeline: string | null;
  completion_year: number;
  atmos_capable: boolean;
  website_url: string | null;
  summary: string;
};

const VOLUMES: VolumeSeed[] = [
  {
    slug: 'stagecraft-manhattan-beach',
    name: 'Stagecraft Volume 1', facility_name: 'ILM Stagecraft Manhattan Beach',
    operator: 'Industrial Light & Magic', country: 'US', city: 'Manhattan Beach, CA',
    led_brand: 'ROE Visual Black Pearl 2.84mm', led_pitch_mm: 2.84,
    wall_width_m: 22.8, wall_height_m: 6.0,
    ceiling_present: true, ceiling_height_m: 3.6,
    tracking_system: 'Mo-Sys StarTracker / Stype + ARRI ICVFX',
    render_engine: 'Unreal Engine 4 (and later 5)',
    color_pipeline: 'ACES + OCIO; per-show LUTs',
    completion_year: 2019, atmos_capable: false,
    website_url: 'https://www.ilm.com/stagecraft/',
    summary: 'The original Mandalorian volume. 270° wall with parallax-corrected real-time environments. ILM\'s in-camera VFX (ICVFX) flagship.',
  },
  {
    slug: 'stagecraft-vancouver',
    name: 'Stagecraft Vancouver', facility_name: 'Mammoth Studios',
    operator: 'Industrial Light & Magic', country: 'CA', city: 'Burnaby, BC',
    led_brand: 'ROE Visual Black Pearl 2.84mm', led_pitch_mm: 2.84,
    wall_width_m: 23, wall_height_m: 7.0,
    ceiling_present: true, ceiling_height_m: 4.5,
    tracking_system: 'Mo-Sys + Stype',
    render_engine: 'Unreal Engine 5', color_pipeline: 'ACES + OCIO',
    completion_year: 2022, atmos_capable: false, website_url: null,
    summary: 'Larger sister stage to Manhattan Beach. Used on Star Wars + Marvel episodic projects.',
  },
  {
    slug: 'mars-volume-pinewood',
    name: 'MARS Volume', facility_name: 'Pinewood Studios',
    operator: 'NEP Group / The MARS Volume', country: 'GB', city: 'Iver Heath',
    led_brand: 'ROE Diamond 2.6mm', led_pitch_mm: 2.6,
    wall_width_m: 27, wall_height_m: 7.5,
    ceiling_present: true, ceiling_height_m: 5.0,
    tracking_system: 'Stype Redspy', render_engine: 'Unreal Engine 5',
    color_pipeline: 'ACES + OCIO',
    completion_year: 2021, atmos_capable: false,
    website_url: 'https://www.themarsvolume.com',
    summary: 'UK-side flagship for tentpole VP. House of the Dragon, various BBC drama.',
  },
  {
    slug: 'volume-51-disney',
    name: 'Volume 51', facility_name: 'Walt Disney Imagineering',
    operator: 'Disney', country: 'US', city: 'Glendale, CA',
    led_brand: 'ROE Diamond 2.6mm', led_pitch_mm: 2.6,
    wall_width_m: 36, wall_height_m: 6.7,
    ceiling_present: true, ceiling_height_m: 4.3,
    tracking_system: 'Mo-Sys', render_engine: 'Unreal Engine 5',
    color_pipeline: 'ACES + OCIO',
    completion_year: 2021, atmos_capable: true,
    website_url: null,
    summary: 'Imagineering-built — large-format wall with Atmos integration for theme park previz + Disney+ episodic.',
  },
  {
    slug: 'lux-machina-trilith',
    name: 'Trilith Volume', facility_name: 'Trilith Studios',
    operator: 'Lux Machina', country: 'US', city: 'Atlanta, GA (Fayetteville)',
    led_brand: 'ROE Black Pearl 2.84mm', led_pitch_mm: 2.84,
    wall_width_m: 24, wall_height_m: 6.1,
    ceiling_present: true, ceiling_height_m: 4.5,
    tracking_system: 'Mo-Sys', render_engine: 'Unreal Engine 5',
    color_pipeline: 'ACES + OCIO',
    completion_year: 2021, atmos_capable: false, website_url: 'https://luxmachina.com',
    summary: 'Marvel-aligned (Trilith hosts Marvel Studios). Series + film VP work — Loki, Ahsoka, several Marvel TV.',
  },
  {
    slug: 'orca-studios-vp',
    name: 'Orca Studios Volume', facility_name: 'Orca Studios Madrid',
    operator: 'Orca Studios', country: 'ES', city: 'Madrid',
    led_brand: 'ROE Black Pearl 2.84mm', led_pitch_mm: 2.84,
    wall_width_m: 25, wall_height_m: 6,
    ceiling_present: true, ceiling_height_m: 4,
    tracking_system: 'Mo-Sys', render_engine: 'Unreal Engine',
    color_pipeline: 'ACES + OCIO',
    completion_year: 2021, atmos_capable: false, website_url: 'https://orcastudios.com',
    summary: 'Major European VP service provider. Series + commercials work for Netflix Spain + Movistar+.',
  },
  {
    slug: 'sky-studios-elstree-vp',
    name: 'Sky Volume', facility_name: 'Sky Studios Elstree',
    operator: 'Sky Studios', country: 'GB', city: 'Hertfordshire',
    led_brand: 'ROE Diamond 2.6mm', led_pitch_mm: 2.6,
    wall_width_m: 24, wall_height_m: 7,
    ceiling_present: true, ceiling_height_m: 4.5,
    tracking_system: 'Mo-Sys', render_engine: 'Unreal Engine 5',
    color_pipeline: 'ACES + OCIO',
    completion_year: 2022, atmos_capable: false, website_url: 'https://www.sky.com/skystudios',
    summary: 'Newer-build UK volume. Sky-funded; rental access for outside productions.',
  },
  {
    slug: 'fuse-vp-toronto',
    name: 'Fuse Volume', facility_name: 'Fuse Technical Group',
    operator: 'Fuse Technical Group', country: 'CA', city: 'Toronto',
    led_brand: 'ROE Black Pearl 2.84mm', led_pitch_mm: 2.84,
    wall_width_m: 23, wall_height_m: 6,
    ceiling_present: false, ceiling_height_m: null,
    tracking_system: 'Mo-Sys', render_engine: 'Unreal Engine',
    color_pipeline: 'ACES',
    completion_year: 2022, atmos_capable: false, website_url: 'https://www.fusetg.com',
    summary: 'Canadian VP provider. Commercials + episodic work.',
  },
];

for (const v of VOLUMES) {
  await db.execute(sql`
    INSERT INTO vp_volumes (
      slug, name, facility_name, operator, country, city,
      led_brand, led_pitch_mm, wall_width_m, wall_height_m,
      ceiling_present, ceiling_height_m,
      tracking_system, render_engine, color_pipeline,
      completion_year, atmos_capable, website_url, summary,
      data_tier, last_verified_at
    ) VALUES (
      ${v.slug}, ${v.name}, ${v.facility_name}, ${v.operator}, ${v.country}, ${v.city},
      ${v.led_brand}, ${v.led_pitch_mm}, ${v.wall_width_m}, ${v.wall_height_m},
      ${v.ceiling_present}, ${v.ceiling_height_m},
      ${v.tracking_system}, ${v.render_engine}, ${v.color_pipeline},
      ${v.completion_year}, ${v.atmos_capable}, ${v.website_url}, ${v.summary},
      'curated', NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name, facility_name = EXCLUDED.facility_name,
      operator = EXCLUDED.operator, country = EXCLUDED.country, city = EXCLUDED.city,
      led_brand = EXCLUDED.led_brand, led_pitch_mm = EXCLUDED.led_pitch_mm,
      wall_width_m = EXCLUDED.wall_width_m, wall_height_m = EXCLUDED.wall_height_m,
      ceiling_present = EXCLUDED.ceiling_present, ceiling_height_m = EXCLUDED.ceiling_height_m,
      tracking_system = EXCLUDED.tracking_system, render_engine = EXCLUDED.render_engine,
      color_pipeline = EXCLUDED.color_pipeline,
      completion_year = EXCLUDED.completion_year, atmos_capable = EXCLUDED.atmos_capable,
      website_url = EXCLUDED.website_url, summary = EXCLUDED.summary,
      data_tier = 'curated', last_verified_at = NOW(), updated_at = NOW()
  `);
}

// Per-production credits — Mandalorian → Stagecraft, etc. INSERT...SELECT
// guards on missing production slugs.
const CREDITS = [
  { production_slug: 'the-mandalorian', volume_slug: 'stagecraft-manhattan-beach', use: 'ICVFX environment plates across S1-S3' },
  { production_slug: 'the-batman-2022', volume_slug: 'stagecraft-manhattan-beach', use: 'Wayne Tower interior reflections, Riddler tape interrogation room' },
  { production_slug: 'house-of-the-dragon', volume_slug: 'mars-volume-pinewood', use: 'Dragonstone interiors, throne room' },
];

for (const c of CREDITS) {
  await db.execute(sql`
    INSERT INTO production_vp_volumes (production_id, volume_id, credited_use)
    SELECT p.id, v.id, ${c.use}
    FROM productions p, vp_volumes v
    WHERE p.slug = ${c.production_slug} AND v.slug = ${c.volume_slug}
    ON CONFLICT (production_id, volume_id) DO UPDATE SET
      credited_use = EXCLUDED.credited_use
  `);
}

console.log(`[+] vp_volumes: ${VOLUMES.length} rows + ${CREDITS.length} production credits attempted`);
process.exit(0);
