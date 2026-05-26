import type { Metadata } from 'next';
import Link from 'next/link';
import { buildDigest } from '@/lib/seo-digest';
import { renderDigestMarkdown } from '@/lib/seo-digest-markdown';

export const metadata: Metadata = {
  title: 'SEO — Weekly digest',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default async function SeoDigestPage() {
  const digest = await buildDigest();
  const markdown = renderDigestMarkdown(digest);

  return (
    <div className="space-y-6">
      <header className="flex items-baseline justify-between gap-4">
        <div>
          <h1 className="font-serif text-3xl text-zinc-50">SEO / AEO weekly digest</h1>
          <p className="mt-1 text-sm text-zinc-400">
            What gets emailed every Monday at 14:00 UTC (via GitHub issue notifications).
            Refresh this page to regenerate from live data.
          </p>
        </div>
        <Link href="/admin/seo" className="text-sm text-zinc-400 hover:text-amber-400">← SEO home</Link>
      </header>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-300">
        <p>
          <strong className="text-amber-400">How it gets to you:</strong>{' '}
          A weekly GitHub Actions workflow ({' '}
          <code className="text-amber-300">.github/workflows/seo-digest.yml</code>
          {' '}) calls a bearer-authenticated endpoint on this site every Monday,
          gets the markdown below, and opens a new GitHub issue with it as the body.
          GitHub sends you the issue body as an email notification automatically
          (no SMTP / Resend / SendGrid needed; your existing GitHub email subscription
          carries it). The issues are labeled <code className="text-amber-300">seo-digest</code> and
          stay as a searchable archive.
        </p>
        <p className="mt-2 text-zinc-400 italic">
          For real-email delivery instead, wire <code>RESEND_API_KEY</code> in Vercel
          and uncomment the Resend block in the workflow.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Preview · live data, generated now</h2>
        <pre className="overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-4 text-[12px] leading-relaxed text-zinc-200 whitespace-pre-wrap break-words">{markdown}</pre>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400">
        <p>
          The bearer token for the cron-to-prod authentication lives in env var{' '}
          <code className="text-amber-300">DIGEST_AUTH_TOKEN</code>. Generate one (any
          long random string), add it to both Vercel and as a GH secret named the
          same, then the weekly cron will start firing.
        </p>
      </section>
    </div>
  );
}
