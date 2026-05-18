import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listPeople, countPeople, listProductions } from '@bts/db';
import { DepartmentIndex } from '@/components/role/DepartmentIndex';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'Editing',
  description: 'Editors and their assistants. Cited credits, cross-referenced to the productions they cut.',
  alternates: { canonical: `${siteUrl()}/editing` },
};

export const revalidate = 86400;

const EDITING_ROLE_SLUGS = ['editor', 'first-assistant-editor', 'dialog-editor', 'music-editor'];

export default async function EditingPage() {
  const [people, totalPeople, curated] = await Promise.all([
    listPeople(db, { roleSlugs: EDITING_ROLE_SLUGS, sort: 'credits', withCreditsOnly: true, limit: 15 }),
    countPeople(db, { roleSlugs: EDITING_ROLE_SLUGS, withCreditsOnly: true }),
    listProductions(db, { dataTier: 'curated', limit: 6 }),
  ]);

  const topCredits = people[0]?.credit_count ?? 0;

  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'CollectionPage', '@id': absoluteUrl('/editing'), name: 'Editing — CineCanon' }} />

      <nav aria-label="Editing sub-disciplines" className="mb-6 flex flex-wrap gap-2 text-sm">
        <span className="self-center text-[10px] uppercase tracking-widest text-zinc-500">Drill into</span>
        <Link href="/editing/editors" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Editors</Link>
        <Link href="/for-editors" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">For editors</Link>
        <Link href="/awards/craft/editing" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Editing awards</Link>
        <Link href="/awards/craft/music-editing" className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-zinc-300 hover:border-amber-700 hover:text-amber-400">Music-editing awards</Link>
      </nav>

      <DepartmentIndex
        title="Editing"
        accent="purple"
        description="The cutting room. Editors and their assistants — credited and cross-referenced to every production they shaped."
        stats={[
          { label: 'People in archive', value: totalPeople.toLocaleString() },
          { label: 'Top-credited count', value: topCredits.toLocaleString() },
          { label: 'Roles indexed', value: EDITING_ROLE_SLUGS.length },
          { label: 'Curated dossiers', value: curated.length },
        ]}
        glossary={[
          { term: 'Editor (Picture)', def: 'The lead editor of the film. Cuts the picture under the director\'s guidance. Credit usually reads "Edited by" — single or co-edited.' },
          { term: 'First Assistant Editor', def: 'Manages the cutting-room workflow: syncing dailies, file management, conform, output. Often the editor-in-training pipeline.' },
          { term: 'Dialog Editor', def: 'Cleans and assembles dialog after picture lock — removes lip smacks, balances levels, preps for ADR and re-recording.' },
          { term: 'Cut versions', def: 'Editor\'s cut → director\'s cut → studio cut → theatrical / streaming cut. Pro pages note which version a credit reflects.' },
          { term: 'Conform', def: 'Re-linking the offline cut\'s decisions to original camera files at full resolution and color, ahead of color grading.' },
          { term: 'Avid / Premiere / Resolve', def: 'NLE choice often appears in interviews; pages note when documented.' },
        ]}
        crossCuts={[
          { href: '/ask?q=Thelma+Schoonmaker+editor+credits', title: 'Thelma Schoonmaker filmography' },
          { href: '/ask?q=long+take+films+editor+credit', title: 'Long-take features by editor' },
          { href: '/ask?q=Sean+Baker+editor+film', title: 'Sean Baker editor-credit films' },
          { href: '/ask?q=Eddie+Hamilton+action+editing', title: 'Eddie Hamilton — action editing' },
        ]}
        people={people}
        films={curated}
        allCrewHref="/crew?category=post"
      />
    </>
  );
}
