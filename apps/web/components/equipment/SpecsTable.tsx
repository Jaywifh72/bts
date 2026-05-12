import { validateSpecs } from '@bts/db/schema/specs';

interface SpecsTableProps {
  category: string;
  specs: unknown;
}

// Per-key display labels + value renderers. Keys not listed here fall
// back to underscore-stripped key + raw value.
type Renderer = { label: string; render?: (v: unknown) => React.ReactNode };
const LENS_FIELDS: Record<string, Renderer> = {
  focal_length_mm:    { label: 'Focal length',    render: (v) => `${v} mm` },
  max_aperture_t:     { label: 'Max aperture',    render: (v) => `T${v}` },
  min_aperture_t:     { label: 'Min aperture',    render: (v) => `T${v}` },
  image_circle_mm:    { label: 'Image circle',    render: (v) => `${v} mm` },
  lens_format:        { label: 'Format',          render: (v) => ({
    s16: 'Super 16',
    s35: 'Super 35',
    full_frame: 'Full Frame',
    full_frame_plus: 'Full Frame Plus',
    large_format: 'Large Format (LPL)',
    imax: 'IMAX 65mm',
    vista_vision: 'VistaVision',
  } as Record<string, string>)[String(v)] ?? String(v) },
  is_anamorphic:      { label: 'Anamorphic',      render: (v) => v ? 'Yes' : 'No' },
  anamorphic_squeeze: { label: 'Squeeze',         render: (v) => v != null ? `${v}×` : '—' },
  minimum_focus_m:    { label: 'Close focus',     render: (v) => `${v} m` },
  weight_kg:          { label: 'Weight',          render: (v) => `${v} kg` },
  front_diameter_mm:  { label: 'Front Ø',         render: (v) => `${v} mm` },
  mount:              { label: 'Mount' },
  breathing:          { label: 'Focus breathing' },
  focus_throw_deg:    { label: 'Focus throw',     render: (v) => `${v}°` },
  mtf_chart_url:      { label: 'MTF chart',       render: (v) => (
    <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
      View MTF chart →
    </a>
  ) },
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (Array.isArray(value)) return value.join(', ');
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

// E-15 — camera benchmarks render with explicit units.
const CAMERA_FIELDS: Record<string, Renderer> = {
  sensor_size:           { label: 'Sensor',          render: (v) => String(v).replace(/_/g, ' ') },
  sensor_resolution_max: { label: 'Max resolution' },
  max_frame_rate_fps:    { label: 'Max frame rate',  render: (v) => `${v} fps` },
  internal_codecs:       { label: 'Internal codecs', render: (v) => Array.isArray(v) ? v.join(', ') : String(v) },
  mount:                 { label: 'Mount' },
  color_science:         { label: 'Color science' },
  weight_kg:             { label: 'Weight',          render: (v) => `${v} kg` },
  dynamic_range_stops:        { label: 'Dynamic range',     render: (v) => `${v} stops` },
  rolling_shutter_ms:         { label: 'Rolling shutter',   render: (v) => `${v} ms` },
  latitude_above_key_stops:   { label: 'Latitude above key', render: (v) => `+${v} stops` },
  latitude_below_key_stops:   { label: 'Latitude below key', render: (v) => `−${v} stops` },
  benchmark_url:              { label: 'Lab report',         render: (v) => (
    <a href={String(v)} target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:underline">
      View lab report →
    </a>
  ) },
};

function getRenderer(category: string, key: string): Renderer | undefined {
  if (category === 'lens_set') return LENS_FIELDS[key];
  if (category === 'camera_body') return CAMERA_FIELDS[key];
  return undefined;
}

export function SpecsTable({ category, specs }: SpecsTableProps) {
  let parsed: Record<string, unknown>;
  try {
    parsed = validateSpecs(category, specs) as Record<string, unknown>;
  } catch {
    parsed = (typeof specs === 'object' && specs !== null)
      ? specs as Record<string, unknown>
      : {};
  }

  const entries = Object.entries(parsed);
  if (entries.length === 0) return null;

  const knownKeys = new Set(Object.keys(parsed));
  const rawEntries = typeof specs === 'object' && specs !== null
    ? Object.entries(specs as Record<string, unknown>)
    : [];
  const unknownEntries = rawEntries.filter(([k]) => !knownKeys.has(k));

  return (
    <div className="overflow-x-auto rounded border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900">
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Spec</th>
            <th className="px-3 py-2 text-left font-medium text-zinc-400">Value</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([key, value], i) => {
            const r = getRenderer(category, key);
            return (
              <tr key={key} className={i % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
                <td className="px-3 py-2 text-zinc-400">{r?.label ?? key.replace(/_/g, ' ')}</td>
                <td className="px-3 py-2 text-zinc-200">
                  {r?.render ? r.render(value) : formatValue(value)}
                </td>
              </tr>
            );
          })}
          {unknownEntries.map(([key, value], i) => (
            <tr key={`unknown-${key}`} className={(entries.length + i) % 2 === 0 ? 'bg-zinc-950' : 'bg-zinc-900'}>
              <td className="px-3 py-2 text-zinc-500">{key.replace(/_/g, ' ')}</td>
              <td className="px-3 py-2 text-zinc-500">{formatValue(value)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
