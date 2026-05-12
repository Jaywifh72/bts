'use server';

import { revalidatePath } from 'next/cache';
import { db, updateCorrectionStatus, type CorrectionStatus } from '@bts/db';

export async function setCorrectionStatusAction(
  id: number,
  status: CorrectionStatus,
  triageNotes?: string,
) {
  await updateCorrectionStatus(db, id, status, triageNotes ?? null);
  revalidatePath('/admin/corrections');
}
