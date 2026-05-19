import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  db,
  getCraftDossierBySlug,
  getClaimsForProduction,
  getSourcesForClaims,
} from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import {
  JsonLd,
  buildClaimReviewJsonLd,
  shouldEmitClaimReview,
} from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

const CRAFT_LABELS: Record<string, string> = {
  'pd': 'Production design',
  'costume': 'Costume',
  'makeup-hair': 'Makeup & hair',
};

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  let d: Awaited<ReturnType<typeof getCraftDossierBySlug>> = null;
  try { d = await getCraftDossierBySlug(db, slug); } catch {}
  if (!d) return { title: 'Dossier' };
  return {
    title: `${d.headline} — ${d.production_title}`,
    description: d.summary?.split('\n\n')[0]?.slice(0, 160) ?? `${CRAFT_LABELS[d.craft] ?? d.craft} dossier on ${d.production_title}.`,
    alternates: { canonical: `${siteUrl()}/dossiers/${slug}` },
  };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let d: Awaited<ReturnType<typeof getCraftDossierBySlug>> = null;
  try { d = await getCraftDossierBySlug(db, slug); } catch (e) { console.warn(e); }
  if (!d) notFound();

  // Phase 2 ClaimReview emission — same pattern as /films/[slug]. Reuses
  // claims attached to the underlying production. See claimreview.md for
  // the rollout strategy.
  const claims = await getClaimsForProduction(db, d.production_id);
  const visibleClaimIds = claims.slice(0, 12).map((c) => c.id);
  const sourcesByClaimId = visibleClaimIds.length
    ? await getSourcesForClaims(db, visibleClaimIds)
    : {};
  const claimReviewJsonLds = claims
    .slice(0, 12)
    .filter((c) => shouldEmitClaimReview(c.status, c.confidence))
    .map((c) => {
      const firstSource = sourcesByClaimId[c.id]?.[0];
      return buildClaimReviewJsonLd({
        claimId: String(c.id),
        pageUrl: `/dossiers/${slug}`,
        claimReviewed: c.statement,
        status: c.status,
        confidence: c.confidence,
        datePublished: (c.updated_at ?? c.created_at).slice(0, 10),
        firstAppearanceUrl: firstSource?.url ?? null,
        firstAppearanceName: firstSource?.title ?? firstSource?.publication ?? null,
      });
    });

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', '@id': absoluteUrl(`/dossiers/${slug}`), headline: d.headline }} />
      {claimReviewJsonLds.map((cr, i) => (
        <JsonLd key={`claim-review-${i}`} data={cr} />
      ))}

      <PageHero
        eyebrow={`${CRAFT_LABELS[d.craft] ?? d.craft} dossier`}
        title={d.headline}
        accent="amber"
        description={`${d.production_title}${d.release_year ? ` (${d.release_year})` : ''}${d.lead_credit ? ` — ${d.lead_credit}` : ''}`}
      />

      <nav aria-label="Dossier links" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href={`/films/${d.production_slug}`} className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          {d.production_title} →
        </Link>
        {d.lead_slug && (
          <Link href={`/crew/${d.lead_slug}`} className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
            {d.lead_name} →
          </Link>
        )}
      </nav>

      {d.summary && (
        <section className="mb-8 max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-300">
          {d.summary.split(/\n\n+/).map((para, i) => (<p key={i}>{para}</p>))}
        </section>
      )}

      {d.body && (
        <section className="mb-10 max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-300">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Deep dive</h2>
          {d.body.split(/\n\n+/).map((para, i) => (<p key={i}>{para}</p>))}
        </section>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {d.signature_looks.length > 0 && (
          <section>
            <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Signature looks</h2>
            <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-300">
              {d.signature_looks.map((s, i) => (<li key={i}>{s}</li>))}
            </ul>
          </section>
        )}
        {d.techniques.length > 0 && (
          <section>
            <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Techniques</h2>
            <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-300">
              {d.techniques.map((s, i) => (<li key={i}>{s}</li>))}
            </ul>
          </section>
        )}
        {d.references_consulted.length > 0 && (
          <section>
            <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">References the team consulted</h2>
            <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-300">
              {d.references_consulted.map((s, i) => (<li key={i}>{s}</li>))}
            </ul>
          </section>
        )}
        {d.collaborators.length > 0 && (
          <section>
            <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Collaborators</h2>
            <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-300">
              {d.collaborators.map((s, i) => (<li key={i}>{s}</li>))}
            </ul>
          </section>
        )}
      </div>

      {d.references.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">References</h2>
          <ul className="space-y-1.5 text-sm">
            {d.references.map((r, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-amber-400">{r.title}</a>
                {r.publication && <span className="text-xs text-zinc-500">— {r.publication}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
