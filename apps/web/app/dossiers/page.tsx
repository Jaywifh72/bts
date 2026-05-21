import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listCraftDossiers } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Craft Dossiers',
  description:
    'Production-design, costume, and makeup-hair deep-dives — signature looks, techniques, collaborators, and cited references for each curated film.',
  alternates: { canonical: `${siteUrl()}/dossiers` },
};

export const revalidate = 3600;

const CRAFT_LABELS: Record<string, string> = {
  pd: 'Production design',
  costume: 'Costume',
  'makeup-hair': 'Makeup & hair',
};

export default async function DossiersIndexPage() {
  const dossiers = await listCraftDossiers(db, { limit: 500 });
  const byCraft = new Map<string, typeof dossiers>();
  for (const d of dossiers) {
    const bucket = byCraft.get(d.craft) ?? [];
    bucket.push(d);
    byCraft.set(d.craft, bucket);
  }
  const crafts = Array.from(byCraft.keys()).sort();

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/dossiers'),
          name: 'Craft Dossiers — CineCanon',
          description:
            'Production-design, costume, and makeup-hair deep-dives across the curated CineCanon archive.',
        }}
      />
      <PageHero
        eyebrow="Craft · dossiers"
        title="Craft Dossiers"
        accent="amber"
        description="Department-head deep-dives. Each dossier pairs a production with the signature looks, techniques, and reference stack the head of department brought to it — cited and confidence-graded."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Dossiers" value={dossiers.length} />
            <PageHeroStat label="Crafts" value={crafts.length} />
            <PageHeroStat
              label="Most recent"
              value={dossiers[0]?.release_year ?? 0}
            />
          </div>
        }
      />

      {crafts.length === 0 ? (
        <p className="text-sm text-zinc-400">
          No dossiers published yet. Check back as the editorial backlog ships.
        </p>
      ) : (
        crafts.map((craft) => (
          <section key={craft} className="mb-10">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-serif text-xl text-zinc-100">
                {CRAFT_LABELS[craft] ?? craft}
              </h2>
              <span className="text-xs text-zinc-500">
                {byCraft.get(craft)!.length} dossier
                {byCraft.get(craft)!.length === 1 ? '' : 's'}
              </span>
            </div>
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {byCraft.get(craft)!.map((d) => (
                <li key={d.slug}>
                  <Link
                    href={`/dossiers/${d.slug}`}
                    className="group block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60"
                  >
                    <p className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
                      {d.headline}
                    </p>
                    <p className="mt-1 text-xs text-zinc-400">
                      {d.production_title}
                      {d.release_year ? ` (${d.release_year})` : ''}
                      {d.lead_name ? ` · ${d.lead_name}` : ''}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
