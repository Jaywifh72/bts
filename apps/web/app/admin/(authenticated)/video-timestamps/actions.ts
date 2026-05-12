'use server';

import { revalidatePath } from 'next/cache';
import {
  db,
  updateVideoTimestampAnnotationReviewStatus,
  type VideoAnnotationReviewStatus,
} from '@bts/db';

export async function setVideoTimestampAnnotationStatusAction(
  id: number,
  status: VideoAnnotationReviewStatus,
) {
  const slugs = await updateVideoTimestampAnnotationReviewStatus(db, id, status);
  revalidatePath('/admin/video-timestamps');
  for (const slug of slugs) revalidatePath(`/films/${slug}`);
}
