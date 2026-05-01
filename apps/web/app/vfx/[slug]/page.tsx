import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { db, listVfxHouses, getVfxHouseWithFilmography } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Badge } from '@/components/ui/Badge';
import { VfxFilmography } from '@/components/vfx/VfxFilmography';

interface Props { params: { slug: string } }

export async function generateStaticParams() {
  const rows = await listVfxHouses(db);
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getVfxHouseWithFilmography(db, params.slug);
  return data ? { title: data.house.name } : {};
}

export default async function VfxHousePage({ params }: Props) {
  const data = await getVfxHouseWithFilmography(db, params.slug);
  if (!data) notFound();
  const { house, filmography, techniques } = data;

  const totalShots = house.total_shots != null
    ? Math.round(house.total_shots).toLocaleString()
    : null;

  return (
    <article>
      <header className="mb-8 border-b border-zinc-800 pb-6">
        <p className="text-xs text-zinc-500">
          <Link href="/vfx" className="hover:text-amber-400">VFX Houses</Link>
          {' › '}
        </p>
        <h1 className="mt-1 font-serif text-4xl text-zinc-50">{house.name}</h1>
        <p className="mt-0.5 text-xs uppercase tracking-wide text-zinc-500">
          {house.country ?? 'VFX House'}
          {house.founded_year ? ` · Est. ${house.founded_year}` : ''}
        </p>
        {house.website && (
          <a href={house.website} target="_blank" rel="noopener noreferrer"
             className="mt-2 inline-block text-xs text-amber-400 hover:underline">
            Website ↗
          </a>
        )}

        <div className="mt-6 flex gap-8">
          <div>
            <div className="font-serif text-2xl text-zinc-50">{house.total_productions}</div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">Productions</div>
          </div>
          <div>
            <div className="font-serif text-2xl text-zinc-50">{house.primary_credits}</div>
            <div className="text-xs uppercase tracking-wide text-zinc-500">as Primary</div>
          </div>
          {totalShots && (
            <div>
              <div className="font-serif text-2xl text-zinc-50">{totalShots}</div>
              <div className="text-xs uppercase tracking-wide text-zinc-500">Total shots</div>
            </div>
          )}
        </div>
      </header>

      {techniques.length > 0 && (
        <div className="mb-8">
          <SectionHeader label="Specialties" heading="Techniques" />
          <div className="flex flex-wrap gap-2">
            {techniques.map((t) => (
              <Badge key={t.slug} label={t.name} variant="category" />
            ))}
          </div>
        </div>
      )}

      <div>
        <SectionHeader label="Credits" heading="Filmography" />
        <VfxFilmography rows={filmography} />
      </div>
    </article>
  );
}
