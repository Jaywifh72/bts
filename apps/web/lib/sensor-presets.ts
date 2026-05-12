/**
 * Cinema-camera sensor presets — manufacturer-published active-area
 * dimensions in mm. Used by /tools/coverage and the lens item page's
 * coverage panel to compute "which sensors this lens covers".
 *
 * Numbers are public-spec facts; pulled from manufacturer datasheets.
 */

export type Sensor = {
  id: string;
  label: string;
  shortLabel: string;
  width_mm: number;
  height_mm: number;
};

export const SENSORS: readonly Sensor[] = [
  { id: 'imax-15perf',     shortLabel: 'IMAX 15/70',          label: 'IMAX 65mm 15-perf',                width_mm: 70.41, height_mm: 52.63 },
  { id: 'alexa-65-og',     shortLabel: 'ALEXA 65 OG',         label: 'ARRI ALEXA 65 Open Gate',          width_mm: 54.12, height_mm: 25.58 },
  { id: 'alexa-65-4k',     shortLabel: 'ALEXA 65 4K',         label: 'ARRI ALEXA 65 4K 16:9',            width_mm: 50.79, height_mm: 25.58 },
  { id: 'alexa-mini-lf',   shortLabel: 'Mini LF OG',          label: 'ARRI ALEXA Mini LF Open Gate',     width_mm: 36.70, height_mm: 25.54 },
  { id: 'alexa-lf',        shortLabel: 'ALEXA LF OG',         label: 'ARRI ALEXA LF Open Gate',          width_mm: 36.70, height_mm: 25.54 },
  { id: 'venice-2-ff',     shortLabel: 'VENICE 2 FF',         label: 'Sony VENICE 2 8K Full Frame',      width_mm: 35.90, height_mm: 24.00 },
  { id: 'red-vraptor-vv',  shortLabel: 'V-RAPTOR VV',         label: 'RED V-RAPTOR 8K VV',               width_mm: 40.96, height_mm: 21.60 },
  { id: 'vistavision',     shortLabel: 'VistaVision',         label: 'VistaVision 8-perf 35mm',          width_mm: 37.72, height_mm: 24.92 },
  { id: 's35-4perf',       shortLabel: 'S35 4-perf',          label: 'Super 35 4-perf',                  width_mm: 24.92, height_mm: 18.67 },
  { id: 's16',             shortLabel: 'S16',                 label: 'Super 16mm',                       width_mm: 12.52, height_mm:  7.41 },
];

export function sensorDiagonal(w: number, h: number): number {
  return Math.sqrt(w * w + h * h);
}

/** Each sensor with its diagonal precomputed; ordered largest-first. */
export const SENSORS_BY_DIAGONAL = [...SENSORS]
  .map((s) => ({ ...s, diagonal: sensorDiagonal(s.width_mm, s.height_mm) }))
  .sort((a, b) => b.diagonal - a.diagonal);
