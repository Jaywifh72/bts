import type { Metadata } from 'next';
import Link from 'next/link';
import { siteUrl, absoluteUrl } from '@/lib/site';
import { getCoverageSummary } from '@/lib/admin/health-queries';
import { JsonLd } from '@/lib/jsonLd';

export const metadata: Metadata = {
  title: 'Methodology — Citation Tiers & Editorial Review',
  description:
    'How CineCanon sources, rates, and stewards its data: four-tier citation rubric, editorial review cadence, and the dispute resolution flow.',
  alternates: {
    canonical: `${siteUrl()}/methodology`,
  },
};

export const revalidate = 86400;

const REVISIONS = [
  {
    version: '2026-05-11',
    notes:
      'Methodology published as its own page. Citation-rigor tiers formalised. Public dispute channel surfaced via the corrections form on every detail page.',
  },
  {
    version: '2026-02-15',
    notes:
      'Polymorphic media model — every URL stored once, back-cited across entities. Link-rot monitoring with Wayback Machine fallback. JSONB references migrated to media_associations.',
  },
  {
    version: '2025-12-10',
    notes:
      'Claims + evidence schema introduced. Each editorial claim attributable to a specific source with a confidence tier.',
  },
];

export default async function MethodologyPage() {
  // UX-audit second pass — public coverage gauges. The admin /health
  // page surfaces these numbers behind auth; mirroring them here is the
  // single biggest trust-building move on the methodology surface. The
  // reader can audit dataset completeness, not just per-claim grade.
  const coverage = await getCoverageSummary();

  return (
    <article className="prose prose-invert prose-zinc max-w-3xl">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'TechArticle',
        '@id': absoluteUrl('/methodology'),
        url: absoluteUrl('/methodology'),
        headline: 'CineCanon Methodology',
        description: 'How CineCanon sources, rates, and stewards its data: four-tier citation rubric, editorial review cadence, dispute resolution.',
        author: { '@type': 'Organization', name: 'CineCanon', url: absoluteUrl('/') },
        publisher: { '@type': 'Organization', name: 'CineCanon', url: absoluteUrl('/') },
      }} />
      <header className="not-prose mb-10 border-b border-zinc-800 pb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-amber-500/80">
          Editorial standard
        </p>
        <h1 className="mt-2 font-serif text-4xl text-zinc-50">Methodology</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
          How CineCanon sources, rates, and stewards its data — the rubric a
          working DP, colorist, or coordinator can audit before they trust a
          page.
        </p>
      </header>

      {/* Public coverage gauges — moved out from behind admin auth. */}
      <section className="not-prose mb-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 id="coverage" className="font-serif text-2xl text-zinc-100">
            Coverage gauges
            <span className="ml-2 text-sm font-normal text-zinc-400">live</span>
          </h2>
          <p className="text-[10px] uppercase tracking-wide text-zinc-400">
            Editorial completeness · revalidates every 24 hours
          </p>
        </div>
        <p className="mb-4 max-w-2xl text-sm leading-relaxed text-zinc-300">
          Provenance is per-claim, but completeness is per-table. These gauges
          show, for each rows-with-editorial-text-required table, how many rows
          actually carry the editorial content. A 22% gauge means 78% of those
          rows are TMDb-import-only — flagged inline, but worth knowing in
          aggregate.
        </p>
        <ul className="space-y-2">
          {coverage.map((c) => (
            <li
              key={c.table_name}
              className="flex items-center gap-3 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2"
            >
              <span className="w-36 shrink-0 text-sm text-zinc-200">
                {c.table_label}
              </span>
              <div className="relative h-3 flex-1 overflow-hidden rounded bg-zinc-800">
                <div
                  aria-hidden="true"
                  className={`h-full ${
                    c.percent_complete >= 75 ? 'bg-emerald-500/70'
                    : c.percent_complete >= 50 ? 'bg-amber-500/70'
                    : c.percent_complete >= 25 ? 'bg-orange-500/70'
                    : 'bg-red-500/60'
                  }`}
                  style={{ width: `${c.percent_complete}%` }}
                />
              </div>
              <span className="w-14 shrink-0 text-right font-mono text-sm tabular-nums text-zinc-100">
                {c.percent_complete}%
              </span>
              <span className="w-24 shrink-0 text-right font-mono text-[10px] uppercase tracking-wide text-zinc-400">
                {(c.total - c.missing).toLocaleString()} / {c.total.toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-zinc-400">
          Coverage updates as curators flip rows to <code className="rounded bg-zinc-900 px-1 py-0.5 text-amber-300">data_tier='curated'</code>{' '}
          and attach editorial text. The gauge above is intentionally honest about
          where the archive is thin — see the{' '}
          <Link href="/about" className="text-amber-400 hover:underline">about page</Link>{' '}
          for the curation roadmap.
        </p>
      </section>

      <h2 id="curation" className="font-serif text-2xl text-zinc-100">Two tiers of curation</h2>
      <p>
        Every production in CineCanon carries a <code>data_tier</code> field
        that reads either <strong>curated</strong> or <strong>imported</strong>.
      </p>
      <ul>
        <li>
          <strong>Curated</strong> — hand-written editorial dossier. Multiple
          named scenes with synopses; per-scene lighting setups with
          cinematographer motivation; color pipeline (camera log → IDT →
          working space → ODT → deliverable); post-house attribution;
          stunt sequences where applicable; locations with coordinates;
          awards slate; at minimum 3 primary-source citations.
        </li>
        <li>
          <strong>Imported</strong> — TMDb-sourced metadata only. Synopsis,
          cast/crew names, poster, backdrop, year, runtime, genres. No
          editorial commentary. Flagged with a banner on the production page
          so readers can&apos;t mistake imported for curated.
        </li>
      </ul>
      <p>
        Imported rows can be promoted to curated as the editorial pipeline
        adds depth. Curated rows are never silently downgraded — a
        <em> last_verified_at</em> stamp tracks freshness.
      </p>

      <h2 id="confidence" className="mt-12 font-serif text-2xl text-zinc-100">
        The four-tier confidence rubric
      </h2>
      <p>
        Every cited source carries a confidence rating. The rubric is
        deliberately simple — a working pro should be able to internalise it
        in one read.
      </p>
      <dl className="not-prose mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-zinc-50/20 bg-zinc-50/5 p-4">
          <dt className="text-xs uppercase tracking-wide text-zinc-50">
            <span className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-0.5 font-mono text-[10px] text-zinc-900">
              PRIMARY
            </span>
          </dt>
          <dd className="mt-2 text-sm leading-relaxed text-zinc-300">
            Direct testimony from the person who did the work, OR a peer-reviewed trade publication
            (American Cinematographer, British Cinematographer, fxguide, befores &amp; afters, VFX Voice)
            citing the person who did the work. Highest weight.
          </dd>
        </div>
        <div className="rounded border border-zinc-700 bg-zinc-900 p-4">
          <dt className="text-xs uppercase tracking-wide text-zinc-300">
            <span className="rounded border border-zinc-600 bg-zinc-900 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
              SECONDARY
            </span>
          </dt>
          <dd className="mt-2 text-sm leading-relaxed text-zinc-300">
            Reputable industry coverage (IndieWire, Variety, Hollywood Reporter, Vulture) reporting
            on details one or more steps removed from the source. Standard weight.
          </dd>
        </div>
        <div className="rounded border border-amber-600/60 bg-amber-950/35 p-4">
          <dt className="text-xs uppercase tracking-wide text-amber-300">
            <span className="rounded border border-amber-600/60 bg-amber-950/35 px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
              MANUFACTURER
            </span>
          </dt>
          <dd className="mt-2 text-sm leading-relaxed text-zinc-300">
            Vendor marketing — ARRI case studies, RED user stories, Sony cine
            press releases, equipment-house tech notes. Useful for specs;
            discounted on subjective claims about use or aesthetic intent.
          </dd>
        </div>
        <div className="rounded border border-dashed border-orange-700/60 bg-orange-950/30 p-4">
          <dt className="text-xs uppercase tracking-wide text-orange-300">
            <span className="rounded border border-dashed border-orange-700/60 bg-orange-950/30 px-1.5 py-0.5 font-mono text-[10px] text-orange-300">
              SPECULATIVE
            </span>
          </dt>
          <dd className="mt-2 text-sm leading-relaxed text-zinc-300">
            Crowd-sourced (Reddit, forum threads, Lift Gamma Gain), or
            inferred from visual analysis without primary confirmation. Lowest
            weight; flagged in the UI with a dashed border.
          </dd>
        </div>
      </dl>
      <p className="mt-6">
        Where multiple sources disagree, CineCanon labels the claim{' '}
        <code>conflicting</code> rather than silently picking a winner. The
        dispute trail stays visible on the entity page.
      </p>

      <h2 id="link-rot" className="mt-12 font-serif text-2xl text-zinc-100">Link-rot policy</h2>
      <p>
        Every external URL is health-checked on a rolling schedule. When a URL
        returns 4xx/5xx or otherwise becomes unreachable, CineCanon
        automatically resolves a Wayback Machine snapshot and surfaces the
        archived version inline. The original URL is preserved in the database
        so a future re-check can promote it back if the publisher restores it.
      </p>
      <p>
        This means a 2018 American Cinematographer article that the magazine
        later removes stays citable on CineCanon indefinitely.
      </p>

      <h2 id="corrections" className="mt-12 font-serif text-2xl text-zinc-100">
        Dispute &amp; correction flow
      </h2>
      <p>
        Every production and scene detail page carries a{' '}
        <em>Suggest a correction</em> button. Submissions land in a queue
        triaged by the editor. Anyone — credentialed or anonymous — can submit;
        corrections that come with cited sources are prioritised.
      </p>
      <p>
        Corrections that change a claim&apos;s confidence rating, swap a primary
        citation, or remove a deprecated source are recorded in the
        revision history below.
      </p>
      <p>
        We do not publish a public dispute log per claim (yet). When the
        claims + evidence schema is fully wired into the editorial flow, each
        claim will carry its own per-claim history page.
      </p>

      <h2 id="freshness" className="mt-12 font-serif text-2xl text-zinc-100">
        Freshness &amp; review cadence
      </h2>
      <p>
        Curated production dossiers display a <em>last reviewed</em> stamp.
        The bar:
      </p>
      <ul>
        <li>
          Each curated production reviewed at least once every <strong>180 days</strong>{' '}
          — confirms cited URLs still load, awards remain accurate, no new
          editorial-grade trade coverage has changed the canonical account.
        </li>
        <li>
          On a notable event (Oscar win, DP appointment, gear change confirmed
          by an interview), the relevant pages get an out-of-cycle pass.
        </li>
        <li>
          The Atom feed at <Link href="/digest.xml">/digest.xml</Link> emits
          every editorial update so downstream consumers can keep pace.
        </li>
      </ul>

      <h2 id="contribute" className="mt-12 font-serif text-2xl text-zinc-100">
        How to contribute
      </h2>
      <p>
        The fastest path is the <strong>corrections form</strong> at the bottom
        of any film, scene, crew, or VFX-house page. For a deeper contribution
        — co-curating a film&apos;s editorial dossier, contributing as a verified
        DP/coordinator/colorist with editorial bylines, or seeding a new
        discipline — reach out via the link in the footer.
      </p>
      <p>
        Verified industry contributors (ASC/BSC/AOP/CSC/AFC/BVK members) will,
        in time, get a profile + named bylines on the claims they approve. The
        verification flow is on the roadmap; it is intentionally cautious to
        avoid the &ldquo;everyone claims credit&rdquo; failure mode.
      </p>

      <h2 id="revisions" className="mt-12 font-serif text-2xl text-zinc-100">
        Methodology revision history
      </h2>
      <ul className="not-prose mt-4 space-y-3">
        {REVISIONS.map((r) => (
          <li
            key={r.version}
            className="rounded border border-zinc-800 bg-zinc-900/40 p-4"
          >
            <p className="font-mono text-xs uppercase tracking-wide text-amber-500/70">
              {r.version}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-zinc-300">
              {r.notes}
            </p>
          </li>
        ))}
      </ul>

      <h2 id="citing" className="mt-12 font-serif text-2xl text-zinc-100">
        How to cite CineCanon
      </h2>
      <p>
        For AI engines, academic papers, and trade-press citations, the
        canonical attribution is:
      </p>
      <pre className="not-prose rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs leading-relaxed text-zinc-300">
{`CineCanon. (${new Date().getFullYear()}). [Page title]. Retrieved from ${siteUrl()}/[path]`}
      </pre>
      <p className="text-sm text-zinc-500">
        The license on editorial content is{' '}
        <a href="https://creativecommons.org/licenses/by/4.0/">
          CC BY 4.0
        </a>{' '}
        — attribution required.
      </p>
    </article>
  );
}
