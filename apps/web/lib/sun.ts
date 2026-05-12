/**
 * E-32 — sun position + golden-hour math for a given lat/lng/date.
 *
 * Implements the well-known NOAA solar-position algorithm for the events
 * cinematographers care about:
 *   - civilDawn   (sun -6°, ambient morning light; "civil twilight" ends)
 *   - sunrise
 *   - goldenHourEnd  (morning golden hour ends, sun reaches 6° elevation)
 *   - solarNoon
 *   - goldenHourStart (afternoon golden hour begins, sun drops to 6°)
 *   - sunset
 *   - civilDusk   (sun -6°, ambient evening light begins)
 *
 * Math: Reda & Andreas 2003 / NOAA simplified algorithm. Accurate to
 * ~1 minute for civil-time use. Inputs are decimal degrees + a JS
 * Date for the day; outputs are JS Dates in UTC.
 */

const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

// Julian day from a JS Date
function toJulian(date: Date): number {
  return date.getTime() / 86400000 + 2440587.5;
}
function fromJulian(j: number): Date {
  return new Date((j - 2440587.5) * 86400000);
}
function toDays(date: Date): number {
  return toJulian(date) - 2451545; // J2000
}

function solarMeanAnomaly(d: number): number {
  return RAD * (357.5291 + 0.98560028 * d);
}

function eclipticLongitude(M: number): number {
  const C = RAD * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
  const P = RAD * 102.9372;
  return M + C + P + Math.PI;
}

function sunDeclination(L: number): number {
  const e = RAD * 23.4397;
  return Math.asin(Math.sin(e) * Math.sin(L));
}

function julianCycle(d: number, lw: number): number {
  return Math.round(d - 0.0009 - lw / (2 * Math.PI));
}
function approxTransit(Ht: number, lw: number, n: number): number {
  return 0.0009 + (Ht + lw) / (2 * Math.PI) + n;
}
function solarTransitJ(ds: number, M: number, L: number): number {
  return 2451545 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
}

function hourAngle(h: number, phi: number, dec: number): number {
  return Math.acos((Math.sin(h) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
}

function getSetJ(h: number, lw: number, phi: number, dec: number, n: number, M: number, L: number): number {
  const w = hourAngle(h, phi, dec);
  const a = approxTransit(w, lw, n);
  return solarTransitJ(a, M, L);
}

export type SunEvents = {
  civilDawn: Date | null;
  sunrise: Date | null;
  goldenHourEnd: Date | null;
  solarNoon: Date;
  goldenHourStart: Date | null;
  sunset: Date | null;
  civilDusk: Date | null;
};

/**
 * Returns the sun-event times for a given local civil date at the
 * given coordinates. Events that don't occur at this latitude on this
 * day (polar circle in summer/winter) come back as null.
 */
export function sunEvents(date: Date, lat: number, lng: number): SunEvents {
  const lw = -lng * RAD;
  const phi = lat * RAD;
  const d = toDays(date);

  const n = julianCycle(d, lw);
  const ds = approxTransit(0, lw, n);
  const M = solarMeanAnomaly(ds);
  const L = eclipticLongitude(M);
  const dec = sunDeclination(L);
  const Jnoon = solarTransitJ(ds, M, L);

  const evt = (altDeg: number, side: 'rise' | 'set'): Date | null => {
    const altRad = altDeg * RAD;
    const cosH = (Math.sin(altRad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    if (cosH > 1 || cosH < -1) return null;
    const Jset = getSetJ(altRad, lw, phi, dec, n, M, L);
    if (side === 'set') return fromJulian(Jset);
    return fromJulian(Jnoon - (Jset - Jnoon));
  };

  return {
    civilDawn: evt(-6, 'rise'),
    sunrise: evt(-0.833, 'rise'),
    goldenHourEnd: evt(6, 'rise'),
    solarNoon: fromJulian(Jnoon),
    goldenHourStart: evt(6, 'set'),
    sunset: evt(-0.833, 'set'),
    civilDusk: evt(-6, 'set'),
  };
}

/**
 * Sun azimuth + altitude at a point in time. Useful for a "right now"
 * indicator on the planner. Both in degrees; azimuth from north
 * clockwise, altitude above horizon.
 */
export function sunPosition(date: Date, lat: number, lng: number): { azimuth: number; altitude: number } {
  const lw = -lng * RAD;
  const phi = lat * RAD;
  const d = toDays(date);
  const M = solarMeanAnomaly(d);
  const L = eclipticLongitude(M);
  const dec = sunDeclination(L);
  // Sidereal time (radians)
  const theta = RAD * (280.16 + 360.9856235 * d) - lw;
  const H = theta - L;

  const altitude = Math.asin(Math.sin(phi) * Math.sin(dec) + Math.cos(phi) * Math.cos(dec) * Math.cos(H));
  const azimuth = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(phi) - Math.tan(dec) * Math.cos(phi)) + Math.PI;
  return { azimuth: azimuth * DEG, altitude: altitude * DEG };
}

/**
 * Format a Date into a HH:MM string in the location's local-civil time.
 * Falls back to UTC when the timezone is unknown — we don't carry
 * tz on production_locations yet (deferred to a future migration).
 */
export function fmtTime(d: Date | null): string {
  if (!d) return '—';
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m} UTC`;
}
