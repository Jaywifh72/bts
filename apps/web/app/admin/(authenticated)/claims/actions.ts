'use server';

import { revalidatePath } from 'next/cache';
import { db, updateClaimStatus, type ClaimStatus } from '@bts/db';

export async function setClaimStatusAction(
  id: number,
  status: ClaimStatus,
  productionSlug?: string | null,
) {
  await updateClaimStatus(db, id, status);
  revalidatePath('/admin/claims');
  if (productionSlug) revalidatePath(`/films/${productionSlug}`);
}
