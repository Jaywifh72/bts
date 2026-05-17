'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { startJobRun, paramsFromForm } from '@/lib/admin/job-runner';
import { getJobById } from '@/lib/admin/job-registry';

/**
 * Run a registered job. Reads the job_id from the form, coerces the
 * remaining fields into the job's typed input schema, kicks off a
 * spawned process, and redirects the operator to the live log viewer.
 */
export async function runJobAction(formData: FormData) {
  const jobId = String(formData.get('job_id') ?? '');
  const job = getJobById(jobId);
  if (!job) {
    redirect('/admin/ingest?error=unknown_job');
  }

  const params = paramsFromForm(job, formData);
  const result = await startJobRun(job.id, params, 'admin');

  if ('error' in result) {
    redirect(`/admin/ingest?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath('/admin/ingest');
  redirect(`/admin/ingest/runs/${result.runId}`);
}

/**
 * Bulk-dispatch every checked job. Each job is queued with empty
 * params (uses script defaults); operators who need custom params
 * should run those jobs individually. Failures on individual jobs
 * are surfaced via the error flash but don't abort the batch.
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
