import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPartnerships } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Long-term creative partnerships',
  description:
    'The recurring director × DP / editor / composer / production designer / costume designer pairs that define entire careers. Scorsese × Schoonmaker, Spielberg × Williams, Coens × Burwell, Anderson × Yeoman, Fincher × Klyce, Nolan × van Hoytema.',
  alternates: { canonical: `${siteUrl()}/partnerships` },
};

export const dynamic = 'force-dynamic';

export default async function PartnershipsPage() {
  type Row = Awaited<ReturnType<typeof listPartnerships>>[number];
  let partnerships: Row[] = [];
  try {
    const rows = await listPartnerships(db, { limit: 300 });
    partnerships = [...rows];
  } catch (err) {
    console.warn('[partnerships] table missing or query failed', err);
  }

  // Group by partner_role for readable scanning.
  const byRole = new Map<string, Row[]>();
  for (const p of partnerships) {
    const list = byRole.get(p.partner_role) ?? [];
    list.push(p);
    byRole.set(p.partner_role, list);
  }
  const roles = Array.from(byRole.keys()).sort();

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/partnerships'), name: 'Creative partnerships — CineCanon' }} />
      <PageHero
        eyebrow="Cross-cut · partnerships"
        title="Long-term creative partnerships"
        accent="amber"
        description="The recurring director × craftsperson pairs that define entire careers. A composer who scores 30 films for one director; an editor who cuts 27. The collaborations that working pros study to understand how the great teams actually work."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Partnerships" value={partnerships.length} />
            <PageHeroStat label="Roles indexed" value={roles.length} />
            <PageHeroStat label="Films together (max)" value={partnerships[0]?.film_count ?? 0} />
          </div>
        }
      />

      {partnerships.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          Catalog seeds with migration 0086 + dispatch.
        </div>
      ) : (
        roles.map((role) => {
          const list = byRole.get(role) ?? [];
          return (
            <section key={role} className="mb-12">
              <div className="mb-3 flex items-baseline justify-between">
                <h2 className="font-serif text-xl text-zinc-100">
                  Director × {role}
                  <span className="ml-2 font-sans text-xs font-normal text-zinc-500">
                    ({list.length})
                  </span>
                </h2>
              </div>
              <ul className="space-y-2 text-sm">
                {list.map((p) => {
                  const yearRange = p.year_first && p.year_last
                    ? (p.year_first === p.year_last ? `${p.year_first}` : `${p.year_first}–${p.year_last}`)
                    : null;
                  return (
                    <li key={p.slug} className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                      <div className="flex flex-wrap items-baseline gap-x-3">
                        <Link href={`/partnerships/${p.slug}`} className="font-medium text-zinc-100 hover:text-amber-400">
                          <Link href={`/crew/${p.primary_slug}`} className="text-amber-400 hover:text-amber-300">{p.primary_name}</Link>
                          <span className="mx-1.5 text-zinc-500">×</span>
                          <Link href={`/crew/${p.partner_slug}`} className="text-amber-400 hover:text-amber-300">{p.partner_name}</Link>
                        </Link>
                        <span className="ml-auto flex items-baseline gap-3 font-mono text-xs">
                          <span className="text-amber-400">{p.film_count}</span>
                          <span className="text-zinc-500">{p.film_count === 1 ? 'film' : 'films'}</span>
                          {yearRange && <span className="text-zinc-500">· {yearRange}</span>}
                        </span>
                      </div>
                      {p.arc_summary && (
                        <p className="mt-1 text-xs leading-relaxed text-zinc-400 line-clamp-3">
                          {p.arc_summary}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}
