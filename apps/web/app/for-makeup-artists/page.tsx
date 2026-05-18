import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions } from '@bts/db';
import { RolePage, ToolTile, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Makeup & Hair Artists',
  description:
    'Reference for makeup department heads, hair department heads, and makeup effects supervisors — credited filmographies and the MUAHS Guild + AMPAS Best Makeup recognition record.',
  alternates: { canonical: `${siteUrl()}/for-makeup-artists` },
};

export const revalidate = 86400;

const MUH_ROLES = ['makeup-dept-head', 'hair-dept-head', 'makeup-effects-supervisor'];

export default async function ForMakeupArtistsPage() {
  const [topArtists, curated] = await Promise.all([
    listPeople(db, { roleSlugs: MUH_ROLES, sort: 'credits', withCreditsOnly: true, limit: 12 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Makeup & Hair Artists"
      description="Makeup department heads, hair department heads, and makeup effects supervisors. Prosthetic build, beauty makeup, character transformation — credited and cross-referenced."
      toolBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Working tools</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolTile href="/costume-hair-makeup" title="Department hub" desc="The full costume / hair / makeup hub, with combined glossary and people list." />
            <ToolTile href="/awards/craft/makeup-hairstyling" title="MU & H awards" desc="Cross-cut AMPAS Best Makeup & Hairstyling + MUAHS Guild Awards." />
            <ToolTile href="/ask" title="Ask anything" desc="MU&H questions: 'Mark Coulier prosthetic credits', 'character-transformation features 2024', 'creature makeup effects'." />
          </ul>
        </section>
      }
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/ask?q=prosthetic+makeup+features+2020-2024" title="Prosthetic-heavy features, 2020–2024" />
            <CrossCutLink href="/ask?q=Mark+Coulier+credits" title="Mark Coulier (Iron Lady, Whale)" />
            <CrossCutLink href="/ask?q=MUAHS+winner+character" title="MUAHS character-makeup winners" />
            <CrossCutLink href="/ask?q=makeup+effects+supervisor+horror" title="Makeup effects supervisors on prestige horror" />
          </ul>
        </section>
      }
      peopleBlock={
        topArtists.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">Most-credited MU & H artists</h2>
              <Link href="/crew?category=makeup-hair" className="text-xs text-zinc-400 hover:text-amber-400">All →</Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topArtists.map((p) => (
                <li key={p.slug}>
                  <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                    <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                    <p className="mt-1 text-xs text-zinc-400">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Makeup / Hair'}</p>
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
