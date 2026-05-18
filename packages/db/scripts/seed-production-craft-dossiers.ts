import { db } from '../src/db.ts';
import { sql } from 'drizzle-orm';

type Dossier = {
  slug: string;
  production_slug: string;
  craft: 'pd' | 'costume' | 'makeup-hair';
  headline: string;
  lead_credit?: string;
  lead_person_slug?: string;
  summary?: string;
  body?: string;
  signature_looks?: string[];
  techniques?: string[];
  references_consulted?: string[];
  collaborators?: string[];
  references?: Array<{ title: string; url: string; publication?: string; kind?: string }>;
};

const DOSSIERS: Dossier[] = [
  // -------- Production design --------
  {
    slug: 'asteroid-city-pd-stockhausen',
    production_slug: 'asteroid-city',
    craft: 'pd',
    headline: 'Building the desert town of Asteroid City',
    lead_credit: 'Adam Stockhausen (PD)',
    lead_person_slug: 'adam-stockhausen',
    summary: 'Anderson and Stockhausen built a full-scale postwar desert town outside Chinchón, Spain — every storefront, motel cabin, and observatory practical. The cone-shaped mountains beyond are matte paintings, the famous mushroom-cloud test is a miniature.',
    signature_looks: ['Burnt-orange motel cabins', 'Mid-century roadside diner', 'Cone-shaped matte-painted mountains', 'Pastel observatory complex'],
    techniques: ['Full-scale practical town build', 'Miniature mushroom cloud + matte-painted skies', 'Saturated single-source key reinforcing storybook tone'],
    references_consulted: ['1955 Edward Hopper roadside paintings', 'Saul Bass title-design palette', 'Atomic-era roadside Americana photography'],
    collaborators: ['Robert Yeoman (DP)', 'Milena Canonero (costume)'],
    references: [{ title: 'Asteroid City production design notebook', url: 'https://variety.com/2023/artisans/news/asteroid-city-production-design-wes-anderson-1235632432/', publication: 'Variety' }],
  },
  {
    slug: 'oppenheimer-pd-crowley',
    production_slug: 'oppenheimer',
    craft: 'pd',
    headline: 'Recreating Los Alamos as a town that vanishes',
    lead_credit: 'Ruth De Jong (PD)',
    summary: 'De Jong built a working Los Alamos at Ghost Ranch, NM — barracks, the chalkboard-walled tech area, and the Trinity site assembly tower — to a scale that allowed Nolan to film practical anywhere in the build.',
    signature_looks: ['Chalkboard-lined T-shaped offices', 'Pre-fab WWII barracks streetscape', 'Trinity tower assembly bay'],
    techniques: ['Full-town outdoor build', 'Practical period dressing right down to typewriter brands', 'IMAX-ready geometry (no anachronistic signage in 70mm sightlines)'],
    references_consulted: ['Manhattan Project archive photography', 'American Prometheus (Bird & Sherwin)'],
    collaborators: ['Hoyte van Hoytema (DP)', 'Ellen Mirojnick (costume)'],
  },

  // -------- Costume --------
  {
    slug: 'killers-of-the-flower-moon-costume-powell',
    production_slug: 'killers-of-the-flower-moon',
    craft: 'costume',
    headline: 'Period accuracy + Osage textile authority',
    lead_credit: 'Jacqueline West (costume)',
    summary: 'West worked directly with Osage Nation consultants and weaver Julie O’Keefe to commission authentic broadcloth, ribbonwork blankets, and finger-woven sashes. The non-Native cast was costumed from period-accurate 1920s Oklahoma sources to keep the contrast quiet rather than ornamental.',
    signature_looks: ['Osage broadcloth blankets with ribbonwork', 'Finger-woven sashes', '1920s Oklahoma oil-money tailoring'],
    techniques: ['Direct Osage consultation', 'Period-correct wool weights for desert heat', 'Aging / breakdown for working ranch hands vs. society interiors'],
    references_consulted: ['Osage Nation cultural office', 'David Grann’s reporting photographs'],
    collaborators: ['Rodrigo Prieto (DP)'],
  },
  {
    slug: 'barbie-costume-durran',
    production_slug: 'barbie',
    craft: 'costume',
    headline: 'Pink-coded archive + ten thousand body-positive fittings',
    lead_credit: 'Jacqueline Durran (costume)',
    summary: 'Durran built the Barbieland palette from Mattel archive references — every era of Barbie packaged into Robbie’s wardrobe. Real-world Mattel partner manufacturers built collectible runs that doubled as production wardrobe.',
    signature_looks: ['Disco rollerskate set', 'Western fringe (Dance of the Cowboys)', 'Black-and-white pinup', 'Premiere-pink power suit'],
    techniques: ['Direct Mattel archive licensing', 'Custom Chanel + Versace commissions', 'Pink stunt-doubling for action set-pieces'],
    references_consulted: ['Mattel archive (1959–present)', 'Hollywood Regency interior palettes'],
    collaborators: ['Sarah Greenwood (PD)'],
  },

  // -------- Makeup & hair --------
  {
    slug: 'the-whale-makeup-fryer',
    production_slug: 'the-whale',
    craft: 'makeup-hair',
    headline: 'Building the body of Charlie',
    lead_credit: 'Adrien Morot (prosthetic design)',
    summary: 'Morot sculpted a full silicone body suit and face appliances allowing Brendan Fraser the full register of micro-expression. The suit was engineered with weighted fluid bladders so that small movements read with the right inertia.',
    signature_looks: ['Full silicone body suit', 'Layered face appliances anchored on Fraser’s own bone structure', 'Weighted fluid bladders for natural body inertia'],
    techniques: ['Per-day appliance application (4-6 hours)', 'Internal cooling vents for heat management', 'Custom dentition + ocular prosthetics'],
    references_consulted: ['Bariatric medical references', 'Live-cast life models for body topology'],
    collaborators: ['Anne McCabe (editor)'],
    references: [{ title: 'How Adrien Morot built Charlie', url: 'https://www.hollywoodreporter.com/movies/movie-features/the-whale-brendan-fraser-makeup-adrien-morot-1235290700/', publication: 'The Hollywood Reporter' }],
  },
  {
    slug: 'poor-things-makeup-shircore',
    production_slug: 'poor-things',
    craft: 'makeup-hair',
    headline: 'Bella Baxter’s evolving makeup arc',
    lead_credit: 'Nadia Stacey (makeup & hair designer)',
    summary: 'Stacey designed makeup that tracked Bella’s mental age across the film — porcelain doll-like at infancy, smudged kohl as she discovers desire, and finally a self-determined adult palette. Wigs were built in Yorgos Lanthimos’s signature near-monochrome blue-blacks.',
    signature_looks: ['Porcelain-doll infancy', 'Smudged kohl + flushed lip (desire stage)', 'Self-applied adult palette', 'Architectural Bella wig — blue-black, hip-length'],
    techniques: ['Per-scene aging via lip / brow density', 'Edwardian wig construction with extra weight', 'Mark Coulier-collab prosthetics on supporting characters'],
    references_consulted: ['Belle Époque studio portraits', 'Egon Schiele drawings'],
  },
];

