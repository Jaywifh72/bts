import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getRentalHouseBySlug, listProductionsForRentalHouse } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { FacilityProfile } from '@/components/facility/FacilityProfile';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  let r: Awaited<ReturnType<typeof getRentalHouseBySlug>> = null;
  try { r = await getRentalHouseBySlug(db, slug); } catch { /* table missing */ }
  if (!r) return { title: 'Rental house' };
  return {
    title: `${r.name} — rental house`,
    description: r.summary ?? r.tagline ?? `${r.name} — camera rental house in ${[r.city, r.country].filter(Boolean).join(', ') || 'multiple locations'}.`,
    alternates: { canonical: `${siteUrl()}/gear/rentals/${r.slug}` },
  };
}

export default async function RentalHouseDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  let r: Awaited<ReturnType<typeof getRentalHouseBySlug>> = null;
  type ProductionRow = Awaited<ReturnType<typeof listProductionsForRentalHouse>>[number];
  let productions: ProductionRow[] = [];
  try {
    r = await getRentalHouseBySlug(db, slug);
    if (r) {
      const rows = await listProductionsForRentalHouse(db, r.id, 200);
      productions = [...rows];
    }
  } catch (err) {
    console.warn('[rental_houses] detail query failed', err);
  }
  if (!r) notFound();

  return (
    <>
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'Organization',
        '@id': absoluteUrl(`/gear/rentals/${r.slug}`),
        name: r.name, url: r.website ?? undefined,
        foundingDate: r.founded_year?.toString(),
        address: r.city || r.country ? {
          '@type': 'PostalAddress',
          addressLocality: r.city ?? undefined,
          addressCountry: r.country ?? undefined,
        } : undefined,
      }} />

      <PageHero
        eyebrow="Gear · rental house"
        title={r.name}
        accent="amber"
        description={r.tagline ?? r.summary?.split('\n')[0] ?? `${r.name} — rental house in ${[r.city, r.country].filter(Boolean).join(', ') || 'multiple locations'}.`}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Production credits" value={r.production_count} />
            <PageHeroStat label="Branches" value={r.branch_count ?? '—'} />
            <PageHeroStat label="Founded" value={r.founded_year ?? '—'} />
            <PageHeroStat label="Location" value={[r.city, r.country].filter(Boolean).join(', ') || '—'} />
          </div>
        }
      />

      {(r.specialties && r.specialties.length > 0) || (r.stocks_brands && r.stocks_brands.length > 0) ? (
        <section className="mb-6">
          {r.specialties && r.specialties.length > 0 && (
            <div className="mb-3">
              <h2 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Specialties</h2>
              <ul className="flex flex-wrap gap-1.5">
                {r.specialties.map((s) => (
                  <li key={s} className="rounded border border-zinc-700 bg-zinc-900/40 px-2 py-0.5 text-xs text-zinc-300">{s}</li>
                ))}
              </ul>
            </div>
          )}
          {r.stocks_brands && r.stocks_brands.length > 0 && (
            <div>
              <h2 className="mb-1 text-[10px] uppercase tracking-widest text-zinc-500">Stocks</h2>
              <ul className="flex flex-wrap gap-1.5">
                {r.stocks_brands.map((b) => (
                  <li key={b} className="rounded border border-amber-700/60 bg-amber-900/20 px-2 py-0.5 text-xs uppercase tracking-wide text-amber-300">{b}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : null}

      <FacilityProfile
        summary={r.summary} tagline={r.tagline}
        headquarters={r.headquarters} parent_company={r.parent_company}
        employee_count={r.employee_count}
        website={r.website} careers_url={r.careers_url} reel_url={r.reel_url}
        wikidata_id={r.wikidata_id}
        references={r.references}
        curated_by={r.curated_by} curated_by_url={r.curated_by_url}
        last_verified_at={r.last_verified_at}
      />

      <section className="mb-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-zinc-100">
            Credited on
            <span className="ml-2 font-sans text-xs font-normal text-zinc-500">
              ({productions.length} production{productions.length === 1 ? '' : 's'})
            </span>
          </h2>
          <Link href="/gear/rentals" className="text-xs text-zinc-400 hover:text-amber-400">All rentals →</Link>
        </div>
        {productions.length === 0 ? (
          <p className="text-sm text-zinc-500">No production credits attached yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {productions.map((p) => (
              <li key={`${p.slug}-${p.kit_type ?? ''}`} className="flex flex-wrap items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <span className="font-mono text-xs text-zinc-500">{p.release_year ?? '—'}</span>
                <Link href={`/films/${p.slug}`} className="text-zinc-200 hover:text-amber-400">{p.title}</Link>
                {p.kit_type && <span className="ml-auto rounded border border-zinc-700 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">{p.kit_type}</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
