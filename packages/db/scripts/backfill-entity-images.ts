// Backfill websites + wikidata_ids so the BrandLogo component can hot-link
// Google's favicon service for every company tile in the UI. This is the
// company-side counterpart to the TMDb profile_path backfill for people.
//
// BrandLogo derives the favicon domain from the `website` column. Studios
// don't have a `website` column in the schema, so we fall back to using
// `wikidata_id` as the discriminator the UI can use to fetch a logo
// indirectly (or to display a typographic mark via BrandMark).
import { db, sql } from '../src/index.ts';

// ── VFX houses ─────────────────────────────────────────────────────────────
const VFX_HOUSES: Array<{ slug: string; website: string; wikidata_id?: string }> = [
  { slug: '4th-creative-party',  website: 'https://www.4creative.tv' },
  { slug: 'atomic-fiction',      website: 'https://methodstudios.com' /* same parent as Method now */ },
  { slug: 'blind-ltd',           website: 'https://www.blind.com' },
  { slug: 'buf',                 website: 'https://www.buf.com', wikidata_id: 'Q1003872' },
  { slug: 'dexter-studios',      website: 'https://www.dexterstudios.com' },
  { slug: 'lola-vfx',            website: 'https://www.lolavfx.com' },
  { slug: 'method-studios',      website: 'https://methodstudios.com', wikidata_id: 'Q24705116' },
  { slug: 'plowman-craven',      website: 'https://plowmancraven.co.uk' },
  { slug: 'stereo-d',            website: 'https://www.stereodspace.com', wikidata_id: 'Q17000810' },
  { slug: 'territory-studio',    website: 'https://territorystudio.com' },
  { slug: 'upp',                 website: 'https://www.upp.cz', wikidata_id: 'Q3551528' },
  { slug: 'westworld-vfx',       website: 'https://www.westworld.co.kr' },
];

console.log(`backfilling ${VFX_HOUSES.length} vfx_houses…`);
let vfxUpdated = 0;
for (const v of VFX_HOUSES) {
  try {
    const r = await db.execute<{ id: number }>(sql`
      UPDATE vfx_houses
      SET website = COALESCE(NULLIF(website, ''), ${v.website}),
          wikidata_id = COALESCE(wikidata_id, ${v.wikidata_id ?? null}),
          updated_at = NOW()
      WHERE slug = ${v.slug}
      RETURNING id
    `);
    if (r.length > 0) vfxUpdated++;
  } catch (e) {
    // Wikidata ID collisions can happen when two slugs map to the same
    // legal entity. Fall back to website-only update.
    try {
      const r = await db.execute<{ id: number }>(sql`
        UPDATE vfx_houses SET website = COALESCE(NULLIF(website, ''), ${v.website}), updated_at = NOW()
        WHERE slug = ${v.slug} RETURNING id
      `);
      if (r.length > 0) vfxUpdated++;
    } catch (e2) {
      console.error(`  [!] ${v.slug}: ${e2 instanceof Error ? e2.message : String(e2)}`);
    }
  }
}
console.log(`  [+] ${vfxUpdated} updated`);

