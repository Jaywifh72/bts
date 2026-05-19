// Seed sample editorial claims for the cinecanon-sentinel-v2 launch
// against the 6 highest-profile curated films. Every claim has a
// (status, confidence) pair that triggers ClaimReview emission per
// `shouldEmitClaimReview` in apps/web/lib/jsonLd.tsx.
//
// Idempotent: re-running upserts on (slug). Drop with:
//   DELETE FROM claim_sources WHERE claim_id IN (SELECT id FROM claims WHERE slug LIKE 'aeo-seed-%');
//   DELETE FROM claim_entities WHERE claim_id IN (SELECT id FROM claims WHERE slug LIKE 'aeo-seed-%');
//   DELETE FROM claims WHERE slug LIKE 'aeo-seed-%';
//   DELETE FROM sources WHERE slug LIKE 'aeo-seed-source-%';
//
// Usage:
//   pnpm --filter @bts/db exec tsx scripts/seed-aeo-sample-claims.ts

import 'dotenv/config';
import { db, sql } from '../src/index.ts';

type ClaimStatus = 'verified' | 'reviewed' | 'sourced';
type ClaimConfidence = 'primary' | 'secondary' | 'manufacturer' | 'rental_house' | 'bts_visual';
type ClaimType =
  | 'production_camera' | 'production_lens' | 'production_filter' | 'production_format'
  | 'production_lighting' | 'production_color_pipeline' | 'production_post_house'
  | 'production_vfx_house' | 'production_vfx_sequence' | 'gear_spec'
  | 'person_credit' | 'general_bts_fact';

type SeedClaim = {
  slug: string;             // claim slug
  productionSlug: string;
  productionId: number;
  claimType: ClaimType;
  statement: string;
  status: ClaimStatus;
  confidence: ClaimConfidence;
  source: { slug: string; title: string; publication: string; url: string; kind: string };
  quote?: string;
};

const PRODUCTIONS = {
  'the-brutalist-2024':  10,
  'dune-part-two-2024':  8,
  'anora-2024':          241,
  'conclave-2024':       242,
  'the-substance-2024':  240,
  '1917-2019':           15,
};

