import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions } from '@bts/db';
import { RolePage, ToolTile, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Directors of Photography',
  description:
    'A working reference shelf for Directors of Photography — curated filmographies, scene-level lighting setups, color pipelines, lens choices, and the working tools you use Tuesday afternoon.',
  alternates: { canonical: `${siteUrl()}/for-dps` },
};

export const revalidate = 86400;

export default async function ForDpsPage() {
  // Curate the top DPs by curated-film credit count and a handful of recently
  //-updated curated films so visitors land on real material immediately.
  const [topDps, curated] = await Promise.all([
    listPeople(db, { category: 'camera', sort: 'credits', withCreditsOnly: true, limit: 12 }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Directors of Photography"
      description="The reference shelf working DPs actually use — curated filmographies with cited claims, scene-level lighting setups (motivation + fixtures), camera-log-to-deliverable color pipelines, lens loadouts, and working calculators for prep day."
      toolBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">
            Working tools — bookmark these
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolTile href="/tools/cdl"         title="ASC CDL parser"      desc="Drop a .cdl/.ccc file; see Slope/Offset/Power broken out + a CSS-filter preview against a sample frame." />
            <ToolTile href="/tools/aces"        title="ACES IDT/ODT picker" desc="Camera-log → working space → deliverable chain decoder. Use it on a tech scout." />
            <ToolTile href="/tools/frame-lines" title="Frame-line overlay"  desc="Multi-aspect-ratio overlay calculator. Toggle 1.66/1.78/1.85/2.00/2.20/2.39 and IMAX 1.43/1.90 protection." />
            <ToolTile href="/tools/coverage"    title="Sensor coverage"     desc="Lens image-circle vs sensor format. Catches large-format/Open-Gate compatibility issues before they hit the camera." />
            <ToolTile href="/tools/loadout"     title="Loadout planner"     desc="Build a shareable loadout sheet — cameras, lenses, lighting, filters — printable for the camera truck." />
          </ul>
        </section>
      }
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">
            Cross-cuts you can&apos;t get on IMDb
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/queries/alexa65-sphero"      title="ALEXA 65 + Panavision Sphero anamorphic features" />
            <CrossCutLink href="/queries/dune-part-two-lenses" title="Greig Fraser's lenses on Dune: Part Two" />
            <CrossCutLink href="/queries/magic-hour-2023"      title="Every magic-hour exterior in 2023 features, by fixture" />
            <CrossCutLink href="/ask?q=Roger+Deakins+photochemical+only+workflow" title="Deakins photochemical-only finishing — and who else does it" />
            <CrossCutLink href="/ask?q=anamorphic+features+shot+on+digital+2018-2024" title="Anamorphic features shot digital, 2018–2024" />
            <CrossCutLink href="/ask?q=large+format+open+gate+lighting+practical+only" title="Large-format Open-Gate features lit by practicals only" />
          </ul>
        </section>
      }
      peopleBlock={
        topDps.length > 0 ? (
          <section className="mb-12">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">
                Most-cited DPs in the archive
              </h2>
              <Link href="/crew?category=camera" className="text-xs text-zinc-400 hover:text-amber-400">
                All cinematographers <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {topDps.map((p) => (
                <li key={p.slug}>
                  <Link
                    href={`/crew/${p.slug}`}
                    className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60"
                  >
                    <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {p.credit_count ?? 0} credits · {p.primary_role ?? 'Cinematography'}
                    </p>
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
              <h2 className="font-serif text-xl text-zinc-100">
                Recently curated dossiers
              </h2>
              <Link href="/films?tier=curated" className="text-xs text-zinc-400 hover:text-amber-400">
                All curated films <span aria-hidden="true">→</span>
              </Link>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {curated.map((f) => (
                <li key={f.slug}>
                  <Link
                    href={`/films/${f.slug}`}
                    className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60"
                  >
                    <p className="font-serif text-base text-zinc-100">{f.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {f.release_year} · {f.primary_acquisition_format ?? 'Format pending'}
                    </p>
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