// ── Studios — Wikidata IDs for major studios ───────────────────────────────
const STUDIO_WIKIDATA: Array<{ slug: string; wikidata_id: string }> = [
  { slug: 'warner-bros',         wikidata_id: 'Q126399' },
  { slug: 'paramount',           wikidata_id: 'Q159846' },
  { slug: 'universal',           wikidata_id: 'Q35509' },
  { slug: 'a24',                 wikidata_id: 'Q15953699' },
  { slug: 'searchlight',         wikidata_id: 'Q1075067' },
  { slug: 'columbia-pictures',   wikidata_id: 'Q49263' },
  { slug: 'netflix',             wikidata_id: 'Q907311' },
  { slug: 'focus-features',      wikidata_id: 'Q1429545' },
  { slug: 'neon',                wikidata_id: 'Q56234128' },
  { slug: 'film4',               wikidata_id: 'Q2403484' },
  { slug: 'lionsgate',           wikidata_id: 'Q176408' },
  { slug: 'miramax',             wikidata_id: 'Q172241' },
  { slug: 'mk2',                 wikidata_id: 'Q1947957' },
  { slug: 'sony-pictures',       wikidata_id: 'Q190420' },
  { slug: 'syncopy',             wikidata_id: 'Q2389492' },
  { slug: 'amazon-studios',      wikidata_id: 'Q4739646' },
  { slug: 'amblin',              wikidata_id: 'Q176151' },
  { slug: 'zoetrope',            wikidata_id: 'Q1131770' },
  { slug: 'apple-tv-plus',       wikidata_id: 'Q63969612' },
  { slug: 'dreamworks',          wikidata_id: 'Q200912' },
  { slug: 'legendary',           wikidata_id: 'Q205049' },
  { slug: 'twentieth-century-fox', wikidata_id: 'Q186600' },
  { slug: 'skydance-media',      wikidata_id: 'Q5392403' },
  { slug: 'jerry-bruckheimer-films', wikidata_id: 'Q1689841' },
  { slug: 'cj-entertainment',    wikidata_id: 'Q3001625' },
  { slug: 'heyday-films',        wikidata_id: 'Q2110795' },
  { slug: 'esperanto-filmoj',    wikidata_id: 'Q5396580' },
  { slug: 'strike-entertainment', wikidata_id: 'Q7622974' },
  { slug: 'ingenious-film-partners', wikidata_id: 'Q4712023' },
  { slug: 'toho-towa',           wikidata_id: 'Q11531484' },
  { slug: 'new-regency-productions', wikidata_id: 'Q261075' },
  { slug: 'ratpac-dune-entertainment', wikidata_id: 'Q1986124' },
  { slug: 'anonymous-content',   wikidata_id: 'Q4773139' },
  { slug: 'appian-way-productions', wikidata_id: 'Q608558' },
  { slug: 'scott-rudin-productions', wikidata_id: 'Q7437005' },
  { slug: 'mike-zoss-productions', wikidata_id: 'Q6841969' },
  { slug: 'paramount-vantage',   wikidata_id: 'Q1991767' },
  { slug: 'filmnation-entertainment', wikidata_id: 'Q5450173' },
  { slug: 'thunderbird-entertainment', wikidata_id: 'Q7796127' },
];

console.log(`\nbackfilling ${STUDIO_WIKIDATA.length} studios wikidata_id…`);
let studioUpdated = 0;
for (const s of STUDIO_WIKIDATA) {
  try {
    const r = await db.execute<{ id: number }>(sql`
      UPDATE studios SET wikidata_id = ${s.wikidata_id}, updated_at = NOW()
      WHERE slug = ${s.slug} AND wikidata_id IS NULL
      RETURNING id
    `);
    if (r.length > 0) studioUpdated++;
  } catch (e) {
    // Some Wikidata IDs may collide if duplicates were seeded; log and continue.
    console.error(`  [!] ${s.slug}: ${e instanceof Error ? e.message : String(e)}`);
  }
}
console.log(`  [+] ${studioUpdated} updated`);

// ── Stunt schools / companies / post houses ────────────────────────────────
const MISC_WEBSITES: Array<{ table: string; slug: string; website: string }> = [
  { table: 'stunt_schools', slug: 'hollywood-stunt-driving-academy', website: 'https://www.stuntdriving.com' },
  { table: 'stunt_schools', slug: 'thunder-road-stunt-school',       website: 'https://www.thunderroadstuntschool.com' },
  { table: 'stunt_companies', slug: 'action-vehicles',               website: 'https://www.vicarmstrong.com' },
  { table: 'post_houses', slug: 'sony-post',                         website: 'https://www.sonypicturespost.com' },
];

console.log(`\nbackfilling ${MISC_WEBSITES.length} misc entities websites…`);
let miscUpdated = 0;
for (const m of MISC_WEBSITES) {
  const r = await db.execute<{ id: number }>(
    sql.raw(`UPDATE ${m.table} SET website = COALESCE(NULLIF(website, ''), '${m.website}'), updated_at = NOW() WHERE slug = '${m.slug}' RETURNING id`)
  );
  if (r.length > 0) miscUpdated++;
}
console.log(`  [+] ${miscUpdated} updated`);

console.log('\n──────────────────────────────────────────────');
console.log('Entity image-source backfill complete');
console.log('──────────────────────────────────────────────');
process.exit(0);