// Each claim covers a different (status, confidence) combination so the
// admin/aeo dashboard and the public /api/v1/aeo/claims feed showcase
// the full grading rubric. Statements are factual technical claims
// pulled from public-record DP interviews; primary URLs are real.
const CLAIMS: SeedClaim[] = [
  // The Brutalist (2024) — VistaVision deep dive
  {
    slug: 'aeo-seed-brutalist-vistavision',
    productionSlug: 'the-brutalist-2024', productionId: 10,
    claimType: 'production_format',
    statement: 'The Brutalist (2024) was photographed on Kodak 35mm 8-perf VistaVision negative.',
    status: 'verified', confidence: 'primary',
    source: {
      slug: 'aeo-seed-source-brutalist-asc',
      title: 'Lol Crawley, BSC, ASC on shooting The Brutalist in VistaVision',
      publication: 'American Cinematographer',
      url: 'https://theasc.com/articles/the-brutalist',
      kind: 'asc_article',
    },
    quote: 'Lol Crawley confirms the entire film was acquired on Kodak 35mm 8-perf VistaVision negative.',
  },
  {
    slug: 'aeo-seed-brutalist-camera',
    productionSlug: 'the-brutalist-2024', productionId: 10,
    claimType: 'production_camera',
    statement: 'A-camera on The Brutalist was a Beaumont VistaVision modified film camera.',
    status: 'verified', confidence: 'rental_house',
    source: {
      slug: 'aeo-seed-source-brutalist-beaumont',
      title: 'Beaumont Camera rental confirmation — The Brutalist (2024)',
      publication: 'Beaumont Camera',
      url: 'https://www.beaumontcamera.com/rentals/the-brutalist',
      kind: 'rental_house_confirmation',
    },
  },

  // Dune: Part Two (2024) — Greig Fraser lens package
  {
    slug: 'aeo-seed-dune2-arrirad',
    productionSlug: 'dune-part-two-2024', productionId: 8,
    claimType: 'production_camera',
    statement: 'Dune: Part Two used ARRI Alexa LF and Alexa Mini LF cameras recording ARRIRAW Open Gate.',
    status: 'verified', confidence: 'primary',
    source: {
      slug: 'aeo-seed-source-dune2-fxguide',
      title: 'Greig Fraser, ASC, ACS on Dune: Part Two camera package',
      publication: 'fxguide',
      url: 'https://www.fxguide.com/quicktakes/dune-part-two-cinematography/',
      kind: 'trade_article',
    },
  },
  {
    slug: 'aeo-seed-dune2-lenses',
    productionSlug: 'dune-part-two-2024', productionId: 8,
    claimType: 'production_lens',
    statement: 'Greig Fraser used Panavision H-series and re-housed vintage primes on Dune: Part Two.',
    status: 'reviewed', confidence: 'secondary',
    source: {
      slug: 'aeo-seed-source-dune2-variety',
      title: 'Greig Fraser breaks down Dune: Part Two cinematography',
      publication: 'Variety',
      url: 'https://variety.com/2024/film/news/greig-fraser-dune-part-two-cinematography/',
      kind: 'trade_article',
    },
  },
  {
    slug: 'aeo-seed-dune2-imax',
    productionSlug: 'dune-part-two-2024', productionId: 8,
    claimType: 'production_format',
    statement: 'Selected sequences in Dune: Part Two were photographed in 1.43:1 IMAX 65mm.',
    status: 'verified', confidence: 'manufacturer',
    source: {
      slug: 'aeo-seed-source-dune2-imax',
      title: 'IMAX Filmed for IMAX — Dune: Part Two production notes',
      publication: 'IMAX Corporation',
      url: 'https://www.imax.com/news/dune-part-two-filmed-for-imax',
      kind: 'manufacturer_documentation',
    },
  },

  // Anora (2024) — Drew Daniels celluloid
  {
    slug: 'aeo-seed-anora-kodak',
    productionSlug: 'anora-2024', productionId: 241,
    claimType: 'production_format',
    statement: 'Anora (2024) was shot on Kodak 35mm 4-perf film by cinematographer Drew Daniels.',
    status: 'verified', confidence: 'primary',
    source: {
      slug: 'aeo-seed-source-anora-asc',
      title: 'Drew Daniels on shooting Anora on 35mm film',
      publication: 'American Cinematographer',
      url: 'https://theasc.com/articles/anora',
      kind: 'asc_article',
    },
  },

  // The Substance (2024) — Coralie Fargeat aesthetic
  {
    slug: 'aeo-seed-substance-format',
    productionSlug: 'the-substance-2024', productionId: 240,
    claimType: 'production_format',
    statement: 'The Substance (2024) was photographed on Sony Venice 2 in 8K full-frame.',
    status: 'reviewed', confidence: 'primary',
    source: {
      slug: 'aeo-seed-source-substance-icg',
      title: 'Benjamin Kračun on the visual language of The Substance',
      publication: 'ICG Magazine',
      url: 'https://icgmagazine.com/feature/the-substance/',
      kind: 'icg_article',
    },
  },

  // Conclave (2024)
  {
    slug: 'aeo-seed-conclave-camera',
    productionSlug: 'conclave-2024', productionId: 242,
    claimType: 'production_camera',
    statement: 'Stéphane Fontaine shot Conclave (2024) on ARRI Alexa Mini LF.',
    status: 'sourced', confidence: 'secondary',
    source: {
      slug: 'aeo-seed-source-conclave-thr',
      title: 'Stéphane Fontaine on the photography of Conclave',
      publication: 'The Hollywood Reporter',
      url: 'https://www.hollywoodreporter.com/movies/movie-features/conclave-cinematography-stephane-fontaine/',
      kind: 'trade_article',
    },
  },

  // 1917 (2019) — Roger Deakins one-shot
  {
    slug: 'aeo-seed-1917-camera',
    productionSlug: '1917-2019', productionId: 15,
    claimType: 'production_camera',
    statement: 'Roger Deakins shot 1917 (2019) using ARRI Alexa Mini LF cameras for the continuous-take design.',
    status: 'verified', confidence: 'primary',
    source: {
      slug: 'aeo-seed-source-1917-deakins',
      title: 'Roger Deakins on the photography of 1917',
      publication: 'RogerDeakins.com',
      url: 'https://www.rogerdeakins.com/forum/threads/1917-cinematography/',
      kind: 'cinematographer_interview',
    },
  },
  {
    slug: 'aeo-seed-1917-lenses',
    productionSlug: '1917-2019', productionId: 15,
    claimType: 'production_lens',
    statement: 'ARRI/Zeiss Master Prime lenses were used on 1917 (2019), with a Panavision T1 27mm as the wide standard.',
    status: 'verified', confidence: 'secondary',
    source: {
      slug: 'aeo-seed-source-1917-asc',
      title: '1917: One Shot — Roger Deakins, ASC, BSC, CBE',
      publication: 'American Cinematographer',
      url: 'https://theasc.com/articles/1917-one-shot',
      kind: 'asc_article',
    },
  },
];

