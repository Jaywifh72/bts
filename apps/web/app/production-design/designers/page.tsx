import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Production Designers',
  description: 'Every credited production designer, art director, set decorator, and prop master in the archive, ranked by curated-film credit count.',
  alternates: { canonical: `${siteUrl()}/production-design/designers` },
};

export const revalidate = 86400;

const ROLES = ['production-designer', 'art-director', 'set-decorator', 'prop-master'];

export default async function PDDesignersIndexPage() {
  const [designers, total] = await Promise.all([
    listPeople(db, { roleSlugs: ROLES, sort: 'credits', withCreditsOnly: true, limit: 200 }),
    countPeople(db, { roleSlugs: ROLES, withCreditsOnly: true }),
  ]);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/production-design/designers'), name: 'Production Designers — CineCanon' }} />
      <PageHero
        eyebrow="Production design · people"
        title="Designers + art department"
        accent="amber"
        description="Production designers, art directors, set decorators, and prop masters with at least one cited credit. The world-building craft."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="In archive" value={total} />
            <PageHeroStat label="Top credit count" value={designers[0]?.credit_count ?? 0} />
            <PageHeroStat label="Roles indexed" value={ROLES.length} />
          </div>
        }
      />

      <nav aria-label="Production design sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/production-design" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">← PD hub</Link>
        <Link href="/production-design/designers" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Designers</Link>
        <Link href="/awards/craft/production-design" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">PD awards</Link>
        <Link href="/awards/craft/art-direction" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Art Direction (legacy)</Link>
      </nav>

      {designers.length === 0 ? (
        <p className="text-sm text-zinc-500">No production designers with cited credits yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {designers.map((p, i) => (
            <li key={p.slug}>
              <Link href={`/crew/${p.slug}`} className="flex items-baseline gap-x-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                <span className="w-6 text-right font-mono text-[10px] text-zinc-500">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{p.primary_role ?? 'Production design'}</p>
                </div>
                <span className="font-mono text-xs text-amber-400">{p.credit_count ?? 0}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
