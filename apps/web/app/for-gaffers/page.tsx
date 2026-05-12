import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople } from '@bts/db';
import { RolePage, ToolTile, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Gaffers',
  description:
    'A working reference shelf for gaffers — per-scene lighting setups with cinematographer motivation, fixture inventories, color-temperature notes, and the working tools for prep day.',
  alternates: { canonical: `${siteUrl()}/for-gaffers` },
};

export const revalidate = 86400;

export default async function ForGaffersPage() {
  const gaffers = await listPeople(db, { category: 'electric', sort: 'credits', withCreditsOnly: true, limit: 12 });

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Gaffers"
      description="Scene-level lighting plots with cinematographer motivation paragraphs, fixture choices, color temperatures, and the gels/diffusion combinations that make each look legible. Cited and confidence-graded — the working reference your DP wishes existed."
      toolBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Working tools</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolTile href="/tools/coverage" title="Sensor coverage" desc="Lens image-circle vs sensor format. Useful when the DP rigs a large-format body on the truss." />
            <ToolTile href="/tools/loadout" title="Loadout planner" desc="Build a shareable loadout sheet — lighting, filters, gels — printable for the lighting truck." />
            <ToolTile href="/tools/frame-lines" title="Frame-line overlay" desc="Multi-aspect-ratio framing for lamp placement above/below frame." />
          </ul>
        </section>
      }
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/queries/magic-hour-2023" title="Magic-hour exterior lighting, 2023 features" />
            <CrossCutLink href="/ask?q=SkyPanel+S360+key+light+features" title="Features using SkyPanel S360 as a key" />
            <CrossCutLink href="/ask?q=practical+sodium-vapor+night+exterior" title="Practical sodium-vapor night exteriors" />
            <CrossCutLink href="/ask?q=single+source+key+no+fill" title="Single-source key / no-fill setups" />
          </ul>
        </section>
      }
      peopleBlock={gaffers.length > 0 ? (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-cited gaffers + lamp ops</h2>
            <Link href="/crew?category=electric" className="text-xs text-zinc-500 hover:text-amber-400">All electric →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {gaffers.map((p) => (
              <li key={p.slug}>
                <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Electric'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    />
  );
}
