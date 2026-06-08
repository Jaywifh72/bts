import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { db, listProductionsByFormatPatterns } from '@bts/db';
import { FORMAT_TAXONOMY, getFormatBySlug } from '@/lib/formats';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { BookmarkButton } from '@/components/ui/BookmarkButton';
import { EntityProvenanceFooter } from '@/components/ui/EntityProvenanceFooter';
import { EntityClaimsList } from '@/components/ui/EntityClaimsList';
import { getClaimsBundleForFormat } from '@bts/db';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/jsonLd';
import { posterUrl } from '@/lib/tmdb-image';

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return FORMAT_TAXONOMY.map((f) => ({ slug: f.slug }));
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const fmt = getFormatBySlug(params.slug);
  if (!fmt) return {};
  return {
    title: `Shot on ${fmt.label}`,
    description: fmt.description,
    openGraph: {
      title: `Shot on ${fmt.label} | CineCanon`,
      description: fmt.description,
      type: 'website',
    },
  };
}

export default async function FormatPage(props: Props) {
  const params = await props.params;
  const fmt = getFormatBySlug(params.slug);
  if (!fmt) notFound();

  const [productions, claimsBundle] = await Promise.all([
    listProductionsByFormatPatterns(db, fmt.patterns),
    // F2 — format entities are slug-keyed (no row id); pass 0 and match on entity_slug.
    getClaimsBundleForFormat(db, fmt.slug),
  ]);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'CineCanon', path: '/' },
    { name: 'Formats', path: '/format' },
    { name: fmt.label, path: `/format/${fmt.slug}` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <article>
        <header className="mb-6">
          <p className="text-xs uppercase tracking-widest text-zinc-400">Shot on</p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h1 className="font-serif text-4xl text-zinc-50">{fmt.label}</h1>
            <BookmarkButton
              kind="format"
              slug={fmt.slug}
              title={fmt.label}
              href={`/format/${fmt.slug}`}
            />
          </div>
          <p className="mt-3 max-w-2xl text-sm text-zinc-400">{fmt.description}</p>
        </header>

        <SectionHeader
          label="Films"
          heading={`${productions.length} ${productions.length === 1 ? 'production' : 'productions'} in our database`}
        />

        {productions.length === 0 ? (
          <div className="mt-4 rounded border border-zinc-800 bg-zinc-900/40 p-8 text-center text-zinc-500">
            No productions yet — once curators tag films on this format they'll
            show here.
          </div>
        ) : (
          <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {productions.map((p) => {
              const poster = posterUrl(p.poster_path, 'w342');
              return (
                <li key={p.slug}>
                  <Link
                    href={`/films/${p.slug}`}
                    className="group block overflow-hidden rounded border border-zinc-800 bg-zinc-900 transition-colors hover:border-zinc-600"
                  >
                    <div className="relative aspect-[2/3] bg-zinc-950">
                      {poster && (
                        <Image
                          src={poster}
                          unoptimized
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 18vw, (min-width: 640px) 25vw, 50vw"
                          className="object-cover"
                        />
                      )}
                    </div>
                    <div className="border-t border-zinc-800 p-3">
                      <h2 className="line-clamp-2 text-sm font-medium text-zinc-100 group-hover:text-amber-400">
                        {p.title}
                      </h2>
                      <p className="mt-1 text-xs text-zinc-500">
                        {p.release_year ?? '—'} · {p.aspect_ratio}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-600" title={p.acquisition_format}>
                        {p.acquisition_format}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        <EntityClaimsList
          claims={claimsBundle.claims}
          sourcesByClaimId={claimsBundle.sourcesByClaimId}
          evidenceByClaimId={claimsBundle.evidenceByClaimId}
          eyebrow="Claims"
          heading="Source-backed facts about this format"
          anchorId="claims"
        />
        <div className="mt-12 border-t border-zinc-800 pt-6">
          <EntityProvenanceFooter entitySlug={fmt.slug} pageUrl={`/format/${fmt.slug}`} />
        </div>
      </article>
    </>
  );
}
