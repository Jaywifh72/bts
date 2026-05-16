import * as React from 'react';
import { sunEvents, fmtTime, type SunEvents } from '@/lib/sun';

/**
 * UX-audit Move 2 — horizontal sun-arc visualization for /locations/[id].
 *
 * Server-rendered SVG, 24-hour x-axis, sun-elevation y-axis (proxy via
 * an arc curve). The astronomical bands the cinematographer cares
 * about — civil dawn, sunrise, golden hour, solar noon, golden hour,
 * sunset, civil dusk — are rendered as colored regions on the strip
 * below, so a working DP scanning "if we shoot here in October, what
 * time does the canyon wall go magic?" gets the answer at a glance.
 *
 * Pure SVG; no client JS. URL-state via ?date= on the parent page so a
 * deep link to a specific call-sheet date is shareable.
 */
type Props = {
  lat: number;
  lng: number;
  /** Local civil date for which to compute events. */
  date: Date;
  /** Optional caption (e.g. the location name) for sr-only context. */
  label?: string;
};

const W = 720;          // viewBox width
const H = 200;          // viewBox height
const ARC_BOTTOM = 160; // y of the horizon line
const ARC_PEAK = 30;    // y at solar noon (sun highest)
const PAD_X = 40;

/** Map a Date to an x-coordinate on the 24-hour strip. */
function xForDate(d: Date | null): number | null {
  if (!d) return null;
  const minutes = d.getUTCHours() * 60 + d.getUTCMinutes();
  const pct = minutes / (24 * 60);
  return PAD_X + pct * (W - 2 * PAD_X);
}

/** Sun-elevation curve as a quadratic bezier from sunrise to sunset
 *  through solar-noon. Good-enough visual; not astronomically accurate. */
function arcPath(events: SunEvents): string | null {
  const x0 = xForDate(events.sunrise);
  const x1 = xForDate(events.solarNoon);
  const x2 = xForDate(events.sunset);
  if (x0 == null || x2 == null) return null;
  const cpx = x1 ?? (x0 + x2) / 2;
  return `M ${x0} ${ARC_BOTTOM} Q ${cpx} ${ARC_PEAK - 30} ${x2} ${ARC_BOTTOM}`;
}

/** Bracket band between two times on the bottom strip. */
function bandRect(a: Date | null, b: Date | null, fill: string, opacity = 1): React.ReactElement | null {
  const xa = xForDate(a);
  const xb = xForDate(b);
  if (xa == null || xb == null) return null;
  return (
    <rect
      x={xa}
      y={ARC_BOTTOM + 10}
      width={Math.max(1, xb - xa)}
      height={18}
      fill={fill}
      opacity={opacity}
    />
  );
}

export function SunArcDiagram({ lat, lng, date, label }: Props) {
  const events = sunEvents(date, lat, lng);

  // Hour gridline ticks every 3h
  const ticks: Array<{ x: number; label: string }> = [];
  for (let h = 0; h <= 24; h += 3) {
    ticks.push({
      x: PAD_X + (h / 24) * (W - 2 * PAD_X),
      label: `${String(h).padStart(2, '0')}:00`,
    });
  }

  const sunNoonX = xForDate(events.solarNoon);

  return (
    <figure className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
      <figcaption className="mb-3 flex items-baseline justify-between">
        <p className="font-serif text-base text-zinc-100">
          Sun arc
          <span className="ml-2 text-xs font-normal text-zinc-400">
            {date.toISOString().slice(0, 10)} · {lat.toFixed(3)}, {lng.toFixed(3)} (UTC)
          </span>
        </p>
        <p className="text-[10px] uppercase tracking-wide text-zinc-400">
          NOAA solar position algorithm
        </p>
      </figcaption>

      <svg
        role="img"
        aria-label={
          label
            ? `Sun-arc and astronomical-twilight bands for ${label} on ${date.toISOString().slice(0, 10)}.`
            : 'Sun-arc and astronomical-twilight bands.'
        }
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
      >
        {/* Horizon line */}
        <line
          x1={PAD_X}
          x2={W - PAD_X}
          y1={ARC_BOTTOM}
          y2={ARC_BOTTOM}
          stroke="rgb(82,82,91)"
          strokeWidth={1}
        />

        {/* Sun curve */}
        {arcPath(events) && (
          <path
            d={arcPath(events)!}
            fill="none"
            stroke="rgb(252,211,77)"
            strokeWidth={2}
          />
        )}

        {/* Solar-noon marker */}
        {sunNoonX != null && (
          <>
            <circle cx={sunNoonX} cy={ARC_PEAK - 30} r={4} fill="rgb(253,224,71)" />
            <text
              x={sunNoonX}
              y={ARC_PEAK - 38}
              textAnchor="middle"
              fontSize={10}
              fill="rgb(212,212,216)"
            >
              ☼ {fmtTime(events.solarNoon)}
            </text>
          </>
        )}

        {/* Twilight + golden-hour bands on the strip */}
        {bandRect(events.civilDawn, events.sunrise, 'rgb(67,56,202)', 0.5)}
        {bandRect(events.sunrise, events.goldenHourEnd, 'rgb(252,211,77)', 0.7)}
        {bandRect(events.goldenHourStart, events.sunset, 'rgb(245,158,11)', 0.75)}
        {bandRect(events.sunset, events.civilDusk, 'rgb(91,33,182)', 0.55)}

        {/* Hour ticks */}
        {ticks.map((t) => (
          <g key={t.x}>
            <line
              x1={t.x}
              x2={t.x}
              y1={ARC_BOTTOM + 32}
              y2={ARC_BOTTOM + 36}
              stroke="rgb(82,82,91)"
              strokeWidth={1}
            />
            <text
              x={t.x}
              y={ARC_BOTTOM + 48}
              textAnchor="middle"
              fontSize={9}
              fill="rgb(161,161,170)"
            >
              {t.label}
            </text>
          </g>
        ))}
      </svg>

      {/* Event times list (text-accessible duplicate of the visual) */}
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        <EventTime label="Civil dawn" value={events.civilDawn} dim />
        <EventTime label="Sunrise" value={events.sunrise} />
        <EventTime label="Golden-hour end" value={events.goldenHourEnd} accent />
        <EventTime label="Solar noon" value={events.solarNoon} />
        <EventTime label="Golden-hour start" value={events.goldenHourStart} accent />
        <EventTime label="Sunset" value={events.sunset} />
        <EventTime label="Civil dusk" value={events.civilDusk} dim />
      </dl>
      <p className="mt-2 text-[10px] uppercase tracking-wide text-zinc-400">
        Times shown in UTC · timezone-aware location dates are a follow-up
      </p>
    </figure>
  );
}

function EventTime({
  label, value, accent, dim,
}: { label: string; value: Date | null; accent?: boolean; dim?: boolean }) {
  return (
    <div>
      <dt
        className={`font-mono text-[10px] uppercase tracking-wide ${
          accent ? 'text-amber-300' : dim ? 'text-zinc-500' : 'text-zinc-300'
        }`}
      >
        {label}
      </dt>
      <dd className={`mt-0.5 font-mono ${value ? 'text-zinc-200' : 'text-zinc-500'}`}>
        {value ? (
          <time dateTime={value.toISOString()}>{fmtTime(value)}</time>
        ) : (
          '—'
        )}
      </dd>
    </div>
  );
}
