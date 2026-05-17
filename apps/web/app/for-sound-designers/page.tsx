import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions, listPostHouses } from '@bts/db';
import { RolePage, ToolTile, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Sound Designers',
  description:
    'Reference for sound designers, supervising sound editors, SFX editors, and foley artists — credit-graded filmographies, the sound-design house catalog, and award lineage across MPSE Golden Reel.',
  alternates: { canonical: `${siteUrl()}/for-sound-designers` },
};

export const revalidate = 86400;

const DESIGNER_ROLES = ['sound-designer', 'supervising-sound-editor', 'foley-artist'];

export default async function ForSoundDesignersPage() {
  const [topDesigners, curated, designHouses] = await Promise.all([
    listPeople(db, { roleSlugs: DESIGNER_ROLES, sort: 'credits', withCreditsOnly: true, limit: 12 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
    listPostHouses(db, { kinds: ['sound_design'], withCreditsOnly: true, limit: 12 }),
  ]);

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Sound Designers"
      description="Sound designers, supervising sound editors, SFX editors, and foley artists — credited filmographies and the design-house catalog. The cited reference shelf for the post-sound craft."
      toolBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Working tools</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolTile href="/sound/houses" title="Sound houses" desc="Sound design + mix facilities ranked by credit count. The Skywalker / Formosa / E²Sound roster, with every credit cited." />
            <ToolTile href="/awards/craft/sound-design" title="Sound design awards" desc="MPSE Golden Reel, HPA — cross-cut every cited sound design and SFX editing recognition." />
            <ToolTile href="/ask" title="Ask anything" desc="Designer-flavored questions: 'creature design credits by film', 'foley artists on prestige horror', 'silence-to-score crossfades'." />
          </ul>
        </section>
      }
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/ask?q=supervising+sound+editor+horror+2020-2024" title="Supervising sound editors on horror, 2020–2024" />
            <CrossCutLink href="/ask?q=Ren+Klyce+sound+design+credits" title="Ren Klyce sound design filmography" />
            <CrossCutLink href="/ask?q=foley+artist+Oscar+nominated+features" title="Foley artists with Oscar-nominated sound credits" />
            <CrossCutLink href="/ask?q=Skywalker+Sound+vs+Formosa+credits" title="Skywalker Sound vs Formosa — credit comparison" />
          </ul>
        </section>
      }
      peopleBlock={
        topDesigners.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Most-credited sound designers</h2>
              <Link href="/crew?category=sound" className="text-xs text-zinc-400 hover:text-amber-400">All sound crew →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topDesigners.map((p) => (
                <li key={p.slug}>
                  <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                    <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                    <p className="mt-1 text-xs text-zinc-400">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Sound'}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      }
      dossierBlock={
        designHouses.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Top sound design houses</h2>
              <Link href="/sound/houses" className="text-xs text-zinc-400 hover:text-amber-400">All sound houses →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {designHouses.slice(0, 9).map((h) => (
                <li key={h.slug} className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="font-serif text-base text-zinc-100">{h.name}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {h.kind.replace('_', ' ')} · {[h.city, h.country].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <p className="mt-1 font-mono text-xs text-amber-400">{h.production_count} productions</p>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      }
    />
  );
}
