'use server';

import { revalidatePath } from 'next/cache';
import {
  db,
  rejectVideo as rejectVideoQuery,
  updateVideoStatus,
  updateVideoCategory,
  bulkUpdateVideoStatus,
  bulkRejectVideos,
  type VideoCategory,
  type VideoStatus,
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

function revalidateForSlugs(slugs: string[]) {
  revalidatePath('/admin/videos');
  for (const slug of slugs) revalidatePath(`/films/${slug}`);
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

export async function bulkApproveAction(ids: number[]) {
  const slugs = await bulkUpdateVideoStatus(db, ids, 'published');
  revalidateForSlugs(slugs);
}

export async function bulkRejectAction(ids: number[]) {
  const slugs = await bulkRejectVideos(db, ids);
  revalidateForSlugs(slugs);
}

export async function bulkResetAction(ids: number[]) {
  const slugs = await bulkUpdateVideoStatus(db, ids, 'pending' satisfies VideoStatus);
  revalidateForSlugs(slugs);
}
