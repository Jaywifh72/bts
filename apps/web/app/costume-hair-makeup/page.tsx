import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople, listProductions } from '@bts/db';
import { DepartmentIndex } from '@/components/role/DepartmentIndex';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Costume, hair, makeup',
  description: 'Costume designers, hair department heads, makeup department heads — credited and cross-referenced.',
  alternates: { canonical: `${siteUrl()}/costume-hair-makeup` },
};

export const revalidate = 86400;

const ROLE_SLUGS = ['costume-designer', 'hair-dept-head', 'makeup-dept-head', 'makeup-effects-supervisor'];

export default async function CostumeHairMakeupPage() {
  const [people, totalPeople, curated] = await Promise.all([
    listPeople(db, { roleSlugs: ROLE_SLUGS, sort: 'credits', withCreditsOnly: true, limit: 15 }),
    countPeople(db, { roleSlugs: ROLE_SLUGS, withCreditsOnly: true }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  const topCredits = people[0]?.credit_count ?? 0;

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/costume-hair-makeup'), name: 'Costume, hair, makeup — CineCanon' }} />

      <nav aria-label="CHM sub-disciplines" className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="self-center text-[10px] uppercase tracking-widest text-zinc-500">Drill into</span>
        <Link href="/costume-hair-makeup/designers" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Designers + dept heads</Link>
        <Link href="/for-costume-designers" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">For costume designers</Link>
        <Link href="/for-makeup-artists" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">For MU & H artists</Link>
        <Link href="/awards/craft/costume-design" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Costume awards</Link>
        <Link href="/awards/craft/makeup-hairstyling" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">MU & H awards</Link>
      </nav>

      <DepartmentIndex
        title="Costume, hair, makeup"
        accent="red"
        description="The departments that turn an actor into a character. Costume designers, hair-department heads, makeup-department heads, prosthetic-effects supervisors — credited."
        stats={[
          { label: 'People in archive', value: totalPeople.toLocaleString() },
          { label: 'Top-credited count', value: topCredits.toLocaleString() },
          { label: 'Roles indexed', value: ROLE_SLUGS.length },
          { label: 'Curated dossiers', value: curated.length },
        ]}
        glossary={[
          { term: 'Costume Designer', def: 'Designs the looks; oversees fabrication, fittings, continuity. The single credit responsible for the visual world the actors wear.' },
          { term: 'Hair Dept. Head', def: 'Designs and supervises all hair (cuts, colors, wigs, periods). Leads a team of stylists; the credit for "the wigs in The Substance."' },
          { term: 'Makeup Dept. Head', def: 'Beauty / character / day-of-shoot makeup. Distinct from prosthetics, which is its own special-makeup-effects discipline.' },
          { term: 'Prosthetic / SFX Makeup', def: 'Sculpted appliances (foam latex, silicone) applied for character transformations — separate budget line, separate credit (e.g. The Whale, A Different Man).' },
          { term: 'Aging / De-aging', def: 'Practical makeup-led aging is a costume/hair/makeup credit; digital de-aging is VFX. Productions often use both — both should be credited.' },
        ]}
        crossCuts={[
          { href: '/ask?q=Sandy+Powell+costume+designer', title: 'Sandy Powell filmography' },
          { href: '/ask?q=Ruth+Carter+costume+work', title: 'Ruth Carter costume work' },
          { href: '/ask?q=prosthetic+effects+supervisor+actor+transformation', title: 'Prosthetic transformations' },
          { href: '/ask?q=period+costume+design+18th+century', title: '18th-century period costume' },
        ]}
        people={people}
        films={curated}
        allCrewHref="/crew?category=wardrobe"
      />
    </>
  );
}
