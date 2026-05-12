import type { ProductionLocation } from '@bts/db';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { sunEvents, fmtTime } from '@/lib/sun';

const COUNTRY_NAME = new Intl.DisplayNames(['en'], { type: 'region' });

function bbox(lat: number, lng: number, halfDeg = 0.05): string {
  // OSM embed bounding box: minLng, minLat, maxLng, maxLat
  return `${lng - halfDeg},${lat - halfDeg},${lng + halfDeg},${lat + halfDeg}`;
}

function osmEmbed(lat: number, lng: number): string {
  // OpenStreetMap iframe embed — no API key, no tracking, no JS dep.
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox(lat, lng)}&layer=mapnik&marker=${lat},${lng}`;
}

/**
 * E-23 + E-32 — production shooting locations + per-location sun
 * planner. Studio rows render without a sun widget (irrelevant for
 * soundstage shoots). Self-hides when the production has no
 * locations seeded.
 *
 * The sun events are computed for "today" — useful as a quick
 * "what's the light like at this location now?" reference. A
 * date-picker could come in a future iteration; for v1 it'd add
 * client-state + tz handling that doesn't compound enough to ship now.
 */
export function ProductionLocations({ locations }: { locations: readonly ProductionLocation[] }) {
  if (locations.length === 0) return null;
  const today = new Date();

  return (
    <div className="mt-6">
      <SectionHeader label="Locations" heading="Shooting locations" />
      <ul className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {locations.map((loc) => {
          const lat = loc.latitude ? Number(loc.latitude) : null;
          const lng = loc.longitude ? Number(loc.longitude) : null;
          const hasCoords = lat !== null && lng !== null && Number.isFinite(lat) && Number.isFinite(lng);
          let countryName = loc.country ?? '';
          if (loc.country) {
            try {
              countryName = COUNTRY_NAME.of(loc.country) ?? loc.country;
            } catch { /* invalid ISO; pass through */ }
          }

          // Compute today's sun events for non-studio outdoor locations.
          const events = hasCoords && !loc.is_studio ? sunEvents(today, lat!, lng!) : null;

          return (
            <li
              key={loc.id}
              className="flex flex-col gap-3 rounded border border-zinc-800 bg-zinc-900/40 p-3 sm:flex-row"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <h3 className="font-medium text-zinc-100">{loc.name}</h3>
                  {loc.is_studio && (
                    <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                      Studio
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {[loc.region, countryName].filter(Boolean).join(' · ') || '—'}
                  {hasCoords && (
                    <>
                      {' · '}
                      <span className="font-mono">{lat!.toFixed(3)}, {lng!.toFixed(3)}</span>
                    </>
                  )}
                </p>
                {loc.notes && (
                  <p className="mt-1 text-xs text-zinc-500">{loc.notes}</p>
                )}
                {events && (
                  <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                    <dt className="text-zinc-500">Civil dawn</dt>
                    <dd className="font-mono text-zinc-300">{fmtTime(events.civilDawn)}</dd>
                    <dt className="text-zinc-500">Sunrise</dt>
                    <dd className="font-mono text-zinc-300">{fmtTime(events.sunrise)}</dd>
                    <dt className="text-amber-500">Magic-hour AM</dt>
                    <dd className="font-mono text-amber-400">
                      {fmtTime(events.sunrise)} → {fmtTime(events.goldenHourEnd)}
                    </dd>
                    <dt className="text-amber-500">Magic-hour PM</dt>
                    <dd className="font-mono text-amber-400">
                      {fmtTime(events.goldenHourStart)} → {fmtTime(events.sunset)}
                    </dd>
                    <dt className="text-zinc-500">Sunset</dt>
                    <dd className="font-mono text-zinc-300">{fmtTime(events.sunset)}</dd>
                    <dt className="text-zinc-500">Civil dusk</dt>
                    <dd className="font-mono text-zinc-300">{fmtTime(events.civilDusk)}</dd>
                  </dl>
                )}
              </div>
              {hasCoords && (
                <div className="aspect-video w-full shrink-0 overflow-hidden rounded border border-zinc-800 sm:w-56">
                  <iframe
                    title={`Map of ${loc.name}`}
                    src={osmEmbed(lat!, lng!)}
                    loading="lazy"
                    className="h-full w-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-[10px] text-zinc-600">
        Sun events shown for today, UTC. Maps © OpenStreetMap contributors.
      </p>
    </div>
  );
}