async function seed() {
  const arr = (xs?: string[]) =>
    `{${(xs ?? []).map(s => `"${s.replace(/"/g, '\\"')}"`).join(',')}}`;

  for (const d of DOSSIERS) {
    // Look up production_id by slug
    const prods = await db.execute<{ id: number }>(sql`
      SELECT id FROM productions WHERE slug = ${d.production_slug} LIMIT 1
    `);
    const productionId = prods[0]?.id;
    if (!productionId) {
      console.warn(`[dossiers] skip ${d.slug} — production "${d.production_slug}" not found`);
      continue;
    }

    let leadPersonId: number | null = null;
    if (d.lead_person_slug) {
      const lp = await db.execute<{ id: number }>(sql`
        SELECT id FROM people WHERE slug = ${d.lead_person_slug} LIMIT 1
      `);
      leadPersonId = lp[0]?.id ?? null;
    }

    const refsJson = JSON.stringify(d.references ?? []);

    await db.execute(sql`
      INSERT INTO production_craft_dossiers
        (slug, production_id, craft, headline, lead_credit, lead_person_id,
         summary, body, signature_looks, techniques, references_consulted,
         collaborators, "references", data_tier, last_curated_review)
      VALUES (${d.slug}, ${productionId}, ${d.craft}, ${d.headline},
              ${d.lead_credit ?? null}, ${leadPersonId},
              ${d.summary ?? null}, ${d.body ?? null},
              ${sql.raw(`'${arr(d.signature_looks)}'`)}::text[],
              ${sql.raw(`'${arr(d.techniques)}'`)}::text[],
              ${sql.raw(`'${arr(d.references_consulted)}'`)}::text[],
              ${sql.raw(`'${arr(d.collaborators)}'`)}::text[],
              ${refsJson}::jsonb, 'curated', now())
      ON CONFLICT (slug) DO UPDATE SET
        production_id = EXCLUDED.production_id,
        craft = EXCLUDED.craft,
        headline = EXCLUDED.headline,
        lead_credit = EXCLUDED.lead_credit,
        lead_person_id = EXCLUDED.lead_person_id,
        summary = EXCLUDED.summary,
        body = EXCLUDED.body,
        signature_looks = EXCLUDED.signature_looks,
        techniques = EXCLUDED.techniques,
        references_consulted = EXCLUDED.references_consulted,
        collaborators = EXCLUDED.collaborators,
        "references" = EXCLUDED."references",
        data_tier = EXCLUDED.data_tier,
        last_curated_review = now(),
        updated_at = now()
    `);
    console.log(`[dossiers] seeded ${d.slug}`);
  }
  process.exit(0);
}

seed().catch((e) => { console.error(e); process.exit(1); });
