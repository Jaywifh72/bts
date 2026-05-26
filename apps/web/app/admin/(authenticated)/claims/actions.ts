'use server';

import { revalidatePath } from 'next/cache';
import { db, sql, updateClaimStatus, type ClaimStatus } from '@bts/db';

export async function setClaimStatusAction(
  id: number,
  status: ClaimStatus,
  productionSlug?: string | null,
) {
  await updateClaimStatus(db, id, status);
  revalidatePath('/admin/claims');
  if (productionSlug) revalidatePath(`/films/${productionSlug}`);
}

/**
 * Bulk-promote eligible claims to `sourced` so they become emittable as
 * Schema.org ClaimReview on their production page.
 *
 * Eligibility (matches lib/claimreview-readiness.ts oneStepAway query):
 *   • status IN ('candidate', 'needs_source')
 *   • confidence IN ('primary', 'secondary', 'manufacturer', 'rental_house')
 *   • a row exists in claim_sources for the claim
 *
 * These are claims an editor has already graded as primary-like AND
 * attached a citation to — the only remaining step is flipping status
 * to 'sourced'. Safe to bulk-promote because the human judgment (set
 * confidence + add citation) already happened.
 */
export async function bulkPromoteEligibleClaimsAction(): Promise<void> {
  const PRIMARY_LIKE = ['primary', 'secondary', 'manufacturer', 'rental_house'];
  const primaryLikeList = sql.join(PRIMARY_LIKE.map((v) => sql`${v}`), sql`, `);
  const rows = await db.execute<{ id: number; production_slug: string | null }>(sql`
    WITH eligible AS (
      SELECT c.id, p.slug AS production_slug
      FROM claims c
      LEFT JOIN productions p ON p.id = c.production_id
      WHERE c.status IN ('candidate', 'needs_source')
        AND c.confidence IN (${primaryLikeList})
        AND EXISTS (SELECT 1 FROM claim_sources WHERE claim_id = c.id)
    )
    UPDATE claims SET status = 'sourced', updated_at = now()
    FROM eligible
    WHERE claims.id = eligible.id
    RETURNING claims.id, eligible.production_slug
  `);
  const slugs = Array.from(new Set(rows.map((r) => r.production_slug).filter(Boolean) as string[]));
  revalidatePath('/admin/claims');
  for (const slug of slugs) revalidatePath(`/films/${slug}`);
}
