'use server';

import { redirect } from 'next/navigation';

/**
 * Trigger the AEO cycle GitHub Actions workflow via workflow_dispatch.
 * Uses the same GITHUB_DISPATCH_TOKEN as the ingest-jobs runner so we
 * don't add a new env var.
 *
 * Returns by redirecting back to /admin/aeo with a status query.
 */
export async function triggerAeoCycle(formData: FormData) {
  const samples = String(formData.get('samples_per_prompt') ?? '2');
  const dryRun = formData.get('dry_run') === 'on';

  const token = process.env.GITHUB_DISPATCH_TOKEN;
  if (!token) {
    redirect('/admin/aeo?cycle=error&reason=GITHUB_DISPATCH_TOKEN+not+set');
  }

  const owner = process.env.GITHUB_REPOSITORY_OWNER ?? 'Jaywifh72';
  const repo = process.env.GITHUB_REPOSITORY_NAME ?? 'bts';
  const ref = process.env.GITHUB_DISPATCH_REF ?? 'master';

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/aeo-cycle.yml/dispatches`,
    {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ref,
        inputs: {
          samples_per_prompt: samples,
          dry_run: dryRun,
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    redirect(
      `/admin/aeo?cycle=error&reason=${encodeURIComponent(
        `GitHub dispatch ${res.status}: ${text.slice(0, 120)}`,
      )}`,
    );
  }
  redirect(`/admin/aeo?cycle=dispatched&samples=${samples}${dryRun ? '&dry=1' : ''}`);
}
