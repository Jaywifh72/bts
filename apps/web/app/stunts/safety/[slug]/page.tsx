import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  db,
  getSafetyBulletinBySlug,
  listSafetyBulletins,
  listRiggingTechniques,
  getReferencesWithCrossCitations,
} from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { EntityReferencesList } from '@/components/EntityReferencesList';

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const b = await getSafetyBulletinBySlug(db, params.slug);
  if (!b) return {};
  return {
    title: `Bulletin #${b.bulletin_number} — ${b.title}`,
    description: b.scope.slice(0, 160),
  };
}

export async function generateStaticParams() {
  const bulletins = await listSafetyBulletins(db);
  return bulletins.map((b) => ({ slug: b.slug }));
}

const CATEGORY_LABEL: Record<string, string> = {
  firearms: 'Firearms',
  pyrotechnics: 'Pyrotechnics',
  fire: 'Fire',
  animals: 'Animals',
  aerial: 'Aerial',
  vehicles: 'Vehicles',
  water: 'Water / underwater',
  stunts_general: 'Stunts (general)',
  environmental: 'Environmental',
  medical: 'Medical / blood',
};

export default async function SafetyBulletinDetailPage(props: Props) {
  const params = await props.params;
  const bulletin = await getSafetyBulletinBySlug(db, params.slug);
  if (!bulletin) notFound();

  // Hydrate the related rigging slugs into name + tagline cards.
  // We do this by listing all rigging entries and filtering in
  // memory rather than a per-slug query — the dataset is < 50 rows.
  const [allRigging, crossCitedReferences] = await Promise.all([
    listRiggingTechniques(db),
    // Phase 31 — references read from media_associations with
    // cross-citation count.
    getReferencesWithCrossCitations(db, 'safety_bulletin', bulletin.id),
  ]);
  const relatedRigging = allRigging.filter((r) =>
    bulletin.related_rigging_slugs.includes(r.slug),
  );

  return (
    <>
      <nav className="mb-6 text-xs uppercase tracking-wide text-zinc-500">
        <Link href="/stunts" className="hover:text-amber-400">Stunts</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <Link href="/stunts/safety" className="hover:text-amber-400">Safety bulletins</Link>
        <span className="mx-2 text-zinc-700">/</span>
        <span className="text-zinc-300">#{bulletin.bulletin_number}</span>
      </nav>
      <header className="mb-10 rounded border border-red-900/40 bg-red-950/10 p-6">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-3xl text-amber-400">#{bulletin.bulletin_number}</span>
          <p className="text-[10px] uppercase tracking-[0.25em] text-red-400/80">
            {CATEGORY_LABEL[bulletin.category] ?? bulletin.category} ·{' '}
            {bulletin.governing_body}
          </p>
        </div>
        <h1 className="mt-2 font-serif text-3xl text-zinc-50 leading-tight">
          {bulletin.title}
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-zinc-300">
          {bulletin.scope}
        </p>

        <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs">
          {bulletin.last_revision_date && (
            <span className="text-zinc-500">
              <span className="uppercase tracking-wide text-zinc-600">
                Last revision:
              </span>{' '}
              {new Date(bulletin.last_revision_date).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
              })}
            </span>
          )}
          {bulletin.canonical_pdf_url && (
            <a
              href={bulletin.canonical_pdf_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-400 hover:underline"
            >
              Canonical PDF at sagaftra.org ↗
            </a>
          )}
        </div>
      </header>
      {/* Editorial summary */}
      <section className="mb-10">
        <SectionHeader label="Context" heading="Why this bulletin matters" />
        <div className="prose prose-invert prose-zinc max-w-3xl text-sm leading-relaxed text-zinc-300">
          {bulletin.summary.split(/\n\n+/).map((para, i) => (
            <p key={i} className="mb-4">{para}</p>
          ))}
        </div>
      </section>
      {/* Key requirements */}
      {bulletin.key_requirements.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            label="Requirements"
            heading={`${bulletin.key_requirements.length} core obligations`}
          />
          <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
            Editorial summary of the bulletin's load-bearing
            requirements. The canonical PDF is the authoritative
            source — these are the surface points referenced in
            production safety briefings.
          </p>
          <ul className="space-y-3">
            {bulletin.key_requirements.map((req) => (
              <li
                key={req.heading}
                className="rounded border border-zinc-800 bg-zinc-900/40 p-4"
              >
                <h3 className="font-serif text-base text-zinc-100">
                  {req.heading}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
                  {req.detail}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}
      {/* Related rigging — bidirectional cross-link */}
      {relatedRigging.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            label="Governs"
            heading={`${relatedRigging.length} ${relatedRigging.length === 1 ? 'rig' : 'rigs'} in the glossary`}
          />
          <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
            Rigging glossary entries whose work is governed by this
            bulletin. Click through for the mechanism breakdown.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {relatedRigging.map((r) => (
              <Link
                key={r.slug}
                href={`/stunts/rigging/${r.slug}`}
                className="group flex flex-col gap-2 rounded border border-zinc-800 bg-zinc-900/40 p-4 hover:border-red-900/50 hover:bg-red-950/10 transition-colors"
              >
                <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                  {r.category}
                </p>
                <h3 className="font-serif text-base text-zinc-100 group-hover:text-amber-400">
                  {r.name}
                </h3>
                <p className="line-clamp-3 text-xs leading-relaxed text-zinc-400">
                  {r.tagline}
                </p>
              </Link>
            ))}
          </div>
        </section>
      )}
      {/* References — Phase 31 polymorphic render with cross-citation hints */}
      <EntityReferencesList references={crossCitedReferences} />
      <aside className="mt-12 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-xs leading-relaxed text-zinc-500">
        <p className="mb-2 text-[10px] uppercase tracking-widest text-zinc-400">
          Editorial note
        </p>
        Summary and requirements text on this page are original prose
        written for this archive. The canonical SAG-AFTRA bulletin is
        the authoritative source for any working safety officer; the
        PDF lives at{' '}
        <a
          href={bulletin.canonical_pdf_url ?? 'https://www.sagaftra.org/safety'}
          target="_blank"
          rel="noopener noreferrer"
          className="text-zinc-300 underline-offset-2 hover:text-amber-400 hover:underline"
        >
          {bulletin.canonical_pdf_url
            ? `sagaftra.org/files/sa_documents/SafetyBulletin${bulletin.bulletin_number.padStart(2, '0')}.pdf`
            : 'sagaftra.org/safety'}
        </a>.
      </aside>
    </>
  );
}
