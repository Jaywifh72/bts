import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  db,
  getPartnershipBySlug,
  listJointFilmography,
  getClaimsBundleForPartnership,
} from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
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
  let p: Awaited<ReturnType<typeof getPartnershipBySlug>> = null;
  try { p = await getPartnershipBySlug(db, slug); } catch { /* missing */ }
  if (!p) return { title: 'Partnership' };
  return {
    title: `${p.primary_name} × ${p.partner_name} — ${p.film_count} ${p.film_count === 1 ? 'film' : 'films'}`,
    description: (p.arc_summary?.split('\n')[0] ?? '').slice(0, 160) || `Long-term creative partnership between ${p.primary_name} and ${p.partner_name} (${p.partner_role}).`,
    alternates: { canonical: `${siteUrl()}/partnerships/${slug}` },
  };
}

export default async function PartnershipDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  let p: Awaited<ReturnType<typeof getPartnershipBySlug>> = null;
  type FilmRow = Awaited<ReturnType<typeof listJointFilmography>>[number];
  let films: FilmRow[] = [];
  try {
    p = await getPartnershipBySlug(db, slug);
    if (p) {
      const rows = await listJointFilmography(db, slug);
      films = [...rows];
    }
  } catch (err) {
    console.warn('[partnerships] detail query failed', err);
  }
  if (!p) notFound();

  // Phase 2 follow-up — ClaimReview emission keyed on the partnership
  // entity (migration 0093). Reuses the same status/confidence rubric.
  const { claims, sourcesByClaimId } = await getClaimsBundleForPartnership(db, p.id, p.slug);
  const claimReviewJsonLds = claims
    .slice(0, 12)
    .filter((c) => shouldEmitClaimReview(c.status, c.confidence))
    .map((c) => {
      const firstSource = sourcesByClaimId[c.id]?.[0];
      return buildClaimReviewJsonLd({
        claimId: String(c.id),
        pageUrl: `/partnerships/${slug}`,
        claimReviewed: c.statement,
        status: c.status,
        confidence: c.confidence,
        datePublished: (c.updated_at ?? c.created_at).slice(0, 10),
        firstAppearanceUrl: firstSource?.url ?? null,
        firstAppearanceName: firstSource?.title ?? firstSource?.publication ?? null,
      });
    });

  const yearRange = p.year_first && p.year_last
    ? (p.year_first === p.year_last ? `${p.year_first}` : `${p.year_first}–${p.year_last}`)
    : null;
  const span = p.year_first && p.year_last ? p.year_last - p.year_first + 1 : null;

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        '@id': absoluteUrl(`/partnerships/${slug}`),
        name: `${p.primary_name} × ${p.partner_name} — ${p.film_count} films`,
      }} />
      {claimReviewJsonLds.map((cr, i) => (
        <JsonLd key={`claim-review-${i}`} data={cr} />
      ))}

      <PageHero
        eyebrow="Long-term partnership"
        title={`${p.primary_name} × ${p.partner_name}`}
        accent="amber"
        description={p.arc_summary?.split('\n')[0] ?? `${p.primary_name} (director) and ${p.partner_name} (${p.partner_role}) have collaborated on ${p.film_count} film${p.film_count === 1 ? '' : 's'}.`}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Films together" value={p.film_count} />
            <PageHeroStat label="Role" value={p.partner_role} />
            <PageHeroStat label="Span" value={yearRange ?? '—'} />
            <PageHeroStat label="Years" value={span ?? '—'} />
          </div>
        }
      />

      <nav aria-label="Partnership members" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href={`/crew/${p.primary_slug}`} className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          {p.primary_name} →
        </Link>
        <Link href={`/crew/${p.partner_slug}`} className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          {p.partner_name} →
        </Link>
        <Link href="/partnerships" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">
          All partnerships
        </Link>
      </nav>

      {p.arc_summary && (
        <section className="mb-10">
          <h2 className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">The arc</h2>
          <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-zinc-300">
            {p.arc_summary.split(/\n\n+/).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>
      )}

      <section className="mb-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-zinc-100">
            Joint filmography
            <span className="ml-2 font-sans text-xs font-normal text-zinc-500">
              ({films.length} film{films.length === 1 ? '' : 's'})
            </span>
          </h2>
        </div>
        {films.length === 0 ? (
          <p className="text-sm text-zinc-500">No joint credits found — both members may not yet have their crew assignments synced.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {films.map((f) => (
              <li key={f.slug} className="flex flex-wrap items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <span className="font-mono text-xs text-zinc-500">{f.release_year ?? '—'}</span>
                <Link href={`/films/${f.slug}`} className="text-zinc-200 hover:text-amber-400">{f.title}</Link>
                <span className="ml-auto text-[11px] text-zinc-500">
                  {f.primary_role && <span>{p.primary_name}: <span className="text-zinc-400">{f.primary_role}</span></span>}
                  {f.primary_role && f.partner_role && <span className="mx-2">·</span>}
                  {f.partner_role && <span>{p.partner_name}: <span className="text-zinc-400">{f.partner_role}</span></span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {p.references.length > 0 && (
        <section className="mb-10">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">References</h2>
          <ul className="space-y-1.5 text-sm">
            {p.references.map((r, i) => (
              <li key={i} className="flex flex-wrap items-baseline gap-x-2">
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-zinc-200 hover:text-amber-400">
                  {r.title}
                </a>
                {r.publication && <span className="text-xs text-zinc-500">— {r.publication}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
