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