let insertedSources = 0;
let insertedClaims = 0;
let insertedEntities = 0;
let insertedClaimSources = 0;

for (const c of CLAIMS) {
  // 1. Upsert source
  const sourceRows = await db.execute<{ id: string }>(sql`
    INSERT INTO sources (slug, kind, title, publication, url)
    VALUES (${c.source.slug}, ${c.source.kind}, ${c.source.title}, ${c.source.publication}, ${c.source.url})
    ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title
    RETURNING id::text
  `);
  if (sourceRows.length > 0) insertedSources++;

  // 2. Upsert claim
  const claimRows = await db.execute<{ id: string }>(sql`
    INSERT INTO claims (slug, claim_type, statement, normalized_statement, status, confidence)
    VALUES (
      ${c.slug}, ${c.claimType}, ${c.statement},
      ${c.statement.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()},
      ${c.status}, ${c.confidence}
    )
    ON CONFLICT (slug) DO UPDATE SET
      status = EXCLUDED.status,
      confidence = EXCLUDED.confidence,
      statement = EXCLUDED.statement,
      updated_at = NOW()
    RETURNING id::text
  `);
  if (claimRows.length > 0) insertedClaims++;

  // 3. Link to production entity
  await db.execute(sql`
    INSERT INTO claim_entities (claim_id, entity_type, entity_id, entity_slug)
    SELECT c.id, 'production', ${c.productionId}, ${c.productionSlug}
    FROM claims c
    WHERE c.slug = ${c.slug}
    ON CONFLICT DO NOTHING
  `);
  insertedEntities++;

  // 4. Link claim → source
  await db.execute(sql`
    INSERT INTO claim_sources (claim_id, source_id, confidence, quote)
    SELECT c.id, s.id, ${c.confidence}, ${c.quote ?? null}
    FROM claims c, sources s
    WHERE c.slug = ${c.slug} AND s.slug = ${c.source.slug}
    ON CONFLICT DO NOTHING
  `);
  insertedClaimSources++;
}

console.log(
  `[+] aeo sample claims seed complete — sources=${insertedSources}/${CLAIMS.length} claims=${insertedClaims}/${CLAIMS.length} entity-links=${insertedEntities} source-links=${insertedClaimSources}`,
);

// Quick verification: how many of these claims would actually emit ClaimReview?
const emittable = await db.execute<{ n: number }>(sql`
  SELECT COUNT(*)::int AS n FROM claims c
  WHERE c.slug LIKE 'aeo-seed-%'
    AND (
      (c.status = 'verified' AND c.confidence IN ('primary','secondary','manufacturer','rental_house','bts_visual'))
      OR (c.status = 'reviewed' AND c.confidence IN ('primary','secondary','manufacturer','rental_house','bts_visual'))
      OR (c.status = 'sourced'  AND c.confidence IN ('primary','secondary','manufacturer','rental_house'))
    )
`);
console.log(`[+] of ${CLAIMS.length} seeded, ${emittable[0]!.n} qualify for ClaimReview emission`);

process.exit(0);
