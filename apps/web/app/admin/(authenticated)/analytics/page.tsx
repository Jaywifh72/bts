import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Analytics',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/**
 * Real-user analytics surface.
 *
 * Vercel Analytics + Speed Insights are wired in app/layout.tsx — once the
 * site receives traffic, dashboards are visible in the Vercel project console
 * at vercel.com/jeanjacquesboileau-2392s-projects/cinecanon/analytics.
 *
 * Vercel doesn't expose Analytics data via API on the free tier, so this
 * page is a launchpad with deep links + a quick "why each metric matters"
 * crib sheet, rather than an in-app dashboard. If you upgrade to Pro and want
 * the data surfaced here, wire the Vercel Web Analytics API and call it
 * from here.
 */
export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-serif text-3xl text-zinc-50">Analytics</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Real-user metrics. Vercel Web Analytics and Speed Insights are loaded in the root layout,
          so every page view is captured. The full dashboard lives in the Vercel console.
        </p>
      </header>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Where to look</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <LaunchCard
            title="Vercel Web Analytics"
            href="https://vercel.com/jeanjacquesboileau-2392s-projects/cinecanon/analytics"
            tag="Vercel"
            blurb="Page views, top pages, top referrers, country breakdown, devices. Privacy-first (no cookies, no PII)."
          />
          <LaunchCard
            title="Vercel Speed Insights"
            href="https://vercel.com/jeanjacquesboileau-2392s-projects/cinecanon/speed-insights"
            tag="Vercel"
            blurb="Real user Core Web Vitals: LCP, INP, CLS. The exact metrics Google uses for ranking signals."
          />
          <LaunchCard
            title="Google Search Console"
            href="https://search.google.com/search-console"
            tag="Google"
            blurb="Organic search performance. Mirrored in-app at /admin/seo (when GSC service-account creds are configured)."
          />
          <LaunchCard
            title="PageSpeed Insights"
            href="https://pagespeed.web.dev/analysis?url=https%3A%2F%2Fwww.cinecanon.com%2F"
            tag="Google"
            blurb="Lab + field Core Web Vitals for any URL. Run after major shipping changes."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">
          What each metric tells you about performance
        </h2>
        <ul className="space-y-3 text-sm">
          <Crib
            metric="Page views / week"
            from="Vercel Analytics"
            meaning="Pure demand signal. If this is flat or declining, no amount of AEO work matters yet."
          />
          <Crib
            metric="Top pages"
            from="Vercel Analytics"
            meaning="Which dossiers are working. Compare with /admin/aeo/precision leaderboard to see if engines + humans agree on what's good."
          />
          <Crib
            metric="Top referrers"
            from="Vercel Analytics"
            meaning="Where the traffic is coming from. If &apos;chatgpt.com&apos; or &apos;perplexity.ai&apos; appears here, AEO is starting to pay off."
          />
          <Crib
            metric="LCP / INP / CLS"
            from="Speed Insights"
            meaning="Core Web Vitals. Bad CWV directly demotes you in Google rankings. Aim: LCP < 2.5s, INP < 200ms, CLS < 0.1."
          />
          <Crib
            metric="Clicks + impressions"
            from="GSC (/admin/seo)"
            meaning="Organic Google traffic. The single biggest signal for SEO health."
          />
          <Crib
            metric="Average position"
            from="GSC (/admin/seo)"
            meaning="Your typical ranking in Google. Lower is better. A position improvement of 1 from #6→#5 roughly doubles clicks."
          />
          <Crib
            metric="CineCanon citations / 7d"
            from="/admin/aeo"
            meaning="The AEO hero metric. When this climbs from 0, the observatory is paying for itself."
          />
        </ul>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs text-zinc-400 italic">
        <p>
          Vercel Analytics + Speed Insights are running on every page load now that the {' '}
          <code className="not-italic text-zinc-300">&lt;Analytics /&gt;</code> and {' '}
          <code className="not-italic text-zinc-300">&lt;SpeedInsights /&gt;</code> components ship in the root layout.
          Data starts accumulating from the moment this commit is deployed. Give it ~24h before the panels in the Vercel console show meaningful counts.
        </p>
      </section>
    </div>
  );
}

function LaunchCard({ title, href, tag, blurb }: { title: string; href: string; tag: string; blurb: string }) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded border border-zinc-800 bg-zinc-900/40 p-4 hover:border-amber-700/60 transition-colors"
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-serif text-lg text-zinc-100">{title}</h3>
        <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-zinc-400">{tag}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">{blurb}</p>
      <p className="mt-2 text-[11px] text-amber-400">Open dashboard →</p>
    </Link>
  );
}

function Crib({ metric, from, meaning }: { metric: string; from: string; meaning: string }) {
  return (
    <li className="grid gap-1 rounded border border-zinc-800 bg-zinc-900/30 p-3 sm:grid-cols-[12rem_1fr] sm:gap-3">
      <div>
        <p className="font-serif text-base text-zinc-100">{metric}</p>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500">from {from}</p>
      </div>
      <p className="text-xs leading-relaxed text-zinc-400 italic">{meaning}</p>
    </li>
  );
}
