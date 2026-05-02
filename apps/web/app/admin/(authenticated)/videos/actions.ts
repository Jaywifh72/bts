'use server';

import { revalidatePath } from 'next/cache';
import {
  db,
  rejectVideo as rejectVideoQuery,
  updateVideoStatus,
  updateVideoCategory,
  type VideoCategory,
} from '@bts/db';

/**
 * All actions revalidate /admin/videos so the table re-renders without the
 * acted-on row. They also nuke the per-production cache so the public film
 * page reflects the new published list immediately.
 */
function revalidateAfterAction(productionSlug?: string) {
  revalidatePath('/admin/videos');
  if (productionSlug) revalidatePath(`/films/${productionSlug}`);
}

export async function approveAction(id: number, productionSlug: string) {
  await updateVideoStatus(db, id, 'published');
  revalidateAfterAction(productionSlug);
}

export async function rejectAction(id: number, productionSlug: string) {
  await rejectVideoQuery(db, id);
  revalidateAfterAction(productionSlug);
}

export async function resetToPendingAction(id: number, productionSlug: string) {
  await updateVideoStatus(db, id, 'pending');
  revalidateAfterAction(productionSlug);
}

export async function recategorizeAction(
  id: number,
  category: VideoCategory,
  productionSlug: string,
) {
  await updateVideoCategory(db, id, category);
  revalidateAfterAction(productionSlug);
}
