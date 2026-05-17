import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions, listScoringStages } from '@bts/db';
import { RolePage, ToolTile, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Composers',
  description:
    'Reference for film composers, orchestrators, and music editors — credited filmographies, scoring-stage catalog (Abbey Road / AIR / Newman / Eastwood), and the cited recognition record across ASCAP, BMI, SCL, and Ivor Novello.',
  alternates: { canonical: `${siteUrl()}/for-composers` },
};

export const revalidate = 86400;

const COMPOSER_ROLES = ['composer', 'co-composer', 'orchestrator', 'music-editor'];

export default async function ForComposersPage() {
  const [topComposers, curated, stages] = await Promise.all([
    listPeople(db, { roleSlugs: COMPOSER_ROLES, sort: 'credits', withCreditsOnly: true, limit: 12 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
    listScoringStages(db, { withCreditsOnly: true, limit: 12 }),
  ]);

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Composers"
      description="Composers, orchestrators, and music editors. Credited filmographies with citations, the scoring-stage catalog, and the recognition record across SCL, ASCAP, BMI, Ivor Novello, and AMPAS."
      toolBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Working tools</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolTile href="/music/composers" title="Composer index" desc="Every composer in the archive, ranked by curated-film credit count." />
            <ToolTile href="/music/scoring-stages" title="Scoring stages" desc="Newman, Eastwood, Abbey Road, AIR — the rooms where film scores get recorded, with credit counts and capacities." />
            <ToolTile href="/awards/craft/score" title="Score awards" desc="Cross-cut Oscar / BAFTA / Globe / SCL / Ivor Novello — every score recognition, cited." />
            <ToolTile href="/awards/craft/music-editing" title="Music editing awards" desc="MPSE Golden Reel music editing — the cuts that hold a score together." />
            <ToolTile href="/ask" title="Ask anything" desc="Composer questions: 'first-time composers nominated at AMPAS', 'composers regularly at AIR Lyndhurst', 'orchestrator → composer career arcs'." />
          </ul>
        </section>
      }
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/ask?q=composer+regular+collaborator+director" title="Composer × director regulars (Burwell × Coens, Williams × Spielberg)" />
            <CrossCutLink href="/ask?q=first+time+composer+Oscar+nominated" title="First-time feature composers nominated at AMPAS" />
            <CrossCutLink href="/ask?q=AIR+Lyndhurst+scoring+credits+2020-2024" title="AIR Lyndhurst scoring credits, 2020–2024" />
            <CrossCutLink href="/ask?q=orchestrator+who+became+composer" title="Orchestrators who became feature composers" />
          </ul>
        </section>
      }
      peopleBlock={
        topComposers.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Most-credited composers</h2>
              <Link href="/music/composers" className="text-xs text-zinc-400 hover:text-amber-400">All composers →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topComposers.map((p) => (
                <li key={p.slug}>
                  <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                    <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                    <p className="mt-1 text-xs text-zinc-400">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Composer'}</p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      }
      dossierBlock={
        stages.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Top scoring stages by credit count</h2>
              <Link href="/music/scoring-stages" className="text-xs text-zinc-400 hover:text-amber-400">All stages →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stages.slice(0, 9).map((s) => (
                <li key={s.slug} className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
                  <p className="font-serif text-base text-zinc-100">{s.name}</p>
                  <p className="mt-1 text-xs text-zinc-400">
                    {s.facility_name ?? '—'} · {[s.city, s.country].filter(Boolean).join(' · ') || '—'}
                  </p>
                  <p className="mt-1 font-mono text-xs text-amber-400">
                    {s.production_count} productions · {s.capacity_orchestra ?? '—'} orch seats
                  </p>
                </li>
              ))}
            </ul>
          </section>
        ) : null
      }
    />
  );
}
