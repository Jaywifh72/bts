'use server';

import { revalidatePath } from 'next/cache';
import { db, updateEvidenceReviewStatus, type EvidenceReviewStatus } from '@bts/db';

export async function setEvidenceReviewStatusAction(
  id: number,
  status: EvidenceReviewStatus,
  productionSlug?: string | null,
) {
  await updateEvidenceReviewStatus(db, id, status);
  revalidatePath('/admin/evidence');
  if (productionSlug) revalidatePath(`/films/${productionSlug}`);
}
