import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople } from '@bts/db';
import { RolePage, ToolTile, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Colorists',
  description:
    'A working reference shelf for colorists — color-pipeline dossiers (camera log → IDT → working space → ODT), per-production grading attribution, DI lab cross-references, and ACES tools.',
  alternates: { canonical: `${siteUrl()}/for-colorists` },
};

export const revalidate = 86400;

export default async function ForColoristsPage() {
  const colorists = await listPeople(db, { category: 'post', sort: 'credits', withCreditsOnly: true, limit: 12 });

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Colorists"
      description="Camera-log-to-deliverable pipelines per production, grading attribution at DI facility level, ACES tooling for on-set prep, and the citation-graded references that turn a finishing pass into a defensible audit trail."
      toolBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Working tools</h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <ToolTile href="/tools/aces" title="ACES IDT/ODT picker" desc="Camera log → working space → deliverable chain decoder. Browse the canonical IDT/ODT pairs for every camera body in the archive." />
            <ToolTile href="/tools/cdl" title="ASC CDL parser" desc="Drop a .cdl/.ccc file; see SOP + Saturation broken out, with a CSS-filter approximation against a sample frame." />
          </ul>
        </section>
      }
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/ask?q=Stefan+Sonnenfeld+graded+films" title="Stefan Sonnenfeld grading credits" />
            <CrossCutLink href="/ask?q=ACES+1.3+vs+1.0+working+space+deliverables" title="ACES versions used by post-house" />
            <CrossCutLink href="/ask?q=photochemical+answer+print+only+features" title="Photochemical-only finishing" />
            <CrossCutLink href="/ask?q=Dolby+Vision+HDR+deliverables+2023" title="Dolby Vision HDR deliverables, 2023" />
          </ul>
        </section>
      }
      peopleBlock={colorists.length > 0 ? (
        <section className="mb-12">
          <div className="mb-4 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-cited colorists</h2>
            <Link href="/crew?category=post" className="text-xs text-zinc-500 hover:text-amber-400">All post →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {colorists.map((p) => (
              <li key={p.slug}>
                <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-500">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Post'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    />
  );
}
