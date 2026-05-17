'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { startJobRun } from '@/lib/admin/job-runner';
import { getJobById } from '@/lib/admin/job-registry';

/**
 * Bulk-dispatch every checked job. Lives outside the (authenticated)
 * route group so client components can import it without Next 16/
 * Turbopack tripping on parens in the path.
 */
export async function runMultipleJobsAction(formData: FormData) {
  const ids = formData.getAll('selected').map(String).filter(Boolean);
  if (ids.length === 0) {
    redirect('/admin/ingest?error=no_jobs_selected');
  }

  let dispatched = 0;
  const errors: string[] = [];
  for (const id of ids) {
    const job = getJobById(id);
    if (!job) {
      errors.push(`${id}: unknown job`);
      continue;
    }
    const result = await startJobRun(job.id, {}, 'admin');
    if ('error' in result) {
      errors.push(`${id}: ${result.error}`);
    } else {
      dispatched++;
    }
  }

  revalidatePath('/admin/ingest');
  if (errors.length > 0) {
    redirect(
      `/admin/ingest?error=${encodeURIComponent(
        `Dispatched ${dispatched}/${ids.length}. Errors: ${errors.join('; ')}`,
      )}`,
    );
  }
  redirect(`/admin/ingest?dispatched=${dispatched}`);
}
