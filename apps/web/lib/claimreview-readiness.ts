// ClaimReview-readiness diagnostic.
//
// Surfaces: how many claims are currently emittable as Schema.org ClaimReview,
// and how many are one step away (status='candidate' or 'needs_source' but
// confidence is primary-like and a citation already exists in claim_sources).
//
// The on-page rule (see lib/jsonLd.tsx → gradeFor) is:
//   verified  + (primary | secondary | manufacturer | rental_house | bts_visual) → emit
//   reviewed  + (primary | secondary | manufacturer | rental_house | bts_visual) → emit
//   sourced   + (primary | secondary | manufacturer | rental_house) → emit
// Anything else stays as an on-page badge but is NOT exposed to AI engines.

import { db, sql } from '@bts/db';

const PRIMARY_LIKE = ['primary', 'secondary', 'manufacturer', 'rental_house'];
const PRIMARY_LIKE_PLUS_BTS = [...PRIMARY_LIKE, 'bts_visual'];

export type ClaimReviewReadiness = {
  emittableTotal: number;
  byStatus: { status: string; count: number }[];
  /** Candidates: have a citation + primary-like confidence but status='candidate' or 'needs_source'.
   *  Promoting them to 'sourced' makes them emittable. */
  oneStepAway: number;
  topProductionsAwaitingPromotion: Array<{
    slug: string;
    title: string;
    awaiting: number;
  }>;
};

export async function getClaimReviewReadiness(): Promise<ClaimReviewReadiness> {
  // Emittable today: verified/reviewed + primary-like-or-bts, OR sourced + primary-like
  const emittable = await db.execute<{ status: string; count: number }>(sql`
    SELECT status, COUNT(*)::int AS count
    FROM claims
    WHERE (status = 'verified' AND confidence = ANY(${PRIMARY_LIKE_PLUS_BTS}))
       OR (status = 'reviewed' AND confidence = ANY(${PRIMARY_LIKE_PLUS_BTS}))
       OR (status = 'sourced'  AND confidence = ANY(${PRIMARY_LIKE}))
    GROUP BY status
  `);
  const emittableTotal = emittable.reduce((s, r) => s + r.count, 0);

  const oneStepRows = await db.execute<{ n: number }>(sql`
    SELECT COUNT(*)::int AS n
    FROM claims c
    WHERE c.status IN ('candidate', 'needs_source')
      AND c.confidence = ANY(${PRIMARY_LIKE})
      AND EXISTS (SELECT 1 FROM claim_sources WHERE claim_id = c.id)
  `);
  const oneStepAway = oneStepRows[0]?.n ?? 0;

  const topRows = await db.execute<{ slug: string; title: string; awaiting: number }>(sql`
    SELECT p.slug, p.title, COUNT(*)::int AS awaiting
    FROM claims c
    JOIN productions p ON p.id = c.production_id
    WHERE c.status IN ('candidate', 'needs_source')
      AND c.confidence = ANY(${PRIMARY_LIKE})
      AND EXISTS (SELECT 1 FROM claim_sources WHERE claim_id = c.id)
    GROUP BY p.slug, p.title
    ORDER BY awaiting DESC
    LIMIT 12
  `);

  return {
    emittableTotal,
    byStatus: emittable,
    oneStepAway,
    topProductionsAwaitingPromotion: topRows,
  };
}
