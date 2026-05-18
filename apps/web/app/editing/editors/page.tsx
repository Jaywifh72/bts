import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Editors',
  description: 'Every credited picture editor + first assistant editor in the archive, ranked by curated-film credit count.',
  alternates: { canonical: `${siteUrl()}/editing/editors` },
};

export const revalidate = 86400;

const ROLES = ['editor', 'first-assistant-editor'];

export default async function EditorsIndexPage() {
  const [editors, total] = await Promise.all([
    listPeople(db, { roleSlugs: ROLES, sort: 'credits', withCreditsOnly: true, limit: 200 }),
    countPeople(db, { roleSlugs: ROLES, withCreditsOnly: true }),
  ]);

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/editing/editors'), name: 'Editors — CineCanon' }} />
      <PageHero
        eyebrow="Editing · people"
        title="Editors"
        accent="purple"
        description="Picture editors and first assistant editors with at least one cited credit. Sound editors live under /sound; music editors under /music."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="In archive" value={total} />
            <PageHeroStat label="Top credit count" value={editors[0]?.credit_count ?? 0} />
            <PageHeroStat label="Award craft" value="editing" />
          </div>
        }
      />

      <nav aria-label="Editing sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/editing" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">← Editing hub</Link>
        <Link href="/editing/editors" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Editors</Link>
        <Link href="/awards/craft/editing" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Editing awards</Link>
        <Link href="/awards/craft/music-editing" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Music-editing awards</Link>
      </nav>

      {editors.length === 0 ? (
        <p className="text-sm text-zinc-500">No editors with cited credits yet.</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {editors.map((p, i) => (
            <li key={p.slug}>
              <Link href={`/crew/${p.slug}`} className="flex items-baseline gap-x-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                <span className="w-6 text-right font-mono text-[10px] text-zinc-500">{i + 1}</span>
                <div className="flex-1">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">{p.primary_role ?? 'Editor'}</p>
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
