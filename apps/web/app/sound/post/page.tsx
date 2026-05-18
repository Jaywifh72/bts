import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople, listPostHouses } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Post Sound',
  description:
    'Post-sound discipline page — supervising sound editors, sound designers, dialogue editors, re-recording mixers. The post-pipeline craft, with cited credits and the facility roster.',
  alternates: { canonical: `${siteUrl()}/sound/post` },
};

export const revalidate = 86400;

// Post-sound is the entire post pipeline — supervising, design, dialogue,
// re-recording, music editing. Production sound mixer + boom op live on
// the production-side page.
const POST_ROLES = [
  'supervising-sound-editor',
  'sound-designer',
  'dialog-editor',
  're-recording-mixer',
  'foley-artist',
];

export default async function PostSoundPage() {
  const [topPros, total, houses] = await Promise.all([
    listPeople(db, { roleSlugs: POST_ROLES, sort: 'credits', withCreditsOnly: true, limit: 15 }),
    countPeople(db, { roleSlugs: POST_ROLES, withCreditsOnly: true }),
    listPostHouses(db, { kinds: ['sound_mix', 'sound_design'], withCreditsOnly: true, limit: 8 }),
  ]);

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'CollectionPage',
          '@id': absoluteUrl('/sound/post'),
          name: 'Post Sound — CineCanon',
        }}
      />

      <PageHero
        eyebrow="Sound · discipline"
        title="Post Sound"
        accent="blue"
        description="The entire post pipeline — supervising sound editors, sound designers, dialogue editors, re-recording mixers, foley. The post-side counterpart to production sound, and where most of the cited recognition lives."
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PageHeroStat label="Post-sound pros" value={total} />
            <PageHeroStat label="Top credit count" value={topPros[0]?.credit_count ?? 0} />
            <PageHeroStat label="Roles indexed" value={POST_ROLES.length} />
          </div>
        }
      />

      <nav aria-label="Sound sub-indexes" className="mb-6 flex flex-wrap gap-2 text-sm">
        <Link href="/sound" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Sound hub</Link>
        <Link href="/sound/post" aria-current="page" className="rounded border border-amber-500 bg-amber-900/30 px-3 py-1 text-amber-300">Post sound</Link>
        <Link href="/sound/effects" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Effects & design</Link>
        <Link href="/sound/foley" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Foley</Link>
        <Link href="/sound/houses" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Houses</Link>
        <Link href="/awards/craft/sound-design" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Awards · design</Link>
        <Link href="/awards/craft/dialogue-adr" className="rounded border border-zinc-700 bg-zinc-900/40 px-3 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Awards · dialogue/ADR</Link>
      </nav>

      <section className="mb-12">
        <h2 className="mb-3 font-serif text-xl text-zinc-100">The post pipeline, briefly</h2>
        <div className="prose prose-invert prose-sm max-w-3xl text-zinc-300">
          <p>
            Post sound starts the moment picture is locked. The <strong>supervising sound editor</strong> is the
            department head — sets the deliverable target (Atmos, 7.1, 5.1), assigns the team, and signs the
            mix. <strong>Sound designers</strong> build non-dialog content from scratch — creatures, weapons,
            ambience, signature moments. <strong>Dialogue editors</strong> clean production tracks and
            cut ADR. <strong>Foley artists</strong> perform synchronous everyday sound (footsteps, cloth,
            props) on a foley stage to picture. The <strong>re-recording mixer</strong> balances dialog,
            music, and effects stems to the final deliverable, on a dub stage.
          </p>
          <p>
            CAS recognizes the production+post mix collaboratively. MPSE Golden Reel recognizes sound editing
            in detail — separate categories for dialogue & ADR, sound effects & foley, and music editing.
            AMPAS Best Sound currently rolls everything into one category. The post pros above are filterable
            on the corresponding awards craft pages.
          </p>
        </div>
      </section>

      {topPros.length > 0 && (
        <section className="mb-12">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Most-credited post-sound pros</h2>
            <Link href="/crew?category=sound" className="text-xs text-zinc-400 hover:text-amber-400">All sound crew →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topPros.map((p) => (
              <li key={p.slug}>
                <Link href={`/crew/${p.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                  <p className="font-serif text-base text-zinc-100">{p.display_name}</p>
                  <p className="mt-1 text-xs text-zinc-400">{p.credit_count ?? 0} credits · {p.primary_role ?? 'Sound'}</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {houses.length > 0 && (
        <section className="mb-12">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-serif text-xl text-zinc-100">Top post-sound houses</h2>
            <Link href="/sound/houses" className="text-xs text-zinc-400 hover:text-amber-400">All sound houses →</Link>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {houses.map((h) => (
              <li key={h.slug}>
                <Link href={`/sound/houses/${h.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60">
                  <p className="font-serif text-base text-zinc-100">{h.name}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-zinc-400">{h.kind.replace('_', ' ')}</p>
                  <p className="mt-1 font-mono text-xs text-amber-400">{h.production_count} productions</p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
