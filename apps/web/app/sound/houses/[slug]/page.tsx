import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getPostHouseBySlug, listProductionsForPostHouse } from '@bts/db';
import { PageHero, PageHeroStat } from '@/components/ui/PageHero';
import { JsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

export const revalidate = 86400;

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params;
  const house = await getPostHouseBySlug(db, slug);
  if (!house) return { title: 'Sound house' };
  return {
    title: `${house.name} — sound house`,
    description: house.description
      ?? `Sound credits for ${house.name}${house.city ? ` (${house.city}${house.country ? ', ' + house.country : ''})` : ''}.`,
    alternates: { canonical: `${siteUrl()}/sound/houses/${house.slug}` },
  };
}

const ROLE_LABELS: Record<string, string> = {
  sound_mix: 'Sound mix',
  sound_design: 'Sound design',
  di: 'DI',
  color_grading: 'Color',
  finishing: 'Finishing',
  imax_remaster: 'IMAX remaster',
  mastering: 'Mastering',
  other: 'Other',
};

export default async function SoundHouseDetailPage(
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const house = await getPostHouseBySlug(db, slug);
  if (!house) notFound();
  // Only surface sound-flavored houses on this route. Picture-side
  // facilities have their own detail surface elsewhere.
  if (house.kind !== 'sound_mix' && house.kind !== 'sound_design') notFound();

  const productions = await listProductionsForPostHouse(db, house.id, 300);

  // Group credits by production so a film that gets sound mix AND sound
  // design from the same house appears once, with both roles listed.
  type Grouped = {
    slug: string;
    title: string;
    release_year: number | null;
    poster_path: string | null;
    roles: { role: string; notes: string | null }[];
  };
  const grouped = productions.reduce<Map<string, Grouped>>((acc, row) => {
    const existing = acc.get(row.slug);
    if (existing) {
      existing.roles.push({ role: row.role, notes: row.notes });
    } else {
      acc.set(row.slug, {
        slug: row.slug, title: row.title,
        release_year: row.release_year, poster_path: row.poster_path,
        roles: [{ role: row.role, notes: row.notes }],
      });
    }
    return acc;
  }, new Map());
  const productionRows = Array.from(grouped.values());

  return (
    <>
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': absoluteUrl(`/sound/houses/${house.slug}`),
          name: house.name,
          address: house.city || house.country ? {
            '@type': 'PostalAddress',
            addressLocality: house.city ?? undefined,
            addressCountry: house.country ?? undefined,
          } : undefined,
          url: house.website ?? undefined,
          foundingDate: house.founded_year?.toString(),
        }}
      />

      <PageHero
        eyebrow={`Sound · ${house.kind.replace('_', ' ')}`}
        title={house.name}
        accent="blue"
        description={house.description ?? `${house.name} is credited on ${house.production_count} production${house.production_count === 1 ? '' : 's'} for ${house.kind.replace('_', ' ')}.`}
        stats={
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PageHeroStat label="Production credits" value={house.production_count} />
            <PageHeroStat label="Discipline" value={ROLE_LABELS[house.kind] ?? house.kind} />
            <PageHeroStat label="Location" value={[house.city, house.country].filter(Boolean).join(', ') || '—'} />
            <PageHeroStat label="Founded" value={house.founded_year ?? '—'} />
          </div>
        }
      />

      {/* Format-certification badges — Atmos / Premier / IMAX / HDR. */}
      {(house.atmos_certified || house.dolby_premier_certified || house.imax_certified || house.hdr_grading || house.mix_room_count) && (
        <section className="mb-6">
          <h2 className="mb-2 text-[10px] uppercase tracking-widest text-zinc-500">Format certifications</h2>
          <ul className="flex flex-wrap gap-2">
            {house.atmos_certified && (
              <li className="rounded border border-amber-700 bg-amber-900/30 px-2.5 py-1 text-xs text-amber-300">
                Dolby Atmos certified
              </li>
            )}
            {house.dolby_premier_certified && (
              <li className="rounded border border-amber-700 bg-amber-900/30 px-2.5 py-1 text-xs text-amber-300">
                Dolby Premier
              </li>
            )}
            {house.imax_certified && (
              <li className="rounded border border-amber-700 bg-amber-900/30 px-2.5 py-1 text-xs text-amber-300">
                IMAX 12.0 certified
              </li>
            )}
            {house.hdr_grading && (
              <li className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-200">
                HDR grading
              </li>
            )}
            {house.mix_room_count && (
              <li className="rounded border border-zinc-700 bg-zinc-900/40 px-2.5 py-1 text-xs text-zinc-300">
                {house.mix_room_count} mix room{house.mix_room_count === 1 ? '' : 's'}
              </li>
            )}
          </ul>
          {house.spec_notes && (
            <p className="mt-2 max-w-2xl text-xs leading-relaxed text-zinc-400">{house.spec_notes}</p>
          )}
        </section>
      )}

      {house.website && (
        <p className="mb-6 text-sm">
          <a href={house.website} target="_blank" rel="noopener noreferrer"
             className="text-amber-400 hover:text-amber-300">
            {house.website.replace(/^https?:\/\//, '').replace(/\/$/, '')} <span aria-hidden="true">↗</span>
          </a>
        </p>
      )}

      <section className="mb-12">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-xl text-zinc-100">
            Filmography
            <span className="ml-2 font-sans text-xs font-normal text-zinc-500">
              ({productionRows.length} production{productionRows.length === 1 ? '' : 's'})
            </span>
          </h2>
          <Link href="/sound/houses" className="text-xs text-zinc-400 hover:text-amber-400">
            All sound houses →
          </Link>
        </div>
        {productionRows.length === 0 ? (
          <p className="text-sm text-zinc-500">No production credits attached yet.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {productionRows.map((p) => (
              <li key={p.slug}
                  className="flex flex-wrap items-baseline gap-x-2 rounded border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                <span className="font-mono text-xs text-zinc-500">{p.release_year ?? '—'}</span>
                <Link href={`/films/${p.slug}`} className="text-zinc-200 hover:text-amber-400">
                  {p.title}
                </Link>
                <span className="ml-auto flex flex-wrap gap-1">
                  {p.roles.map((r, i) => (
                    <span key={i}
                          className="rounded border border-zinc-700 bg-zinc-900/60 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-300">
                      {ROLE_LABELS[r.role] ?? r.role.replace('_', ' ')}
                    </span>
                  ))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-zinc-500">
        Sound craft awards live on{' '}
        <Link href="/awards/craft/sound-design" className="text-amber-400 hover:text-amber-300">/awards/craft/sound-design</Link>
        {' '}and{' '}
        <Link href="/awards/craft/dialogue-adr" className="text-amber-400 hover:text-amber-300">/awards/craft/dialogue-adr</Link>.
      </p>
    </>
  );
}
