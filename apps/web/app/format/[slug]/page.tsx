import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { db, listProductionsByFormatPatterns } from '@bts/db';
import { FORMAT_TAXONOMY, getFormatBySlug } from '@/lib/formats';
import { SectionHeader } from '@/components/ui/SectionHeader';
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

  const productions = await listProductionsByFormatPatterns(db, fmt.patterns);

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
          <p className="text-xs uppercase tracking-widest text-zinc-500">Shot on</p>
          <h1 className="mt-1 font-serif text-4xl text-zinc-50">{fmt.label}</h1>
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
      </article>
    </>
  );
}
