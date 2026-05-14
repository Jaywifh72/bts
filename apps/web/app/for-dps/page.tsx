import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, listProductions } from '@bts/db';
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
    <>
      <header className="mb-10 border-b border-zinc-800 pb-8">
        <p className="text-[11px] uppercase tracking-[0.25em] text-amber-500/80">
          For working professionals
        </p>
        <h1 className="mt-2 font-serif text-4xl text-zinc-50">
          For Directors of Photography
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-300">
          The reference shelf working DPs actually use — curated filmographies
          with cited claims, scene-level lighting setups (motivation +
          fixtures), camera-log-to-deliverable color pipelines, lens loadouts,
          and working calculators for prep day.
        </p>
      </header>

      {/* Tools rail — Tuesday-afternoon utility */}
      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-zinc-100">
          Working tools — bookmark these
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Tool href="/tools/cdl"        title="ASC CDL parser" desc="Drop a .cdl/.ccc file; see Slope/Offset/Power broken out + a CSS-filter preview against a sample frame." />
          <Tool href="/tools/aces"       title="ACES IDT/ODT picker" desc="Camera-log → working space → deliverable chain decoder. Use it on a tech scout." />
          <Tool href="/tools/frame-lines" title="Frame-line overlay" desc="Multi-aspect-ratio overlay calculator. Toggle 1.66/1.78/1.85/2.00/2.20/2.39 and IMAX 1.43/1.90 protection." />
          <Tool href="/tools/coverage"   title="Sensor coverage" desc="Lens image-circle vs sensor format. Catches large-format/Open-Gate compatibility issues before they hit the camera." />
          <Tool href="/tools/loadout"    title="Loadout planner" desc="Build a shareable loadout sheet — cameras, lenses, lighting, filters — printable for the camera truck." />
        </ul>
      </section>

      {/* Cross-cuts the queries surface */}
      <section className="mb-12">
        <h2 className="mb-4 font-serif text-xl text-zinc-100">
          Cross-cuts you can&apos;t get on IMDb
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <Cross href="/queries/alexa65-sphero" title="ALEXA 65 + Panavision Sphero anamorphic features" />
          <Cross href="/queries/dune-part-two-lenses" title="Greig Fraser&apos;s lenses on Dune: Part Two" />
          <Cross href="/queries/magic-hour-2023" title="Every magic-hour exterior in 2023 features, by fixture" />
          <Cross href="/ask?q=Roger+Deakins+photochemical+only+workflow" title="Deakins photochemical-only finishing — and who else does it" />
          <Cross href="/ask?q=anamorphic+features+shot+on+digital+2018-2024" title="Anamorphic features shot digital, 2018–2024" />
          <Cross href="/ask?q=large+format+open+gate+lighting+practical+only" title="Large-format Open-Gate features lit by practicals only" />
        </ul>
      </section>

      {/* Featured DPs */}
      {topDps.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">
              Most-cited DPs in the archive
            </h2>
            <Link href="/crew?category=camera" className="text-xs text-zinc-500 hover:text-amber-400">
              All cinematographers →
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
                  <p className="mt-1 text-xs text-zinc-500">
                    {p.credit_count ?? 0} credits · {p.primary_role ?? 'Cinematography'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Recently curated dossiers */}
      {curated.length > 0 && (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">
              Recently curated dossiers
            </h2>
            <Link href="/films?tier=curated" className="text-xs text-zinc-500 hover:text-amber-400">
              All curated films →
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
                  <p className="mt-1 text-xs text-zinc-500">
                    {f.release_year} · {f.primary_acquisition_format ?? 'Format pending'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <aside className="mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          About this page
        </p>
        CineCanon&apos;s editorial standard: every gear, lighting, color, and
        scene claim is cited with a confidence rating. Read{' '}
        <Link href="/methodology" className="text-amber-400 hover:underline">the methodology</Link> for the four-tier rubric, the
        link-rot policy, and the dispute resolution flow.
      </aside>
    </>
  );
}

function Tool({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block h-full rounded border border-amber-900/40 bg-amber-950/10 p-4 hover:border-amber-700/60"
      >
        <h3 className="font-serif text-base text-zinc-100">{title}</h3>
        <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">{desc}</p>
      </Link>
    </li>
  );
}

function Cross({ href, title }: { href: string; title: string }) {
  return (
    <li>
      <Link
        href={href}
        className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-200 hover:border-amber-700/60 hover:text-amber-400"
      >
        → {title}
      </Link>
    </li>
  );
}
