import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions } from '@bts/db';
import { RolePage, ToolTile, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Editors',
  description:
    'Reference for picture editors and their assistants — credited filmographies, ACE Eddie recognition, recurring director × editor pairings.',
  alternates: { canonical: `${siteUrl()}/for-editors` },
};

export const revalidate = 86400;

const EDITOR_ROLES = ['editor', 'first-assistant-editor'];

export default async function ForEditorsPage() {
  const [topEditors, curated] = await Promise.all([
    listPeople(db, { roleSlugs: EDITOR_ROLES, sort: 'credits', withCreditsOnly: true, limit: 12 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Editors"
      description="Picture editors and their assistants. Credited filmographies, ACE Eddie recognition, the long-form director × editor partnerships that define a body of work."
      toolBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Working tools</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolTile href="/editing/editors" title="Editor index" desc="Every credited editor in the archive, ranked by curated-film credit count." />
            <ToolTile href="/awards/craft/editing" title="Editing awards" desc="ACE Eddie + AMPAS + BAFTA — cross-cut every cited editing recognition." />
            <ToolTile href="/awards/craft/music-editing" title="Music editing awards" desc="MPSE Golden Reel music editing — the cuts that hold a score together." />
            <ToolTile href="/ask" title="Ask anything" desc="Editor questions: 'Thelma Schoonmaker filmography', 'Coen × Roderick Jaynes credits', 'first-time editors at AMPAS'." />
          </ul>
        </section>
      }
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/ask?q=Thelma+Schoonmaker+Scorsese" title="Thelma Schoonmaker × Scorsese filmography" />
            <CrossCutLink href="/ask?q=editor+director+long+term+collaborator" title="Editor × director long-term partnerships" />
            <CrossCutLink href="/ask?q=first+time+editor+Oscar+nominated" title="First-time editors nominated at AMPAS" />
            <CrossCutLink href="/ask?q=ACE+Eddie+winner+Oscar+too" title="ACE Eddie + AMPAS double winners" />
          </ul>
        </section>
      }
      peopleBlock={
        topEditors.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Most-credited editors</h2>
              <Link href="/editing/editors" className="text-xs text-zinc-400 hover:text-amber-400">All editors →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topEditors.map((p) => (
                <li key={p.slug}>
                  <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                    <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                    <p className="mt-1 text-xs text-zinc-400">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Editor'}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      }
      dossierBlock={
        curated.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Recently curated dossiers</h2>
              <Link href="/films?tier=curated" className="text-xs text-zinc-400 hover:text-amber-400">All curated →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {curated.map((f) => (
                <li key={f.slug}>
                  <Link href={`/films/${f.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                    <p className="font-serif text-base text-zinc-100">{f.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">{f.release_year}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      }
    />
  );
}
