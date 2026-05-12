import type { Metadata } from 'next';
import Link from 'next/link';
import { db, listStuntCompanies, listSafetyBulletins } from '@bts/db';
import { RolePage, CrossCutLink } from '@/components/role/RolePage';
import { siteUrl } from '@/lib/site';

export const metadata: Metadata = {
  title: 'For Stunt Coordinators',
  description:
    'A working reference shelf for stunt coordinators — sequence breakdowns with rigging, SAG-AFTRA safety bulletins cross-referenced to analogous sequences, doubling history, and the lineage graph of working stunt teams.',
  alternates: { canonical: `${siteUrl()}/for-coordinators` },
};

export const revalidate = 86400;

export default async function ForCoordinatorsPage() {
  const [companies, bulletins] = await Promise.all([
    listStuntCompanies(db),
    listSafetyBulletins(db),
  ]);

  return (
    <RolePage
      eyebrow="For working professionals"
      title="For Stunt Coordinators"
      description="Sequence-level rigging breakdowns, SAG-AFTRA safety bulletin cross-references to analogous sequences (the cross-cut no other site builds), production-level doubling history, and the mentor → protégé lineage graph that organises the working roster of modern stunt coordination."
      crossCutBlock={
        <section className="mb-12">
          <h2 className="mb-4 font-serif text-xl text-zinc-100">Cross-cuts</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            <CrossCutLink href="/stunts/sequences" title="Every documented sequence with rigging detail" />
            <CrossCutLink href="/stunts/lineage" title="Mentor → protégé lineage graph" />
            <CrossCutLink href="/stunts/safety" title="SAG-AFTRA safety bulletins, cross-referenced" />
            <CrossCutLink href="/stunts/rigging" title="Rigging glossary" />
            <CrossCutLink href="/stunts/people" title="Performers + coordinators with doubling history" />
            <CrossCutLink href="/ask?q=high+fall+decelerator+water+rig+features" title="High-fall + decelerator + water rig combinations" />
          </ul>
        </section>
      }
      peopleBlock={
        <>
          {companies.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-4 font-serif text-xl text-zinc-100">Stunt companies in the archive</h2>
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {companies.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/stunts/companies/${c.slug}`} className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-red-700/60">
                      <p className="font-serif text-base text-zinc-100">{c.name}</p>
                      {c.tagline && <p className="mt-1 text-xs text-zinc-500">{c.tagline}</p>}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {bulletins.length > 0 && (
            <section className="mb-12">
              <h2 className="mb-4 font-serif text-xl text-zinc-100">Indexed safety bulletins</h2>
              <ul className="grid gap-2 sm:grid-cols-2">
                {bulletins.slice(0, 12).map((b) => (
                  <li key={b.slug}>
                    <Link href={`/stunts/safety/${b.slug}`} className="block rounded border border-amber-900/40 bg-amber-950/10 p-3 text-sm hover:border-amber-700/60">
                      <span className="font-mono text-amber-500/70">#{b.bulletin_number}</span>{' '}
                      <span className="text-zinc-200">{b.title}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      }
    />
  );
}
