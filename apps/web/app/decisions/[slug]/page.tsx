import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  db,
  getDecisionTreeBySlug,
  getClaimsBundleForDecisionTree,
} from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import {
  JsonLd,
  buildClaimReviewJsonLd,
  shouldEmitClaimReview,
} from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  let t: Awaited<ReturnType<typeof getDecisionTreeBySlug>> = null;
  try { t = await getDecisionTreeBySlug(db, slug); } catch { /* missing */ }
  if (!t) return { title: 'Decision' };
  return {
    title: `${t.title} — ${t.question}`,
    description: t.summary?.slice(0, 160) ?? t.question,
    alternates: { canonical: `${siteUrl()}/decisions/${slug}` },
  };
}

export default async function DecisionDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  let t: Awaited<ReturnType<typeof getDecisionTreeBySlug>> = null;
  try {
    t = await getDecisionTreeBySlug(db, slug);
  } catch (err) {
    console.warn('[decisions] detail query failed', err);
  }
  if (!t) notFound();

  // Phase 2 follow-up — ClaimReview emission keyed on the decision_tree
  // entity (migration 0093). Reuses the same status/confidence rubric.
  const { claims, sourcesByClaimId } = await getClaimsBundleForDecisionTree(db, t.id, t.slug);
  const claimReviewJsonLds = claims
    .slice(0, 12)
    .filter((c) => shouldEmitClaimReview(c.status, c.confidence))
    .map((c) => {
      const firstSource = sourcesByClaimId[c.id]?.[0];
      return buildClaimReviewJsonLd({
        claimId: String(c.id),
        pageUrl: `/decisions/${slug}`,
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
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'TechArticle', '@id': absoluteUrl(`/decisions/${slug}`), headline: t.title }} />
      {claimReviewJsonLds.map((cr, i) => (
        <JsonLd key={`claim-review-${i}`} data={cr} />
      ))}

      <PageHero
        eyebrow={t.craft}
        title={t.title}
        accent="amber"
        description={t.question}
      />

      <nav aria-label="Decisions nav" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/decisions" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          All decisions →
        </Link>
      </nav>

      {t.summary && (
        <section className="mb-10">
          <h2 className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">The frame</h2>
          <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-300">
            {t.summary.split(/\n\n+/).map((para, i) => (<p key={i}>{para}</p>))}
          </div>
        </section>
      )}

      {t.decision_factors.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Decision factors</h2>
          <ul className="flex flex-wrap gap-2 text-xs">
            {t.decision_factors.map((f) => (
              <li key={f} className="rounded border border-zinc-700 bg-zinc-900/40 px-2 py-1 text-zinc-300">{f}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-12">
        <h2 className="mb-3 font-serif text-xl text-zinc-100">Options</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {t.options.map((o) => (
            <div key={o.slug} className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
              <div className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="font-serif text-lg text-amber-400">{o.label}</h3>
                <div className="flex gap-1 text-[10px] uppercase tracking-widest">
                  {o.cost_band && <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-400">Cost: {o.cost_band}</span>}
                  {o.complexity_band && <span className="rounded border border-zinc-700 px-1.5 py-0.5 text-zinc-400">Cx: {o.complexity_band}</span>}
                </div>
              </div>
              {o.summary && <p className="mb-3 text-sm leading-relaxed text-zinc-300">{o.summary}</p>}
              {o.when_to_choose.length > 0 && (
                <div className="mb-3">
                  <h4 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Choose when</h4>
                  <ul className="ml-4 list-disc space-y-0.5 text-xs text-zinc-300">
                    {o.when_to_choose.map((w, i) => (<li key={i}>{w}</li>))}
                  </ul>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                {o.pros.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-[10px] uppercase tracking-widest text-emerald-500">Pros</h4>
                    <ul className="space-y-0.5 text-xs text-zinc-300">
                      {o.pros.map((p, i) => (<li key={i}>+ {p}</li>))}
                    </ul>
                  </div>
                )}
                {o.cons.length > 0 && (
                  <div>
                    <h4 className="mb-1 text-[10px] uppercase tracking-widest text-red-500">Cons</h4>
                    <ul className="space-y-0.5 text-xs text-zinc-300">
                      {o.cons.map((c, i) => (<li key={i}>− {c}</li>))}
                    </ul>
                  </div>
                )}
              </div>
              {o.example_films.length > 0 && (
                <div className="mt-3 border-t border-zinc-800 pt-2">
                  <h4 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Example films</h4>
                  <div className="flex flex-wrap gap-1.5 text-xs">
                    {o.example_films.map((f) => (
                      <Link key={f} href={`/films/${f}`} className="text-zinc-300 hover:text-amber-400">{f}</Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {t.references.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">References</h2>
          <ul className="space-y-1.5 text-sm">
            {t.references.map((r, i) => (
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
