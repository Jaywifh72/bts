import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, listStuntSchools, getStuntSchoolBySlug } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { EntityProvenanceFooter } from '@/components/ui/EntityProvenanceFooter';
import { EntityClaimsList } from '@/components/ui/EntityClaimsList';
import { getClaimsBundleForEntity } from '@bts/db';
import { JsonLd, buildOrganizationJsonLd } from '@/lib/jsonLd';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const rows = await listStuntSchools(db);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const s = await getStuntSchoolBySlug(db, params.slug);
  if (!s) return {};
  return {
    title: s.name,
    description: s.tagline ?? s.summary?.split('\n')[0]?.slice(0, 160) ?? undefined,
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-serif text-2xl text-zinc-50">{value}</div>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}

export default async function StuntSchoolPage(props: Props) {
  const params = await props.params;
  const s = await getStuntSchoolBySlug(db, params.slug);
  if (!s) notFound();

  // F2 — polymorphic claims. StuntSchoolRow doesn't carry id.
  const claimsBundle = await getClaimsBundleForEntity(db, 'stunt_school', 0, s.slug);

  const jsonLd = buildOrganizationJsonLd({
    slug: `stunt-school-${s.slug}`,
    name: s.name,
    website: s.website,
    country: s.country,
  });

  const paragraphs = (s.summary ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <JsonLd data={jsonLd} />
      <article>
        {/* Hero — amber accent for schools to differentiate from
            the red company-side palette while staying in the
            stunt-section family. */}
        <header className="relative mb-10 overflow-hidden border-b border-zinc-800 pb-8">
          <div
            aria-hidden
            className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-amber-950/40 via-zinc-950/0 to-transparent"
          />
          <div className="relative">
            <p className="text-xs text-zinc-500">
              <Link href="/stunts" className="hover:text-amber-400">Stunts</Link>
              {' › '}
              <span className="text-zinc-600">Schools</span>
              {' › '}
            </p>
            <div className="mt-3 flex items-start gap-5">
              <BrandLogo
                slug={s.slug}
                website={s.website}
                name={s.name}
                size="lg"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="font-serif text-4xl text-zinc-50">{s.name}</h1>
                  <BookmarkButton
                    kind="stunt-school"
                    slug={s.slug}
                    title={s.name}
                    subtitle={s.headquarters ?? s.country ?? undefined}
                    href={`/stunts/schools/${s.slug}`}
                  />
                </div>
                {s.tagline && (
                  <p className="mt-1 text-sm text-zinc-400">{s.tagline}</p>
                )}
                <p className="mt-2 text-xs uppercase tracking-wide text-zinc-400">
                  Training school
                  {(s.headquarters ?? s.country) ? ` · ${s.headquarters ?? s.country}` : ''}
                  {s.founded_year ? ` · Est. ${s.founded_year}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
              {s.founded_year && <Stat label="Founded" value={s.founded_year} />}
              {s.curriculum_disciplines.length > 0 && (
                <Stat label="Disciplines" value={s.curriculum_disciplines.length} />
              )}
              {s.references.length > 0 && (
                <Stat label="References" value={s.references.length} />
              )}
            </div>
          </div>
        </header>

        {/* Editorial summary */}
        {paragraphs.length > 0 && (
          <section className="mb-10">
            <SectionHeader label="About" heading={s.name} />
            <div className="mt-3 max-w-3xl space-y-4 text-sm leading-relaxed text-zinc-300">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* Curriculum disciplines */}
        {s.curriculum_disciplines.length > 0 && (
          <section className="mb-10">
            <SectionHeader label="Curriculum" heading="Disciplines covered" />
            <div className="mt-3 flex flex-wrap gap-2">
              {s.curriculum_disciplines.map((d) => (
                <span
                  key={d}
                  className="rounded border border-amber-900/40 bg-amber-950/20 px-2.5 py-1 text-sm text-amber-200/90"
                >
                  {d}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Alumni placeholder — populated when phase 2 ships
            person × school mapping. */}
        <section className="mb-10">
          <SectionHeader label="Lineage" heading="Notable alumni" />
          <p className="mt-3 max-w-2xl text-xs text-zinc-500">
            Performer-and-coordinator alumni are wired in once phase 2
            of the stunt-section roadmap lands — same
            person × school mapping pattern CineCanon already uses for
            film-school alumni on the crew pages.
          </p>
          <div className="mt-3 rounded border border-dashed border-zinc-800 p-6 text-center text-xs text-zinc-600">
            Alumni mapping coming with phase 2.
          </div>
        </section>

        {/* Further reading */}
        {s.references.length > 0 && (
          <section className="mb-10">
            <SectionHeader label="References" heading="Further reading" />
            <ul className="mt-3 space-y-2 text-sm">
              {s.references.map((ref, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <a
                    href={ref.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-zinc-100 hover:text-amber-400"
                  >
                    {ref.title}
                  </a>
                  {ref.publication && (
                    <span className="text-xs text-zinc-500">{ref.publication}</span>
                  )}
                  {ref.kind && (
                    <span className="rounded border border-zinc-700 bg-zinc-900 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-500">
                      {ref.kind.replace(/_/g, ' ')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Resources footer */}
        <footer className="border-t border-zinc-800 pt-6">
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Resources</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {s.website && (
              <a
                href={s.website}
                target="_blank"
                rel="noopener noreferrer"
                className="text-zinc-300 hover:text-amber-400"
              >
                Official website <span aria-hidden="true">↗</span>
              </a>
            )}
          </div>
        </footer>
        <EntityClaimsList
          claims={claimsBundle.claims}
          sourcesByClaimId={claimsBundle.sourcesByClaimId}
          evidenceByClaimId={claimsBundle.evidenceByClaimId}
          eyebrow="Claims"
          heading="Source-backed facts about this school"
          anchorId="claims"
        />
        <div className="mt-8 border-t border-zinc-800 pt-6">
          <EntityProvenanceFooter
            entitySlug={s.slug}
            pageUrl={`/stunts/schools/${s.slug}`}
            lastVerifiedAt={s.last_verified_at}
            dataTier={s.data_tier}
            curatedBy={s.curated_by}
            curatedByUrl={s.curated_by_url}
            lastCuratedReview={s.last_curated_review}
          />
        </div>
      </article>
    </>
  );
}
