'use server';

import { revalidatePath } from 'next/cache';
import { db, insertKeyFrame, deleteKeyFrame } from '@bts/db';

export async function addKeyFrameAction(formData: FormData) {
  const productionSlug = String(formData.get('productionSlug') ?? '').trim();
  const imageUrl = String(formData.get('imageUrl') ?? '').trim();
  const captionRaw = String(formData.get('caption') ?? '').trim();
  const sortOrderRaw = String(formData.get('sortOrder') ?? '').trim();

  if (!productionSlug || !imageUrl) return;
  // Reject obviously non-URL inputs to keep the column clean.
  if (!/^https?:\/\//.test(imageUrl)) return;

  await insertKeyFrame(db, {
    productionSlug,
    imageUrl,
    caption: captionRaw || null,
    sortOrder: sortOrderRaw ? Number(sortOrderRaw) : 0,
  });

  revalidatePath('/admin/keyframes');
  revalidatePath(`/films/${productionSlug}`);
}

export async function deleteKeyFrameAction(id: number, productionSlug: string) {
  await deleteKeyFrame(db, id);
  revalidatePath('/admin/keyframes');
  revalidatePath(`/films/${productionSlug}`);
}
