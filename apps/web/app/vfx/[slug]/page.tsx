import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { db, listVfxHouses, getVfxHouseWithFilmography, getAwardsForVfxHouse, getClaimsBundleForEntity } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { EntityProvenanceFooter } from '@/components/ui/EntityProvenanceFooter';
import { EntityClaimsList } from '@/components/ui/EntityClaimsList';
import { VfxFilmography } from '@/components/vfx/VfxFilmography';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { OrgRecipientAwardsList } from '@/components/awards/OrgRecipientAwardsList';
import { JsonLd, buildOrganizationJsonLd } from '@/lib/jsonLd';
import { posterUrl } from '@/lib/tmdb-image';

interface Props { params: Promise<{ slug: string }> }

export async function generateStaticParams() {
  const rows = await listVfxHouses(db);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const data = await getVfxHouseWithFilmography(db, params.slug);
  if (!data) return {};
  const description = data.house.tagline ?? data.house.summary?.split('\n')[0]?.slice(0, 160) ?? undefined;
  return {
    title: data.house.name,
    description,
    openGraph: { title: data.house.name, description, type: 'website' },
    twitter: { card: 'summary_large_image', title: data.house.name, description },
    alternates: { canonical: `/vfx/${data.house.slug}` },
  };
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '—';
  return Math.round(n).toLocaleString();
}

