import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions, listPostHouses } from '@bts/db';
import { RolePage, ToolTile, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Sound Mixers',
  description:
    'Reference shelf for production sound mixers and re-recording mixers — citation-graded credits, dub-stage catalog (Atmos / Premier / IMAX), and working tools for prep and dub.',
  alternates: { canonical: `${siteUrl()}/for-sound-mixers` },
};

export const revalidate = 86400;

const MIXER_ROLES = ['production-sound-mixer', 're-recording-mixer', 'boom-operator'];

export default async function ForSoundMixersPage() {
  const [topMixers, curated, soundHouses] = await Promise.all([
    listPeople(db, { roleSlugs: MIXER_ROLES, sort: 'credits', withCreditsOnly: true, limit: 12 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
    listPostHouses(db, { kinds: ['sound_mix'], withCreditsOnly: true, limit: 12 }),
  ]);

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Sound Mixers"
      description="Production sound mixers and re-recording mixers — credited filmographies, dub-stage catalog with format certifications (Atmos / Premier / IMAX), and tools for prep day and the dub stage."
      toolBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Working tools</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolTile href="/sound/houses" title="Sound post-houses" desc="Every facility credited on a curated film, ranked by credit count. Filter to mix, design, or both." />
            <ToolTile href="/awards/craft/dialogue-adr" title="Dialogue + ADR awards" desc="CAS, AMPAS Best Sound, MPSE dialogue editing — cross-cut of mixers by recognition." />
            <ToolTile href="/awards/craft/sound-design" title="Sound design awards" desc="MPSE Golden Reel, HPA sound categories. Who got cited for what and where." />
            <ToolTile href="/tools/loadout" title="Loadout planner" desc="Build a printable loadout — useful for location-sound bag prep on the camera truck." />
            <ToolTile href="/ask" title="Ask anything" desc="Sound-mixer-flavored questions: 'mixers who do 32-bit float bag setups', 'Atmos-certified dub stages in LA'." />
          </ul>
        </section>
      }
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/ask?q=Atmos+dub+stages+features+2023-2024" title="Atmos dub stages used on 2023–2024 features" />
            <CrossCutLink href="/ask?q=Skywalker+Sound+supervising+sound+editors" title="Skywalker Sound supervising sound editor credits" />
            <CrossCutLink href="/ask?q=re-recording+mixer+nominated+Oscar+CAS" title="Re-recording mixers nominated at AMPAS + CAS in the same year" />
            <CrossCutLink href="/ask?q=production+sound+mixer+location+bag+32-bit" title="Production sound mixers using 32-bit float bag setups" />
          </ul>
        </section>
      }
      peopleBlock={
        topMixers.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Most-credited sound mixers</h2>
              <Link href="/crew?category=sound" className="text-xs text-zinc-400 hover:text-amber-400">All sound crew →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topMixers.map((p) => (
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
        soundHouses.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Top dub stages by credit count</h2>
              <Link href="/sound/houses" className="text-xs text-zinc-400 hover:text-amber-400">All sound houses →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {soundHouses.slice(0, 9).map((h) => (
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
