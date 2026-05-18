import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listDecisionTrees } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Craft decisions — when to choose X vs Y',
  description: 'Working-pro decision trees: anamorphic vs spherical, practical vs CGI, full orchestra vs samples, wire rig vs decelerator. Each tree with options, pros/cons, cost + complexity bands, and example films.',
  alternates: { canonical: `${siteUrl()}/decisions` },
};

const CRAFT_LABELS: Record<string, string> = {
  'cinematography': 'Cinematography',
  'vfx': 'VFX',
  'stunts': 'Stunts',
  'music': 'Music',
  'sound': 'Sound',
  'costume': 'Costume',
  'pd': 'Production design',
  'mu-hair': 'Makeup & hair',
  'editing': 'Editing',
  'color': 'Color',
};

export default async function DecisionsIndexPage() {
  type Row = Awaited<ReturnType<typeof listDecisionTrees>>[number];
  let trees: Row[] = [];
  try {
    const rows = await listDecisionTrees(db);
    trees = [...rows];
  } catch (err) {
    console.warn('[decisions] table missing', err);
  }

  const byCraft = new Map<string, Row[]>();
  for (const t of trees) {
    if (!byCraft.has(t.craft)) byCraft.set(t.craft, []);
    byCraft.get(t.craft)!.push(t);
  }

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/decisions'), name: 'Craft decisions — CineCanon' }} />

      <PageHero
        eyebrow="Working-pro reference"
        title="When to choose X vs Y"
        accent="amber"
        description="The choices a department head makes on every job. Each tree pits the realistic options against each other with the criteria that distinguish them — cost band, complexity, example films."
      />

      {trees.length === 0 ? (
        <p className="text-sm text-zinc-500">Decision trees coming online — table not yet migrated on this environment.</p>
      ) : (
        <div className="space-y-10">
          {[...byCraft.entries()].map(([craft, list]) => (
            <section key={craft}>
              <h2 className="mb-3 text-[10px] uppercase tracking-widest text-zinc-500">{CRAFT_LABELS[craft] ?? craft}</h2>
              <ul className="space-y-1.5 text-sm">
                {list.map((t) => (
                  <li key={t.slug} className="rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                    <Link href={`/decisions/${t.slug}`} className="text-zinc-100 hover:text-amber-400">{t.title}</Link>
                    <span className="ml-2 text-xs text-zinc-500">— {t.question}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