export default async function VfxHousePage(props: Props) {
  const params = await props.params;
  const [data, awards] = await Promise.all([
    getVfxHouseWithFilmography(db, params.slug),
    getAwardsForVfxHouse(db, params.slug),
  ]);
  if (!data) notFound();
  const { house, filmography, techniques, offices, highlights } = data;
  const claimsBundle = await getClaimsBundleForEntity(db, 'vfx_house', house.id, house.slug);

  const totalShots = house.total_shots != null ? Math.round(house.total_shots) : null;

  const jsonLd = buildOrganizationJsonLd({
    slug: house.slug,
    name: house.name,
    website: house.website,
    country: house.country,
  });

  // Split summary into paragraphs preserving the editor's line breaks.
  const paragraphs = (house.summary ?? '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      <JsonLd data={jsonLd} />
      <article>
        {/* Header band: brand logo + name + tagline + canonical meta. */}
        <header className="mb-10 border-b border-zinc-800 pb-8">
          <p className="text-xs text-zinc-500">
            <Link href="/vfx" className="hover:text-amber-400">VFX Houses</Link>
            {' › '}
          </p>
          <div className="mt-3 flex items-start gap-5">
            <BrandLogo
              slug={house.slug}
              website={house.website}
              name={house.name}
              size="lg"
              className="shrink-0"
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <h1 className="font-serif text-4xl text-zinc-50">{house.name}</h1>
                <BookmarkButton
                  kind="vfx-house"
                  slug={house.slug}
                  title={house.name}
                  subtitle={house.headquarters ?? house.country ?? undefined}
                  href={`/vfx/${house.slug}`}
                />
              </div>
              {house.tagline && (
                <p className="mt-1 text-sm text-zinc-400">{house.tagline}</p>
              )}
              <p className="mt-2 text-xs uppercase tracking-wide text-zinc-500">
                {house.headquarters ?? house.country ?? 'VFX House'}
                {house.founded_year ? ` · Est. ${house.founded_year}` : ''}
                {house.parent_company ? ` · ${house.parent_company}` : ''}
              </p>
            </div>
          </div>

          {/* Stats bar */}
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-5">
            <Stat label="Productions" value={formatNumber(house.total_productions)} />
            <Stat label="As Primary" value={formatNumber(house.primary_credits)} />
            {totalShots != null && (
              <Stat label="Total shots" value={totalShots.toLocaleString()} />
            )}
            {house.employee_count != null && (
              <Stat label="Headcount" value={`~${formatNumber(house.employee_count)}`} />
            )}
            {house.founded_year && (
              <Stat label="Founded" value={String(house.founded_year)} />
            )}
          </div>
        </header>

        {/* Editorial summary */}
        {paragraphs.length > 0 && (
          <section className="mb-10">
            {/* Audit: heading used to repeat house.name (same as H1) — */}
            {/* now describes the section body. */}
            <SectionHeader label="About" heading="Overview" />
            <div className="mt-3 max-w-3xl space-y-4 text-sm leading-relaxed text-zinc-300">
              {paragraphs.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        )}

        {/* Specialties (techniques) */}
        {techniques.length > 0 && (
          <section className="mb-10">
            <SectionHeader label="Specialties" heading="Techniques" />
            <div className="mt-3 flex flex-wrap gap-2">
              {techniques.map((t) => (
                <Badge key={t.slug} label={t.name} variant="category" />
              ))}
            </div>
          </section>
        )}

        {/* Career-defining work — pinned highlights with editorial note */}
        {highlights.length > 0 && (
          <section className="mb-10">
            <SectionHeader label="Highlights" heading="Career-defining work" />
            <p className="-mt-2 mb-4 max-w-2xl text-xs text-zinc-500">
              Hand-picked films from the studio's filmography with an
              editorial note on what made the work distinctive.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {highlights.map((h) => {
                const poster = posterUrl(h.poster_path, 'w342');
                return (
                  <Link
                    key={h.production_slug}
                    href={`/films/${h.production_slug}`}
                    className="group flex gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-zinc-600 transition-colors"
                  >
                    <div
                      className="relative shrink-0 overflow-hidden rounded border border-zinc-800 bg-zinc-950"
                      style={{ width: 64, aspectRatio: '2/3' }}
                    >
                      {poster && (
                        <Image src={poster} unoptimized alt="" fill sizes="64px" className="object-cover" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <span className="line-clamp-1 font-serif text-sm text-zinc-100 group-hover:text-amber-400">
                          {h.production_title}
                        </span>
                        <span className="shrink-0 font-mono text-xs text-zinc-500">
                          {h.release_year ?? ''}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-4 text-xs leading-relaxed text-zinc-400">
                        {h.editorial_note}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Offices */}
        {offices.length > 0 && (
          <section className="mb-10">
            {/* Audit: heading used to be the count ("8 offices") which */}
            {/* read as a stat-as-heading. The count is sub-label info; */}
            {/* the heading should describe the section's content. */}
            <SectionHeader
              label="Locations"
              heading={`Offices · ${offices.length}`}
            />
            <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3 lg:grid-cols-4">
              {offices.map((o) => (
                <li key={o.city} className="flex items-baseline gap-2">
                  <span className="text-zinc-200">{o.city}</span>
                  {o.country && (
                    <span className="text-xs text-zinc-500">{o.country}</span>
                  )}
                  {o.is_headquarters && (
                    <span className="rounded bg-amber-950/40 border border-amber-800 px-1 py-0.5 text-[9px] uppercase tracking-wide text-amber-400">
                      HQ
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* 0057 — VES + other org-level awards this house has received,
            joined back to the production they were given for. Self-hides
            when none. */}
        <OrgRecipientAwardsList awards={awards} />

        {/* Filmography */}
        <section className="mb-10">
          <SectionHeader
            label="Credits"
            heading={`Filmography — ${filmography.length} ${filmography.length === 1 ? 'production' : 'productions'}`}
          />
          <div className="mt-3">
            <VfxFilmography rows={filmography} />
          </div>
        </section>

        {/* Further reading — editorial pointers (Wikipedia, fxguide,
            studio about-pages, public interviews). Title + URL only;
            we don't reproduce any external content. */}
        {house.references && house.references.length > 0 && (
          <section className="mb-10">
            <SectionHeader label="References" heading="Further reading" />
            <ul className="mt-3 space-y-2 text-sm">
              {house.references.map((ref, i) => (
                <li key={i} className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <a href={ref.url} target="_blank" rel="noopener noreferrer"
                     className="text-zinc-100 hover:text-amber-400">
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

        {/* Resources */}
        <footer className="border-t border-zinc-800 pt-6">
          <p className="mb-3 text-xs uppercase tracking-wide text-zinc-500">Resources</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
            {house.website && (
              <a href={house.website} target="_blank" rel="noopener noreferrer"
                 className="text-zinc-300 hover:text-amber-400">
                Official website ↗
              </a>
            )}
            {house.careers_url && (
              <a href={house.careers_url} target="_blank" rel="noopener noreferrer"
                 className="text-zinc-300 hover:text-amber-400">
                Careers ↗
              </a>
            )}
            {house.reel_url && (
              <a href={house.reel_url} target="_blank" rel="noopener noreferrer"
                 className="text-zinc-300 hover:text-amber-400">
                Showreel / work ↗
              </a>
            )}
          </div>
        </footer>
        <EntityClaimsList
          claims={claimsBundle.claims}
          sourcesByClaimId={claimsBundle.sourcesByClaimId}
          evidenceByClaimId={claimsBundle.evidenceByClaimId}
          eyebrow="Claims"
          heading="Source-backed facts about this VFX house"
          anchorId="claims"
        />
        <div className="mt-8 border-t border-zinc-800 pt-6">
          <EntityProvenanceFooter
            entitySlug={house.slug}
            pageUrl={`/vfx/${house.slug}`}
            lastVerifiedAt={house.last_verified_at}
            dataTier={house.data_tier}
            curatedBy={house.curated_by}
            curatedByUrl={house.curated_by_url}
            lastCuratedReview={house.last_curated_review}
          />
        </div>
      </article>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="font-serif text-2xl text-zinc-50">{value}</div>
      <div className="text-xs uppercase tracking-wide text-zinc-500">{label}</div>
    </div>
  );
}
