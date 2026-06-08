import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, listSocietiesWithCounts, getSocietyWithMembers } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { EntityProvenanceFooter } from '@/components/ui/EntityProvenanceFooter';
import { EntityClaimsList } from '@/components/ui/EntityClaimsList';
import { getClaimsBundleForSociety } from '@bts/db';
import { departmentLabel } from '@/lib/department-labels';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const rows = await listSocietiesWithCounts(db);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { slug } = await props.params;
  const data = await getSocietyWithMembers(db, slug);
  if (!data) return {};
  const { society, members } = data;
  const description =
    society.description ??
    `${society.full_name} — cinematography society${society.country ? ` based in ${society.country}` : ''}${society.founded_year ? `, founded ${society.founded_year}` : ''}. ${members.length} member${members.length === 1 ? '' : 's'} in the CineCanon corpus.`;
  return {
    title: `${society.code} — ${society.full_name}`,
    description,
    alternates: { canonical: `/societies/${society.slug}` },
  };
}

export const revalidate = 3600;

export default async function SocietyDetailPage(props: Props) {
  const { slug } = await props.params;
  const data = await getSocietyWithMembers(db, slug);
  if (!data) notFound();
  const { society, members } = data;
  // F2 — societies are slug-keyed.
  const claimsBundle = await getClaimsBundleForSociety(db, society.slug);

  // Group members by their primary department (taken as the first
  // alphabetically — cinematographers virtually all have `camera`, so
  // this puts them at the top by definition).
  const groups = new Map<string, typeof members>();
  for (const m of members) {
    const primary = m.primary_categories[0] ?? 'other';
    if (!groups.has(primary)) groups.set(primary, []);
    groups.get(primary)!.push(m);
  }
  const groupKeys = [...groups.keys()].sort();

  return (
    <article>
      <header className="mb-8 border-b border-zinc-800 pb-6">
        <p className="text-xs text-zinc-500">
          <Link href="/societies" className="hover:text-amber-400">Cinematography societies</Link>
          {' › '}
        </p>
        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-serif text-4xl text-zinc-50">
              {society.name}
              <span className="ml-3 font-sans text-base font-normal text-zinc-400">
                {society.full_name}
              </span>
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-zinc-400">
              {society.country && (
                <span className="rounded border border-zinc-800 px-1.5 py-0.5 font-mono text-[11px]">
                  {society.country}
                </span>
              )}
              {society.founded_year && <span>Est. {society.founded_year}</span>}
              <span>
                {members.length} {members.length === 1 ? 'member' : 'members'} in corpus
              </span>
            </p>
          </div>
          <BookmarkButton
            kind="society"
            slug={society.slug}
            title={`${society.name} — ${society.full_name}`}
            subtitle={society.country ?? undefined}
            href={`/societies/${society.slug}`}
          />
        </div>
        {society.description && (
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-zinc-300">
            {society.description}
          </p>
        )}
        {/* Resource links — official site + Wikipedia. Both open in a
            new tab; treat as external references (noopener noreferrer). */}
        {(society.website || society.wikipedia_url) && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {society.website && (
              <a
                href={society.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-amber-400"
              >
                Official website ↗
              </a>
            )}
            {society.wikipedia_url && (
              <a
                href={society.wikipedia_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-amber-400"
              >
                Wikipedia ↗
              </a>
            )}
          </div>
        )}
      </header>

      {members.length === 0 ? (
        <div className="rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-400">
          <p>
            No members credited yet in CineCanon's curated corpus. Membership
            data ingest from Wikipedia is on the roadmap (E-14); for now
            this page is populated from hand-curated DP biographies.
          </p>
        </div>
      ) : (
        <>
          <SectionHeader
            label="Members"
            heading={`In corpus · ${members.length}`}
          />
          <div className="mt-3 space-y-8">
            {groupKeys.map((cat) => {
              const list = groups.get(cat)!;
              return (
                <section key={cat}>
                  <h3 className="mb-3 text-xs uppercase tracking-wide text-zinc-500">
                    {cat === 'other' ? 'Other' : departmentLabel(cat)}
                    <span className="ml-2 font-mono tabular-nums text-zinc-600">
                      {list.length}
                    </span>
                  </h3>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {list.map((m) => (
                      <li
                        key={m.slug}
                        className="rounded border border-zinc-800 bg-zinc-900/40 p-3"
                      >
                        <Link
                          href={`/crew/${m.slug}`}
                          className="font-medium text-zinc-100 hover:text-amber-400"
                        >
                          {m.display_name}
                        </Link>
                        {m.country && (
                          <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                            {m.country}
                          </span>
                        )}
                        {m.other_societies.length > 0 && (
                          <p className="mt-1 flex flex-wrap gap-1 text-[10px]">
                            <span className="text-zinc-500">Also:</span>
                            {m.other_societies.map((s) =>
                              s.slug ? (
                                <Link
                                  key={s.code}
                                  href={`/societies/${s.slug}`}
                                  className="rounded border border-zinc-700 bg-zinc-950 px-1.5 py-0.5 font-mono uppercase tracking-wider text-zinc-300 hover:border-amber-700/60 hover:text-amber-400"
                                >
                                  {s.code}
                                </Link>
                              ) : (
                                // Uncatalogued code (e.g. CBE — an honour,
                                // not a cinematography society). Render
                                // as plain text so the user sees the full
                                // credential string the DP uses.
                                <span
                                  key={s.code}
                                  title="Not a catalogued society"
                                  className="rounded border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 font-mono uppercase tracking-wider text-zinc-500"
                                >
                                  {s.code}
                                </span>
                              ),
                            )}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </>
      )}
      <EntityClaimsList
        claims={claimsBundle.claims}
        sourcesByClaimId={claimsBundle.sourcesByClaimId}
        evidenceByClaimId={claimsBundle.evidenceByClaimId}
        eyebrow="Claims"
        heading="Source-backed facts about this society"
        anchorId="claims"
      />
      <div className="mt-12 border-t border-zinc-800 pt-6">
        <EntityProvenanceFooter entitySlug={society.slug} pageUrl={`/societies/${society.slug}`} />
      </div>
    </article>
  );
}
