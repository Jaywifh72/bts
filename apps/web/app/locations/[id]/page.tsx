import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db, getLocationById, getSiblingLocations } from '@bts/db';
import { PageHero } from '@/components/ui/PageHero';
import { SunArcDiagram } from '@/components/locations/SunArcDiagram';
import { JsonLd, buildBreadcrumbJsonLd } from '@/lib/jsonLd';
import { siteUrl, absoluteUrl } from '@/lib/site';

/**
 * UX-audit Move 2 — single-location detail with a horizontal sun-arc
 * visualisation for the location's coordinates. Powers "if we shoot
 * here in October, what time does the canyon wall go magic?"
 *
 * URL: /locations/[id] · the id is the production_locations PK.
 * URL-state: ?date=YYYY-MM-DD for a specific prep-meeting date.
 */
export const revalidate = 3600;

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ date?: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { id } = await props.params;
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId)) return {};
  const loc = await getLocationById(db, numericId);
  if (!loc) return {};
  return {
    title: `${loc.name} — shooting location`,
    description: `Sun arc, golden-hour timing, and coordinates for ${loc.name} (${loc.country ?? 'unknown country'}). Used on ${loc.production_title}.`,
    alternates: { canonical: `${siteUrl()}/locations/${numericId}` },
  };
}

function parseDate(raw: string | undefined): Date {
  if (!raw) return new Date();
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return new Date();
  // Treat as UTC noon to avoid timezone-shift surprises in the arc render.
  const d = new Date(Date.UTC(parseInt(m[1]!, 10), parseInt(m[2]!, 10) - 1, parseInt(m[3]!, 10), 12, 0, 0));
  return Number.isFinite(d.getTime()) ? d : new Date();
}

function dateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export default async function LocationDetailPage(props: Props) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
  const numericId = parseInt(id, 10);
  if (!Number.isFinite(numericId) || numericId <= 0) notFound();

  const loc = await getLocationById(db, numericId);
  if (!loc) notFound();

  const date = parseDate(sp.date);
  const lat = loc.latitude ? Number(loc.latitude) : null;
  const lng = loc.longitude ? Number(loc.longitude) : null;
  const hasCoords = lat != null && lng != null && Number.isFinite(lat) && Number.isFinite(lng);

  const siblings = await getSiblingLocations(db, loc.production_id, numericId);

  const breadcrumbJsonLd = buildBreadcrumbJsonLd([
    { name: 'CineCanon', path: '/' },
    { name: 'Locations', path: '/locations' },
    { name: loc.production_title, path: `/films/${loc.production_slug}#locations` },
    { name: loc.name, path: `/locations/${numericId}` },
  ]);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd} />
      <PageHero
        eyebrow={loc.is_studio ? 'Studio location' : 'Shooting location'}
        title={loc.name}
        accent="emerald"
        description={
          <>
            {[loc.region, loc.country].filter(Boolean).join(' · ') || 'Coordinates only'}
            {' · used on '}
            <Link href={`/films/${loc.production_slug}#locations`} className="text-amber-400 hover:underline">
              {loc.production_title}
            </Link>
            {loc.production_year ? ` (${loc.production_year})` : ''}
          </>
        }
        actions={
          <Link href={`/films/${loc.production_slug}`} className="text-xs text-zinc-400 hover:text-amber-400">
            ← Back to {loc.production_title}
          </Link>
        }
      />

      {/* Sun arc + date picker */}
      {hasCoords ? (
        <section className="mb-10">
          <form method="get" className="mb-3 flex items-end gap-2">
            <label className="flex flex-col gap-1 text-xs text-zinc-300">
              Date
              <input
                type="date"
                name="date"
                defaultValue={dateInputValue(date)}
                className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-sm focus:border-amber-500 focus:outline-none"
              />
            </label>
            <button
              type="submit"
              className="rounded bg-amber-600 px-3 py-1.5 text-sm font-medium text-zinc-950 hover:bg-amber-500"
            >
              Recompute
            </button>
            <p className="ml-3 text-xs text-zinc-400">
              Deep-linkable —{' '}
              <code className="rounded bg-zinc-900 px-1 py-0.5 text-amber-300">?date={dateInputValue(date)}</code>
            </p>
          </form>

          <SunArcDiagram
            lat={lat!}
            lng={lng!}
            date={date}
            label={`${loc.name}, ${loc.country ?? ''}`}
          />
        </section>
      ) : (
        <section className="mb-10 rounded border border-zinc-800 bg-zinc-900/40 p-6 text-sm text-zinc-300">
          <p>
            No coordinates on file for this location yet. Sun-arc planning needs WGS-84 lat/long;
            curators can add them via the admin form.
          </p>
        </section>
      )}

      {/* Coordinates panel */}
      {hasCoords && (
        <section className="mb-10 grid gap-3 sm:grid-cols-2">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-300">Latitude</p>
            <p className="mt-1 font-mono text-sm text-zinc-100">{lat!.toFixed(6)}</p>
          </div>
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-3">
            <p className="text-[10px] uppercase tracking-wide text-zinc-300">Longitude</p>
            <p className="mt-1 font-mono text-sm text-zinc-100">{lng!.toFixed(6)}</p>
          </div>
          <a
            href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-zinc-800 bg-zinc-900/40 p-3 text-sm text-zinc-300 hover:border-amber-700/60 hover:text-amber-400 sm:col-span-2"
          >
            View on OpenStreetMap <span aria-hidden="true">↗</span>
          </a>
        </section>
      )}

      {loc.notes && (
        <section className="mb-10 rounded border border-zinc-800 bg-zinc-900/40 p-4 text-sm leading-relaxed text-zinc-300">
          <p className="mb-2 text-[10px] uppercase tracking-wide text-zinc-300">Curator notes</p>
          {loc.notes}
        </section>
      )}

      {siblings.length > 0 && (
        <section className="mb-12">
          <h2 className="mb-3 font-serif text-xl text-zinc-100">
            Other locations on {loc.production_title}
            <span className="ml-2 text-sm font-normal text-zinc-400">{siblings.length}</span>
          </h2>
          <ul className="grid gap-2 text-sm sm:grid-cols-2">
            {siblings.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/locations/${s.id}`}
                  className="block rounded border border-zinc-800 bg-zinc-900/40 p-3 hover:border-amber-700/60"
                >
                  <p className="font-medium text-zinc-100">{s.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-400">
                    {[s.region, s.country].filter(Boolean).join(' · ') || 'Coordinates only'}
                    {s.is_studio ? ' · studio' : ''}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
